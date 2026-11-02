// Pure selectors shared by the published homepage and the React routes.
// Source values are cumulative daily snapshots, never increments.
const parse = (value) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }
};
const number = (value, max) => {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
};
const dayAt = (now) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
const keyPattern =
  /^(?:[A-Z0-9]|SPACE|TAB|BACKSPACE|RETURN|SHIFT|COMMAND|CONTROL|OPTION|CAPS|ESC|LEFT|RIGHT|UP|DOWN|[-=[\]\\;'`,./])$/;

function keyboard(value, day) {
  const v = parse(value);
  if (
    !v ||
    v.v !== 1 ||
    v.date !== day ||
    !v.heat ||
    Array.isArray(v.heat) ||
    typeof v.heat !== "object"
  )
    return null;
  const total = number(v.total, 10000000);
  if (total === null) return null;
  const heat = {};
  for (const [key, raw] of Object.entries(v.heat).slice(0, 100)) {
    const level = number(raw, 15);
    if (keyPattern.test(key) && level !== null) heat[key] = Math.round(level);
  }
  return Object.keys(heat).length ? { v: 1, date: day, total: Math.round(total), heat } : null;
}

function appList(value, day) {
  const v = parse(value);
  if (!v || v.date !== day || !Array.isArray(v.apps)) return [];
  return v.apps.slice(0, 8).flatMap((item) => {
    const minutes = number(item?.minutes, 1440);
    const name = typeof item?.name === "string" ? item.name.trim().slice(0, 120) : "";
    return name && minutes !== null && minutes > 0 ? [{ name, minutes }] : [];
  });
}

export function selectComputerUsage(kv = {}, now = Date.now()) {
  const day = dayAt(now);
  const keyboardMac = keyboard(kv.keyboard_today_mac, day) || keyboard(kv.keyboard_today, day);
  const sources = [
    keyboard(kv.keyboard_today_win, day),
    keyboard(kv["keyboard_today_mac-intel"], day),
  ].filter(Boolean);
  let keyboardPC = null;
  if (sources.length) {
    const heat = {};
    for (const source of sources) {
      for (const [key, level] of Object.entries(source.heat))
        heat[key] = Math.max(heat[key] || 0, level);
    }
    keyboardPC = { v: 1, date: day, total: sources.reduce((sum, s) => sum + s.total, 0), heat };
  }
  const byName = new Map();
  const macApps = appList(kv.apps_today_mac, day);
  for (const app of [
    ...(macApps.length ? macApps : appList(kv.apps_today, day)),
    ...appList(kv.apps_today_win, day),
    ...appList(kv["apps_today_mac-intel"], day),
  ])
    byName.set(app.name, (byName.get(app.name) || 0) + app.minutes);
  const apps = [...byName]
    .map(([name, minutes]) => ({ name, minutes: Math.round(minutes * 10) / 10 }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 8);
  return { apps, keyboardMac, keyboardPC };
}

export function selectMusicValue(kv = {}, now = Date.now()) {
  const candidates = [kv.music_now_mac, kv.music_now, kv["music_now_mac-intel"], kv.music_now_win]
    .map(parse)
    .filter((v) => {
      if (!v || typeof v !== "object") return false;
      const title = v.track?.title ?? v.title;
      const artist = v.track?.artist ?? v.artist;
      return (
        typeof title === "string" &&
        title.trim() &&
        typeof artist === "string" &&
        artist.trim() &&
        ["netease", "apple_music", "appleMusic"].includes(v.service || v.source) &&
        (!v.v || (v.v === 1 && ["playing", "paused", "last_played"].includes(v.state))) &&
        !(Date.parse(v.observedAt || v.updatedAt) > now + 300000)
      );
    });
  const seen = (v) => Date.parse(v.observedAt || v.updatedAt) || 0;
  const rank = (v) => {
    const age = now - seen(v);
    const fresh = age >= -300000 && age <= 90000;
    const state = v.state || (v.playing === true ? "playing" : "last_played");
    return fresh && state === "playing" ? 2 : fresh && state === "paused" ? 1 : 0;
  };
  candidates.sort((a, b) => rank(b) - rank(a) || seen(b) - seen(a));
  return candidates[0] || null;
}
