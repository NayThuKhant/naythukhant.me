import {defineContentConfig, defineCollection, z} from '@nuxt/content'
import {BootLineType} from './app/types'


const seo = z.object({
    title: z.string(),
    description: z.string(),
}).optional()

export default defineContentConfig({
    collections: {
        config: defineCollection({
            type: 'data',
            source: 'config.yml',
            schema: z.object({
                greeting: z.string(),
                name: z.string(),
                description: z.string(),
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
                description: z.string(),
                tags: z.array(z.string()).default([]),
                coverImage: z.string().optional(),
                featured: z.boolean().default(false),
                seo
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
                seo
            }),
        }),
        pages: defineCollection({
            type: 'page',
            source: '*.md',
            schema: z.object({
                title: z.string(),
                description: z.string().optional(),
                seo
            }),
        }),
    },
})
