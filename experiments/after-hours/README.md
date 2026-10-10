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

Upload/import this project into a separate Vercel project. The framework can be **Other**, with no build command, and the output directory can be the project root. The dedicated `api/presence.js` function reads the fixed owner’s public Lanyard record and applies the shared KV allowlist. It accepts read requests only and has no credentials or ingest capability. The original deployment is independent.

Deploy the modular source, including `lib/`, `api/`, and bundled assets. `lib/presence-sanitize.mjs` is a symlink to the canonical root API filter; file-upload deployments must dereference it. A previously generated local `dist/index.html` is not the current release source.

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

This is a **standalone visual theme prototype**, not a wholesale migration of the original React application. It reuses existing **public** image endpoints and the **read-only** public presence API. For a permanent replacement, we'd merge the design into the existing repo so routing, SEO, multilingual strings and publication workflows remain first class. The original deployment and ingest endpoints remain independent. The approved optional VPS hook publishes only owner VRChat data through the same Lanyard account; it does not overwrite iPhone or other KV keys.

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
- `vercel.json` — dedicated preview configuration
- `api/presence.js` — anonymous fixed-owner Lanyard reader
- `lib/` — shared data filter and VRChat view adapter
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

## Location is data, not a visual theme

The position of the site owner is contextual telemetry, not part of the site's brand. The previous draft overused a fixed city name in the hero, globe captions, reset action and footer; those are now neutral. The actual city is presented in the weather card, and coordinates are scoped to the optional map/location strip. The globe's **Recenter** points to the configured owner position, not the visitor's IP/GPS. Weather, time, map link, marker and globe view now read one `OWNER_LOCATION` object in `main.js` (currently a manual fallback; **automatic owner location synchronization is not implemented**). When an owner-location data feed is available, replace this one source. The location must never be inferred from a visitor.

## v1.6: interaction repairs

- Mac/Windows keyboard tabs now change the physical keyboard layout (the Windows view includes the Windows key, F1–F12, Backspace and a sixth row); both retain their independent heat data.
- A real, lazy-loading OpenStreetMap iframe replaces the ornamental circles in the location section. Required ODbL map-data credit remains visible; the map can be opened externally.
- Archive photos now use a viewport-fitted viewer with prev/next buttons, arrow keys, touch swipe, count, and ESC; the full 19-frame collection can be browsed from any frame without closing the viewer. Article modals keep their independent scrolling.
- Header nav active link now follows the current scroll section and clears outside the four navigable chapters.
- VRChat's users API requires authentication. Third-party API applications must follow the Creator Guidelines and do not receive official API support. The frontend prioritizes a fresh owner-published `kv.vrchat_presence` record (if provided by a future authorised owner collector), else uses actual Discord VRChat activity; it never exposes credentials or invents online data.

## v1.7: quiet map and complete opening viewport

- The location embed is now a static visual: pointer events pass through to page scrolling, while `inert` and `tabindex=-1` exclude its controls from keyboard navigation. The separate **Open in Map** and map-data attribution links remain interactive.
- A dark purple / slate / teal treatment integrates the map with the editorial palette. Unused iframe controls are cropped, and the owner marker and OpenStreetMap attribution remain visible.
- The hero uses the available viewport height after the header, with responsive type, globe dimensions and compact spacing for short screens. Intro, sonnet, actions and the bottom strip fit common desktop/tablet/mobile sizes; enlarged text and unusually small viewports can still grow naturally.
- [VRChat presence architecture and rollout plan](../../docs/vrchat-presence-plan.md): assess reuse of the owner's existing VPS collector without a second login or polling loop; keep credentials scoped to that private process. Windows-local VRCX is an alternative closer to the API device/IP guidelines. This visual update preceded collector activation. The later dedicated preview reader and approved VPS hook now supply independent VRChat records; the original site’s allowlist remains unchanged.

## v1.8: avatar map and restored Worldline choreography

- The map reuses the original site's VRChat map portrait, bundled locally, as a circular marker. The standard OSM pin is removed.
- The map shows a wider regional view, based on a rounded city centre; the external map opens at zoom 8. Decimal coordinates and explicit approximation notices are omitted from the visible map panel. The dark palette and input passthrough remain.
- Fixed the navigation selector returning one element where the scroll renderer expected a list. That exception stopped all subsequent scene updates. The **More than one world** interlude once again pins to the viewport while its three photo stages, captions and timeline follow actual scroll progress; reduced-motion behavior is preserved.

## v1.9: complete first-fold Earth

- Removed the map's `A CORNER OF THE WORLD` overlay; the avatar and external map link remain.
- Constrained the orbital stage width by available viewport height so the globe is no longer cropped in short desktop windows. Compact first-fold typography also keeps the full opening content visible.
- Brought the mobile globe fully into view, with fewer decorative annotations and an icon-only recenter control retaining its accessible label.

## v1.11: owner world presence

- Existing VPS owner hook now resolves authenticated current presence and cached world metadata, following VRCX’s distinction between current location and connection state.
- 01.07 displays a visible world name and access label; Invite/Invite+, group members, non-public worlds and hidden social states display **PRIVATE**. **TRAVELING** never reveals the destination. Unsupported data is kept unknown.
- Only approved display fields enter Lanyard and the shared anonymous API. Instance IDs, nonce, join URLs, friends and credentials stay private. Names render as text, wrap on mobile and clamp to three lines with a title tooltip.
- Account activity now says **ACCOUNT ACTIVE**, accurately covering VRCX as well as web activity. The iPhone/Focus card and opening status remain separate.
- Old names clear on active/offline and after the existing 180-second validity window, including repeated read failures. The current live account-active scene is distinct from local browser fixtures used to check world displays; real enter/leave transitions still require in-game observation.
