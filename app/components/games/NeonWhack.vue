<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const score    = ref(0)
const timeLeft = ref(30)
const state    = ref<'idle' | 'playing' | 'over'>('idle')

const W = 400, H = 340
const τ = Math.PI * 2

const COLS = 3, ROWS = 3
const HOLE_R = 34
const GRID_X = [80, 200, 320]
const GRID_Y = [80, 170, 260]

interface Alien {
  col: number; row: number
  visible: boolean; flashFrames: number
  life: number; maxLife: number; rising: number
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
let aliens: Alien[] = []
let spawnTimer = 0
let spawnInterval = 900
let lastTs = 0
let countdownTimer = 0
let activeHoles = new Set<number>()
let particles: Particle[] = []
let popups: ScorePopup[] = []

function holeKey(col: number, row: number) { return row * COLS + col }

function spawnParticles(x: number, y: number, color: string, n = 7) {
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * τ
    const spd = 2 + Math.random() * 3
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 1,
      age: 0, maxAge: 18 + Math.floor(Math.random() * 8),
      color, size: 2 + Math.random() * 2.5,
    })
  }
}

function spawnPopup(x: number, y: number, text: string) {
  popups.push({ x, y, age: 0, maxAge: 40, text })
}

function updateParticles() {
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy
    p.vy += 0.1
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
    ctx.font = "bold 14px 'Courier New', monospace"
    ctx.textAlign = 'center'
    ctx.fillText(pop.text, pop.x, pop.y + dy)
    ctx.restore()
    pop.age++
  }
  popups = popups.filter(p => p.age < p.maxAge)
}

function spawnAlien() {
  const available: number[] = []
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (!activeHoles.has(holeKey(c, r))) available.push(holeKey(c, r))
  if (available.length === 0) return
  const idx = available[Math.floor(Math.random() * available.length)]!
  const col = idx % COLS
  const row = Math.floor(idx / COLS)
  const t = Math.max(500, 1500 - (30 - timeLeft.value) * 25)
  const maxLife = t + (Math.random() * 400 - 200)
  aliens.push({ col, row, visible: true, flashFrames: 0, life: maxLife, maxLife, rising: 0 })
  activeHoles.add(holeKey(col, row))
}

function reset() {
  aliens = []
  activeHoles.clear()
  score.value = 0
  timeLeft.value = 30
  spawnTimer = 0
  spawnInterval = 900
  countdownTimer = 0
  lastTs = 0
  particles = []
  popups = []
}

function drawHole(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save()
  const grad = ctx.createRadialGradient(cx, cy + 6, 4, cx, cy, HOLE_R)
  grad.addColorStop(0, 'rgba(0,0,0,0.9)')
  grad.addColorStop(1, 'rgba(10,20,40,0.5)')
  ctx.fillStyle = grad
  ctx.shadowColor = 'rgba(0,212,255,0.15)'
  ctx.shadowBlur = 8
  ctx.beginPath()
  ctx.ellipse(cx, cy, HOLE_R, HOLE_R * 0.45, 0, 0, τ)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,212,255,0.18)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
}

function drawAlienFace(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, flash: boolean) {
  ctx.save()
  const color = flash ? '#ffffff' : '#00ff88'
  ctx.shadowColor = flash ? '#ffffff' : '#00ff88'
  ctx.shadowBlur = flash ? 30 : 18
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, τ)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = flash ? 'rgba(0,255,136,0.3)' : '#030712'
  const eyeR = r * 0.18
  ctx.beginPath()
  ctx.arc(cx - r * 0.3, cy - r * 0.1, eyeR, 0, τ)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + r * 0.3, cy - r * 0.1, eyeR, 0, τ)
  ctx.fill()
  ctx.fillStyle = flash ? '#030712' : '#00ff88'
  ctx.shadowColor = '#00ff88'
  ctx.shadowBlur = 6
  ctx.beginPath()
  ctx.arc(cx - r * 0.3, cy - r * 0.1, eyeR * 0.5, 0, τ)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + r * 0.3, cy - r * 0.1, eyeR * 0.5, 0, τ)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = '#030712'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy + r * 0.2, r * 0.3, 0.15 * Math.PI, 0.85 * Math.PI)
  ctx.stroke()
  ctx.strokeStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 8
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx, cy - r)
  ctx.lineTo(cx - r * 0.2, cy - r * 1.5)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx, cy - r)
  ctx.lineTo(cx + r * 0.2, cy - r * 1.5)
  ctx.stroke()
  ctx.fillStyle = color
  ctx.shadowBlur = 10
  ctx.beginPath()
  ctx.arc(cx - r * 0.2, cy - r * 1.5, 3, 0, τ)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + r * 0.2, cy - r * 1.5, 3, 0, τ)
  ctx.fill()
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

  ctx.fillStyle = 'rgba(200,220,255,0.12)'
  for (let i = 0; i < 40; i++) {
    const sx = (i * 97 + ts * 0.003) % W
    const sy = (i * 173) % H
    ctx.fillRect(sx, sy, 1.5, 1.5)
  }

  if (state.value === 'playing') {
    countdownTimer += dt
    if (countdownTimer >= 1000) {
      countdownTimer -= 1000
      timeLeft.value = Math.max(0, timeLeft.value - 1)
      if (timeLeft.value <= 0) {
        state.value = 'over'
        return
      }
    }

    spawnTimer += dt
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0
      spawnInterval = Math.max(500, 900 - (30 - timeLeft.value) * 15)
      spawnAlien()
    }

    for (let i = aliens.length - 1; i >= 0; i--) {
      const a = aliens[i]!
      if (a.flashFrames > 0) {
        a.flashFrames--
        if (a.flashFrames === 0) {
          activeHoles.delete(holeKey(a.col, a.row))
          aliens.splice(i, 1)
          continue
        }
      } else {
        a.life -= dt
        a.rising = Math.min(1, a.rising + dt / 200)
        if (a.life <= 0) {
          a.rising = Math.max(0, a.rising - dt / 150)
          if (a.rising <= 0) {
            activeHoles.delete(holeKey(a.col, a.row))
            aliens.splice(i, 1)
          }
        }
      }
    }
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      drawHole(ctx, GRID_X[c]!, GRID_Y[r]!)
    }
  }

  for (const a of aliens) {
    const cx = GRID_X[a.col]!
    const cy = GRID_Y[a.row]!
    const rise = a.flashFrames > 0 ? 1 : a.rising
    if (rise <= 0) continue
    const alienR = 22
    const offsetY = HOLE_R * 0.9 * (1 - rise)
    const acx = cx
    const acy = cy - alienR * 0.4 - offsetY * 0.5
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(cx, cy, HOLE_R + 4, HOLE_R * 0.5 + alienR * 1.8, 0, 0, τ)
    ctx.clip()
    drawAlienFace(ctx, acx, acy - (alienR * rise * 0.6), alienR, a.flashFrames > 0)
    ctx.restore()
  }

  // Particles + popups (drawn after aliens, before overlay)
  updateParticles()
  drawParticles(ctx)
  drawPopups(ctx)

  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.82)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    const pulse = 0.6 + 0.4 * Math.sin(ts * 0.003)
    ctx.fillStyle = `rgba(0,255,136,${0.7 + 0.3 * pulse})`
    ctx.shadowColor = '#00ff88'
    ctx.shadowBlur = 20 + 14 * pulse
    ctx.font = "bold 26px 'Space Grotesk', sans-serif"
    ctx.fillText('NEON WHACK', W / 2, H / 2 - 28)
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(200,220,255,0.55)'
    ctx.font = "13px 'Courier New', monospace"
    ctx.fillText('Click the aliens before they hide', W / 2, H / 2 + 10)
    if (Math.floor(ts / 600) % 2 === 0) {
      ctx.fillStyle = 'rgba(200,220,255,0.35)'
      ctx.font = "12px 'Courier New', monospace"
      ctx.fillText('Click anywhere to start', W / 2, H / 2 + 34)
    }
  }
}

function hitTest(clientX: number, clientY: number) {
  if (!canvasEl.value) return
  const rect = canvasEl.value.getBoundingClientRect()
  const sx = W / rect.width
  const sy = H / rect.height
  const px = (clientX - rect.left) * sx
  const py = (clientY - rect.top) * sy

  for (let i = aliens.length - 1; i >= 0; i--) {
    const a = aliens[i]!
    if (a.flashFrames > 0 || a.rising <= 0) continue
    const cx = GRID_X[a.col]!
    const alienR = 22
    const rise = a.rising
    const acy = GRID_Y[a.row]! - alienR * 0.4 - (HOLE_R * 0.9 * (1 - rise) * 0.5) - alienR * rise * 0.6

    const dx = px - cx
    const dy = py - acy
    if (dx * dx + dy * dy <= (alienR * 1.4) ** 2) {
      a.flashFrames = 8
      a.life = 0
      score.value++
      // Particle burst + popup on whack
      spawnParticles(cx, acy, '#00ff88', 8)
      spawnPopup(cx, acy - alienR - 10, '+1')
      return
    }
  }
}

function restart() {
  reset()
  state.value = 'playing'
}

function startGame() {
  reset()
  state.value = 'playing'
}

function onClick(e: MouseEvent) {
  if (state.value === 'idle') { startGame(); return }
  if (state.value !== 'playing') return
  hitTest(e.clientX, e.clientY)
}

function onTouch(e: TouchEvent) {
  e.preventDefault()
  if (state.value === 'idle') { startGame(); return }
  if (state.value !== 'playing') return
  for (const t of Array.from(e.changedTouches)) hitTest(t.clientX, t.clientY)
}

onMounted(() => {
  if (canvasEl.value) { canvasEl.value.width = W; canvasEl.value.height = H }
  raf = requestAnimationFrame(frame)
})
onUnmounted(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="flex flex-col items-center gap-3 select-none">
    <div class="glass-hud px-6 py-2 flex gap-6 items-center">
      <div class="text-center">
        <p class="hud-label text-[10px]">SCORE</p>
        <p class="font-mono font-bold text-white text-lg leading-tight">{{ score }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">TIME</p>
        <p class="font-mono font-bold text-lg leading-tight" :class="timeLeft <= 5 ? 'text-red-400' : 'text-white'">{{ timeLeft }}s</p>
      </div>
    </div>
    <div class="relative">
      <canvas
        ref="canvasEl"
        class="rounded-xl border border-white/10 block cursor-crosshair touch-none"
        @mousedown="onClick"
        @touchstart="onTouch"
      />
      <GameResultOverlay :state="state" :score="score" @restart="restart" />
    </div>
    <p class="font-mono text-xs text-slate-600">Click the aliens before they hide • rack up points</p>
  </div>
</template>
