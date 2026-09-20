const PHONE_STATUS_LABELS = {
  online: "Online",
  dnd: "Focus",
  sleeping: "Sleep",
};
const MAX_AGE = 36 * 60 * 60 * 1000;

// Focus is a published availability preference, not a phone-unlock signal.
export function getDisplayPresence(presence, now = Date.now()) {
  const value = presence?.kv?.phone_presence;
  if (value != null) {
    let phone;
    try { phone = typeof value === "string" ? JSON.parse(value) : value; }
    catch { /* Invalid or stale updates must not claim that the user is online. */ }
    const updatedAt = typeof phone?.updatedAt === "string" ? Date.parse(phone.updatedAt) : NaN;
    if (Object.hasOwn(PHONE_STATUS_LABELS, phone?.status) &&
        Number.isFinite(updatedAt) && updatedAt <= now + 5 * 60 * 1000 &&
        now - updatedAt <= MAX_AGE) {
      return {status: phone.status, label: PHONE_STATUS_LABELS[phone.status], source: "iPhone / Focus", detail: "Focus status"};
    }
    return {status: "unknown", label: "not synced", source: "iPhone / Focus", detail: "Waiting for a fresh update"};
  }
  if (!presence) return {status: "unknown", label: "not linked", source: "Lanyard", detail: "Presence not linked"};
  const status = presence.discord_status || "offline";
  const activity = presence.activities?.find(item => item.name && item.name !== "Spotify");
  return {status, label: status, source: "Lanyard", detail: activity?.details || activity?.name || "Discord presence"};
}
