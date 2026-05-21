<script setup lang="ts">
// ─── Types ────────────────────────────────────────────────────────────────────

interface Star {
  x: number; y: number; r: number
  baseAlpha: number; phase: number; speed: number
  rgb: [number, number, number]
}

interface Shooting {
  x: number; y: number; vx: number; vy: number
  len: number; alpha: number; active: boolean
}

interface Moon {
  orbitR: number; speed: number; startAngle: number; r: number
}

interface PlanetDef {
  a: number             // semi-major axis (px at scale=1)
  speed: number         // orbital speed rad/ms
  startAngle: number
  r: number             // planet radius (px at scale=1)
  rotSpeed: number      // surface rotation rad/ms
  rotOffset: number
  type: 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'ice'
  moon?: Moon
}

interface Asteroid {
  angle: number; orbitR: number; speed: number; size: number; alpha: number
}

// ─── State ────────────────────────────────────────────────────────────────────

const canvasEl = ref<HTMLCanvasElement | null>(null)
let raf = 0
let W = 0, H = 0
const τ = Math.PI * 2
const TILT = 0.40          // orbit y-scale (perspective tilt)

let SX = 0, SY = 0        // sun screen position
let sc = 1                 // solar scale

let stars: Star[]      = []
let planets: PlanetDef[] = []
let asteroids: Asteroid[] = []
let tick = 0
const shooting: Shooting = { x:0,y:0,vx:0,vy:0,len:0,alpha:0,active:false }
let lastShot = 0

const rnd = (a: number, b: number) => a + Math.random() * (b - a)

// ─── Init ─────────────────────────────────────────────────────────────────────

function setup() {
  if (!canvasEl.value) return
  W = canvasEl.value.width  = window.innerWidth
  H = canvasEl.value.height = window.innerHeight
  SX = W * 0.50
  SY = H * 0.52
  sc = Math.min(W, H) / 1100
  buildStars()
  buildPlanets()
  buildAsteroids()
}

function buildStars() {
  stars = []
  const color = (): [number, number, number] => {
    const r = Math.random()
    if (r < 0.12) return [100, 200, 255]
    if (r < 0.22) return [180, 110, 255]
    return [220, 230, 255]
  }
  for (let i = 0; i < 280; i++) {
    const t = Math.random()
    const r = t < 0.65 ? rnd(0.2, 0.7) : t < 0.92 ? rnd(0.7, 1.3) : rnd(1.3, 2.2)
    stars.push({ x: rnd(0,W), y: rnd(0,H), r, baseAlpha: rnd(0.3,0.85), phase: rnd(0,τ), speed: rnd(0.004,0.012), rgb: color() })
  }
}

function buildPlanets() {
  planets = [
    // Mercury — tiny hot gray rock, fastest orbit
    { a:85,  speed:5.0e-4, startAngle:0.5,  r:4.0,  rotSpeed:1.8e-4, rotOffset:0,   type:'mercury' },
    // Venus — medium cloud-shrouded world
    { a:138, speed:3.1e-4, startAngle:2.1,  r:7.0,  rotSpeed:1.2e-4, rotOffset:1.0, type:'venus'   },
    // Earth — blue marble with moon
    { a:198, speed:2.1e-4, startAngle:1.2,  r:8.0,  rotSpeed:2.8e-4, rotOffset:0.8, type:'earth',
      moon: { orbitR:20, speed:1.9e-3, startAngle:0.4, r:2.2 } },
    // Mars — red desert world with polar cap
    { a:258, speed:1.5e-4, startAngle:3.8,  r:5.5,  rotSpeed:2.7e-4, rotOffset:2.0, type:'mars'    },
    // Jupiter — massive banded gas giant + Great Red Spot
    { a:370, speed:6.5e-5, startAngle:0.9,  r:23.0, rotSpeed:4.5e-4, rotOffset:0.5, type:'jupiter' },
    // Saturn — ringed gas giant
    { a:468, speed:4.0e-5, startAngle:2.8,  r:17.0, rotSpeed:3.8e-4, rotOffset:1.5, type:'saturn'  },
    // Ice giant (Neptune-like) — deep blue
    { a:555, speed:2.2e-5, startAngle:4.5,  r:12.0, rotSpeed:2.0e-4, rotOffset:3.0, type:'ice'     },
  ]
}

function buildAsteroids() {
  asteroids = []
  for (let i = 0; i < 130; i++) {
    asteroids.push({
      angle:  rnd(0, τ),
      orbitR: rnd(308, 332),
      speed:  rnd(8e-5, 1.5e-4),
      size:   rnd(0.5, 1.5),
      alpha:  rnd(0.18, 0.52),
    })
  }
}

// ─── Background + stars ───────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, W, H)
}

function drawStars(ctx: CanvasRenderingContext2D) {
  tick += 0.016
  for (const s of stars) {
    const a = Math.max(0, Math.min(1, s.baseAlpha * (0.55 + 0.45 * Math.sin(tick * s.speed * 500 + s.phase))))
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, τ)
    ctx.fillStyle = `rgba(${s.rgb[0]},${s.rgb[1]},${s.rgb[2]},${a.toFixed(2)})`
    ctx.fill()
  }
}

function updateShooting(ctx: CanvasRenderingContext2D) {
  if (shooting.active) {
    const g = ctx.createLinearGradient(
      shooting.x - shooting.vx * shooting.len / 8,
      shooting.y - shooting.vy * shooting.len / 8,
      shooting.x, shooting.y,
    )
    g.addColorStop(0, 'rgba(200,230,255,0)')
    g.addColorStop(1, `rgba(200,230,255,${shooting.alpha.toFixed(2)})`)
    ctx.beginPath()
    ctx.moveTo(shooting.x - shooting.vx * shooting.len / 8, shooting.y - shooting.vy * shooting.len / 8)
    ctx.lineTo(shooting.x, shooting.y)
    ctx.strokeStyle = g; ctx.lineWidth = 1.5; ctx.stroke()
    shooting.x  += shooting.vx
    shooting.y  += shooting.vy
    shooting.alpha -= 0.018
    if (shooting.alpha <= 0 || shooting.x > W || shooting.y > H) shooting.active = false
  }
  if (tick - lastShot > 9 + Math.random() * 6) {
    lastShot = tick
    const angle = Math.PI / 6 + Math.random() * Math.PI / 8
    shooting.x = rnd(0, W * 0.7); shooting.y = rnd(0, H * 0.3)
    shooting.vx = Math.cos(angle) * 8; shooting.vy = Math.sin(angle) * 8
    shooting.len = rnd(80, 160); shooting.alpha = 1; shooting.active = true
  }
}

// ─── Orbit paths + asteroid belt ──────────────────────────────────────────────

function drawOrbits(ctx: CanvasRenderingContext2D) {
  for (const p of planets) {
    ctx.save()
    ctx.translate(SX, SY)
    ctx.scale(1, TILT)
    ctx.beginPath(); ctx.ellipse(0, 0, p.a * sc, p.a * sc, 0, 0, τ)
    ctx.strokeStyle = 'rgba(255,255,255,0.035)'
    ctx.lineWidth = 0.7
    ctx.stroke()
    ctx.restore()
  }
}

function drawAsteroidBelt(ctx: CanvasRenderingContext2D, ts: number, front: boolean) {
  for (const a of asteroids) {
    const angle = a.angle + ts * a.speed
    const py = SY + Math.sin(angle) * a.orbitR * sc * TILT
    if (front !== py >= SY) continue
    const px = SX + Math.cos(angle) * a.orbitR * sc
    ctx.beginPath(); ctx.arc(px, py, a.size, 0, τ)
    ctx.fillStyle = `rgba(180,162,142,${a.alpha})`
    ctx.fill()
  }
}

// ─── Sun ──────────────────────────────────────────────────────────────────────

function drawSun(ctx: CanvasRenderingContext2D, ts: number) {
  const r = 28 * sc
  const pulse = 1 + 0.028 * Math.sin(ts * 1.8e-3)

  // Outer corona halos
  ;[3.8, 2.8, 2.0].forEach((m, i) => {
    const g = ctx.createRadialGradient(SX, SY, r*0.65, SX, SY, r*m*pulse)
    g.addColorStop(0,   `rgba(255,185,30,${0.030 + i*0.018})`)
    g.addColorStop(0.55,`rgba(255,100,0,${0.012 + i*0.008})`)
    g.addColorStop(1,   'rgba(255,50,0,0)')
    ctx.beginPath(); ctx.arc(SX, SY, r*m*pulse, 0, τ); ctx.fillStyle = g; ctx.fill()
  })

  // Solar flare spikes (8, slowly rotating, pulsing length)
  ctx.save(); ctx.translate(SX, SY)
  const fRot = ts * 2.2e-4
  for (let i = 0; i < 8; i++) {
    const angle = (τ/8)*i + fRot
    const len = r * (1.20 + 0.38 * Math.sin(ts * 7e-4 + i * 1.1))
    const w   = r * 0.07
    ctx.save(); ctx.rotate(angle)
    const fg = ctx.createLinearGradient(r*0.82, 0, r*0.82+len, 0)
    fg.addColorStop(0, 'rgba(255,215,80,0.60)')
    fg.addColorStop(1, 'rgba(255,130,0,0)')
    ctx.fillStyle = fg
    ctx.beginPath(); ctx.moveTo(r*0.82,-w*0.5); ctx.lineTo(r*0.82+len,0); ctx.lineTo(r*0.82,w*0.5); ctx.fill()
    ctx.restore()
  }
  ctx.restore()

  // Sun body sphere
  const body = ctx.createRadialGradient(SX-r*0.28, SY-r*0.28, 0, SX, SY, r)
  body.addColorStop(0,    '#fff8c0')
  body.addColorStop(0.18, '#ffe040')
  body.addColorStop(0.50, '#ff9500')
  body.addColorStop(0.80, '#e04800')
  body.addColorStop(1,    '#a02800')
  ctx.beginPath(); ctx.arc(SX, SY, r*pulse, 0, τ); ctx.fillStyle = body; ctx.fill()

  // Surface granulation (slow rotation)
  ctx.save(); ctx.translate(SX, SY)
  ctx.beginPath(); ctx.arc(0, 0, r*pulse, 0, τ); ctx.clip()
  ctx.rotate(ts * 4e-5); ctx.globalAlpha = 0.13
  ;[[ r*0.25, r*0.10,r*0.22],[-r*0.30, r*0.20,r*0.16],[r*0.05,-r*0.28,r*0.18],[-r*0.16,-r*0.12,r*0.13],[r*0.34,-r*0.16,r*0.14]].forEach(([cx,cy,cr]) => {
    ctx.beginPath(); ctx.arc(cx,cy,cr,0,τ); ctx.fillStyle='#fff0a0'; ctx.fill()
  })
  ctx.globalAlpha = 1
  ctx.restore()
}

// ─── Planet helpers ───────────────────────────────────────────────────────────

function nightSide(ctx: CanvasRenderingContext2D, r: number) {
  const sh = ctx.createRadialGradient(r*0.42,r*0.32,0, r*0.42,r*0.32, r*1.12)
  sh.addColorStop(0,   'rgba(0,0,10,0.65)')
  sh.addColorStop(0.44,'rgba(0,0,10,0.28)')
  sh.addColorStop(1,   'rgba(0,0,10,0)')
  ctx.beginPath(); ctx.arc(0,0,r,0,τ); ctx.fillStyle=sh; ctx.fill()
}

function specular(ctx: CanvasRenderingContext2D, r: number, alpha=0.28) {
  const sp = ctx.createRadialGradient(-r*0.35,-r*0.35,0,-r*0.35,-r*0.35,r*0.62)
  sp.addColorStop(0,`rgba(255,255,255,${alpha})`); sp.addColorStop(1,'rgba(255,255,255,0)')
  ctx.beginPath(); ctx.arc(0,0,r,0,τ); ctx.fillStyle=sp; ctx.fill()
}

// Mercury: gray cratered rock
function drawMercury(ctx: CanvasRenderingContext2D, r: number, rot: number) {
  const sphere = ctx.createRadialGradient(-r*0.3,-r*0.3,0,0,0,r)
  sphere.addColorStop(0,'#d0c4b8'); sphere.addColorStop(0.45,'#8c7c6e'); sphere.addColorStop(0.88,'#3c3028'); sphere.addColorStop(1,'#141010')
  ctx.beginPath(); ctx.arc(0,0,r,0,τ); ctx.fillStyle=sphere; ctx.fill()
  ctx.save(); ctx.beginPath(); ctx.arc(0,0,r,0,τ); ctx.clip(); ctx.rotate(rot); ctx.globalAlpha=0.20
  ;[[ r*0.22, r*0.10,r*0.18,'rgba(70,58,48,0.85)'],[-r*0.28, r*0.18,r*0.12,'rgba(55,44,36,0.80)'],[r*0.05,-r*0.25,r*0.14,'rgba(80,65,52,0.80)'],[-r*0.10,-r*0.15,r*0.08,'rgba(60,50,40,0.70)']].forEach(([cx,cy,cr,col]) => {
    ctx.beginPath();ctx.arc(cx as number,cy as number,cr as number,0,τ);ctx.fillStyle=col as string;ctx.fill()
  })
  ctx.globalAlpha=1; ctx.restore()
  specular(ctx, r, 0.22); nightSide(ctx, r)
}

// Venus: thick pale-yellow cloud world
function drawVenus(ctx: CanvasRenderingContext2D, r: number, rot: number) {
  const haze = ctx.createRadialGradient(0,0,r*0.85,0,0,r*1.55)
  haze.addColorStop(0,'rgba(255,235,160,0.20)'); haze.addColorStop(1,'rgba(230,180,60,0)')
  ctx.beginPath();ctx.arc(0,0,r*1.55,0,τ);ctx.fillStyle=haze;ctx.fill()
  const body = ctx.createRadialGradient(-r*0.28,-r*0.28,0,0,0,r)
  body.addColorStop(0,'#fff5c8'); body.addColorStop(0.25,'#f5da80'); body.addColorStop(0.62,'#c8960a'); body.addColorStop(0.88,'#7a5600'); body.addColorStop(1,'#2a1c00')
  ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.fillStyle=body;ctx.fill()
  ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.clip()
  const off=(rot*r*0.45)%(r*2); ctx.globalAlpha=0.35
  ;[[0.10],[0.28],[0.46],[0.64],[0.82]].forEach(([f]) => {
    const by=-r+(f as number)*r*2
    ctx.fillStyle='rgba(255,240,180,0.70)'
    ctx.fillRect(off-r*3,by,r*6,r*0.16); ctx.fillRect(off-r*3-r*2,by,r*6,r*0.16)
  })
  ctx.globalAlpha=1; ctx.restore()
  specular(ctx, r, 0.25); nightSide(ctx, r)
}

// Earth: blue marble with green continents and cloud bands
function drawEarth(ctx: CanvasRenderingContext2D, r: number, rot: number) {
  const atmo = ctx.createRadialGradient(0,0,r*0.88,0,0,r*1.45)
  atmo.addColorStop(0,'rgba(50,150,255,0.24)'); atmo.addColorStop(0.5,'rgba(40,100,220,0.10)'); atmo.addColorStop(1,'rgba(20,60,200,0)')
  ctx.beginPath();ctx.arc(0,0,r*1.45,0,τ);ctx.fillStyle=atmo;ctx.fill()
  const ocean = ctx.createRadialGradient(-r*0.30,-r*0.30,0,0,0,r)
  ocean.addColorStop(0,'#b3e5fc'); ocean.addColorStop(0.22,'#0288d1'); ocean.addColorStop(0.58,'#01579b'); ocean.addColorStop(0.88,'#012f5e'); ocean.addColorStop(1,'#010e1a')
  ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.fillStyle=ocean;ctx.fill()
  ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.clip()
  ctx.rotate(rot)
  ctx.fillStyle='rgba(34,120,58,0.65)'
  ctx.beginPath();ctx.ellipse( r*0.20,-r*0.08,r*0.28,r*0.17,0.50,0,τ);ctx.fill()
  ctx.beginPath();ctx.ellipse(-r*0.26, r*0.18,r*0.18,r*0.11,-0.35,0,τ);ctx.fill()
  ctx.beginPath();ctx.ellipse( r*0.04, r*0.30,r*0.11,r*0.07,0.20,0,τ);ctx.fill()
  ctx.beginPath();ctx.ellipse(-r*0.12,-r*0.30,r*0.13,r*0.08,0.80,0,τ);ctx.fill()
  ctx.rotate(-rot)
  const coff=(rot*r*0.9*1.38)%(r*2); ctx.globalAlpha=0.26
  ;[[0.08],[0.33],[0.60],[0.82]].forEach(([f]) => {
    const by=-r+(f as number)*r*2
    ctx.fillStyle='rgba(230,242,255,0.92)'
    ctx.fillRect(coff-r*3,by,r*6,r*0.13); ctx.fillRect(coff-r*3-r*2,by,r*6,r*0.13)
  })
  ctx.globalAlpha=1; ctx.restore()
  specular(ctx, r, 0.46); nightSide(ctx, r)
}

// Mars: reddish with polar ice cap
function drawMars(ctx: CanvasRenderingContext2D, r: number, rot: number) {
  const haze = ctx.createRadialGradient(0,0,r*0.85,0,0,r*1.42)
  haze.addColorStop(0,'rgba(210,100,40,0.14)'); haze.addColorStop(1,'rgba(180,70,20,0)')
  ctx.beginPath();ctx.arc(0,0,r*1.42,0,τ);ctx.fillStyle=haze;ctx.fill()
  const sphere = ctx.createRadialGradient(-r*0.30,-r*0.30,0,0,0,r)
  sphere.addColorStop(0,'#f5a07a'); sphere.addColorStop(0.30,'#c0502a'); sphere.addColorStop(0.72,'#7a2810'); sphere.addColorStop(1,'#1e0800')
  ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.fillStyle=sphere;ctx.fill()
  ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.clip();ctx.rotate(rot)
  // Polar cap
  const cap = ctx.createRadialGradient(0,-r*0.72,0,0,-r*0.72,r*0.40)
  cap.addColorStop(0,'rgba(240,235,225,0.92)'); cap.addColorStop(0.55,'rgba(200,190,175,0.42)'); cap.addColorStop(1,'rgba(170,155,140,0)')
  ctx.fillStyle=cap;ctx.beginPath();ctx.arc(0,-r*0.72,r*0.40,0,τ);ctx.fill()
  // Surface: volcanic regions
  ctx.globalAlpha=0.22
  ;[[ r*0.18, r*0.08,r*0.20,'rgba(100,38,18,0.80)'],[-r*0.24, r*0.16,r*0.14,'rgba(80,28,10,0.70)']].forEach(([cx,cy,cr,col]) => {
    ctx.beginPath();ctx.arc(cx as number,cy as number,cr as number,0,τ);ctx.fillStyle=col as string;ctx.fill()
  })
  ctx.globalAlpha=1; ctx.restore()
  specular(ctx, r, 0.25); nightSide(ctx, r)
}

// Jupiter: banded gas giant + Great Red Spot
function drawJupiter(ctx: CanvasRenderingContext2D, r: number, rot: number) {
  const atmo = ctx.createRadialGradient(0,0,r*0.88,0,0,r*1.50)
  atmo.addColorStop(0,'rgba(200,140,60,0.12)'); atmo.addColorStop(1,'rgba(140,80,0,0)')
  ctx.beginPath();ctx.arc(0,0,r*1.50,0,τ);ctx.fillStyle=atmo;ctx.fill()
  const sphere = ctx.createRadialGradient(-r*0.28,-r*0.28,0,0,0,r)
  sphere.addColorStop(0,'#ffe08a'); sphere.addColorStop(0.15,'#e09020'); sphere.addColorStop(0.55,'#854510'); sphere.addColorStop(0.85,'#381a06'); sphere.addColorStop(1,'#180800')
  ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.fillStyle=sphere;ctx.fill()
  ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.clip()
  const boff=(rot*r*0.48)%(r*2); ctx.globalAlpha=0.42
  ;[
    ['rgba(255,215,80,0.82)',0.04],['rgba(195,85,22,0.98)',0.15],['rgba(255,210,80,0.72)',0.28],
    ['rgba(175,62,12,0.94)',0.42],['rgba(255,232,165,0.60)',0.57],['rgba(208,82,22,0.85)',0.71],
    ['rgba(255,215,80,0.68)',0.87],
  ].forEach(([col,f]) => {
    const by=-r+(f as number)*r*2
    ctx.fillStyle=col as string
    ctx.fillRect(boff-r*3,by,r*6,r*0.16); ctx.fillRect(boff-r*3-r*2,by,r*6,r*0.16)
  })
  ctx.globalAlpha=1
  // Great Red Spot
  ctx.save(); ctx.rotate(rot*0.86); ctx.translate(r*0.42,r*0.05); ctx.scale(1.75,0.82)
  const storm = ctx.createRadialGradient(0,0,0,0,0,r*0.21)
  storm.addColorStop(0,'rgba(255,100,20,0.97)'); storm.addColorStop(0.42,'rgba(210,60,10,0.74)'); storm.addColorStop(1,'rgba(175,40,5,0)')
  ctx.beginPath();ctx.arc(0,0,r*0.21,0,τ);ctx.fillStyle=storm;ctx.fill(); ctx.restore()
  ctx.restore()
  specular(ctx, r, 0.24); nightSide(ctx, r)
}

// Saturn: banded gas giant with multi-layer rings
function drawSaturn(ctx: CanvasRenderingContext2D, r: number, rot: number) {
  const atmo = ctx.createRadialGradient(0,0,r*0.88,0,0,r*1.60)
  atmo.addColorStop(0,'rgba(215,165,65,0.14)'); atmo.addColorStop(1,'rgba(155,95,15,0)')
  ctx.beginPath();ctx.arc(0,0,r*1.60,0,τ);ctx.fillStyle=atmo;ctx.fill()
  // Back ring (upper arc — visually behind planet)
  ctx.save(); ctx.scale(1, 0.30)
  ;[[r*1.90,r*0.34,'rgba(210,175,80,0.36)'],[r*1.56,r*0.24,'rgba(175,135,58,0.28)'],[r*1.28,r*0.18,'rgba(145,105,42,0.20)']].forEach(([rad,w,col]) => {
    ctx.beginPath();ctx.arc(0,0,rad as number,Math.PI,τ);ctx.strokeStyle=col as string;ctx.lineWidth=w as number;ctx.stroke()
  })
  ctx.restore()
  // Planet body
  const sphere = ctx.createRadialGradient(-r*0.28,-r*0.28,0,0,0,r)
  sphere.addColorStop(0,'#fff0b0'); sphere.addColorStop(0.18,'#e8b830'); sphere.addColorStop(0.55,'#8a4810'); sphere.addColorStop(0.85,'#3c1c06'); sphere.addColorStop(1,'#1a0800')
  ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.fillStyle=sphere;ctx.fill()
  // Bands
  ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.clip()
  const boff=(rot*r*0.42)%(r*2); ctx.globalAlpha=0.32
  ;[
    ['rgba(255,225,120,0.75)',0.06],['rgba(185,120,40,0.88)',0.20],['rgba(255,220,110,0.65)',0.38],
    ['rgba(170,110,35,0.82)',0.56],['rgba(255,230,160,0.55)',0.74],['rgba(190,125,45,0.72)',0.88],
  ].forEach(([col,f]) => {
    const by=-r+(f as number)*r*2
    ctx.fillStyle=col as string
    ctx.fillRect(boff-r*3,by,r*6,r*0.16); ctx.fillRect(boff-r*3-r*2,by,r*6,r*0.16)
  })
  ctx.globalAlpha=1; ctx.restore()
  specular(ctx, r, 0.26); nightSide(ctx, r)
  // Front ring (lower arc — in front of planet)
  ctx.save(); ctx.scale(1, 0.30)
  ;[[r*1.90,r*0.34,'rgba(210,175,80,0.46)'],[r*1.56,r*0.24,'rgba(175,135,58,0.36)'],[r*1.28,r*0.18,'rgba(145,105,42,0.26)']].forEach(([rad,w,col]) => {
    ctx.beginPath();ctx.arc(0,0,rad as number,0,Math.PI);ctx.strokeStyle=col as string;ctx.lineWidth=w as number;ctx.stroke()
  })
  ctx.restore()
}

// Neptune-like ice giant: deep blue with cap
function drawIce(ctx: CanvasRenderingContext2D, r: number, rot: number) {
  const haze = ctx.createRadialGradient(0,0,r*0.72,0,0,r*2.05)
  haze.addColorStop(0,'rgba(30,100,220,0.24)'); haze.addColorStop(0.6,'rgba(20,70,180,0.10)'); haze.addColorStop(1,'rgba(10,40,130,0)')
  ctx.beginPath();ctx.arc(0,0,r*2.05,0,τ);ctx.fillStyle=haze;ctx.fill()
  const body = ctx.createRadialGradient(-r*0.28,-r*0.28,0,0,0,r)
  body.addColorStop(0,'#a0d8ff'); body.addColorStop(0.28,'#1a6cc8'); body.addColorStop(0.70,'#0a3570'); body.addColorStop(1,'#031228')
  ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.fillStyle=body;ctx.fill()
  ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.clip();ctx.rotate(rot)
  const cap = ctx.createRadialGradient(0,-r*0.70,0,0,-r*0.70,r*0.48)
  cap.addColorStop(0,'rgba(200,230,255,0.90)'); cap.addColorStop(0.55,'rgba(150,200,245,0.40)'); cap.addColorStop(1,'rgba(100,170,230,0)')
  ctx.fillStyle=cap;ctx.beginPath();ctx.arc(0,-r*0.70,r*0.48,0,τ);ctx.fill()
  ctx.rotate(-rot)
  const boff=(rot*r*0.55)%(r*2); ctx.globalAlpha=0.20
  ;[[0.22],[0.50],[0.76]].forEach(([f]) => {
    const by=-r+(f as number)*r*2
    ctx.fillStyle='rgba(140,200,255,0.90)'
    ctx.fillRect(boff-r*3,by,r*6,r*0.14); ctx.fillRect(boff-r*3-r*2,by,r*6,r*0.14)
  })
  ctx.globalAlpha=1; ctx.restore()
  specular(ctx, r, 0.40); nightSide(ctx, r)
}

// Moon for Earth
function drawMoon(ctx: CanvasRenderingContext2D, mx: number, my: number, r: number) {
  ctx.save(); ctx.translate(mx, my)
  const body = ctx.createRadialGradient(-r*0.25,-r*0.25,0,0,0,r)
  body.addColorStop(0,'#d4cbbf'); body.addColorStop(0.50,'#9c9080'); body.addColorStop(1,'#28241e')
  ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.fillStyle=body;ctx.fill()
  nightSide(ctx, r)
  ctx.restore()
}

// ─── Planet draw dispatch ──────────────────────────────────────────────────────

function renderPlanet(ctx: CanvasRenderingContext2D, p: PlanetDef, ts: number) {
  const angle = p.startAngle + ts * p.speed
  const px    = SX + Math.cos(angle) * p.a * sc
  const py    = SY + Math.sin(angle) * p.a * sc * TILT
  const rot   = p.rotOffset + ts * p.rotSpeed
  const r     = p.r * sc

  ctx.save(); ctx.translate(px, py)
  if      (p.type === 'mercury') drawMercury(ctx, r, rot)
  else if (p.type === 'venus'  ) drawVenus  (ctx, r, rot)
  else if (p.type === 'earth'  ) drawEarth  (ctx, r, rot)
  else if (p.type === 'mars'   ) drawMars   (ctx, r, rot)
  else if (p.type === 'jupiter') drawJupiter(ctx, r, rot)
  else if (p.type === 'saturn' ) drawSaturn (ctx, r, rot)
  else                           drawIce    (ctx, r, rot)
  ctx.restore()

  // Moon (Earth only) — orbit centered on planet screen position
  if (p.moon) {
    const mAngle = p.moon.startAngle + ts * p.moon.speed
    const mx = px + Math.cos(mAngle) * p.moon.orbitR * sc
    const my = py + Math.sin(mAngle) * p.moon.orbitR * sc * 0.48
    drawMoon(ctx, mx, my, p.moon.r * sc)
  }
}

// ─── RAF loop ─────────────────────────────────────────────────────────────────

function frame(ts: number) {
  raf = requestAnimationFrame(frame)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, W, H)
  drawBackground(ctx)
  drawStars(ctx)
  updateShooting(ctx)
  drawOrbits(ctx)

  // Split draw pass: planets/asteroids behind sun → sun → planets/asteroids in front
  // Sort planets by py so depth order is correct
  const sorted = planets
    .map(p => {
      const angle = p.startAngle + ts * p.speed
      return { p, py: SY + Math.sin(angle) * p.a * sc * TILT }
    })
    .sort((a, b) => a.py - b.py)

  // Back pass (py < SY = visually behind sun)
  drawAsteroidBelt(ctx, ts, false)
  for (const { p, py } of sorted) {
    if (py < SY) renderPlanet(ctx, p, ts)
  }

  drawSun(ctx, ts)

  // Front pass (py >= SY = visually in front of sun)
  drawAsteroidBelt(ctx, ts, true)
  for (const { p, py } of sorted) {
    if (py >= SY) renderPlanet(ctx, p, ts)
  }
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
