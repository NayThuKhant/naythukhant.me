export interface Project {
  slug: string
  title: string
  description: string
  tags: string[]
  github?: string
  live?: string
  featured: boolean
  order: number
}

// Projects without a dedicated MDX write-up (inline data only)
export const inlineProjects: Project[] = []
