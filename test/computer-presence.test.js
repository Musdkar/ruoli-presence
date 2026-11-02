import { describe, expect, it } from "vitest";
import { selectComputerUsage, selectMusicValue } from "../api/lib/computer-presence.mjs";

const now = Date.parse("2026-11-02T16:00:00+08:00");
const keyboard = (total, heat, date = "2026-11-02") => ({ v: 1, date, total, heat });
const apps = (minutes, date = "2026-11-02") => ({ date, apps: [{ name: "Edge", minutes }] });
const music = (state, age = 1000, title = state) => ({
  v: 1,
  state,
  service: "netease",
  track: { title, artist: "Artist" },
  observedAt: new Date(now - age).toISOString(),
});

describe("computer daily snapshots", () => {
  it("combines the two PC systems while keeping Mac separate", () => {
    const kv = {
      keyboard_today_mac: keyboard(10, { A: 2 }),
      keyboard_today_win: JSON.stringify(keyboard(100, { A: 5, CONTROL: 3 })),
      keyboard_today_mac_intel: keyboard(50, { A: 9, COMMAND: 7 }),
      apps_today_mac: apps(5),
      apps_today_win: apps(10),
      apps_today_mac_intel: apps(20),
    };
    const result = selectComputerUsage(kv, now);
    expect(result.keyboardMac.total).toBe(10);
    expect(result.keyboardPC).toEqual(keyboard(150, { A: 9, CONTROL: 3, COMMAND: 7 }));
    expect(result.apps).toEqual([{ name: "Edge", minutes: 35 }]);
    // A refreshed cumulative source replaces the earlier snapshot.
    expect(
      selectComputerUsage({ ...kv, keyboard_today_win: keyboard(110, { A: 6 }) }, now).keyboardPC
        .total
    ).toBe(160);
  });
  it("counts a legacy alias once and rejects old/future dates", () => {
    expect(
      selectComputerUsage(
        {
          keyboard_today: keyboard(10, { A: 1 }),
          keyboard_today_mac: keyboard(10, { A: 1 }),
          apps_today: apps(10),
          apps_today_mac: apps(10),
          keyboard_today_win: keyboard(500, { A: 15 }, "2026-11-01"),
          keyboard_today_mac_intel: keyboard(600, { A: 15 }, "2026-11-03"),
          apps_today_win: apps(50, "2026-11-01"),
        },
        now
      )
    ).toMatchObject({
      keyboardMac: { total: 10 },
      keyboardPC: null,
      apps: [{ name: "Edge", minutes: 10 }],
    });
  });
  it("uses UTC+8 midnight and safely handles malformed entries", () => {
    const boundary = Date.parse("2026-11-02T16:00:00Z");
    expect(
      selectComputerUsage({ keyboard_today_win: keyboard(10, { A: 3 }) }, boundary).keyboardPC
    ).toBeNull();
    expect(
      selectComputerUsage(
        {
          keyboard_today_win: "broken",
          keyboard_today_mac_intel: { v: 1, date: "2026-11-02", total: Infinity, heat: { A: 2 } },
          apps_today_win: { date: "2026-11-02", apps: [null, { name: "Bad", minutes: -5 }] },
        },
        now
      )
    ).toEqual({ apps: [], keyboardMac: null, keyboardPC: null });
  });
});

describe("music from separate collectors", () => {
  it("keeps fresh legacy playing:true ahead of Intel paused", () => {
    const legacy = {
      title: "Legacy",
      artist: "Artist",
      source: "netease",
      playing: true,
      updatedAt: new Date(now - 1000).toISOString(),
    };
    expect(
      selectMusicValue({ music_now: legacy, music_now_mac_intel: music("paused", 5000) }, now)
    ).toEqual(legacy);
  });
  it("prefers fresh playing over a newer paused source or legacy duplicate", () => {
    const playing = music("playing", 10000);
    expect(
      selectMusicValue(
        {
          music_now: music("paused"),
          music_now_mac: music("paused"),
          music_now_mac_intel: playing,
        },
        now
      )
    ).toEqual(playing);
  });
  it("prefers fresh paused over expired playing; newest history otherwise", () => {
    const paused = music("paused", 50000);
    expect(
      selectMusicValue({ music_now_mac: music("playing", 91000), music_now_mac_intel: paused }, now)
    ).toEqual(paused);
    const recent = music("last_played", 100000);
    expect(
      selectMusicValue({ music_now: music("playing", 120000), music_now_mac_intel: recent }, now)
    ).toEqual(recent);
  });
  it("rejects malformed and far-future records and supports a legacy Mac", () => {
    const fallback = music("last_played");
    expect(
      selectMusicValue(
        {
          music_now_mac: "bad",
          music_now: JSON.stringify(fallback),
          music_now_mac_intel: music("playing", -600000),
        },
        now
      )
    ).toEqual(fallback);
  });
});
