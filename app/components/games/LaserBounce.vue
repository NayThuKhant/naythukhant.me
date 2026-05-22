<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const score    = ref(0)
const level    = ref(1)
const shots    = ref(15)
const state    = ref<'idle' | 'playing' | 'over'>('idle')

const W = 400, H = 400
const τ = Math.PI * 2
const MAX_SHOTS = 15
const MAX_BOUNCES = 6
const LASER_SPEED = 7
const EMITTER_X = W / 2
const EMITTER_Y = H - 20
const EMITTER_R = 12
const TARGET_R = 14

interface Target { x: number; y: number; alive: boolean; flashFrames: number }
interface LaserSeg { x1: number; y1: number; x2: number; y2: number }
interface ActiveLaser {
  x: number; y: number
  vx: number; vy: number
  bounces: number
  trail: { x: number; y: number }[]
  dead: boolean
}

// --- Particle / popup interfaces ---
interface Particle {
  x: number; y: number
  vx: number; vy: number
  age: number; maxAge: number
  color: string; size: number
}
interface ScorePopup {
  x: number; y: number
  age: number; maxAge: number
  text: string
}

let raf = 0
let targets: Target[] = []
let activeLasers: ActiveLaser[] = []
let aimAngle = -Math.PI / 2
let aimLeft  = false
let aimRight = false
let lastTs   = 0
let particles: Particle[] = []
let popups: ScorePopup[] = []

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

function spawnParticles(x: number, y: number, color: string, n = 7) {
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * τ
    const spd = 2 + Math.random() * 3
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      age: 0, maxAge: 20 + Math.floor(Math.random() * 10),
      color, size: 1.5 + Math.random() * 2.5,
    })
  }
}

function spawnPopup(x: number, y: number, text: string) {
  popups.push({ x, y, age: 0, maxAge: 40, text })
}

function updateParticles() {
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy
    p.vy += 0.06
    p.age++
  }
  particles = particles.filter(p => p.age < p.maxAge)
}

function drawParticles(ctx: CanvasRenderingContext2D) {
  if (!particles.length) return
  ctx.save()
  ctx.shadowBlur = 6
  for (const p of particles) {
    ctx.globalAlpha = 1 - p.age / p.maxAge
    ctx.fillStyle = p.color
    ctx.shadowColor = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, τ)
    ctx.fill()
  }
  ctx.restore()
}

function drawPopups(ctx: CanvasRenderingContext2D) {
  if (!popups.length) return
  ctx.save()
  ctx.shadowColor = '#ffd700'
  ctx.shadowBlur = 8
  ctx.fillStyle = '#ffd700'
  ctx.font = "bold 13px 'Courier New', monospace"
  ctx.textAlign = 'center'
  for (const pop of popups) {
    ctx.globalAlpha = 1 - pop.age / pop.maxAge
    ctx.fillText(pop.text, pop.x, pop.y - 30 * (pop.age / pop.maxAge))
    pop.age++
  }
  ctx.restore()
  popups = popups.filter(p => p.age < p.maxAge)
}

function spawnTargets() {
  const count = 5 + Math.min(3, level.value - 1)
  targets = []
  for (let i = 0; i < count; i++) {
    let x: number, y: number, ok: boolean
    let attempts = 0
    do {
      x = TARGET_R + Math.random() * (W - TARGET_R * 2)
      y = TARGET_R + 30 + Math.random() * (H * 0.65)
      ok = targets.every(t => Math.hypot(t.x - x, t.y - y) > TARGET_R * 3.5)
      attempts++
    } while (!ok && attempts < 50)
    targets.push({ x, y, alive: true, flashFrames: 0 })
  }
}

function previewPath(startX: number, startY: number, angle: number): LaserSeg[] {
  const segs: LaserSeg[] = []
  let x = startX, y = startY
  let vx = Math.cos(angle), vy = Math.sin(angle)
  for (let b = 0; b <= MAX_BOUNCES; b++) {
    let tMin = Infinity
    let nx = vx, ny = vy
    if (vx > 0) { const t = (W - x) / vx; if (t > 0.01 && t < tMin) { tMin = t; nx = -vx; ny = vy } }
    if (vx < 0) { const t = (0 - x) / vx; if (t > 0.01 && t < tMin) { tMin = t; nx = -vx; ny = vy } }
    if (vy > 0) { const t = (H - y) / vy; if (t > 0.01 && t < tMin) { tMin = t; nx = vx; ny = -vy } }
    if (vy < 0) { const t = (0 - y) / vy; if (t > 0.01 && t < tMin) { tMin = t; nx = vx; ny = -vy } }
    if (!isFinite(tMin)) break
    const ex = x + vx * tMin
    const ey = y + vy * tMin
    segs.push({ x1: x, y1: y, x2: ex, y2: ey })
    x = ex; y = ey
    vx = nx; vy = ny
  }
  return segs
}

function fireLaser() {
  if (shots.value <= 0 || state.value !== 'playing') return
  shots.value--
  const vx = Math.cos(aimAngle) * LASER_SPEED
  const vy = Math.sin(aimAngle) * LASER_SPEED
  activeLasers.push({
    x: EMITTER_X, y: EMITTER_Y,
    vx, vy,
    bounces: 0,
    trail: [{ x: EMITTER_X, y: EMITTER_Y }],
    dead: false,
  })
}

function startGame() {
  score.value = 0
  level.value = 1
  shots.value = MAX_SHOTS
  activeLasers = []
  aimAngle = -Math.PI / 2
  particles = []
  popups = []
  spawnTargets()
  state.value = 'playing'
}

function restart() {
  score.value = 0
  level.value = 1
  shots.value = MAX_SHOTS
  activeLasers = []
  targets = []
  aimAngle = -Math.PI / 2
  particles = []
  popups = []
  spawnTargets()
  state.value = 'playing'
}

function nextLevel() {
  level.value++
  shots.value = MAX_SHOTS
  activeLasers = []
  spawnTargets()
}

function updateLaser(laser: ActiveLaser) {
  if (laser.dead) return
  const steps = 3
  for (let s = 0; s < steps; s++) {
    laser.x += laser.vx / steps
    laser.y += laser.vy / steps

    // Wall bounce — spawn small particles at bounce point
    if (laser.x <= 0) {
      laser.x = 0; laser.vx = Math.abs(laser.vx); laser.bounces++
      spawnParticles(0, laser.y, '#00d4ff', 3)
    }
    if (laser.x >= W) {
      laser.x = W; laser.vx = -Math.abs(laser.vx); laser.bounces++
      spawnParticles(W, laser.y, '#00d4ff', 3)
    }
    if (laser.y <= 0) {
      laser.y = 0; laser.vy = Math.abs(laser.vy); laser.bounces++
      spawnParticles(laser.x, 0, '#00d4ff', 3)
    }
    if (laser.y >= H) {
      laser.y = H; laser.vy = -Math.abs(laser.vy); laser.bounces++
      spawnParticles(laser.x, H, '#00d4ff', 3)
    }

    for (const t of targets) {
      if (!t.alive || t.flashFrames > 0) continue
      if ((laser.x - t.x) ** 2 + (laser.y - t.y) ** 2 <= (TARGET_R + 4) ** 2) {
        t.flashFrames = 12
        t.alive = false
        score.value++
        // Burst of pink particles + popup on target hit
        spawnParticles(t.x, t.y, '#f472b6', 8)
        spawnPopup(t.x, t.y - 20, '+1')
        laser.dead = true
        break
      }
    }

    if (laser.bounces > MAX_BOUNCES) { laser.dead = true; break }
  }
  laser.trail.push({ x: laser.x, y: laser.y })
  if (laser.trail.length > 40) laser.trail.shift()
}

function drawEmitter(ctx: CanvasRenderingContext2D) {
  const tipX = EMITTER_X + Math.cos(aimAngle) * (EMITTER_R + 8)
  const tipY = EMITTER_Y + Math.sin(aimAngle) * (EMITTER_R + 8)

  ctx.save()
  ctx.shadowColor = '#a855f7'
  ctx.shadowBlur = 16
  ctx.strokeStyle = '#a855f7'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(EMITTER_X, EMITTER_Y)
  ctx.lineTo(tipX, tipY)
  ctx.stroke()
  ctx.fillStyle = '#a855f7'
  ctx.beginPath()
  ctx.arc(EMITTER_X, EMITTER_Y, EMITTER_R, 0, τ)
  ctx.fill()
  ctx.shadowBlur = 6
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(EMITTER_X, EMITTER_Y, EMITTER_R * 0.4, 0, τ)
  ctx.fill()
  ctx.restore()
}

function drawPreview(ctx: CanvasRenderingContext2D) {
  const segs = previewPath(EMITTER_X, EMITTER_Y, aimAngle)
  ctx.save()
  ctx.strokeStyle = 'rgba(168,85,247,0.35)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 6])
  for (const seg of segs) {
    ctx.beginPath()
    ctx.moveTo(seg.x1, seg.y1)
    ctx.lineTo(seg.x2, seg.y2)
    ctx.stroke()
  }
  ctx.setLineDash([])
  ctx.restore()
}

function drawTargets(ctx: CanvasRenderingContext2D) {
  for (const t of targets) {
    if (!t.alive && t.flashFrames === 0) continue
    ctx.save()
    const flash = t.flashFrames > 0
    const col = flash ? '#ffffff' : '#f472b6'
    ctx.shadowColor = flash ? '#ffffff' : '#f472b6'
    ctx.shadowBlur = flash ? 30 : 18
    ctx.strokeStyle = col
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(t.x, t.y, TARGET_R, 0, τ)
    ctx.stroke()
    ctx.fillStyle = flash ? 'rgba(255,255,255,0.6)' : 'rgba(244,114,182,0.25)'
    ctx.beginPath()
    ctx.arc(t.x, t.y, TARGET_R - 3, 0, τ)
    ctx.fill()
    ctx.fillStyle = col
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.arc(t.x, t.y, 4, 0, τ)
    ctx.fill()
    ctx.strokeStyle = col
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(t.x - TARGET_R + 3, t.y)
    ctx.lineTo(t.x + TARGET_R - 3, t.y)
    ctx.moveTo(t.x, t.y - TARGET_R + 3)
    ctx.lineTo(t.x, t.y + TARGET_R - 3)
    ctx.stroke()
    ctx.restore()
  }
}

function drawLasers(ctx: CanvasRenderingContext2D) {
  if (!activeLasers.length) return
  ctx.save()
  ctx.lineCap = 'round'
  ctx.shadowColor = '#00d4ff'
  for (const laser of activeLasers) {
    const n = laser.trail.length
    if (n < 2) continue
    const dead = laser.dead
    ctx.lineWidth = dead ? 1 : 2.5
    const mid = Math.floor(n * 0.5)

    // Faded tail — one path call
    if (mid >= 1) {
      ctx.strokeStyle = dead ? 'rgba(0,212,255,0.15)' : 'rgba(0,212,255,0.28)'
      ctx.shadowBlur = dead ? 2 : 5
      ctx.beginPath()
      ctx.moveTo(laser.trail[0]!.x, laser.trail[0]!.y)
      for (let i = 1; i <= mid; i++) ctx.lineTo(laser.trail[i]!.x, laser.trail[i]!.y)
      ctx.stroke()
    }

    // Bright head — one path call
    ctx.strokeStyle = dead ? 'rgba(0,212,255,0.45)' : 'rgba(0,212,255,0.9)'
    ctx.shadowBlur = dead ? 5 : 14
    ctx.beginPath()
    ctx.moveTo(laser.trail[mid]!.x, laser.trail[mid]!.y)
    for (let i = mid + 1; i < n; i++) ctx.lineTo(laser.trail[i]!.x, laser.trail[i]!.y)
    ctx.stroke()
  }
  ctx.restore()
}

function frame(ts: number) {
  raf = requestAnimationFrame(frame)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return
  const dt = lastTs === 0 ? 16 : Math.min(ts - lastTs, 50)
  lastTs = ts

  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = 'rgba(200,220,255,0.10)'
  for (let i = 0; i < 50; i++) {
    const sx = (i * 83 + ts * 0.002) % W
    const sy = (i * 157) % H
    ctx.fillRect(sx, sy, 1.5, 1.5)
  }

  ctx.save()
  ctx.strokeStyle = 'rgba(0,212,255,0.2)'
  ctx.lineWidth = 3
  ctx.shadowColor = '#00d4ff'
  ctx.shadowBlur = 8
  ctx.strokeRect(1.5, 1.5, W - 3, H - 3)
  ctx.restore()

  if (state.value === 'playing') {
    const ROT_SPEED = 0.04
    if (aimLeft)  aimAngle = clamp(aimAngle - ROT_SPEED, -Math.PI + 0.08, -0.08)
    if (aimRight) aimAngle = clamp(aimAngle + ROT_SPEED, -Math.PI + 0.08, -0.08)

    for (const laser of activeLasers) {
      if (!laser.dead) updateLaser(laser)
      else laser.trail.shift()
    }
    activeLasers = activeLasers.filter(l => l.trail.length > 0)

    for (const t of targets) {
      if (t.flashFrames > 0) t.flashFrames--
    }

    const alive = targets.filter(t => t.alive)
    if (alive.length === 0) {
      nextLevel()
      return
    }
    if (shots.value <= 0 && activeLasers.length === 0) {
      state.value = 'over'
    }
  }

  drawPreview(ctx)
  drawTargets(ctx)
  drawLasers(ctx)
  if (state.value === 'playing') drawEmitter(ctx)

  // Particles + popups
  updateParticles()
  drawParticles(ctx)
  drawPopups(ctx)

  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.82)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    const pulse = 0.6 + 0.4 * Math.sin(ts * 0.003)
    ctx.fillStyle = `rgba(244,114,182,${0.7 + 0.3 * pulse})`
    ctx.shadowColor = '#f472b6'
    ctx.shadowBlur = 20 + 14 * pulse
    ctx.font = "bold 26px 'Space Grotesk', sans-serif"
    ctx.fillText('LASER BOUNCE', W / 2, H / 2 - 32)
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(200,220,255,0.55)'
    ctx.font = "13px 'Courier New', monospace"
    ctx.fillText('Bounce lasers off walls to hit targets', W / 2, H / 2 + 6)
    if (Math.floor(ts / 600) % 2 === 0) {
      ctx.fillStyle = 'rgba(200,220,255,0.35)'
      ctx.font = "12px 'Courier New', monospace"
      ctx.fillText('Click or press Space to start', W / 2, H / 2 + 30)
    }
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft')  { e.preventDefault(); if (state.value === 'playing') aimLeft = true }
  if (e.key === 'ArrowRight') { e.preventDefault(); if (state.value === 'playing') aimRight = true }
  if (e.key === ' ') {
    e.preventDefault()
    if (state.value === 'idle') { startGame(); return }
    if (state.value === 'over') return
    fireLaser()
  }
}

function onKeyUp(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft')  aimLeft = false
  if (e.key === 'ArrowRight') aimRight = false
}

function onClick(e: MouseEvent) {
  if (state.value === 'idle') { startGame(); return }
  if (state.value !== 'playing') return
  if (!canvasEl.value) return
  const rect = canvasEl.value.getBoundingClientRect()
  const px = (e.clientX - rect.left) * (W / rect.width)
  const py = (e.clientY - rect.top) * (H / rect.height)
  const angle = Math.atan2(py - EMITTER_Y, px - EMITTER_X)
  aimAngle = clamp(angle, -Math.PI + 0.08, -0.08)
  fireLaser()
}

onMounted(() => {
  if (canvasEl.value) { canvasEl.value.width = W; canvasEl.value.height = H }
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKeyUp)
  raf = requestAnimationFrame(frame)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('keyup', onKeyUp)
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 select-none">
    <div class="glass-hud px-6 py-2 flex gap-6 items-center">
      <div class="text-center">
        <p class="hud-label text-[10px]">SCORE</p>
        <p class="font-mono font-bold text-white text-lg leading-tight">{{ score }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">LEVEL</p>
        <p class="font-mono font-bold text-white text-lg leading-tight">{{ level }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">SHOTS</p>
        <p class="font-mono font-bold text-lg leading-tight" :class="shots <= 5 ? 'text-red-400' : 'text-white'">{{ shots }}</p>
      </div>
    </div>
    <div class="relative">
      <canvas
        ref="canvasEl"
        class="rounded-xl border border-white/10 block cursor-crosshair touch-none"
        @click="onClick"
      />
      <GameResultOverlay :state="state" :score="score" :extra="`LVL ${level}`" @restart="restart" />
    </div>
    <p class="font-mono text-xs text-slate-600">← → to aim • Space to fire • bounce off walls</p>
  </div>
</template>
