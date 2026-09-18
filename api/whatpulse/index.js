"use strict";

const { timingSafeEqual } = require("node:crypto");

function jsonResponse(context, status, payload) {
  context.res = {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  };
}

const MAX_APPS = 8;
const MAX_MINUTES = 1440;
const MAX_KEYS = 100;
const MAX_TOTAL_KEYS = 10000000;
const MAX_LEVEL = 15;
const KEY_RE = /^(?:[A-Z0-9]|SPACE|TAB|BACKSPACE|RETURN|SHIFT|COMMAND|CONTROL|OPTION|CAPS|ESC|LEFT|RIGHT|UP|DOWN|[-=\[\]\\;'\x60,.\/])$/;

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function number(value, max) {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
}

function date(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function normalizeSoftware(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const day = date(value.date);
  if (!day || !Array.isArray(value.apps)) return null;

  const apps = [];
  for (const item of value.apps.slice(0, MAX_APPS)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const name = typeof item.name === "string" ? item.name.trim().slice(0, 80) : "";
    const minutes = number(item.minutes, MAX_MINUTES);
    if (!name || minutes == null || minutes <= 0) continue;
    apps.push({ name, minutes: Math.round(minutes * 10) / 10 });
  }
  if (!apps.length) return null;
  return { date: day, apps, source: "activitywatch_foreground" };
}

function normalizeKeyboard(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const day = date(value.date);
  const total = number(value.total, MAX_TOTAL_KEYS);
  if (!day || total == null || !value.heat || typeof value.heat !== "object" || Array.isArray(value.heat)) return null;

  const heat = {};
  for (const [rawKey, rawLevel] of Object.entries(value.heat).slice(0, MAX_KEYS)) {
    const key = String(rawKey).toUpperCase();
    const level = number(rawLevel, MAX_LEVEL);
    if (KEY_RE.test(key) && level != null) heat[key] = Math.round(level);
  }
  if (!Object.keys(heat).length) return null;
  return { v: 1, date: day, collector: "whatpulse_sqlite_daily", total: Math.round(total), heat };
}

module.exports = async function (context, req) {
  if ((req.method || "").toUpperCase() !== "POST") {
    jsonResponse(context, 405, { error: "method_not_allowed" });
    return;
  }

  const expected = process.env.INGEST_TOKEN || "";
  const provided = req.headers && (req.headers["x-ingest-token"] || req.headers["X-Ingest-Token"]);
  if (!expected || typeof provided !== "string" || !safeEqual(provided, expected)) {
    jsonResponse(context, 401, { error: "unauthorized" });
    return;
  }

  const userId = process.env.LANYARD_USER_ID;
  const apiKey = process.env.LANYARD_API_KEY;
  if (!userId || !apiKey) {
    jsonResponse(context, 503, { error: "lanyard_not_configured" });
    return;
  }

  const payload = req.body || {};
  const software = normalizeSoftware(payload.software);
  const keyboard = normalizeKeyboard(payload.keyboard);
  if (!software && !keyboard) {
    jsonResponse(context, 400, { error: "no_valid_whatpulse_data" });
    return;
  }

  const kv = {};
  if (software) kv.apps_today = JSON.stringify(software);
  if (keyboard) kv.keyboard_today = JSON.stringify(keyboard);

  try {
    const r = await fetch("https://api.lanyard.rest/v1/users/" + userId + "/kv", {
      method: "PATCH",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(kv),
    });
    if (!r.ok) {
      jsonResponse(context, 502, { error: "lanyard_update_failed", status: r.status });
      return;
    }
  } catch (err) {
    context.log.error("whatpulse update failed", err && err.message);
    jsonResponse(context, 502, { error: "lanyard_update_failed" });
    return;
  }

  jsonResponse(context, 200, {
    ok: true,
    updated: { software: Boolean(software), keyboard: Boolean(keyboard) },
  });
};
