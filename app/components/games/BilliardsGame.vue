<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const score    = ref(0)
const state    = ref<'idle' | 'playing' | 'won' | 'over'>('idle')

const W = 560, H = 340
const TABLE_X = 40, TABLE_Y = 40, TABLE_W = 480, TABLE_H = 260
const POCKET_R = 18
const BALL_R = 10
const FRICTION = 0.985
const τ = Math.PI * 2

const { bounce: sfxBounce, pop: sfxPop, win: sfxWin, lose: sfxLose } = useGameSounds()

let raf = 0
let titlePulse = 0

// Pockets: corners + mid long sides
const POCKETS = [
  { x: TABLE_X, y: TABLE_Y },
  { x: TABLE_X + TABLE_W / 2, y: TABLE_Y },
  { x: TABLE_X + TABLE_W, y: TABLE_Y },
  { x: TABLE_X, y: TABLE_Y + TABLE_H },
  { x: TABLE_X + TABLE_W / 2, y: TABLE_Y + TABLE_H },
  { x: TABLE_X + TABLE_W, y: TABLE_Y + TABLE_H },
]

// Ball colors: 1-7 solids, 8 black, 9-15 stripes (lighter)
const BALL_COLORS = [
  '#ffffff', // 0: cue
  '#facc15', '#00d4ff', '#fb923c', '#a855f7', '#f472b6', '#00ff88', '#ef4444', // 1-7 solids
  '#111111', // 8: black
  '#fde68a', '#93c5fd', '#fdba74', '#d8b4fe', '#f9a8d4', '#6ee7b7', '#fca5a5', // 9-15 stripes
]

interface Ball {
  id: number
  x: number; y: number
  vx: number; vy: number
  color: string
  potted: boolean
  isStripe: boolean
}

let balls: Ball[] = []
// Aim
let aimDrag = false
let aimStart = { x: 0, y: 0 }
let aimEnd   = { x: 0, y: 0 }
let turnPlayer = true // true = player (solids), false = cpu (stripes)
let playerGroup: 'solid' | 'stripe' | null = null
let cpuThinkTimer = 0
let shooting = false

function makeBalls(): Ball[] {
  const out: Ball[] = []
  // Cue ball
  out.push({ id: 0, x: TABLE_X + 130, y: TABLE_Y + TABLE_H / 2, vx: 0, vy: 0, color: '#ffffff', potted: false, isStripe: false })
  // Triangle rack at right side
  const rackX = TABLE_X + TABLE_W - 130
  const rackY = TABLE_Y + TABLE_H / 2
  const order = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15]
  let idx = 0
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col <= row; col++) {
      const id = order[idx++] ?? 1
      const bx = rackX + row * (BALL_R * 2 + 1)
      const by = rackY + (col - row / 2) * (BALL_R * 2 + 1)
      out.push({
        id, x: bx, y: by, vx: 0, vy: 0,
        color: BALL_COLORS[id] ?? '#ffffff',
        potted: false,
        isStripe: id >= 9,
      })
    }
  }
  return out
}

function reset() {
  balls = makeBalls()
  aimDrag = false; shooting = false
  turnPlayer = true; playerGroup = null; cpuThinkTimer = 0
  score.value = 0
}

function startGame() { reset(); state.value = 'playing' }
function restart() { reset(); state.value = 'playing' }

function cue() { return balls.find(b => b.id === 0 && !b.potted) }
function eightBall() { return balls.find(b => b.id === 8) }

function allBallsResting() { return balls.every(b => b.potted || (Math.abs(b.vx) < 0.05 && Math.abs(b.vy) < 0.05)) }

function checkWin(recentPot: number[]) {
  const cuePotted = !cue()
  if (cuePotted) { state.value = 'over'; sfxLose(); return }

  if (recentPot.includes(8)) {
    const myGroup: 'solid' | 'stripe' = playerGroup ?? 'solid'
    const myBalls = balls.filter(b => (myGroup === 'solid' ? !b.isStripe && b.id !== 8 && b.id !== 0 : b.isStripe))
    const allMine = myBalls.every(b => b.potted)
    if (allMine && turnPlayer) { state.value = 'won'; sfxWin() }
    else { state.value = 'over'; sfxLose() }
  }
}

function shoot(power: number, angle: number) {
  const c = cue()
  if (!c) return
  c.vx = Math.cos(angle) * power
  c.vy = Math.sin(angle) * power
  shooting = true
}

function cpuTurn() {
  const c = cue()
  if (!c) return
  const myGroup: 'solid' | 'stripe' = playerGroup ? (playerGroup === 'solid' ? 'stripe' : 'solid') : 'stripe'
  const myRemaining = balls.filter(b => !b.potted && (myGroup === 'solid' ? !b.isStripe && b.id !== 8 && b.id !== 0 : b.isStripe))
  const target = myRemaining.length > 0 ? myRemaining[Math.floor(Math.random() * myRemaining.length)]! : eightBall()
  if (!target) return
  const angle = Math.atan2(target.y - c.y, target.x - c.x) + (Math.random() - 0.5) * 0.3
  const power = 8 + Math.random() * 6
  shoot(power, angle)
}

// --- Physics ---
function ballBallCollide(a: Ball, b: Ball) {
  const dx = b.x - a.x, dy = b.y - a.y
  const d = Math.hypot(dx, dy)
  if (d < BALL_R * 2 && d > 0) {
    const nx = dx / d, ny = dy / d
    // Relative velocity along normal
    const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny
    if (rv > 0) return // Moving apart
    a.vx -= rv * nx; a.vy -= rv * ny
    b.vx += rv * nx; b.vy += rv * ny
    // Separate
    const overlap = BALL_R * 2 - d
    a.x -= nx * overlap / 2; a.y -= ny * overlap / 2
    b.x += nx * overlap / 2; b.y += ny * overlap / 2
    sfxBounce()
  }
}

function onMouseDown(e: MouseEvent) {
  if (state.value === 'idle') { startGame(); return }
  if (state.value !== 'playing') return
  if (!turnPlayer || shooting || !allBallsResting()) return
  const rect = canvasEl.value!.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const c = cue()
  if (!c) return
  aimDrag = true
  aimStart = { x: mx, y: my }
  aimEnd = { x: mx, y: my }
}

function onMouseMove(e: MouseEvent) {
  if (!aimDrag) return
  const rect = canvasEl.value!.getBoundingClientRect()
  aimEnd = { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function onMouseUp() {
  if (!aimDrag) return
  aimDrag = false
  const c = cue()
  if (!c) return
  const dx = aimStart.x - aimEnd.x
  const dy = aimStart.y - aimEnd.y
  const dist = Math.hypot(dx, dy)
  if (dist < 2) return
  const power = Math.min(20, dist / 10)
  const angle = Math.atan2(dy, dx)
  shoot(power, angle)
}

function draw(ts: number) {
  raf = requestAnimationFrame(draw)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return
  titlePulse = ts

  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, W, H)

  if (state.value === 'playing') {
    // Physics update
    for (const b of balls) {
      if (b.potted) continue
      b.vx *= FRICTION; b.vy *= FRICTION
      if (Math.abs(b.vx) < 0.02) b.vx = 0
      if (Math.abs(b.vy) < 0.02) b.vy = 0
      b.x += b.vx; b.y += b.vy

      // Wall bounces
      if (b.x - BALL_R < TABLE_X) { b.x = TABLE_X + BALL_R; b.vx = Math.abs(b.vx) * 0.8; sfxBounce() }
      if (b.x + BALL_R > TABLE_X + TABLE_W) { b.x = TABLE_X + TABLE_W - BALL_R; b.vx = -Math.abs(b.vx) * 0.8; sfxBounce() }
      if (b.y - BALL_R < TABLE_Y) { b.y = TABLE_Y + BALL_R; b.vy = Math.abs(b.vy) * 0.8; sfxBounce() }
      if (b.y + BALL_R > TABLE_Y + TABLE_H) { b.y = TABLE_Y + TABLE_H - BALL_R; b.vy = -Math.abs(b.vy) * 0.8; sfxBounce() }
    }

    // Ball-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        if (balls[i]!.potted || balls[j]!.potted) continue
        ballBallCollide(balls[i]!, balls[j]!)
      }
    }

    // Pocket check
    const recentPot: number[] = []
    for (const b of balls) {
      if (b.potted) continue
      for (const p of POCKETS) {
        if (Math.hypot(b.x - p.x, b.y - p.y) < POCKET_R) {
          b.potted = true; b.vx = 0; b.vy = 0
          recentPot.push(b.id)
          sfxPop()
          if (b.id !== 0 && b.id !== 8) score.value += 100
          // Assign group on first pot
          if (!playerGroup && b.id !== 0 && b.id !== 8) {
            if (turnPlayer) playerGroup = b.isStripe ? 'stripe' : 'solid'
            else playerGroup = b.isStripe ? 'solid' : 'stripe'
          }
        }
      }
    }

    if (recentPot.length > 0) checkWin(recentPot)

    // Turn management
    if (shooting && allBallsResting()) {
      shooting = false
      // If no pot this turn OR potted cue, switch turn
      if (recentPot.length === 0 || recentPot.includes(0)) {
        turnPlayer = !turnPlayer
        // Respawn cue if potted
        if (recentPot.includes(0)) {
          balls.push({ id: 0, x: TABLE_X + 100, y: TABLE_Y + TABLE_H / 2, vx: 0, vy: 0, color: '#ffffff', potted: false, isStripe: false })
        }
      }
      // If it's CPU turn, schedule
      if (!turnPlayer) cpuThinkTimer = 90
    }

    // CPU
    if (!turnPlayer && cpuThinkTimer > 0 && !shooting && allBallsResting()) {
      cpuThinkTimer--
      if (cpuThinkTimer === 0) cpuTurn()
    }
  }

  // Draw table felt
  ctx.fillStyle = '#14532d'
  ctx.fillRect(TABLE_X, TABLE_Y, TABLE_W, TABLE_H)

  // Rail
  ctx.strokeStyle = '#92400e'; ctx.lineWidth = 8
  ctx.strokeRect(TABLE_X - 4, TABLE_Y - 4, TABLE_W + 8, TABLE_H + 8)

  // Pockets
  for (const p of POCKETS) {
    ctx.save()
    ctx.fillStyle = '#030712'
    ctx.shadowColor = '#000000'; ctx.shadowBlur = 4
    ctx.beginPath(); ctx.arc(p.x, p.y, POCKET_R, 0, τ); ctx.fill()
    ctx.restore()
  }

  // Table markings
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(TABLE_X + TABLE_W / 2, TABLE_Y + TABLE_H / 2, 20, 0, τ)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(TABLE_X + TABLE_W / 2, TABLE_Y)
  ctx.lineTo(TABLE_X + TABLE_W / 2, TABLE_Y + TABLE_H)
  ctx.stroke()
  ctx.restore()

  // Balls
  for (const b of balls) {
    if (b.potted) continue
    ctx.save()
    // Stripe effect
    if (b.isStripe) {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, τ); ctx.fill()
      ctx.fillStyle = b.color
      ctx.beginPath()
      ctx.arc(b.x, b.y, BALL_R, Math.PI * 0.15, Math.PI * 0.85); ctx.fill()
      ctx.beginPath()
      ctx.arc(b.x, b.y, BALL_R, Math.PI * 1.15, Math.PI * 1.85); ctx.fill()
    } else {
      ctx.shadowColor = b.color; ctx.shadowBlur = b.id === 0 ? 14 : 6
      ctx.fillStyle = b.color
      ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, τ); ctx.fill()
    }
    // Number text (skip cue)
    if (b.id !== 0) {
      ctx.fillStyle = b.id === 8 ? '#ffffff' : (b.isStripe ? b.color : '#000000')
      ctx.font = "bold 7px 'Courier New', monospace"
      ctx.textAlign = 'center'
      ctx.shadowBlur = 0
      ctx.fillText(String(b.id), b.x, b.y + 2.5)
    }
    ctx.restore()
  }

  // Aim line
  if (aimDrag && turnPlayer && state.value === 'playing') {
    const c = cue()
    if (c) {
      const dx = aimStart.x - aimEnd.x, dy = aimStart.y - aimEnd.y
      const angle = Math.atan2(dy, dx)
      const power = Math.min(20, Math.hypot(dx, dy) / 10)
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(c.x, c.y)
      ctx.lineTo(c.x + Math.cos(angle) * 80, c.y + Math.sin(angle) * 80)
      ctx.stroke()
      // Power indicator
      ctx.setLineDash([])
      ctx.strokeStyle = power > 15 ? '#f472b6' : '#00d4ff'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(aimEnd.x, aimEnd.y)
      ctx.lineTo(aimStart.x, aimStart.y)
      ctx.stroke()
      ctx.restore()
    }
  }

  // HUD
  ctx.save()
  ctx.font = "11px 'Courier New', monospace"
  ctx.textAlign = 'left'
  if (state.value === 'playing') {
    const pg = playerGroup
    ctx.fillStyle = '#00d4ff'
    ctx.fillText(turnPlayer ? '▶ YOUR TURN' : '  CPU TURN', 8, H - 12)
    if (pg) {
      ctx.fillStyle = '#facc15'
      ctx.fillText(`You: ${pg}s`, 160, H - 12)
    }
    ctx.fillStyle = '#a855f7'; ctx.textAlign = 'right'
    ctx.fillText(`Score: ${score.value}`, W - 8, H - 12)
  }
  ctx.restore()

  // Idle
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.82)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    const pulse = 0.5 + 0.5 * Math.sin(titlePulse * 0.003)
    ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 8 + pulse * 18
    ctx.fillStyle = '#00ff88'
    ctx.font = "bold 28px 'Space Grotesk', sans-serif"
    ctx.fillText('8-BALL BILLIARDS', W / 2, H / 2 - 30)
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(200,220,255,0.45)'
    ctx.font = "13px 'Courier New', monospace"
    ctx.fillText('Drag from cue ball to aim & shoot', W / 2, H / 2 + 10)
    ctx.fillText('Click to start', W / 2, H / 2 + 32)
  }
}

onMounted(() => {
  const c = canvasEl.value!
  c.width = W; c.height = H
  c.addEventListener('mousedown', onMouseDown)
  c.addEventListener('mousemove', onMouseMove)
  c.addEventListener('mouseup', onMouseUp)
  raf = requestAnimationFrame(draw)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  const c = canvasEl.value
  c?.removeEventListener('mousedown', onMouseDown)
  c?.removeEventListener('mousemove', onMouseMove)
  c?.removeEventListener('mouseup', onMouseUp)
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
        <p class="hud-label text-[10px]">TURN</p>
        <p class="font-mono font-bold text-neon-blue text-lg leading-tight text-sm">{{ state === 'playing' ? (turnPlayer ? 'PLAYER' : 'CPU') : '—' }}</p>
      </div>
    </div>

    <div class="relative">
      <canvas ref="canvasEl" class="rounded-xl border border-white/10 block cursor-crosshair" />
      <GameResultOverlay
        v-if="state === 'won' || state === 'over'"
        :state="state"
        :score="score"
        :extra="state === 'won' ? 'You sank the 8-ball!' : 'CPU wins!'"
        @restart="restart"
      />
    </div>
    <p class="font-mono text-xs text-slate-600">Drag from cue ball to aim • Pot your group then the 8-ball to win</p>
  </div>
</template>
