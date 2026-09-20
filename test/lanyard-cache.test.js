import { describe, it, expect, beforeEach } from "vitest";
import {
  sanitizePresence,
  readCachedPresence,
  writeCachedPresence,
} from "../src/lib/lanyard-cache.js";

// Minimal localStorage stub for the node test environment.
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
  removeItem(k) {
    this.map.delete(k);
  }
}

beforeEach(() => {
  globalThis.localStorage = new MemStore();
});

describe("sanitizePresence — kv whitelist", () => {
  it("keeps exact allowed keys", () => {
    const out = sanitizePresence({ kv: { apps_today: '{"apps":[]}', music_now: "{}" } });
    expect(Object.keys(out.kv).sort()).toEqual(["apps_today", "music_now"]);
  });
  it("keeps device-suffixed keys", () => {
    const out = sanitizePresence({
      kv: { apps_today_mac: "{}", keyboard_today_win: "{}", health_today_x: "{}" },
    });
    expect(Object.keys(out.kv).sort()).toEqual([
      "apps_today_mac",
      "health_today_x",
      "keyboard_today_win",
    ]);
  });
  it("drops unknown keys", () => {
    const out = sanitizePresence({ kv: { secret_key: "x", apps_today: "{}" } });
    expect(Object.keys(out.kv)).toEqual(["apps_today"]);
  });
  it("caps activities at 16 and drops empty", () => {
    const activities = Array.from({ length: 30 }, (_, i) => ({ name: "a" + i }));
    const out = sanitizePresence({ activities });
    expect(out.activities).toHaveLength(16);
    expect(sanitizePresence({ activities: [{ details: "" }] }).activities).toHaveLength(0);
  });
  it("returns null for non-object", () => {
    expect(sanitizePresence(null)).toBeNull();
    expect(sanitizePresence([])).toBeNull();
    expect(sanitizePresence("x")).toBeNull();
  });
  it("truncates long strings", () => {
    const out = sanitizePresence({ discord_status: "x".repeat(100) });
    expect(out.discord_status.length).toBe(32);
  });
});

describe("cache read/write roundtrip", () => {
  it("writes then reads sanitized presence", () => {
    writeCachedPresence("u1", { discord_status: "online", kv: { apps_today: "{}", bad: "x" } });
    const out = readCachedPresence("u1");
    expect(out.discord_status).toBe("online");
    expect(Object.keys(out.kv)).toEqual(["apps_today"]);
  });
  it("returns null without userId", () => {
    expect(readCachedPresence("")).toBeNull();
  });
  it("expires after 30 minutes", () => {
    writeCachedPresence("u1", { discord_status: "online" });
    expect(readCachedPresence("u1", Date.now())).not.toBeNull();
    expect(readCachedPresence("u1", Date.now() + 31 * 60 * 1000)).toBeNull();
  });
  it("returns null for invalid cache JSON", () => {
    localStorage.setItem("ruoli:lanyard:1:u1", "{bad");
    expect(readCachedPresence("u1")).toBeNull();
  });
  it("ignores version mismatch", () => {
    localStorage.setItem(
      "ruoli:lanyard:1:u1",
      JSON.stringify({ v: 999, savedAt: Date.now(), presence: {} })
    );
    expect(readCachedPresence("u1")).toBeNull();
  });
});
