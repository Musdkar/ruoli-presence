# Performance Ledger — ruoli-presence

Performance work follows **Measure → Identify → Fix → Verify → Guard**.

## Production baseline

Commit: `a37f70deafb9ebc551fb140e0bbd07d1033246bf`

Azure production build:

| Asset | Raw | Gzip |
|---|---:|---:|
| Initial JS | 1,439.42 kB | **408.83 kB** |
| Initial CSS | 102.02 kB | **17.62 kB** |

The initial JavaScript bundle was the dominant first-load cost.

## Consolidated optimization

The first pass keeps behavior intact while removing route-only and map-only code from the critical path:

1. Dynamically load `maplibre-gl` and its CSS only when the Home map approaches the viewport.
2. Load `react-photo-album` only when Photo renders.
3. Load `react-markdown` + `remark-gfm` only when a blog post renders.
4. Stop prioritizing the large map-avatar image.
5. Read a sanitized last-good Lanyard snapshot from local storage, while REST and WebSocket refresh in parallel.
6. Cache the last-good weather response and put a 3 second ceiling on the refresh request.

Measured in Azure Preview after the runtime changes:

| Asset | Raw | Gzip |
|---|---:|---:|
| Initial JS | 215.6 kB | **71.2 kB** |
| Initial CSS | 30.4 kB | **7.5 kB** |

That is roughly an **82.6% reduction in initial JS gzip** from the production baseline.

## Guard

`npm run build` runs `scripts/check-bundle-budget.mjs` after Vite.

Hard budgets:

- Initial JS: **120 kB gzip**
- Initial CSS: **15 kB gzip**

The CI workflow also runs the same build on PRs and `main`. Lazy chunks are reported separately so large on-demand dependencies stay visible without being counted as first-load regressions.

## Map architecture (MapLibre restored, lazily)

A previous iteration replaced the runtime map with pre-rendered static WebP images. That
removed the MapLibre cost but visibly degraded the card (missing map avatar, flat texture,
inconsistent with the ana.sh / enscribe.dev look). The static-image approach was reverted.

Current architecture keeps the performance win while restoring the real map:

1. `MapCard` renders a `.map-canvas` container plus the decorative shade, avatar, city label
   and location pill. No map code is in the initial bundle.
2. An `IntersectionObserver` fires only when the card approaches the viewport; a subsequent
   `requestIdleCallback` schedules the work off the critical path.
3. Only then does `dynamic import("maplibre-gl")` (and its CSS) load, followed by map init.

The map is an identity card, not an interactive map, so it is locked down:

- fixed center on Wuhan, fixed zoom 8.4
- `interactive: false` (no drag, rotate, pitch, scroll-zoom or keyboard pan)
- `attributionControl: false`, no markers, no popups
- `.map-card canvas { pointer-events: none }` as a belt-and-suspenders guard

Because the map only loads after intersection + idle, the first paint requests no map JS,
no map CSS and no tiles.

Removed in this change:

- `public/assets/wuhan-map-dark.webp`, `public/assets/wuhan-map-light.webp`
- `scripts/generate-map-assets.sh`
- `.github/workflows/generate-map-assets.yml`
- the `.map-static` CSS block in `src/hotfix.css`

### Map avatar

The map card keeps its dedicated circular avatar overlay (separate from the sidebar portrait).
PR #4 had shrunk it to a 192x144 WebP that looked soft. It is restored at the source
resolution (800x600) as a high-quality WebP, which is still ~15x smaller than the original
~414 kB PNG and crisp at the 66px display size.

### Verified result

| Asset | Value |
|---|---:|
| Initial JS gzip | **68.4 kB** (budget 120 kB) |
| Initial CSS gzip | **7.4 kB** (budget 15 kB) |
| MapLibre chunk (on-demand only) | 283.6 kB gzip |
| maplibre-gl in initial bundle | none |

## Dependency cleanup

`chart.js` and `react-chartjs-2` remain removed (confirmed unused). `maplibre-gl` is kept as a
dependency again, but it is only ever reached through a dynamic import, so it never enters the
initial bundle. The lockfile reflects both facts: map engine present, charting library gone.

## Next targets

- Add long-lived immutable cache headers only to content-hashed assets.
- Keep Lanyard storage architecture separate from performance work unless measurements justify a migration.
