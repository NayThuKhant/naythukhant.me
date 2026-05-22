<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const score    = ref(0)
const lives    = ref(3)
const state    = ref<'idle' | 'playing' | 'over'>('idle')

const W = 400, H = 400
const LIFE_MAX = 3
const τ = Math.PI * 2

const PLANET_X = W / 2
const PLANET_Y = H / 2
const PLANET_R = 28
const SHIELD_R = 90
const SHIELD_ARC = 80 * (Math.PI / 180)
const SHIELD_SPEED = 2.6 * (Math.PI / 180)

interface Meteor {
  x: number; y: number
  vx: number; vy: number
  r: number; fill: string; glow: string
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
let shieldAngle = -Math.PI / 2
let meteors: Meteor[] = []
let spawnTimer = 0
let spawnInterval = 1500
let speedMult = 1
let lastTs = 0
let leftDown = false
let rightDown = false
let particles: Particle[] = []
let popups: ScorePopup[] = []
let planetFlash = 0       // planet hit-flash frames
let deathAnim = 0

const METEOR_COLORS = [
  { fill: '#f472b6', glow: '#f472b6' },
  { fill: '#f97316', glow: '#f97316' },
  { fill: '#ef4444', glow: '#ef4444' },
]

function spawnParticles(x: number, y: number, color: string, n = 7) {
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * τ
    const spd = 1.5 + Math.random() * 3
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
    p.vy += 0.05
    p.age++
  }
  particles = particles.filter(p => p.age < p.maxAge)
}

function drawParticles(ctx: CanvasRenderingContext2D) {
  for (const p of particles) {
    const alpha = 1 - p.age / p.maxAge
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    ctx.shadowColor = p.color
    ctx.shadowBlur = 6
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, τ)
    ctx.fill()
    ctx.restore()
  }
}

function drawPopups(ctx: CanvasRenderingContext2D) {
  for (const pop of popups) {
    const alpha = 1 - pop.age / pop.maxAge
    const dy = -30 * (pop.age / pop.maxAge)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.shadowColor = '#ffd700'
    ctx.shadowBlur = 8
    ctx.fillStyle = '#ffd700'
    ctx.font = "bold 13px 'Courier New', monospace"
    ctx.textAlign = 'center'
    ctx.fillText(pop.text, pop.x, pop.y + dy)
    ctx.restore()
    pop.age++
  }
  popups = popups.filter(p => p.age < p.maxAge)
}

function newMeteor(): Meteor {
  const c = METEOR_COLORS[Math.floor(Math.random() * METEOR_COLORS.length)]!
  const r = 8 + Math.random() * 8
  const edge = Math.floor(Math.random() * 4)
  let x = 0, y = 0
  if (edge === 0) { x = Math.random() * W; y = -r }
  else if (edge === 1) { x = W + r; y = Math.random() * H }
  else if (edge === 2) { x = Math.random() * W; y = H + r }
  else { x = -r; y = Math.random() * H }
  const dx = PLANET_X - x
  const dy = PLANET_Y - y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const baseSpeed = (1.4 + Math.random() * 0.8) * speedMult
  return { x, y, vx: (dx / dist) * baseSpeed, vy: (dy / dist) * baseSpeed, r, fill: c.fill, glow: c.glow }
}

function shieldHit(m: Meteor): boolean {
  const dx = m.x - PLANET_X
  const dy = m.y - PLANET_Y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > SHIELD_R + m.r + 4 || dist < SHIELD_R - m.r - 4) return false
  const angle = Math.atan2(dy, dx)
  let diff = angle - shieldAngle
  while (diff > Math.PI) diff -= τ
  while (diff < -Math.PI) diff += τ
  return Math.abs(diff) <= SHIELD_ARC / 2
}

function planetHit(m: Meteor): boolean {
  const dx = m.x - PLANET_X
  const dy = m.y - PLANET_Y
  return Math.sqrt(dx * dx + dy * dy) < PLANET_R + m.r
}

function drawStars(ctx: CanvasRenderingContext2D, ts: number) {
  ctx.fillStyle = 'rgba(200,220,255,0.18)'
  for (let i = 0; i < 50; i++) {
    const sx = (i * 83 + ts * 0.003) % W
    const sy = (i * 157 + ts * 0.001) % H
    ctx.fillRect(sx, sy, 1.5, 1.5)
  }
}

function drawPlanet(ctx: CanvasRenderingContext2D, ts: number) {
  const pulse = 0.7 + 0.3 * Math.sin(ts * 0.002)
  ctx.save()
  ctx.shadowColor = '#00ff88'
  ctx.shadowBlur = 30 * pulse
  const grad = ctx.createRadialGradient(PLANET_X - 8, PLANET_Y - 8, 2, PLANET_X, PLANET_Y, PLANET_R)
  grad.addColorStop(0, '#a3ffcf')
  grad.addColorStop(0.5, '#00ff88')
  grad.addColorStop(1, '#004d2a')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(PLANET_X, PLANET_Y, PLANET_R, 0, τ)
  ctx.fill()
  // Hit flash overlay
  if (planetFlash > 0) {
    ctx.globalAlpha = 0.7 * (planetFlash / 6)
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = '#ffffff'
    ctx.shadowBlur = 24
    ctx.beginPath()
    ctx.arc(PLANET_X, PLANET_Y, PLANET_R + 4, 0, τ)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  ctx.restore()
  ctx.save()
  ctx.strokeStyle = 'rgba(0,255,136,0.25)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(PLANET_X, PLANET_Y, PLANET_R + 5, 0, τ)
  ctx.stroke()
  ctx.restore()
}

function drawShield(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.shadowColor = '#00d4ff'
  ctx.shadowBlur = 18
  ctx.strokeStyle = '#00d4ff'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(PLANET_X, PLANET_Y, SHIELD_R, shieldAngle - SHIELD_ARC / 2, shieldAngle + SHIELD_ARC / 2)
  ctx.stroke()
  ctx.shadowBlur = 8
  ctx.strokeStyle = 'rgba(180,240,255,0.9)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(PLANET_X, PLANET_Y, SHIELD_R, shieldAngle - SHIELD_ARC / 4, shieldAngle + SHIELD_ARC / 4)
  ctx.stroke()
  ctx.restore()
}

function drawMeteors(ctx: CanvasRenderingContext2D) {
  for (const m of meteors) {
    ctx.save()
    ctx.shadowColor = m.glow
    ctx.shadowBlur = 20
    const grad = ctx.createRadialGradient(m.x - m.r * 0.3, m.y - m.r * 0.3, 0, m.x, m.y, m.r)
    grad.addColorStop(0, 'rgba(255,255,255,0.9)')
    grad.addColorStop(0.35, m.fill)
    grad.addColorStop(1, 'rgba(0,0,0,0.2)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(m.x, m.y, m.r, 0, τ)
    ctx.fill()
    ctx.restore()
  }
}

function frame(ts: number) {
  raf = requestAnimationFrame(frame)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return
  const dt = Math.min(ts - lastTs, 50)
  lastTs = ts

  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, W, H)
  drawStars(ctx, ts)

  if (state.value === 'playing') {
    if (leftDown)  shieldAngle -= SHIELD_SPEED * dt * 0.06
    if (rightDown) shieldAngle += SHIELD_SPEED * dt * 0.06

    spawnTimer += dt
    if (spawnTimer > spawnInterval) {
      meteors.push(newMeteor())
      spawnTimer = 0
      spawnInterval = Math.max(700, spawnInterval - 15)
      speedMult = Math.min(2.8, speedMult + 0.04)
    }

    const toRemove: number[] = []
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i]!
      m.x += m.vx
      m.y += m.vy

      if (shieldHit(m)) {
        // Particle burst on shield hit
        spawnParticles(m.x, m.y, m.fill, 8)
        spawnPopup(m.x, m.y - 20, '+1')
        toRemove.push(i)
        score.value++
      } else if (planetHit(m)) {
        // Planet hit flash + particles
        spawnParticles(m.x, m.y, m.fill, 6)
        planetFlash = 6
        toRemove.push(i)
        lives.value = Math.max(0, lives.value - 1)
        if (lives.value <= 0) {
          deathAnim = 1
          state.value = 'over'
        }
      } else {
        const dx = m.x - PLANET_X
        const dy = m.y - PLANET_Y
        if (Math.sqrt(dx * dx + dy * dy) > 350) toRemove.push(i)
      }
    }
    for (const i of toRemove) meteors.splice(i, 1)
    if (planetFlash > 0) planetFlash--
  }

  drawPlanet(ctx, ts)
  drawShield(ctx)
  drawMeteors(ctx)

  // Particles + popups
  updateParticles()
  drawParticles(ctx)
  drawPopups(ctx)

  // Death ring expanding from planet
  if (deathAnim > 0 && deathAnim <= 20) {
    const t = deathAnim / 20
    const r = PLANET_R + t * 80
    ctx.save()
    ctx.globalAlpha = (1 - t) * 0.9
    ctx.strokeStyle = '#ef4444'
    ctx.shadowColor = '#ef4444'
    ctx.shadowBlur = 24
    ctx.lineWidth = 4 * (1 - t) + 1
    ctx.beginPath()
    ctx.arc(PLANET_X, PLANET_Y, r, 0, τ)
    ctx.stroke()
    ctx.restore()
    deathAnim++
  }

  // Overlays
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.82)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    const pulse = 0.6 + 0.4 * Math.sin(ts * 0.003)
    ctx.save()
    ctx.shadowColor = '#00ff88'
    ctx.shadowBlur  = 20 + 14 * pulse
    ctx.fillStyle   = `rgba(0,255,136,${0.7 + 0.3 * pulse})`
    ctx.font = "bold 26px 'Space Grotesk', sans-serif"
    ctx.fillText('ORBIT SHIELD', W / 2, H / 2 - 28)
    ctx.restore()
    ctx.fillStyle = 'rgba(200,220,255,0.55)'
    ctx.font = "13px 'Courier New', monospace"
    ctx.fillText('Rotate the shield to defend your planet', W / 2, H / 2 + 8)
    if (Math.floor(ts / 600) % 2 === 0) {
      ctx.fillStyle = 'rgba(200,220,255,0.35)'
      ctx.font = "12px 'Courier New', monospace"
      ctx.fillText('Press Space to start', W / 2, H / 2 + 30)
    }
  }
}

function startGame() {
  meteors = []
  spawnTimer = 0
  spawnInterval = 1500
  speedMult = 1
  shieldAngle = -Math.PI / 2
  score.value = 0
  lives.value = LIFE_MAX
  particles = []
  popups = []
  planetFlash = 0
  deathAnim = 0
  state.value = 'playing'
}

function restart() {
  meteors = []
  spawnTimer = 0
  spawnInterval = 1500
  speedMult = 1
  shieldAngle = -Math.PI / 2
  score.value = 0
  lives.value = LIFE_MAX
  particles = []
  popups = []
  planetFlash = 0
  deathAnim = 0
  state.value = 'playing'
}

function onKey(e: KeyboardEvent) {
  if (e.key === ' ' || e.key === 'Space') {
    e.preventDefault()
    if (state.value === 'idle') startGame()
    return
  }
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); leftDown = true }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); rightDown = true }
}

function onKeyUp(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') leftDown = false
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') rightDown = false
}

function onTouchStart(e: TouchEvent) {
  e.preventDefault()
  if (state.value === 'idle') { startGame(); return }
  if (state.value === 'over') return
  const rect = canvasEl.value!.getBoundingClientRect()
  for (const t of Array.from(e.changedTouches)) {
    const cx = t.clientX - rect.left
    if (cx < rect.width / 2) leftDown = true
    else rightDown = true
  }
}

function onTouchEnd(e: TouchEvent) {
  e.preventDefault()
  const rect = canvasEl.value!.getBoundingClientRect()
  leftDown = false
  rightDown = false
  for (const t of Array.from(e.touches)) {
    const cx = t.clientX - rect.left
    if (cx < rect.width / 2) leftDown = true
    else rightDown = true
  }
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
        <p class="hud-label text-[10px]">LIVES</p>
        <p class="font-mono font-bold text-neon-pink text-lg leading-tight">
          <span v-for="i in LIFE_MAX" :key="i" :class="i <= lives ? 'opacity-100' : 'opacity-20'">♥</span>
        </p>
      </div>
    </div>
    <div class="relative">
      <canvas
        ref="canvasEl"
        class="rounded-xl border border-white/10 block touch-none"
        @touchstart="onTouchStart"
        @touchend="onTouchEnd"
      />
      <GameResultOverlay :state="state" :score="score" @restart="restart" />
    </div>
    <p class="font-mono text-xs text-slate-600">← → to rotate shield • protect your planet</p>
  </div>
</template>
