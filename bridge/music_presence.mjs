// Reads the macOS Now Playing item (Netease Music / Apple Music) and publishes
// it to the site via POST /api/music. Runs on the owner Mac.
//
// Config (environment):
//   MUSIC_API_URL   e.g. https://<site>/api/music
//   INGEST_TOKEN    shared secret for the ingest endpoints
//   NP_CLI          path to nowplaying-cli (default: sibling file)
//   NP_INTERVAL_MS  poll interval (default 8000)
//
// Run:  node bridge/music_presence.mjs

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const execFileP = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));

const API_URL = process.env.MUSIC_API_URL || "";
const TOKEN = process.env.INGEST_TOKEN || "";
const NP_CLI = process.env.NP_CLI || join(__dirname, "nowplaying", "nowplaying-cli");
const INTERVAL = Number(process.env.NP_INTERVAL_MS || 8000);
const MAX_COVER_CHARS = 12000;

// Bundle id -> our source label.
const SOURCE_BY_BUNDLE = {
  "com.netease.163music": "netease",
  "com.apple.Music": "appleMusic",
};

// Run nowplaying-cli and parse get-raw JSON. Returns null when nothing plays.
async function readNowPlaying() {
  let raw;
  try {
    const { stdout } = await execFileP(NP_CLI, ["get-raw"], { timeout: 5000 });
    if (stdout.trim() === "") return null;
    raw = JSON.parse(stdout);
  } catch {
    return null;
  }
  const title = raw["kMRMediaRemoteNowPlayingInfoTitle"];
  const artist = raw["kMRMediaRemoteNowPlayingInfoArtist"];
  const bundle = raw["kMRMediaRemoteNowPlayingInfoClientBundleIdentifier"];
  const rate = raw["kMRMediaRemoteNowPlayingInfoPlaybackRate"];
  if (typeof title !== "string" || title.trim() === "") return null;
  const source = SOURCE_BY_BUNDLE[bundle];
  if (source == null) return null;
  return {
    title: title,
    artist: typeof artist === "string" ? artist : "Unknown artist",
    album: raw["kMRMediaRemoteNowPlayingInfoAlbum"] || null,
    source: source,
    playing: rate === 1,
    artwork: raw["kMRMediaRemoteNowPlayingInfoArtworkData"] || null,
  };
}

// Compress the base64 artwork into a small data URL, or null if too big.
// Uses macOS sips; never upscales. Tries progressively smaller settings.
async function shrinkCover(base64) {
  if (typeof base64 !== "string" || base64 === "") return null;
  const direct = "data:image/jpeg;base64," + base64;
  const { mkdtemp, writeFile, readFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const tries = [
    ["-s", "format", "jpeg", "-s", "formatOptions", "60"],
    ["-Z", "96", "-s", "format", "jpeg", "-s", "formatOptions", "50"],
    ["-Z", "64", "-s", "format", "jpeg", "-s", "formatOptions", "40"],
  ];
  const dir = await mkdtemp(join(tmpdir(), "npmusic-"));
  const src = join(dir, "in.dat");
  try {
    await writeFile(src, Buffer.from(base64, "base64"));
    for (const args of tries) {
      const out = join(dir, "out.jpg");
      try {
        await execFileP("/usr/bin/sips", [...args, src, "--out", out], { timeout: 8000 });
        const buf = await readFile(out);
        const url = "data:image/jpeg;base64," + buf.toString("base64");
        if (url.length <= MAX_COVER_CHARS) return url;
      } catch {
        // try next setting
      }
      await rm(out, { force: true });
    }
    // If even the smallest attempt is too large, fall back to the raw data
    // only when it already fits; otherwise drop the cover.
    return direct.length <= MAX_COVER_CHARS ? direct : null;
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function publish(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Ingest-Token": TOKEN },
    body: JSON.stringify(payload),
  });
  if (res.ok === false) {
    console.error("publish failed:", res.status, await res.text().catch(() => ""));
    return false;
  }
  return true;
}

let lastKey = null;
let lastCoverKey = null;
let lastCover = null;

async function tick() {
  const np = await readNowPlaying();
  if (np == null) return; // keep last published value (last played)
  const key = [np.title, np.artist, np.playing].join("\\u0000");
  if (key === lastKey) return;
  // Re-shrink only when the artwork itself changed.
  const artKey = np.artwork ? np.artwork.slice(0, 200) : "";
  if (artKey !== lastCoverKey) {
    lastCover = await shrinkCover(np.artwork);
    lastCoverKey = artKey;
  }
  const ok = await publish({
    title: np.title,
    artist: np.artist,
    album: np.album,
    source: np.source,
    playing: np.playing,
    cover: lastCover,
  });
  if (ok) {
    lastKey = key;
    console.log(new Date().toISOString(), np.source, np.playing ? "playing" : "paused", "-", np.title, "/", np.artist);
  }
}

if (API_URL === "" || TOKEN === "") {
  console.error("Set MUSIC_API_URL and INGEST_TOKEN before running.");
  process.exit(1);
}

console.log("music bridge started; polling every", INTERVAL, "ms");
console.log("api:", API_URL);
tick();
setInterval(tick, INTERVAL);
