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

interface GParticle {
  r: number; θ: number; size: number
  color: string // pre-computed rgba, avoids per-frame string alloc
}

// ─── State ────────────────────────────────────────────────────────────────────

const canvasEl = ref<HTMLCanvasElement | null>(null)
let raf = 0
let W = 0, H = 0
const τ = Math.PI * 2

let stars: Star[]      = []
let blobs: Blob[]      = []
let planets: Planet[]  = []
let gParticles: GParticle[] = []

const rnd = (a: number, b: number) => a + Math.random() * (b - a)

// ─── Init ─────────────────────────────────────────────────────────────────────

function setup() {
  if (!canvasEl.value) return
  W = canvasEl.value.width  = window.innerWidth
  H = canvasEl.value.height = window.innerHeight
  buildStars()
  buildBlobs()
  buildPlanets()
  buildGalaxy()
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
        r: rnd(rMin, rMax), layer,
        twinkle: Math.random() < twChance,
        phase: rnd(0, τ), speed: rnd(0.6, 2.5),
        dx: rnd(-0.005, 0.005), dy: rnd(dyMin, dyMax),
      })
    }
  })
}

function buildBlobs() {
  const s = Math.min(W, H)
  blobs = [
    { orbitR: 0,       baseAngle: 0,       orbitSpeed:  1.4e-4, gradR: s*1.10, rgb: [26,  11,  59], alpha: 0.50 },
    { orbitR: W*0.13,  baseAngle: 0,       orbitSpeed:  2.4e-4, gradR: s*0.70, rgb: [76,  29, 149], alpha: 0.35 },
    { orbitR: W*0.10,  baseAngle: τ*0.25,  orbitSpeed: -1.7e-4, gradR: s*0.55, rgb: [124, 58, 237], alpha: 0.25 },
    { orbitR: W*0.08,  baseAngle: τ*0.50,  orbitSpeed:  3.0e-4, gradR: s*0.42, rgb: [219, 39, 119], alpha: 0.18 },
    { orbitR: W*0.14,  baseAngle: τ*0.75,  orbitSpeed: -2.1e-4, gradR: s*0.40, rgb: [13, 148, 136], alpha: 0.16 },
    { orbitR: W*0.07,  baseAngle: τ*0.375, orbitSpeed:  3.8e-4, gradR: s*0.28, rgb: [236, 72, 153], alpha: 0.13 },
  ]
}

function buildPlanets() {
  const s = Math.min(W, H)
  planets = [
    // Gas giant with rings — lower right, rotates visibly
    { cx: W*0.82, cy: H*0.68, r: s*0.075, ampX: 18, ampY: 12, freqX: 1.8e-4, freqY: 1.3e-4, phase: 0,        rotOffset: 0,   rotSpeed: 1.4e-4, type: 'gas'  },
    // Ocean world — upper left
    { cx: W*0.10, cy: H*0.22, r: s*0.040, ampX: 12, ampY: 16, freqX: 1.5e-4, freqY: 2.0e-4, phase: Math.PI,  rotOffset: 1.0, rotSpeed: 1.9e-4, type: 'glow' },
    // Ice planet — upper mid-right
    { cx: W*0.68, cy: H*0.12, r: s*0.022, ampX: 8,  ampY: 7,  freqX: 2.2e-4, freqY: 1.8e-4, phase: 1.9,      rotOffset: 2.0, rotSpeed: 1.6e-4, type: 'ice'  },
  ]
}

function buildGalaxy() {
  gParticles = []
  const PER_ARM = 360

  // Core bulge — warm yellow-white
  for (let i = 0; i < 110; i++) {
    const r = Math.pow(Math.random(), 2) * 0.22
    const a = rnd(0.55, 0.92)
    gParticles.push({ r, θ: rnd(0, τ), size: rnd(0.4, 1.4), color: `rgba(255,228,168,${a.toFixed(2)})` })
  }

  // Two logarithmic spiral arms
  for (let arm = 0; arm < 2; arm++) {
    const offset = (τ / 2) * arm
    for (let i = 0; i < PER_ARM; i++) {
      const t  = i / PER_ARM
      const r  = 0.14 + t * 0.86
      // Logarithmic spiral angle grows with log(r)
      const θ  = offset + Math.log(r * 4 + 1) * 3.8 + rnd(-0.4, 0.4) * (0.12 + t * 0.88)
      const a  = (rnd(0.25, 0.88) * (1 - t * 0.65)).toFixed(2)
      const sz = rnd(0.3, 1.1) * (1 - t * 0.45)
      // Colour: warm near core → blue-purple at arms → blue at tips
      let col: string
      if      (r < 0.32) col = `rgba(222,185,130,${a})`
      else if (r < 0.60) col = `rgba(175,158,225,${a})`
      else               col = `rgba(135,175,255,${a})`
      gParticles.push({ r, θ, size: sz, color: col })
    }
  }

  // Extra scatter halo around arms
  for (let i = 0; i < 80; i++) {
    const r = rnd(0.25, 0.90)
    const a = (rnd(0.05, 0.22)).toFixed(2)
    gParticles.push({ r, θ: rnd(0, τ), size: rnd(0.2, 0.7), color: `rgba(160,150,240,${a})` })
  }
}

// ─── Draw: background ─────────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, W * 0.5, H)
  g.addColorStop(0,   '#030012')
  g.addColorStop(0.6, '#07001c')
  g.addColorStop(1,   '#04000f')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

// ─── Draw: galaxy ─────────────────────────────────────────────────────────────

function drawGalaxy(ctx: CanvasRenderingContext2D, ts: number) {
  const cx    = W * 0.58
  const cy    = H * 0.42
  const scale = Math.min(W, H) * 0.18
  const rot   = ts * 4.5e-5  // slow majestic rotation

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rot)
  ctx.scale(1, 0.36)  // tilt — face-on spiral seen at ~21° from edge

  // Outer diffuse disk glow
  const disk = ctx.createRadialGradient(0, 0, 0, 0, 0, scale * 1.15)
  disk.addColorStop(0,   'rgba(100, 60, 180, 0.13)')
  disk.addColorStop(0.5, 'rgba( 60, 40, 120, 0.06)')
  disk.addColorStop(1,   'rgba( 20,  5,  50, 0)')
  ctx.beginPath(); ctx.arc(0, 0, scale * 1.15, 0, τ)
  ctx.fillStyle = disk; ctx.fill()

  // Particles (pre-computed positions in polar → Cartesian)
  for (const p of gParticles) {
    const px = Math.cos(p.θ) * p.r * scale
    const py = Math.sin(p.θ) * p.r * scale
    ctx.beginPath(); ctx.arc(px, py, p.size, 0, τ)
    ctx.fillStyle = p.color; ctx.fill()
  }

  // Bright galactic core
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, scale * 0.22)
  core.addColorStop(0,    'rgba(255,242,178,0.96)')
  core.addColorStop(0.30, 'rgba(215,140, 75,0.58)')
  core.addColorStop(0.65, 'rgba( 90, 50,160,0.22)')
  core.addColorStop(1,    'rgba( 40, 15, 80,0)')
  ctx.beginPath(); ctx.arc(0, 0, scale * 0.22, 0, τ)
  ctx.fillStyle = core; ctx.fill()

  ctx.restore()
}

// ─── Draw: nebula ─────────────────────────────────────────────────────────────

function drawNebula(ctx: CanvasRenderingContext2D, ts: number) {
  const cx = W * 0.35, cy = H * 0.38
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  for (const b of blobs) {
    const angle = b.baseAngle + ts * b.orbitSpeed
    const bx = cx + Math.cos(angle) * b.orbitR
    const by = cy + Math.sin(angle) * b.orbitR * 0.55
    const g  = ctx.createRadialGradient(bx, by, 0, bx, by, b.gradR)
    const [r, gr, bl] = b.rgb
    g.addColorStop(0,    `rgba(${r},${gr},${bl},${b.alpha})`)
    g.addColorStop(0.45, `rgba(${r},${gr},${bl},${b.alpha * 0.32})`)
    g.addColorStop(1,    `rgba(${r},${gr},${bl},0)`)
    ctx.beginPath(); ctx.arc(bx, by, b.gradR, 0, τ)
    ctx.fillStyle = g; ctx.fill()
  }
  ctx.restore()
}

// ─── Draw: stars ─────────────────────────────────────────────────────────────

function drawStars(ctx: CanvasRenderingContext2D) {
  for (const s of stars) {
    s.x += s.dx
    s.y += s.dy
    if (s.x < -2)  s.x = W + 2
    if (s.x > W+2) s.x = -2
    if (s.y > H+2) s.y = -2

    let a = 0.5 + 0.15 * s.layer
    if (s.twinkle) {
      s.phase += s.speed * 0.016
      a = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(s.phase))
    }
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, τ)
    ctx.fillStyle = `rgba(215,220,255,${a.toFixed(2)})`
    ctx.fill()

    // 4-point cross flare for large bright stars
    if (s.layer === 2 && s.r > 1.65 && a > 0.72) {
      ctx.save()
      ctx.globalAlpha = a * 0.20
      ctx.strokeStyle = '#bcc8ff'
      ctx.lineWidth   = 0.5
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

function drawRingHalf(ctx: CanvasRenderingContext2D, r: number, front: boolean, outer: boolean) {
  ctx.lineWidth  = outer ? r * 0.26 : r * 0.14
  ctx.strokeStyle = outer
    ? (front ? 'rgba(200,143,68,0.48)' : 'rgba(195,138,62,0.38)')
    : (front ? 'rgba(160,108,48,0.36)' : 'rgba(155,105,42,0.28)')
  ctx.beginPath()
  ctx.arc(0, 0, outer ? r * 1.88 : r * 1.52, front ? 0 : Math.PI, front ? Math.PI : τ)
  ctx.stroke()
}

function drawNightSide(ctx: CanvasRenderingContext2D, r: number) {
  // Consistent terminator shadow (fixed light source, upper-left)
  const sh = ctx.createRadialGradient(r*0.42, r*0.32, 0, r*0.42, r*0.32, r*1.15)
  sh.addColorStop(0,   'rgba(0,0,8,0.60)')
  sh.addColorStop(0.45,'rgba(0,0,8,0.28)')
  sh.addColorStop(1,   'rgba(0,0,8,0)')
  ctx.beginPath(); ctx.arc(0, 0, r, 0, τ); ctx.fillStyle = sh; ctx.fill()
}

// Gas giant: horizontal scrolling bands + orbiting Great Red Spot
function drawGasPlanet(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  ctx.save()
  ctx.translate(x, y)

  // Atmosphere halo
  const atmo = ctx.createRadialGradient(0, 0, r*0.88, 0, 0, r*1.55)
  atmo.addColorStop(0,   'rgba(180,70,15,0)')
  atmo.addColorStop(0.5, 'rgba(180,70,15,0.12)')
  atmo.addColorStop(1,   'rgba(180,70,15,0)')
  ctx.beginPath(); ctx.arc(0, 0, r*1.55, 0, τ); ctx.fillStyle = atmo; ctx.fill()

  // Back ring half
  ctx.save(); ctx.scale(1, 0.30)
  drawRingHalf(ctx, r, false, true); drawRingHalf(ctx, r, false, false)
  ctx.restore()

  // Base sphere
  const sphere = ctx.createRadialGradient(-r*0.30, -r*0.30, 0, 0, 0, r)
  sphere.addColorStop(0,    '#fcd34d')
  sphere.addColorStop(0.15, '#b45309')
  sphere.addColorStop(0.55, '#78250e')
  sphere.addColorStop(0.85, '#3d1206')
  sphere.addColorStop(1,    '#180600')
  ctx.beginPath(); ctx.arc(0, 0, r, 0, τ); ctx.fillStyle = sphere; ctx.fill()

  // ── Rotating surface (clipped) ──────────────────────────────────────
  ctx.save()
  ctx.beginPath(); ctx.arc(0, 0, r, 0, τ); ctx.clip()

  // Scrolling bands
  const off = (rot * r * 0.5) % (r * 2)
  ctx.globalAlpha = 0.42
  ;[
    ['rgba(252,211,77,0.80)',  0.05], ['rgba(220,80,18,1.00)',  0.18],
    ['rgba(252,211,77,0.70)',  0.31], ['rgba(186,60,10,0.95)',  0.46],
    ['rgba(254,230,170,0.60)', 0.61], ['rgba(215,88,22,0.85)', 0.76],
    ['rgba(252,211,77,0.65)',  0.90],
  ].forEach(([col, frac]) => {
    const by = -r + (frac as number) * r * 2
    ctx.fillStyle = col as string
    ctx.fillRect(off - r*3, by, r*6, r*0.17)
    ctx.fillRect(off - r*3 - r*2, by, r*6, r*0.17)
  })
  ctx.globalAlpha = 1

  // Great Red Spot — orbits the equator with the surface rotation
  ctx.save()
  ctx.rotate(rot * 0.88)          // slightly slower differential rotation
  ctx.translate(r * 0.42, 0)      // fixed equatorial position
  ctx.scale(1.75, 0.85)
  const storm = ctx.createRadialGradient(0, 0, 0, 0, 0, r*0.21)
  storm.addColorStop(0,    'rgba(255,105,20,0.96)')
  storm.addColorStop(0.40, 'rgba(205,62,10,0.72)')
  storm.addColorStop(1,    'rgba(165,40,5,0)')
  ctx.beginPath(); ctx.arc(0, 0, r*0.21, 0, τ); ctx.fillStyle = storm; ctx.fill()
  ctx.restore()

  ctx.restore() // end clip
  // ──────────────────────────────────────────────────────────────────────

  // Specular (fixed light source)
  const spec = ctx.createRadialGradient(-r*0.35, -r*0.35, 0, -r*0.35, -r*0.35, r*0.62)
  spec.addColorStop(0, 'rgba(255,255,255,0.28)'); spec.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.beginPath(); ctx.arc(0, 0, r, 0, τ); ctx.fillStyle = spec; ctx.fill()

  drawNightSide(ctx, r)

  // Front ring half
  ctx.save(); ctx.scale(1, 0.30)
  drawRingHalf(ctx, r, true, true); drawRingHalf(ctx, r, true, false)
  ctx.restore()

  ctx.restore()
}

// Ocean world: rotating continents beneath faster-moving cloud bands
function drawGlowPlanet(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  ctx.save()
  ctx.translate(x, y)

  // Corona glow
  const corona = ctx.createRadialGradient(0, 0, r*0.55, 0, 0, r*2.4)
  corona.addColorStop(0,   'rgba(6,182,212,0.32)')
  corona.addColorStop(0.5, 'rgba(6,182,212,0.12)')
  corona.addColorStop(1,   'rgba(6,182,212,0)')
  ctx.beginPath(); ctx.arc(0, 0, r*2.4, 0, τ); ctx.fillStyle = corona; ctx.fill()

  // Base sphere
  const body = ctx.createRadialGradient(-r*0.30, -r*0.30, 0, 0, 0, r)
  body.addColorStop(0,    '#e0f7ff')
  body.addColorStop(0.20, '#38bdf8')
  body.addColorStop(0.55, '#0369a1')
  body.addColorStop(0.85, '#023f6b')
  body.addColorStop(1,    '#031b2e')
  ctx.beginPath(); ctx.arc(0, 0, r, 0, τ); ctx.fillStyle = body; ctx.fill()

  // ── Rotating surface (clipped) ──────────────────────────────────────
  ctx.save()
  ctx.beginPath(); ctx.arc(0, 0, r, 0, τ); ctx.clip()

  // Continents (rotate with planet)
  ctx.rotate(rot)
  ctx.fillStyle = 'rgba(22,101,52,0.58)'
  ctx.beginPath(); ctx.ellipse( r*0.22, -r*0.08, r*0.28, r*0.17, 0.5, 0, τ); ctx.fill()
  ctx.beginPath(); ctx.ellipse(-r*0.28,  r*0.18, r*0.16, r*0.10, -0.4, 0, τ); ctx.fill()
  ctx.beginPath(); ctx.ellipse( r*0.04,  r*0.30, r*0.12, r*0.08,  0.2, 0, τ); ctx.fill()

  // Cloud bands (slightly faster than surface → undo surface rotation, apply faster offset)
  ctx.rotate(-rot)
  const off = (rot * r * 0.75 * 1.35) % (r * 2)
  ctx.globalAlpha = 0.24
  ;[
    ['rgba(186,230,255,0.95)', 0.10],
    ['rgba(186,230,255,0.78)', 0.38],
    ['rgba(186,230,255,0.88)', 0.60],
    ['rgba(186,230,255,0.68)', 0.82],
  ].forEach(([col, frac]) => {
    const by = -r + (frac as number) * r * 2
    ctx.fillStyle = col as string
    ctx.fillRect(off - r*3, by, r*6, r*0.15)
    ctx.fillRect(off - r*3 - r*2, by, r*6, r*0.15)
  })
  ctx.globalAlpha = 1

  ctx.restore() // end clip
  // ──────────────────────────────────────────────────────────────────────

  const spec = ctx.createRadialGradient(-r*0.38, -r*0.38, 0, -r*0.38, -r*0.38, r*0.55)
  spec.addColorStop(0, 'rgba(255,255,255,0.46)'); spec.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.beginPath(); ctx.arc(0, 0, r, 0, τ); ctx.fillStyle = spec; ctx.fill()

  drawNightSide(ctx, r)
  ctx.restore()
}

// Ice/crystal planet: rotating polar cap + crystal cracks + subtle bands
function drawIcePlanet(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  ctx.save()
  ctx.translate(x, y)

  // Haze
  const haze = ctx.createRadialGradient(0, 0, r*0.72, 0, 0, r*2.1)
  haze.addColorStop(0,   'rgba(139,92,246,0.26)')
  haze.addColorStop(0.6, 'rgba(139,92,246,0.09)')
  haze.addColorStop(1,   'rgba(139,92,246,0)')
  ctx.beginPath(); ctx.arc(0, 0, r*2.1, 0, τ); ctx.fillStyle = haze; ctx.fill()

  // Base sphere
  const body = ctx.createRadialGradient(-r*0.28, -r*0.28, 0, 0, 0, r)
  body.addColorStop(0,    '#ddd6fe')
  body.addColorStop(0.30, '#8b5cf6')
  body.addColorStop(0.72, '#4c1d95')
  body.addColorStop(1,    '#180a38')
  ctx.beginPath(); ctx.arc(0, 0, r, 0, τ); ctx.fillStyle = body; ctx.fill()

  // ── Rotating surface (clipped) ──────────────────────────────────────
  ctx.save()
  ctx.beginPath(); ctx.arc(0, 0, r, 0, τ); ctx.clip()
  ctx.rotate(rot)

  // Polar ice cap
  const iceCap = ctx.createRadialGradient(0, -r*0.70, 0, 0, -r*0.70, r*0.50)
  iceCap.addColorStop(0,    'rgba(228,218,255,0.90)')
  iceCap.addColorStop(0.55, 'rgba(195,175,245,0.42)')
  iceCap.addColorStop(1,    'rgba(165,145,228,0)')
  ctx.fillStyle = iceCap
  ctx.beginPath(); ctx.arc(0, -r*0.70, r*0.50, 0, τ); ctx.fill()

  // Crystal cracks (in planet-space, rotate with surface)
  ctx.strokeStyle = 'rgba(200,188,255,0.38)'
  ctx.lineWidth   = 0.7
  ;[
    [[-r*0.05, -r*0.15],  [ r*0.30,  r*0.25]],
    [[ r*0.18, -r*0.22], [-r*0.22,  r*0.32]],
    [[-r*0.32,  r*0.05],  [ r*0.12,  r*0.36]],
  ].forEach(([[x1, y1], [x2, y2]]) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
  })

  // Atmospheric bands (undo surface rotation so they scroll horizontally)
  ctx.rotate(-rot)
  const off = (rot * r * 0.55) % (r * 2)
  ctx.globalAlpha = 0.22
  ;[
    ['rgba(196,181,253,0.95)', 0.22],
    ['rgba(196,181,253,0.82)', 0.50],
    ['rgba(196,181,253,0.88)', 0.76],
  ].forEach(([col, frac]) => {
    const by = -r + (frac as number) * r * 2
    ctx.fillStyle = col as string
    ctx.fillRect(off - r*3, by, r*6, r*0.14)
    ctx.fillRect(off - r*3 - r*2, by, r*6, r*0.14)
  })
  ctx.globalAlpha = 1

  ctx.restore() // end clip
  // ──────────────────────────────────────────────────────────────────────

  const spec = ctx.createRadialGradient(-r*0.32, -r*0.32, 0, -r*0.32, -r*0.32, r*0.50)
  spec.addColorStop(0, 'rgba(255,255,255,0.42)'); spec.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.beginPath(); ctx.arc(0, 0, r, 0, τ); ctx.fillStyle = spec; ctx.fill()

  drawNightSide(ctx, r)
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
  drawGalaxy(ctx, ts)   // galaxy behind nebula so nebula 'screen' blend lightens it naturally
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
