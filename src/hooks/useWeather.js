import { useEffect, useState } from "react";
import { config } from "../config";
import {
  normalizeWeather,
  readWeatherCache,
  writeWeatherCache,
  WEATHER_REQUEST_TIMEOUT_MS,
} from "../lib/weather";

// Reads cached weather immediately, then refreshes from Open-Meteo with a
// bounded timeout. On failure the last-good (or false) value is kept.
export function useWeather() {
  const [weather, setWeather] = useState(readWeatherCache);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEATHER_REQUEST_TIMEOUT_MS);
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=" + config.weatherLat + "&longitude=" + config.weatherLng + "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=" + encodeURIComponent(config.timezone);
    fetch(url, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("weather " + r.status);
        return r.json();
      })
      .then((data) => {
        const next = normalizeWeather(data && data.current);
        if (!next) throw new Error("weather invalid");
        setWeather(next);
        writeWeatherCache(next);
      })
      .catch(() => setWeather((current) => current || false))
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);
  return weather;
}
