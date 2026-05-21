<script setup lang="ts">
// ─── Types ────────────────────────────────────────────────────────────────────

interface Star {
  x: number; y: number; r: number
  layer: number
  twinkle: boolean; phase: number; speed: number
  dx: number; dy: number
}

interface Blob {
  orbitR: number; baseAngle: number; orbitSpeed: number
  gradR: number; rgb: [number, number, number]; alpha: number
}

interface Planet {
  cx: number; cy: number; r: number
  ampX: number; ampY: number
  freqX: number; freqY: number; phase: number
  rotOffset: number; rotSpeed: number
  type: 'gas' | 'glow' | 'ice'
}

// ─── State ────────────────────────────────────────────────────────────────────

const canvasEl = ref<HTMLCanvasElement | null>(null)
let raf = 0
let W = 0, H = 0
const τ = Math.PI * 2

let stars: Star[] = []
let blobs: Blob[] = []
let planets: Planet[] = []

const rnd = (a: number, b: number) => a + Math.random() * (b - a)

// ─── Init ─────────────────────────────────────────────────────────────────────

function setup() {
  if (!canvasEl.value) return
  W = canvasEl.value.width  = window.innerWidth
  H = canvasEl.value.height = window.innerHeight
  buildStars()
  buildBlobs()
  buildPlanets()
}

function buildStars() {
  stars = []
  const layers = [
    { n: 110, rMin: 0.30, rMax: 0.80, dyMin: 0.010, dyMax: 0.020, twChance: 0.30 },
    { n:  80, rMin: 0.70, rMax: 1.30, dyMin: 0.020, dyMax: 0.040, twChance: 0.60 },
    { n:  40, rMin: 1.20, rMax: 2.10, dyMin: 0.040, dyMax: 0.070, twChance: 0.80 },
  ]
  layers.forEach(({ n, rMin, rMax, dyMin, dyMax, twChance }, layer) => {
    for (let i = 0; i < n; i++) {
      stars.push({
        x: rnd(0, W), y: rnd(0, H),
        r: rnd(rMin, rMax),
        layer,
        twinkle: Math.random() < twChance,
        phase: rnd(0, τ), speed: rnd(0.6, 2.5),
        dx: rnd(-0.005, 0.005),
        dy: rnd(dyMin, dyMax),
      })
    }
  })
}

function buildBlobs() {
  // Each blob slowly orbits the nebula centre — overlapping 'screen' blends
  // create the swirling, colour-shifting cloud effect.
  const s = Math.min(W, H)
  blobs = [
    { orbitR: 0,       baseAngle: 0,       orbitSpeed:  1.4e-4, gradR: s * 1.10, rgb: [26,  11,  59], alpha: 0.50 },
    { orbitR: W*0.13,  baseAngle: 0,       orbitSpeed:  2.4e-4, gradR: s * 0.70, rgb: [76,  29, 149], alpha: 0.35 },
    { orbitR: W*0.10,  baseAngle: τ*0.25,  orbitSpeed: -1.7e-4, gradR: s * 0.55, rgb: [124, 58, 237], alpha: 0.25 },
    { orbitR: W*0.08,  baseAngle: τ*0.50,  orbitSpeed:  3.0e-4, gradR: s * 0.42, rgb: [219, 39, 119], alpha: 0.18 },
    { orbitR: W*0.14,  baseAngle: τ*0.75,  orbitSpeed: -2.1e-4, gradR: s * 0.40, rgb: [13, 148, 136], alpha: 0.16 },
    { orbitR: W*0.07,  baseAngle: τ*0.375, orbitSpeed:  3.8e-4, gradR: s * 0.28, rgb: [236, 72, 153], alpha: 0.13 },
  ]
}

function buildPlanets() {
  const s = Math.min(W, H)
  planets = [
    // Gas giant with rings — lower right
    {
      cx: W * 0.82, cy: H * 0.68, r: s * 0.075,
      ampX: 18, ampY: 12, freqX: 1.8e-4, freqY: 1.3e-4, phase: 0,
      rotOffset: 0,        rotSpeed: 2.5e-5, type: 'gas',
    },
    // Glowing ocean world — upper left
    {
      cx: W * 0.10, cy: H * 0.22, r: s * 0.040,
      ampX: 12, ampY: 16, freqX: 1.5e-4, freqY: 2.0e-4, phase: Math.PI,
      rotOffset: 1.0,      rotSpeed: 4.0e-5, type: 'glow',
    },
    // Ice/crystal planet — upper mid-right
    {
      cx: W * 0.68, cy: H * 0.12, r: s * 0.022,
      ampX: 8,  ampY: 7,  freqX: 2.2e-4, freqY: 1.8e-4, phase: 1.9,
      rotOffset: 2.0,      rotSpeed: 3.5e-5, type: 'ice',
    },
  ]
}

// ─── Draw: background ─────────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, W * 0.5, H)
  g.addColorStop(0, '#030012')
  g.addColorStop(0.6, '#07001c')
  g.addColorStop(1,   '#04000f')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

// ─── Draw: nebula ─────────────────────────────────────────────────────────────

function drawNebula(ctx: CanvasRenderingContext2D, ts: number) {
  // Nebula centre sits left-of-centre, above mid-screen
  const cx = W * 0.35, cy = H * 0.38

  ctx.save()
  ctx.globalCompositeOperation = 'screen'

  for (const b of blobs) {
    const angle = b.baseAngle + ts * b.orbitSpeed
    const bx = cx + Math.cos(angle) * b.orbitR
    const by = cy + Math.sin(angle) * b.orbitR * 0.55  // flatten orbit slightly

    const g = ctx.createRadialGradient(bx, by, 0, bx, by, b.gradR)
    const [r, gr, bl] = b.rgb
    g.addColorStop(0,    `rgba(${r},${gr},${bl},${b.alpha})`)
    g.addColorStop(0.45, `rgba(${r},${gr},${bl},${b.alpha * 0.32})`)
    g.addColorStop(1,    `rgba(${r},${gr},${bl},0)`)

    ctx.beginPath()
    ctx.arc(bx, by, b.gradR, 0, τ)
    ctx.fillStyle = g
    ctx.fill()
  }

  ctx.restore()
}

// ─── Draw: stars ─────────────────────────────────────────────────────────────

function drawStars(ctx: CanvasRenderingContext2D) {
  for (const s of stars) {
    // Drift
    s.x += s.dx
    s.y += s.dy
    if (s.x < -2)  s.x = W + 2
    if (s.x > W+2) s.x = -2
    if (s.y > H+2) s.y = -2   // wrap bottom → top (dy always +ve)

    // Twinkle
    let a = 0.5 + 0.15 * s.layer
    if (s.twinkle) {
      s.phase += s.speed * 0.016
      a = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(s.phase))
    }

    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, τ)
    ctx.fillStyle = `rgba(215,220,255,${a.toFixed(2)})`
    ctx.fill()

    // Subtle 4-point cross flare for the brightest near stars
    if (s.layer === 2 && s.r > 1.65 && a > 0.72) {
      ctx.save()
      ctx.globalAlpha = a * 0.20
      ctx.strokeStyle = '#bcc8ff'
      ctx.lineWidth = 0.5
      const l = s.r * 4.5
      ctx.beginPath()
      ctx.moveTo(s.x - l, s.y); ctx.lineTo(s.x + l, s.y)
      ctx.moveTo(s.x, s.y - l); ctx.lineTo(s.x, s.y + l)
      ctx.stroke()
      ctx.restore()
    }
  }
}

// ─── Draw: planets ────────────────────────────────────────────────────────────

// Band helper: draws horizontally-scrolling surface bands inside a clipped circle
function drawBands(ctx: CanvasRenderingContext2D, r: number, rot: number, bands: [string, number][], factor: number, alpha: number) {
  ctx.save()
  ctx.beginPath(); ctx.arc(0, 0, r, 0, τ); ctx.clip()
  ctx.globalAlpha = alpha
  const off = (rot * r * factor) % (r * 2)
  for (const [col, frac] of bands) {
    const by = -r + frac * r * 2
    const h  = r * 0.17
    ctx.fillStyle = col
    // Two copies to ensure seamless wrap
    ctx.fillRect(off - r * 3,         by, r * 6, h)
    ctx.fillRect(off - r * 3 - r * 2, by, r * 6, h)
  }
  ctx.restore()
}

// Ring helper: draws one half-ellipse (back = upper half, front = lower half)
function drawRingHalf(ctx: CanvasRenderingContext2D, r: number, front: boolean, outer: boolean) {
  const start = front ? 0         : Math.PI
  const end   = front ? Math.PI   : τ
  const radius = outer ? r * 1.88 : r * 1.52
  const width  = outer ? r * 0.26 : r * 0.14
  const color  = outer
    ? (front ? 'rgba(200,143,68,0.48)' : 'rgba(195,138,62,0.38)')
    : (front ? 'rgba(160,108,48,0.36)' : 'rgba(155,105,42,0.28)')

  ctx.lineWidth = width
  ctx.strokeStyle = color
  ctx.beginPath()
  ctx.arc(0, 0, radius, start, end)
  ctx.stroke()
}

function drawGasPlanet(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  ctx.save()
  ctx.translate(x, y)

  // Atmosphere halo
  const atmo = ctx.createRadialGradient(0, 0, r * 0.88, 0, 0, r * 1.55)
  atmo.addColorStop(0,   'rgba(180,70,15,0)')
  atmo.addColorStop(0.5, 'rgba(180,70,15,0.10)')
  atmo.addColorStop(1,   'rgba(180,70,15,0)')
  ctx.beginPath(); ctx.arc(0, 0, r * 1.55, 0, τ)
  ctx.fillStyle = atmo; ctx.fill()

  // Back ring half (upper ellipse arc — visually behind the planet)
  ctx.save(); ctx.scale(1, 0.30)
  drawRingHalf(ctx, r, false, true)
  drawRingHalf(ctx, r, false, false)
  ctx.restore()

  // Planet sphere
  const sphere = ctx.createRadialGradient(-r*0.30, -r*0.30, 0, 0, 0, r)
  sphere.addColorStop(0,    '#fcd34d')
  sphere.addColorStop(0.15, '#b45309')
  sphere.addColorStop(0.55, '#78250e')
  sphere.addColorStop(0.85, '#3d1206')
  sphere.addColorStop(1,    '#180600')
  ctx.beginPath(); ctx.arc(0, 0, r, 0, τ)
  ctx.fillStyle = sphere; ctx.fill()

  // Gas bands
  drawBands(ctx, r, rot, [
    ['rgba(252,211, 77,0.85)', 0.05], ['rgba(220, 80, 18,1.00)', 0.20],
    ['rgba(252,211, 77,0.70)', 0.35], ['rgba(186, 60, 10,0.90)', 0.50],
    ['rgba(254,230,170,0.50)', 0.65], ['rgba(215, 88, 22,0.80)', 0.80],
    ['rgba(252,211, 77,0.60)', 0.92],
  ], 0.5, 0.18)

  // Specular highlight
  const spec = ctx.createRadialGradient(-r*0.35, -r*0.35, 0, -r*0.35, -r*0.35, r*0.62)
  spec.addColorStop(0, 'rgba(255,255,255,0.26)'); spec.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.beginPath(); ctx.arc(0, 0, r, 0, τ); ctx.fillStyle = spec; ctx.fill()

  // Front ring half (lower ellipse arc — in front of planet)
  ctx.save(); ctx.scale(1, 0.30)
  drawRingHalf(ctx, r, true, true)
  drawRingHalf(ctx, r, true, false)
  ctx.restore()

  ctx.restore()
}

function drawGlowPlanet(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  ctx.save()
  ctx.translate(x, y)

  // Wide corona glow
  const corona = ctx.createRadialGradient(0, 0, r * 0.55, 0, 0, r * 2.4)
  corona.addColorStop(0,   'rgba(6,182,212,0.28)')
  corona.addColorStop(0.5, 'rgba(6,182,212,0.10)')
  corona.addColorStop(1,   'rgba(6,182,212,0)')
  ctx.beginPath(); ctx.arc(0, 0, r * 2.4, 0, τ)
  ctx.fillStyle = corona; ctx.fill()

  // Planet body
  const body = ctx.createRadialGradient(-r*0.30, -r*0.30, 0, 0, 0, r)
  body.addColorStop(0,    '#e0f7ff')
  body.addColorStop(0.20, '#38bdf8')
  body.addColorStop(0.55, '#0369a1')
  body.addColorStop(0.85, '#023f6b')
  body.addColorStop(1,    '#031b2e')
  ctx.beginPath(); ctx.arc(0, 0, r, 0, τ)
  ctx.fillStyle = body; ctx.fill()

  // Cloud bands
  drawBands(ctx, r, rot, [
    ['rgba(186,230,255,0.9)', 0.12], ['rgba(186,230,255,0.7)', 0.35],
    ['rgba(186,230,255,0.8)', 0.58], ['rgba(186,230,255,0.6)', 0.80],
  ], 0.75, 0.14)

  // Specular
  const spec = ctx.createRadialGradient(-r*0.38, -r*0.38, 0, -r*0.38, -r*0.38, r*0.55)
  spec.addColorStop(0, 'rgba(255,255,255,0.42)'); spec.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.beginPath(); ctx.arc(0, 0, r, 0, τ); ctx.fillStyle = spec; ctx.fill()

  ctx.restore()
}

function drawIcePlanet(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  ctx.save()
  ctx.translate(x, y)

  // Purple haze
  const haze = ctx.createRadialGradient(0, 0, r * 0.72, 0, 0, r * 2.1)
  haze.addColorStop(0,   'rgba(139,92,246,0.22)')
  haze.addColorStop(0.6, 'rgba(139,92,246,0.08)')
  haze.addColorStop(1,   'rgba(139,92,246,0)')
  ctx.beginPath(); ctx.arc(0, 0, r * 2.1, 0, τ)
  ctx.fillStyle = haze; ctx.fill()

  // Planet body
  const body = ctx.createRadialGradient(-r*0.28, -r*0.28, 0, 0, 0, r)
  body.addColorStop(0,    '#ddd6fe')
  body.addColorStop(0.30, '#8b5cf6')
  body.addColorStop(0.72, '#4c1d95')
  body.addColorStop(1,    '#180a38')
  ctx.beginPath(); ctx.arc(0, 0, r, 0, τ)
  ctx.fillStyle = body; ctx.fill()

  // Surface bands
  drawBands(ctx, r, rot, [
    ['rgba(196,181,253,0.9)', 0.22], ['rgba(196,181,253,0.7)', 0.48],
    ['rgba(196,181,253,0.8)', 0.72],
  ], 0.55, 0.17)

  // Specular
  const spec = ctx.createRadialGradient(-r*0.32, -r*0.32, 0, -r*0.32, -r*0.32, r*0.50)
  spec.addColorStop(0, 'rgba(255,255,255,0.36)'); spec.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.beginPath(); ctx.arc(0, 0, r, 0, τ); ctx.fillStyle = spec; ctx.fill()

  ctx.restore()
}

function drawPlanets(ctx: CanvasRenderingContext2D, ts: number) {
  for (const p of planets) {
    const px  = p.cx + Math.cos(ts * p.freqX + p.phase) * p.ampX
    const py  = p.cy + Math.sin(ts * p.freqY + p.phase) * p.ampY
    const rot = p.rotOffset + ts * p.rotSpeed

    if      (p.type === 'gas' ) drawGasPlanet (ctx, px, py, p.r, rot)
    else if (p.type === 'glow') drawGlowPlanet(ctx, px, py, p.r, rot)
    else                        drawIcePlanet (ctx, px, py, p.r, rot)
  }
}

// ─── RAF loop ─────────────────────────────────────────────────────────────────

function frame(ts: number) {
  raf = requestAnimationFrame(frame)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, W, H)
  drawBackground(ctx)
  drawNebula(ctx, ts)
  drawStars(ctx)
  drawPlanets(ctx, ts)
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

const onResize = () => setup()

onMounted(() => {
  setup()
  raf = requestAnimationFrame(frame)
  window.addEventListener('resize', onResize, { passive: true })
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <canvas ref="canvasEl" class="fixed inset-0 z-0 block" />
</template>
