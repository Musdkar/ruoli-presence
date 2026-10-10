import { describe, it, expect, vi } from "vitest";
import { getDisplayPresence } from "../src/lib/presence.js";
import { selectVrchatPresence } from "../experiments/after-hours/lib/vrchat-presence.mjs";
import { createPresenceHandler } from "../experiments/after-hours/api/presence.js";
const now = Date.parse("2026-10-10T05:00:00Z");
const observedAt = new Date(now).toISOString();
const phone = JSON.stringify({ status: "online", updatedAt: observedAt });
const presence = (status) => ({
  discord_status: "offline",
  activities: [],
  kv: { phone_presence: phone, vrchat_presence: { status, observedAt } },
});
describe("independent iPhone and VRChat signals", () => {
  it("phone online and VRChat offline remain independent", () => {
    const data = presence("offline");
    expect(getDisplayPresence(data, now).status).toBe("online");
    expect(selectVrchatPresence(data, now, now)).toMatchObject({
      live: false,
      state: "OFFLINE",
      source: "OWNER SYNC",
    });
  });
  it("VRChat account active never lights the game-online tile", () => {
    expect(selectVrchatPresence(presence("active"), now, now)).toMatchObject({
      live: false,
      state: "ACCOUNT ACTIVE",
    });
  });
  it("social moods cannot be used as connection presence", () => {
    for (const status of ["busy", "join me", "ask me"])
      expect(selectVrchatPresence(presence(status), now, now).live).toBe(false);
  });
  it("game online does not change iPhone sleep", () => {
    const data = presence("online");
    data.kv.phone_presence = JSON.stringify({ status: "sleeping", updatedAt: observedAt });
    expect(getDisplayPresence(data, now).status).toBe("sleeping");
    expect(selectVrchatPresence(data, now, now).live).toBe(true);
  });
  it("expires the owner signal without another successful fetch", () => {
    expect(selectVrchatPresence(presence("online"), now, now + 180000)).toMatchObject({
      live: false,
      state: "NO PUBLIC SIGNAL",
    });
  });
  it("ignores future records and stale Discord activities", () => {
    const data = presence("online");
    data.kv.vrchat_presence.observedAt = new Date(now + 61000).toISOString();
    expect(selectVrchatPresence(data, now, now).live).toBe(false);
    delete data.kv.vrchat_presence;
    data.activities = [{ name: "VRChat", details: "playing" }];
    expect(selectVrchatPresence(data, now, now + 180000).live).toBe(false);
  });
  it("only actual VRChat activity is a fallback, not phone or Discord online", () => {
    const data = presence("online");
    delete data.kv.vrchat_presence;
    data.discord_status = "online";
    expect(selectVrchatPresence(data, now, now).live).toBe(false);
    data.activities = [{ name: "VRChat" }];
    expect(selectVrchatPresence(data, now, now).live).toBe(true);
  });
});

describe("VRCX identity and world thumbnails", () => {
  const avatar =
    "https://api.vrchat.cloud/api/1/image/file_11111111-1111-1111-1111-111111111111/2/256";
  const thumbnail =
    "https://api.vrchat.cloud/api/1/image/file_22222222-2222-2222-2222-222222222222/1/256";
  it("hidden social availability also suppresses a supplied world name and image", async () => {
    const data = presence("online");
    data.kv.vrchat_presence.availability = "busy";
    data.kv.vrchat_presence.location = {
      kind: "world",
      worldName: "Hidden world",
      access: "public",
      thumbnailUrl: thumbnail,
    };
    const res = response();
    await createPresenceHandler({
      fetcher: async () => ({ ok: true, json: async () => ({ success: true, data }) }),
    })({ method: "GET" }, res);
    expect(res.body.data.kv.vrchat_presence.location).toEqual({ kind: "private" });
    expect(selectVrchatPresence(data, now, now)).toMatchObject({
      title: "PRIVATE",
      worldImageUrl: null,
    });
  });
  it("keeps social availability separate from an account-only connection", () => {
    const data = presence("active");
    data.kv.vrchat_presence.profile = { displayName: "A name", avatarUrl: avatar };
    data.kv.vrchat_presence.availability = "busy";
    expect(selectVrchatPresence(data, now, now)).toMatchObject({
      name: "A name",
      avatarUrl: avatar,
      availabilityLabel: "Active · Busy",
      availabilityTone: "busy",
      availabilityHollow: true,
      state: "ACCOUNT ACTIVE",
      live: false,
      worldImageUrl: null,
    });
  });
  it("clears the world image in private, traveling, and stale states", () => {
    const data = presence("online");
    data.kv.vrchat_presence.location = {
      kind: "world",
      worldName: "A world",
      access: "public",
      thumbnailUrl: thumbnail,
    };
    expect(selectVrchatPresence(data, now, now).worldImageUrl).toBe(thumbnail);
    for (const kind of ["private", "traveling"]) {
      data.kv.vrchat_presence.location.kind = kind;
      expect(selectVrchatPresence(data, now, now).worldImageUrl).toBeNull();
    }
    data.kv.vrchat_presence.location.kind = "world";
    expect(selectVrchatPresence(data, now, now + 180000).worldImageUrl).toBeNull();
  });
  it("filters profile extras and image credentials before anonymous publication", async () => {
    const data = presence("online");
    data.kv.vrchat_presence.profile = {
      displayName: "\u0000 A name ",
      avatarUrl: avatar + "?token=secret",
      email: "secret",
    };
    data.kv.vrchat_presence.availability = "join me";
    data.kv.vrchat_presence.location = {
      kind: "world",
      worldName: "A world",
      access: "public",
      thumbnailUrl: thumbnail,
    };
    const res = response();
    await createPresenceHandler({
      fetcher: async () => ({ ok: true, json: async () => ({ success: true, data }) }),
    })({ method: "GET" }, res);
    expect(res.body.data.kv.vrchat_presence.profile).toEqual({ displayName: "A name" });
    expect(res.body.data.kv.vrchat_presence.availability).toBe("join me");
    expect(res.body.data.kv.vrchat_presence.location.thumbnailUrl).toBe(thumbnail);
    expect(JSON.stringify(res.body)).not.toContain("secret");
  });
});
function response() {
  return {
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    end(body) {
      this.body = JSON.parse(body);
    },
  };
}
describe("preview anonymous read API", () => {
  it("reads only the fixed public owner and filters secrets without changing phone", async () => {
    const data = presence("active");
    data.kv.secret = "private";
    data.kv.vrchat_presence.cookie = "private";
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ success: true, data }) }));
    const handler = createPresenceHandler({ fetcher });
    const res = response();
    await handler({ method: "GET", url: "/api/presence?userId=attacker" }, res);
    expect(fetcher.mock.calls[0][0]).toBe("https://api.lanyard.rest/v1/users/860859306156490762");
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(res.statusCode).toBe(200);
    expect(res.body.data.kv.phone_presence).toBe(phone);
    expect(res.body.data.kv.secret).toBeUndefined();
    expect(res.body.data.kv.vrchat_presence).toEqual({ status: "active", observedAt });
  });
  it("rejects writes before any network request", async () => {
    const fetcher = vi.fn();
    const res = response();
    await createPresenceHandler({ fetcher })({ method: "PATCH" }, res);
    expect(res.statusCode).toBe(405);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not cache an upstream failure or expose errors", async () => {
    const res = response();
    await createPresenceHandler({
      fetcher: async () => {
        throw new Error("Cookie=secret");
      },
    })({ method: "GET" }, res);
    expect(res.statusCode).toBe(503);
    expect(res.headers["Cache-Control"]).toBe("no-store");
    expect(JSON.stringify(res.body)).not.toContain("secret");
  });
});

describe("owner world display and privacy", () => {
  it("shows visible world names with room access while phone remains independent", () => {
    const data = presence("online");
    data.kv.vrchat_presence.location = {
      kind: "world",
      worldName: "A quiet world",
      access: "friends+",
    };
    const view = selectVrchatPresence(data, now, now);
    expect(view.title).toBe("A quiet world");
    expect(view.detail).toContain("FRIENDS+");
    expect(view.live).toBe(true);
    expect(getDisplayPresence(data, now).status).toBe("online");
  });
  it("clears world names for private rooms, travel, and expired observations", () => {
    const data = presence("online");
    data.kv.vrchat_presence.location = { kind: "private", worldName: "private name" };
    expect(selectVrchatPresence(data, now, now).title).toBe("PRIVATE");
    expect(JSON.stringify(selectVrchatPresence(data, now, now))).not.toContain("private name");
    data.kv.vrchat_presence.location = { kind: "traveling", worldName: "destination" };
    expect(selectVrchatPresence(data, now, now).state).toBe("TRAVELING");
    expect(JSON.stringify(selectVrchatPresence(data, now, now))).not.toContain("destination");
    data.kv.vrchat_presence.location = {
      kind: "world",
      worldName: "A quiet world",
      access: "public",
    };
    expect(JSON.stringify(selectVrchatPresence(data, now, now + 180000))).not.toContain(
      "A quiet world"
    );
  });
  it("the anonymous API permits only filtered location fields and hides private names", async () => {
    const data = presence("online");
    data.kv.vrchat_presence.location = {
      kind: "world",
      worldName: "Visible world",
      access: "public",
      worldId: "secret",
      instanceId: "secret",
      nonce: "secret",
    };
    const res = response();
    await createPresenceHandler({
      fetcher: async () => ({ ok: true, json: async () => ({ success: true, data }) }),
    })({ method: "GET" }, res);
    expect(res.body.data.kv.vrchat_presence.location).toEqual({
      kind: "world",
      worldName: "Visible world",
      access: "public",
    });
    expect(JSON.stringify(res.body)).not.toContain("secret");
    data.kv.vrchat_presence.location = {
      kind: "private",
      worldName: "hidden name",
      instanceId: "secret",
    };
    const hidden = response();
    await createPresenceHandler({
      fetcher: async () => ({ ok: true, json: async () => ({ success: true, data }) }),
    })({ method: "GET" }, hidden);
    expect(hidden.body.data.kv.vrchat_presence.location).toEqual({ kind: "private" });
    expect(JSON.stringify(hidden.body)).not.toContain("hidden name");
  });
});
