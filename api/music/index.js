"use strict";

const { timingSafeEqual } = require("node:crypto");

function jsonResponse(context, status, payload) {
  context.res = {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  };
}

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
    jsonResponse(context, 405, { error: "method_not_allowed" });
    return;
  }

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
    jsonResponse(context, 400, { error: "invalid_music" });
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
      jsonResponse(context, 502, { error: "lanyard_update_failed", status: r.status });
      return;
    }
  } catch (err) {
    context.log.error("music update failed", err && err.message);
    jsonResponse(context, 502, { error: "lanyard_update_failed" });
    return;
  }

  jsonResponse(context, 200, { ok: true, summary });
};
