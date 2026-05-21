# Portfolio

A modern, space-themed portfolio website for Software Engineers built with **Nuxt 4** and **Nuxt Content v3**.

## Features

- Space / cyberpunk aesthetic with animated starfield and glassmorphism HUD components
- Terminal boot-sequence hero animation
- **Projects** — driven by Markdown files in `content/projects/`
- **Blog** — driven by Markdown files in `content/blog/`
- **Contacts** — driven by YAML files in `content/contacts/` (add a file to add a new link)
- Scroll-triggered animations via `@vueuse/motion`

## Getting Started

```bash
npm install
npm run dev       # http://localhost:3000
npm run generate  # static output in .output/public/
npm run build     # SSR build
```

## Personalising

| What | Where |
|---|---|
| Name & tagline | `app/components/home/HeroSection.vue` |
| Skills list | `data/skills.ts` |
| Projects | `content/projects/*.md` — frontmatter: `title`, `description`, `tags`, `github`, `liveLink`, `image`, `featured`, `order` |
| Blog posts | `content/blog/*.md` — frontmatter: `title`, `date`, `summary`, `tags` |
| Contact links | `content/contacts/*.yml` — frontmatter: `label`, `url`, `icon`, `order` |
