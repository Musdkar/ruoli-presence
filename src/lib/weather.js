// Weather payload validation + cache helpers. Never trust the raw API body:
// each field must be a finite number within a loose plausibility bound.

export const WEATHER_REQUEST_TIMEOUT_MS = 8000;
export const WEATHER_CACHE_KEY = "ruoli:weather:v1";
export const WEATHER_CACHE_MAX_AGE = 30 * 60 * 1000;

function finiteIn(value, min, max) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

// Returns a small, validated weather record, or null if unusable.
export function normalizeWeather(value) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  const temperature = finiteIn(value.temperature_2m, -120, 80);
  if (temperature == null) return null;
  return {
    temperature_2m: temperature,
    apparent_temperature: finiteIn(value.apparent_temperature, -120, 80),
    weather_code: finiteIn(value.weather_code, 0, 99),
    wind_speed_10m: finiteIn(value.wind_speed_10m, 0, 500),
  };
}

export function readWeatherCache(now = Date.now()) {
  try {
    const parsed = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || "null");
    if (!parsed || !Number.isFinite(parsed.savedAt)) return null;
    if (now - parsed.savedAt > WEATHER_CACHE_MAX_AGE) return null;
    return normalizeWeather(parsed.weather);
  } catch {
    return null;
  }
}

export function writeWeatherCache(weather, now = Date.now()) {
  try {
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ savedAt: now, weather }));
  } catch {
    /* storage unavailable; best-effort cache */
  }
}
