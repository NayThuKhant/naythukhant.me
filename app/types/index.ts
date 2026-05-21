export type { BlogCollectionItem as Post, ProjectsCollectionItem as Project, ContactsCollectionItem as Contact } from '@nuxt/content'

export type ComponentSize = 'sm' | 'md'

export type SkillCategory = 'language' | 'frontend' | 'backend' | 'devops' | 'tools'

export interface BootLine {
  text: string
  suffix?: string
  type: 'header' | 'sys' | 'done'
}

export interface MotionVariant {
  initial: Record<string, number>
  enter?: Record<string, unknown>
  visibleOnce?: Record<string, unknown>
}

export interface StaggeredVariant extends MotionVariant {
  visibleOnce: Record<string, unknown>
}
