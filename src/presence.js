const PHONE_STATUS_LABELS = {
  online: "Online",
  dnd: "Focus",
  sleeping: "Sleep",
};
const PHONE_STATUS_KEYS = {
  online: "phoneOnline",
  dnd: "phoneFocus",
  sleeping: "phoneSleep",
};
const MAX_AGE = 36 * 60 * 60 * 1000;

// Focus is a published availability preference, not a phone-unlock signal.
export function getDisplayPresence(presence, now = Date.now()) {
  const value = presence?.kv?.phone_presence;
  if (value != null) {
    let phone;
    try { phone = typeof value === "string" ? JSON.parse(value) : value; }
    catch { /* stale update */ }
    const updatedAt = typeof phone?.updatedAt === "string" ? Date.parse(phone.updatedAt) : NaN;
    if (Object.hasOwn(PHONE_STATUS_LABELS, phone?.status) &&
        Number.isFinite(updatedAt) && updatedAt <= now + 5 * 60 * 1000 &&
        now - updatedAt <= MAX_AGE) {
      return {status: phone.status, label: PHONE_STATUS_LABELS[phone.status], labelKey: PHONE_STATUS_KEYS[phone.status], source: "iPhone / Focus", detail: "Focus status"};
    }
    return {status: "unknown", label: "not synced", labelKey: "phoneNotSynced", source: "iPhone / Focus", detail: "Waiting for a fresh update"};
  }
  if (!presence) return {status: "unknown", label: "not linked", labelKey: "phoneNotLinked", source: "Lanyard", detail: "Presence not linked"};
  const status = presence.discord_status || "offline";
  const activity = presence.activities && presence.activities.find(function(item){return item.name && item.name !== "Spotify"});
  const labelKey = "discord" + status.charAt(0).toUpperCase() + status.slice(1);
  return {status: status, label: status, labelKey: labelKey, source: "Lanyard", detail: (activity && (activity.details || activity.name)) || "Discord presence"};
}
