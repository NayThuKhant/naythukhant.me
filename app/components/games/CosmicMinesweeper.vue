<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const minesLeft = ref(10)
const state     = ref<'idle' | 'playing' | 'won' | 'lost'>('idle')

const COLS  = 9
const ROWS  = 9
const CELL  = 40
const W     = COLS * CELL
const H     = ROWS * CELL
const MINES = 10
const τ     = Math.PI * 2

type CellData = {
  mine: boolean
  revealed: boolean
  flagged: boolean
  adjacent: number
}

let grid: CellData[][] = []
let raf = 0
let firstClick = true

function makeGrid(): CellData[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    }))
  )
}

function placeMines(skipR: number, skipC: number) {
  let placed = 0
  while (placed < MINES) {
    const r = Math.floor(Math.random() * ROWS)
    const c = Math.floor(Math.random() * COLS)
    if (!grid[r]![c]!.mine && !(r === skipR && c === skipC)) {
      grid[r]![c]!.mine = true
      placed++
    }
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r]![c]!.mine) continue
      let count = 0
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr]![nc]!.mine) count++
        }
      }
      grid[r]![c]!.adjacent = count
    }
  }
}

function flood(r: number, c: number) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return
  const cell = grid[r]![c]!
  if (cell.revealed || cell.flagged || cell.mine) return
  cell.revealed = true
  if (cell.adjacent === 0) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr !== 0 || dc !== 0) flood(r + dr, c + dc)
      }
    }
  }
}

function checkWin() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r]![c]!
      if (!cell.mine && !cell.revealed) return false
    }
  }
  return true
}

function reset() {
  grid = makeGrid()
  firstClick = true
  minesLeft.value = MINES
  state.value = 'playing'
}

function numColor(n: number): string {
  if (n === 1) return '#00d4ff'
  if (n === 2) return '#00ff88'
  if (n === 3) return '#f472b6'
  if (n === 4) return '#a855f7'
  return '#fb923c'
}

function drawFlag(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save()
  ctx.shadowColor = '#a855f7'
  ctx.shadowBlur = 10
  ctx.strokeStyle = '#a855f7'
  ctx.lineWidth = 2
  // Pole
  ctx.beginPath()
  ctx.moveTo(cx - 4, cy + 10)
  ctx.lineTo(cx - 4, cy - 10)
  ctx.stroke()
  // Flag triangle
  ctx.fillStyle = '#a855f7'
  ctx.beginPath()
  ctx.moveTo(cx - 4, cy - 10)
  ctx.lineTo(cx + 10, cy - 4)
  ctx.lineTo(cx - 4, cy + 2)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawMine(ctx: CanvasRenderingContext2D, cx: number, cy: number, exploded: boolean) {
  ctx.save()
  const color = exploded ? '#ff4444' : '#f472b6'
  ctx.shadowColor = color
  ctx.shadowBlur = 18
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(cx, cy, 9, 0, τ)
  ctx.fill()
  // Spikes
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * τ
    const inner = 9, outer = 14
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner)
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer)
    ctx.stroke()
  }
  ctx.restore()
}

function draw() {
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, W, H)

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 1
  for (let i = 0; i <= COLS; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, H); ctx.stroke()
  }
  for (let j = 0; j <= ROWS; j++) {
    ctx.beginPath(); ctx.moveTo(0, j * CELL); ctx.lineTo(W, j * CELL); ctx.stroke()
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r]![c]!
      const x = c * CELL, y = r * CELL
      const cx = x + CELL / 2, cy = y + CELL / 2

      if (cell.revealed) {
        // Revealed cell - lighter bg
        ctx.fillStyle = 'rgba(255,255,255,0.04)'
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2)

        if (cell.mine) {
          drawMine(ctx, cx, cy, true)
        } else if (cell.adjacent > 0) {
          ctx.save()
          ctx.fillStyle = numColor(cell.adjacent)
          ctx.shadowColor = numColor(cell.adjacent)
          ctx.shadowBlur = 8
          ctx.font = "bold 16px 'Courier New', monospace"
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(cell.adjacent), cx, cy)
          ctx.restore()
        }
      } else {
        // Unrevealed cell
        ctx.fillStyle = 'rgba(255,255,255,0.03)'
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2)
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'
        ctx.lineWidth = 1
        ctx.strokeRect(x + 1.5, y + 1.5, CELL - 3, CELL - 3)

        if (cell.flagged) {
          drawFlag(ctx, cx, cy)
        } else if (state.value === 'lost' && cell.mine) {
          drawMine(ctx, cx, cy, false)
        }
      }
    }
  }

  // Overlays
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.82)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'

    ctx.save()
    ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 20
    ctx.fillStyle = '#00d4ff'
    ctx.font = "bold 26px 'Space Grotesk', sans-serif"
    ctx.fillText('COSMIC MINESWEEPER', W / 2, H / 2 - 28)
    ctx.restore()
    ctx.fillStyle = 'rgba(200,220,255,0.55)'
    ctx.font = "13px 'Courier New', monospace"
    ctx.fillText('Click to start', W / 2, H / 2 + 10)
  }
}

function frame() {
  raf = requestAnimationFrame(frame)
  draw()
}

function getCellCoords(e: MouseEvent): { r: number; c: number } | null {
  const canvas = canvasEl.value
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  const scaleX = W / rect.width
  const scaleY = H / rect.height
  const x = (e.clientX - rect.left) * scaleX
  const y = (e.clientY - rect.top) * scaleY
  const c = Math.floor(x / CELL)
  const r = Math.floor(y / CELL)
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null
  return { r, c }
}

function onMouseDown(e: MouseEvent) {
  e.preventDefault()

  if (state.value === 'idle' || state.value === 'won' || state.value === 'lost') {
    reset()
    return
  }

  if (state.value !== 'playing') return

  const coords = getCellCoords(e)
  if (!coords) return
  const { r, c } = coords
  const cell = grid[r]![c]!

  if (e.button === 2) {
    // Right-click: flag/unflag
    if (!cell.revealed) {
      cell.flagged = !cell.flagged
      minesLeft.value += cell.flagged ? -1 : 1
    }
    return
  }

  // Left-click
  if (cell.flagged || cell.revealed) return

  if (firstClick) {
    placeMines(r, c)
    firstClick = false
  }

  if (cell.mine) {
    cell.revealed = true
    state.value = 'lost'
    return
  }

  flood(r, c)

  if (checkWin()) {
    state.value = 'won'
  }
}

function onContextMenu(e: MouseEvent) {
  e.preventDefault()
}

function restart() {
  grid = makeGrid()
  firstClick = true
  minesLeft.value = MINES
  state.value = 'playing'
}

onMounted(() => {
  const canvas = canvasEl.value
  if (canvas) {
    canvas.width = W
    canvas.height = H
  }
  grid = makeGrid()
  canvasEl.value?.addEventListener('mousedown', onMouseDown)
  canvasEl.value?.addEventListener('contextmenu', onContextMenu)
  raf = requestAnimationFrame(frame)
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  canvasEl.value?.removeEventListener('mousedown', onMouseDown)
  canvasEl.value?.removeEventListener('contextmenu', onContextMenu)
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 select-none">
    <div class="glass-hud px-6 py-2 text-center">
      <p class="hud-label text-[10px]">MINES LEFT</p>
      <p class="font-mono font-bold text-white text-lg leading-tight">{{ minesLeft }}</p>
    </div>
    <div class="relative">
      <canvas ref="canvasEl" class="rounded-xl border border-white/10 block cursor-pointer" />
      <div v-if="state === 'won' || state === 'lost'" class="absolute inset-0 rounded-xl flex items-center justify-center" style="background: rgba(3,7,18,0.88)">
        <div class="flex flex-col items-center gap-4 border border-white/10 bg-white/[0.04] rounded-2xl px-10 py-8">
          <p class="font-mono text-[10px] tracking-[0.2em] uppercase" :class="state === 'won' ? 'text-neon-emerald' : 'text-neon-pink'">
            {{ state === 'won' ? 'FIELD CLEARED' : 'MINE HIT' }}
          </p>
          <p class="font-display font-bold text-5xl" :class="state === 'won' ? 'text-neon-emerald' : 'text-white'">
            {{ state === 'won' ? '✓' : '✗' }}
          </p>
          <button class="mt-2 px-10 py-2.5 font-mono text-xs tracking-widest uppercase rounded-lg border border-neon-blue/30 bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20 hover:border-neon-blue/50 transition-all cursor-pointer" @click.stop="restart">↺ RESTART</button>
        </div>
      </div>
    </div>
    <p class="font-mono text-xs text-slate-600">Left-click to reveal • right-click to flag mines</p>
  </div>
</template>
