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
export { formatUsageMinutes };
