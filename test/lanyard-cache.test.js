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

describe("sanitizePresence — kv value size boundary", () => {
  it("keeps a normal-sized string KV value", () => {
    const value = JSON.stringify({ apps: [{ name: "VS Code", minutes: 12 }] });
    const out = sanitizePresence({ kv: { apps_today: value } });
    expect(out.kv.apps_today).toBe(value);
  });

  it("keeps a normal-sized object KV value", () => {
    const out = sanitizePresence({ kv: { health_today: { steps: 5000, heartRate: 62 } } });
    expect(out.kv.health_today).toEqual({ steps: 5000, heartRate: 62 });
  });

  it("drops an oversized string KV value", () => {
    const huge = "x".repeat(64 * 1024);
    const out = sanitizePresence({ kv: { apps_today: huge, music_now: "{}" } });
    expect(Object.keys(out.kv)).toEqual(["music_now"]);
  });

  it("drops an oversized object KV value", () => {
    const huge = { blob: "x".repeat(64 * 1024) };
    const out = sanitizePresence({ kv: { apps_today: huge, music_now: "{}" } });
    expect(Object.keys(out.kv)).toEqual(["music_now"]);
  });

  it("keeps a music_now payload at the realistic ingest ceiling", () => {
    // The music API caps artwork at ~26k chars; that must survive sanitization.
    const cover = "data:image/jpeg;base64," + "A".repeat(26000);
    const value = JSON.stringify({ v: 1, state: "playing", cover });
    expect(value.length).toBeLessThan(32768);
    const out = sanitizePresence({ kv: { music_now: value } });
    expect(out.kv.music_now).toBe(value);
  });

  it("drops a circular object instead of throwing", () => {
    const circular = {};
    circular.self = circular;
    expect(() => sanitizePresence({ kv: { apps_today: circular } })).not.toThrow();
    const out = sanitizePresence({ kv: { apps_today: circular, apps_today_win: "{}" } });
    expect(Object.keys(out.kv)).toEqual(["apps_today_win"]);
  });

  it("does not let an oversized value inflate the cached write", () => {
    writeCachedPresence({ kv: { apps_today: "x".repeat(64 * 1024), music_now: "{}" } });
    const raw = localStorage.getItem("ruoli:presence:2");
    expect(raw.length).toBeLessThan(4096);
    expect(Object.keys(readCachedPresence().kv)).toEqual(["music_now"]);
  });
});

describe("cache read/write roundtrip", () => {
  it("returns null when nothing is cached", () => {
    expect(readCachedPresence()).toBeNull();
  });
  it("writes then reads sanitized presence", () => {
    writeCachedPresence({ discord_status: "online", kv: { apps_today: "{}", bad: "x" } });
    const out = readCachedPresence();
    expect(out.discord_status).toBe("online");
    expect(Object.keys(out.kv)).toEqual(["apps_today"]);
  });
  it("expires after 30 minutes", () => {
    writeCachedPresence({ discord_status: "online" });
    expect(readCachedPresence(Date.now())).not.toBeNull();
    expect(readCachedPresence(Date.now() + 31 * 60 * 1000)).toBeNull();
  });
  it("returns null for invalid cache JSON", () => {
    localStorage.setItem("ruoli:presence:2", "{bad");
    expect(readCachedPresence()).toBeNull();
  });
  it("ignores version mismatch", () => {
    localStorage.setItem(
      "ruoli:presence:2",
      JSON.stringify({ v: 999, savedAt: Date.now(), presence: {} })
    );
    expect(readCachedPresence()).toBeNull();
  });
});
