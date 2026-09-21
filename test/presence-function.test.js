import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// The function is CommonJS; import it through Node's interop.
const fn = (await import("../api/presence/index.js")).default;

function makeContext() {
  return { log: { error: vi.fn() }, res: null };
}
const req = (method = "GET") => ({ method });

const UPSTREAM_SAMPLE = {
  success: true,
  data: {
    discord_status: "online",
    activities: [{ name: "VRChat", details: "world", state: "chilling" }],
    spotify: null,
    kv: {
      music_now: JSON.stringify({ state: "playing" }),
      keyboard_today_mac: JSON.stringify({ v: 1, total: 100 }),
      phone_presence: JSON.stringify({ status: "online" }),
      secret_key: "should be dropped",
    },
  },
};

let originalFetch;
let originalUser;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  originalUser = process.env.LANYARD_USER_ID;
  process.env.LANYARD_USER_ID = "123456789";
  process.env.LANYARD_API_KEY = "test-key";
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUser === undefined) delete process.env.LANYARD_USER_ID;
  else process.env.LANYARD_USER_ID = originalUser;
});

describe("/api/presence — method and config guards", () => {
  it("rejects non-GET with 405 and no-store", async () => {
    const ctx = makeContext();
    await fn(ctx, req("POST"));
    expect(ctx.res.status).toBe(405);
    expect(ctx.res.headers["Cache-Control"]).toBe("no-store");
  });

  it("returns 503 when the user id is not configured", async () => {
    delete process.env.LANYARD_USER_ID;
    const ctx = makeContext();
    await fn(ctx, req("GET"));
    expect(ctx.res.status).toBe(503);
    expect(JSON.parse(ctx.res.body).error).toBe("presence_not_configured");
  });

  it("does not let the client choose the upstream target", async () => {
    // A malicious query string must not influence the upstream URL.
    let calledUrl = "";
    globalThis.fetch = async (url) => {
      calledUrl = url;
      return { ok: true, json: async () => UPSTREAM_SAMPLE };
    };
    const ctx = makeContext();
    await fn(ctx, { method: "GET", query: { userId: "999" }, url: "/api/presence?userId=999" });
    expect(calledUrl).toBe("https://api.lanyard.rest/v1/users/123456789");
    expect(calledUrl).not.toContain("999");
  });
});

describe("/api/presence — success path", () => {
  it("sanitizes and returns only the allowed fields", async () => {
    globalThis.fetch = async () => ({ ok: true, json: async () => UPSTREAM_SAMPLE });
    const ctx = makeContext();
    await fn(ctx, req());
    expect(ctx.res.status).toBe(200);
    const body = JSON.parse(ctx.res.body);
    expect(body.success).toBe(true);
    expect(body.data.discord_status).toBe("online");
    expect(Object.keys(body.data).sort()).toEqual([
      "activities",
      "discord_status",
      "kv",
      "spotify",
    ]);
  });

  it("drops non-whitelisted KV keys", async () => {
    globalThis.fetch = async () => ({ ok: true, json: async () => UPSTREAM_SAMPLE });
    const ctx = makeContext();
    await fn(ctx, req());
    const body = JSON.parse(ctx.res.body);
    expect(body.data.kv.secret_key).toBeUndefined();
    expect(body.data.kv.music_now).toBeDefined();
    expect(body.data.kv.keyboard_today_mac).toBeDefined();
  });

  it("sets a shared-cache header on success", async () => {
    globalThis.fetch = async () => ({ ok: true, json: async () => UPSTREAM_SAMPLE });
    const ctx = makeContext();
    await fn(ctx, req());
    expect(ctx.res.headers["Cache-Control"]).toMatch(/public/);
    expect(ctx.res.headers["Cache-Control"]).toMatch(/max-age=5/);
    expect(ctx.res.headers["Cache-Control"]).toMatch(/stale-while-revalidate/);
  });
});

describe("/api/presence — failure paths are never cached", () => {
  it("returns 504 when the upstream throws (timeout)", async () => {
    globalThis.fetch = async () => {
      throw new Error("timeout");
    };
    const ctx = makeContext();
    await fn(ctx, req());
    expect(ctx.res.status).toBe(504);
    expect(ctx.res.headers["Cache-Control"]).toBe("no-store");
  });

  it("returns 502 on an upstream error status", async () => {
    globalThis.fetch = async () => ({ ok: false, status: 503 });
    const ctx = makeContext();
    await fn(ctx, req());
    expect(ctx.res.status).toBe(502);
    expect(ctx.res.headers["Cache-Control"]).toBe("no-store");
  });

  it("returns 502 when the upstream body is not JSON", async () => {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => {
        throw new Error("bad json");
      },
    });
    const ctx = makeContext();
    await fn(ctx, req());
    expect(ctx.res.status).toBe(502);
  });

  it("returns 502 when sanitizePresence yields null", async () => {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ success: true, data: null }),
    });
    const ctx = makeContext();
    await fn(ctx, req());
    expect(ctx.res.status).toBe(502);
    expect(ctx.res.headers["Cache-Control"]).toBe("no-store");
  });

  it("never leaks the API key in the body", async () => {
    globalThis.fetch = async () => ({ ok: false, status: 500 });
    const ctx = makeContext();
    await fn(ctx, req());
    expect(ctx.res.body).not.toContain("test-key");
  });
});
