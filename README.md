# travisgalloway.github.io

Personal site and portfolio. Built with [Astro](https://astro.build) and [Svelte](https://svelte.dev).

## Local development

```bash
pnpm install
pnpm run dev
```

Site runs at `http://localhost:4321`.

## Deploying to GitHub Pages

This repo uses GitHub Actions to automatically build and deploy on every push to `main`.

## Project structure

```
src/
  components/    # Svelte components
    Nav.svelte
    Hero.svelte
    Experience.svelte
    Projects.svelte
    Contact.svelte
  layouts/       # Astro layouts
    Base.astro
  pages/         # Routes
    index.astro
  styles/        # Global CSS
    global.css
public/          # Static assets (favicon, images, CNAME)
```

## Editing content

All content lives directly in the Svelte components. To update your experience, projects, or contact info, edit the relevant component in `src/components/`.
