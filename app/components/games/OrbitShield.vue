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
const SHIELD_R = 90      // orbit radius
const SHIELD_ARC = 80 * (Math.PI / 180)  // arc width in radians
const SHIELD_SPEED = 2.6 * (Math.PI / 180) // rotation per ms... actually per frame at 60fps

interface Meteor {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  fill: string
  glow: string
}

let raf = 0
let shieldAngle = -Math.PI / 2  // points up initially
let meteors: Meteor[] = []
let spawnTimer = 0
let spawnInterval = 1500
let speedMult = 1
let lastTs = 0
let leftDown = false
let rightDown = false

const METEOR_COLORS = [
  { fill: '#f472b6', glow: '#f472b6' },
  { fill: '#f97316', glow: '#f97316' },
  { fill: '#ef4444', glow: '#ef4444' },
]

function newMeteor(): Meteor {
  const c = METEOR_COLORS[Math.floor(Math.random() * METEOR_COLORS.length)]!
  const r = 8 + Math.random() * 8
  // Pick a random edge
  const edge = Math.floor(Math.random() * 4)
  let x = 0, y = 0
  if (edge === 0) { x = Math.random() * W; y = -r }           // top
  else if (edge === 1) { x = W + r; y = Math.random() * H }   // right
  else if (edge === 2) { x = Math.random() * W; y = H + r }   // bottom
  else { x = -r; y = Math.random() * H }                      // left

  const dx = PLANET_X - x
  const dy = PLANET_Y - y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const baseSpeed = (1.4 + Math.random() * 0.8) * speedMult
  return {
    x, y,
    vx: (dx / dist) * baseSpeed,
    vy: (dy / dist) * baseSpeed,
    r,
    fill: c.fill,
    glow: c.glow,
  }
}

function shieldHit(m: Meteor): boolean {
  // Distance from meteor center to planet center
  const dx = m.x - PLANET_X
  const dy = m.y - PLANET_Y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > SHIELD_R + m.r + 4 || dist < SHIELD_R - m.r - 4) return false
  // Angle of meteor relative to planet
  const angle = Math.atan2(dy, dx)
  // Normalize angle difference
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
  // Outer glow pulse
  const pulse = 0.7 + 0.3 * Math.sin(ts * 0.002)
  ctx.save()
  ctx.shadowColor = '#00ff88'
  ctx.shadowBlur = 30 * pulse
  // Planet body gradient
  const grad = ctx.createRadialGradient(PLANET_X - 8, PLANET_Y - 8, 2, PLANET_X, PLANET_Y, PLANET_R)
  grad.addColorStop(0, '#a3ffcf')
  grad.addColorStop(0.5, '#00ff88')
  grad.addColorStop(1, '#004d2a')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(PLANET_X, PLANET_Y, PLANET_R, 0, τ)
  ctx.fill()
  ctx.restore()
  // Atmosphere ring
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
  // Bright center cap
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
    // Rotate shield
    if (leftDown)  shieldAngle -= SHIELD_SPEED * dt * 0.06
    if (rightDown) shieldAngle += SHIELD_SPEED * dt * 0.06

    // Spawn meteors
    spawnTimer += dt
    if (spawnTimer > spawnInterval) {
      meteors.push(newMeteor())
      spawnTimer = 0
      spawnInterval = Math.max(700, spawnInterval - 15)
      speedMult = Math.min(2.8, speedMult + 0.04)
    }

    // Move meteors and check collisions
    const toRemove: number[] = []
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i]!
      m.x += m.vx
      m.y += m.vy

      if (shieldHit(m)) {
        toRemove.push(i)
        score.value++
      } else if (planetHit(m)) {
        toRemove.push(i)
        lives.value = Math.max(0, lives.value - 1)
        if (lives.value <= 0) state.value = 'over'
      } else {
        // Remove if out of a safe bound (missed everything)
        const dx = m.x - PLANET_X
        const dy = m.y - PLANET_Y
        if (Math.sqrt(dx * dx + dy * dy) > 350) toRemove.push(i)
      }
    }
    for (const i of toRemove) meteors.splice(i, 1)
  }

  drawPlanet(ctx, ts)
  drawShield(ctx)
  drawMeteors(ctx)

  // Overlays
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.82)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#00ff88'
    ctx.font = "bold 26px 'Space Grotesk', sans-serif"
    ctx.fillText('ORBIT SHIELD', W / 2, H / 2 - 28)
    ctx.fillStyle = 'rgba(200,220,255,0.55)'
    ctx.font = "13px 'Courier New', monospace"
    ctx.fillText('Rotate the shield to defend your planet', W / 2, H / 2 + 8)
    ctx.fillStyle = 'rgba(200,220,255,0.35)'
    ctx.font = "12px 'Courier New', monospace"
    ctx.fillText('Press Space to start', W / 2, H / 2 + 30)
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
  state.value = 'playing'
}

function onKey(e: KeyboardEvent) {
  if (e.key === ' ' || e.key === 'Space') {
    e.preventDefault()
    if (state.value === 'idle') startGame()
    else if (state.value === 'over') restart()
    return
  }
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    e.preventDefault()
    leftDown = true
  }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    e.preventDefault()
    rightDown = true
  }
}

function onKeyUp(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') leftDown = false
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') rightDown = false
}

// Touch: left half = rotate left, right half = rotate right
function onTouchStart(e: TouchEvent) {
  e.preventDefault()
  if (state.value === 'idle') { startGame(); return }
  if (state.value === 'over') { restart(); return }
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
  // Check if any remaining touches still cover left/right
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
      <div v-if="state === 'over'" class="absolute inset-0 rounded-xl flex items-center justify-center" style="background: rgba(3,7,18,0.88)">
        <div class="flex flex-col items-center gap-4 border border-white/10 bg-white/[0.04] rounded-2xl px-10 py-8">
          <p class="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-500">GAME OVER</p>
          <p class="font-display font-bold text-4xl text-white">{{ score }}</p>
          <p class="hud-label text-[10px]">SCORE</p>
          <button class="mt-2 px-10 py-2.5 font-mono text-xs tracking-widest uppercase rounded-lg border border-neon-blue/30 bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20 hover:border-neon-blue/50 transition-all cursor-pointer" @click.stop="restart">↺ RESTART</button>
        </div>
      </div>
    </div>
    <p class="font-mono text-xs text-slate-600">← → to rotate shield • protect your planet</p>
  </div>
</template>
