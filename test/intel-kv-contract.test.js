import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const whatpulse = (await import("../api/whatpulse/index.js")).default;
const music = (await import("../api/music/index.js")).default;
let saved;
beforeEach(() => {
  saved = { ...process.env };
  process.env.INGEST_TOKEN = "test-token";
  process.env.LANYARD_USER_ID = "123";
  process.env.LANYARD_API_KEY = "test-key";
  // Lanyard's documented KV contract, not the site's broader device-slug regex.
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, options) => {
      const valid = Object.entries(JSON.parse(options.body)).every(
        ([key, value]) =>
          /^[a-zA-Z0-9_]{1,255}$/.test(key) && typeof value === "string" && value.length <= 30000
      );
      return { ok: valid, status: valid ? 204 : 400 };
    })
  );
});
afterEach(() => {
  process.env = saved;
  vi.unstubAllGlobals();
});
const request = (body) => ({ method: "POST", headers: { "x-ingest-token": "test-token" }, body });
const context = () => ({ log: { error: vi.fn() } });

describe("Intel uploads respect the Lanyard KV contract", () => {
  it("publishes both real-shaped stats channels using an underscore suffix", async () => {
    const ctx = context();
    await whatpulse(
      ctx,
      request({
        device: "mac-intel",
        software: { date: "2026-11-02", apps: [{ name: "Editor", minutes: 12 }] },
        keyboard: { date: "2026-11-02", total: 123, heat: { A: 8 } },
      })
    );
    expect(ctx.res.status).toBe(200);
    expect(JSON.parse(ctx.res.body)).toMatchObject({
      device: "mac-intel",
      updated: { software: true, keyboard: true },
    });
    expect(Object.keys(JSON.parse(fetch.mock.calls[0][1].body)).sort()).toEqual([
      "apps_today_mac_intel",
      "keyboard_today_mac_intel",
    ]);
  });
  it("publishes Intel music without changing Mac or Windows slots", async () => {
    const ctx = context();
    await music(
      ctx,
      request({
        device: "mac-intel",
        state: "playing",
        service: "netease",
        track: { title: "Track", artist: "Artist" },
      })
    );
    expect(ctx.res.status).toBe(200);
    expect(Object.keys(JSON.parse(fetch.mock.calls[0][1].body))).toEqual(["music_now_mac_intel"]);
  });
});
