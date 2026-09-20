import { describe, it, expect } from "vitest";
import { getDisplayPresence } from "../src/presence.js";

const NOW = Date.parse("2026-09-20T10:00:00+08:00");
const iso = (msAgo) => new Date(NOW - msAgo).toISOString();

const withPhone = (status, msAgo) => ({
  kv: { phone_presence: JSON.stringify({ status, updatedAt: iso(msAgo) }) },
});

describe("getDisplayPresence — phone focus", () => {
  it("online", () => {
    const r = getDisplayPresence(withPhone("online", 1000), NOW);
    expect(r.status).toBe("online");
    expect(r.labelKey).toBe("phoneOnline");
  });
  it("dnd maps to Focus", () => {
    const r = getDisplayPresence(withPhone("dnd", 1000), NOW);
    expect(r.status).toBe("dnd");
    expect(r.labelKey).toBe("phoneFocus");
    expect(r.label).toBe("Focus");
  });
  it("sleeping", () => {
    const r = getDisplayPresence(withPhone("sleeping", 1000), NOW);
    expect(r.labelKey).toBe("phoneSleep");
  });
  it("future timestamp within 5 min is accepted", () => {
    const r = getDisplayPresence(withPhone("online", -60000), NOW);
    expect(r.status).toBe("online");
  });
  it("stale beyond 36h reports not synced", () => {
    const r = getDisplayPresence(withPhone("sleeping", 40 * 60 * 60 * 1000), NOW);
    expect(r.status).toBe("unknown");
    expect(r.labelKey).toBe("phoneNotSynced");
  });
  it("future beyond 5 min is rejected", () => {
    const r = getDisplayPresence(withPhone("online", -10 * 60 * 1000), NOW);
    expect(r.status).toBe("unknown");
  });
  it("invalid status is not trusted", () => {
    const r = getDisplayPresence(withPhone("banana", 1000), NOW);
    expect(r.status).toBe("unknown");
  });
  it("malformed JSON does not claim online", () => {
    const r = getDisplayPresence({ kv: { phone_presence: "{bad" } }, NOW);
    expect(r.status).toBe("unknown");
  });
});

describe("getDisplayPresence — fallbacks", () => {
  it("no presence -> not linked", () => {
    expect(getDisplayPresence(null, NOW).labelKey).toBe("phoneNotLinked");
  });
  it("Discord fallback uses discord_status", () => {
    const r = getDisplayPresence({ discord_status: "idle", activities: [] }, NOW);
    expect(r.status).toBe("idle");
    expect(r.labelKey).toBe("discordIdle");
  });
  it("Discord default offline", () => {
    expect(getDisplayPresence({ activities: [] }, NOW).status).toBe("offline");
  });
});
