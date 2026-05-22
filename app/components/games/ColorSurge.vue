<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const score    = ref(0)
const nextColor = ref(0)
const state    = ref<'idle' | 'playing' | 'over'>('idle')

const W = 360, H = 480
const τ = Math.PI * 2

const COLS = 8
const BUBBLE_R = 20
const BUBBLE_D = BUBBLE_R * 2
const ROW_H = BUBBLE_R * 1.74   // hexagonal row offset
const GRID_OFFSET_X = BUBBLE_R + 4
const GRID_OFFSET_Y = BUBBLE_R + 4
const LAUNCHER_X = W / 2
const LAUNCHER_Y = H - 36
const MAX_ROWS = 6
const DEAD_LINE = H - 80

// Colors: neon-blue, neon-purple, neon-emerald, neon-pink
const COLORS = ['#00d4ff', '#a855f7', '#00ff88', '#f472b6'] as const
const GLOW_COLORS = ['#00d4ff', '#a855f7', '#00ff88', '#f472b6'] as const

interface Bubble {
  x: number
  y: number
  col: number   // color index
  alive: boolean
}

interface Projectile {
  x: number
  y: number
  vx: number
  vy: number
  col: number
}

let raf = 0
let grid: (Bubble | null)[][] = []
let projectile: Projectile | null = null
let aimAngle = -Math.PI / 2   // radians; -90deg = straight up
let currentBubbleCol = 0
let pendingNextCol = 0
let canShoot = true
let keys = { left: false, right: false, fire: false }
let firePressedLastFrame = false

// --- Grid helpers ---
function bubblePos(row: number, col: number): { x: number; y: number } {
  const offset = row % 2 === 1 ? BUBBLE_R : 0
  return {
    x: GRID_OFFSET_X + col * BUBBLE_D + offset,
    y: GRID_OFFSET_Y + row * ROW_H,
  }
}

function buildGrid(): (Bubble | null)[][] {
  const g: (Bubble | null)[][] = []
  for (let r = 0; r < MAX_ROWS; r++) {
    const row: (Bubble | null)[] = []
    const cols = r % 2 === 0 ? COLS : COLS - 1
    for (let c = 0; c < cols; c++) {
      const pos = bubblePos(r, c)
      row.push({ x: pos.x, y: pos.y, col: Math.floor(Math.random() * COLORS.length), alive: true })
    }
    g.push(row)
  }
  return g
}

function randColor(): number { return Math.floor(Math.random() * COLORS.length) }

function reset() {
  grid = buildGrid()
  projectile = null
  aimAngle = -Math.PI / 2
  currentBubbleCol = randColor()
  pendingNextCol = randColor()
  canShoot = true
  firePressedLastFrame = false
  score.value = 0
  nextColor.value = pendingNextCol
}

// --- Flood-fill to find connected same-color group ---
function findGroup(startR: number, startC: number, col: number): Array<[number, number]> {
  const visited = new Set<string>()
  const queue: Array<[number, number]> = [[startR, startC]]
  const result: Array<[number, number]> = []
  while (queue.length > 0) {
    const item = queue.shift()!
    const [r, c] = item
    const key = `${r},${c}`
    if (visited.has(key)) continue
    visited.add(key)
    const b = grid[r]?.[c]
    if (!b || !b.alive || b.col !== col) continue
    result.push([r, c])
    // Neighbors (hex grid)
    const neighbors = getNeighbors(r, c)
    for (const [nr, nc] of neighbors) queue.push([nr, nc])
  }
  return result
}

function getNeighbors(r: number, c: number): Array<[number, number]> {
  const isOdd = r % 2 === 1
  return [
    [r, c - 1], [r, c + 1],
    [r - 1, isOdd ? c : c - 1], [r - 1, isOdd ? c + 1 : c],
    [r + 1, isOdd ? c : c - 1], [r + 1, isOdd ? c + 1 : c],
  ]
}

// Find all bubbles connected to the top row (row 0) via alive bubbles
function findConnected(): Set<string> {
  const visited = new Set<string>()
  const queue: Array<[number, number]> = []
  // Seed with top row
  const r0 = grid[0]
  if (r0) {
    for (let c = 0; c < r0.length; c++) {
      if (r0[c]?.alive) { queue.push([0, c]); visited.add(`0,${c}`) }
    }
  }
  while (queue.length > 0) {
    const item = queue.shift()!
    const [r, c] = item
    for (const [nr, nc] of getNeighbors(r, c)) {
      const key = `${nr},${nc}`
      if (visited.has(key)) continue
      const b = grid[nr]?.[nc]
      if (b?.alive) { visited.add(key); queue.push([nr, nc]) }
    }
  }
  return visited
}

function snapToGrid(px: number, py: number): [number, number] | null {
  let bestR = -1, bestC = -1, bestDist = Infinity
  for (let r = 0; r < grid.length + 1 && r < MAX_ROWS + 2; r++) {
    const maxCols = r % 2 === 0 ? COLS : COLS - 1
    for (let c = 0; c < maxCols; c++) {
      if (grid[r]?.[c]?.alive) continue
      const pos = bubblePos(r, c)
      const dx = px - pos.x, dy = py - pos.y
      const d = dx * dx + dy * dy
      if (d < bestDist) { bestDist = d; bestR = r; bestC = c }
    }
  }
  if (bestDist < (BUBBLE_D * 1.2) * (BUBBLE_D * 1.2)) return [bestR, bestC]
  return null
}

function placeBubble(px: number, py: number, col: number) {
  // Find nearest empty cell adjacent to existing bubbles or top wall
  let bestR = -1, bestC = -1, bestDist = Infinity

  for (let r = 0; r <= Math.min(grid.length, MAX_ROWS - 1); r++) {
    const maxCols = r % 2 === 0 ? COLS : COLS - 1
    for (let c = 0; c < maxCols; c++) {
      if (grid[r]?.[c]?.alive) continue
      const pos = bubblePos(r, c)
      // Check if adjacent to an existing bubble or it's in row 0
      let adjacent = r === 0
      if (!adjacent) {
        for (const [nr, nc] of getNeighbors(r, c)) {
          if (grid[nr]?.[nc]?.alive) { adjacent = true; break }
        }
      }
      if (!adjacent) continue
      const dx = px - pos.x, dy = py - pos.y
      const d = dx * dx + dy * dy
      if (d < bestDist) { bestDist = d; bestR = r; bestC = c }
    }
  }

  if (bestR < 0) {
    // Fallback: place in first empty spot top-left
    outer: for (let r = 0; r < MAX_ROWS; r++) {
      const maxCols = r % 2 === 0 ? COLS : COLS - 1
      if (!grid[r]) grid[r] = new Array(maxCols).fill(null)
      for (let c = 0; c < maxCols; c++) {
        if (!grid[r]![c]) { bestR = r; bestC = c; break outer }
      }
    }
  }
  if (bestR < 0) return

  // Ensure row exists
  while (grid.length <= bestR) {
    const nr = grid.length
    grid.push(new Array(nr % 2 === 0 ? COLS : COLS - 1).fill(null))
  }
  const pos = bubblePos(bestR, bestC)
  if (!grid[bestR]) {
    grid[bestR] = new Array(bestR % 2 === 0 ? COLS : COLS - 1).fill(null)
  }
  grid[bestR]![bestC] = { x: pos.x, y: pos.y, col, alive: true }

  // Check for match-3
  const group = findGroup(bestR, bestC, col)
  if (group.length >= 3) {
    for (const [gr, gc] of group) {
      if (grid[gr]?.[gc]) { grid[gr]![gc]!.alive = false }
    }
    score.value += group.length * 10

    // Find disconnected bubbles
    const connected = findConnected()
    for (let r = 0; r < grid.length; r++) {
      const row = grid[r]
      if (!row) continue
      for (let c = 0; c < row.length; c++) {
        const b = row[c]
        if (b?.alive && !connected.has(`${r},${c}`)) {
          b.alive = false
          score.value += 5
        }
      }
    }
  }

  // Check game over: any alive bubble below dead line
  for (const row of grid) {
    if (!row) continue
    for (const b of row) {
      if (b?.alive && b.y + BUBBLE_R > DEAD_LINE) {
        state.value = 'over'
        return
      }
    }
  }
}

function shoot() {
  if (!canShoot || projectile) return
  const speed = 11
  projectile = {
    x: LAUNCHER_X,
    y: LAUNCHER_Y,
    vx: Math.cos(aimAngle) * speed,
    vy: Math.sin(aimAngle) * speed,
    col: currentBubbleCol,
  }
  currentBubbleCol = pendingNextCol
  pendingNextCol = randColor()
  nextColor.value = pendingNextCol
  canShoot = false
}

function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, col: number, r = BUBBLE_R, alpha = 1) {
  const color = COLORS[col]!
  const glow  = GLOW_COLORS[col]!
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.shadowColor = glow
  ctx.shadowBlur = 12
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, r - 2, 0, τ)
  ctx.fill()
  // Highlight
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.beginPath()
  ctx.arc(x - r * 0.28, y - r * 0.28, r * 0.32, 0, τ)
  ctx.fill()
  ctx.restore()
}

function frame(_ts: number) {
  raf = requestAnimationFrame(frame)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, W, H)

  // Subtle grid dots
  ctx.fillStyle = 'rgba(255,255,255,0.03)'
  for (let x = 20; x < W; x += 40) {
    for (let y = 20; y < H; y += 40) {
      ctx.beginPath(); ctx.arc(x, y, 1, 0, τ); ctx.fill()
    }
  }

  if (state.value === 'playing') {
    // Aim
    const aimSpeed = 0.035
    if (keys.left)  aimAngle = Math.max(-Math.PI + 0.18, aimAngle - aimSpeed)
    if (keys.right) aimAngle = Math.min(-0.18, aimAngle + aimSpeed)

    // Fire
    const fireNow = keys.fire
    if (fireNow && !firePressedLastFrame) shoot()
    firePressedLastFrame = fireNow

    // Move projectile
    if (projectile) {
      projectile.x += projectile.vx
      projectile.y += projectile.vy

      // Bounce off walls
      if (projectile.x - BUBBLE_R < 0) { projectile.x = BUBBLE_R; projectile.vx *= -1 }
      if (projectile.x + BUBBLE_R > W) { projectile.x = W - BUBBLE_R; projectile.vx *= -1 }

      // Hit top wall
      if (projectile.y - BUBBLE_R <= 0) {
        placeBubble(projectile.x, projectile.y, projectile.col)
        projectile = null
        canShoot = true
        return
      }

      // Collision with existing bubbles
      const proj = projectile
      if (!proj) return
      let hit = false
      for (const row of grid) {
        if (!row || hit) break
        for (const b of row) {
          if (!b?.alive || hit) continue
          const dx = proj.x - b.x, dy = proj.y - b.y
          if (dx * dx + dy * dy < (BUBBLE_D - 2) * (BUBBLE_D - 2)) {
            placeBubble(proj.x, proj.y, proj.col)
            projectile = null
            canShoot = true
            hit = true
            break
          }
        }
      }
    }
  }

  // Dead line
  ctx.save()
  ctx.strokeStyle = 'rgba(244,114,182,0.25)'
  ctx.lineWidth = 1
  ctx.setLineDash([6, 6])
  ctx.beginPath(); ctx.moveTo(0, DEAD_LINE); ctx.lineTo(W, DEAD_LINE); ctx.stroke()
  ctx.restore()

  // Draw grid bubbles
  for (const row of grid) {
    if (!row) continue
    for (const b of row) {
      if (b?.alive) drawBubble(ctx, b.x, b.y, b.col)
    }
  }

  // Draw projectile
  if (projectile) drawBubble(ctx, projectile.x, projectile.y, projectile.col)

  // Draw launcher
  ctx.save()
  ctx.translate(LAUNCHER_X, LAUNCHER_Y)
  // Aim line
  if (state.value === 'playing') {
    ctx.save()
    ctx.strokeStyle = 'rgba(200,220,255,0.18)'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 8])
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(aimAngle) * 80, Math.sin(aimAngle) * 80)
    ctx.stroke()
    ctx.restore()
  }
  // Launcher body
  ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 16
  ctx.fillStyle = '#00d4ff'
  // Base
  ctx.beginPath()
  ctx.arc(0, 0, 14, Math.PI, τ)
  ctx.fill()
  // Barrel
  const bx = Math.cos(aimAngle) * 22, by = Math.sin(aimAngle) * 22
  ctx.lineWidth = 6
  ctx.strokeStyle = '#00d4ff'
  ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bx, by); ctx.stroke()
  // Current bubble preview inside launcher
  drawBubble(ctx, 0, 0, currentBubbleCol, 10)
  ctx.restore()

  // Overlays
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.82)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#00ff88'
    ctx.font = "bold 26px 'Space Grotesk', sans-serif"
    ctx.fillText('COLOR SURGE', W / 2, H / 2 - 28)
    ctx.fillStyle = 'rgba(200,220,255,0.55)'
    ctx.font = "13px 'Courier New', monospace"
    ctx.fillText('← → to aim • Space to shoot', W / 2, H / 2 + 10)
  }
}

function restart() {
  reset()
  state.value = 'playing'
}

function onKey(e: KeyboardEvent) {
  const down = e.type === 'keydown'
  if (e.key === 'ArrowLeft')  { e.preventDefault(); keys.left  = down }
  if (e.key === 'ArrowRight') { e.preventDefault(); keys.right = down }
  if (e.code === 'Space') {
    e.preventDefault()
    if (state.value !== 'playing' && down) { reset(); state.value = 'playing'; return }
    keys.fire = down
  }
}

function onTouch(e: TouchEvent) {
  e.preventDefault()
  const touch = e.touches[0] ?? e.changedTouches[0]
  if (!touch) return
  const rect = canvasEl.value?.getBoundingClientRect()
  if (!rect) return
  const relX = touch.clientX - rect.left
  const third = rect.width / 3

  if (e.type === 'touchstart') {
    if (state.value !== 'playing') { reset(); state.value = 'playing'; return }
    if (relX < third) { keys.left = true; keys.right = false; keys.fire = false }
    else if (relX > third * 2) { keys.right = true; keys.left = false; keys.fire = false }
    else { keys.fire = true; keys.left = false; keys.right = false }
  } else {
    keys.left = false; keys.right = false; keys.fire = false
  }
}

onMounted(() => {
  if (canvasEl.value) { canvasEl.value.width = W; canvasEl.value.height = H }
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKey)
  canvasEl.value?.addEventListener('touchstart', onTouch, { passive: false })
  canvasEl.value?.addEventListener('touchend', onTouch, { passive: false })
  raf = requestAnimationFrame(frame)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('keyup', onKey)
  canvasEl.value?.removeEventListener('touchstart', onTouch)
  canvasEl.value?.removeEventListener('touchend', onTouch)
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
        <p class="hud-label text-[10px]">NEXT</p>
        <div
          class="w-5 h-5 rounded-full mx-auto mt-0.5"
          :style="{ background: ['#00d4ff','#a855f7','#00ff88','#f472b6'][nextColor], boxShadow: `0 0 8px ${['#00d4ff','#a855f7','#00ff88','#f472b6'][nextColor]}` }"
        />
      </div>
    </div>
    <div class="relative">
      <canvas ref="canvasEl" class="rounded-xl border border-white/10 block" />
      <div v-if="state === 'over'" class="absolute inset-0 rounded-xl flex items-center justify-center" style="background: rgba(3,7,18,0.88)">
        <div class="flex flex-col items-center gap-4 border border-white/10 bg-white/[0.04] rounded-2xl px-10 py-8">
          <p class="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-500">GRID FULL</p>
          <p class="font-display font-bold text-4xl text-white">{{ score }}</p>
          <p class="hud-label text-[10px]">SCORE</p>
          <button
            class="mt-2 px-10 py-2.5 font-mono text-xs tracking-widest uppercase rounded-lg border border-neon-blue/30 bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20 hover:border-neon-blue/50 transition-all cursor-pointer"
            @click.stop="restart"
          >↺ RESTART</button>
        </div>
      </div>
    </div>
    <p class="font-mono text-xs text-slate-600">← → to aim • Space to shoot • match 3 to pop</p>
  </div>
</template>
