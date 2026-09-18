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

The fixed Wuhan map is decorative and non-interactive, so the MapLibre/WebGL runtime was removed from the rendered application. The final replacement is a pair of pre-rendered Wuhan WebP assets (dark/light) generated from OpenStreetMap tiles outside the production build. The browser renders only a CSS background, the dedicated avatar, city label, location pill and visible OpenStreetMap attribution. There are no runtime tile requests, map API calls, WebGL contexts or map-engine JavaScript.

Measured after the replacement:

| Asset | Before | After |
|---|---:|---:|
| Initial JS gzip | 71.3 kB | **68.0 kB** |
| Initial CSS gzip | 7.5 kB | **7.8 kB** |
| Largest on-demand JS chunk | MapLibre **278.3 kB** | route chunk **34.4 kB** |

The map generator lives in `scripts/generate-map-assets.sh` and is intentionally not part of `npm run build`. A small GitHub Actions utility regenerates the assets only when the map-generation tooling itself changes, so ordinary deploys have no dependency on OpenStreetMap availability. The active theme selects one local WebP asset; switching themes loads the alternate asset on demand.

## Image reuse

The map marker keeps the previous dedicated map artwork rather than reusing the sidebar portrait. Its original ~414 kB PNG is treated only as the source asset during regeneration; the production branch carries a ~4 kB `map-avatar.webp` sized for the 66×66 marker. This preserves the old map identity without reintroducing the oversized transfer.

## Dependency cleanup

After removing the runtime map and confirming Chart.js is unused, `maplibre-gl`, `chart.js` and `react-chartjs-2` were removed from the app dependencies and the lockfile was pruned. CI now installs 170 packages and the production browser bundle is unchanged.

## Next targets

- Re-check the pre-rendered map WebP quality/size after visual QA and reduce dimensions further only if the card still looks crisp.
- Add long-lived immutable cache headers only to content-hashed assets.
- Keep Lanyard storage architecture separate from performance work unless measurements justify a migration.
