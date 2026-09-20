// Reads the macOS Now Playing item (Netease Music / Apple Music) and publishes
// it to the site via POST /api/music. Runs on the owner Mac.
//
// Config (environment):
//   MUSIC_API_URL        e.g. https://<site>/api/music
//   INGEST_TOKEN         shared secret for the ingest endpoints
//   NP_CLI               path to nowplaying-cli (default: sibling file)
//   NP_INTERVAL_MS       poll interval (default 8000)
//   NP_HEARTBEAT_MS      live-state refresh interval (default 30000)
//   NP_MISS_LIMIT        misses before playing/paused becomes last_played (default 3)
//
// Run: node bridge/music_presence.mjs

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const execFileP = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));

const API_URL = process.env.MUSIC_API_URL || "";
const TOKEN = process.env.INGEST_TOKEN || "";
const NP_CLI = process.env.NP_CLI || join(__dirname, "nowplaying", "nowplaying-cli");
const INTERVAL = Math.max(2000, Number(process.env.NP_INTERVAL_MS || 8000));
const HEARTBEAT = Math.max(INTERVAL, Number(process.env.NP_HEARTBEAT_MS || 30000));
const MISS_LIMIT = Math.max(1, Number(process.env.NP_MISS_LIMIT || 3));
const MAX_COVER_CHARS = 26000;

const SERVICE_BY_BUNDLE = {
  "com.netease.163music": "netease",
  "com.apple.Music": "apple_music",
};

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
  const rate = Number(raw["kMRMediaRemoteNowPlayingInfoPlaybackRate"] || 0);
  const service = SERVICE_BY_BUNDLE[bundle];
  if (typeof title !== "string" || title.trim() === "" || service == null) return null;

  return {
    title,
    artist: typeof artist === "string" && artist.trim() !== "" ? artist : "Unknown artist",
    album:
      typeof raw["kMRMediaRemoteNowPlayingInfoAlbum"] === "string"
        ? raw["kMRMediaRemoteNowPlayingInfoAlbum"]
        : null,
    service,
    state: rate > 0 ? "playing" : "paused",
    artwork: raw["kMRMediaRemoteNowPlayingInfoArtworkData"] || null,
  };
}

async function shrinkCover(base64) {
  if (typeof base64 !== "string" || base64 === "") return null;
  const direct = "data:image/jpeg;base64," + base64;
  const { mkdtemp, writeFile, readFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const tries = [
    ["-Z", "384", "-s", "format", "jpeg", "-s", "formatOptions", "60"],
    ["-Z", "320", "-s", "format", "jpeg", "-s", "formatOptions", "60"],
    ["-Z", "288", "-s", "format", "jpeg", "-s", "formatOptions", "55"],
    ["-Z", "256", "-s", "format", "jpeg", "-s", "formatOptions", "50"],
    ["-Z", "224", "-s", "format", "jpeg", "-s", "formatOptions", "45"],
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
        // Try the next, smaller conversion.
      }
      await rm(out, { force: true });
    }
    return direct.length <= MAX_COVER_CHARS ? direct : null;
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function publish(payload) {
  try {
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
  } catch (err) {
    console.error("publish failed:", err && err.message ? err.message : err);
    return false;
  }
}

let lastSnapshot = null;
let lastPublishedKey = null;
let lastPublishedAt = 0;
let lastArtworkKey = null;
let lastCover = null;
let misses = 0;

const snapshotKey = (s) => [s.service, s.state, s.title, s.artist, s.album || ""].join("\u0000");

async function publishSnapshot(snapshot, force = false) {
  const key = snapshotKey(snapshot);
  const now = Date.now();
  if (force === false && key === lastPublishedKey && now - lastPublishedAt < HEARTBEAT) return true;

  const ok = await publish({
    state: snapshot.state,
    service: snapshot.service,
    track: { title: snapshot.title, artist: snapshot.artist, album: snapshot.album },
    artwork: { url: snapshot.cover },
  });
  if (ok) {
    lastPublishedKey = key;
    lastPublishedAt = now;
    console.log(
      new Date(now).toISOString(),
      snapshot.service,
      snapshot.state,
      "-",
      snapshot.title,
      "/",
      snapshot.artist
    );
  }
  return ok;
}

async function tick() {
  const np = await readNowPlaying();

  if (np == null) {
    misses += 1;
    if (lastSnapshot && lastSnapshot.state !== "last_played" && misses >= MISS_LIMIT) {
      const stopped = { ...lastSnapshot, state: "last_played" };
      if (await publishSnapshot(stopped, true)) lastSnapshot = stopped;
    }
    return;
  }

  misses = 0;
  const artworkKey = typeof np.artwork === "string" ? np.artwork.slice(0, 200) : "";
  let coverChanged = false;
  if (artworkKey !== lastArtworkKey) {
    lastCover = await shrinkCover(np.artwork);
    lastArtworkKey = artworkKey;
    coverChanged = true;
  }

  const snapshot = { ...np, cover: lastCover };
  await publishSnapshot(snapshot, coverChanged);
  lastSnapshot = snapshot;
}

if (API_URL === "" || TOKEN === "") {
  console.error("Set MUSIC_API_URL and INGEST_TOKEN before running.");
  process.exit(1);
}
if (
  Number.isFinite(INTERVAL) === false ||
  Number.isFinite(HEARTBEAT) === false ||
  Number.isFinite(MISS_LIMIT) === false
) {
  console.error("NP_INTERVAL_MS, NP_HEARTBEAT_MS and NP_MISS_LIMIT must be numbers.");
  process.exit(1);
}

console.log("music bridge started; polling every", INTERVAL, "ms; heartbeat", HEARTBEAT, "ms");
console.log("api:", API_URL);
let tickRunning = false;
async function guardedTick() {
  if (tickRunning) return;
  tickRunning = true;
  try {
    await tick();
  } finally {
    tickRunning = false;
  }
}

guardedTick();
setInterval(guardedTick, INTERVAL);
