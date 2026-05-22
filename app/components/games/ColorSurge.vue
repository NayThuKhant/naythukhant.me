<script setup lang="ts">
// ── Constants ─────────────────────────────────────────────────────────────────
const W = 400, H = 520
const τ = Math.PI * 2
const R = 19                                  // bubble radius
const D = R * 2                               // diameter
const ROW_H = Math.round(R * Math.sqrt(3))    // ≈ 33 — vertical hex spacing
const COLS_EVEN = 9
const COLS_ODD  = 8
const GRID_ROWS = 16
const GRID_LEFT_EVEN = (W - COLS_EVEN * D) / 2   // ≈ 29
const GRID_LEFT_ODD  = GRID_LEFT_EVEN + R         // ≈ 48
const GRID_TOP  = 20
const EMITTER_Y = H - 60
const EMITTER_X = W / 2
const DANGER_Y  = GRID_TOP + 10 * ROW_H + R       // row 10 y-center
const SHOOT_SPEED = 9
const PREVIEW_BOUNCES = 4
const PUSH_EVERY = 14   // shots before a new row pushes down

const COLORS = ['#00d4ff', '#a855f7', '#f472b6', '#00ff88', '#fbbf24'] as const
type BColor = typeof COLORS[number]

// ── Types ─────────────────────────────────────────────────────────────────────
type Grid = (BColor | null)[][]

interface Projectile { x: number; y: number; vx: number; vy: number; color: BColor }
interface FallingBubble { x: number; y: number; vy: number; color: BColor; age: number }
interface Particle { x: number; y: number; vx: number; vy: number; r: number; color: BColor; age: number; maxAge: number }
interface BgStar { x: number; y: number; sz: number; op: number }

// ── Reactive state ────────────────────────────────────────────────────────────
const canvasEl  = ref<HTMLCanvasElement | null>(null)
const score     = ref(0)
const level     = ref(1)
const state     = ref<'idle' | 'playing' | 'over'>('idle')
const aimAngle  = ref(-Math.PI / 2)   // angle from emitter (radians)

let grid:         Grid              = []
let projectile:   Projectile | null = null
let falling:      FallingBubble[]   = []
let particles:    Particle[]        = []
let bgStars:      BgStar[]          = []
let curColor:     BColor            = COLORS[0]
let nextColor:    BColor            = COLORS[0]
let shotCount     = 0
let ctx2d:        CanvasRenderingContext2D | null = null
let raf           = 0
let aimLeft       = false
let aimRight      = false

// ── Grid helpers ──────────────────────────────────────────────────────────────
function colsForRow(r: number) { return r % 2 === 0 ? COLS_EVEN : COLS_ODD }
function bubbleXY(r: number, c: number): [number, number] {
  const x = (r % 2 === 0 ? GRID_LEFT_EVEN : GRID_LEFT_ODD) + c * D + R
  const y = GRID_TOP + r * ROW_H + R
  return [x, y]
}

function neighbors(r: number, c: number): [number, number][] {
  const even = r % 2 === 0
  const raw: [number, number][] = [
    [r, c - 1], [r, c + 1],
    ...(even
      ? [[r - 1, c - 1], [r - 1, c], [r + 1, c - 1], [r + 1, c]] as [number, number][]
      : [[r - 1, c], [r - 1, c + 1], [r + 1, c], [r + 1, c + 1]] as [number, number][]),
  ]
  return raw.filter(([nr, nc]) => nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < colsForRow(nr))
}

function floodFill(r: number, c: number): [number, number][] {
  const color = grid[r]?.[c]
  if (!color) return []
  const visited = new Set<string>()
  const group: [number, number][] = []
  const stack: [number, number][] = [[r, c]]
  while (stack.length) {
    const [cr, cc] = stack.pop()!
    const key = `${cr},${cc}`
    if (visited.has(key)) continue
    visited.add(key)
    if (grid[cr]?.[cc] !== color) continue
    group.push([cr, cc])
    for (const nb of neighbors(cr, cc)) {
      if (!visited.has(`${nb[0]},${nb[1]}`)) stack.push(nb)
    }
  }
  return group
}

function findFloating(): [number, number][] {
  const connected = new Set<string>()
  const queue: [number, number][] = []
  for (let c = 0; c < colsForRow(0); c++) {
    if (grid[0]?.[c]) { queue.push([0, c]); connected.add(`0,${c}`) }
  }
  while (queue.length) {
    const [r, c] = queue.shift()!
    for (const [nr, nc] of neighbors(r, c)) {
      const key = `${nr},${nc}`
      if (!connected.has(key) && grid[nr]?.[nc]) { connected.add(key); queue.push([nr, nc]) }
    }
  }
  const floating: [number, number][] = []
  for (let r = 1; r < GRID_ROWS; r++)
    for (let c = 0; c < colsForRow(r); c++)
      if (grid[r]?.[c] && !connected.has(`${r},${c}`)) floating.push([r, c])
  return floating
}

function nearestEmpty(px: number, py: number): [number, number] | null {
  let best: [number, number] | null = null
  let bestDist = Infinity
  const rowGuess = Math.round((py - GRID_TOP - R) / ROW_H)
  for (let r = Math.max(0, rowGuess - 2); r <= Math.min(GRID_ROWS - 1, rowGuess + 2); r++) {
    for (let c = 0; c < colsForRow(r); c++) {
      if (grid[r]?.[c]) continue
      const [bx, by] = bubbleXY(r, c)
      const d = Math.hypot(px - bx, py - by)
      if (d < bestDist) { bestDist = d; best = [r, c] }
    }
  }
  return best
}

function hasAnyBubble(): boolean {
  for (let r = 0; r < GRID_ROWS; r++)
    for (let c = 0; c < colsForRow(r); c++)
      if (grid[r]?.[c]) return true
  return false
}

// ── Grid init / push ──────────────────────────────────────────────────────────
function randomColor(): BColor { return COLORS[Math.floor(Math.random() * COLORS.length)]! }

function initGrid(rows = 5) {
  grid = Array.from({ length: GRID_ROWS }, () => Array(COLS_EVEN).fill(null)) as Grid
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < colsForRow(r); c++)
      grid[r]![c] = randomColor()
}

function pushNewRow() {
  // Shift all rows down
  for (let r = GRID_ROWS - 1; r > 0; r--) grid[r] = grid[r - 1]!
  // New row 0
  const newRow: (BColor | null)[] = Array(COLS_EVEN).fill(null)
  for (let c = 0; c < colsForRow(0); c++) newRow[c] = randomColor()
  grid[0] = newRow
}

// ── Shooting helpers ──────────────────────────────────────────────────────────
function pickNextColor(): BColor { return COLORS[Math.floor(Math.random() * COLORS.length)]! }

function spawnBurst(x: number, y: number, color: BColor, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * τ + (Math.random() - 0.5) * 0.6
    const spd = 1.8 + Math.random() * 3.5
    particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 0.4,
      r: 1.5 + Math.random() * 2.5, color, age: 0, maxAge: 22 + Math.floor(Math.random() * 12) })
  }
}

function shoot() {
  if (projectile || state.value !== 'playing') return
  projectile = {
    x: EMITTER_X,
    y: EMITTER_Y,
    vx: Math.cos(aimAngle.value) * SHOOT_SPEED,
    vy: Math.sin(aimAngle.value) * SHOOT_SPEED,
    color: curColor,
  }
  curColor  = nextColor
  nextColor = pickNextColor()
  shotCount++
  if (shotCount % PUSH_EVERY === 0) pushNewRow()
}

function placeBubble(px: number, py: number, color: BColor) {
  const slot = nearestEmpty(px, py)
  if (!slot) return
  const [r, c] = slot
  grid[r]![c] = color
  spawnBurst(...bubbleXY(r, c), color, 8)

  // Check match
  const group = floodFill(r, c)
  if (group.length >= 3) {
    for (const [gr, gc] of group) {
      const [bx, by] = bubbleXY(gr, gc)
      spawnBurst(bx, by, color, 6)
      grid[gr]![gc] = null
    }
    score.value += group.length * 10 * level.value

    // Drop floating
    const floaters = findFloating()
    for (const [fr, fc] of floaters) {
      const [bx, by] = bubbleXY(fr, fc)
      const col = grid[fr]![fc]!
      falling.push({ x: bx, y: by, vy: -2 + Math.random() * -2, color: col, age: 0 })
      grid[fr]![fc] = null
      score.value += 5 * level.value
    }
  }

  // Level up when board cleared
  if (!hasAnyBubble()) {
    level.value++
    initGrid(5 + Math.min(level.value, 5))
    shotCount = 0
  }

  // Game over if any bubble in danger zone
  for (let r2 = 0; r2 < GRID_ROWS; r2++)
    for (let c2 = 0; c2 < colsForRow(r2); c2++)
      if (grid[r2]?.[c2]) {
        const [, by] = bubbleXY(r2, c2)
        if (by >= DANGER_Y) { state.value = 'over'; return }
      }
}

// ── Preview path ──────────────────────────────────────────────────────────────
function previewPath(): [number, number][] {
  const pts: [number, number][] = [[EMITTER_X, EMITTER_Y]]
  let x = EMITTER_X, y = EMITTER_Y
  let vx = Math.cos(aimAngle.value), vy = Math.sin(aimAngle.value)
  for (let b = 0; b < PREVIEW_BOUNCES; b++) {
    // travel until wall or ceiling
    const tLeft  = vx < 0 ? (R - x) / vx : Infinity
    const tRight = vx > 0 ? (W - R - x) / vx : Infinity
    const tTop   = vy < 0 ? (GRID_TOP - y) / vy : Infinity
    const tMin = Math.min(tLeft, tRight, tTop, 600)
    if (!isFinite(tMin) || tMin <= 0) break
    x += vx * tMin; y += vy * tMin
    pts.push([x, y])
    if (tMin === tTop || y <= GRID_TOP) break
    vx = -vx  // bounce off side wall
  }
  return pts
}

// ── Game lifecycle ────────────────────────────────────────────────────────────
function startGame() {
  projectile = null; falling = []; particles = []
  shotCount  = 0
  score.value = 0; level.value = 1
  curColor  = pickNextColor()
  nextColor = pickNextColor()
  aimAngle.value = -Math.PI / 2
  initGrid(5)
  state.value = 'playing'
}

function restart() { startGame() }

function initStars() {
  bgStars = Array.from({ length: 55 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    sz: Math.random() * 1.6 + 0.4, op: Math.random() * 0.35 + 0.08,
  }))
}

// ── Input ─────────────────────────────────────────────────────────────────────
function onKey(e: KeyboardEvent) {
  if (state.value !== 'playing') {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); startGame() }
    return
  }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); aimLeft  = true }
  if (e.key === 'ArrowRight') { e.preventDefault(); aimRight = true }
  if (e.key === ' ')          { e.preventDefault(); shoot() }
}
function onKeyUp(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft')  aimLeft  = false
  if (e.key === 'ArrowRight') aimRight = false
}

function onCanvasClick(e: MouseEvent) {
  if (state.value !== 'playing') return
  const rect = canvasEl.value!.getBoundingClientRect()
  const px = (e.clientX - rect.left) * (W / rect.width)
  const py = (e.clientY - rect.top)  * (H / rect.height)
  const angle = Math.atan2(py - EMITTER_Y, px - EMITTER_X)
  // Clamp to upward angles only
  if (angle > -0.1 && angle < Math.PI + 0.1) return
  aimAngle.value = Math.max(-Math.PI + 0.08, Math.min(-0.08, angle))
  shoot()
}

function onCanvasMouseMove(e: MouseEvent) {
  if (state.value !== 'playing') return
  const rect = canvasEl.value!.getBoundingClientRect()
  const px = (e.clientX - rect.left) * (W / rect.width)
  const py = (e.clientY - rect.top)  * (H / rect.height)
  const angle = Math.atan2(py - EMITTER_Y, px - EMITTER_X)
  if (angle <= -0.08 || angle >= -Math.PI + 0.08)
    aimAngle.value = Math.max(-Math.PI + 0.08, Math.min(-0.08, angle))
}

// ── Drawing helpers ───────────────────────────────────────────────────────────
function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, color: BColor, alpha = 1, scale = 1) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.scale(scale, scale)

  ctx.shadowColor = color
  ctx.shadowBlur  = 10
  ctx.fillStyle   = color
  ctx.beginPath(); ctx.arc(0, 0, R - 1, 0, τ); ctx.fill()

  // Shine
  ctx.shadowBlur = 0
  ctx.fillStyle  = 'rgba(255,255,255,0.25)'
  ctx.beginPath(); ctx.arc(-R * 0.28, -R * 0.28, R * 0.38, 0, τ); ctx.fill()

  ctx.restore()
}

// ── Frame loop ────────────────────────────────────────────────────────────────
function frame() {
  raf = requestAnimationFrame(frame)
  if (!ctx2d) { ctx2d = canvasEl.value?.getContext('2d') ?? null; if (!ctx2d) return }
  const ctx = ctx2d

  // Background
  ctx.fillStyle = '#030712'; ctx.fillRect(0, 0, W, H)
  for (const s of bgStars) {
    ctx.globalAlpha = s.op; ctx.fillStyle = '#fff'
    ctx.fillRect(s.x, s.y, s.sz, s.sz)
  }
  ctx.globalAlpha = 1

  if (state.value === 'playing') {
    // Aim rotation
    const ROT = 0.035
    if (aimLeft)  aimAngle.value = Math.max(-Math.PI + 0.08, aimAngle.value - ROT)
    if (aimRight) aimAngle.value = Math.min(-0.08,           aimAngle.value + ROT)

    // Update projectile
    if (projectile) {
      projectile.x += projectile.vx
      projectile.y += projectile.vy
      // Wall bounces
      if (projectile.x - R <= 0) { projectile.x = R; projectile.vx = Math.abs(projectile.vx) }
      if (projectile.x + R >= W) { projectile.x = W - R; projectile.vx = -Math.abs(projectile.vx) }
      // Ceiling
      if (projectile.y - R <= GRID_TOP) {
        placeBubble(projectile.x, GRID_TOP + R, projectile.color)
        projectile = null
      } else {
        // Collision with grid bubbles
        const proj = projectile
        let hit = false
        outer: for (let r = 0; r < GRID_ROWS; r++) {
          for (let c = 0; c < colsForRow(r); c++) {
            if (!grid[r]?.[c]) continue
            const [bx, by] = bubbleXY(r, c)
            if (Math.hypot(proj.x - bx, proj.y - by) < D - 2) {
              placeBubble(proj.x, proj.y, proj.color)
              projectile = null; hit = true; break outer
            }
          }
        }
      }
    }

    // Falling bubbles
    for (const fb of falling) {
      fb.x += (Math.random() - 0.5) * 0.8
      fb.vy += 0.35
      fb.y  += fb.vy
      fb.age++
    }
    falling = falling.filter(fb => fb.y < H + 40)

    // Particles
    for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.age++ }
    particles = particles.filter(p => p.age < p.maxAge)
  }

  // ── Danger line ────────────────────────────────────────────────────────────
  ctx.save()
  ctx.strokeStyle = 'rgba(239,68,68,0.35)'
  ctx.lineWidth   = 1
  ctx.setLineDash([4, 6])
  ctx.beginPath(); ctx.moveTo(0, DANGER_Y); ctx.lineTo(W, DANGER_Y); ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()

  // ── Grid bubbles ───────────────────────────────────────────────────────────
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < colsForRow(r); c++) {
      const color = grid[r]?.[c]
      if (!color) continue
      const [x, y] = bubbleXY(r, c)
      drawBubble(ctx, x, y, color)
    }
  }

  // ── Falling bubbles ────────────────────────────────────────────────────────
  for (const fb of falling) {
    const a = Math.max(0, 1 - fb.age / 30)
    drawBubble(ctx, fb.x, fb.y, fb.color, a)
  }

  // ── Particles ─────────────────────────────────────────────────────────────
  ctx.save()
  ctx.shadowBlur = 6
  for (const p of particles) {
    const a = 1 - p.age / p.maxAge
    ctx.globalAlpha = a
    ctx.fillStyle   = ctx.shadowColor = p.color
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.5 + 0.5 * a), 0, τ); ctx.fill()
  }
  ctx.restore()

  // ── Aim preview ────────────────────────────────────────────────────────────
  if (state.value === 'playing' && !projectile) {
    const pts = previewPath()
    ctx.save()
    ctx.strokeStyle = `rgba(255,255,255,0.18)`
    ctx.lineWidth   = 1.5
    ctx.setLineDash([6, 8])
    ctx.beginPath()
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i]![0], pts[i]![1])
      else ctx.lineTo(pts[i]![0], pts[i]![1])
    }
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }

  // ── Projectile in flight ───────────────────────────────────────────────────
  if (projectile) drawBubble(ctx, projectile.x, projectile.y, projectile.color)

  // ── Emitter + current / next bubbles ──────────────────────────────────────
  if (state.value === 'playing') {
    // Platform
    ctx.save()
    ctx.strokeStyle = 'rgba(148,163,184,0.25)'
    ctx.lineWidth   = 1
    ctx.beginPath(); ctx.moveTo(EMITTER_X - 36, EMITTER_Y + R + 8); ctx.lineTo(EMITTER_X + 36, EMITTER_Y + R + 8); ctx.stroke()

    // Aim barrel
    const barrelLen = R + 10
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth   = 3
    ctx.lineCap     = 'round'
    ctx.shadowColor = curColor; ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.moveTo(EMITTER_X, EMITTER_Y)
    ctx.lineTo(EMITTER_X + Math.cos(aimAngle.value) * barrelLen, EMITTER_Y + Math.sin(aimAngle.value) * barrelLen)
    ctx.stroke()
    ctx.restore()

    // Current bubble (in launcher)
    if (!projectile) drawBubble(ctx, EMITTER_X, EMITTER_Y, curColor)

    // Next bubble preview (offset right)
    ctx.save()
    ctx.globalAlpha = 0.65
    ctx.font = "9px 'JetBrains Mono',monospace"
    ctx.fillStyle = 'rgba(148,163,184,0.7)'
    ctx.textAlign = 'center'
    ctx.fillText('NEXT', EMITTER_X + 52, EMITTER_Y - R - 4)
    ctx.restore()
    drawBubble(ctx, EMITTER_X + 52, EMITTER_Y, nextColor, 0.65, 0.75)
  }

  // ── Idle overlay ───────────────────────────────────────────────────────────
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.88)'; ctx.fillRect(0, 0, W, H)
    const p = 0.5 + 0.5 * Math.sin(Date.now() * 0.003)
    ctx.textAlign   = 'center'
    ctx.font        = "bold 26px 'Space Grotesk',sans-serif"
    ctx.fillStyle   = `rgba(244,114,182,${0.7 + 0.3 * p})`
    ctx.shadowColor = '#f472b6'; ctx.shadowBlur = 12 + 12 * p
    ctx.fillText('COLOR SURGE', W / 2, H / 2 - 36)
    ctx.shadowBlur  = 0
    ctx.font        = "13px 'Courier New',monospace"
    ctx.fillStyle   = 'rgba(200,220,255,0.52)'
    ctx.fillText('Match 3+ same-color bubbles to pop them.', W / 2, H / 2 + 4)
    ctx.fillText('Clear the board before it fills up.', W / 2, H / 2 + 22)
    ctx.font        = "12px 'Courier New',monospace"
    ctx.fillStyle   = `rgba(200,220,255,${0.28 + 0.22 * p})`
    ctx.fillText('Click to aim & shoot  ·  ← → to rotate  ·  Space to fire', W / 2, H / 2 + 52)
  }
}

onMounted(() => {
  if (canvasEl.value) { canvasEl.value.width = W; canvasEl.value.height = H }
  initStars()
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKeyUp)
  raf = requestAnimationFrame(frame)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('keyup', onKeyUp)
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
        <p class="hud-label text-[10px]">LEVEL</p>
        <p class="font-mono font-bold text-white text-lg leading-tight">{{ level }}</p>
      </div>
    </div>

    <div class="relative">
      <canvas
        ref="canvasEl"
        class="rounded-xl border border-white/10 block cursor-crosshair touch-none"
        :style="{ width: `${W}px`, height: `${H}px` }"
        @click="onCanvasClick"
        @mousemove="onCanvasMouseMove"
      />

      <GameResultOverlay :state="state" :score="score" @restart="restart" />

      <Transition name="fade">
        <div
          v-if="state === 'idle'"
          class="absolute inset-0 rounded-xl flex flex-col items-center justify-end pb-8"
        >
          <button class="btn-neon-pink" @click.stop="startGame">START</button>
        </div>
      </Transition>
    </div>

    <p class="font-mono text-xs text-slate-600">Click to aim & shoot · ← → rotate · Space to fire</p>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease }
.fade-enter-from, .fade-leave-to       { opacity: 0 }
</style>
