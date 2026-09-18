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

## Next targets

- Remove the non-interactive MapLibre runtime entirely if a static map treatment preserves the current visual quality.
- Convert oversized decorative imagery to appropriately sized WebP/AVIF assets.
- Add long-lived immutable cache headers only to content-hashed assets.
- Keep Lanyard storage architecture separate from performance work unless measurements justify a migration.
