import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sanitizePresence } from "../api/lib/presence-sanitize.mjs";
const fn = (await import("../api/music/index.js")).default;
let saved;
beforeEach(() => {
  saved = { ...process.env };
  process.env.INGEST_TOKEN = "test-token";
  process.env.LANYARD_USER_ID = "123";
  process.env.LANYARD_API_KEY = "server-only";
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true }))
  );
});
afterEach(() => {
  process.env = saved;
  vi.unstubAllGlobals();
});
const request = (device) => ({
  method: "POST",
  headers: { "x-ingest-token": "test-token" },
  body: {
    device,
    state: "playing",
    service: "netease",
    track: { title: "Track", artist: "Artist" },
  },
});
const context = () => ({ log: { error: vi.fn() } });

describe("music source isolation", () => {
  it("writes Intel music only into its source slot", async () => {
    const ctx = context();
    await fn(ctx, request("mac-intel"));
    expect(ctx.res.status).toBe(200);
    const kv = JSON.parse(fetch.mock.calls[0][1].body);
    expect(Object.keys(kv)).toEqual(["music_now_mac_intel"]);
  });
  it("maps old collectors to Mac and maintains the legacy alias", async () => {
    await fn(context(), request(undefined));
    const kv = JSON.parse(fetch.mock.calls[0][1].body);
    expect(kv.music_now_mac).toBe(kv.music_now);
  });
  it("rejects unknown device names without publishing", async () => {
    const ctx = context();
    await fn(ctx, request("bad/device"));
    expect(ctx.res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("public presence includes only approved music source slots", () => {
    expect(
      sanitizePresence({
        kv: {
          music_now_mac: "{}",
          music_now_mac_intel: "{}",
          music_now_win: "{}",
          music_now_secret: "{}",
        },
      }).kv
    ).toEqual({ music_now_mac: "{}", music_now_mac_intel: "{}", music_now_win: "{}" });
  });
});
