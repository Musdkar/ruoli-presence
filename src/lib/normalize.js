// Shape validation for published KV payloads. Anything that does not match
// the documented shape is treated as "not linked" rather than as data. A
// plausibility cap also keeps hostile numbers out of the range charts and
// the DOM, since values around 2e307 can freeze rendering.

export const safeJSON = (value, fallback = null) => {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

// Type-check first, convert second: Number() on a non-primitive throws.
// Optional bounds reject negative, non-finite and absurdly large values.
export const toFiniteNumber = (value, max) => {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const n = Number(value);
  if (Number.isFinite(n) === false) return null;
  if (n < 0) return null;
  if (max != null && n > max) return null;
  return n;
};

// Cap the list and drop entries that are not { name: string, minutes: 0..1440 }.
export const MAX_APP_MINUTES = 1440;
export const normalizeApps = (value) => {
  const parsed = safeJSON(value, null);
  const raw = parsed != null && Array.isArray(parsed.apps) ? parsed.apps : [];
  const out = [];
  for (const item of raw) {
    if (item == null || typeof item !== "object" || Array.isArray(item)) continue;
    if (typeof item.name !== "string") continue;
    const m = toFiniteNumber(item.minutes, 1440);
    if (m == null) continue;
    const name = item.name.trim().slice(0, 120);
    if (name === "") continue;
    out.push({ name, minutes: m });
    if (out.length >= 8) break;
  }
  return out;
};

// Accept only an object with plausible steps (0..1000000) and/or
// heartRate (0..300); otherwise "not linked".
export const normalizeHealth = (value) => {
  const parsed = safeJSON(value, null);
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const steps = toFiniteNumber(parsed.steps, 1000000);
  const hr = toFiniteNumber(parsed.heartRate, 300);
  if (steps == null && hr == null) return null;
  return { steps: steps == null ? 0 : steps, heartRate: hr };
};

export const normalizeKeyboard = (value) => {
  const parsed = safeJSON(value, null);
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  if (
    parsed.v !== 1 ||
    typeof parsed.date !== "string" ||
    /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) === false
  )
    return null;
  if (parsed.heat == null || typeof parsed.heat !== "object" || Array.isArray(parsed.heat))
    return null;
  const heat = {};
  let seen = 0;
  for (const [rawKey, rawLevel] of Object.entries(parsed.heat)) {
    if (seen >= 100) break;
    const key = String(rawKey).toUpperCase().slice(0, 16);
    const level = toFiniteNumber(rawLevel, 15);
    if (key === "" || level == null) continue;
    heat[key] = Math.round(level);
    seen += 1;
  }
  if (Object.keys(heat).length === 0) return null;
  const total = toFiniteNumber(parsed.total, 10000000);
  if (total == null) return null;
  return { v: 1, date: parsed.date, total: Math.round(total), heat };
};

// Music is a separate domain from Discord presence. Local collectors publish a
// canonical record; Spotify is adapted into the same shape only as a fallback.
export const MUSIC_LIVE_MAX_AGE = 90 * 1000;
const MUSIC_STATES = ["playing", "paused", "last_played"];
const MUSIC_SERVICES = ["netease", "apple_music", "spotify"];
const LEGACY_SERVICE = {
  netease: "netease",
  appleMusic: "apple_music",
  apple_music: "apple_music",
  spotify: "spotify",
};
const text = (value) =>
  typeof value === "string" && value.trim() !== "" ? value.trim().slice(0, 200) : null;
const observedAt = (value) =>
  typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
const isDataCover = (value) =>
  typeof value === "string" &&
  value.length <= 26000 &&
  /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
const isHttpsCover = (value) =>
  typeof value === "string" && value.length <= 2048 && /^https:\/\//i.test(value);
const artwork = (value) =>
  isDataCover(value)
    ? { kind: "data", url: value }
    : isHttpsCover(value)
      ? { kind: "https", url: value }
      : { kind: "none", url: null };
const neverMusic = () => ({
  v: 1,
  state: "never",
  service: null,
  collector: null,
  track: null,
  artwork: { kind: "none", url: null },
  observedAt: null,
});

export const normalizeMusic = (value) => {
  const parsed = safeJSON(value, null);
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  // Canonical v1 record written by /api/music.
  if (
    parsed.v === 1 &&
    parsed.track &&
    typeof parsed.track === "object" &&
    !Array.isArray(parsed.track)
  ) {
    const state = MUSIC_STATES.includes(parsed.state) ? parsed.state : null;
    const service = MUSIC_SERVICES.includes(parsed.service) ? parsed.service : null;
    const title = text(parsed.track.title),
      artist = text(parsed.track.artist);
    if (state == null || service == null || title == null || artist == null) return null;
    const rawArtwork =
      parsed.artwork && typeof parsed.artwork === "object" && !Array.isArray(parsed.artwork)
        ? parsed.artwork.url
        : null;
    return {
      v: 1,
      state,
      service,
      collector: typeof parsed.collector === "string" ? parsed.collector : "unknown",
      track: { title, artist, album: text(parsed.track.album) },
      artwork: artwork(rawArtwork),
      observedAt: observedAt(parsed.observedAt),
    };
  }

  // Transitional support for the pre-schema music_now payload already present
  // in Lanyard KV. Missing timestamps are intentionally not trusted as live.
  const title = text(parsed.title),
    artist = text(parsed.artist);
  const service = LEGACY_SERVICE[parsed.source] || null;
  if (title == null || artist == null || service == null) return null;
  const ts = observedAt(parsed.updatedAt);
  let state = MUSIC_STATES.includes(parsed.state)
    ? parsed.state
    : parsed.playing === true
      ? "playing"
      : "last_played";
  if ((state === "playing" || state === "paused") && ts == null) state = "last_played";
  return {
    v: 1,
    state,
    service,
    collector: "legacy",
    track: { title, artist, album: text(parsed.album) },
    artwork: artwork(parsed.cover),
    observedAt: ts,
  };
};

export const normalizeSpotify = (spot) => {
  if (spot == null || typeof spot !== "object") return null;
  const title = text(spot.song),
    artist = text(spot.artist);
  if (title == null || artist == null) return null;
  return {
    v: 1,
    state: "playing",
    service: "spotify",
    collector: "lanyard_spotify",
    track: { title, artist, album: text(spot.album) },
    artwork: artwork(spot.album_art_url),
    observedAt: null,
  };
};

export const resolveMusic = (localValue, spotifyValue, now = Date.now()) => {
  const local = normalizeMusic(localValue);
  const spotify = normalizeSpotify(spotifyValue);
  let resolvedLocal = local;

  // A live local state requires a fresh collector heartbeat. If the bridge or
  // Mac disappears, preserve the track forever but degrade it to last_played.
  if (local && (local.state === "playing" || local.state === "paused")) {
    const seen = local.observedAt == null ? NaN : Date.parse(local.observedAt);
    if (
      Number.isFinite(seen) === false ||
      seen > now + 5 * 60 * 1000 ||
      now - seen > MUSIC_LIVE_MAX_AGE
    ) {
      resolvedLocal = { ...local, state: "last_played" };
    }
  }

  if (resolvedLocal?.state === "playing") return resolvedLocal;
  if (resolvedLocal?.state === "paused") return resolvedLocal;
  if (spotify) return spotify;
  if (resolvedLocal) return resolvedLocal;
  return neverMusic();
};

// Merge per-device software usage lists into one row per app name (sum of
// minutes), sorted descending. Device lists come from separate KV entries and
// must be de-duplicated by name, not concatenated.
export const mergeAppUsage = (...lists) => {
  const byName = new Map();
  for (const list of lists) {
    for (const app of list || []) {
      if (app == null || typeof app.name !== "string") continue;
      const cur = byName.get(app.name) || 0;
      byName.set(app.name, cur + (Number(app.minutes) || 0));
    }
  }
  return Array.from(byName, (entry) => ({
    name: entry[0],
    minutes: Math.round(entry[1] * 10) / 10,
  })).sort((a, b) => b.minutes - a.minutes);
};
