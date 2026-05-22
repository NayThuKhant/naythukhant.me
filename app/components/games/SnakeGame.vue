<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const score    = ref(0)
const state    = ref<'idle' | 'playing' | 'over'>('idle')

const COLS = 20, ROWS = 20, CELL = 20
const W = COLS * CELL, H = ROWS * CELL
const τ = Math.PI * 2

type Dir  = 'up' | 'down' | 'left' | 'right'
type Cell = { x: number; y: number }

let raf = 0
let snake: Cell[] = []
let dir: Dir = 'right'
let nextDir: Dir = 'right'
let food: Cell = { x: 10, y: 10 }
let lastMove = 0

function speed() { return Math.max(80, 150 - score.value * 3) }

function reset() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]
  dir = nextDir = 'right'
  score.value = 0
  spawnFood()
}

function spawnFood() {
  do {
    food = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }
  } while (snake.some(s => s.x === food.x && s.y === food.y))
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
    state.value = 'over'
    return
  }
  snake.unshift(head)
  if (head.x === food.x && head.y === food.y) { score.value++; spawnFood() }
  else snake.pop()
}

function frame(ts: number) {
  raf = requestAnimationFrame(frame)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return

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

  // Overlays
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.78)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#00d4ff'
    ctx.font = "bold 26px 'Space Grotesk', sans-serif"
    ctx.fillText('NEON SNAKE', W / 2, H / 2 - 28)
    ctx.fillStyle = 'rgba(200,220,255,0.55)'
    ctx.font = "13px 'Courier New', monospace"
    ctx.fillText('Press any arrow key to start', W / 2, H / 2 + 10)
  }
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

      <div
        v-if="state === 'over'"
        class="absolute inset-0 rounded-xl flex items-center justify-center"
        style="background: rgba(3,7,18,0.88)"
      >
        <div class="flex flex-col items-center gap-4 border border-white/10 bg-white/[0.04] rounded-2xl px-10 py-8">
          <p class="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-500">GAME OVER</p>
          <p class="font-display font-bold text-4xl text-white">{{ score }}</p>
          <p class="hud-label text-[10px]">SCORE</p>
          <button
            class="mt-2 px-10 py-2.5 font-mono text-xs tracking-widest uppercase rounded-lg border border-neon-blue/30 bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20 hover:border-neon-blue/50 transition-all cursor-pointer"
            @click.stop="restart"
          >↺ RESTART</button>
        </div>
      </div>
    </div>
    <p class="font-mono text-xs text-slate-600">Arrow keys to move • eat green orbs • don't crash</p>
  </div>
</template>
