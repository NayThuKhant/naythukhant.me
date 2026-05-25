import type { MotionVariant, StaggeredVariant } from '~/types'

export const useAnimations = () => {
  const scrollFadeUp: MotionVariant = {
    initial: { opacity: 0, y: 24 },
    visibleOnce: { opacity: 1, y: 0, transition: { duration: 250, ease: 'easeOut' } },
  }

  const scrollScaleIn: MotionVariant = {
    initial: { opacity: 0, scale: 0.94, y: 12 },
    visibleOnce: { opacity: 1, scale: 1, y: 0, transition: { duration: 200, ease: 'easeOut' } },
  }

  const staggered = (index: number, base = 30): StaggeredVariant => ({
    initial: { opacity: 0, scale: 0.94, y: 12 },
    visibleOnce: {
      opacity: 1, scale: 1, y: 0,
      transition: { duration: 200, delay: index * base, ease: 'easeOut' },
    },
  })

  return { scrollFadeUp, scrollScaleIn, staggered }
}
