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
        siteUrl: z.string().optional(),
        seoTitle: z.string().optional(),
        seoDescription: z.string().optional(),
        seoImage: z.string().optional(),
        twitterHandle: z.string().optional(),
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
        category: z.string(),
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
        featured: z.boolean().default(false),
        order: z.number().default(99),
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
  },
})
