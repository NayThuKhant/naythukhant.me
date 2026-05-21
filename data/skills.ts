export interface Skill {
  name: string
  category: 'language' | 'frontend' | 'backend' | 'devops' | 'tools'
  level: number // 1–5
  icon?: string
}

export const skills: Skill[] = [
  // Languages
  { name: 'TypeScript', category: 'language', level: 5 },
  { name: 'Go', category: 'language', level: 4 },
  { name: 'Python', category: 'language', level: 4 },
  { name: 'Rust', category: 'language', level: 3 },

  // Frontend
  { name: 'Vue / Nuxt', category: 'frontend', level: 5 },
  { name: 'React / Next.js', category: 'frontend', level: 4 },
  { name: 'Tailwind CSS', category: 'frontend', level: 5 },
  { name: 'Framer Motion', category: 'frontend', level: 3 },

  // Backend
  { name: 'Node.js', category: 'backend', level: 5 },
  { name: 'PostgreSQL', category: 'backend', level: 4 },
  { name: 'Redis', category: 'backend', level: 4 },
  { name: 'GraphQL', category: 'backend', level: 3 },

  // DevOps
  { name: 'Docker', category: 'devops', level: 4 },
  { name: 'Kubernetes', category: 'devops', level: 3 },
  { name: 'CI/CD', category: 'devops', level: 4 },
  { name: 'AWS', category: 'devops', level: 3 },

  // Tools
  { name: 'Git', category: 'tools', level: 5 },
  { name: 'Linux', category: 'tools', level: 4 },
]

export const skillCategories = [
  { key: 'language', label: 'Languages' },
  { key: 'frontend', label: 'Frontend' },
  { key: 'backend', label: 'Backend' },
  { key: 'devops', label: 'DevOps' },
  { key: 'tools', label: 'Tools' },
] as const
