import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    blog: defineCollection({
      type: 'page',
      source: 'blog/*.md',
      schema: z.object({
        title: z.string(),
        date: z.string(),
        summary: z.string(),
        tags: z.array(z.string()).default([]),
        coverImage: z.string().optional(),
      }),
    }),
    projects: defineCollection({
      type: 'page',
      source: 'projects/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        tags: z.array(z.string()).default([]),
        github: z.string().optional(),
        liveLink: z.string().optional(),
        image: z.string().optional(),
        featured: z.boolean().default(false),
        order: z.number().default(99),
      }),
    }),
  },
})
