# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` — Start dev server at localhost:4321
- `pnpm build` — Production build (outputs to dist/)
- `pnpm preview` — Preview production build locally

No linter, formatter, or test framework is configured.

## Architecture

Astro 5 static site with Svelte 5 components. Personal portfolio deployed to GitHub Pages (auto-deploys on push to `main`).

**Site config:** `astro.config.mjs` sets `site: 'https://travisgalloway.com'` and enables the Svelte integration.

### Pages & Layouts

- `src/pages/index.astro` — Single page that composes all section components
- `src/layouts/Base.astro` — Root HTML shell with SEO meta, Schema.org JSON-LD, and global CSS import

### Components (Svelte)

All in `src/components/`. Each renders a page section: Nav, Hero, Experience, Projects, Contact.

`Nav` and `Hero` use `client:load` for hydration (Nav for scroll-aware behavior, Hero for photo cloud shuffle). All other components render as static HTML with no client-side JS.

### Content Model

All content (work experience, projects, contact info) is hardcoded as data arrays inside the Svelte components. No content collections, markdown files, or external data sources.

### Design System

`src/styles/global.css` defines CSS custom properties:
- Colors: `--c-bg`, `--c-surface`, `--c-text`, `--c-accent`, `--c-border`
- Fonts: `--font-body` (DM Sans), `--font-display` (Source Serif 4)
- Spacing scale: `--space-xs` through `--space-xl`
- Max content width: `--max-w: 680px`
- Dark mode via `@media (prefers-color-scheme: dark)`
