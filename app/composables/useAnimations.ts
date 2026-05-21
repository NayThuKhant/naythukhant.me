import type { MotionVariant, StaggeredVariant } from '~/types'

export const useAnimations = () => {
  const fadeUp: MotionVariant = {
    initial: { opacity: 0, y: 40 },
    enter: { opacity: 1, y: 0, transition: { duration: 600, ease: 'easeOut' } },
  }

  const fadeIn: MotionVariant = {
    initial: { opacity: 0 },
    enter: { opacity: 1, transition: { duration: 700 } },
  }

  const scaleIn: MotionVariant = {
    initial: { opacity: 0, scale: 0.88 },
    enter: { opacity: 1, scale: 1, transition: { duration: 500, ease: 'easeOut' } },
  }

  const scrollFadeUp: MotionVariant = {
    initial: { opacity: 0, y: 50 },
    visibleOnce: { opacity: 1, y: 0, transition: { duration: 600, ease: 'easeOut' } },
  }

  const scrollScaleIn: MotionVariant = {
    initial: { opacity: 0, scale: 0.88, y: 20 },
    visibleOnce: { opacity: 1, scale: 1, y: 0, transition: { duration: 500, ease: 'easeOut' } },
  }

  const scrollSlideLeft: MotionVariant = {
    initial: { opacity: 0, x: -40 },
    visibleOnce: { opacity: 1, x: 0, transition: { duration: 600, ease: 'easeOut' } },
  }

  const staggered = (index: number, base = 50): StaggeredVariant => ({
    initial: { opacity: 0, scale: 0.88, y: 20 },
    visibleOnce: {
      opacity: 1, scale: 1, y: 0,
      transition: { duration: 450, delay: index * base, ease: 'easeOut' },
    },
  })

  return { fadeUp, fadeIn, scaleIn, scrollFadeUp, scrollScaleIn, scrollSlideLeft, staggered }
}
