import { useEffect, useState } from "react";
import { config } from "../../config";
import { useT } from "../../i18n";
import CardHead from "./CardHead.jsx";

const WEATHER_CACHE_KEY = "ruoli:weather:v1";
const WEATHER_CACHE_MAX_AGE = 30 * 60 * 1000;
function readWeatherCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || "null");
    if (
      !parsed ||
      !Number.isFinite(parsed.savedAt) ||
      Date.now() - parsed.savedAt > WEATHER_CACHE_MAX_AGE
    )
      return null;
    return parsed.weather && typeof parsed.weather === "object" ? parsed.weather : null;
  } catch {
    return null;
  }
}

export default function WeatherCard() {
  const T = useT();
  const [weather, setWeather] = useState(readWeatherCache);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${config.weatherLat}&longitude=${config.weatherLng}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=${encodeURIComponent(config.timezone)}`,
      { signal: controller.signal }
    )
      .then((r) => {
        if (!r.ok) throw new Error("weather " + r.status);
        return r.json();
      })
      .then((data) => {
        const next = data.current || null;
        if (!next) throw new Error("weather missing current");
        setWeather(next);
        try {
          localStorage.setItem(
            WEATHER_CACHE_KEY,
            JSON.stringify({ savedAt: Date.now(), weather: next })
          );
        } catch {}
      })
      .catch(() => setWeather((current) => current || false))
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);
  return (
    <article className="card weather-card">
      <CardHead title={T.weather + " · Wuhan"} />
      <div className="weather-main">
        <div>
          <strong>
            {weather && weather.temperature_2m != null
              ? Math.round(weather.temperature_2m) + "°"
              : "--°"}
          </strong>
          <span>
            {weather
              ? T.weatherCodes[weather.weather_code] || T.currentWeather
              : weather === false
                ? T.unavailable
                : T.loading}
          </span>
        </div>
        {weather && (
          <small>
            {T.feels} {Math.round(weather.apparent_temperature)}°<br />
            {T.wind} {Math.round(weather.wind_speed_10m)} km/h
          </small>
        )}
      </div>
    </article>
  );
}
