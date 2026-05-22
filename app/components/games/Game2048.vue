<script setup lang="ts">
// ─── Types ────────────────────────────────────────────────────────────────────
type Dir = 'left' | 'right' | 'up' | 'down'

interface Tile {
  id: number
  value: number
  row: number; col: number       // logical destination
  fromX: number; fromY: number   // pixel start of current slide
  x: number; y: number           // current render pixel
  tx: number; ty: number         // target render pixel
  slideProgress: number          // 0..1  (slide animation)
  spawnDelay: number             // frames before spawn anim begins
  spawnProgress: number          // 0..1  (scale-in anim)
  pendingMerge: boolean          // set right after a move w/ merge
  mergeProgress: number          // 0..1  (pop anim, starts once slide done)
  scale: number
}

interface Ghost {               // consumed tile, slides to merge dest then vanishes
  value: number
  fromX: number; fromY: number
  tx: number; ty: number
  slideProgress: number
}

interface ScorePopup {
  text: string; x: number; y: number; age: number
}

interface MergeEffect {
  cx: number; cy: number
  color: string
  age: number
  maxAge: number
  ringMaxR: number
  particles: Array<{ x: number; y: number; vx: number; vy: number; r: number }>
}

// ─── Constants ────────────────────────────────────────────────────────────────
const GRID         = 4
const CELL         = 72
const GAP          = 8
const PAD          = 8
const W            = GRID * CELL + (GRID - 1) * GAP + PAD * 2  // 328
const SLIDE_FRAMES = 8
const SPAWN_FRAMES = 10
const MERGE_FRAMES = 10
const POPUP_FRAMES  = 40
const MERGE_EFFECT_FRAMES = 24

function cellX(c: number) { return PAD + c * (CELL + GAP) }
function cellY(r: number) { return PAD + r * (CELL + GAP) }
function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3) }

// ─── Reactive state ───────────────────────────────────────────────────────────
const canvasEl  = ref<HTMLCanvasElement | null>(null)
const score     = ref(0)
const best      = ref(0)
const gameState = ref<'idle' | 'playing' | 'won' | 'over'>('idle')

let nextId        = 1
let tileList:     Tile[]         = []
let ghostList:    Ghost[]        = []
let popups:       ScorePopup[]   = []
let mergeEffects: MergeEffect[]  = []
let animating  = false
let raf        = 0
let startTs    = 0

// ─── Color palette ────────────────────────────────────────────────────────────
function tileColor(v: number): { bg: string; fg: string; glow: string } {
  const map: Record<number, { bg: string; fg: string; glow: string }> = {
    2:    { bg: 'rgba(71,85,105,0.7)',    fg: '#cbd5e1', glow: '#64748b' },
    4:    { bg: 'rgba(71,85,105,0.9)',    fg: '#f1f5f9', glow: '#94a3b8' },
    8:    { bg: 'rgba(0,150,200,0.45)',   fg: '#00d4ff', glow: '#00d4ff' },
    16:   { bg: 'rgba(0,150,200,0.65)',   fg: '#7ee8ff', glow: '#00d4ff' },
    32:   { bg: 'rgba(130,60,220,0.45)',  fg: '#c084fc', glow: '#a855f7' },
    64:   { bg: 'rgba(130,60,220,0.65)',  fg: '#d8b4fe', glow: '#a855f7' },
    128:  { bg: 'rgba(0,175,95,0.45)',    fg: '#00ff88', glow: '#00ff88' },
    256:  { bg: 'rgba(0,175,95,0.65)',    fg: '#6effc2', glow: '#00ff88' },
    512:  { bg: 'rgba(215,55,125,0.45)',  fg: '#f472b6', glow: '#f472b6' },
    1024: { bg: 'rgba(215,55,125,0.65)',  fg: '#fda4d4', glow: '#f472b6' },
    2048: { bg: 'rgba(255,195,0,0.55)',   fg: '#ffd700', glow: '#ffd700' },
  }
  return map[v] ?? { bg: 'rgba(255,255,255,0.15)', fg: '#fff', glow: '#fff' }
}

// ─── Canvas helpers ───────────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y,     x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x,     y + h, r)
  ctx.arcTo(x,     y + h, x,     y,     r)
  ctx.arcTo(x,     y,     x + w, y,     r)
  ctx.closePath()
}

function drawTileAt(ctx: CanvasRenderingContext2D, x: number, y: number, value: number, scale: number, alpha = 1) {
  const col = tileColor(value)
  const cx = x + CELL / 2, cy = y + CELL / 2
  const fs = value >= 1000 ? 17 : value >= 100 ? 21 : 26
  const glowBoost = scale > 1.02 ? (scale - 1) * 50 : 0

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(cx, cy)
  ctx.scale(scale, scale)
  ctx.translate(-CELL / 2, -CELL / 2)

  // Tile body
  ctx.shadowColor = col.glow
  ctx.shadowBlur  = 8 + glowBoost
  ctx.fillStyle   = col.bg
  roundRect(ctx, 0, 0, CELL, CELL, 10)
  ctx.fill()

  // Top edge highlight
  ctx.shadowBlur  = 0
  ctx.fillStyle   = 'rgba(255,255,255,0.10)'
  roundRect(ctx, 2, 2, CELL - 4, 4, 2)
  ctx.fill()

  // Value text
  ctx.fillStyle      = col.fg
  ctx.font           = `bold ${fs}px 'JetBrains Mono', 'Courier New', monospace`
  ctx.textAlign      = 'center'
  ctx.textBaseline   = 'middle'
  ctx.fillText(String(value), CELL / 2, CELL / 2)

  ctx.restore()
}

// ─── Slide logic (single row, left) ──────────────────────────────────────────
type Cell = { id: number; value: number } | null

function slideRow(row: Cell[]): {
  result: Cell[]
  gained: number
  merges: { consumedId: number; survivorId: number }[]
} {
  const ts = row.filter(Boolean) as NonNullable<Cell>[]
  const result: Cell[] = []
  const merges: { consumedId: number; survivorId: number }[] = []
  let gained = 0, i = 0
  while (i < ts.length) {
    if (i + 1 < ts.length && ts[i]!.value === ts[i + 1]!.value) {
      merges.push({ consumedId: ts[i + 1]!.id, survivorId: ts[i]!.id })
      result.push({ id: ts[i]!.id, value: ts[i]!.value * 2 })
      gained += ts[i]!.value * 2
      i += 2
    } else {
      result.push({ ...ts[i]! })
      i++
    }
  }
  while (result.length < GRID) result.push(null)
  return { result, gained, merges }
}

type Board = Cell[][]
function emptyBoard(): Board { return Array.from({ length: GRID }, () => Array(GRID).fill(null)) }
function rotateCW(b: Board): Board {
  return Array.from({ length: GRID }, (_, r) =>
    Array.from({ length: GRID }, (_, c) => b[GRID - 1 - c]![r]!)
  )
}

// ─── Win / lose check ────────────────────────────────────────────────────────
function checkWinLose() {
  if (gameState.value !== 'playing') return
  if (tileList.some(t => t.value === 2048)) { gameState.value = 'won'; return }
  const b: Board = emptyBoard()
  for (const t of tileList) b[t.row]![t.col] = { id: t.id, value: t.value }
  const hasMove = b.some((row, r) =>
    row.some((cell, c) =>
      !cell ||
      (c + 1 < GRID && b[r]![c + 1]?.value === cell.value) ||
      (r + 1 < GRID && b[r + 1]?.[c]?.value === cell.value)
    )
  )
  if (!hasMove) gameState.value = 'over'
}

// ─── Move ─────────────────────────────────────────────────────────────────────
function move(dir: Dir) {
  if (gameState.value !== 'playing' || animating) return

  // Build board snapshot
  let b: Board = emptyBoard()
  for (const t of tileList) b[t.row]![t.col] = { id: t.id, value: t.value }

  const rots = { left: 0, up: 3, right: 2, down: 1 }[dir]
  for (let i = 0; i < rots; i++) b = rotateCW(b)

  let gained = 0, moved = false
  const allMerges: { consumedId: number; survivorId: number }[] = []

  for (let r = 0; r < GRID; r++) {
    const before = JSON.stringify(b[r])
    const res = slideRow(b[r]!)
    b[r] = res.result
    gained += res.gained
    allMerges.push(...res.merges)
    if (JSON.stringify(b[r]) !== before) moved = true
  }
  if (!moved) { checkWinLose(); return }

  for (let i = 0; i < (4 - rots) % 4; i++) b = rotateCW(b)

  // New positions by tile ID
  const newPos = new Map<number, { r: number; c: number; value: number }>()
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++) {
      const cell = b[r]![c]
      if (cell) newPos.set(cell.id, { r, c, value: cell.value })
    }

  const consumedIds  = new Set(allMerges.map(m => m.consumedId))
  const survivorIds  = new Set(allMerges.map(m => m.survivorId))

  // Spawn ghosts for consumed tiles
  for (const { consumedId, survivorId } of allMerges) {
    const ct = tileList.find(t => t.id === consumedId)
    const dest = newPos.get(survivorId)
    if (!ct || !dest) continue
    ghostList.push({
      value: ct.value,
      fromX: ct.x, fromY: ct.y,
      tx: cellX(dest.c), ty: cellY(dest.r),
      slideProgress: 0,
    })
  }

  // Remove consumed tiles
  tileList = tileList.filter(t => !consumedIds.has(t.id))

  // Update survivors
  for (const t of tileList) {
    const np = newPos.get(t.id)
    if (!np) continue
    t.row = np.r; t.col = np.c; t.value = np.value
    t.fromX = t.x; t.fromY = t.y
    t.tx = cellX(np.c); t.ty = cellY(np.r)
    t.slideProgress  = 0
    t.pendingMerge   = survivorIds.has(t.id)
    t.mergeProgress  = 0
  }

  // Score + popup
  score.value += gained
  if (score.value > best.value) best.value = score.value
  if (gained > 0) {
    // Popup near center of board
    popups.push({ text: `+${gained}`, x: W / 2, y: W / 2, age: 0 })
  }

  // Spawn new tile (visible after slide)
  const empty: [number, number][] = []
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++)
      if (!b[r]![c]) empty.push([r, c])
  if (empty.length) {
    const [sr, sc] = empty[Math.floor(Math.random() * empty.length)]!
    const v = Math.random() < 0.9 ? 2 : 4
    const x = cellX(sc), y = cellY(sr)
    tileList.push({
      id: nextId++, value: v, row: sr, col: sc,
      fromX: x, fromY: y, x, y, tx: x, ty: y,
      slideProgress: 1,
      spawnDelay: SLIDE_FRAMES,
      spawnProgress: 0,
      pendingMerge: false, mergeProgress: 0,
      scale: 0,
    })
  }

  animating = true
  checkWinLose()
}

// ─── Merge burst ─────────────────────────────────────────────────────────────
function spawnMergeEffect(cx: number, cy: number, color: string) {
  const N = 10
  const particles = Array.from({ length: N }, (_, i) => {
    const angle = (i / N) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
    const speed = 2.8 + Math.random() * 2.4
    return { x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 2.5 + Math.random() * 2 }
  })
  mergeEffects.push({ cx, cy, color, age: 0, maxAge: MERGE_EFFECT_FRAMES, ringMaxR: CELL * 0.72, particles })
}

// ─── Frame loop ───────────────────────────────────────────────────────────────
function frame(ts: number) {
  raf = requestAnimationFrame(frame)
  if (!startTs) startTs = ts
  const elapsed = ts - startTs

  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return

  // Board background
  ctx.clearRect(0, 0, W, W)
  ctx.fillStyle = '#0a0e1a'
  roundRect(ctx, 0, 0, W, W, 14)
  ctx.fill()

  // Empty slots
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      ctx.fillStyle = 'rgba(255,255,255,0.04)'
      roundRect(ctx, cellX(c), cellY(r), CELL, CELL, 10)
      ctx.fill()
    }
  }

  if (gameState.value !== 'idle') {
    let stillMoving = false

    // ── Ghosts (draw beneath main tiles) ──────────────────────────────────────
    for (let i = ghostList.length - 1; i >= 0; i--) {
      const g = ghostList[i]!
      g.slideProgress = Math.min(1, g.slideProgress + 1 / SLIDE_FRAMES)
      const e = easeOutCubic(g.slideProgress)
      const gx = g.fromX + (g.tx - g.fromX) * e
      const gy = g.fromY + (g.ty - g.fromY) * e
      const alpha = 1 - g.slideProgress * 0.6  // fade as it arrives
      drawTileAt(ctx, gx, gy, g.value, 1, alpha)
      if (g.slideProgress >= 1) ghostList.splice(i, 1)
      else stillMoving = true
    }

    // ── Main tiles ────────────────────────────────────────────────────────────
    for (const t of tileList) {
      // 1. Slide position
      if (t.slideProgress < 1) {
        t.slideProgress = Math.min(1, t.slideProgress + 1 / SLIDE_FRAMES)
        stillMoving = true
      }
      const e = easeOutCubic(t.slideProgress)
      t.x = t.fromX + (t.tx - t.fromX) * e
      t.y = t.fromY + (t.ty - t.fromY) * e

      // 2. Spawn delay (tile waits for slide to finish)
      if (t.spawnDelay > 0) {
        t.spawnDelay--
        t.scale = 0
        stillMoving = true
        drawTileAt(ctx, t.x, t.y, t.value, 0)
        continue
      }

      // 3. Spawn scale-in
      if (t.spawnProgress < 1) {
        t.spawnProgress = Math.min(1, t.spawnProgress + 1 / SPAWN_FRAMES)
        // Slight overshoot: ease out back
        const p = t.spawnProgress
        t.scale = p < 0.7
          ? easeOutCubic(p / 0.7)
          : 1 + Math.sin((p - 0.7) / 0.3 * Math.PI) * 0.12
        stillMoving = true
        drawTileAt(ctx, t.x, t.y, t.value, t.scale)
        continue
      }

      // 4. Merge pop (starts only once slide is done)
      if (t.pendingMerge && t.slideProgress >= 1) {
        if (t.mergeProgress === 0) {
          // First frame of merge: fire the burst
          spawnMergeEffect(t.x + CELL / 2, t.y + CELL / 2, tileColor(t.value).glow)
        }
        t.mergeProgress = Math.min(1, t.mergeProgress + 1 / MERGE_FRAMES)
        const p = t.mergeProgress
        // Scale: 1 → 1.45 → 1 with ease
        t.scale = p < 0.5 ? 1 + 0.45 * (p * 2) : 1.45 - 0.45 * ((p - 0.5) * 2)
        if (t.mergeProgress >= 1) { t.pendingMerge = false; t.scale = 1 }
        stillMoving = true
        drawTileAt(ctx, t.x, t.y, t.value, t.scale)
        continue
      }

      t.scale = 1
      drawTileAt(ctx, t.x, t.y, t.value, 1)
    }

    // ── Score popups ──────────────────────────────────────────────────────────
    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i]!
      p.age++
      const a = 1 - p.age / POPUP_FRAMES
      const py = p.y - (p.age / POPUP_FRAMES) * 40
      ctx.save()
      ctx.globalAlpha = a
      ctx.fillStyle   = '#ffd700'
      ctx.font        = "bold 18px 'JetBrains Mono', monospace"
      ctx.textAlign   = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = '#ffd700'
      ctx.shadowBlur  = 8
      ctx.fillText(p.text, p.x, py)
      ctx.restore()
      if (p.age >= POPUP_FRAMES) popups.splice(i, 1)
      else stillMoving = true
    }

    // ── Merge burst effects (on top of everything) ────────────────────────────
    for (let i = mergeEffects.length - 1; i >= 0; i--) {
      const fx = mergeEffects[i]!
      fx.age++
      const t = fx.age / fx.maxAge
      const ringT = Math.min(1, fx.age / (fx.maxAge * 0.55))

      // Expanding ring
      ctx.save()
      ctx.globalAlpha  = (1 - ringT) * 0.95
      ctx.strokeStyle  = fx.color
      ctx.lineWidth    = 3
      ctx.shadowColor  = fx.color
      ctx.shadowBlur   = 12
      ctx.beginPath()
      ctx.arc(fx.cx, fx.cy, fx.ringMaxR * easeOutCubic(ringT), 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      // Second inner ring (slightly delayed, smaller)
      const ring2T = Math.max(0, Math.min(1, (fx.age - 4) / (fx.maxAge * 0.55)))
      if (ring2T > 0) {
        ctx.save()
        ctx.globalAlpha = (1 - ring2T) * 0.5
        ctx.strokeStyle = fx.color
        ctx.lineWidth   = 1.5
        ctx.shadowColor = fx.color
        ctx.shadowBlur  = 6
        ctx.beginPath()
        ctx.arc(fx.cx, fx.cy, fx.ringMaxR * 0.55 * easeOutCubic(ring2T), 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }

      // Particles
      for (const p of fx.particles) {
        p.x += p.vx; p.y += p.vy
        p.vx *= 0.88; p.vy *= 0.88  // decelerate
        ctx.save()
        ctx.globalAlpha = (1 - t) * 0.95
        ctx.fillStyle   = fx.color
        ctx.shadowColor = fx.color
        ctx.shadowBlur  = 6
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * (1 - t * 0.5), 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      if (fx.age >= fx.maxAge) mergeEffects.splice(i, 1)
      else stillMoving = true
    }

    if (!stillMoving && animating) { animating = false; checkWinLose() }
  }

  // ── Idle overlay ──────────────────────────────────────────────────────────────
  if (gameState.value === 'idle') {
    ctx.fillStyle = 'rgba(5,8,20,0.86)'
    roundRect(ctx, 0, 0, W, W, 14)
    ctx.fill()

    const pulse = 0.5 + 0.5 * Math.sin(elapsed * 0.003)
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor  = '#ffd700'
    ctx.shadowBlur   = 10 + pulse * 22
    ctx.fillStyle    = '#ffd700'
    ctx.font         = "bold 42px 'Space Grotesk', sans-serif"
    ctx.fillText('2048', W / 2, W / 2 - 34)
    ctx.shadowBlur   = 0

    const preview = [2, 8, 64, 512]
    for (let i = 0; i < 4; i++) {
      const px = W / 2 - 90 + i * 60
      const py = W / 2 + 20 + Math.sin(elapsed * 0.0022 + i * 1.1) * 6
      drawTileAt(ctx, px - CELL / 2, py - CELL / 2 + 2, preview[i]!, 0.56 + pulse * 0.04)
    }

    ctx.fillStyle    = 'rgba(180,200,255,0.4)'
    ctx.shadowBlur   = 0
    ctx.font         = "11px 'JetBrains Mono', monospace"
    ctx.fillText('Arrow keys · swipe · reach 2048', W / 2, W / 2 + 72)
  }
}

// ─── Game actions ─────────────────────────────────────────────────────────────
function startGame() {
  tileList = []; ghostList = []; popups = []; mergeEffects = []
  score.value = 0; animating = false
  gameState.value = 'playing'
  for (let i = 0; i < 2; i++) spawnInitialTile()
}

function spawnInitialTile() {
  const occupied = new Set(tileList.map(t => `${t.row},${t.col}`))
  const empty: [number, number][] = []
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++)
      if (!occupied.has(`${r},${c}`)) empty.push([r, c])
  if (!empty.length) return
  const [r, c] = empty[Math.floor(Math.random() * empty.length)]!
  const v = Math.random() < 0.9 ? 2 : 4
  const x = cellX(c), y = cellY(r)
  tileList.push({
    id: nextId++, value: v, row: r, col: c,
    fromX: x, fromY: y, x, y, tx: x, ty: y,
    slideProgress: 1, spawnDelay: 0, spawnProgress: 1,
    pendingMerge: false, mergeProgress: 0, scale: 1,
  })
}

function restart() { startGame() }

// ─── Input ────────────────────────────────────────────────────────────────────
function onKey(e: KeyboardEvent) {
  const map: Record<string, Dir> = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  }
  if (!(e.key in map)) return
  e.preventDefault()
  if (gameState.value === 'idle') { startGame(); return }
  move(map[e.key]!)
}

let touchStart: { x: number; y: number } | null = null
function onTouchStart(e: TouchEvent) {
  const t = e.touches[0]; if (t) touchStart = { x: t.clientX, y: t.clientY }
}
function onTouchEnd(e: TouchEvent) {
  if (!touchStart) return
  const t = e.changedTouches[0]; if (!t) return
  const dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y
  touchStart = null
  if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return
  if (gameState.value === 'idle') { startGame(); return }
  move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'))
}

onMounted(() => {
  const c = canvasEl.value
  if (c) { c.width = W; c.height = W }
  window.addEventListener('keydown', onKey)
  c?.addEventListener('touchstart', onTouchStart, { passive: true })
  c?.addEventListener('touchend',   onTouchEnd,   { passive: true })
  raf = requestAnimationFrame(frame)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
  canvasEl.value?.removeEventListener('touchstart', onTouchStart)
  canvasEl.value?.removeEventListener('touchend',   onTouchEnd)
})
</script>

<template>
  <div class="flex flex-col items-center gap-4 select-none">
    <div class="glass-hud px-6 py-2 flex gap-6 items-center">
      <div class="text-center">
        <p class="hud-label text-[10px]">SCORE</p>
        <p class="font-mono font-bold text-white text-lg leading-tight">{{ score }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">BEST</p>
        <p class="font-mono font-bold text-white text-lg leading-tight">{{ best }}</p>
      </div>
    </div>

    <div class="relative">
      <canvas
        ref="canvasEl"
        class="rounded-xl border border-white/10 block"
        :style="{ width: `${W}px`, height: `${W}px` }"
      />

      <GameResultOverlay :state="gameState" :score="score" @restart="restart" />

      <Transition name="fade">
        <div
          v-if="gameState === 'idle'"
          class="absolute inset-0 rounded-xl flex flex-col items-center justify-end pb-8 gap-3"
        >
          <button class="btn-neon-blue" @click.stop="startGame">START</button>
        </div>
      </Transition>
    </div>

    <p class="font-mono text-xs text-slate-600">Arrow keys · swipe to slide · merge tiles to reach 2048</p>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease }
.fade-enter-from, .fade-leave-to       { opacity: 0 }
</style>
