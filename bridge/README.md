# Presence bridges

Helper processes that run on the owner machine and publish data to the
site ingest API. None of these run in the deployed static site.

## Music presence (music_presence.mjs)

Reads the macOS Now Playing item from Netease Music and Apple Music and
POSTs a canonical music state to `POST /api/music`. The API stores the latest
record in Lanyard KV `music_now`; Home treats that KV as a music data channel,
not as Discord presence.

The bridge distinguishes `playing`, `paused`, and `last_played`. When the
player disappears for several polls it keeps the last track and artwork
indefinitely, Ana-style, but changes the state to `last_played`.

Artwork is resized locally before publishing. The bridge prefers about 384px JPEG
covers and falls back through smaller sizes until the payload fits the conservative
KV budget, so the public card stays crisp without adding a separate image store.

While a track is `playing` or `paused`, the bridge republishes a small
heartbeat. If the Mac or bridge goes offline, Home degrades an old live state
to `last_played` instead of leaving a stale "now playing" claim forever.

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

Optional environment variables:

- `NP_INTERVAL_MS` — poll interval, default `8000`.
- `NP_HEARTBEAT_MS` — refresh interval for live states, default `30000`.
- `NP_MISS_LIMIT` — consecutive misses before `last_played`, default `3`.
- `NP_CLI` — path to `nowplaying-cli`; defaults to the bundled binary.
