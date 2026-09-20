import { describe, it, expect } from "vitest";
import {
  safeJSON,
  toFiniteNumber,
  normalizeApps,
  normalizeHealth,
  normalizeKeyboard,
  normalizeMusic,
  normalizeSpotify,
  resolveMusic,
  MUSIC_LIVE_MAX_AGE,
} from "../src/lib/normalize.js";

describe("safeJSON", () => {
  it("returns fallback for null/empty", () => {
    expect(safeJSON(null, "fb")).toBe("fb");
    expect(safeJSON("", "fb")).toBe("fb");
  });
  it("passes objects through", () => {
    const o = { a: 1 };
    expect(safeJSON(o)).toBe(o);
  });
  it("parses JSON strings", () => {
    expect(safeJSON('{"a":1}')).toEqual({ a: 1 });
  });
  it("returns fallback on invalid JSON", () => {
    expect(safeJSON("{bad", "fb")).toBe("fb");
  });
});

describe("toFiniteNumber", () => {
  it("accepts finite numbers and numeric strings", () => {
    expect(toFiniteNumber(5)).toBe(5);
    expect(toFiniteNumber("5")).toBe(5);
  });
  it("rejects negative, non-finite, non-primitive", () => {
    expect(toFiniteNumber(-1)).toBeNull();
    expect(toFiniteNumber(Infinity)).toBeNull();
    expect(toFiniteNumber(NaN)).toBeNull();
    expect(toFiniteNumber({})).toBeNull();
    expect(toFiniteNumber(null)).toBeNull();
  });
  it("enforces max bound", () => {
    expect(toFiniteNumber(11, 10)).toBeNull();
    expect(toFiniteNumber(10, 10)).toBe(10);
  });
});

describe("normalizeApps", () => {
  it("returns [] for null / invalid JSON / non-array", () => {
    expect(normalizeApps(null)).toEqual([]);
    expect(normalizeApps("{bad")).toEqual([]);
    expect(normalizeApps('{"apps":"x"}')).toEqual([]);
  });
  it("keeps valid items and drops malformed / bad minutes", () => {
    const out = normalizeApps({
      apps: [
        { name: "A", minutes: 10 },
        { name: "B", minutes: -5 },
        { name: "C", minutes: Infinity },
        { name: "D", minutes: 5000 },
        { name: "E", minutes: "x" },
        { minutes: 3 },
        null,
        { name: "F", minutes: 1 },
      ],
    });
    expect(out).toEqual([
      { name: "A", minutes: 10 },
      { name: "F", minutes: 1 },
    ]);
  });
  it("caps at 8 rows", () => {
    const apps = Array.from({ length: 20 }, (_, i) => ({ name: "a" + i, minutes: i + 1 }));
    expect(normalizeApps({ apps })).toHaveLength(8);
  });
  it("accepts a JSON string payload", () => {
    expect(normalizeApps('{"apps":[{"name":"A","minutes":3}]}')).toEqual([
      { name: "A", minutes: 3 },
    ]);
  });
});

describe("normalizeHealth", () => {
  it("returns null for empty payload", () => {
    expect(normalizeHealth(null)).toBeNull();
    expect(normalizeHealth("{}")).toBeNull();
    expect(normalizeHealth({})).toBeNull();
  });
  it("accepts steps and heartRate", () => {
    expect(normalizeHealth({ steps: 100, heartRate: 60 })).toEqual({ steps: 100, heartRate: 60 });
  });
  it("defaults steps to 0 when only heartRate present", () => {
    expect(normalizeHealth({ heartRate: 70 })).toEqual({ steps: 0, heartRate: 70 });
  });
  it("rejects absurd values but keeps the other field", () => {
    expect(normalizeHealth({ steps: 5_000_000, heartRate: 60 })).toEqual({
      steps: 0,
      heartRate: 60,
    });
    expect(normalizeHealth({ steps: 5_000_000, heartRate: 999 })).toBeNull();
  });
});

describe("normalizeKeyboard", () => {
  const base = { v: 1, date: "2026-09-20", total: 100, heat: { A: 5 } };
  it("rejects wrong schema version / bad date / bad heat", () => {
    expect(normalizeKeyboard({ ...base, v: 2 })).toBeNull();
    expect(normalizeKeyboard({ ...base, date: "20-09-2026" })).toBeNull();
    expect(normalizeKeyboard({ ...base, heat: null })).toBeNull();
    expect(normalizeKeyboard({ ...base, heat: [] })).toBeNull();
  });
  it("drops out-of-range heat and unknown/invalid keys", () => {
    const out = normalizeKeyboard({ ...base, heat: { A: 5, B: 99, "": 3, C: "x" } });
    expect(out.heat).toEqual({ A: 5 });
  });
  it("uppercases and truncates keys, caps at 100", () => {
    const heat = {};
    for (let i = 0; i < 150; i++) heat["k" + i] = 1;
    const out = normalizeKeyboard({ ...base, heat });
    expect(Object.keys(out.heat).length).toBe(100);
  });
  it("returns null when no valid keys remain", () => {
    expect(normalizeKeyboard({ ...base, heat: { A: 99 } })).toBeNull();
  });
  it("rounds total and keeps valid shape", () => {
    expect(normalizeKeyboard({ ...base, total: 10.6 }).total).toBe(11);
  });
});

describe("normalizeMusic (canonical v1)", () => {
  const good = {
    v: 1,
    state: "playing",
    service: "netease",
    collector: "macos_nowplaying",
    track: { title: "T", artist: "A", album: "Al" },
    artwork: { url: "https://x/y.jpg" },
    observedAt: "2026-09-20T10:00:00+08:00",
  };
  it("accepts a valid canonical record", () => {
    const out = normalizeMusic(good);
    expect(out.state).toBe("playing");
    expect(out.service).toBe("netease");
    expect(out.artwork).toEqual({ kind: "https", url: "https://x/y.jpg" });
  });
  it("rejects invalid state / service", () => {
    expect(normalizeMusic({ ...good, state: "weird" })).toBeNull();
    expect(normalizeMusic({ ...good, service: "youtube" })).toBeNull();
  });
  it("rejects invalid artwork protocol", () => {
    const out = normalizeMusic({ ...good, artwork: { url: "http://x/y.jpg" } });
    expect(out.artwork).toEqual({ kind: "none", url: null });
  });
  it("rejects oversized data URL", () => {
    const big = "data:image/jpeg;base64," + "A".repeat(30000);
    expect(normalizeMusic({ ...good, artwork: { url: big } }).artwork.kind).toBe("none");
  });
  it("nulls malformed observedAt", () => {
    expect(normalizeMusic({ ...good, observedAt: "not-a-date" }).observedAt).toBeNull();
  });
});

describe("normalizeMusic (legacy)", () => {
  it("maps legacy source and playing flag", () => {
    const out = normalizeMusic({
      title: "T",
      artist: "A",
      source: "appleMusic",
      playing: true,
      updatedAt: "2026-09-20T10:00:00+08:00",
    });
    expect(out.service).toBe("apple_music");
    expect(out.collector).toBe("legacy");
    expect(out.state).toBe("playing");
  });
  it("downgrades live legacy state when timestamp missing", () => {
    const out = normalizeMusic({ title: "T", artist: "A", source: "netease", playing: true });
    expect(out.state).toBe("last_played");
  });
});

describe("normalizeSpotify", () => {
  it("returns null without song/artist", () => {
    expect(normalizeSpotify(null)).toBeNull();
    expect(normalizeSpotify({ song: "s" })).toBeNull();
  });
  it("adapts to canonical shape", () => {
    const out = normalizeSpotify({
      song: "s",
      artist: "a",
      album: "al",
      album_art_url: "https://c/x",
    });
    expect(out.service).toBe("spotify");
    expect(out.state).toBe("playing");
    expect(out.artwork.kind).toBe("https");
  });
});

describe("resolveMusic precedence", () => {
  const now = Date.parse("2026-09-20T10:00:00+08:00");
  const fresh = new Date(now - 1000).toISOString();
  const stale = new Date(now - (MUSIC_LIVE_MAX_AGE + 60000)).toISOString();
  const local = (state, observedAt) => ({
    v: 1,
    state,
    service: "netease",
    collector: "c",
    track: { title: "T", artist: "A" },
    artwork: { url: null },
    observedAt,
  });
  const spotify = { song: "S", artist: "A", album_art_url: "https://c/x" };

  it("fresh playing beats Spotify", () => {
    expect(resolveMusic(local("playing", fresh), spotify, now).service).toBe("netease");
  });
  it("fresh paused beats Spotify", () => {
    expect(resolveMusic(local("paused", fresh), spotify, now).state).toBe("paused");
  });
  it("stale playing degrades to last_played", () => {
    const out = resolveMusic(local("playing", stale), null, now);
    expect(out.state).toBe("last_played");
  });
  it("Spotify wins over a local last_played", () => {
    expect(resolveMusic(local("last_played", fresh), spotify, now).service).toBe("spotify");
  });
  it("local last_played used when Spotify absent", () => {
    expect(resolveMusic(local("last_played", fresh), null, now).state).toBe("last_played");
  });
  it("future timestamp is treated as not fresh", () => {
    const future = new Date(now + 10 * 60 * 1000).toISOString();
    expect(resolveMusic(local("playing", future), null, now).state).toBe("last_played");
  });
  it("nothing resolves to never", () => {
    expect(resolveMusic(null, null, now).state).toBe("never");
  });
});

import { mergeAppUsage } from "../src/lib/normalize.js";

describe("mergeAppUsage", () => {
  it("sums minutes per app name and sorts desc", () => {
    const out = mergeAppUsage(
      [
        { name: "Edge", minutes: 40 },
        { name: "QQ", minutes: 10 },
      ],
      [
        { name: "Edge", minutes: 20 },
        { name: "ChatGPT", minutes: 5 },
      ]
    );
    expect(out).toEqual([
      { name: "Edge", minutes: 60 },
      { name: "QQ", minutes: 10 },
      { name: "ChatGPT", minutes: 5 },
    ]);
  });
  it("handles empty / missing lists", () => {
    expect(mergeAppUsage(null, undefined, [])).toEqual([]);
    expect(mergeAppUsage([{ name: "A", minutes: 1 }])).toEqual([{ name: "A", minutes: 1 }]);
  });
  it("rounds to one decimal", () => {
    const out = mergeAppUsage([
      { name: "A", minutes: 1.04 },
      { name: "A", minutes: 1.04 },
    ]);
    expect(out).toEqual([{ name: "A", minutes: 2.1 }]);
  });
  it("ignores malformed entries", () => {
    expect(mergeAppUsage([null, { minutes: 5 }, { name: 3 }])).toEqual([]);
  });
});

describe("normalizeApps name cap", () => {
  it("caps long app names and drops empty names", () => {
    const long = "x".repeat(300);
    const out = normalizeApps({
      apps: [
        { name: long, minutes: 1 },
        { name: "   ", minutes: 2 },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].name.length).toBe(120);
  });
});
