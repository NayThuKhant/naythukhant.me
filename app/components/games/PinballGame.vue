<script setup lang="ts">
import { ControlLayout } from '~/types'

const canvasEl = ref<HTMLCanvasElement | null>(null)
const score    = ref(0)
const balls    = ref(3)
const state    = ref<'idle' | 'playing' | 'won' | 'over'>('idle')

const W = 480, H = 620
const BALL_R = 10
const τ = Math.PI * 2
const GRAVITY = 0.4
const VEL_CAP = 18
const BOUNCE = 0.75

const { bounce: sfxBounce, pop: sfxPop, score: sfxScore, win: sfxWin, lose: sfxLose } = useGameSounds()

let raf = 0
let titlePulse = 0

// Ball state
let bx = 450, by = 300
let vx = -3, vy = -8

// Flippers
const LF_PIVOT = { x: 140, y: 560 }
const RF_PIVOT = { x: 340, y: 560 }
const FLIPPER_LEN = 80
let lfAngle = 0.5 // radians, resting down
let rfAngle = Math.PI - 0.5
let lfActive = false
let rfActive = false

// Bumpers: [x, y, r, flashTimer]
const BUMPERS: Array<{ x: number; y: number; r: number; flash: number }> = [
  { x: 120, y: 200, r: 20, flash: 0 },
  { x: 240, y: 150, r: 20, flash: 0 },
  { x: 360, y: 200, r: 20, flash: 0 },
  { x: 180, y: 300, r: 20, flash: 0 },
  { x: 300, y: 280, r: 20, flash: 0 },
]

// Slingshots (triangular regions at bottom sides)
const SLINGS = [
  { x1: 80, y1: 480, x2: 120, y2: 540, x3: 80, y3: 540 },  // left
  { x1: 400, y1: 480, x2: 360, y2: 540, x3: 400, y3: 540 }, // right
]

let keys = { left: false, right: false }
let milestoneNext = 1000

function launchBall() {
  bx = 450; by = 300
  vx = -4 - Math.random() * 2
  vy = -10 - Math.random() * 3
}

function reset() {
  score.value = 0; balls.value = 3; milestoneNext = 1000
  for (const b of BUMPERS) b.flash = 0
  lfAngle = 0.5; rfAngle = Math.PI - 0.5
  lfActive = rfActive = false
  launchBall()
}

function startGame() { reset(); state.value = 'playing' }
function restart() { reset(); state.value = 'playing' }

function flipperEndpoint(pivot: { x: number; y: number }, angle: number) {
  return { x: pivot.x + Math.cos(angle) * FLIPPER_LEN, y: pivot.y + Math.sin(angle) * FLIPPER_LEN }
}

function distToSegment(px: number, py: number, ax: number, ay: number, bxp: number, byp: number) {
  const dx = bxp - ax, dy = byp - ay
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function closestPointOnSegment(px: number, py: number, ax: number, ay: number, bxp: number, byp: number) {
  const dx = bxp - ax, dy = byp - ay
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return { x: ax, y: ay }
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return { x: ax + t * dx, y: ay + t * dy }
}

function onKey(e: KeyboardEvent) {
  const down = e.type === 'keydown'
  if (e.key === 'ArrowLeft' || e.key === 'z' || e.key === 'Z')  { e.preventDefault(); keys.left  = down }
  if (e.key === 'ArrowRight' || e.key === 'x' || e.key === 'X') { e.preventDefault(); keys.right = down }
  if (e.code === 'Space' && down && state.value === 'idle') { e.preventDefault(); startGame() }
}

function draw(ts: number) {
  raf = requestAnimationFrame(draw)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return
  titlePulse = ts

  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, W, H)

  if (state.value === 'playing') {
    // Update flippers
    lfActive = keys.left
    rfActive = keys.right
    const LF_DOWN = 0.5, LF_UP = -0.3
    const RF_DOWN = Math.PI - 0.5, RF_UP = Math.PI + 0.3
    const flipSpeed = 0.18
    if (lfActive) lfAngle = Math.max(LF_UP, lfAngle - flipSpeed * 2)
    else          lfAngle = Math.min(LF_DOWN, lfAngle + flipSpeed)
    if (rfActive) rfAngle = Math.min(RF_UP, rfAngle + flipSpeed * 2)
    else          rfAngle = Math.max(RF_DOWN, rfAngle - flipSpeed)

    // Physics
    vy += GRAVITY
    // Cap velocity
    const spd = Math.hypot(vx, vy)
    if (spd > VEL_CAP) { vx = vx / spd * VEL_CAP; vy = vy / spd * VEL_CAP }

    bx += vx; by += vy

    // Wall bounces
    if (bx - BALL_R < 40)  { bx = 40 + BALL_R;  vx = Math.abs(vx) * BOUNCE; sfxBounce() }
    if (bx + BALL_R > W - 40) { bx = W - 40 - BALL_R; vx = -Math.abs(vx) * BOUNCE; sfxBounce() }
    if (by - BALL_R < 10)  { by = 10 + BALL_R; vy = Math.abs(vy) * BOUNCE; sfxBounce() }

    // Drain
    if (by > H - 20) {
      balls.value--
      sfxBounce()
      if (balls.value <= 0) { state.value = 'over'; sfxLose(); return }
      launchBall()
    }

    // Bumper collisions
    for (const bmp of BUMPERS) {
      const dx = bx - bmp.x, dy = by - bmp.y
      const d = Math.hypot(dx, dy)
      if (d < bmp.r + BALL_R) {
        const nx = dx / d, ny = dy / d
        const dot = vx * nx + vy * ny
        vx = (vx - 2 * dot * nx) * 1.05
        vy = (vy - 2 * dot * ny) * 1.05
        bx = bmp.x + nx * (bmp.r + BALL_R + 1)
        by = bmp.y + ny * (bmp.r + BALL_R + 1)
        score.value += 100
        bmp.flash = 8
        sfxPop()
        if (score.value >= milestoneNext) { sfxScore(); milestoneNext += 1000 }
      }
      if (bmp.flash > 0) bmp.flash--
    }

    // Slingshot check (simple — if ball near triangle regions, push up+inward)
    // Left sling: if ball x < 120 && y > 480 && y < 540
    if (bx < 130 && bx > 60 && by > 470 && by < 550 && vx < 0) {
      vx = Math.abs(vx) * 1.2; vy = -Math.abs(vy) * 1.2
      score.value += 50; sfxBounce()
    }
    // Right sling: if ball x > 350 && y > 480 && y < 540
    if (bx > 350 && bx < 420 && by > 470 && by < 550 && vx > 0) {
      vx = -Math.abs(vx) * 1.2; vy = -Math.abs(vy) * 1.2
      score.value += 50; sfxBounce()
    }

    // Flipper collisions
    const lfe = flipperEndpoint(LF_PIVOT, lfAngle)
    const rfe = flipperEndpoint(RF_PIVOT, rfAngle)

    // Left flipper
    if (distToSegment(bx, by, LF_PIVOT.x, LF_PIVOT.y, lfe.x, lfe.y) < BALL_R + 5) {
      const cp = closestPointOnSegment(bx, by, LF_PIVOT.x, LF_PIVOT.y, lfe.x, lfe.y)
      const nx = bx - cp.x, ny = by - cp.y
      const dn = Math.hypot(nx, ny)
      if (dn > 0) {
        const nnx = nx / dn, nny = ny / dn
        const dot = vx * nnx + vy * nny
        vx -= 2 * dot * nnx; vy -= 2 * dot * nny
        if (lfActive) { vx += nnx * 4; vy += nny * 4 }
        by = cp.y + nny * (BALL_R + 6)
        sfxBounce()
      }
    }

    // Right flipper
    if (distToSegment(bx, by, RF_PIVOT.x, RF_PIVOT.y, rfe.x, rfe.y) < BALL_R + 5) {
      const cp = closestPointOnSegment(bx, by, RF_PIVOT.x, RF_PIVOT.y, rfe.x, rfe.y)
      const nx = bx - cp.x, ny = by - cp.y
      const dn = Math.hypot(nx, ny)
      if (dn > 0) {
        const nnx = nx / dn, nny = ny / dn
        const dot = vx * nnx + vy * nny
        vx -= 2 * dot * nnx; vy -= 2 * dot * nny
        if (rfActive) { vx += nnx * 4; vy += nny * 4 }
        by = cp.y + nny * (BALL_R + 6)
        sfxBounce()
      }
    }

    if (score.value >= 5000) { state.value = 'won'; sfxWin(); return }
  }

  // Draw walls (neon-blue side walls)
  ctx.save()
  ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 4; ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 12
  // Left wall
  ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(40, H - 120); ctx.stroke()
  // Right wall
  ctx.beginPath(); ctx.moveTo(W - 40, 0); ctx.lineTo(W - 40, H - 120); ctx.stroke()
  // Top
  ctx.beginPath(); ctx.moveTo(40, 10); ctx.lineTo(W - 40, 10); ctx.stroke()
  ctx.restore()

  // Slingshot outlines
  ctx.save()
  ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2; ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 8
  for (const s of SLINGS) {
    ctx.beginPath()
    ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.lineTo(s.x3, s.y3); ctx.closePath()
    ctx.stroke()
  }
  ctx.restore()

  // Drain lane gutters (visual guide)
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(40, H - 120); ctx.lineTo(130, H - 20); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(W - 40, H - 120); ctx.lineTo(W - 130, H - 20); ctx.stroke()
  ctx.restore()

  // Bumpers
  for (const bmp of BUMPERS) {
    ctx.save()
    const isFlash = bmp.flash > 0
    ctx.shadowColor = isFlash ? '#ffffff' : '#00ff88'
    ctx.shadowBlur = isFlash ? 24 : 14
    ctx.strokeStyle = isFlash ? '#ffffff' : '#00ff88'
    ctx.fillStyle = isFlash ? 'rgba(255,255,255,0.4)' : 'rgba(0,255,136,0.2)'
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(bmp.x, bmp.y, bmp.r, 0, τ)
    ctx.fill(); ctx.stroke()
    ctx.restore()
  }

  // Flippers
  const lfe = flipperEndpoint(LF_PIVOT, lfAngle)
  const rfe = flipperEndpoint(RF_PIVOT, rfAngle)
  ctx.save()
  ctx.lineCap = 'round'; ctx.lineWidth = 12
  ctx.strokeStyle = lfActive ? '#00d4ff' : '#0077aa'
  ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = lfActive ? 16 : 6
  ctx.beginPath(); ctx.moveTo(LF_PIVOT.x, LF_PIVOT.y); ctx.lineTo(lfe.x, lfe.y); ctx.stroke()
  ctx.strokeStyle = rfActive ? '#00d4ff' : '#0077aa'
  ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = rfActive ? 16 : 6
  ctx.beginPath(); ctx.moveTo(RF_PIVOT.x, RF_PIVOT.y); ctx.lineTo(rfe.x, rfe.y); ctx.stroke()
  ctx.restore()

  // Ball
  if (state.value === 'playing' || state.value === 'over' || state.value === 'won') {
    ctx.save()
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 18
    ctx.fillStyle = '#ffffff'
    ctx.beginPath(); ctx.arc(bx, by, BALL_R, 0, τ); ctx.fill()
    ctx.restore()
  }

  // Ball counter dots
  ctx.save()
  for (let i = 0; i < 3; i++) {
    const active = i < balls.value
    ctx.fillStyle = active ? '#f472b6' : '#1f2937'
    ctx.shadowColor = active ? '#f472b6' : 'transparent'
    ctx.shadowBlur = active ? 8 : 0
    ctx.beginPath(); ctx.arc(W / 2 - 20 + i * 20, H - 14, 5, 0, τ); ctx.fill()
  }
  ctx.restore()

  // Score
  ctx.save()
  ctx.font = "bold 14px 'Courier New', monospace"
  ctx.fillStyle = '#facc15'; ctx.textAlign = 'center'
  ctx.fillText(score.value.toLocaleString(), W / 2, 38)
  ctx.restore()

  // Win target
  ctx.save()
  ctx.font = "10px 'Courier New', monospace"
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.textAlign = 'center'
  ctx.fillText('TARGET: 5000', W / 2, 54)
  ctx.restore()

  // Idle overlay
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.82)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    const pulse = 0.5 + 0.5 * Math.sin(titlePulse * 0.003)
    ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 8 + pulse * 18
    ctx.fillStyle = '#00d4ff'
    ctx.font = "bold 28px 'Space Grotesk', sans-serif"
    ctx.fillText('NEON PINBALL', W / 2, H / 2 - 40)
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(200,220,255,0.45)'
    ctx.font = "13px 'Courier New', monospace"
    ctx.fillText('Z / ← Left flipper   X / → Right flipper', W / 2, H / 2 + 10)
    ctx.fillText('Press SPACE or click to play', W / 2, H / 2 + 34)
  }
}

onMounted(() => {
  const c = canvasEl.value!
  c.width = W; c.height = H
  c.addEventListener('click', () => { if (state.value === 'idle') startGame() })
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKey)
  raf = requestAnimationFrame(draw)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('keyup', onKey)
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 select-none">
    <div class="glass-hud px-6 py-2 flex gap-6 items-center">
      <div class="text-center">
        <p class="hud-label text-[10px]">SCORE</p>
        <p class="font-mono font-bold text-white text-lg leading-tight">{{ score.toLocaleString() }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">BALLS</p>
        <p class="font-mono font-bold text-neon-pink text-lg leading-tight tracking-widest">
          {{ '●'.repeat(balls) }}{{ '○'.repeat(Math.max(0, 3 - balls)) }}
        </p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">TARGET</p>
        <p class="font-mono font-bold text-neon-emerald text-lg leading-tight">5000</p>
      </div>
    </div>

    <div class="relative">
      <canvas ref="canvasEl" class="rounded-xl border border-white/10 block cursor-pointer" />
      <GameResultOverlay
        v-if="state === 'won' || state === 'over'"
        :state="state"
        :score="score"
        :extra="state === 'won' ? 'Target reached!' : 'Ball drained!'"
        @restart="restart"
      />
    </div>

    <GameKeyboard :layout="ControlLayout.LrFire" />
    <p class="font-mono text-xs text-slate-600">Z/← Left flipper · X/→ Right flipper · Reach 5000 pts</p>
  </div>
</template>
