import type { MotionVariant, StaggeredVariant } from '~/types'

export const useAnimations = () => {
  const scrollFadeUp: MotionVariant = {
    initial: { opacity: 0, y: 50 },
    visibleOnce: { opacity: 1, y: 0, transition: { duration: 600, ease: 'easeOut' } },
  }

  const scrollScaleIn: MotionVariant = {
    initial: { opacity: 0, scale: 0.88, y: 20 },
    visibleOnce: { opacity: 1, scale: 1, y: 0, transition: { duration: 500, ease: 'easeOut' } },
  }

  const staggered = (index: number, base = 50): StaggeredVariant => ({
    initial: { opacity: 0, scale: 0.88, y: 20 },
    visibleOnce: {
      opacity: 1, scale: 1, y: 0,
      transition: { duration: 450, delay: index * base, ease: 'easeOut' },
    },
  })

  return { scrollFadeUp, scrollScaleIn, staggered }
}
