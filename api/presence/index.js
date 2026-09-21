"use strict";

// Read-only presence proxy. The browser asks our own origin for presence; this
// function is the only thing that talks to api.lanyard.rest, using the
// server-side user id and API key. That keeps the upstream host off the
// visitor's critical path (it is not always reachable from every network) and
// keeps the Discord id and key out of the client bundle.
//
// Design constraints (deliberate):
//   - GET only, anonymous, no client token. The data is already public.
//   - The upstream target is fixed by server config; the client cannot pass a
//     user id, a URL or any other mutable target, so this is not an open proxy.
//   - The response is sanitized with the same module the browser uses.

const { sanitizePresence } = require("../lib/presence-sanitize.cjs");

const LANYARD_API = "https://api.lanyard.rest/v1/users";

// Shared-cache window. Cloudflare caches GET responses whose Cache-Control is
// public with max-age > 0, so a few seconds here collapses every visitor's poll
// into roughly one upstream request per window.
const MAX_AGE = 5;
const STALE_WHILE_REVALIDATE = 30;
const UPSTREAM_TIMEOUT_MS = 4000;

function jsonResponse(context, status, payload, extraHeaders = {}) {
  context.res = {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...extraHeaders },
    body: JSON.stringify(payload),
  };
}

// Cacheable success: let the CDN absorb bursts of polling.
function okHeaders() {
  return {
    "Cache-Control": `public, max-age=${MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
  };
}

// Errors are never cached, so a transient upstream failure is retried promptly.
function noStoreHeaders() {
  return { "Cache-Control": "no-store" };
}

module.exports = async function (context, req) {
  const method = (req.method || "").toUpperCase();
  if (method !== "GET") {
    jsonResponse(context, 405, { success: false, error: "method_not_allowed" }, noStoreHeaders());
    return;
  }

  const userId = process.env.LANYARD_USER_ID;
  const apiKey = process.env.LANYARD_API_KEY || "";
  if (!userId) {
    jsonResponse(
      context,
      503,
      { success: false, error: "presence_not_configured" },
      noStoreHeaders()
    );
    return;
  }

  let upstream;
  try {
    upstream = await fetch(`${LANYARD_API}/${encodeURIComponent(userId)}`, {
      headers: {
        Accept: "application/json",
        // The upstream does not require it, but a fixed UA keeps the request
        // identifiable in Lanyard's logs.
        "User-Agent": "ruoli-presence/1.0 (+https://kalieri.com)",
        ...(apiKey ? { Authorization: apiKey } : {}),
      },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    context.log.error("presence upstream failed", err && err.message);
    jsonResponse(context, 504, { success: false, error: "upstream_unavailable" }, noStoreHeaders());
    return;
  }

  if (upstream.ok === false) {
    // 5xx/429 upstream is transient; surface it uncached.
    jsonResponse(
      context,
      502,
      { success: false, error: "upstream_error", status: upstream.status },
      noStoreHeaders()
    );
    return;
  }

  let payload;
  try {
    payload = await upstream.json();
  } catch {
    jsonResponse(context, 502, { success: false, error: "upstream_invalid" }, noStoreHeaders());
    return;
  }

  const data = sanitizePresence(payload && payload.data);
  if (!data) {
    jsonResponse(context, 502, { success: false, error: "upstream_invalid" }, noStoreHeaders());
    return;
  }

  jsonResponse(context, 200, { success: true, data }, okHeaders());
};
