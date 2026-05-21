export const useAnimations = () => {
  // Entrance (triggered by `enter` lifecycle)
  const fadeUp = {
    initial: { opacity: 0, y: 40 },
    enter: { opacity: 1, y: 0, transition: { duration: 600, ease: 'easeOut' } },
  }

  const fadeIn = {
    initial: { opacity: 0 },
    enter: { opacity: 1, transition: { duration: 700 } },
  }

  const scaleIn = {
    initial: { opacity: 0, scale: 0.88 },
    enter: { opacity: 1, scale: 1, transition: { duration: 500, ease: 'easeOut' } },
  }

  // Scroll-triggered (use with `:visible-once` binding in template)
  const scrollFadeUp = {
    initial: { opacity: 0, y: 50 },
    visibleOnce: { opacity: 1, y: 0, transition: { duration: 600, ease: 'easeOut' } },
  }

  const scrollScaleIn = {
    initial: { opacity: 0, scale: 0.88, y: 20 },
    visibleOnce: { opacity: 1, scale: 1, y: 0, transition: { duration: 500, ease: 'easeOut' } },
  }

  const scrollSlideLeft = {
    initial: { opacity: 0, x: -40 },
    visibleOnce: { opacity: 1, x: 0, transition: { duration: 600, ease: 'easeOut' } },
  }

  // Returns a visibleOnce variant with stagger delay; call in setup, not template
  const staggered = (index: number, base = 50) => ({
    initial: { opacity: 0, scale: 0.88, y: 20 },
    visibleOnce: {
      opacity: 1, scale: 1, y: 0,
      transition: { duration: 450, delay: index * base, ease: 'easeOut' },
    },
  })

  return { fadeUp, fadeIn, scaleIn, scrollFadeUp, scrollScaleIn, scrollSlideLeft, staggered }
}
