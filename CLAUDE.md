# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A modern, space-themed portfolio website for Software Engineers. Features animated UI, a Skills showcase, Projects gallery, and a Blog — all powered by Nuxt 3 and Nuxt Content.

**Stack:** Nuxt 3 · TypeScript · Tailwind CSS · @vueuse/motion · Nuxt Content v2

## Commands

```bash
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build (SSR)
npm run generate     # Static site generation
npm run preview      # Preview production build
npm run lint         # ESLint
npx nuxi typecheck   # Type-check without emitting
```

## Architecture

### Routing (file-based under `pages/`)
```
pages/
  index.vue          # Home — hero + skills + featured projects
  projects/
    index.vue        # All projects grid
    [slug].vue       # Individual project detail
  blog/
    index.vue        # Blog post list
    [slug].vue       # Blog post rendered from Markdown/MDX
```

### Content Layer (Nuxt Content)
All blog posts and project write-ups live as `.md` files under `content/`:
```
content/
  blog/              # *.md — each file is a blog post
  projects/          # *.md — rich project case studies (optional)
```

Frontmatter schema for blog posts:
```yaml
title, date, summary, tags[], coverImage
```

Frontmatter schema for projects:
```yaml
title, description, tags[], github, live, featured (bool), order (int)
```

Content is queried via the `queryContent()` composable from Nuxt Content. `<ContentRenderer>` handles rendering MDC/Markdown in detail pages.

### Component Structure
```
components/
  layout/            # AppNavbar, AppFooter, SectionWrapper
  home/              # HeroSection, SkillsGrid, FeaturedProjects
  projects/          # ProjectCard, ProjectGrid
  blog/              # PostCard, PostList
  ui/                # Reusable primitives: AppButton, AppBadge, AppCard
  animations/        # Shared @vueuse/motion variants and animated wrappers
```

### Space Theme & Animations
- Global starfield background lives in `components/layout/StarBackground.vue` and uses a canvas element rendered behind all page content.
- Motion variants (fadeUp, staggerChildren, etc.) are centralised in `composables/useMotionVariants.ts` so pages share consistent animations via `@vueuse/motion`.
- Color palette is defined in `tailwind.config.ts` under `theme.extend.colors.space.*` — deep navy/black backgrounds, accent purples/cyans, glowing whites.
- Neon glow effects use extended Tailwind `boxShadow` utilities with CSS custom properties for glow colors.

### Data Flow
The site is fully statically generated (`nuxi generate`). Skills data is a plain TypeScript array in `data/skills.ts`. Projects without a dedicated content file are defined in `data/projects.ts`. The Nuxt Content module handles all blog and project MDX rendering at build time.

### Nuxt 4 Alias Notes
In Nuxt 4, `~` and `@` resolve to `srcDir` (`app/`). Use `@@/` to import from the project root (e.g. `@@/data/skills`). Components in subdirectories are auto-imported without path prefix because `nuxt.config.ts` sets `components: [{ path: '~/components', pathPrefix: false }]`.

### Animation Composable
Use `useAnimations()` from `app/composables/useAnimations.ts` — **not** `useMotionVariants()`. The latter is exported by `@vueuse/motion` itself and would shadow the custom composable. `useAnimations()` returns plain variant objects (`scrollFadeUp`, `scrollScaleIn`, `scrollSlideLeft`, `staggered`) for use with the `v-motion` directive. Never call these as functions in template bindings — bind the pre-computed object properties (`.initial`, `.visibleOnce`) directly.

### Key Config Files
- `nuxt.config.ts` — modules: `@nuxt/content`, `@nuxtjs/tailwindcss`, `@vueuse/motion/nuxt`
- `tailwind.config.ts` — space color palette and custom glow shadow extensions
- `content.config.ts` (if using Nuxt Content v3) — collection schemas for type-safe frontmatter
