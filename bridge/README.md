# Presence bridges

Helper processes that run on the owner machine and publish data to the
site ingest API. None of these run in the deployed static site.

## Music presence (music_presence.mjs)

Reads the macOS Now Playing item (Netease Music and Apple Music) and
POSTs it to `POST /api/music`, which stores it in Lanyard KV `music_now`.
The Home "Currently listening" card reads that value.

Only the two configured sources are published; other media is ignored.
When nothing is playing the last value is kept, so the card shows the
last track.

### 1. Build nowplaying-cli

The reader is a small Objective-C helper. Build it once into
`bridge/nowplaying/`:

```sh
git clone --depth 1 https://github.com/kirtan-shah/nowplaying-cli.git /tmp/nowplaying-cli
cd /tmp/nowplaying-cli && make
mkdir -p <repo>/bridge/nowplaying/build/mediaremote-mini <repo>/bridge/nowplaying/scripts
cp nowplaying-cli <repo>/bridge/nowplaying/
cp build/mediaremote-mini/MediaRemoteMini.dylib <repo>/bridge/nowplaying/build/mediaremote-mini/
cp scripts/mediaremote-mini.pl <repo>/bridge/nowplaying/scripts/
```

### 2. Run

```sh
MUSIC_API_URL="https://<your-site>/api/music" \
INGEST_TOKEN="<same value as the Static Web App setting>" \
node bridge/music_presence.mjs
```

Optional: `NP_INTERVAL_MS` (default 8000) and `NP_CLI` (default the
bundled binary).
