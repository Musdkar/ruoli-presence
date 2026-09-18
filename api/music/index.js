"use strict";

const { timingSafeEqual } = require("node:crypto");

// Keep artwork small enough that music_now remains cheap to push through
// Lanyard KV and fast to render. This is an application limit, not Lanyard's
// protocol ceiling.
const MAX_COVER_CHARS = 26000;
const MAX_TEXT = 200;
const VALID_STATES = ["playing", "paused", "last_played"];
const VALID_SERVICES = ["netease", "apple_music"];

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function textField(value, max) {
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (t === "") return null;
  return t.length > max ? t.slice(0, max) : t;
}

function cover(value) {
  if (typeof value !== "string") return null;
  if (value.length > MAX_COVER_CHARS) return null;
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) === false) return null;
  return value;
}

function service(value) {
  if (value === "appleMusic") return "apple_music"; // legacy bridge spelling
  return VALID_SERVICES.includes(value) ? value : null;
}

module.exports = async function (context, req) {
  const method = (req.method || "").toUpperCase();
  if (method !== "POST") {
    context.res = { status: 405, jsonBody: { error: "method_not_allowed" } };
    return;
  }

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
  const rawTrack = payload.track && typeof payload.track === "object" && Array.isArray(payload.track) === false ? payload.track : payload;
  const rawArtwork = payload.artwork && typeof payload.artwork === "object" && Array.isArray(payload.artwork) === false ? payload.artwork.url : payload.cover;
  const title = textField(rawTrack.title, MAX_TEXT);
  const artist = textField(rawTrack.artist, MAX_TEXT);
  const musicService = service(payload.service || payload.source);
  const state = VALID_STATES.includes(payload.state)
    ? payload.state
    : payload.playing === true
      ? "playing"
      : payload.playing === false
        ? "paused"
        : null;

  if (title == null || artist == null || musicService == null || state == null) {
    context.res = { status: 400, jsonBody: { error: "invalid_music" } };
    return;
  }

  const image = cover(rawArtwork);
  const summary = {
    v: 1,
    state,
    service: musicService,
    collector: "macos_nowplaying",
    track: {
      title,
      artist,
      album: textField(rawTrack.album, MAX_TEXT),
    },
    artwork: image ? { kind: "data", url: image } : { kind: "none", url: null },
    observedAt: new Date().toISOString(),
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
