import { defineContentConfig, defineCollection, z } from '@nuxt/content'
import { BootLineType } from './app/types'

export default defineContentConfig({
  collections: {
    config: defineCollection({
      type: 'data',
      source: 'config.yml',
      schema: z.object({
        greeting: z.string().optional(),
        name: z.string(),
        role: z.string(),
        taglines: z.array(z.object({
          text: z.string(),
        })).default([]),
        bootLines: z.array(z.object({
          text: z.string(),
          suffix: z.string().optional(),
          type: z.nativeEnum(BootLineType),
        })).default([]),
        contacts: z.array(z.object({
          label: z.string(),
          url: z.string(),
          icon: z.string(),
        })).default([]),
      }),
    }),
    skills: defineCollection({
      type: 'data',
      source: 'skills/*.yml',
      schema: z.object({
        name: z.string(),
        icon: z.string(),
        tags: z.array(z.string()).default([]),
      }),
    }),
    blog: defineCollection({
      type: 'page',
      source: 'blog/*.md',
      schema: z.object({
        title: z.string(),
        date: z.string(),
        summary: z.string(),
        tags: z.array(z.string()).default([]),
        coverImage: z.string().optional(),
        featured: z.boolean().default(false),
      }),
    }),
    projects: defineCollection({
      type: 'page',
      source: 'projects/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        tags: z.array(z.string()).default([]),
        links: z.array(z.object({
          title: z.string(),
          link: z.string(),
          icon: z.string().optional(),
        })).default([]),
        image: z.string().optional(),
        featured: z.boolean().default(false),
      }),
    }),
    pages: defineCollection({
      type: 'page',
      source: '*.md',
      schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        seo: z.intersection(
          z.object({
            title: z.string(),
            description: z.string()
          }),
          z.record(z.string(), z.any()),
        ),
      }),
    }),
  },
})
