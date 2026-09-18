"use strict";

const { timingSafeEqual } = require("node:crypto");

// Cover data URL ceiling. Lanyard KV holds ~16KB per value; keep the
// published payload comfortably under that once JSON-wrapped.
const MAX_COVER_CHARS = 12000;
const MAX_TEXT = 200;
const VALID_SOURCES = ["netease", "appleMusic"];

// Constant-time string comparison over equal-length buffers.
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// Trim a string field to a safe length; non-strings become null.
function text(value, max) {
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (t === "") return null;
  return t.length > max ? t.slice(0, max) : t;
}

// Accept only a data:image/...;base64,... URL under the size ceiling.
function cover(value) {
  if (typeof value !== "string") return null;
  if (value.length > MAX_COVER_CHARS) return null;
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) === false) return null;
  return value;
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
  const title = text(payload.title, MAX_TEXT);
  const artist = text(payload.artist, MAX_TEXT);
  const source = VALID_SOURCES.includes(payload.source) ? payload.source : null;
  if (title == null || artist == null || source == null) {
    context.res = { status: 400, jsonBody: { error: "invalid_music" } };
    return;
  }

  const summary = {
    title: title,
    artist: artist,
    album: text(payload.album, MAX_TEXT),
    source: source,
    playing: payload.playing === true,
    cover: cover(payload.cover),
    updatedAt: new Date().toISOString(),
  };

  const kvUrl = "https://api.lanyard.rest/v1/users/" + userId + "/kv";
  try {
    const r = await fetch(kvUrl, {
      method: "PATCH",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ music_now: JSON.stringify(summary) }),
    });
    if (r.ok === false) {
      context.res = { status: 502, jsonBody: { error: "lanyard_update_failed", status: r.status } };
      return;
    }
  } catch (err) {
    context.log.error("music update failed", err && err.message);
    context.res = { status: 502, jsonBody: { error: "lanyard_update_failed" } };
    return;
  }

  context.res = { status: 200, jsonBody: { ok: true, summary } };
};
