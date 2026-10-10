# KALIERI® — AFTER HOURS / WORLDLINE EDITION

An experimental, interactive scroll-driven redesign of [kalieri.com](https://kalieri.com) — a corner of the world.

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

## Earth edition / birthday update (2026-10-10)

- The About strip now says **20**; photo archive totals are unchanged.
- Hero headline: **A corner of the world.** (世界的一隅).
- The abstract gas giant is replaced with a slowly rotating Earth on the original scroll-driven orbital stage. The OpenGL ES 2.0 / WebGL 1 renderer requires no new runtime dependencies, pauses while offscreen, and respects `prefers-reduced-motion`. A CSS image remains if GPU rendering is unavailable.
- Earth and cloud maps: [three.js example textures](https://github.com/mrdoob/three.js/tree/dev/examples/textures/planets), based on NASA Earth imagery. Earth imagery credit: NASA/Goddard Space Flight Center / The Blue Marble. Assets are bundled locally; there are no extra external image requests for the globe.

## Earth interaction and source fidelity

- Earth: drag horizontally/vertically; inertia after release; auto-rotation pauses on hover and while dragging. Double-click, R, or the visible reset button restores the original angle. Arrow keys rotate for keyboard users (Shift increases step). Touch drags on the globe; the rest of the page remains scrollable. Reduced-motion visitors retain deliberate interaction but no automatic spin or inertial animation.
- The running-log post is called **1**, exactly as in the original `src/content/posts.js`. All **23** original running entries are restored.
- The full original **7-device** inventory from `src/data/devices.js` is visible, including Desktop PC (5800X / RX 6900 XT), Xiaomi Pad 7S Pro, and full gaming-laptop specs.

## Home-centred Earth & sonnet editorial pass

- The author-specific globe now centres on Wuhan (30.5928° N, 114.3055° E) from the first frame. Reset eases the view back to Wuhan by the shortest rotation path; it no longer resets to arbitrary latitude zero. Manual pointer/keyboard controls remain.
- Idle motion subtly sways around the home longitude instead of slowly rotating the home city out of view. The site does **not** request browser geolocation (which would refer to a visitor rather than Kalieri).
- Updated peripheral labels and hero prose. The headline **A corner of the world** stays. Sonnet excerpt is from William Shakespeare, *Sonnet 14* (“Not from the stars do I my judgement pluck”), with attribution visible on the page.

## Editorial and keyboard follow-up

- Sonnet 14 is linked to the Folger Shakespeare Library source; accompanying copy is quieter and more deliberate.
- The keyboard `R` shortcut allows the animated flight back to Wuhan to complete rather than cancelling it.
- The original running-log title `1` and all seven devices are preserved.
