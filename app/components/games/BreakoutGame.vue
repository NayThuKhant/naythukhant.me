<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const score    = ref(0)
const lives    = ref(3)
const state    = ref<'idle' | 'playing' | 'won' | 'over'>('idle')

const W = 480, H = 500
const PAD_W = 80, PAD_H = 12, PAD_Y = H - 36
const BALL_R = 7
const BRICK_COLS = 8, BRICK_ROWS = 5
const BRICK_W = 50, BRICK_H = 18, BRICK_GAP = 6
const BRICK_START_X = (W - BRICK_COLS * (BRICK_W + BRICK_GAP) + BRICK_GAP) / 2
const BRICK_START_Y = 54
const τ = Math.PI * 2

const ROW_COLORS = [
  { fill: 'rgba(244,114,182,0.75)', stroke: '#f472b6', shadow: '#f472b6' },
  { fill: 'rgba(168, 85,247,0.75)', stroke: '#a855f7', shadow: '#a855f7' },
  { fill: 'rgba(  0,212,255,0.75)', stroke: '#00d4ff', shadow: '#00d4ff' },
  { fill: 'rgba(  0,255,136,0.75)', stroke: '#00ff88', shadow: '#00ff88' },
  { fill: 'rgba(255,220, 60,0.75)', stroke: '#ffdc3c', shadow: '#ffdc3c' },
]

interface Brick { x: number; y: number; alive: boolean; row: number; flashTimer: number }
interface Particle { x: number; y: number; vx: number; vy: number; age: number; maxAge: number; r: number; color: string }
interface ScorePopup { x: number; y: number; vy: number; age: number; maxAge: number; text: string }

let raf = 0
let padX = W / 2 - PAD_W / 2
let bx = 0, by = 0, vx = 0, vy = 0
let bricks: Brick[] = []
let keys = { left: false, right: false }
let particles: Particle[] = []
let scorePopups: ScorePopup[] = []
let shakeTimer = 0
let titlePulse = 0

function buildBricks(): Brick[] {
  const out: Brick[] = []
  for (let r = 0; r < BRICK_ROWS; r++)
    for (let c = 0; c < BRICK_COLS; c++)
      out.push({
        x: BRICK_START_X + c * (BRICK_W + BRICK_GAP),
        y: BRICK_START_Y + r * (BRICK_H + BRICK_GAP),
        alive: true, row: r, flashTimer: 0,
      })
  return out
}

function spawnParticles(x: number, y: number, color: string) {
  for (let i = 0; i < 7; i++) {
    const angle = (τ / 7) * i + Math.random() * 0.4
    const speed = 1.5 + Math.random() * 2.5
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, maxAge: 20, r: 2 + Math.random() * 2, color })
  }
}

function reset() {
  padX = W / 2 - PAD_W / 2
  bx = W / 2; by = PAD_Y - BALL_R - 2
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 3)
  vx = Math.cos(angle) * 4.2
  vy = Math.sin(angle) * 4.2
  bricks = buildBricks()
  score.value = 0; lives.value = 3
  particles = []; scorePopups = []; shakeTimer = 0
}

function startGame() { reset(); state.value = 'playing' }

function restart() {
  reset()
  state.value = 'playing'
}

function frame(ts: number) {
  raf = requestAnimationFrame(frame)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return
  titlePulse = ts

  let shakeX = 0, shakeY = 0
  if (shakeTimer > 0) {
    shakeX = (Math.random() - 0.5) * 8
    shakeY = (Math.random() - 0.5) * 8
    shakeTimer--
  }

  ctx.save()
  if (shakeTimer > 0) ctx.translate(shakeX, shakeY)

  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, W, H)

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.02)'; ctx.lineWidth = 1
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

  if (state.value === 'playing') {
    // Move paddle
    const speed = 6
    if (keys.left)  padX = Math.max(0, padX - speed)
    if (keys.right) padX = Math.min(W - PAD_W, padX + speed)

    // Move ball
    bx += vx; by += vy

    // Wall bounces
    if (bx - BALL_R < 0)  { bx = BALL_R;      vx = Math.abs(vx) }
    if (bx + BALL_R > W)  { bx = W - BALL_R;  vx = -Math.abs(vx) }
    if (by - BALL_R < 0)  { by = BALL_R;       vy = Math.abs(vy) }

    // Floor = lose life
    if (by - BALL_R > H) {
      lives.value--
      shakeTimer = 8
      if (lives.value <= 0) { ctx.restore(); state.value = 'over'; return }
      bx = padX + PAD_W / 2; by = PAD_Y - BALL_R - 2
      const a = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 3)
      vx = Math.cos(a) * 4.2; vy = Math.sin(a) * 4.2
    }

    // Paddle bounce
    if (by + BALL_R >= PAD_Y && by + BALL_R <= PAD_Y + PAD_H &&
        bx >= padX && bx <= padX + PAD_W && vy > 0) {
      const hit = (bx - (padX + PAD_W / 2)) / (PAD_W / 2)
      const angle = hit * (Math.PI / 3)
      const speed2 = Math.min(7, Math.hypot(vx, vy) + 0.08)
      vx = Math.sin(angle) * speed2
      vy = -Math.abs(Math.cos(angle) * speed2)
    }

    // Brick collision
    let remaining = 0
    for (const b of bricks) {
      if (!b.alive) continue
      remaining++
      if (bx + BALL_R > b.x && bx - BALL_R < b.x + BRICK_W &&
          by + BALL_R > b.y && by - BALL_R < b.y + BRICK_H) {
        b.alive = false
        const pts = (BRICK_ROWS - b.row) * 10
        score.value += pts
        const overlapL = bx + BALL_R - b.x
        const overlapR = b.x + BRICK_W - (bx - BALL_R)
        const overlapT = by + BALL_R - b.y
        const overlapB = b.y + BRICK_H - (by - BALL_R)
        const minH = Math.min(overlapL, overlapR)
        const minV = Math.min(overlapT, overlapB)
        if (minH < minV) vx = -vx; else vy = -vy
        remaining--
        // Effects
        const col = ROW_COLORS[b.row]!
        spawnParticles(b.x + BRICK_W / 2, b.y + BRICK_H / 2, col.stroke)
        scorePopups.push({ x: b.x + BRICK_W / 2, y: b.y, vy: -0.7, age: 0, maxAge: 40, text: `+${pts}` })
        b.flashTimer = 4
        break
      }
    }
    if (remaining === 0) { ctx.restore(); state.value = 'won'; return }

    // Update flash
    for (const b of bricks) { if (b.flashTimer > 0) b.flashTimer-- }

    // Update particles
    for (const p of particles) { p.x += p.vx; p.y += p.vy; p.age++ }
    particles = particles.filter(p => p.age < p.maxAge)

    // Update score popups
    for (const sp of scorePopups) { sp.y += sp.vy; sp.age++ }
    scorePopups = scorePopups.filter(sp => sp.age < sp.maxAge)
  }

  // Draw bricks
  for (const b of bricks) {
    if (!b.alive) continue
    const col = ROW_COLORS[b.row]!
    ctx.save()
    if (b.flashTimer > 0) {
      ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 20
      ctx.fillStyle = `rgba(255,255,255,${0.85 * (b.flashTimer / 4)})`
    } else {
      ctx.shadowColor = col.shadow; ctx.shadowBlur = 8
      ctx.fillStyle = col.fill
    }
    ctx.strokeStyle = col.stroke; ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(b.x, b.y, BRICK_W, BRICK_H, 3)
    ctx.fill(); ctx.stroke()
    ctx.restore()
  }

  // Draw paddle
  ctx.save()
  ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 14
  const padGrad = ctx.createLinearGradient(padX, PAD_Y, padX + PAD_W, PAD_Y + PAD_H)
  padGrad.addColorStop(0, '#00d4ff'); padGrad.addColorStop(1, '#0066aa')
  ctx.fillStyle = padGrad
  ctx.beginPath(); ctx.roundRect(padX, PAD_Y, PAD_W, PAD_H, 6); ctx.fill()
  ctx.restore()

  // Draw ball
  ctx.save()
  ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 18
  ctx.fillStyle = '#c084fc'
  ctx.beginPath(); ctx.arc(bx, by, BALL_R, 0, Math.PI * 2); ctx.fill()
  ctx.restore()

  // Draw particles
  for (const p of particles) {
    const t = 1 - p.age / p.maxAge
    ctx.save()
    ctx.globalAlpha = t
    ctx.shadowColor = p.color; ctx.shadowBlur = 5
    ctx.fillStyle = p.color
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * t, 0, τ); ctx.fill()
    ctx.restore()
  }

  // Draw score popups
  ctx.save()
  ctx.font = "bold 11px 'Courier New', monospace"
  ctx.textAlign = 'center'
  for (const sp of scorePopups) {
    const t = 1 - sp.age / sp.maxAge
    ctx.globalAlpha = t
    ctx.fillStyle = '#ffe082'
    ctx.shadowColor = '#ffe082'; ctx.shadowBlur = 6
    ctx.fillText(sp.text, sp.x, sp.y)
  }
  ctx.restore()

  // HUD
  ctx.fillStyle = 'rgba(200,220,255,0.65)'
  ctx.font = "13px 'Courier New', monospace"
  ctx.textAlign = 'left'
  ctx.fillText(`SCORE ${score.value}`, 12, 22)
  ctx.textAlign = 'right'
  ctx.fillText(`♥ `.repeat(lives.value).trim(), W - 12, 22)

  // Idle title overlay with pulsing glow
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.80)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    const pulse = 0.5 + 0.5 * Math.sin(titlePulse * 0.003)
    ctx.shadowColor = '#00d4ff'
    ctx.shadowBlur = 8 + pulse * 18
    ctx.fillStyle = '#00d4ff'
    ctx.font = "bold 28px 'Space Grotesk', sans-serif"
    ctx.fillText('COSMIC BREAKOUT', W / 2, H / 2 - 36)
    ctx.shadowBlur = 0
    // Animated brick row
    const bColors = ['#f472b6','#a855f7','#00d4ff','#00ff88','#ffdc3c']
    for (let i = 0; i < 5; i++) {
      const bxr = W / 2 - 80 + i * 40
      const byr = H / 2 + 2 + Math.sin(titlePulse * 0.0025 + i * 0.7) * 5
      ctx.save()
      ctx.shadowColor = bColors[i]!; ctx.shadowBlur = 6 + pulse * 8
      ctx.fillStyle = `rgba(${i===0?'244,114,182':i===1?'168,85,247':i===2?'0,212,255':i===3?'0,255,136':'255,220,60'},0.7)`
      ctx.strokeStyle = bColors[i]!; ctx.lineWidth = 1
      ctx.beginPath(); ctx.roundRect(bxr - 14, byr - 8, 28, 14, 3); ctx.fill(); ctx.stroke()
      ctx.restore()
    }
    ctx.fillStyle = 'rgba(200,220,255,0.45)'
    ctx.font = "13px 'Courier New', monospace"
    ctx.fillText('Press SPACE or click to play', W / 2, H / 2 + 42)
  }

  ctx.restore()
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft')  { e.preventDefault(); keys.left  = (e.type === 'keydown') }
  if (e.key === 'ArrowRight') { e.preventDefault(); keys.right = (e.type === 'keydown') }
  if (e.code === 'Space' && e.type === 'keydown') {
    e.preventDefault()
    if (state.value === 'idle') startGame()
  }
}

onMounted(() => {
  if (canvasEl.value) { canvasEl.value.width = W; canvasEl.value.height = H }
  window.addEventListener('keydown',  onKey)
  window.addEventListener('keyup',    onKey)
  raf = requestAnimationFrame(frame)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('keyup',   onKey)
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 select-none">
    <div class="relative">
      <canvas
        ref="canvasEl"
        class="rounded-xl border border-white/10 block cursor-pointer"
        @click="state === 'idle' && startGame()"
      />

      <!-- Result popup -->
      <div
        v-if="state === 'over' || state === 'won'"
        class="absolute inset-0 rounded-xl flex items-center justify-center"
        style="background: rgba(3,7,18,0.88)"
      >
        <div class="flex flex-col items-center gap-4 border border-white/10 bg-white/[0.04] rounded-2xl px-10 py-8">
          <p
            class="font-mono text-[10px] tracking-[0.2em] uppercase"
            :class="state === 'won' ? 'text-neon-emerald' : 'text-slate-500'"
          >{{ state === 'won' ? 'VICTORY' : 'GAME OVER' }}</p>
          <p class="font-display font-bold text-4xl text-white">{{ score }}</p>
          <p class="hud-label text-[10px]">SCORE</p>
          <button
            class="mt-2 px-10 py-2.5 font-mono text-xs tracking-widest uppercase rounded-lg border border-neon-blue/30 bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20 hover:border-neon-blue/50 transition-all cursor-pointer"
            @click.stop="restart"
          >↺ RESTART</button>
        </div>
      </div>
    </div>
    <p class="font-mono text-xs text-slate-600">← → to move paddle • SPACE or click to start</p>
  </div>
</template>
