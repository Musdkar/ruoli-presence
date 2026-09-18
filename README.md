# ruoli-presence

A personal digital-presence site with a fixed identity rail and four editorial views:

- **Home** — live presence overview
- **Photo** — VRChat / visual archive
- **Blog** — Markdown-ready long-form notes
- **Uses** — software inventory

The UI is custom; mature projects own the data collection and common rendering problems.

## Existing wheels used

- **React Router** — shared layout + Home / Photo / Blog / Uses routing while keeping About Me stable.
- **Lanyard + `use-lanyard`** — Discord status, VRCX/VRChat Rich Presence, iPhone Focus KV, and Spotify as a fallback music source.\n- **Local music bridge** — macOS Now Playing for Apple Music / Netease Music → `/api/music` → canonical `music_now`; live states expire to `last_played`, while the last track and artwork are retained indefinitely.
- **ActivityWatch + official `aw-client`** — application usage. `bridge/activitywatch_bridge.py` publishes only aggregated app/minute totals; no window titles or URLs leave the computer.
- **WhatPulse** — yesterday-only keyboard heatmap. A local read-only bridge collapses per-key counters into one daily aggregate, quantizes each key to a 0–15 heat level, and publishes only those coarse heat levels plus the daily total; the site renders the responsive keyboard itself.
- **Health Auto Export** — Apple Health. POST JSON to `/api/health`; the endpoint reduces it to steps/latest heart rate and writes the summary to Lanyard KV.
- **React Photo Album** — Masonry archive. Home uses one contained photo over a blurred copy so the whole frame remains visible.
- **react-markdown + remark-gfm** — blog rendering without a custom Markdown parser.
- **Simple Icons CDN** — software brand icons in Uses.
- **Chart.js** — software-usage doughnut visualization.
- **MapLibre + OpenFreeMap** — locked city-level map.
- **Open-Meteo** — current Wuhan weather.

## Design references

The implementation studies the interaction/layout patterns of `ana.sh`, the config-driven module structure of `iacg.moe`, and the editorial restraint/content hierarchy of `enscribe.dev`. Site-specific source or proprietary visual design from those sites is not copied.

## Setup

1. Install dependencies: `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Join the Lanyard Discord server and set `VITE_DISCORD_ID`.
4. Enable VRCX Discord Rich Presence if you want VRChat activity to surface through Lanyard.
5. Install ActivityWatch, then run:
   ```bash
   pip install -r bridge/requirements.txt
   LANYARD_USER_ID=... LANYARD_API_KEY=... python bridge/activitywatch_bridge.py
   ```
6. Install WhatPulse and enable keyboard heat-map collection. To publish the previous day’s aggregate:
   ```bash
   pip install -r bridge/requirements.txt
   KEYBOARD_API_URL="https://YOUR_DOMAIN/api/keyboard" \
   INGEST_TOKEN="..." \
   python3 bridge/whatpulse_keyboard.py
   ```
   The bridge opens `whatpulse.db` read-only, keeps exact per-key counts local, and uploads only 0–15 heat levels plus the daily total. `VITE_WHATPULSE_HEATMAP_URL` remains an optional legacy image fallback.
7. In Health Auto Export, create a REST API automation for **Step Count** and **Heart Rate**, JSON format, posting to `https://YOUR_DOMAIN/api/health` with an `X-Ingest-Token` matching `INGEST_TOKEN`.
8. For Apple Music / Netease Music, build `nowplaying-cli` and run `bridge/music_presence.mjs` as documented in [`bridge/README.md`](bridge/README.md).\n9. Add VRChat / Discord / contact links through the corresponding `VITE_*` variables.

When a live source is not configured, the corresponding card says **not linked** rather than presenting fake data.

## iPhone presence (optional)

Home and the identity rail can prefer an iPhone Focus status published in Lanyard KV: online, do not disturb, or sleeping. See [the iPhone setup guide](docs/iphone-presence.md). Phone automation and Lanyard credentials must be configured before synchronization works.
