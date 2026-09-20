import { useT } from "../../i18n";
import { useWeather } from "../../hooks/useWeather";
import CardHead from "./CardHead.jsx";

export default function WeatherCard() {
  const T = useT();
  const weather = useWeather();
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
