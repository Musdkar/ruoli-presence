// Browser-side presence cache. Sanitization itself lives in the shared module
// under api/ so the server function and the browser sanitize identically.
import { sanitizePresence } from "../../api/lib/presence-sanitize.cjs";

export { sanitizePresence };

const CACHE_VERSION = 1;
const CACHE_MAX_AGE = 30 * 60 * 1000;

const cacheKey = (userId) => `ruoli:lanyard:${CACHE_VERSION}:${userId}`;

export function readCachedPresence(userId, now = Date.now()) {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(cacheKey(userId));
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

export function writeCachedPresence(userId, value) {
  if (!userId) return;
  const presence = sanitizePresence(value);
  if (!presence) return;
  try {
    localStorage.setItem(
      cacheKey(userId),
      JSON.stringify({
        v: CACHE_VERSION,
        savedAt: Date.now(),
        presence,
      })
    );
  } catch {}
}

// Read presence through our own origin. The function proxies Lanyard with the
// server-side user id, so the browser never talks to api.lanyard.rest directly
// and no id has to be embedded in the bundle.
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
