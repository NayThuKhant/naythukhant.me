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

interface Invader { x: number; y: number; alive: boolean; row: number; col: number; flashTimer: number }
interface Bullet  { x: number; y: number; speed: number }
interface Particle { x: number; y: number; vx: number; vy: number; age: number; maxAge: number; color: string; r: number }
interface ScorePopup { x: number; y: number; vy: number; age: number; maxAge: number; text: string }

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
let particles: Particle[] = []
let scorePopups: ScorePopup[] = []
let shakeTimer = 0
let titlePulse = 0

const { shoot: sfxShoot, pop: sfxPop, die: sfxDie, win: sfxWin, lose: sfxLose } = useGameSounds()

function buildInvaders(): Invader[] {
  const out: Invader[] = []
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      out.push({ x: GRID_START_X + c * STEP_X, y: GRID_START_Y + r * STEP_Y, alive: true, row: r, col: c, flashTimer: 0 })
  return out
}

function spawnParticles(x: number, y: number, color: string) {
  for (let i = 0; i < 7; i++) {
    const angle = (τ / 7) * i + Math.random() * 0.5
    const speed = 1.5 + Math.random() * 2.5
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, maxAge: 20, color, r: 2 + Math.random() * 2 })
  }
}

function spawnScorePopup(x: number, y: number, pts: number) {
  scorePopups.push({ x, y, vy: -0.7, age: 0, maxAge: 40, text: `+${pts}` })
}

function reset() {
  playerX = W / 2 - PLAYER_W / 2
  invaders = buildInvaders()
  bullets = []; invBullets = []
  invDir = 1; invSpeed = 0.6; invDropAmt = 0
  invMoveTimer = 0; invFireTimer = 0; invMoveInterval = 600
  canFire = true; fireTimer = 0; tick = 0
  score.value = 0; lives.value = 3
  particles = []; scorePopups = []; shakeTimer = 0
}

function startGame() { reset(); state.value = 'playing' }

function restart() {
  reset()
  state.value = 'playing'
}

function drawInvader(ctx: CanvasRenderingContext2D, x: number, y: number, row: number, t: number, flashTimer: number) {
  const col = ROW_COLORS[row]!
  ctx.save()
  ctx.translate(x + INV_W / 2, y + INV_H / 2)

  if (flashTimer > 0) {
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 18
    ctx.fillStyle = `rgba(255,255,255,${0.8 * (flashTimer / 4)})`
  } else {
    ctx.shadowColor = col; ctx.shadowBlur = 10
    ctx.fillStyle = col
  }

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
  titlePulse = ts

  // Camera shake on death
  let shakeX = 0, shakeY = 0
  if (shakeTimer > 0) {
    shakeX = (Math.random() - 0.5) * 8
    shakeY = (Math.random() - 0.5) * 8
    shakeTimer--
  }

  ctx.save()
  if (shakeTimer > 0) ctx.translate(shakeX, shakeY)

  ctx.fillStyle = '#030712'; ctx.fillRect(0, 0, W, H)

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.02)'; ctx.lineWidth = 1
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }

  if (state.value === 'playing') {
    const aliveInv = invaders.filter(i => i.alive)
    if (aliveInv.length === 0) { ctx.restore(); state.value = 'won'; sfxWin(); return }

    // Player movement
    if (keys.left)  playerX = Math.max(0, playerX - 5)
    if (keys.right) playerX = Math.min(W - PLAYER_W, playerX + 5)

    // Player fire
    fireTimer += 16
    if (keys.fire && canFire && fireTimer > 280) {
      bullets.push({ x: playerX + PLAYER_W / 2, y: PLAYER_Y, speed: -9 })
      sfxShoot()
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
        if (inv.alive && inv.y + INV_H >= PLAYER_Y) { ctx.restore(); state.value = 'over'; return }
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
          const pts = (ROWS - inv.row) * 10
          score.value += pts
          sfxPop()
          invMoveInterval = Math.max(100, invMoveInterval - 8)
          // Particle burst + score popup
          spawnParticles(inv.x + INV_W / 2, inv.y + INV_H / 2, ROW_COLORS[inv.row]!)
          spawnScorePopup(inv.x + INV_W / 2, inv.y, pts)
          inv.flashTimer = 4
        }
      }
    }

    // Invader bullet vs player
    for (const b of invBullets) {
      if (b.x > playerX - 4 && b.x < playerX + PLAYER_W + 4 && b.y > PLAYER_Y - 4 && b.y < PLAYER_Y + PLAYER_H + 4) {
        b.y = H + 999; lives.value--
        sfxDie()
        shakeTimer = 8
        if (lives.value <= 0) { ctx.restore(); state.value = 'over'; sfxLose(); return }
      }
    }

    // Update flash timers
    for (const inv of invaders) { if (inv.flashTimer > 0) inv.flashTimer-- }

    // Update particles
    for (const p of particles) { p.x += p.vx; p.y += p.vy; p.age++ }
    particles = particles.filter(p => p.age < p.maxAge)

    // Update score popups
    for (const sp of scorePopups) { sp.y += sp.vy; sp.age++ }
    scorePopups = scorePopups.filter(sp => sp.age < sp.maxAge)
  }

  // Draw invaders
  for (const inv of invaders) {
    if (inv.alive) drawInvader(ctx, inv.x, inv.y, inv.row, tick, inv.flashTimer)
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

  // Draw particles
  for (const p of particles) {
    const t = 1 - p.age / p.maxAge
    ctx.save()
    ctx.globalAlpha = t
    ctx.shadowColor = p.color; ctx.shadowBlur = 6
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
    ctx.fillStyle = '#ffe082'
    ctx.shadowColor = '#ffe082'; ctx.shadowBlur = 8
    ctx.fillText(sp.text, sp.x, sp.y)
  }
  ctx.restore()

  // Ground line
  ctx.strokeStyle = 'rgba(0,212,255,0.2)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, H - 22); ctx.lineTo(W, H - 22); ctx.stroke()


  // Idle title overlay with pulsing glow
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.82)'; ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    const pulse = 0.5 + 0.5 * Math.sin(titlePulse * 0.003)
    ctx.shadowColor = '#00d4ff'
    ctx.shadowBlur = 10 + pulse * 20
    ctx.fillStyle = `rgba(0,${Math.floor(180 + pulse * 75)},255,1)`
    ctx.font = "bold 28px 'Space Grotesk', sans-serif"
    ctx.fillText('SPACE INVADERS', W / 2, H / 2 - 36)
    ctx.shadowBlur = 0
    // Animated mini-invader row under title
    const colors = ['#f472b6','#a855f7','#00d4ff','#00ff88','#ffe082']
    for (let i = 0; i < 5; i++) {
      const ix = W / 2 - 60 + i * 30
      const iy = H / 2 - 6 + Math.sin(titlePulse * 0.002 + i * 0.8) * 4
      ctx.save()
      ctx.shadowColor = colors[i]!; ctx.shadowBlur = 8 + pulse * 6
      ctx.fillStyle = colors[i]!
      ctx.fillRect(ix - 4, iy - 4, 8, 8)
      ctx.restore()
    }
    ctx.fillStyle = 'rgba(200,220,255,0.45)'
    ctx.shadowBlur = 0
    ctx.font = "13px 'Courier New', monospace"
    ctx.fillText('← → to move • SPACE to fire', W / 2, H / 2 + 46)
  }

  ctx.restore()
}

function onKey(e: KeyboardEvent) {
  const down = e.type === 'keydown'
  if (e.key === 'ArrowLeft')  { e.preventDefault(); keys.left  = down }
  if (e.key === 'ArrowRight') { e.preventDefault(); keys.right = down }
  if (e.code === 'Space') {
    e.preventDefault()
    if (state.value === 'idle' && down) { startGame(); return }
    if (state.value === 'over' || state.value === 'won') return
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

    <div class="glass-hud px-6 py-2 flex gap-6 items-center">
      <div class="text-center">
        <p class="hud-label text-[10px]">SCORE</p>
        <p class="font-mono font-bold text-white text-lg leading-tight">{{ score }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">LIVES</p>
        <p class="font-mono font-bold text-neon-pink text-lg leading-tight tracking-widest">
          {{ '♥'.repeat(lives) }}{{ '♡'.repeat(Math.max(0, 3 - lives)) }}
        </p>
      </div>
    </div>

    <div class="relative">
      <canvas ref="canvasEl" class="rounded-xl border border-white/10 block" />

      <GameResultOverlay :state="state" :score="score" @restart="restart" />
    </div>
    <p class="font-mono text-xs text-slate-600">← → to move • SPACE to fire</p>
  </div>
</template>
