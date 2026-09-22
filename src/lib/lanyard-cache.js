// Browser-side presence cache. Sanitization itself lives in the shared module
// under api/ so the server function and the browser sanitize identically.
import { sanitizePresence } from "../../api/lib/presence-sanitize.mjs";

export { sanitizePresence };

// The presence owner is fixed server-side now, so the cache is a single slot
// rather than one per user id. Version stays so an old layout is discarded.
const CACHE_VERSION = 2;
const CACHE_MAX_AGE = 30 * 60 * 1000;
const CACHE_KEY = `ruoli:presence:${CACHE_VERSION}`;

export function readCachedPresence(now = Date.now()) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed?.v !== CACHE_VERSION ||
      !Number.isFinite(parsed.savedAt) ||
      now - parsed.savedAt > CACHE_MAX_AGE
    )
      return null;
    return sanitizePresence(parsed.presence);
  } catch {
    return null;
  }
}

export function writeCachedPresence(value) {
  const presence = sanitizePresence(value);
  if (!presence) return;
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ v: CACHE_VERSION, savedAt: Date.now(), presence })
    );
  } catch {
    /* storage can be unavailable; the in-memory value still renders */
  }
}

// Read presence through our own origin. The function proxies the upstream with
// the server-side user id, so the browser only ever talks to /api/presence and
// no id is embedded in the bundle.
export async function fetchPresence({ signal } = {}) {
  const response = await fetch("/api/presence", {
    signal,
    headers: { Accept: "application/json" },
  });
  if (response.ok === false) throw new Error(`presence ${response.status}`);
  const payload = await response.json();
  if (payload?.success !== true) return null;
  return sanitizePresence(payload.data);
}
