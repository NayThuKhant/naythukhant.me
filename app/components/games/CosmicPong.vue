<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const state = ref<'idle' | 'playing' | 'over'>('idle')
const playerScore = ref(0)
const cpuScore = ref(0)
const winner = ref<'player' | 'cpu' | null>(null)

const W = 440, H = 280
const WIN_SCORE = 7
const PAD_W = 10, PAD_H = 64, PAD_M = 16
const τ = Math.PI * 2

interface Particle { x: number; y: number; vx: number; vy: number; age: number; maxAge: number; r: number; color: string }
interface ScorePopup { x: number; y: number; vy: number; age: number; maxAge: number; text: string }

let raf = 0
let bx = W / 2, by = H / 2, bvx = 0, bvy = 0, bspd = 4
let py = H / 2 - PAD_H / 2
let cy = H / 2 - PAD_H / 2
const keys = new Set<string>()
let particles: Particle[] = []
let scorePopups: ScorePopup[] = []
let titlePulse = 0

function spawnParticles(x: number, y: number, color: string) {
  for (let i = 0; i < 8; i++) {
    const angle = (τ / 8) * i + Math.random() * 0.3
    const speed = 2 + Math.random() * 3
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, maxAge: 20, r: 2 + Math.random() * 2, color })
  }
}

function launch() {
  bx = W / 2; by = H / 2
  const ang = (Math.random() * 0.8 - 0.4) + (Math.random() < 0.5 ? 0 : Math.PI)
  bspd = 4
  bvx = Math.cos(ang) * bspd
  bvy = Math.sin(ang) * bspd
}

function normalize() {
  const mag = Math.sqrt(bvx * bvx + bvy * bvy)
  bvx = (bvx / mag) * bspd
  bvy = (bvy / mag) * bspd
}

function onScore(who: 'player' | 'cpu') {
  // Burst at ball position
  spawnParticles(bx, by, who === 'player' ? '#00d4ff' : '#f472b6')
  scorePopups.push({ x: who === 'player' ? W * 0.75 : W * 0.25, y: H / 2 - 20, vy: -0.8, age: 0, maxAge: 45, text: '+1' })

  if (who === 'player') playerScore.value++
  else cpuScore.value++
  const target = who === 'player' ? playerScore.value : cpuScore.value
  if (target >= WIN_SCORE) { state.value = 'over'; winner.value = who } else launch()
}

function frame(ts: number) {
  raf = requestAnimationFrame(frame)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return
  titlePulse = ts

  ctx.fillStyle = '#030712'; ctx.fillRect(0, 0, W, H)

  ctx.save()
  ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke()
  ctx.restore()

  if (state.value === 'playing') {
    const pspd = 5
    if (keys.has('ArrowUp'))   py = Math.max(0, py - pspd)
    if (keys.has('ArrowDown')) py = Math.min(H - PAD_H, py + pspd)

    const cc = cy + PAD_H / 2
    const cspd = 3.5 + playerScore.value * 0.06
    if (cc < by - 8) cy = Math.min(H - PAD_H, cy + cspd)
    else if (cc > by + 8) cy = Math.max(0, cy - cspd)

    bx += bvx; by += bvy

    if (by <= 5)       { by = 5;       bvy =  Math.abs(bvy) }
    if (by >= H - 5)   { by = H - 5;   bvy = -Math.abs(bvy) }

    // Player paddle — hit flash particles
    if (bx - 5 <= PAD_M + PAD_W && bx >= PAD_M && by >= py && by <= py + PAD_H) {
      bvx = Math.abs(bvx)
      bvy += ((by - (py + PAD_H / 2)) / (PAD_H / 2)) * 3.5
      bspd = Math.min(11, bspd + 0.35)
      normalize()
      spawnParticles(PAD_M + PAD_W, by, '#00d4ff')
    }
    // CPU paddle
    if (bx + 5 >= W - PAD_M - PAD_W && bx <= W - PAD_M && by >= cy && by <= cy + PAD_H) {
      bvx = -Math.abs(bvx)
      bvy += ((by - (cy + PAD_H / 2)) / (PAD_H / 2)) * 3.5
      bspd = Math.min(11, bspd + 0.35)
      normalize()
      spawnParticles(W - PAD_M - PAD_W, by, '#f472b6')
    }

    if (bx < 0)  onScore('cpu')
    if (bx > W)  onScore('player')

    // Update particles
    for (const p of particles) { p.x += p.vx; p.y += p.vy; p.age++ }
    particles = particles.filter(p => p.age < p.maxAge)
    for (const sp of scorePopups) { sp.y += sp.vy; sp.age++ }
    scorePopups = scorePopups.filter(sp => sp.age < sp.maxAge)
  }

  // Paddles
  ctx.save()
  ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 14; ctx.fillStyle = '#00d4ff'
  ctx.beginPath(); ctx.roundRect(PAD_M, py, PAD_W, PAD_H, 4); ctx.fill()
  ctx.restore()
  ctx.save()
  ctx.shadowColor = '#f472b6'; ctx.shadowBlur = 14; ctx.fillStyle = '#f472b6'
  ctx.beginPath(); ctx.roundRect(W - PAD_M - PAD_W, cy, PAD_W, PAD_H, 4); ctx.fill()
  ctx.restore()

  // Ball
  ctx.save()
  ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 22; ctx.fillStyle = '#ffd700'
  ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2); ctx.fill()
  ctx.restore()

  // Draw particles
  for (const p of particles) {
    const t = 1 - p.age / p.maxAge
    ctx.save()
    ctx.globalAlpha = t
    ctx.shadowColor = p.color; ctx.shadowBlur = 5
    ctx.fillStyle = p.color
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * t, 0, τ); ctx.fill()
    ctx.restore()
  }

  // Draw score popups
  ctx.save()
  ctx.font = "bold 12px 'Courier New', monospace"
  ctx.textAlign = 'center'
  for (const sp of scorePopups) {
    const t = 1 - sp.age / sp.maxAge
    ctx.globalAlpha = t
    ctx.fillStyle = '#ffe082'
    ctx.shadowColor = '#ffe082'; ctx.shadowBlur = 6
    ctx.fillText(sp.text, sp.x, sp.y)
  }
  ctx.restore()


  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.82)'; ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    const pulse = 0.5 + 0.5 * Math.sin(titlePulse * 0.003)
    ctx.shadowColor = '#00d4ff'
    ctx.shadowBlur = 8 + pulse * 18
    ctx.fillStyle = '#00d4ff'
    ctx.font = "bold 24px 'Space Grotesk', sans-serif"
    ctx.fillText('COSMIC PONG', W / 2, H / 2 - 24)
    ctx.shadowBlur = 0
    // Animated ball between two pads
    const ballX = W / 2 + Math.sin(titlePulse * 0.002) * 60
    const ballY = H / 2 + 8 + Math.cos(titlePulse * 0.003) * 12
    ctx.save()
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10 + pulse * 12
    ctx.fillStyle = '#ffd700'
    ctx.beginPath(); ctx.arc(ballX, ballY, 5, 0, τ); ctx.fill()
    ctx.restore()
    // Mini paddles
    ctx.save()
    ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 6; ctx.fillStyle = '#00d4ff'
    ctx.beginPath(); ctx.roundRect(W / 2 - 90, H / 2 - 12 + Math.sin(titlePulse * 0.002) * 8, 6, 24, 2); ctx.fill()
    ctx.shadowColor = '#f472b6'; ctx.fillStyle = '#f472b6'
    ctx.beginPath(); ctx.roundRect(W / 2 + 84, H / 2 - 12 - Math.sin(titlePulse * 0.002) * 8, 6, 24, 2); ctx.fill()
    ctx.restore()
    ctx.fillStyle = 'rgba(200,220,255,0.5)'
    ctx.font = "11px 'Courier New', monospace"
    ctx.fillText('↑ ↓ to start & move', W / 2, H / 2 + 40)
  }
}

function startGame() {
  playerScore.value = 0; cpuScore.value = 0; winner.value = null
  py = H / 2 - PAD_H / 2; cy = H / 2 - PAD_H / 2
  particles = []; scorePopups = []
  launch(); state.value = 'playing'
}

function restart() {
  startGame()
}

function onKey(e: KeyboardEvent) {
  if (!['ArrowUp', 'ArrowDown'].includes(e.key)) return
  e.preventDefault()
  keys.add(e.key)
  if (state.value === 'idle') startGame()
}
function onKeyUp(e: KeyboardEvent) { keys.delete(e.key) }

onMounted(() => {
  if (canvasEl.value) { canvasEl.value.width = W; canvasEl.value.height = H }
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup',   onKeyUp)
  raf = requestAnimationFrame(frame)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('keyup',   onKeyUp)
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 select-none">

    <div class="glass-hud px-6 py-2 flex gap-6 items-center">
      <div class="text-center">
        <p class="hud-label text-[10px]">YOU</p>
        <p class="font-mono font-bold text-neon-blue text-lg leading-tight">{{ playerScore }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">FIRST TO</p>
        <p class="font-mono font-bold text-slate-500 text-lg leading-tight">{{ WIN_SCORE }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">CPU</p>
        <p class="font-mono font-bold text-neon-pink text-lg leading-tight">{{ cpuScore }}</p>
      </div>
    </div>

    <div class="relative">
      <canvas ref="canvasEl" class="rounded-xl border border-white/10 block" />

      <GameResultOverlay :state="state === 'over' && winner === 'player' ? 'won' : state" :score="playerScore" :extra="winner === 'player' ? 'You Win!' : 'CPU Wins'" @restart="restart" />
    </div>
    <p class="font-mono text-xs text-slate-600">↑ ↓ to move · first to {{ WIN_SCORE }} wins</p>
  </div>
</template>
