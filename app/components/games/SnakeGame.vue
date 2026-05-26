<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const score    = ref(0)
const state    = ref<'idle' | 'playing' | 'over'>('idle')

const COLS = 20, ROWS = 20, CELL = 20
const W = COLS * CELL, H = ROWS * CELL
const τ = Math.PI * 2

type Dir  = 'up' | 'down' | 'left' | 'right'
type Cell = { x: number; y: number }

interface Particle { x: number; y: number; vx: number; vy: number; age: number; maxAge: number; r: number; color: string }
interface ScorePopup { x: number; y: number; vy: number; age: number; maxAge: number; text: string }

let raf = 0
let snake: Cell[] = []
let dir: Dir = 'right'
let nextDir: Dir = 'right'
let food: Cell = { x: 10, y: 10 }
let lastMove = 0
let particles: Particle[] = []
let scorePopups: ScorePopup[] = []
let shakeTimer = 0
let titlePulse = 0

const { score: sfxScore, die: sfxDie } = useGameSounds()

function speed() { return Math.max(80, 150 - score.value * 3) }

function reset() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]
  dir = nextDir = 'right'
  score.value = 0
  particles = []; scorePopups = []; shakeTimer = 0
  spawnFood()
}

function spawnFood() {
  do {
    food = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }
  } while (snake.some(s => s.x === food.x && s.y === food.y))
}

function spawnParticles(x: number, y: number, color: string) {
  for (let i = 0; i < 7; i++) {
    const angle = (τ / 7) * i + Math.random() * 0.4
    const speed2 = 1.5 + Math.random() * 2
    particles.push({ x, y, vx: Math.cos(angle) * speed2, vy: Math.sin(angle) * speed2, age: 0, maxAge: 20, r: 2 + Math.random() * 2, color })
  }
}

function step() {
  dir = nextDir
  const h = snake[0]!
  const head: Cell = {
    x: dir === 'left' ? h.x - 1 : dir === 'right' ? h.x + 1 : h.x,
    y: dir === 'up'   ? h.y - 1 : dir === 'down'  ? h.y + 1 : h.y,
  }
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS ||
      snake.some(s => s.x === head.x && s.y === head.y)) {
    // Death shake + particles at head
    shakeTimer = 8
    spawnParticles(h.x * CELL + CELL / 2, h.y * CELL + CELL / 2, '#00d4ff')
    sfxDie()
    state.value = 'over'
    return
  }
  snake.unshift(head)
  if (head.x === food.x && head.y === food.y) {
    score.value++
    sfxScore()
    // Eat particles + popup
    spawnParticles(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, '#00ff88')
    scorePopups.push({ x: food.x * CELL + CELL / 2, y: food.y * CELL, vy: -0.7, age: 0, maxAge: 38, text: '+1' })
    spawnFood()
  }
  else snake.pop()
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

  // Grid
  ctx.fillStyle = 'rgba(255,255,255,0.025)'
  for (let x = 0; x <= COLS; x++) { ctx.fillRect(x * CELL, 0, 1, H) }
  for (let y = 0; y <= ROWS; y++) { ctx.fillRect(0, y * CELL, W, 1) }

  if (state.value === 'playing' && ts - lastMove > speed()) {
    step()
    lastMove = ts
  }

  // Update particles
  if (state.value === 'playing') {
    for (const p of particles) { p.x += p.vx; p.y += p.vy; p.age++ }
    particles = particles.filter(p => p.age < p.maxAge)
    for (const sp of scorePopups) { sp.y += sp.vy; sp.age++ }
    scorePopups = scorePopups.filter(sp => sp.age < sp.maxAge)
  }

  // Food
  ctx.save()
  ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 16
  ctx.fillStyle = '#00ff88'
  ctx.beginPath()
  ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 4, 0, τ)
  ctx.fill()
  ctx.restore()

  // Snake body
  for (let i = snake.length - 1; i >= 0; i--) {
    const s = snake[i]!
    const isHead = i === 0
    const alpha = Math.max(0.25, 1 - i * 0.025)
    ctx.save()
    ctx.shadowColor = isHead ? '#00d4ff' : '#a855f7'
    ctx.shadowBlur  = isHead ? 14 : 4
    ctx.fillStyle   = isHead ? '#00d4ff' : `rgba(168,85,247,${alpha})`
    ctx.beginPath()
    ctx.roundRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4, isHead ? 5 : 3)
    ctx.fill()
    ctx.restore()
  }

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
    ctx.fillStyle = '#00ff88'
    ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 6
    ctx.fillText(sp.text, sp.x, sp.y)
  }
  ctx.restore()

  // Overlays
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.78)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    const pulse = 0.5 + 0.5 * Math.sin(titlePulse * 0.003)
    ctx.shadowColor = '#00d4ff'
    ctx.shadowBlur = 8 + pulse * 18
    ctx.fillStyle = '#00d4ff'
    ctx.font = "bold 26px 'Space Grotesk', sans-serif"
    ctx.fillText('NEON SNAKE', W / 2, H / 2 - 28)
    ctx.shadowBlur = 0
    // Animated snake segments
    for (let i = 0; i < 5; i++) {
      const sx = W / 2 - 40 + i * 20
      const sy = H / 2 + 8 + Math.sin(titlePulse * 0.002 + i * 0.5) * 4
      ctx.save()
      ctx.shadowColor = i === 0 ? '#00d4ff' : '#a855f7'
      ctx.shadowBlur = 6 + pulse * 6
      ctx.fillStyle = i === 0 ? '#00d4ff' : `rgba(168,85,247,${1 - i * 0.15})`
      ctx.beginPath()
      ctx.roundRect(sx - 7, sy - 7, 14, 14, i === 0 ? 5 : 3)
      ctx.fill()
      ctx.restore()
    }
    ctx.fillStyle = 'rgba(200,220,255,0.55)'
    ctx.font = "13px 'Courier New', monospace"
    ctx.fillText('Press any arrow key to start', W / 2, H / 2 + 32)
  }

  ctx.restore()
}

function restart() {
  reset()
  state.value = 'playing'
}

function onKey(e: KeyboardEvent) {
  const arrowMap: Record<string, Dir> = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  }
  const opposite: Record<Dir, Dir> = { up:'down', down:'up', left:'right', right:'left' }
  if (!(e.key in arrowMap)) return
  e.preventDefault()
  if (state.value === 'idle') { reset(); state.value = 'playing'; return }
  if (state.value !== 'playing') return
  const d = arrowMap[e.key]!
  if (d !== opposite[dir]) nextDir = d
}

onMounted(() => {
  if (canvasEl.value) { canvasEl.value.width = W; canvasEl.value.height = H }
  window.addEventListener('keydown', onKey)
  raf = requestAnimationFrame(frame)
})
onUnmounted(() => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey) })
</script>

<template>
  <div class="flex flex-col items-center gap-3 select-none">
    <div class="glass-hud px-6 py-2 text-center">
      <p class="hud-label text-[10px]">SCORE</p>
      <p class="font-mono font-bold text-white text-lg leading-tight">{{ score }}</p>
    </div>
    <div class="relative">
      <canvas ref="canvasEl" class="rounded-xl border border-white/10 block" />

      <GameResultOverlay :state="state" :score="score" @restart="restart" />
    </div>
    <p class="font-mono text-xs text-slate-600">Arrow keys to move • eat green orbs • don't crash</p>
  </div>
</template>
