"use strict";

const { timingSafeEqual } = require("node:crypto");

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

module.exports = async function (context, req) {
  const method = (req.method || "").toUpperCase();
  if (method !== "POST") {
    context.res = { status: 405, jsonBody: { error: "method_not_allowed" } };
    return;
  }

  // Fail closed: an unset or empty INGEST_TOKEN rejects every request.
  const expected = process.env.INGEST_TOKEN || "";
  const provided = req.headers && (req.headers["x-ingest-token"] || req.headers["X-Ingest-Token"]);
  if (typeof provided !== "string" || safeEqual(provided, expected) === false || expected === "") {
    context.res = { status: 401, jsonBody: { error: "unauthorized" } };
    return;
  }

  const userId = process.env.LANYARD_USER_ID;
  const apiKey = process.env.LANYARD_API_KEY;
  if (userId == null || apiKey == null || userId === "" || apiKey === "") {
    context.res = { status: 503, jsonBody: { error: "lanyard_not_configured" } };
    return;
  }

  const payload = req.body || {};
  const dataWrap = payload && payload.data;
  const metrics = (dataWrap && dataWrap.metrics) || payload.metrics;
  if (Array.isArray(metrics) === false) {
    context.res = { status: 400, jsonBody: { error: "invalid_metrics" } };
    return;
  }

  const metric = (name) => metrics.find((m) => (m && m.name) === name);
  const stepValues = readValues(metric("step_count"), MAX_STEPS);
  const hrValues = readValues(metric("heart_rate"), MAX_HEART_RATE);

  if (stepValues.length === 0 && hrValues.length === 0) {
    context.res = { status: 400, jsonBody: { error: "no_valid_metrics" } };
    return;
  }

  const summary = {
    steps: stepValues.length ? stepValues.reduce((a, b) => a + b, 0) : null,
    heartRate: hrValues.length ? hrValues[hrValues.length - 1] : null,
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
      context.res = { status: 502, jsonBody: { error: "lanyard_update_failed", status: r.status } };
      return;
    }
  } catch (err) {
    context.log.error("lanyard update failed", err && err.message);
    context.res = { status: 502, jsonBody: { error: "lanyard_update_failed" } };
    return;
  }

  context.res = { status: 200, jsonBody: { ok: true, summary } };
};
