# Portfolio

A space-themed portfolio website for Software Engineers — animated solar system background, terminal boot sequence, glassmorphism HUD components, and a fully content-driven data layer.

**Stack:** Nuxt 3 · TypeScript · Tailwind CSS · @vueuse/motion · Nuxt Content v3

## Features

- Live HTML5 canvas solar system background (Sun + 8 planets with realistic lighting, orbits, labels, asteroid belt)
- Terminal boot-sequence hero animation driven by `content/config.yml`
- Skills grid with category filter and `?category=` URL sync
- Projects gallery with category filter and `?category=` URL sync
- Blog with tag filter and `?category=` URL sync
- Scroll-triggered entrance animations via `@vueuse/motion`
- Responsive — desktop navbar + mobile bottom tab bar

## Getting Started

```bash
npm install
npm run dev        # dev server at http://localhost:3000
npm run build      # SSR production build
npm run generate   # fully static output in .output/public/
npm run preview    # preview production build locally
npm run lint       # ESLint
npx nuxi typecheck # TypeScript check without emitting
```

## Personalising

Everything is driven by files under `content/` — no code changes required for content updates.

### Site identity & hero

Edit `content/config.yml`:

```yaml
name: Your Name
greeting: Hi! I'm
role: A Software Engineer
siteUrl: https://yoursite.com
seoTitle: Your Name
seoDescription: One-line bio for SEO and social cards.
seoImage: /og.png
twitterHandle: "@yourhandle"

taglines:
  - text: Building scalable distributed systems.
  - text: Crafting beautiful, performant UIs.

bootLines:
  - text: "YOUR NAME — NEURAL BOOT SEQUENCE"
    type: header
  - text: ">>> Loading modules..."
    suffix: OK
    type: sys
  - text: ">>> All systems nominal. Welcome!"
    type: done

contacts:
  - label: GitHub
    url: https://github.com/you
    icon: i-line-md:github
  - label: LinkedIn
    url: https://linkedin.com/in/you
    icon: i-bi:linkedin
```

### Skills

Add a YAML file per skill to `content/skills/`:

```yaml
# content/skills/typescript.yml
name: TypeScript
icon: simple-icons:typescript   # Iconify simple-icons name
category: languages             # must match a key in skill-categories/
order: 1
```

Add categories to `content/skill-categories/`:

```yaml
# content/skill-categories/languages.yml
key: languages
label: Languages
order: 1
```

### Projects

Add a Markdown file to `content/projects/`:

```markdown
---
title: My Project
description: Short description shown in the card.
category: fullstack              # must match a key in project-categories/
tags: [Nuxt, TypeScript]
github: https://github.com/you/repo
liveLink: https://myproject.com
image: /images/project.png
featured: true
order: 1
---

Full project write-up in MDX goes here...
```

### Blog

Add a Markdown file to `content/blog/`:

```markdown
---
title: Post Title
date: "2025-01-15"
summary: One-sentence summary shown in the post list.
tags: [Nuxt, Performance]
coverImage: /images/cover.png
featured: false
order: 1
---

Blog content in MDX goes here...
```

## Architecture

```
app/
  components/
    layout/         AppNavbar, AppFooter, SolarSystemBackground
    home/           HeroSection, SkillsGrid, FeaturedProjects
    projects/       ProjectCard, ProjectGrid
    blog/           PostCard
    ui/             ContactLinks
  composables/
    useAnimations   scrollFadeUp, scrollScaleIn, staggered variants
  layouts/
    default.vue     Root layout — SolarSystemBackground + Navbar + Footer
  pages/
    index.vue       Home (hero + skills + featured projects)
    projects/       index.vue (grid) + [slug].vue (detail)
    blog/           index.vue (list) + [slug].vue (post)
  types/
    index.ts        ComponentSize, BootLineType enums

content/
  config.yml              Site identity, boot sequence, contacts
  skills/*.yml            One file per skill
  skill-categories/*.yml  Skill categories
  projects/*.md           Project write-ups
  project-categories/*.yml Project categories
  blog/*.md               Blog posts
```

## Deployment

The site deploys to Vercel via git push. `nuxi generate` produces a fully static build; `nuxi build` produces an SSR build — both work on Vercel.
