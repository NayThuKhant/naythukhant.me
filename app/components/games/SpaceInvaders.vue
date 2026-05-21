<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const score    = ref(0)
const lives    = ref(3)
const state    = ref<'idle' | 'playing' | 'over' | 'won'>('idle')

const W = 480, H = 520
const τ = Math.PI * 2
const COLS = 10, ROWS = 5
const INV_W = 30, INV_H = 20, STEP_X = 42, STEP_Y = 34
const GRID_START_X = (W - (COLS - 1) * STEP_X - INV_W) / 2
const GRID_START_Y = 68
const PLAYER_W = 44, PLAYER_H = 20, PLAYER_Y = H - 48
const BULLET_W = 3, BULLET_H = 10

const ROW_COLORS = ['#f472b6', '#a855f7', '#00d4ff', '#00ff88', '#ffe082']

interface Invader { x: number; y: number; alive: boolean; row: number; col: number }
interface Bullet  { x: number; y: number; speed: number }

let raf = 0
let invaders: Invader[] = []
let playerX = W / 2 - PLAYER_W / 2
let bullets: Bullet[] = []
let invBullets: Bullet[] = []
let invDir = 1, invSpeed = 0.6, invDropAmt = 0
let invMoveTimer = 0, invFireTimer = 0, invMoveInterval = 600
let keys = { left: false, right: false, fire: false }
let canFire = true, fireTimer = 0
let tick = 0

function buildInvaders(): Invader[] {
  const out: Invader[] = []
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      out.push({ x: GRID_START_X + c * STEP_X, y: GRID_START_Y + r * STEP_Y, alive: true, row: r, col: c })
  return out
}

function reset() {
  playerX = W / 2 - PLAYER_W / 2
  invaders = buildInvaders()
  bullets = []; invBullets = []
  invDir = 1; invSpeed = 0.6; invDropAmt = 0
  invMoveTimer = 0; invFireTimer = 0; invMoveInterval = 600
  canFire = true; fireTimer = 0; tick = 0
  score.value = 0; lives.value = 3
}

function startGame() { reset(); state.value = 'playing' }

function drawInvader(ctx: CanvasRenderingContext2D, x: number, y: number, row: number, t: number) {
  const col = ROW_COLORS[row]!
  ctx.save()
  ctx.translate(x + INV_W / 2, y + INV_H / 2)
  ctx.shadowColor = col; ctx.shadowBlur = 10
  ctx.fillStyle = col

  // Pixelated alien shape
  const s = 2.2 // pixel size
  const pattern = row < 2
    ? [[0,1,0,1,0,1,0],[1,0,1,0,1,0,1],[0,1,1,1,1,1,0],[0,0,1,0,1,0,0]]  // squid
    : row < 4
      ? [[0,1,0,0,0,1,0],[1,1,1,1,1,1,1],[1,0,1,1,1,0,1],[0,1,0,0,0,1,0]]  // crab
      : [[0,0,1,0,1,0,0],[0,1,1,1,1,1,0],[1,1,0,1,0,1,1],[1,0,1,0,1,0,1]]  // saucer

  const animOff = Math.floor(t / 600) % 2 === 0 ? 0 : 1
  const rows = pattern.length, cols = pattern[0]!.length
  const offX = -(cols * s) / 2, offY = -(rows * s) / 2

  for (let pr = 0; pr < rows; pr++) {
    for (let pc = 0; pc < cols; pc++) {
      const px = (pattern[pr]![(pc + animOff) % cols] ?? 0)
      if (px) ctx.fillRect(offX + pc * s, offY + pr * s, s, s)
    }
  }
  ctx.restore()
}

function frame(ts: number) {
  raf = requestAnimationFrame(frame)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return
  tick = ts

  ctx.fillStyle = '#030712'; ctx.fillRect(0, 0, W, H)

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.02)'; ctx.lineWidth = 1
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }

  if (state.value === 'playing') {
    const aliveInv = invaders.filter(i => i.alive)
    if (aliveInv.length === 0) { state.value = 'won'; return }

    // Player movement
    if (keys.left)  playerX = Math.max(0, playerX - 5)
    if (keys.right) playerX = Math.min(W - PLAYER_W, playerX + 5)

    // Player fire
    fireTimer += 16
    if (keys.fire && canFire && fireTimer > 280) {
      bullets.push({ x: playerX + PLAYER_W / 2, y: PLAYER_Y, speed: -9 })
      canFire = false; fireTimer = 0
    }
    if (!keys.fire) canFire = true

    // Move invaders (step-based)
    invMoveTimer += 16
    if (invMoveTimer > invMoveInterval) {
      invMoveTimer = 0
      let drop = false
      const xs = aliveInv.map(i => i.x)
      const minX = Math.min(...xs), maxX = Math.max(...xs)
      if (invDir > 0 && maxX + INV_W > W - 8) drop = true
      if (invDir < 0 && minX < 8) drop = true
      if (drop) {
        invDir = -invDir
        for (const inv of invaders) if (inv.alive) inv.y += 18
        invDropAmt++
        invMoveInterval = Math.max(100, 600 - invDropAmt * 40)
      } else {
        for (const inv of invaders) if (inv.alive) inv.x += invDir * 14
      }
      // Invader reaches player
      for (const inv of invaders) {
        if (inv.alive && inv.y + INV_H >= PLAYER_Y) { state.value = 'over'; return }
      }
    }

    // Invader fire
    invFireTimer += 16
    if (invFireTimer > Math.max(600, 1800 - score.value * 2)) {
      invFireTimer = 0
      const shooters = aliveInv.filter(i => !aliveInv.some(j => j.alive && j.col === i.col && j.row > i.row))
      if (shooters.length) {
        const s = shooters[Math.floor(Math.random() * shooters.length)]!
        invBullets.push({ x: s.x + INV_W / 2, y: s.y + INV_H, speed: 4.5 + invDropAmt * 0.3 })
      }
    }

    // Move bullets
    bullets    = bullets.filter(b => b.y > -10)
    invBullets = invBullets.filter(b => b.y < H + 10)
    for (const b of bullets)    b.y += b.speed
    for (const b of invBullets) b.y += b.speed

    // Player bullet vs invader
    for (const b of bullets) {
      for (const inv of invaders) {
        if (!inv.alive) continue
        if (b.x > inv.x && b.x < inv.x + INV_W && b.y > inv.y && b.y < inv.y + INV_H) {
          inv.alive = false; b.y = -999
          score.value += (ROWS - inv.row) * 10
          invMoveInterval = Math.max(100, invMoveInterval - 8)
        }
      }
    }

    // Invader bullet vs player
    const pc = playerX + PLAYER_W / 2
    for (const b of invBullets) {
      if (b.x > playerX - 4 && b.x < playerX + PLAYER_W + 4 && b.y > PLAYER_Y - 4 && b.y < PLAYER_Y + PLAYER_H + 4) {
        b.y = H + 999; lives.value--
        if (lives.value <= 0) { state.value = 'over'; return }
      }
    }
  }

  // Draw invaders
  for (const inv of invaders) {
    if (inv.alive) drawInvader(ctx, inv.x, inv.y, inv.row, tick)
  }

  // Draw bullets (player)
  ctx.save()
  ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 8; ctx.fillStyle = '#00ff88'
  for (const b of bullets) ctx.fillRect(b.x - BULLET_W / 2, b.y, BULLET_W, BULLET_H)
  ctx.restore()

  // Draw invader bullets
  ctx.save()
  ctx.shadowColor = '#f472b6'; ctx.shadowBlur = 6; ctx.fillStyle = '#f472b6'
  for (const b of invBullets) {
    ctx.beginPath(); ctx.moveTo(b.x - 2, b.y); ctx.lineTo(b.x + 2, b.y); ctx.lineTo(b.x, b.y + BULLET_H); ctx.closePath(); ctx.fill()
  }
  ctx.restore()

  // Draw player ship
  ctx.save()
  ctx.translate(playerX + PLAYER_W / 2, PLAYER_Y + PLAYER_H / 2)
  ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 14
  ctx.fillStyle = '#00d4ff'
  // Cannon
  ctx.fillRect(-3, -PLAYER_H / 2 - 8, 6, 12)
  // Body
  ctx.beginPath(); ctx.moveTo(-PLAYER_W / 2, PLAYER_H / 2); ctx.lineTo(PLAYER_W / 2, PLAYER_H / 2)
  ctx.lineTo(PLAYER_W / 3, -PLAYER_H / 2); ctx.lineTo(-PLAYER_W / 3, -PLAYER_H / 2); ctx.closePath(); ctx.fill()
  ctx.restore()

  // Ground line
  ctx.strokeStyle = 'rgba(0,212,255,0.2)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, H - 22); ctx.lineTo(W, H - 22); ctx.stroke()

  // HUD
  ctx.fillStyle = 'rgba(200,220,255,0.65)'
  ctx.font = "13px 'Courier New', monospace"
  ctx.textAlign = 'left'; ctx.fillText(`SCORE ${score.value}`, 12, 22)
  ctx.textAlign = 'right'; ctx.fillText('♥ '.repeat(lives.value).trim(), W - 12, 22)

  // Overlays
  if (state.value !== 'playing') {
    ctx.fillStyle = 'rgba(3,7,18,0.82)'; ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    const msg = state.value === 'idle' ? 'SPACE INVADERS'
              : state.value === 'won'  ? 'SECTOR CLEARED!'
              :                          'GAME OVER'
    ctx.fillStyle = state.value === 'won' ? '#00ff88' : '#00d4ff'
    ctx.font = "bold 28px 'Space Grotesk', sans-serif"
    ctx.fillText(msg, W / 2, H / 2 - 36)
    if (state.value !== 'idle') {
      ctx.fillStyle = 'rgba(200,220,255,0.75)'
      ctx.font = "15px 'Courier New', monospace"
      ctx.fillText(`Score: ${score.value}`, W / 2, H / 2 + 2)
    }
    ctx.fillStyle = 'rgba(200,220,255,0.45)'
    ctx.font = "13px 'Courier New', monospace"
    ctx.fillText('← → to move • SPACE to fire', W / 2, H / 2 + 46)
  }
}

function onKey(e: KeyboardEvent) {
  const down = e.type === 'keydown'
  if (e.key === 'ArrowLeft')  { e.preventDefault(); keys.left  = down }
  if (e.key === 'ArrowRight') { e.preventDefault(); keys.right = down }
  if (e.code === 'Space') {
    e.preventDefault()
    if (state.value !== 'playing' && down) { startGame(); return }
    keys.fire = down
  }
}

onMounted(() => {
  if (canvasEl.value) { canvasEl.value.width = W; canvasEl.value.height = H }
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey)
  raf = requestAnimationFrame(frame)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey)
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 select-none">
    <canvas ref="canvasEl" class="rounded-xl border border-white/10 block" />
    <p class="font-mono text-xs text-slate-600">← → to move • SPACE to fire</p>
  </div>
</template>
