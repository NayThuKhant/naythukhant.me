<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const score = ref(0)
const lines = ref(0)
const level = ref(1)
const state = ref<'idle' | 'playing' | 'over'>('idle')

const COLS = 10, ROWS = 20, CELL = 26
const W = COLS * CELL, H = ROWS * CELL

const SHAPES: { cells: [number, number][], color: string }[] = [
  { cells: [[0,0],[1,0],[2,0],[3,0]], color: '#00d4ff' }, // I
  { cells: [[0,0],[1,0],[0,1],[1,1]], color: '#ffd700' }, // O
  { cells: [[1,0],[0,1],[1,1],[2,1]], color: '#a855f7' }, // T
  { cells: [[1,0],[2,0],[0,1],[1,1]], color: '#00ff88' }, // S
  { cells: [[0,0],[1,0],[1,1],[2,1]], color: '#f472b6' }, // Z
  { cells: [[0,0],[0,1],[1,1],[2,1]], color: '#f97316' }, // J
  { cells: [[2,0],[0,1],[1,1],[2,1]], color: '#60a5fa' }, // L
]

type Grid = (string | null)[][]
interface Piece { cells: [number, number][]; color: string; x: number; y: number }

let grid: Grid = []
let piece: Piece | null = null
let nextPiece: Piece | null = null
let raf = 0
let lastDrop = 0

function dropInterval() { return Math.max(100, 800 - (level.value - 1) * 70) }

function newGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array<string | null>(COLS).fill(null))
}

function randomPiece(): Piece {
  const s = SHAPES[Math.floor(Math.random() * SHAPES.length)]!
  return { cells: s.cells.map(([x, y]) => [x, y] as [number, number]), color: s.color, x: 3, y: 0 }
}

function rotate(cells: [number, number][]): [number, number][] {
  const maxY = Math.max(...cells.map(([, y]) => y))
  return cells.map(([x, y]) => [maxY - y, x] as [number, number])
}

function valid(cells: [number, number][], ox: number, oy: number): boolean {
  return cells.every(([cx, cy]) => {
    const nx = cx + ox, ny = cy + oy
    if (nx < 0 || nx >= COLS || ny >= ROWS) return false
    if (ny < 0) return true
    return grid[ny]![nx] === null
  })
}

function lock() {
  if (!piece) return
  for (const [cx, cy] of piece.cells) {
    const ny = cy + piece.y
    if (ny >= 0 && ny < ROWS) grid[ny]![cx + piece.x] = piece.color
  }

  let cleared = 0
  for (let r = ROWS - 1; r >= 0; ) {
    if (grid[r]!.every(c => c !== null)) {
      grid.splice(r, 1)
      grid.unshift(Array<string | null>(COLS).fill(null))
      cleared++
    } else {
      r--
    }
  }

  if (cleared > 0) {
    score.value += ([0, 100, 300, 500, 800][cleared] ?? 800) * level.value
    lines.value += cleared
    level.value = Math.floor(lines.value / 10) + 1
  }

  piece = nextPiece ?? randomPiece()
  nextPiece = randomPiece()
  if (!valid(piece.cells, piece.x, piece.y)) {
    state.value = 'over'
    piece = null
  }
}

function ghostRow(): number {
  if (!piece) return 0
  let gy = piece.y
  while (valid(piece.cells, piece.x, gy + 1)) gy++
  return gy
}

function drawCell(ctx: CanvasRenderingContext2D, col: number, row: number, color: string, alpha = 1) {
  if (row < 0) return
  const x = col * CELL + 1, y = row * CELL + 1, s = CELL - 2
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.shadowColor = color; ctx.shadowBlur = 10
  ctx.fillStyle = color; ctx.fillRect(x, y, s, s)
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.fillRect(x, y, s, 3); ctx.fillRect(x, y, 3, s)
  ctx.restore()
}

function frame(ts: number) {
  raf = requestAnimationFrame(frame)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#030712'; ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = 'rgba(255,255,255,0.03)'
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    ctx.fillRect(c * CELL + CELL / 2, r * CELL + CELL / 2, 1, 1)
  }

  if (state.value === 'playing' && piece) {
    if (ts - lastDrop > dropInterval()) {
      if (valid(piece.cells, piece.x, piece.y + 1)) piece.y++
      else lock()
      lastDrop = ts
    }
  }

  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const color = grid[r]![c]
    if (color) drawCell(ctx, c, r, color)
  }

  if (piece && state.value === 'playing') {
    const gy = ghostRow()
    if (gy !== piece.y) {
      for (const [cx, cy] of piece.cells) drawCell(ctx, cx + piece.x, cy + gy, piece.color, 0.15)
    }
    for (const [cx, cy] of piece.cells) drawCell(ctx, cx + piece.x, cy + piece.y, piece.color)
  }

  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.82)'; ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#00d4ff'
    ctx.font = "bold 22px 'Space Grotesk', sans-serif"
    ctx.fillText('NEON TETRIS', W / 2, H / 2 - 24)
    ctx.fillStyle = 'rgba(200,220,255,0.5)'
    ctx.font = "11px 'Courier New', monospace"
    ctx.fillText('Press any arrow key to start', W / 2, H / 2 + 12)
  }
}

function start() {
  grid = newGrid(); score.value = 0; lines.value = 0; level.value = 1; lastDrop = 0
  piece = randomPiece(); nextPiece = randomPiece(); state.value = 'playing'
}

function restart() {
  start()
}

function onKey(e: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
  e.preventDefault()
  if (state.value === 'idle') { start(); return }
  if (state.value !== 'playing') return
  if (!piece) return
  if (e.key === 'ArrowLeft'  && valid(piece.cells, piece.x - 1, piece.y)) piece.x--
  if (e.key === 'ArrowRight' && valid(piece.cells, piece.x + 1, piece.y)) piece.x++
  if (e.key === 'ArrowDown') {
    if (valid(piece.cells, piece.x, piece.y + 1)) { piece.y++; lastDrop = performance.now() }
    else lock()
  }
  if (e.key === 'ArrowUp') {
    const r = rotate(piece.cells)
    if      (valid(r, piece.x,     piece.y)) { piece.cells = r }
    else if (valid(r, piece.x + 1, piece.y)) { piece.cells = r; piece.x++ }
    else if (valid(r, piece.x - 1, piece.y)) { piece.cells = r; piece.x-- }
    else if (valid(r, piece.x + 2, piece.y)) { piece.cells = r; piece.x += 2 }
    else if (valid(r, piece.x - 2, piece.y)) { piece.cells = r; piece.x -= 2 }
  }
}

onMounted(() => {
  grid = newGrid()
  if (canvasEl.value) { canvasEl.value.width = W; canvasEl.value.height = H }
  window.addEventListener('keydown', onKey)
  raf = requestAnimationFrame(frame)
})
onUnmounted(() => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey) })
</script>

<template>
  <div class="flex flex-col items-center gap-3 select-none">
    <div class="flex gap-4">
      <div class="glass-hud px-4 py-2 text-center min-w-16">
        <p class="hud-label text-[10px]">SCORE</p>
        <p class="font-mono font-bold text-white text-base leading-tight">{{ score }}</p>
      </div>
      <div class="glass-hud px-4 py-2 text-center min-w-16">
        <p class="hud-label text-[10px]">LINES</p>
        <p class="font-mono font-bold text-white text-base leading-tight">{{ lines }}</p>
      </div>
      <div class="glass-hud px-4 py-2 text-center min-w-16">
        <p class="hud-label text-[10px]">LVL</p>
        <p class="font-mono font-bold text-white text-base leading-tight">{{ level }}</p>
      </div>
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
    <p class="font-mono text-xs text-slate-600">← → move · ↑ rotate · ↓ drop</p>
  </div>
</template>
