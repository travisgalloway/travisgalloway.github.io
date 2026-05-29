# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` — Start dev server at localhost:4321
- `pnpm build` — Production build (outputs to dist/)
- `pnpm preview` — Preview production build locally
- `pnpm photos` — Regenerate the photo manifest from `public/images/travels/` (see Photo Pipeline)

`postinstall` copies `countries-110m.json` (world-atlas) and `states-10m.json`
(us-atlas) from node_modules into `public/data/`. After a fresh clone, run
`pnpm install` before `pnpm dev` or those globe layers will 404.

No linter, formatter, or test framework is configured. Package manager is pnpm.

## Architecture

Astro 5 static site with Svelte 5 components. Single-page personal portfolio
deployed to GitHub Pages. `astro.config.mjs` sets `site: 'https://travisgalloway.com'`
and enables the `svelte()` and `sitemap()` integrations.

### Pages & Layouts

- `src/pages/index.astro` — The only page. Composes every section component in order.
- `src/layouts/Base.astro` — HTML shell: SEO/OG/Twitter meta, Schema.org Person
  JSON-LD, global CSS import, and an inline pre-paint script that reads
  `localStorage.theme` and sets `data-theme` on `<html>` to avoid a flash.

### Components (`src/components/`)

Section components render as static HTML (no client directive):
`About`, `Experience`, `Education`, `Projects`, `Contact`.

Hydrated with `client:load`: `Nav` (scroll-aware nav + theme cycler),
`Hero` (animated photo carousel + lightbox), and `Globe` (interactive D3 canvas).

Supporting components: `Lightbox.svelte` (modal used by both Hero and Globe;
its "View on Globe" button dispatches a `globe:zoom` CustomEvent that Globe
listens for) and `GlobeStage.astro` (a 2-column CSS grid — `1fr auto` — wrapping
`About` on the left and `Globe` on the right; collapses to a single column with
the globe centered below 900px).

Note: Astro wraps hydrated Svelte components in `<astro-island>` (display: contents).

### The Globe

`Globe.svelte` is the centerpiece: a D3 orthographic-projection globe drawn to a
`<canvas>` (d3-geo, d3-drag, d3-interpolate, d3-timer, d3-selection +
topojson-client). It supports drag-to-rotate (3px threshold separates drag from
click), wheel/pinch zoom, click-to-zoom into a country, hover tooltips, and
Escape to zoom out. D3 rotation convention: `[longitude, -latitude, 0]` centers a point.

Globe data sources:
- `src/lib/globe-locations.ts` — `stateHighlights`, `visitedCountries`,
  `sectionRotations`, and helpers `getAllPins()` / `getPhotoPins(manifest)`.
- Runtime-fetched GeoJSON/topology from `public/data/`: `countries-110m.json`,
  `states-10m.json`, `intl-provinces.json`, plus `earth-texture.jpg`
  (`intl-provinces.json` and the texture are checked in; the other two are
  copied by `postinstall`).

### Content Model

Section content (work history, schools, projects, contact links, nav links) is
hardcoded as data arrays *inside* each Svelte component — no content
collections or markdown. Photo and globe data are the exceptions: photos come
from the generated `src/data/photo-manifest.json`, and travel locations from
`src/lib/globe-locations.ts`.

### Photo Pipeline

`scripts/process-photos.mjs` (`pnpm photos`) reads originals from
`public/images/travels/`, uses `sharp` to generate thumbnails into
`travels/thumbs/`, and `exifr` to pull GPS EXIF. It matches each photo's
coordinates to a known city (haversine, 500 km threshold) and writes
`src/data/photo-manifest.json` (id, thumb, full, orientation, description,
city/state/country, countryCode, lat/lng). Add photos → run `pnpm photos` →
commit the regenerated manifest.

### Design System

`src/styles/global.css` defines CSS custom properties on `:root`:
- Colors: `--c-bg`, `--c-surface`, `--c-text`, `--c-text-muted`, `--c-accent`,
  `--c-border`, `--c-border-light`, and pin colors
  (`--c-pin-work/-education/-travel/-photo/-lived/-visited`, `--c-country-visited`).
- Fonts: `--font-body`, `--font-display` (both the system UI stack).
- Spacing scale: `--space-xs` (0.5rem) through `--space-xl` (6rem).
- Widths: `--max-w: 680px` (content), `--max-w-wide: 1200px` (GlobeStage).

Theming is three-state (system / light / dark). The default follows
`@media (prefers-color-scheme: dark)` via `:root:not([data-theme="light"])`;
an explicit choice is forced with `:root[data-theme="dark"]` /
`[data-theme="light"]`, persisted to `localStorage` and applied by the inline
script in `Base.astro`. `prefers-reduced-motion` disables animations.

## Deployment

`.github/workflows/deploy.yml` builds with Node 20 + pnpm
(`--frozen-lockfile`, `pnpm run build`) and deploys `dist/` to GitHub Pages via
`actions/deploy-pages@v4`. Triggers on push to `main` or manual `workflow_dispatch`.
