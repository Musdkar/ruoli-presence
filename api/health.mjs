import { timingSafeEqual } from "node:crypto";

const MAX_STEPS = 1000000;
const MAX_HEART_RATE = 100000;

// Constant-time string comparison over equal-length buffers.
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// Accept only a real array of entries whose qty is a finite number in range.
function readValues(metric, max) {
  if (metric == null || Array.isArray(metric.data) === false) return [];
  const out = [];
  for (const entry of metric.data) {
    const raw = entry && entry.qty;
    const isNum = typeof raw === "number";
    const isStr = typeof raw === "string" && raw.trim() !== "";
    const n = isNum ? raw : isStr ? Number(raw) : NaN;
    if (Number.isFinite(n) && n >= 0 && n <= max) out.push(n);
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  // Fail closed: an unset or empty INGEST_TOKEN rejects every request.
  const expected = process.env.INGEST_TOKEN || "";
  const provided = req.headers["x-ingest-token"];
  if (typeof provided !== "string" || safeEqual(provided, expected) === false || expected === "") {
    return res.status(401).json({ error: "unauthorized" });
  }

  const userId = process.env.LANYARD_USER_ID;
  const apiKey = process.env.LANYARD_API_KEY;
  if (userId == null || apiKey == null || userId === "" || apiKey === "") return res.status(503).json({ error: "lanyard_not_configured" });

  const payload = req.body || {};
  const dataWrap = payload && payload.data;
  const metrics = (dataWrap && dataWrap.metrics) || payload.metrics;
  if (Array.isArray(metrics) === false) return res.status(400).json({ error: "invalid_metrics" });

  const metric = (name) => metrics.find((m) => (m && m.name) === name);
  const stepValues = readValues(metric("step_count"), MAX_STEPS);
  const hrValues = readValues(metric("heart_rate"), MAX_HEART_RATE);

  if (stepValues.length === 0 && hrValues.length === 0) {
    return res.status(400).json({ error: "no_valid_metrics" });
  }

  const summary = {
    steps: stepValues.length ? stepValues.reduce((a, b) => a + b, 0) : null,
    heartRate: hrValues.length ? hrValues[hrValues.length - 1] : null,
    updatedAt: new Date().toISOString(),
  };

  const kvUrl = "https://api.lanyard.rest/v1/users/" + userId + "/kv";
  const r = await fetch(kvUrl, {
    method: "PATCH",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ health_today: JSON.stringify(summary) }),
  });
  if (r.ok === false) return res.status(502).json({ error: "lanyard_update_failed", status: r.status });
  return res.status(200).json({ ok: true, summary });
}
