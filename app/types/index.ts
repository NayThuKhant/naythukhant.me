export type { BlogCollectionItem as Post, ProjectsCollectionItem as Project } from '@nuxt/content'

export enum ComponentSize {
  Sm = 'sm',
  Md = 'md',
}

export enum BootLineType {
  Header = 'header',
  Sys = 'sys',
  Done = 'done',
}

export enum PlanetName {
  Mercury = 'Mercury',
  Venus   = 'Venus',
  Earth   = 'Earth',
  Mars    = 'Mars',
  Jupiter = 'Jupiter',
  Saturn  = 'Saturn',
  Uranus  = 'Uranus',
  Neptune = 'Neptune',
}

export interface BootLine {
  text: string
  suffix?: string
  type: `${BootLineType}`
}

export interface MotionVariant {
  initial: Record<string, number>
  enter?: Record<string, unknown>
  visibleOnce?: Record<string, unknown>
}

export interface StaggeredVariant extends MotionVariant {
  visibleOnce: Record<string, unknown>
}
