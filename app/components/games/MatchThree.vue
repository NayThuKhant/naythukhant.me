<script setup lang="ts">
import { ControlLayout } from '~/types'

const canvasEl = ref<HTMLCanvasElement | null>(null)
const score    = ref(0)
const timeLeft = ref(90)
const state    = ref<'idle' | 'playing' | 'won' | 'over'>('idle')

const COLS = 8, ROWS = 8, CELL = 48
const W = COLS * CELL, H = ROWS * CELL
const COLORS = ['#f472b6', '#00d4ff', '#00ff88', '#a855f7', '#fb923c', '#facc15']
const τ = Math.PI * 2

const { pop: sfxPop, score: sfxScore, win: sfxWin, lose: sfxLose } = useGameSounds()

let raf = 0
let titlePulse = 0
let timerInterval: ReturnType<typeof setInterval> | null = null

// Grid: 0-5 color index, -1 = empty
let grid: number[][] = []
let selected: { r: number; c: number } | null = null

interface MatchAnim { r: number; c: number; scale: number; age: number }
let matchAnims: MatchAnim[] = []
let falling = false
let fallTimeout = 0

function makeGrid(): number[][] {
  const g: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let color: number
      do {
        color = Math.floor(Math.random() * COLORS.length)
      } while (
        (c >= 2 && g[r]![c - 1] === color && g[r]![c - 2] === color) ||
        (r >= 2 && g[r - 1]![c] === color && g[r - 2]![c] === color)
      )
      g[r]![c] = color
    }
  }
  return g
}

function findMatches(): Array<{ r: number; c: number }> {
  const matched = new Set<string>()
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    let run = 1
    for (let c = 1; c <= COLS; c++) {
      if (c < COLS && grid[r]![c] === grid[r]![c - 1] && grid[r]![c] !== -1) {
        run++
      } else {
        if (run >= 3) for (let k = c - run; k < c; k++) matched.add(`${r},${k}`)
        run = 1
      }
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    let run = 1
    for (let r = 1; r <= ROWS; r++) {
      if (r < ROWS && grid[r]![c] === grid[r - 1]![c] && grid[r]![c] !== -1) {
        run++
      } else {
        if (run >= 3) for (let k = r - run; k < r; k++) matched.add(`${k},${c}`)
        run = 1
      }
    }
  }
  return [...matched].map(s => { const [r, c] = s.split(',').map(Number); return { r: r!, c: c! } })
}

function countRun(matched: Array<{ r: number; c: number }>, r: number, c: number): number {
  // Simple: find the longest run containing this cell in horizontal or vertical
  let max = 1
  // Horizontal
  let len = 0
  for (let col = 0; col < COLS; col++) if (matched.some(m => m.r === r && m.c === col)) len++; else { max = Math.max(max, len); len = 0 }
  max = Math.max(max, len)
  len = 0
  for (let row = 0; row < ROWS; row++) if (matched.some(m => m.r === row && m.c === c)) len++; else { max = Math.max(max, len); len = 0 }
  max = Math.max(max, len)
  return max
}

function removeMatches(matched: Array<{ r: number; c: number }>, cascade: number) {
  if (matched.length === 0) return
  sfxPop()
  if (cascade > 0) sfxScore()

  // Score
  for (const m of matched) {
    const run = countRun(matched, m.r, m.c)
    const pts = run >= 5 ? 200 : run === 4 ? 80 : 30
    score.value += pts * (1 + cascade)
  }

  // Animate before removing
  for (const m of matched) {
    matchAnims.push({ r: m.r, c: m.c, scale: 1, age: 0 })
    grid[m.r]![m.c] = -1
  }

  if (score.value >= 1000) {
    setTimeout(() => {
      state.value = 'won'
      sfxWin()
      stopTimer()
    }, 350)
    return
  }

  // After anim, apply gravity + check cascades
  clearTimeout(fallTimeout)
  falling = true
  fallTimeout = window.setTimeout(() => {
    applyGravity()
    falling = false
    const next = findMatches()
    if (next.length > 0) removeMatches(next, cascade + 1)
  }, 300)
}

function applyGravity() {
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r]![c] !== -1) { grid[write]![c] = grid[r]![c]!; if (write !== r) grid[r]![c] = -1; write-- }
    }
    while (write >= 0) { grid[write]![c] = Math.floor(Math.random() * COLORS.length); write-- }
  }
}

function swap(r1: number, c1: number, r2: number, c2: number) {
  const tmp = grid[r1]![c1]!
  grid[r1]![c1] = grid[r2]![c2]!
  grid[r2]![c2] = tmp
}

function onCanvasClick(e: MouseEvent) {
  if (state.value === 'idle') { startGame(); return }
  if (state.value !== 'playing' || falling) return
  const rect = canvasEl.value!.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const c = Math.floor(mx / CELL)
  const r = Math.floor(my / CELL)
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return

  if (!selected) {
    selected = { r, c }
    return
  }
  const dr = Math.abs(selected.r - r)
  const dc = Math.abs(selected.c - c)
  if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
    // Try swap
    swap(selected.r, selected.c, r, c)
    const matched = findMatches()
    if (matched.length > 0) {
      removeMatches(matched, 0)
    } else {
      // Swap back
      swap(selected.r, selected.c, r, c)
    }
  }
  selected = null
}

function startGame() {
  grid = makeGrid()
  selected = null
  score.value = 0
  timeLeft.value = 90
  matchAnims = []
  falling = false
  state.value = 'playing'
  startTimer()
}

function restart() {
  stopTimer()
  startGame()
}

function startTimer() {
  stopTimer()
  timerInterval = setInterval(() => {
    if (state.value !== 'playing') { stopTimer(); return }
    timeLeft.value--
    if (timeLeft.value <= 0) {
      stopTimer()
      state.value = 'over'
      sfxLose()
    }
  }, 1000)
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
}

function draw(ts: number) {
  raf = requestAnimationFrame(draw)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return
  titlePulse = ts

  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, W, H)

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth = 1
  for (let i = 0; i <= COLS; i++) { ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, H); ctx.stroke() }
  for (let i = 0; i <= ROWS; i++) { ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(W, i * CELL); ctx.stroke() }

  if (state.value !== 'idle') {
    // Draw gems
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const colorIdx = grid[r]?.[c] ?? -1
        if (colorIdx === -1) continue
        const color = COLORS[colorIdx]!
        const cx = c * CELL + CELL / 2
        const cy = r * CELL + CELL / 2
        const anim = matchAnims.find(a => a.r === r && a.c === c)
        const scale = anim ? (1 + (1 - anim.age / 8) * 0.4) : 1
        const isSelected = selected?.r === r && selected?.c === c
        const rad = (CELL / 2 - 6) * scale

        ctx.save()
        ctx.translate(cx, cy)
        ctx.shadowColor = color
        ctx.shadowBlur = isSelected ? 20 : 10
        ctx.fillStyle = color
        ctx.globalAlpha = anim ? Math.max(0, 1 - anim.age / 8) : 1
        ctx.beginPath()
        ctx.arc(0, 0, rad, 0, τ)
        ctx.fill()

        // Inner highlight
        ctx.shadowBlur = 0
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        ctx.beginPath()
        ctx.arc(-rad * 0.25, -rad * 0.25, rad * 0.3, 0, τ)
        ctx.fill()

        // Selected ring
        if (isSelected) {
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2.5
          ctx.shadowColor = '#ffffff'
          ctx.shadowBlur = 12
          ctx.beginPath()
          ctx.arc(0, 0, rad + 3, 0, τ)
          ctx.stroke()
        }
        ctx.restore()
      }
    }

    // Update match anims
    for (const a of matchAnims) a.age++
    matchAnims = matchAnims.filter(a => a.age < 8)
  }

  // Idle overlay
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.82)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    const pulse = 0.5 + 0.5 * Math.sin(titlePulse * 0.003)
    ctx.shadowColor = '#a855f7'
    ctx.shadowBlur = 8 + pulse * 16
    ctx.fillStyle = '#a855f7'
    ctx.font = "bold 28px 'Space Grotesk', sans-serif"
    ctx.fillText('MATCH THREE', W / 2, H / 2 - 40)
    ctx.shadowBlur = 0
    // Sample gem row
    const demoColors = ['#f472b6', '#00d4ff', '#00ff88', '#a855f7', '#fb923c']
    for (let i = 0; i < 5; i++) {
      const dcx = W / 2 - 96 + i * 48
      ctx.save()
      ctx.shadowColor = demoColors[i]!; ctx.shadowBlur = 10 + pulse * 8
      ctx.fillStyle = demoColors[i]!
      ctx.beginPath(); ctx.arc(dcx, H / 2, 14, 0, τ); ctx.fill()
      ctx.restore()
    }
    ctx.fillStyle = 'rgba(200,220,255,0.45)'
    ctx.font = "13px 'Courier New', monospace"
    ctx.fillText('Click to start', W / 2, H / 2 + 48)
  }
}

onMounted(() => {
  const c = canvasEl.value!
  c.width = W; c.height = H
  c.addEventListener('click', onCanvasClick)
  raf = requestAnimationFrame(draw)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  canvasEl.value?.removeEventListener('click', onCanvasClick)
  stopTimer()
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
        <p class="hud-label text-[10px]">TIME</p>
        <p class="font-mono font-bold text-lg leading-tight" :class="timeLeft <= 20 ? 'text-red-400' : 'text-neon-emerald'">
          {{ timeLeft }}s
        </p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">TARGET</p>
        <p class="font-mono font-bold text-neon-purple text-lg leading-tight">1000</p>
      </div>
    </div>

    <div class="relative">
      <canvas ref="canvasEl" class="rounded-xl border border-white/10 block cursor-pointer" />
      <GameResultOverlay
        v-if="state === 'won' || state === 'over'"
        :state="state"
        :score="score"
        :extra="state === 'won' ? 'Target reached!' : 'Time\'s up!'"
        @restart="restart"
      />
    </div>
    <p class="font-mono text-xs text-slate-600">Click a gem, then an adjacent gem to swap • Reach 1000 pts</p>
  </div>
</template>
