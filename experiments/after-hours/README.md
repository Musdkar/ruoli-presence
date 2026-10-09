# KALIERI® — AFTER HOURS / WORLDLINE EDITION

An experimental, interactive scroll-driven redesign of [kalieri.com](https://kalieri.com) — a living personal universe.

**Preview:** https://kalieri-after-hours-preview.vercel.app

## Local start (no dependency installation)

Requires **Node.js 20+**.

```bash
npm start
```

Open http://localhost:4173 in your browser. No `npm install` step is necessary; this is a dependency-free static HTML/CSS/JavaScript app with a small Node server for local proxying.

For another port:

```bash
PORT=5000 npm start
```

## Vercel deployment

Upload/import this project into a separate Vercel project. The framework can be **Other**, with no build command, and the output directory can be the project root. The included `vercel.json` forwards the **read-only** `/api/presence` request to the existing public API at `https://kalieri.com/api/presence`. It does not ingest or write any telemetry.

A self-contained single-page alternative is at `dist/index.html`; it contains all HTML, CSS and JavaScript inline. If you deploy only this file, remember to include `vercel.json` for live-presence proxying.

## New in v1.1 — WORLDLINE

- Scroll-scrubbed **three-stage photographic journey** between the telemetry feed and photo archive, with a pinned composition (earth → between signals → other worlds); text and scene progress are tied to actual scroll position.
- First viewport's orbital universe moves, tilts, scales and fades with scroll; chapter headings gently drift in view.
- A persistent **chapter-position rail** and stage timeline orient visitors as they move through the long-form page.
- More tactile archive photos on pointer devices; enhanced VRChat portal with existing VRChat photography and accurate activity state labels (`ACTIVITY DETECTED` vs `NOT DETECTED`).
- Vinyl and equalizer animation follow actual music playback state; idle or missing music never pretends to play.
- Motion is transform/opacity-based, with mobile adjustments, disabled animation under `prefers-reduced-motion`, and accessible existing modal/navigation controls.

## What is implemented

- Immersive animated hero with a procedural starfield, layered orbital composition, parallax-light response, scroll choreography, and responsive editorial typography.
- The Signal: iPhone Focus / Discord presence, Wuhan weather (Open-Meteo), steps (6,000 goal), live/last-played music, foreground application usage, Mac/Windows keyboard heat maps, and VRChat presence. Missing/expired data is shown as such, never replaced by invented personal stats.
- The Archive: all **19** existing photos referenced from the public original site, editorial photo wall, full-view lightbox, and show-all toggle.
- Notes: the two published blog entries as interactive reading overlays.
- Toolkit: original software groups and hardware inventory, with interactive categories.
- Contact and original-site links, command palette (`Cmd/Ctrl + K`), keyboard-accessible dialogs, reduced-motion support, responsive tablet/mobile layouts.

## Important integration notes

This is a **standalone visual theme prototype**, not a wholesale migration of the original React application. It reuses existing **public** image endpoints and the **read-only** public presence API. For a permanent replacement, we'd merge the design into the existing repo so routing, SEO, multilingual strings and publication workflows remain first class. The new demo deliberately does not alter ingest endpoints, privacy controls, collectors, API keys or original deployment.

- Photos and the avatar are fetched from `https://kalieri.com/assets/`; the user's browser must be able to access that site.
- Weather is loaded from Open-Meteo in the browser. Live telemetry is requested at `/api/presence` every 10 seconds only while visible.
- Fonts are fetched from Google Fonts with system fallback.
- Local `server.mjs` supplies the same read-only proxy for development, so local telemetry requires the machine to be online and the original API to be available.
- The notes panel includes a shorter view of the running log and links to the full original when appropriate; full markdown publishing remains on the original website.
- No environment variables or secret credentials are required to view the new theme.

## Files

- `index.html` — semantic page structure
- `styles.css` — design system, layout, visuals, responsive rules
- `main.js` — animations, interactions, public data adapters
- `server.mjs` — no-dependency local Node server and presence proxy
- `vercel.json` — Vercel read-only route proxy
- `dist/index.html` — self-contained build
- `desktop-hero.png` and `mobile-hero.png` — offline-captured first-fold visual previews

Designed as a fresh direction rather than a superficial reskin. © 2026 Kalieri.
