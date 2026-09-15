# ruoli-presence

A personal digital-presence page. The site owns the editorial UI; mature projects own the collection/protocol plumbing.

## Existing wheels now used

- **Lanyard + `use-lanyard`** — Discord status, Spotify Now Playing, and VRCX/VRChat Rich Presence.
- **ActivityWatch + official `aw-client`** — application usage. `bridge/activitywatch_bridge.py` publishes only aggregated app/minute totals; no window titles or URLs leave the computer.
- **WhatPulse** — keyboard heatmap. The page embeds WhatPulse's shared heatmap instead of implementing its own key collection/heatmap engine.
- **Health Auto Export** — Apple Health. POST JSON to `/api/health`; the endpoint reduces it to steps/latest heart rate and writes the summary to Lanyard KV.
- **React Photo Album** — aspect-ratio-aware VRChat photo layout.
- **Chart.js** — software-usage doughnut visualization.
- **MapLibre + OpenFreeMap** — locked city-level map.
- **Open-Meteo** — current Wuhan weather.

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
   Schedule it every 5–15 minutes if desired.
6. In WhatPulse, use **Input → Share/Post Online**, then set `VITE_WHATPULSE_HEATMAP_URL` to the generated heatmap image URL.
7. In Health Auto Export, create a REST API automation for **Step Count** and **Heart Rate**, JSON format, posting to `https://YOUR_DOMAIN/api/health` with an `X-Ingest-Token` header matching `INGEST_TOKEN`. Set `LANYARD_USER_ID` and `LANYARD_API_KEY` as server-side Vercel environment variables too.

When a source is not configured, the corresponding card says **not linked**. Fake software percentages, keyboard heatmap, fitness data and listening data have been removed.

Live prototype (older static deployment until the new Vite build is deployed): https://ruoli-presence-live-musdkar-6224.vercel.app
