<script setup lang="ts">
interface Star {
  x: number
  y: number
  r: number
  baseAlpha: number
  phase: number
  twinkleSpeed: number
  rgb: [number, number, number]
}

interface ShootingStar {
  x: number
  y: number
  vx: number
  vy: number
  length: number
  alpha: number
  active: boolean
}

const canvas = ref<HTMLCanvasElement | null>(null)

onMounted(() => {
  const el = canvas.value
  if (!el) return
  const ctx = el.getContext('2d')
  if (!ctx) return

  const dpr = Math.min(window.devicePixelRatio ?? 1, 2)
  const stars: Star[] = []
  const shooting: ShootingStar = { x: 0, y: 0, vx: 0, vy: 0, length: 0, alpha: 0, active: false }

  const STAR_COUNT = 260

  const starColor = (): [number, number, number] => {
    const r = Math.random()
    if (r < 0.12) return [100, 200, 255]    // blue-tinted
    if (r < 0.20) return [180, 110, 255]    // purple-tinted
    return [220, 230, 255]                   // near-white
  }

  const resize = () => {
    el.width = window.innerWidth * dpr
    el.height = window.innerHeight * dpr
    el.style.width = `${window.innerWidth}px`
    el.style.height = `${window.innerHeight}px`
    ctx.scale(dpr, dpr)
  }

  const initStars = () => {
    stars.length = 0
    const w = window.innerWidth
    const h = window.innerHeight
    for (let i = 0; i < STAR_COUNT; i++) {
      // 3 size layers: tiny(0.2–0.7), medium(0.7–1.3), large(1.3–2.2)
      const layer = Math.random()
      const r = layer < 0.65
        ? 0.2 + Math.random() * 0.5
        : layer < 0.92
          ? 0.7 + Math.random() * 0.6
          : 1.3 + Math.random() * 0.9
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r,
        baseAlpha: 0.3 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.004 + Math.random() * 0.008,
        rgb: starColor(),
      })
    }
  }

  const spawnShooting = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    const angle = (Math.PI / 6) + Math.random() * (Math.PI / 8)
    shooting.x = Math.random() * w * 0.7
    shooting.y = Math.random() * h * 0.3
    shooting.vx = Math.cos(angle) * 8
    shooting.vy = Math.sin(angle) * 8
    shooting.length = 80 + Math.random() * 80
    shooting.alpha = 1
    shooting.active = true
  }

  let tick = 0
  let lastShooting = 0
  let frame: number

  const draw = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    ctx.clearRect(0, 0, w, h)
    tick += 0.016

    // Stars
    for (const s of stars) {
      const alpha = s.baseAlpha * (0.55 + 0.45 * Math.sin(tick + s.phase) * (s.twinkleSpeed * 500))
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${s.rgb[0]},${s.rgb[1]},${s.rgb[2]},${Math.max(0, Math.min(1, alpha))})`
      ctx.fill()
    }

    // Shooting star
    if (shooting.active) {
      const grad = ctx.createLinearGradient(
        shooting.x - shooting.vx * (shooting.length / 8),
        shooting.y - shooting.vy * (shooting.length / 8),
        shooting.x, shooting.y,
      )
      grad.addColorStop(0, `rgba(200, 230, 255, 0)`)
      grad.addColorStop(1, `rgba(200, 230, 255, ${shooting.alpha})`)
      ctx.beginPath()
      ctx.moveTo(shooting.x - shooting.vx * (shooting.length / 8), shooting.y - shooting.vy * (shooting.length / 8))
      ctx.lineTo(shooting.x, shooting.y)
      ctx.strokeStyle = grad
      ctx.lineWidth = 1.5
      ctx.stroke()
      shooting.x += shooting.vx
      shooting.y += shooting.vy
      shooting.alpha -= 0.018
      if (shooting.alpha <= 0 || shooting.x > w || shooting.y > h) shooting.active = false
    }

    // Trigger new shooting star every 8–14s
    if (tick - lastShooting > 8 + Math.random() * 6) {
      lastShooting = tick
      spawnShooting()
    }

    frame = requestAnimationFrame(draw)
  }

  resize()
  initStars()
  draw()

  const onResize = () => { resize(); initStars() }
  window.addEventListener('resize', onResize)
  onUnmounted(() => { cancelAnimationFrame(frame); window.removeEventListener('resize', onResize) })
})
</script>

<template>
  <canvas ref="canvas" class="fixed inset-0 pointer-events-none z-0" />
</template>
