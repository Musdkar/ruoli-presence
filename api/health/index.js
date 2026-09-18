"use strict";

const { timingSafeEqual } = require("node:crypto");

function jsonResponse(context, status, payload) {
  context.res = {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  };
}

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

function readScalar(value, max) {
  const isNum = typeof value === "number";
  const isStr = typeof value === "string" && value.trim() !== "";
  const n = isNum ? value : isStr ? Number(value) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
}

module.exports = async function (context, req) {
  const method = (req.method || "").toUpperCase();
  if (method !== "POST") {
    jsonResponse(context, 405, { error: "method_not_allowed" });
    return;
  }

  // Fail closed: an unset or empty INGEST_TOKEN rejects every request.
  const expected = process.env.INGEST_TOKEN || "";
  const provided = req.headers && (req.headers["x-ingest-token"] || req.headers["X-Ingest-Token"]);
  if (typeof provided !== "string" || safeEqual(provided, expected) === false || expected === "") {
    jsonResponse(context, 401, { error: "unauthorized" });
    return;
  }

  const userId = process.env.LANYARD_USER_ID;
  const apiKey = process.env.LANYARD_API_KEY;
  if (userId == null || apiKey == null || userId === "" || apiKey === "") {
    jsonResponse(context, 503, { error: "lanyard_not_configured" });
    return;
  }

  const payload = req.body || {};

  // Lightweight Shortcut format:
  //   { "steps": 2257 }
  // Keep the older Health Auto Export metrics format for compatibility.
  let steps = readScalar(payload.steps, MAX_STEPS);
  let heartRate = readScalar(payload.heartRate, MAX_HEART_RATE);

  if (steps == null && heartRate == null) {
    const dataWrap = payload && payload.data;
    const metrics = (dataWrap && dataWrap.metrics) || payload.metrics;
    if (Array.isArray(metrics) === false) {
      jsonResponse(context, 400, { error: "invalid_health_payload" });
      return;
    }

    const metric = (name) => metrics.find((m) => (m && m.name) === name);
    const stepValues = readValues(metric("step_count"), MAX_STEPS);
    const hrValues = readValues(metric("heart_rate"), MAX_HEART_RATE);
    steps = stepValues.length ? stepValues.reduce((a, b) => a + b, 0) : null;
    heartRate = hrValues.length ? hrValues[hrValues.length - 1] : null;
  }

  if (steps == null && heartRate == null) {
    jsonResponse(context, 400, { error: "no_valid_health_data" });
    return;
  }

  const summary = {
    steps,
    heartRate,
    updatedAt: new Date().toISOString(),
  };

  const kvUrl = "https://api.lanyard.rest/v1/users/" + userId + "/kv";
  try {
    const r = await fetch(kvUrl, {
      method: "PATCH",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ health_today: JSON.stringify(summary) }),
    });
    if (r.ok === false) {
      jsonResponse(context, 502, { error: "lanyard_update_failed", status: r.status });
      return;
    }
  } catch (err) {
    context.log.error("lanyard update failed", err && err.message);
    jsonResponse(context, 502, { error: "lanyard_update_failed" });
    return;
  }

  jsonResponse(context, 200, { ok: true, summary });
};
