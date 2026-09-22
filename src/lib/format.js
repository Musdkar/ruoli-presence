function formatUsageMinutes(minutes) {
  const seconds = Math.max(0, Math.round(Number(minutes || 0) * 60));
  if (seconds < 60) return seconds + "s";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return hours + "h " + String(mins).padStart(2, "0") + "m";
  if (mins < 10 && secs > 0) return mins + "m " + String(secs).padStart(2, "0") + "s";
  return mins + "m";
}
// Archive date label, e.g. "2026-02-11 21:58".
//
// The value is formatted straight off the ISO string rather than through Date:
// these strings already carry the wall-clock local time the frame was captured
// at, and `new Date(...)` would re-interpret them in the visitor's zone and
// shift the displayed time. Returns "" for anything that is not the expected
// ISO shape so a bad entry shows no label instead of "Invalid Date".
export function formatPhotoTaken(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(iso || ""));
  if (!match) return "";
  const [, year, month, day, hour, minute] = match;
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export { formatUsageMinutes };
