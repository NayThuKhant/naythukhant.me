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

interface Moon { orbitR: number; speed: number; startAngle: number; r: number }

interface PlanetDef {
  a: number          // semi-major axis at scale=1
  speed: number      // orbital rad/ms
  startAngle: number
  r: number          // radius at scale=1
  rotSpeed: number   // surface rotation rad/ms
  rotOffset: number
  type: 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune'
  name: string
  moon?: Moon
}

interface Asteroid { angle: number; orbitR: number; speed: number; size: number; alpha: number }

// ─── State ────────────────────────────────────────────────────────────────────

const canvasEl = ref<HTMLCanvasElement | null>(null)
let raf = 0
let W = 0, H = 0
const τ = Math.PI * 2
const TILT = 0.40            // orbit y-scale for 3D tilt perspective

let SX = 0, SY = 0          // sun screen position
let sc = 1                   // solar system scale factor

let stars: Star[]       = []
let planets: PlanetDef[] = []
let asteroids: Asteroid[] = []
let tick = 0
let lastShot = 0
const shooting: Shooting = { x:0,y:0,vx:0,vy:0,len:0,alpha:0,active:false }

const rnd = (a: number, b: number) => a + Math.random() * (b - a)

// ─── Setup ────────────────────────────────────────────────────────────────────

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
  const tint = (): [number,number,number] => {
    const r = Math.random()
    if (r < 0.12) return [100, 200, 255]
    if (r < 0.22) return [180, 110, 255]
    return [220, 230, 255]
  }
  for (let i = 0; i < 280; i++) {
    const t = Math.random()
    const r = t < 0.65 ? rnd(0.2,0.7) : t < 0.92 ? rnd(0.7,1.3) : rnd(1.3,2.2)
    stars.push({ x:rnd(0,W), y:rnd(0,H), r, baseAlpha:rnd(0.3,0.85), phase:rnd(0,τ), speed:rnd(0.004,0.012), rgb:tint() })
  }
}

function buildPlanets() {
  planets = [
    { a:72,  speed:5.2e-4, startAngle:0.50, r:3.5,  rotSpeed:1.8e-4, rotOffset:0.0, type:'mercury', name:'Mercury' },
    { a:118, speed:3.2e-4, startAngle:2.10, r:7.2,  rotSpeed:1.1e-4, rotOffset:1.0, type:'venus',   name:'Venus'   },
    { a:170, speed:2.1e-4, startAngle:1.20, r:7.8,  rotSpeed:2.8e-4, rotOffset:0.8, type:'earth',   name:'Earth',
      moon:{ orbitR:21, speed:2.0e-3, startAngle:0.4, r:2.1 } },
    { a:225, speed:1.4e-4, startAngle:3.80, r:5.2,  rotSpeed:2.6e-4, rotOffset:2.0, type:'mars',    name:'Mars'    },
    { a:328, speed:6.5e-5, startAngle:0.90, r:22.0, rotSpeed:4.5e-4, rotOffset:0.5, type:'jupiter', name:'Jupiter' },
    { a:422, speed:3.8e-5, startAngle:2.80, r:16.0, rotSpeed:3.8e-4, rotOffset:1.5, type:'saturn',  name:'Saturn'  },
    { a:502, speed:2.4e-5, startAngle:4.50, r:12.0, rotSpeed:2.2e-4, rotOffset:3.0, type:'uranus',  name:'Uranus'  },
    { a:568, speed:1.6e-5, startAngle:1.80, r:11.0, rotSpeed:2.0e-4, rotOffset:0.8, type:'neptune', name:'Neptune' },
  ]
}

function buildAsteroids() {
  asteroids = []
  for (let i = 0; i < 130; i++) {
    asteroids.push({ angle:rnd(0,τ), orbitR:rnd(272,298), speed:rnd(8e-5,1.5e-4), size:rnd(0.4,1.4), alpha:rnd(0.16,0.50) })
  }
}

// ─── Stars + shooting ─────────────────────────────────────────────────────────

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
    shooting.x += shooting.vx; shooting.y += shooting.vy; shooting.alpha -= 0.018
    if (shooting.alpha <= 0 || shooting.x > W || shooting.y > H) shooting.active = false
  }
  if (tick - lastShot > 9 + Math.random() * 7) {
    lastShot = tick
    const angle = Math.PI / 6 + Math.random() * Math.PI / 8
    Object.assign(shooting, { x:rnd(0,W*0.7), y:rnd(0,H*0.3), vx:Math.cos(angle)*8, vy:Math.sin(angle)*8, len:rnd(80,160), alpha:1, active:true })
  }
}

// ─── Orbits + asteroid belt ────────────────────────────────────────────────────

function drawOrbits(ctx: CanvasRenderingContext2D) {
  for (const p of planets) {
    ctx.save(); ctx.translate(SX, SY); ctx.scale(1, TILT)
    ctx.beginPath(); ctx.ellipse(0, 0, p.a * sc, p.a * sc, 0, 0, τ)
    ctx.strokeStyle = 'rgba(255,255,255,0.038)'; ctx.lineWidth = 0.7; ctx.stroke()
    ctx.restore()
  }
}

function drawAsteroidBelt(ctx: CanvasRenderingContext2D, ts: number, front: boolean) {
  for (const a of asteroids) {
    const ang = a.angle + ts * a.speed
    const py  = SY + Math.sin(ang) * a.orbitR * sc * TILT
    if (front !== (py >= SY)) continue
    const px = SX + Math.cos(ang) * a.orbitR * sc
    ctx.beginPath(); ctx.arc(px, py, a.size, 0, τ)
    ctx.fillStyle = `rgba(175,158,138,${a.alpha})`; ctx.fill()
  }
}

// ─── Sun ──────────────────────────────────────────────────────────────────────

function drawSun(ctx: CanvasRenderingContext2D, ts: number) {
  const r = 28 * sc
  const pulse = 1 + 0.028 * Math.sin(ts * 1.8e-3)

  // Layered corona halos
  ;[4.2, 3.0, 2.1].forEach((m, i) => {
    const g = ctx.createRadialGradient(SX, SY, r*0.60, SX, SY, r*m*pulse)
    g.addColorStop(0,    `rgba(255,190,40,${0.028 + i*0.016})`)
    g.addColorStop(0.5,  `rgba(255,100,10,${0.010 + i*0.008})`)
    g.addColorStop(1,    'rgba(255,40,0,0)')
    ctx.beginPath(); ctx.arc(SX, SY, r*m*pulse, 0, τ); ctx.fillStyle=g; ctx.fill()
  })

  // Plasma flare spikes
  ctx.save(); ctx.translate(SX, SY)
  const fRot = ts * 2.2e-4
  for (let i = 0; i < 12; i++) {
    const ang = (τ/12)*i + fRot
    const len = r * (0.95 + 0.48 * Math.sin(ts*7e-4 + i*1.1 + 0.5))
    const w   = r * 0.055
    ctx.save(); ctx.rotate(ang)
    const fg = ctx.createLinearGradient(r*0.80, 0, r*0.80+len, 0)
    fg.addColorStop(0, 'rgba(255,220,80,0.65)'); fg.addColorStop(1, 'rgba(255,120,10,0)')
    ctx.fillStyle = fg
    ctx.beginPath(); ctx.moveTo(r*0.80,-w*0.5); ctx.lineTo(r*0.80+len,0); ctx.lineTo(r*0.80,w*0.5); ctx.fill()
    ctx.restore()
  }
  ctx.restore()

  // Photosphere
  const body = ctx.createRadialGradient(SX-r*0.30, SY-r*0.30, 0, SX, SY, r*pulse)
  body.addColorStop(0,    '#fff8c0')
  body.addColorStop(0.12, '#ffe040')
  body.addColorStop(0.45, '#ff9200')
  body.addColorStop(0.78, '#e04400')
  body.addColorStop(1,    '#9e2800')
  ctx.beginPath(); ctx.arc(SX, SY, r*pulse, 0, τ); ctx.fillStyle=body; ctx.fill()

  // Surface granulation (rotating convection cells)
  ctx.save(); ctx.translate(SX, SY)
  ctx.beginPath(); ctx.arc(0, 0, r*pulse, 0, τ); ctx.clip()
  ctx.rotate(ts * 3.5e-5); ctx.globalAlpha = 0.11
  ;[[ r*0.26, r*0.12,r*0.24],[-r*0.32, r*0.22,r*0.18],[ r*0.06,-r*0.30,r*0.20],
    [-r*0.18,-r*0.14,r*0.14],[ r*0.36,-r*0.18,r*0.16],[-r*0.05, r*0.35,r*0.13]].forEach(([cx,cy,cr]) => {
    ctx.beginPath(); ctx.arc(cx,cy,cr,0,τ); ctx.fillStyle='#fff0a0'; ctx.fill()
  })
  ctx.globalAlpha=1; ctx.restore()

  // Sun label
  ctx.save(); ctx.translate(SX, SY)
  drawLabel(ctx, 'Sun', r*pulse + 14)
  ctx.restore()
}

// ─── Planet helpers ───────────────────────────────────────────────────────────

// la = light angle (direction from planet toward sun in screen space)

function limbDarken(ctx: CanvasRenderingContext2D, r: number) {
  const ld = ctx.createRadialGradient(0,0,r*0.70,0,0,r)
  ld.addColorStop(0,'rgba(0,0,0,0)')
  ld.addColorStop(1,'rgba(0,0,20,0.52)')
  ctx.beginPath(); ctx.arc(0,0,r,0,τ); ctx.fillStyle=ld; ctx.fill()
}

function specular(ctx: CanvasRenderingContext2D, r: number, la: number, alpha=0.34) {
  const sx=Math.cos(la)*r*0.36, sy=Math.sin(la)*r*0.36
  const sp=ctx.createRadialGradient(sx,sy,0,sx,sy,r*0.68)
  sp.addColorStop(0,`rgba(255,255,255,${alpha})`); sp.addColorStop(1,'rgba(255,255,255,0)')
  ctx.beginPath(); ctx.arc(0,0,r,0,τ); ctx.fillStyle=sp; ctx.fill()
}

function nightSide(ctx: CanvasRenderingContext2D, r: number, la: number) {
  // Shadow centered on the anti-sun hemisphere
  const nx=Math.cos(la+Math.PI)*r*0.44, ny=Math.sin(la+Math.PI)*r*0.44
  const sh=ctx.createRadialGradient(nx,ny,0,nx,ny,r*1.18)
  sh.addColorStop(0,   'rgba(0,0,12,0.80)')
  sh.addColorStop(0.38,'rgba(0,0,12,0.38)')
  sh.addColorStop(1,   'rgba(0,0,12,0)')
  ctx.beginPath(); ctx.arc(0,0,r,0,τ); ctx.fillStyle=sh; ctx.fill()
}

function drawLabel(ctx: CanvasRenderingContext2D, name: string, yOff: number) {
  const fs = Math.max(8, Math.min(14, yOff * 0.55))
  ctx.save()
  ctx.font      = `${fs}px 'Courier New', monospace`
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(100,180,255,0.90)'
  ctx.shadowBlur  = 9
  ctx.fillStyle   = 'rgba(180,215,255,0.80)'
  ctx.fillText(name, 0, yOff)
  ctx.shadowBlur  = 0
  ctx.restore()
}

// ─── Planet surfaces ──────────────────────────────────────────────────────────

// Mercury — heavily cratered gray rock
function drawMercury(ctx: CanvasRenderingContext2D, r: number, rot: number, la: number) {
  const g = ctx.createRadialGradient(-r*0.28,-r*0.28,0,0,0,r)
  g.addColorStop(0,'#b8b0a4'); g.addColorStop(0.40,'#837870'); g.addColorStop(0.82,'#3c342e'); g.addColorStop(1,'#141010')
  ctx.beginPath(); ctx.arc(0,0,r,0,τ); ctx.fillStyle=g; ctx.fill()
  // Craters
  ctx.save(); ctx.beginPath(); ctx.arc(0,0,r,0,τ); ctx.clip(); ctx.rotate(rot); ctx.globalAlpha=0.28
  ;[[ r*0.22, r*0.10,r*0.17,'rgba(55,45,38,0.90)'],[-r*0.30, r*0.18,r*0.11,'rgba(45,36,30,0.85)'],
    [ r*0.04,-r*0.26,r*0.14,'rgba(60,50,42,0.85)'],[-r*0.12,-r*0.15,r*0.08,'rgba(50,40,34,0.80)'],
    [ r*0.28,-r*0.12,r*0.09,'rgba(52,42,35,0.78)']].forEach(([cx,cy,cr,col]) => {
    ctx.beginPath();ctx.arc(cx as number,cy as number,cr as number,0,τ);ctx.fillStyle=col as string;ctx.fill()
  })
  ctx.globalAlpha=1; ctx.restore()
  limbDarken(ctx,r); specular(ctx,r,la,0.22); nightSide(ctx,r,la)
}

// Venus — featureless yellow-white thick cloud deck
function drawVenus(ctx: CanvasRenderingContext2D, r: number, rot: number, la: number) {
  // Thick atmosphere glow
  const haze=ctx.createRadialGradient(0,0,r*0.82,0,0,r*1.60)
  haze.addColorStop(0,'rgba(255,238,165,0.24)'); haze.addColorStop(1,'rgba(230,185,60,0)')
  ctx.beginPath();ctx.arc(0,0,r*1.60,0,τ);ctx.fillStyle=haze;ctx.fill()
  const body=ctx.createRadialGradient(-r*0.28,-r*0.28,0,0,0,r)
  body.addColorStop(0,'#fff8d8'); body.addColorStop(0.22,'#f5e080'); body.addColorStop(0.60,'#c89808'); body.addColorStop(0.88,'#7a5800'); body.addColorStop(1,'#2a1c00')
  ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.fillStyle=body;ctx.fill()
  // Dense cloud banding (very subtle due to thick atmosphere)
  ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.clip()
  const off=(rot*r*0.42)%(r*2); ctx.globalAlpha=0.28
  ;[[0.10,r*0.14],[0.28,r*0.14],[0.46,r*0.13],[0.64,r*0.14],[0.82,r*0.13]].forEach(([f,h]) => {
    const by=-r+(f as number)*r*2
    ctx.fillStyle='rgba(255,245,185,0.65)'
    ctx.fillRect(off-r*3,by,r*6,h as number); ctx.fillRect(off-r*3-r*2,by,r*6,h as number)
  })
  ctx.globalAlpha=1; ctx.restore()
  limbDarken(ctx,r); specular(ctx,r,la,0.30); nightSide(ctx,r,la)
}

// Earth — realistic blue marble
function drawEarth(ctx: CanvasRenderingContext2D, r: number, rot: number, la: number) {
  // Atmosphere glow
  const atmo=ctx.createRadialGradient(0,0,r*0.88,0,0,r*1.48)
  atmo.addColorStop(0,'rgba(50,160,255,0.28)'); atmo.addColorStop(0.5,'rgba(40,110,220,0.12)'); atmo.addColorStop(1,'rgba(20,60,200,0)')
  ctx.beginPath();ctx.arc(0,0,r*1.48,0,τ);ctx.fillStyle=atmo;ctx.fill()
  // Ocean base
  const ocean=ctx.createRadialGradient(-r*0.28,-r*0.28,0,0,0,r)
  ocean.addColorStop(0,'#90caf9'); ocean.addColorStop(0.20,'#1565c0'); ocean.addColorStop(0.55,'#0d47a1'); ocean.addColorStop(0.86,'#0a2d6e'); ocean.addColorStop(1,'#040d2a')
  ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.fillStyle=ocean;ctx.fill()
  // Rotating surface
  ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.clip();ctx.rotate(rot)
  // Land masses (realistic-ish colors)
  ctx.fillStyle='rgba(46,125,50,0.70)'
  ctx.beginPath();ctx.ellipse( r*0.18,-r*0.06,r*0.30,r*0.18,0.45,0,τ);ctx.fill()   // Eurasia-ish
  ctx.beginPath();ctx.ellipse(-r*0.24, r*0.16,r*0.20,r*0.13,-0.30,0,τ);ctx.fill()  // Americas-ish
  ctx.beginPath();ctx.ellipse( r*0.08, r*0.32,r*0.14,r*0.08,0.20,0,τ);ctx.fill()   // Africa-ish
  ctx.beginPath();ctx.ellipse(-r*0.08,-r*0.32,r*0.16,r*0.09,0.80,0,τ);ctx.fill()   // Antarctica landmass
  ctx.fillStyle='rgba(100,150,60,0.55)'
  ctx.beginPath();ctx.ellipse( r*0.32, r*0.22,r*0.10,r*0.07,0.10,0,τ);ctx.fill()   // Australia-ish
  // White polar ice caps
  ctx.fillStyle='rgba(240,248,255,0.85)'
  ctx.beginPath();ctx.arc(0,-r*0.82,r*0.26,0,τ);ctx.fill()
  ctx.beginPath();ctx.arc(0, r*0.80,r*0.20,0,τ);ctx.fill()
  // Cloud layer (moves faster than surface)
  ctx.rotate(-rot)
  const coff=(rot*r*1.35)%(r*2); ctx.globalAlpha=0.30
  ;[[0.08,r*0.12],[0.32,r*0.11],[0.58,r*0.12],[0.80,r*0.11]].forEach(([f,h]) => {
    const by=-r+(f as number)*r*2
    ctx.fillStyle='rgba(235,245,255,0.90)'
    ctx.fillRect(coff-r*3,by,r*6,h as number); ctx.fillRect(coff-r*3-r*2,by,r*6,h as number)
  })
  ctx.globalAlpha=1; ctx.restore()
  limbDarken(ctx,r); specular(ctx,r,la,0.48); nightSide(ctx,r,la)
}

// Mars — rusty red desert with polar cap
function drawMars(ctx: CanvasRenderingContext2D, r: number, rot: number, la: number) {
  const dust=ctx.createRadialGradient(0,0,r*0.82,0,0,r*1.45)
  dust.addColorStop(0,'rgba(200,90,40,0.16)'); dust.addColorStop(1,'rgba(160,60,20,0)')
  ctx.beginPath();ctx.arc(0,0,r*1.45,0,τ);ctx.fillStyle=dust;ctx.fill()
  const sphere=ctx.createRadialGradient(-r*0.28,-r*0.28,0,0,0,r)
  sphere.addColorStop(0,'#f4956c'); sphere.addColorStop(0.28,'#c0461a'); sphere.addColorStop(0.70,'#8b2500'); sphere.addColorStop(1,'#200800')
  ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.fillStyle=sphere;ctx.fill()
  ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.clip();ctx.rotate(rot)
  // North polar cap
  const cap=ctx.createRadialGradient(0,-r*0.74,0,0,-r*0.74,r*0.38)
  cap.addColorStop(0,'rgba(248,242,232,0.94)'); cap.addColorStop(0.55,'rgba(210,196,178,0.45)'); cap.addColorStop(1,'rgba(175,156,138,0)')
  ctx.fillStyle=cap;ctx.beginPath();ctx.arc(0,-r*0.74,r*0.38,0,τ);ctx.fill()
  // Dark volcanic regions (Tharsis, Valles-ish)
  ctx.globalAlpha=0.25
  ;[[ r*0.20, r*0.06,r*0.22,'rgba(85,30,10,0.85)'],[-r*0.26, r*0.14,r*0.16,'rgba(70,24,8,0.80)'],
    [ r*0.02,-r*0.18,r*0.12,'rgba(90,32,10,0.78)']].forEach(([cx,cy,cr,col]) => {
    ctx.beginPath();ctx.arc(cx as number,cy as number,cr as number,0,τ);ctx.fillStyle=col as string;ctx.fill()
  })
  // Valles Marineris scar (canyon)
  ctx.strokeStyle='rgba(60,18,5,0.55)'; ctx.lineWidth=r*0.06
  ctx.beginPath(); ctx.moveTo(-r*0.28,r*0.04); ctx.bezierCurveTo(-r*0.08,r*0.02, r*0.12,r*0.06, r*0.28,r*0.02); ctx.stroke()
  ctx.globalAlpha=1; ctx.restore()
  limbDarken(ctx,r); specular(ctx,r,la,0.24); nightSide(ctx,r,la)
}

// Jupiter — banded gas giant with Great Red Spot
function drawJupiter(ctx: CanvasRenderingContext2D, r: number, rot: number, la: number) {
  const atmo=ctx.createRadialGradient(0,0,r*0.88,0,0,r*1.52)
  atmo.addColorStop(0,'rgba(210,160,80,0.14)'); atmo.addColorStop(1,'rgba(150,90,20,0)')
  ctx.beginPath();ctx.arc(0,0,r*1.52,0,τ);ctx.fillStyle=atmo;ctx.fill()
  // Base sphere: tan/beige (realistic Jupiter color)
  const sphere=ctx.createRadialGradient(-r*0.26,-r*0.26,0,0,0,r)
  sphere.addColorStop(0,'#f0d8a0'); sphere.addColorStop(0.18,'#d4aa60'); sphere.addColorStop(0.55,'#8a5420'); sphere.addColorStop(0.85,'#3c1e08'); sphere.addColorStop(1,'#180a00')
  ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.fillStyle=sphere;ctx.fill()
  // Realistic band pattern
  ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.clip()
  const boff=(rot*r*0.46)%(r*2)
  // Alternating bands with realistic Jupiter colors
  const bands: [string, number, number][] = [
    ['rgba(240,225,185,0.75)', 0.00, 0.06],  // Polar zone (bright)
    ['rgba(160, 95, 45,0.88)', 0.06, 0.13],  // NNB dark brown
    ['rgba(235,210,165,0.70)', 0.13, 0.22],  // NTZ bright
    ['rgba(175,105, 50,0.92)', 0.22, 0.31],  // NEB rust brown (prominent)
    ['rgba(245,225,175,0.78)', 0.31, 0.42],  // Equatorial Zone (bright)
    ['rgba(190,115, 55,0.90)', 0.42, 0.51],  // SEB rust brown
    ['rgba(230,205,155,0.72)', 0.51, 0.60],  // STZ
    ['rgba(165, 92, 42,0.85)', 0.60, 0.68],  // SSB
    ['rgba(235,215,170,0.70)', 0.68, 0.78],  // South tropical
    ['rgba(155, 88, 40,0.80)', 0.78, 0.86],  // SPB
    ['rgba(240,220,180,0.68)', 0.86, 1.00],  // South polar
  ]
  ctx.globalAlpha=0.62
  for (const [col,t0,t1] of bands) {
    const by=-r+t0*r*2, h=(t1-t0)*r*2
    ctx.fillStyle=col
    ctx.fillRect(boff-r*3,by,r*6,h); ctx.fillRect(boff-r*3-r*2,by,r*6,h)
  }
  ctx.globalAlpha=1
  // Great Red Spot
  ctx.save(); ctx.rotate(rot*0.86); ctx.translate(r*0.44,r*0.055); ctx.scale(1.80,0.85)
  const grs=ctx.createRadialGradient(0,0,0,0,0,r*0.22)
  grs.addColorStop(0,   'rgba(210, 80,30,0.98)')
  grs.addColorStop(0.35,'rgba(185, 60,20,0.80)')
  grs.addColorStop(0.70,'rgba(155, 45,15,0.50)')
  grs.addColorStop(1,   'rgba(130, 35,10,0)')
  ctx.beginPath();ctx.arc(0,0,r*0.22,0,τ);ctx.fillStyle=grs;ctx.fill(); ctx.restore()
  ctx.restore()
  limbDarken(ctx,r); specular(ctx,r,la,0.22); nightSide(ctx,r,la)
}

// Saturn — golden banded body + realistic multi-layer ring system
function drawSaturn(ctx: CanvasRenderingContext2D, r: number, rot: number, la: number) {
  const atmo=ctx.createRadialGradient(0,0,r*0.88,0,0,r*1.62)
  atmo.addColorStop(0,'rgba(230,190,80,0.14)'); atmo.addColorStop(1,'rgba(165,110,20,0)')
  ctx.beginPath();ctx.arc(0,0,r*1.62,0,τ);ctx.fillStyle=atmo;ctx.fill()

  // Ring system — back half (behind planet)
  ctx.save(); ctx.scale(1, 0.30)
  // D ring (innermost, very faint)
  ctx.beginPath();ctx.arc(0,0,r*1.18,Math.PI,τ)
  ctx.strokeStyle='rgba(180,155,100,0.12)';ctx.lineWidth=r*0.12;ctx.stroke()
  // C ring (dark)
  ctx.beginPath();ctx.arc(0,0,r*1.32,Math.PI,τ)
  ctx.strokeStyle='rgba(160,135,85,0.30)';ctx.lineWidth=r*0.16;ctx.stroke()
  // B ring (brightest)
  ctx.beginPath();ctx.arc(0,0,r*1.56,Math.PI,τ)
  ctx.strokeStyle='rgba(218,188,120,0.55)';ctx.lineWidth=r*0.26;ctx.stroke()
  // Cassini Division (gap)
  ctx.beginPath();ctx.arc(0,0,r*1.73,Math.PI,τ)
  ctx.strokeStyle='rgba(10,8,20,0.80)';ctx.lineWidth=r*0.06;ctx.stroke()
  // A ring
  ctx.beginPath();ctx.arc(0,0,r*1.88,Math.PI,τ)
  ctx.strokeStyle='rgba(200,172,108,0.44)';ctx.lineWidth=r*0.20;ctx.stroke()
  // Outer F ring (thin)
  ctx.beginPath();ctx.arc(0,0,r*2.02,Math.PI,τ)
  ctx.strokeStyle='rgba(185,158,95,0.18)';ctx.lineWidth=r*0.04;ctx.stroke()
  ctx.restore()

  // Planet body
  const sphere=ctx.createRadialGradient(-r*0.26,-r*0.26,0,0,0,r)
  sphere.addColorStop(0,'#fff0b8'); sphere.addColorStop(0.16,'#e8c040'); sphere.addColorStop(0.52,'#9a6018'); sphere.addColorStop(0.84,'#3e2008'); sphere.addColorStop(1,'#1a0c00')
  ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.fillStyle=sphere;ctx.fill()
  // Saturn bands
  ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.clip()
  const boff=(rot*r*0.40)%(r*2); ctx.globalAlpha=0.38
  ;[
    ['rgba(255,238,160,0.72)',0.05,0.10],['rgba(195,145,55,0.82)',0.10,0.20],
    ['rgba(248,225,140,0.65)',0.20,0.32],['rgba(188,138,48,0.78)',0.32,0.44],
    ['rgba(252,232,150,0.60)',0.44,0.58],['rgba(195,148,58,0.74)',0.58,0.70],
    ['rgba(248,225,138,0.62)',0.70,0.82],['rgba(185,135,45,0.72)',0.82,0.92],
    ['rgba(250,228,145,0.58)',0.92,1.00],
  ].forEach(([col,t0,t1]) => {
    const by=-r+(t0 as number)*r*2, h=(t1 as number-t0 as number)*r*2
    ctx.fillStyle=col as string
    ctx.fillRect(boff-r*3,by,r*6,h); ctx.fillRect(boff-r*3-r*2,by,r*6,h)
  })
  ctx.globalAlpha=1; ctx.restore()

  limbDarken(ctx,r); specular(ctx,r,la,0.26); nightSide(ctx,r,la)

  // Ring system — front half (in front of planet)
  ctx.save(); ctx.scale(1, 0.30)
  ctx.beginPath();ctx.arc(0,0,r*1.18,0,Math.PI)
  ctx.strokeStyle='rgba(180,155,100,0.16)';ctx.lineWidth=r*0.12;ctx.stroke()
  ctx.beginPath();ctx.arc(0,0,r*1.32,0,Math.PI)
  ctx.strokeStyle='rgba(160,135,85,0.38)';ctx.lineWidth=r*0.16;ctx.stroke()
  ctx.beginPath();ctx.arc(0,0,r*1.56,0,Math.PI)
  ctx.strokeStyle='rgba(218,188,120,0.68)';ctx.lineWidth=r*0.26;ctx.stroke()
  ctx.beginPath();ctx.arc(0,0,r*1.73,0,Math.PI)
  ctx.strokeStyle='rgba(10,8,20,0.85)';ctx.lineWidth=r*0.06;ctx.stroke()
  ctx.beginPath();ctx.arc(0,0,r*1.88,0,Math.PI)
  ctx.strokeStyle='rgba(200,172,108,0.55)';ctx.lineWidth=r*0.20;ctx.stroke()
  ctx.beginPath();ctx.arc(0,0,r*2.02,0,Math.PI)
  ctx.strokeStyle='rgba(185,158,95,0.22)';ctx.lineWidth=r*0.04;ctx.stroke()
  ctx.restore()
}

// Uranus — pale teal, nearly featureless, unique tilted equatorial ring
function drawUranus(ctx: CanvasRenderingContext2D, r: number, rot: number, la: number) {
  const haze=ctx.createRadialGradient(0,0,r*0.80,0,0,r*1.75)
  haze.addColorStop(0,'rgba(100,210,225,0.22)'); haze.addColorStop(1,'rgba(60,180,200,0)')
  ctx.beginPath();ctx.arc(0,0,r*1.75,0,τ);ctx.fillStyle=haze;ctx.fill()
  // Equatorial ring (tilted — unique to Uranus, drawn as near-circular ellipse)
  ctx.save(); ctx.scale(1,0.22)
  ctx.beginPath();ctx.arc(0,0,r*1.65,0,τ)
  ctx.strokeStyle='rgba(140,210,220,0.50)';ctx.lineWidth=r*0.12;ctx.stroke()
  ctx.restore()
  const body=ctx.createRadialGradient(-r*0.26,-r*0.26,0,0,0,r)
  body.addColorStop(0,'#caf0f8'); body.addColorStop(0.28,'#48c4d8'); body.addColorStop(0.68,'#0e8090'); body.addColorStop(1,'#022c34')
  ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.fillStyle=body;ctx.fill()
  // Very subtle band (Uranus is nearly featureless)
  ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.clip()
  ctx.rotate(rot); ctx.globalAlpha=0.10
  ;[[0.30,r*0.15],[0.60,r*0.14]].forEach(([f,h]) => {
    const by=-r+(f as number)*r*2
    ctx.fillStyle='rgba(160,240,252,0.70)'
    ctx.fillRect(-r*4,by,r*8,h as number)
  })
  ctx.globalAlpha=1; ctx.restore()
  limbDarken(ctx,r); specular(ctx,r,la,0.38); nightSide(ctx,r,la)
}

// Neptune — vivid deep blue, visible storm band
function drawNeptune(ctx: CanvasRenderingContext2D, r: number, rot: number, la: number) {
  const haze=ctx.createRadialGradient(0,0,r*0.78,0,0,r*1.85)
  haze.addColorStop(0,'rgba(30,80,210,0.24)'); haze.addColorStop(1,'rgba(15,50,180,0)')
  ctx.beginPath();ctx.arc(0,0,r*1.85,0,τ);ctx.fillStyle=haze;ctx.fill()
  const body=ctx.createRadialGradient(-r*0.26,-r*0.26,0,0,0,r)
  body.addColorStop(0,'#90caf9'); body.addColorStop(0.22,'#1565c0'); body.addColorStop(0.58,'#0d2e8a'); body.addColorStop(0.88,'#071660'); body.addColorStop(1,'#020822')
  ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.fillStyle=body;ctx.fill()
  ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.clip()
  const boff=(rot*r*0.58)%(r*2)
  // Storm bands + Great Dark Spot
  ctx.globalAlpha=0.35
  ;[['rgba(65,105,230,0.80)',0.20,0.29],['rgba(50,88,210,0.72)',0.52,0.62],['rgba(60,98,220,0.75)',0.74,0.82]].forEach(([col,t0,t1]) => {
    const by=-r+(t0 as number)*r*2, h=(t1 as number-t0 as number)*r*2
    ctx.fillStyle=col as string
    ctx.fillRect(boff-r*3,by,r*6,h); ctx.fillRect(boff-r*3-r*2,by,r*6,h)
  })
  ctx.globalAlpha=1
  // Great Dark Spot
  ctx.save(); ctx.rotate(rot*0.90); ctx.translate(r*0.40,-r*0.05); ctx.scale(1.50,0.78)
  const gds=ctx.createRadialGradient(0,0,0,0,0,r*0.18)
  gds.addColorStop(0,'rgba(15,40,130,0.95)'); gds.addColorStop(0.5,'rgba(20,55,160,0.65)'); gds.addColorStop(1,'rgba(25,65,180,0)')
  ctx.beginPath();ctx.arc(0,0,r*0.18,0,τ);ctx.fillStyle=gds;ctx.fill(); ctx.restore()
  ctx.restore()
  limbDarken(ctx,r); specular(ctx,r,la,0.38); nightSide(ctx,r,la)
}

// Moon
function drawMoon(ctx: CanvasRenderingContext2D, mx: number, my: number, r: number, la: number) {
  ctx.save(); ctx.translate(mx, my)
  const body=ctx.createRadialGradient(-r*0.24,-r*0.24,0,0,0,r)
  body.addColorStop(0,'#d0c8bc'); body.addColorStop(0.48,'#9a9080'); body.addColorStop(1,'#26221c')
  ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.fillStyle=body;ctx.fill()
  ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,τ);ctx.clip();ctx.globalAlpha=0.22
  ;[[ r*0.18, r*0.10,r*0.14],[-r*0.22, r*0.15,r*0.10]].forEach(([cx,cy,cr]) => {
    ctx.beginPath();ctx.arc(cx,cy,cr,0,τ);ctx.fillStyle='rgba(50,44,36,0.80)';ctx.fill()
  })
  ctx.globalAlpha=1; ctx.restore()
  limbDarken(ctx,r); specular(ctx,r,la,0.26); nightSide(ctx,r,la)
  ctx.restore()
}

// ─── Planet render + label dispatch ──────────────────────────────────────────

function renderPlanet(ctx: CanvasRenderingContext2D, p: PlanetDef, ts: number) {
  const angle = p.startAngle + ts * p.speed
  const px    = SX + Math.cos(angle) * p.a * sc
  const py    = SY + Math.sin(angle) * p.a * sc * TILT
  const rot   = p.rotOffset + ts * p.rotSpeed
  const r     = p.r * sc
  const la    = Math.atan2(SY - py, SX - px)  // direction from planet toward sun

  ctx.save(); ctx.translate(px, py)

  if      (p.type === 'mercury') drawMercury(ctx, r, rot, la)
  else if (p.type === 'venus'  ) drawVenus  (ctx, r, rot, la)
  else if (p.type === 'earth'  ) drawEarth  (ctx, r, rot, la)
  else if (p.type === 'mars'   ) drawMars   (ctx, r, rot, la)
  else if (p.type === 'jupiter') drawJupiter(ctx, r, rot, la)
  else if (p.type === 'saturn' ) drawSaturn (ctx, r, rot, la)
  else if (p.type === 'uranus' ) drawUranus (ctx, r, rot, la)
  else                           drawNeptune(ctx, r, rot, la)

  // Label — positioned below planet (account for rings on Saturn/Uranus)
  const ringExtra = p.type === 'saturn' ? r*2.02*0.30 : p.type === 'uranus' ? r*1.65*0.22 : 0
  drawLabel(ctx, p.name, r + ringExtra + 16)

  // Moon (Earth only)
  if (p.moon) {
    const mAng = p.moon.startAngle + ts * p.moon.speed
    const mx   = Math.cos(mAng) * p.moon.orbitR * sc
    const my   = Math.sin(mAng) * p.moon.orbitR * sc * 0.50
    const mla  = Math.atan2(-my - (SY - py), -mx - (SX - px))  // moon light from sun too
    drawMoon(ctx, mx, my, p.moon.r * sc, la)
    // Moon label
    ctx.save(); ctx.translate(mx, my)
    drawLabel(ctx, 'Moon', p.moon.r * sc + 11)
    ctx.restore()
  }

  ctx.restore()
}

// ─── Frame loop ───────────────────────────────────────────────────────────────

function frame(ts: number) {
  raf = requestAnimationFrame(frame)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, W, H)
  drawBackground(ctx)
  drawStars(ctx)
  updateShooting(ctx)
  drawOrbits(ctx)

  // Depth sort: render back-to-front with sun as occluder
  const sorted = planets
    .map(p => ({ p, py: SY + Math.sin(p.startAngle + ts*p.speed) * p.a * sc * TILT }))
    .sort((a, b) => a.py - b.py)

  // Planets + asteroids behind the sun
  drawAsteroidBelt(ctx, ts, false)
  for (const { p, py } of sorted) if (py < SY) renderPlanet(ctx, p, ts)

  drawSun(ctx, ts)

  // Planets + asteroids in front of the sun
  drawAsteroidBelt(ctx, ts, true)
  for (const { p, py } of sorted) if (py >= SY) renderPlanet(ctx, p, ts)
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
