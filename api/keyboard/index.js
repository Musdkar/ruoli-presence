"use strict";

const { timingSafeEqual } = require("node:crypto");

const MAX_KEYS = 100;
const MAX_COUNT = 10000000;
const KEY_RE = /^(?:[A-Z0-9]|SPACE|TAB|BACKSPACE|RETURN|SHIFT|COMMAND|CONTROL|OPTION|CAPS|ESC|LEFT|RIGHT|UP|DOWN|[-=\[\]\\;'\x60,.\/])$/;

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function readCount(value) {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= MAX_COUNT ? Math.round(n) : null;
}

module.exports = async function (context, req) {
  if ((req.method || "").toUpperCase() !== "POST") {
    context.res = { status: 405, jsonBody: { error: "method_not_allowed" } };
    return;
  }

  const expected = process.env.INGEST_TOKEN || "";
  const provided = req.headers && (req.headers["x-ingest-token"] || req.headers["X-Ingest-Token"]);
  if (expected === "" || typeof provided !== "string" || safeEqual(provided, expected) === false) {
    context.res = { status: 401, jsonBody: { error: "unauthorized" } };
    return;
  }

  const userId = process.env.LANYARD_USER_ID;
  const apiKey = process.env.LANYARD_API_KEY;
  if (!userId || !apiKey) {
    context.res = { status: 503, jsonBody: { error: "lanyard_not_configured" } };
    return;
  }

  const payload = req.body || {};
  const date = validDate(payload.date);
  if (date == null || payload.keys == null || typeof payload.keys !== "object" || Array.isArray(payload.keys)) {
    context.res = { status: 400, jsonBody: { error: "invalid_keyboard_payload" } };
    return;
  }

  const keys = {};
  for (const [rawKey, rawCount] of Object.entries(payload.keys).slice(0, MAX_KEYS)) {
    const key = String(rawKey).toUpperCase();
    const count = readCount(rawCount);
    if (KEY_RE.test(key) && count != null) keys[key] = count;
  }
  if (Object.keys(keys).length === 0) {
    context.res = { status: 400, jsonBody: { error: "no_valid_keys" } };
    return;
  }

  const providedTotal = readCount(payload.total);
  const derivedTotal = Object.values(keys).reduce((a, b) => a + b, 0);
  const summary = {
    v: 1,
    date,
    collector: "whatpulse_sqlite_daily",
    total: providedTotal == null ? derivedTotal : providedTotal,
    keys,
    updatedAt: new Date().toISOString(),
  };

  try {
    const r = await fetch("https://api.lanyard.rest/v1/users/" + userId + "/kv", {
      method: "PATCH",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ keyboard_yesterday: JSON.stringify(summary) }),
    });
    if (!r.ok) {
      context.res = { status: 502, jsonBody: { error: "lanyard_update_failed", status: r.status } };
      return;
    }
  } catch (err) {
    context.log.error("keyboard update failed", err && err.message);
    context.res = { status: 502, jsonBody: { error: "lanyard_update_failed" } };
    return;
  }

  context.res = { status: 200, jsonBody: { ok: true, summary } };
};
