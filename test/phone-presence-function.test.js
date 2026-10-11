import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// The function is CommonJS; import it through Node's interop.
const fn = (await import("../api/phone-presence/index.js")).default;

function makeContext() {
  return { log: { error: vi.fn() }, res: null };
}
const post = (body, token = "secret") => ({
  method: "POST",
  headers: { "x-ingest-token": token },
  body,
});

let originalFetch;
let savedEnv;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  savedEnv = {
    INGEST_TOKEN: process.env.INGEST_TOKEN,
    LANYARD_USER_ID: process.env.LANYARD_USER_ID,
    LANYARD_API_KEY: process.env.LANYARD_API_KEY,
  };
  process.env.INGEST_TOKEN = "secret";
  process.env.LANYARD_USER_ID = "123456789";
  process.env.LANYARD_API_KEY = "lanyard-key";
  globalThis.fetch = vi.fn(async () => ({ ok: true }));
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("/api/phone-presence — method and auth guards", () => {
  it("rejects non-POST with 405", async () => {
    const ctx = makeContext();
    await fn(ctx, { method: "GET", headers: {} });
    expect(ctx.res.status).toBe(405);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects a missing or wrong token with 401", async () => {
    for (const req of [
      { method: "POST", headers: {}, body: { status: "online" } },
      post({ status: "online" }, "wrong"),
    ]) {
      const ctx = makeContext();
      await fn(ctx, req);
      expect(ctx.res.status).toBe(401);
    }
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("fails closed when INGEST_TOKEN is unset", async () => {
    delete process.env.INGEST_TOKEN;
    const ctx = makeContext();
    await fn(ctx, post({ status: "online" }, ""));
    expect(ctx.res.status).toBe(401);
  });

  it("returns 503 when Lanyard is not configured", async () => {
    delete process.env.LANYARD_API_KEY;
    const ctx = makeContext();
    await fn(ctx, post({ status: "online" }));
    expect(ctx.res.status).toBe(503);
    expect(JSON.parse(ctx.res.body).error).toBe("lanyard_not_configured");
  });
});

describe("/api/phone-presence — payload validation", () => {
  it("accepts the three whitelisted statuses", async () => {
    for (const status of ["online", "dnd", "sleeping"]) {
      const ctx = makeContext();
      await fn(ctx, post({ status }));
      expect(ctx.res.status).toBe(200);
    }
  });

  it("rejects any other status", async () => {
    for (const status of ["idle", "offline", "Online", "", 1, null, undefined]) {
      const ctx = makeContext();
      await fn(ctx, post({ status }));
      expect(ctx.res.status).toBe(400);
      expect(JSON.parse(ctx.res.body).error).toBe("invalid_status");
    }
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("uses the server clock when updatedAt is omitted", async () => {
    const before = Date.now();
    const ctx = makeContext();
    await fn(ctx, post({ status: "dnd" }));
    expect(ctx.res.status).toBe(200);
    const summary = JSON.parse(ctx.res.body).summary;
    const ts = Date.parse(summary.updatedAt);
    expect(ts).toBeGreaterThanOrEqual(before - 1000);
    expect(ts).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("accepts a recent client timestamp", async () => {
    const ctx = makeContext();
    const recent = new Date(Date.now() - 60 * 1000).toISOString();
    await fn(ctx, post({ status: "online", updatedAt: recent }));
    expect(ctx.res.status).toBe(200);
    expect(JSON.parse(ctx.res.body).summary.updatedAt).toBe(recent);
  });

  it("rejects malformed, future, and stale timestamps", async () => {
    const stale = new Date(Date.now() - 37 * 60 * 60 * 1000).toISOString();
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    for (const updatedAt of ["not-a-date", stale, future, 12345]) {
      const ctx = makeContext();
      await fn(ctx, post({ status: "online", updatedAt }));
      expect(ctx.res.status).toBe(400);
      expect(JSON.parse(ctx.res.body).error).toBe("invalid_updated_at");
    }
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("/api/phone-presence — Lanyard write", () => {
  it("PATCHes only the phone_presence KV key with a JSON string value", async () => {
    const ctx = makeContext();
    await fn(ctx, post({ status: "sleeping" }));
    expect(ctx.res.status).toBe(200);
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toBe("https://api.lanyard.rest/v1/users/123456789/kv");
    expect(init.method).toBe("PATCH");
    expect(init.headers.Authorization).toBe("lanyard-key");
    const body = JSON.parse(init.body);
    expect(Object.keys(body)).toEqual(["phone_presence"]);
    expect(JSON.parse(body.phone_presence).status).toBe("sleeping");
  });

  it("maps an upstream failure to 502", async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 500 }));
    const ctx = makeContext();
    await fn(ctx, post({ status: "online" }));
    expect(ctx.res.status).toBe(502);
    expect(JSON.parse(ctx.res.body).error).toBe("lanyard_update_failed");
  });

  it("maps a network error to 502 without leaking details", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("ENOTFOUND");
    });
    const ctx = makeContext();
    await fn(ctx, post({ status: "online" }));
    expect(ctx.res.status).toBe(502);
    expect(ctx.res.body).not.toContain("ENOTFOUND");
  });
});
