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

// --- Particle / popup interfaces ---
interface Particle {
  x: number; y: number
  vx: number; vy: number
  age: number; maxAge: number
  color: string; size: number
}

interface RevealAnim {
  r: number; c: number
  age: number; maxAge: number
}

interface FlagBounce {
  r: number; c: number
  age: number; maxAge: number
}

let grid: CellData[][] = []
let raf = 0
let firstClick = true
let particles: Particle[] = []
let revealAnims: RevealAnim[] = []
let flagBounces: FlagBounce[] = []
let explosionAnim = 0  // 0=off, 1..20 = frame
let explosionX = W / 2
let explosionY = H / 2
let lastTs = 0

function spawnParticles(x: number, y: number, color: string, n = 6) {
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * τ
    const spd = 1 + Math.random() * 2.5
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      age: 0, maxAge: 18 + Math.floor(Math.random() * 10),
      color, size: 1.5 + Math.random() * 2,
    })
  }
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
    ctx.arc(p.x, p.y, p.size, 0, τ)
    ctx.fill()
    ctx.restore()
  }
}

function makeGrid(): CellData[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      mine: false, revealed: false, flagged: false, adjacent: 0,
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
  // Spawn reveal anim
  revealAnims.push({ r, c, age: 0, maxAge: 12 })
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
  particles = []
  revealAnims = []
  flagBounces = []
  explosionAnim = 0
  state.value = 'playing'
}

function numColor(n: number): string {
  if (n === 1) return '#00d4ff'
  if (n === 2) return '#00ff88'
  if (n === 3) return '#f472b6'
  if (n === 4) return '#a855f7'
  return '#fb923c'
}

function drawFlag(ctx: CanvasRenderingContext2D, cx: number, cy: number, bounce: number) {
  ctx.save()
  // Bounce scale
  const scale = 1 + Math.sin(bounce * Math.PI) * 0.3
  ctx.translate(cx, cy)
  ctx.scale(scale, scale)
  ctx.translate(-cx, -cy)
  ctx.shadowColor = '#a855f7'
  ctx.shadowBlur = 10
  ctx.strokeStyle = '#a855f7'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx - 4, cy + 10)
  ctx.lineTo(cx - 4, cy - 10)
  ctx.stroke()
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
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * τ
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(angle) * 9, cy + Math.sin(angle) * 9)
    ctx.lineTo(cx + Math.cos(angle) * 14, cy + Math.sin(angle) * 14)
    ctx.stroke()
  }
  ctx.restore()
}

function draw(ts: number) {
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

  // Build a lookup for active reveal anims by cell
  const revealMap = new Map<string, number>()
  for (const ra of revealAnims) {
    revealMap.set(`${ra.r},${ra.c}`, 1 - ra.age / ra.maxAge)
  }

  // Build flag bounce lookup
  const flagBounceMap = new Map<string, number>()
  for (const fb of flagBounces) {
    flagBounceMap.set(`${fb.r},${fb.c}`, fb.age / fb.maxAge)
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r]![c]!
      const x = c * CELL, y = r * CELL
      const cx = x + CELL / 2, cy = y + CELL / 2
      const revealProgress = revealMap.get(`${r},${c}`) ?? 0

      if (cell.revealed) {
        // Scale-up animation on reveal
        if (revealProgress > 0) {
          ctx.save()
          const scale = 1.0 + revealProgress * 0.25
          ctx.translate(cx, cy)
          ctx.scale(scale, scale)
          ctx.translate(-cx, -cy)
        }
        ctx.fillStyle = `rgba(255,255,255,${0.04 + revealProgress * 0.06})`
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
        if (revealProgress > 0) ctx.restore()
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.03)'
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2)
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'
        ctx.lineWidth = 1
        ctx.strokeRect(x + 1.5, y + 1.5, CELL - 3, CELL - 3)
        if (cell.flagged) {
          const bounce = flagBounceMap.get(`${r},${c}`) ?? 0
          drawFlag(ctx, cx, cy, bounce)
        } else if (state.value === 'lost' && cell.mine) {
          drawMine(ctx, cx, cy, false)
        }
      }
    }
  }

  // Update animations
  for (const ra of revealAnims) ra.age++
  revealAnims = revealAnims.filter(ra => ra.age < ra.maxAge)
  for (const fb of flagBounces) fb.age++
  flagBounces = flagBounces.filter(fb => fb.age < fb.maxAge)

  // Particles
  updateParticles()
  drawParticles(ctx)

  // Mine explosion ring
  if (explosionAnim > 0 && explosionAnim <= 20) {
    const t = explosionAnim / 20
    const r = 8 + t * 50
    ctx.save()
    ctx.globalAlpha = (1 - t) * 0.9
    ctx.strokeStyle = '#ff4444'
    ctx.shadowColor = '#ff4444'
    ctx.shadowBlur = 20
    ctx.lineWidth = 4 * (1 - t) + 1
    ctx.beginPath()
    ctx.arc(explosionX, explosionY, r, 0, τ)
    ctx.stroke()
    ctx.restore()
    explosionAnim++
  }

  // Overlays
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.82)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    const pulse = 0.6 + 0.4 * Math.sin(ts * 0.003)
    ctx.save()
    ctx.shadowColor = '#00d4ff'
    ctx.shadowBlur  = 20 + 12 * pulse
    ctx.fillStyle   = `rgba(0,212,255,${0.7 + 0.3 * pulse})`
    ctx.font = "bold 26px 'Space Grotesk', sans-serif"
    ctx.fillText('COSMIC MINESWEEPER', W / 2, H / 2 - 28)
    ctx.restore()
    if (Math.floor(ts / 600) % 2 === 0) {
      ctx.fillStyle = 'rgba(200,220,255,0.55)'
      ctx.font = "13px 'Courier New', monospace"
      ctx.fillText('Click to start', W / 2, H / 2 + 10)
    }
  }
}

function frame(ts: number) {
  raf = requestAnimationFrame(frame)
  lastTs = ts
  draw(ts)
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

  if (state.value === 'idle') {
    reset()
    return
  }

  if (state.value === 'won' || state.value === 'lost') return

  if (state.value !== 'playing') return

  const coords = getCellCoords(e)
  if (!coords) return
  const { r, c } = coords
  const cell = grid[r]![c]!

  if (e.button === 2) {
    if (!cell.revealed) {
      cell.flagged = !cell.flagged
      minesLeft.value += cell.flagged ? -1 : 1
      // Flag bounce animation
      if (cell.flagged) {
        flagBounces.push({ r, c, age: 0, maxAge: 10 })
        // Small purple particles on flag place
        const cx = c * CELL + CELL / 2
        const cy = r * CELL + CELL / 2
        spawnParticles(cx, cy, '#a855f7', 5)
      }
    }
    return
  }

  if (cell.flagged || cell.revealed) return

  if (firstClick) {
    placeMines(r, c)
    firstClick = false
  }

  if (cell.mine) {
    cell.revealed = true
    const cx = c * CELL + CELL / 2
    const cy = r * CELL + CELL / 2
    explosionX = cx
    explosionY = cy
    explosionAnim = 1
    spawnParticles(cx, cy, '#ff4444', 10)
    state.value = 'lost'
    return
  }

  flood(r, c)

  // Particles on reveal (non-mine)
  const cx = c * CELL + CELL / 2
  const cy = r * CELL + CELL / 2
  const numColor_ = cell.adjacent > 0 ? numColor(cell.adjacent) : '#00d4ff'
  spawnParticles(cx, cy, numColor_, 4)

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
  particles = []
  revealAnims = []
  flagBounces = []
  explosionAnim = 0
  state.value = 'playing'
}

onMounted(() => {
  const canvas = canvasEl.value
  if (canvas) { canvas.width = W; canvas.height = H }
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
      <GameResultOverlay :state="state === 'lost' ? 'over' : state" :score="0" @restart="restart" />
    </div>
    <p class="font-mono text-xs text-slate-600">Left-click to reveal • right-click to flag mines</p>
  </div>
</template>
