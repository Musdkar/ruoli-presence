// Shared presence sanitization — the single source of truth for what leaves the
// server and what the browser is allowed to keep. It lives under api/ because
// the Azure Static Web Apps deployment uploads that folder as its own unit, so
// the function always ships with it; the Vite frontend imports the same file,
// so there is no second copy to drift.
//
// Written as ESM (a single module for both runtimes). The frontend imports it
// directly; the CommonJS Azure Function loads it with a cached dynamic import()
// inside the handler. No dependencies, so it loads in either environment.

// Exact keys plus per-device slots like apps_today_mac / keyboard_today_win.
// Device suffixes stay separate; nothing is merged across machines.
const KV_KEYS = [
  "phone_presence",
  "apps_today",
  "health_today",
  "keyboard_today",
  "keyboard_yesterday",
  "music_now",
];
const KV_KEY_RE =
  /^(?:apps_today|keyboard_today|keyboard_yesterday|health_today)_[a-z0-9_-]{1,16}$/;
const isAllowedKvKey = (key) => KV_KEYS.includes(key) || KV_KEY_RE.test(key);

// Per-value ceiling for whitelisted KV entries. The largest legitimate payload is
// music_now, whose artwork the ingest API already caps at ~26k chars; 32768 gives
// headroom while keeping an abnormal payload from producing a huge response, a
// huge localStorage write or undue memory use.
const KV_VALUE_MAX_CHARS = 32768;

// A whitelisted KV value must be a string, or an object that serializes to JSON,
// within the size ceiling. Oversized or unserializable values are dropped.
function boundedKvValue(item) {
  if (typeof item === "string") {
    return item.length <= KV_VALUE_MAX_CHARS ? item : null;
  }
  if (item && typeof item === "object") {
    let serialized;
    try {
      serialized = JSON.stringify(item);
    } catch {
      return null;
    }
    return serialized !== undefined && serialized.length <= KV_VALUE_MAX_CHARS ? item : null;
  }
  return null;
}

function cleanText(value, max = 300) {
  return typeof value === "string" ? value.slice(0, max) : null;
}

// Reduce an arbitrary upstream presence payload to exactly the fields the UI
// consumes. Returns null for anything that is not a plain object.
export function sanitizePresence(value) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  const kv = {};
  if (value.kv && typeof value.kv === "object" && !Array.isArray(value.kv)) {
    for (const key of Object.keys(value.kv)) {
      if (isAllowedKvKey(key) === false) continue;
      const item = boundedKvValue(value.kv[key]);
      if (item !== null) kv[key] = item;
    }
  }

  const activities = Array.isArray(value.activities)
    ? value.activities
        .slice(0, 16)
        .map((item) => ({
          name: cleanText(item && item.name, 120),
          details: cleanText(item && item.details, 240),
          state: cleanText(item && item.state, 240),
        }))
        .filter((item) => item.name || item.details || item.state)
    : [];

  const spot =
    value.spotify && typeof value.spotify === "object" && !Array.isArray(value.spotify)
      ? {
          song: cleanText(value.spotify.song, 200),
          artist: cleanText(value.spotify.artist, 200),
          album: cleanText(value.spotify.album, 200),
          album_art_url: cleanText(value.spotify.album_art_url, 2048),
        }
      : null;

  return {
    discord_status: cleanText(value.discord_status, 32),
    activities,
    spotify: spot,
    kv,
  };
}

export { isAllowedKvKey, KV_VALUE_MAX_CHARS };
