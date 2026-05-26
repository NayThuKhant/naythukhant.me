<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const score    = ref(0)
const state    = ref<'idle' | 'playing' | 'over'>('idle')

const W = 480, H = 220
const PLAYER_X   = 80
const WALL_THICK = 22
const GRAVITY    = 0.32
const BASE_SPEED = 2.2

let raf       = 0
let lastTs    = 0
let py        = 0
let pvy       = 0
let gravDir   = 1
let scrollX   = 0
let speed     = BASE_SPEED
let amplitude = 30
let wavelength = 260

function gapCentre(worldX: number): number {
  return H / 2 + amplitude * Math.sin(worldX / wavelength)
}

const GAP_HALF = 45

function wallTop(worldX: number): number {
  return gapCentre(worldX) - GAP_HALF
}
function wallBot(worldX: number): number {
  return gapCentre(worldX) + GAP_HALF
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

let particles: Particle[] = []
let popups: ScorePopup[] = []
let playerTrail: { x: number; y: number }[] = []
let deathAnim  = 0
let lastScore  = 0  // track score increments for popup

const { jump: sfxJump, die: sfxDie } = useGameSounds()

function spawnParticles(x: number, y: number, color: string, n = 7) {
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2
    const spd = 1.5 + Math.random() * 2.5
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      age: 0, maxAge: 18 + Math.floor(Math.random() * 8),
      color, size: 1.5 + Math.random() * 2,
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
  for (const p of particles) {
    const alpha = 1 - p.age / p.maxAge
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    ctx.shadowColor = p.color
    ctx.shadowBlur = 6
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
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
    ctx.font = "bold 12px 'Courier New', monospace"
    ctx.textAlign = 'center'
    ctx.fillText(pop.text, pop.x, pop.y + dy)
    ctx.restore()
    pop.age++
  }
  popups = popups.filter(p => p.age < p.maxAge)
}

function reset() {
  py = H / 2
  pvy = 0
  gravDir = 1
  scrollX = 0
  speed = BASE_SPEED
  amplitude = 30
  wavelength = 260
  score.value = 0
  particles = []
  popups = []
  playerTrail = []
  deathAnim = 0
  lastScore = 0
}

function restart() {
  reset()
  state.value = 'playing'
}

function flipGravity() {
  if (state.value === 'over') return
  if (state.value === 'idle') { reset(); state.value = 'playing'; return }
  gravDir = -gravDir
  sfxJump()
  // small burst on flip
  spawnParticles(PLAYER_X, py, '#a855f7', 5)
}

function frame(ts: number) {
  raf = requestAnimationFrame(frame)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return
  const dt = Math.min(ts - lastTs, 50)
  lastTs = ts

  // Background
  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, W, H)

  // Moving stars
  ctx.fillStyle = 'rgba(200,220,255,0.08)'
  for (let i = 0; i < 60; i++) {
    const sx = ((i * 79 + ts * 0.018) % W)
    const sy = (i * 127) % H
    ctx.fillRect(sx, sy, 1, 1)
  }

  if (state.value === 'playing') {
    // Record trail
    playerTrail.push({ x: PLAYER_X, y: py })
    if (playerTrail.length > 5) playerTrail.shift()

    // Physics
    pvy += GRAVITY * gravDir
    py  += pvy
    scrollX += speed
    const newScore = Math.floor(scrollX / 80)
    if (newScore > score.value) {
      spawnPopup(PLAYER_X + 24, py - 16, `+${newScore - score.value}`)
    }
    score.value = newScore

    // Difficulty ramp
    speed = Math.min(5.0, BASE_SPEED + scrollX * 0.0008)
    amplitude = Math.min(55, 30 + scrollX * 0.006)

    // Collision
    const worldPlayerX = scrollX + PLAYER_X
    const wTop = wallTop(worldPlayerX)
    const wBot = wallBot(worldPlayerX)
    const pHalf = 7

    if (py - pHalf < wTop - WALL_THICK + WALL_THICK || py - pHalf < wTop) {
      deathAnim = 1
      spawnParticles(PLAYER_X, py, '#a855f7', 12)
      sfxDie()
      state.value = 'over'
      return
    }
    if (py + pHalf > wBot) {
      deathAnim = 1
      spawnParticles(PLAYER_X, py, '#a855f7', 12)
      sfxDie()
      state.value = 'over'
      return
    }
    if (py - pHalf < 0 || py + pHalf > H) {
      deathAnim = 1
      spawnParticles(PLAYER_X, py, '#a855f7', 12)
      sfxDie()
      state.value = 'over'
      return
    }
  }

  // Draw tunnel walls
  const STEP = 4
  for (let sx = 0; sx < W; sx += STEP) {
    const wx = scrollX + sx
    const cTop = wallTop(wx)
    const cBot = wallBot(wx)
    ctx.fillStyle = 'rgba(0,30,50,0.95)'
    ctx.fillRect(sx, 0, STEP, cTop)
    ctx.fillRect(sx, cBot, STEP, H - cBot)
  }

  // Glow edge lines
  ctx.save()
  ctx.shadowColor = '#00d4ff'
  ctx.shadowBlur  = 12
  ctx.strokeStyle = '#00d4ff'
  ctx.lineWidth   = 2
  ctx.beginPath()
  for (let sx = 0; sx <= W; sx += 2) {
    const wx  = scrollX + sx
    const cTop = wallTop(wx)
    if (sx === 0) ctx.moveTo(sx, cTop)
    else          ctx.lineTo(sx, cTop)
  }
  ctx.stroke()
  ctx.beginPath()
  for (let sx = 0; sx <= W; sx += 2) {
    const wx  = scrollX + sx
    const cBot = wallBot(wx)
    if (sx === 0) ctx.moveTo(sx, cBot)
    else          ctx.lineTo(sx, cBot)
  }
  ctx.stroke()
  ctx.restore()

  // Draw trail
  for (let i = 0; i < playerTrail.length; i++) {
    const t = playerTrail[i]!
    const alpha = (i / playerTrail.length) * 0.3
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(t.x, t.y)
    ctx.scale(1, gravDir)
    ctx.shadowColor = '#a855f7'
    ctx.shadowBlur = 8
    ctx.fillStyle = '#a855f7'
    ctx.beginPath()
    ctx.moveTo(0, -10); ctx.lineTo(9, 8); ctx.lineTo(-9, 8)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  // Draw player (neon-purple triangle)
  ctx.save()
  ctx.translate(PLAYER_X, py)
  ctx.scale(1, gravDir)
  ctx.shadowColor = '#a855f7'
  ctx.shadowBlur  = 22
  const grad = ctx.createLinearGradient(-8, -10, 8, 10)
  grad.addColorStop(0, '#e9d5ff')
  grad.addColorStop(0.5, '#a855f7')
  grad.addColorStop(1, '#5b21b6')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(0, -10)
  ctx.lineTo(9, 8)
  ctx.lineTo(-9, 8)
  ctx.closePath()
  ctx.fill()
  if (state.value === 'playing') {
    ctx.save()
    ctx.shadowColor = '#c084fc'
    ctx.shadowBlur  = 10
    ctx.fillStyle   = 'rgba(192,132,252,0.55)'
    ctx.beginPath()
    ctx.moveTo(-5, 8); ctx.lineTo(5, 8); ctx.lineTo(0, 14 + Math.random() * 5)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()

  // Gravity indicator
  if (state.value === 'playing') {
    ctx.save()
    ctx.fillStyle   = 'rgba(168,85,247,0.45)'
    ctx.font        = "11px 'Courier New', monospace"
    ctx.textAlign   = 'left'
    ctx.fillText(gravDir === 1 ? '▼ GRAV' : '▲ FLIP', 8, H - 8)
    ctx.restore()
  }

  // Particles + popups
  updateParticles()
  drawParticles(ctx)
  drawPopups(ctx)

  // Death ring
  if (deathAnim > 0 && deathAnim <= 20) {
    const t = deathAnim / 20
    const r = 10 + t * 55
    ctx.save()
    ctx.globalAlpha = (1 - t) * 0.8
    ctx.strokeStyle = '#a855f7'
    ctx.shadowColor = '#a855f7'
    ctx.shadowBlur = 20
    ctx.lineWidth = 3 * (1 - t) + 1
    ctx.beginPath()
    ctx.arc(PLAYER_X, py, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
    deathAnim++
  }

  // Overlays
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.80)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    const pulse = 0.6 + 0.4 * Math.sin(ts * 0.003)
    ctx.save()
    ctx.shadowColor = '#a855f7'
    ctx.shadowBlur  = 18 + 14 * pulse
    ctx.fillStyle   = `rgba(168,85,247,${0.7 + 0.3 * pulse})`
    ctx.font        = "bold 26px 'Space Grotesk', sans-serif"
    ctx.fillText('GRAVITY FLIP', W / 2, H / 2 - 28)
    ctx.restore()
    if (Math.floor(ts / 600) % 2 === 0) {
      ctx.fillStyle = 'rgba(200,220,255,0.55)'
      ctx.font      = "13px 'Courier New', monospace"
      ctx.fillText('Press Space or tap to start', W / 2, H / 2 + 10)
    }
  }
}

function onKey(e: KeyboardEvent) {
  if (e.code === 'Space' || e.key === 'ArrowUp') {
    e.preventDefault()
    flipGravity()
  }
}

function onTouch(e: TouchEvent) {
  e.preventDefault()
  flipGravity()
}

onMounted(() => {
  if (canvasEl.value) { canvasEl.value.width = W; canvasEl.value.height = H }
  window.addEventListener('keydown', onKey)
  canvasEl.value?.addEventListener('touchstart', onTouch, { passive: false })
  raf = requestAnimationFrame(frame)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
  canvasEl.value?.removeEventListener('touchstart', onTouch)
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 select-none">
    <div class="glass-hud px-6 py-2 text-center">
      <p class="hud-label text-[10px]">DISTANCE</p>
      <p class="font-mono font-bold text-white text-lg leading-tight">{{ score }}</p>
    </div>
    <div class="relative">
      <canvas
        ref="canvasEl"
        class="rounded-xl border border-white/10 block cursor-pointer"
        @click="flipGravity"
      />
      <GameResultOverlay :state="state" :score="score" @restart="restart" />
    </div>
    <p class="font-mono text-xs text-slate-600">Space or tap to flip gravity • survive the tunnel</p>
  </div>
</template>
