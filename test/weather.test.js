import { describe, it, expect, beforeEach } from "vitest";
import {
  normalizeWeather,
  readWeatherCache,
  writeWeatherCache,
  WEATHER_CACHE_MAX_AGE,
} from "../src/lib/weather.js";

class MemStore {
  constructor() {
    this.map = new Map();
  }
  getItem(k) {
    return this.map.has(k) ? this.map.get(k) : null;
  }
  setItem(k, v) {
    this.map.set(k, String(v));
  }
}

beforeEach(() => {
  globalThis.localStorage = new MemStore();
});

describe("normalizeWeather", () => {
  it("accepts a valid current payload", () => {
    const out = normalizeWeather({
      temperature_2m: 20.4,
      apparent_temperature: 19,
      weather_code: 3,
      wind_speed_10m: 12,
    });
    expect(out).toEqual({
      temperature_2m: 20.4,
      apparent_temperature: 19,
      weather_code: 3,
      wind_speed_10m: 12,
    });
  });
  it("rejects non-objects and missing temperature", () => {
    expect(normalizeWeather(null)).toBeNull();
    expect(normalizeWeather([])).toBeNull();
    expect(normalizeWeather({ apparent_temperature: 1 })).toBeNull();
  });
  it("rejects absurd / non-finite numbers but tolerates null optionals", () => {
    expect(normalizeWeather({ temperature_2m: 9999 })).toBeNull();
    expect(normalizeWeather({ temperature_2m: Infinity })).toBeNull();
    const out = normalizeWeather({ temperature_2m: 5 });
    expect(out.apparent_temperature).toBeNull();
    expect(out.weather_code).toBeNull();
  });
});

describe("weather cache", () => {
  it("round-trips a valid record", () => {
    writeWeatherCache({ temperature_2m: 10, weather_code: 1 });
    const out = readWeatherCache();
    expect(out.temperature_2m).toBe(10);
  });
  it("expires after the max age", () => {
    writeWeatherCache({ temperature_2m: 10 });
    expect(readWeatherCache()).not.toBeNull();
    expect(readWeatherCache(Date.now() + WEATHER_CACHE_MAX_AGE + 1000)).toBeNull();
  });
  it("returns null when cache missing or invalid", () => {
    expect(readWeatherCache()).toBeNull();
    localStorage.setItem("ruoli:weather:v1", "{bad");
    expect(readWeatherCache()).toBeNull();
  });
});
