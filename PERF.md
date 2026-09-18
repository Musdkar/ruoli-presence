# Performance Ledger — ruoli-presence

Workflow: **Measure → Identify → Fix → Verify → Guard** (per the `performance-optimization` skill).
One change at a time. "Neutral" = revert. Every attempt is logged, kept and reverted alike.

## Environment

- Node v26.8.2 / npm 11.19.1
- Vite 5.4.21, React SPA (routes: `/`, `/photo`, `/blog`, `/blog/:slug`, `/uses`)
- Verification command: `npm run build`; ground truth = gzip size of assets referenced by `dist/index.html`
- Budget (skill): initial JS < 200 kB gzip, CSS < 50 kB gzip

## Baseline — `a37f70d` (origin/main), 2026-09-18

`npm ci && npm run build`:

| Asset | Raw | Gzip |
|---|---|---|
| `dist/assets/index-*.js` (single chunk, 320 modules) | 1,432.56 kB | **404.42 kB** |
| `dist/assets/index-*.css` | 102.02 kB | 17.62 kB |

Initial JS = **404.42 kB gzip → 2.0× over the 200 kB budget.**

## Attempt log

| # | Idea | Baseline → Result | Verdict | Why |
|---|---|---|---|---|
| — | baseline recorded | 404.42 kB gzip | — | starting point |
| 1 | lazy-load `maplibre-gl` (dynamic import in `MapCard`) | 404.42 → 118.87 kB gzip | **kept** | map lib was the biggest eager dependency; needs WebGL only |
| 2 | lazy-load `react-photo-album` (Photo page) + `react-markdown`/`remark-gfm` (Blog post) | 118.87 → 67.82 kB gzip | **kept** | only rendered on one route each |
| 3 | add bundle budget gate + CI (infra) | — | **kept** | prevents regression |

## Attempt #1 — lazy-load maplibre-gl (kept)

Removed the eager `import maplibregl from "maplibre-gl"` and its CSS; both are now loaded via `dynamic import()` inside `MapCard`. Added a `disposed` guard so a fast unmount cannot init a map into a detached node or call `setState` after teardown.

Result: initial JS 404.42 → **118.87 kB gzip**. `maplibre-gl` becomes a 283.61 kB gzip on-demand chunk.

## Attempt #2 — lazy-load Photo + Blog-post-only deps (kept)

Added `React.lazy` wrappers (`LazyMasonryPhotoAlbum`, `LazyMarkdown`) with `React.Suspense` fallbacks. `react-photo-album` + its masonry CSS load only on `/photo`; `react-markdown` + `remark-gfm` only on `/blog/:slug`.

Result: initial JS 118.87 → **67.82 kB gzip**.

## Final — after attempts #1 + #2

| Asset | Baseline gzip | Final gzip |
|---|---|---|
| Initial JS (entry chunk referenced by index.html) | 404.42 kB | **67.82 kB** |
| Initial CSS | 17.62 kB | **7.47 kB** |

Initial JS **–83%**, both under budget. Lazy chunks (load on demand, not initial): `maplibre-gl` 283.61 kB gzip, photo-album ~35 kB, markdown/highlight/other ~52 kB combined (all lazy).

## Guard — regression prevention (attempt #3, infrastructure)

Added `scripts/check-bundle-budget.mjs` wired into `npm run build`, and CI `.github/workflows/performance-budget.yml` that runs `npm ci && npm run build` on pushes to `main` and on PRs.
- Enforces initial JS < 200 kB gzip and CSS < 50 kB gzip (skill defaults).
- On-demand chunks are listed for visibility but do not fail the build.

## Verification checklist

- [x] Before/after numbers recorded
- [x] Re-measured with the same command (`npm run build`, gzip)
- [x] Improvement exceeds run-to-run variance (large margin)
- [x] No behavior change: map init, photo album, markdown render all preserved
- [x] Budget enforced in CI (.scripts/check-bundle-budget.mjs)
