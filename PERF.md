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

## Map runtime removal

The fixed Wuhan map is decorative and non-interactive, so the MapLibre/WebGL runtime was removed from the rendered application. The replacement uses a deferred 3×2 raster-tile mosaic with a CSS fallback surface and visible OpenStreetMap attribution.

Measured after the replacement:

| Asset | Before | After |
|---|---:|---:|
| Initial JS gzip | 71.3 kB | **68.0 kB** |
| Initial CSS gzip | 7.5 kB | **7.8 kB** |
| Largest on-demand JS chunk | MapLibre **278.3 kB** | route chunk **34.4 kB** |

The map tiles are requested only when the map approaches the viewport and the browser becomes idle. If the tile service is slow or unavailable, the card keeps its local CSS surface, avatar, city label and location pill instead of blocking Home.

## Dependency cleanup

After removing the runtime map and confirming Chart.js is unused, `maplibre-gl`, `chart.js` and `react-chartjs-2` were removed from the app dependencies and the lockfile was pruned. CI now installs 170 packages and the production browser bundle is unchanged.

## Next targets

- Convert oversized decorative imagery to appropriately sized WebP/AVIF assets.
- Add long-lived immutable cache headers only to content-hashed assets.
- Keep Lanyard storage architecture separate from performance work unless measurements justify a migration.
