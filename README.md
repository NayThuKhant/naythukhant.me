# Portfolio

A space-themed portfolio website for Software Engineers — animated solar system background, terminal boot sequence, glassmorphism HUD components, and tag-driven content collections ordered by filename.

**Stack:** Nuxt 3 · TypeScript · Tailwind CSS · @vueuse/motion · Nuxt Content v3

## Features

- Live HTML5 canvas solar system background (Sun + 8 planets with realistic lighting, orbits, labels, asteroid belt)
- Terminal boot-sequence hero animation driven by `content/config.yml`
- Skills grid, projects gallery, and blog all filter by freeform tags
- Filename-based ordering for skills, projects, and blog posts
- Optional Vercel Analytics and Speed Insights support on Vercel
- Nuxt Content Studio available in production at `/_studio`
- Scroll-triggered entrance animations via `@vueuse/motion`
- Responsive — desktop navbar + mobile bottom tab bar

## Installation

```bash
cp .env.example .env 
npm install
npm run dev        # dev server at http://localhost:3000
npm run build      # SSR production build
npm run generate   # fully static output in .output/public/
npm run preview    # preview production build locally
npm run lint       # ESLint
npx nuxi typecheck # TypeScript check without emitting
```

In production, Nuxt Content Studio is available at `/_studio`.

## Personalising

Everything is driven by files under `content/` — no code changes required for content updates. Tags are freeform; filename prefixes control display order.