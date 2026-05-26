<script setup lang="ts">
const W = 480, H = 520
const ROWS = 13, CELL = H / ROWS  // ~40px per row

const { jump: sfxJump, die: sfxDie, score: sfxScore, win: sfxWin, lose: sfxLose } = useGameSounds()

const state = ref<'idle' | 'playing' | 'over' | 'won'>('idle')
const lives = ref(3)
const score = ref(0)
const homeFilled = ref<boolean[]>([false,false,false,false,false])
let raf = 0

const canvasEl = ref<HTMLCanvasElement | null>(null)

interface Obj { x: number; y: number; w: number; speed: number; color: string }

// Lane configs: row, direction, speed, objectW
const ROAD_LANES = [
  { row: 8,  dir: 1,  spd: 1.5, w: 60, color: '#e11d48', gap: 150 },
  { row: 9,  dir: -1, spd: 2.0, w: 80, color: '#f59e0b', gap: 120 },
  { row: 10, dir: 1,  spd: 1.2, w: 50, color: '#e11d48', gap: 200 },
  { row: 11, dir: -1, spd: 2.5, w: 70, color: '#f59e0b', gap: 160 },
  { row: 12, dir: 1,  spd: 1.8, w: 90, color: '#e11d48', gap: 180 },
]
const RIVER_LANES = [
  { row: 2, dir: 1,  spd: 1.0, w: 100, gap: 60 },
  { row: 3, dir: -1, spd: 1.5, w: 80,  gap: 80 },
  { row: 4, dir: 1,  spd: 0.8, w: 120, gap: 50 },
  { row: 5, dir: -1, spd: 1.2, w: 90,  gap: 70 },
  { row: 6, dir: 1,  spd: 2.0, w: 70,  gap: 90 },
]

let cars: Obj[] = []
let logs: Obj[] = []
let frog = { x: W / 2 - CELL / 2, row: ROWS - 1, onLog: false, logDx: 0 }
let keys = { left: false, right: false, up: false, down: false }
let keyPressed: Record<string, boolean> = {}
let moveTimer = 0

function rowY(row: number): number { return row * CELL }

function initObjs() {
  cars = []
  for (const lane of ROAD_LANES) {
    let x = -lane.w
    while (x < W + lane.w) {
      cars.push({ x, y: rowY(lane.row), w: lane.w, speed: lane.spd * lane.dir, color: lane.color })
      x += lane.w + lane.gap
    }
  }
  logs = []
  for (const lane of RIVER_LANES) {
    let x = lane.dir === 1 ? -lane.w : W
    for (let i = 0; i < 5; i++) {
      logs.push({ x: x + i * (lane.w + lane.gap) * lane.dir, y: rowY(lane.row), w: lane.w, speed: lane.spd * lane.dir, color: '#92400e' })
    }
  }
}

function resetFrog() {
  frog = { x: W / 2 - CELL / 2, row: ROWS - 1, onLog: false, logDx: 0 }
  moveTimer = 0
}

function startGame() {
  lives.value = 3
  score.value = 0
  homeFilled.value = [false,false,false,false,false]
  initObjs()
  resetFrog()
  state.value = 'playing'
}

function moveFrog(dr: number, dc: number) {
  if (state.value !== 'playing') return
  const newRow = Math.max(0, Math.min(ROWS - 1, frog.row + dr))
  const newX = Math.max(0, Math.min(W - CELL, frog.x + dc * CELL))
  frog.row = newRow
  frog.x = newX
  sfxJump()
  if (dr === -1) score.value += 10
}

function checkCollisions() {
  const fx = frog.x + 4, fy = rowY(frog.row) + 4
  const fw = CELL - 8, fh = CELL - 8

  // Car collision
  if (frog.row >= 8 && frog.row <= 12) {
    for (const car of cars) {
      if (fx < car.x + car.w && fx + fw > car.x && fy < car.y + CELL * 0.8 && fy + fh > car.y) {
        die(); return
      }
    }
  }

  // River check
  if (frog.row >= 2 && frog.row <= 6) {
    let onLog = false
    for (const log of logs) {
      if (log.y === rowY(frog.row) && fx < log.x + log.w && fx + fw > log.x) {
        onLog = true
        frog.logDx = log.speed
        break
      }
    }
    if (!onLog) { die(); return }
    frog.x += frog.logDx
    if (frog.x < -CELL || frog.x > W) { die(); return }
  } else {
    frog.logDx = 0
  }

  // Home row
  if (frog.row === 0) {
    const homeW = W / 5
    const slot = Math.floor((frog.x + CELL / 2) / homeW)
    if (slot >= 0 && slot < 5 && !homeFilled.value[slot]) {
      const h = [...homeFilled.value]
      h[slot] = true
      homeFilled.value = h
      score.value += 100
      sfxScore()
      resetFrog()
      if (h.every(Boolean)) { sfxWin(); state.value = 'won'; cancelAnimationFrame(raf) }
    } else {
      die()
    }
  }
}

function die() {
  lives.value--
  sfxDie()
  resetFrog()
  if (lives.value <= 0) { sfxLose(); state.value = 'over'; cancelAnimationFrame(raf) }
}

function draw(ts: number) {
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, W, H)

  // Draw zones
  // Home zone (row 0)
  ctx.fillStyle = '#064e3b'
  ctx.fillRect(0, rowY(0), W, CELL)

  // River (rows 2-6)
  ctx.fillStyle = '#0c1a4a'
  ctx.fillRect(0, rowY(2), W, CELL * 5)

  // Safe zones (rows 1, 7)
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, rowY(1), W, CELL)
  ctx.fillRect(0, rowY(7), W, CELL)

  // Road (rows 8-12)
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, rowY(8), W, CELL * 5)

  // Lane dashes
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 2
  ctx.setLineDash([20, 20])
  for (let r = 8; r <= 12; r++) {
    ctx.beginPath(); ctx.moveTo(0, rowY(r) + CELL / 2); ctx.lineTo(W, rowY(r) + CELL / 2); ctx.stroke()
  }
  ctx.setLineDash([])

  // Home slots
  const homeW = W / 5
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = homeFilled.value[i] ? '#00ff88' : 'rgba(0,255,136,0.3)'
    ctx.lineWidth = 2
    ctx.strokeRect(i * homeW + 4, rowY(0) + 4, homeW - 8, CELL - 8)
    if (homeFilled.value[i]) {
      ctx.fillStyle = 'rgba(0,255,136,0.3)'
      ctx.fillRect(i * homeW + 4, rowY(0) + 4, homeW - 8, CELL - 8)
      ctx.fillStyle = '#00ff88'
      ctx.font = "bold 18px monospace"
      ctx.textAlign = 'center'
      ctx.fillText('🐸', i * homeW + homeW / 2, rowY(0) + CELL * 0.7)
    }
  }

  // Update and draw cars
  for (const car of cars) {
    car.x += car.speed
    if (car.speed > 0 && car.x > W + car.w) car.x = -car.w
    if (car.speed < 0 && car.x < -car.w) car.x = W + car.w
    ctx.fillStyle = car.color
    ctx.shadowColor = car.color
    ctx.shadowBlur = 6
    ctx.fillRect(car.x, car.y + 6, car.w, CELL - 12)
    ctx.shadowBlur = 0
  }

  // Update and draw logs
  for (const log of logs) {
    log.x += log.speed
    if (log.speed > 0 && log.x > W + log.w) log.x = -log.w
    if (log.speed < 0 && log.x < -log.w) log.x = W + log.w
    ctx.fillStyle = '#92400e'
    ctx.shadowColor = '#b45309'
    ctx.shadowBlur = 4
    ctx.fillRect(log.x, log.y + 8, log.w, CELL - 16)
    ctx.shadowBlur = 0
    // Log grain
    ctx.strokeStyle = '#78350f'
    ctx.lineWidth = 1
    for (let i = 10; i < log.w; i += 15) {
      ctx.beginPath(); ctx.moveTo(log.x + i, log.y + 8); ctx.lineTo(log.x + i, log.y + CELL - 8); ctx.stroke()
    }
  }

  // Handle movement
  moveTimer++
  if (moveTimer >= 8) {
    moveTimer = 0
    if (keyPressed['ArrowUp'])    { moveFrog(-1, 0); keyPressed['ArrowUp'] = false }
    if (keyPressed['ArrowDown'])  { moveFrog(1, 0);  keyPressed['ArrowDown'] = false }
    if (keyPressed['ArrowLeft'])  { moveFrog(0, -1); keyPressed['ArrowLeft'] = false }
    if (keyPressed['ArrowRight']) { moveFrog(0, 1);  keyPressed['ArrowRight'] = false }
  }

  // Check collisions
  if (state.value === 'playing') checkCollisions()

  // Draw frog
  const fx = frog.x, fy = rowY(frog.row)
  ctx.fillStyle = '#00d4ff'
  ctx.shadowColor = '#00d4ff'
  ctx.shadowBlur = 12
  ctx.beginPath()
  ctx.ellipse(fx + CELL/2, fy + CELL/2, CELL/2 - 4, CELL/2 - 4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  // Eyes
  ctx.fillStyle = '#030712'
  ctx.beginPath(); ctx.arc(fx + CELL/2 - 6, fy + CELL/2 - 4, 4, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(fx + CELL/2 + 6, fy + CELL/2 - 4, 4, 0, Math.PI * 2); ctx.fill()

  // HUD
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.font = "bold 14px 'JetBrains Mono', monospace"
  ctx.textAlign = 'left'
  ctx.fillText(`Score: ${score.value}`, 8, 20)
  ctx.textAlign = 'right'
  ctx.fillText('♥'.repeat(lives.value), W - 8, 20)

  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.85)'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#00d4ff'
    ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 20
    ctx.font = "bold 28px 'Space Grotesk', sans-serif"
    ctx.textAlign = 'center'
    ctx.fillText('FROGGER', W/2, H/2 - 20)
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(200,220,255,0.5)'
    ctx.font = "12px 'JetBrains Mono', monospace"
    ctx.fillText('Click or press arrow keys to start', W/2, H/2 + 16)
  }

  if (state.value === 'playing') raf = requestAnimationFrame(draw)
}

function onKey(e: KeyboardEvent) {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
    e.preventDefault()
    if (state.value === 'idle') { startGame(); return }
    keyPressed[e.key] = true
  }
}

function onClick() {
  if (state.value === 'idle') startGame()
}

function restart() {
  startGame()
  raf = requestAnimationFrame(draw)
}

onMounted(() => {
  const canvas = canvasEl.value
  if (canvas) { canvas.width = W; canvas.height = H }
  canvas?.addEventListener('click', onClick)
  window.addEventListener('keydown', onKey)
  raf = requestAnimationFrame(draw)
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  canvasEl.value?.removeEventListener('click', onClick)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 select-none">
    <div class="glass-hud px-6 py-2 flex items-center gap-6">
      <div class="text-center">
        <p class="hud-label text-[10px]">SCORE</p>
        <p class="font-mono font-bold text-white text-lg">{{ score }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">LIVES</p>
        <p class="font-mono font-bold text-white text-lg">{{ lives }}</p>
      </div>
    </div>
    <div class="relative">
      <canvas ref="canvasEl" class="rounded-xl border border-white/10 block cursor-pointer" />
      <GameResultOverlay
        v-if="state === 'over' || state === 'won'"
        :state="state === 'won' ? 'won' : 'over'"
        :score="score"
        @restart="restart"
      />
    </div>
    <p class="font-mono text-xs text-slate-600">Arrow keys to move • Get all 5 frogs home safely</p>
  </div>
</template>
