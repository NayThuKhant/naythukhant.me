<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const state = ref<'idle' | 'playing' | 'over'>('idle')
const playerScore = ref(0)
const cpuScore = ref(0)
const winner = ref<'player' | 'cpu' | null>(null)

const W = 440, H = 280
const WIN_SCORE = 7
const PAD_W = 10, PAD_H = 64, PAD_M = 16

let raf = 0
let bx = W / 2, by = H / 2, bvx = 0, bvy = 0, bspd = 4
let py = H / 2 - PAD_H / 2
let cy = H / 2 - PAD_H / 2
const keys = new Set<string>()

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
  if (who === 'player') playerScore.value++
  else cpuScore.value++
  const target = who === 'player' ? playerScore.value : cpuScore.value
  if (target >= WIN_SCORE) { state.value = 'over'; winner.value = who } else launch()
}

function frame() {
  raf = requestAnimationFrame(frame)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return

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

    // Player paddle
    if (bx - 5 <= PAD_M + PAD_W && bx >= PAD_M && by >= py && by <= py + PAD_H) {
      bvx = Math.abs(bvx)
      bvy += ((by - (py + PAD_H / 2)) / (PAD_H / 2)) * 3.5
      bspd = Math.min(11, bspd + 0.35)
      normalize()
    }
    // CPU paddle
    if (bx + 5 >= W - PAD_M - PAD_W && bx <= W - PAD_M && by >= cy && by <= cy + PAD_H) {
      bvx = -Math.abs(bvx)
      bvy += ((by - (cy + PAD_H / 2)) / (PAD_H / 2)) * 3.5
      bspd = Math.min(11, bspd + 0.35)
      normalize()
    }

    if (bx < 0)  onScore('cpu')
    if (bx > W)  onScore('player')
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

  // Scores
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(0,212,255,0.7)'
  ctx.font = "bold 34px 'Courier New', monospace"
  ctx.fillText(String(playerScore.value), W / 4, 46)
  ctx.fillStyle = 'rgba(244,114,182,0.7)'
  ctx.fillText(String(cpuScore.value), (W * 3) / 4, 46)
  ctx.font = "9px 'Courier New', monospace"
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.fillText('YOU', W / 4, 58)
  ctx.fillText('CPU', (W * 3) / 4, 58)

  if (state.value !== 'playing') {
    ctx.fillStyle = 'rgba(3,7,18,0.82)'; ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    if (state.value === 'idle') {
      ctx.fillStyle = '#00d4ff'
      ctx.font = "bold 24px 'Space Grotesk', sans-serif"
      ctx.fillText('COSMIC PONG', W / 2, H / 2 - 24)
      ctx.fillStyle = 'rgba(200,220,255,0.5)'
      ctx.font = "11px 'Courier New', monospace"
      ctx.fillText('↑ ↓ to start & move', W / 2, H / 2 + 12)
    } else {
      const won = winner.value === 'player'
      ctx.fillStyle = won ? '#00d4ff' : '#f472b6'
      ctx.font = "bold 24px 'Space Grotesk', sans-serif"
      ctx.fillText(won ? 'YOU WIN!' : 'CPU WINS', W / 2, H / 2 - 28)
      ctx.fillStyle = 'rgba(200,220,255,0.5)'
      ctx.font = "11px 'Courier New', monospace"
      ctx.fillText('↑ ↓ to play again', W / 2, H / 2 + 12)
    }
  }
}

function startGame() {
  playerScore.value = 0; cpuScore.value = 0; winner.value = null
  py = H / 2 - PAD_H / 2; cy = H / 2 - PAD_H / 2
  launch(); state.value = 'playing'
}

function onKey(e: KeyboardEvent) {
  if (!['ArrowUp', 'ArrowDown'].includes(e.key)) return
  e.preventDefault()
  keys.add(e.key)
  if (state.value !== 'playing') startGame()
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
    <canvas ref="canvasEl" class="rounded-xl border border-white/10 block" />
    <p class="font-mono text-xs text-slate-600">↑ ↓ to move · first to {{ WIN_SCORE }} wins</p>
  </div>
</template>
