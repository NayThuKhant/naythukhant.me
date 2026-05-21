import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    skills: defineCollection({
      type: 'data',
      source: 'skills/*.yml',
      schema: z.object({
        name: z.string(),
        category: z.string(),
        level: z.number().min(1).max(5),
        order: z.number().default(99),
      }),
    }),
    skillCategories: defineCollection({
      type: 'data',
      source: 'skill-categories/*.yml',
      schema: z.object({
        key: z.string(),
        label: z.string(),
        order: z.number().default(99),
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
      }),
    }),
    projects: defineCollection({
      type: 'page',
      source: 'projects/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        category: z.string().default(''),
        tags: z.array(z.string()).default([]),
        github: z.string().optional(),
        liveLink: z.string().optional(),
        image: z.string().optional(),
        featured: z.boolean().default(false),
        order: z.number().default(99),
      }),
    }),
    projectCategories: defineCollection({
      type: 'data',
      source: 'project-categories/*.yml',
      schema: z.object({
        key: z.string(),
        label: z.string(),
        order: z.number().default(99),
      }),
    }),
    contacts: defineCollection({
      type: 'data',
      source: 'contacts/*.yml',
      schema: z.object({
        label: z.string(),
        url: z.string(),
        icon: z.string(),
        order: z.number().default(99),
      }),
    }),
  },
})
