"use strict";

// iPhone Focus presence ingest. The phone cannot reach api.lanyard.rest from
// every network (mainland China without a proxy cannot), so the Shortcut posts
// to this endpoint on our own domain instead; the server performs the upstream
// Lanyard KV write with the API key held only in server-side environment
// variables. Same pattern as /api/health.
//
// Accepted payload (from the Shortcut):
//   { "status": "online" | "dnd" | "sleeping", "updatedAt": "2026-10-11T20:00:00+08:00" }
// updatedAt is optional; the server substitutes its own clock when missing.
// Anything else is rejected — the phone can only ever write this one KV key
// with one of three whitelisted states.

const { timingSafeEqual } = require("node:crypto");

function jsonResponse(context, status, payload) {
  context.res = {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  };
}

// Constant-time string comparison over equal-length buffers.
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

const STATUSES = new Set(["online", "dnd", "sleeping"]);
// Client timestamps slightly ahead of the server clock are fine (timezone or
// clock drift); anything older than the site's 36h freshness window is not a
// live update and gets rejected so stale replays cannot resurrect old states.
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MAX_PAST_MS = 36 * 60 * 60 * 1000;

function readTimestamp(value) {
  if (value === undefined || value === null || value === "") return Date.now();
  if (typeof value !== "string") return null;
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return null;
  const now = Date.now();
  if (ts > now + MAX_FUTURE_SKEW_MS) return null;
  if (now - ts > MAX_PAST_MS) return null;
  return ts;
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
  const status = payload.status;
  if (typeof status !== "string" || STATUSES.has(status) === false) {
    jsonResponse(context, 400, { error: "invalid_status" });
    return;
  }

  const ts = readTimestamp(payload.updatedAt);
  if (ts === null) {
    jsonResponse(context, 400, { error: "invalid_updated_at" });
    return;
  }

  const summary = {
    status,
    updatedAt: new Date(ts).toISOString(),
  };

  const kvUrl = "https://api.lanyard.rest/v1/users/" + userId + "/kv";
  try {
    const r = await fetch(kvUrl, {
      method: "PATCH",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ phone_presence: JSON.stringify(summary) }),
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
