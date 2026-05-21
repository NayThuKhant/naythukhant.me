<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const score    = ref(0)
const state    = ref<'idle' | 'playing' | 'over'>('idle')

const W = 320, H = 520
const ROCKET_X = 72
const PIPE_W = 58, GAP = 145
const GRAVITY = 0.45, BOOST = -9.5
const τ = Math.PI * 2

interface Pipe { x: number; gapY: number; passed: boolean }

let raf = 0, lastTs = 0
let ry = 0, rvy = 0
let pipes: Pipe[] = []
let pipeTimer = 0
let pipeSpeed = 2.4

function reset() {
  ry = H / 2; rvy = 0
  pipes = []; pipeTimer = 0
  score.value = 0; pipeSpeed = 2.4
}

function boost() {
  if (state.value === 'idle' || state.value === 'over') {
    reset(); state.value = 'playing'; return
  }
  rvy = BOOST
}

function frame(ts: number) {
  raf = requestAnimationFrame(frame)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return
  const dt = Math.min(ts - lastTs, 50)
  lastTs = ts

  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, W, H)

  // Star dots
  ctx.fillStyle = 'rgba(200,220,255,0.12)'
  for (let i = 0; i < 40; i++) {
    const sx = ((i * 73 + ts * 0.02) % W)
    const sy = (i * 137) % H
    ctx.fillRect(sx, sy, 1, 1)
  }

  if (state.value === 'playing') {
    rvy += GRAVITY
    ry  += rvy
    pipeTimer += dt

    if (pipeTimer > 1700) {
      pipeTimer = 0
      const gapY = 100 + Math.random() * (H - 220 - GAP)
      pipes.push({ x: W + 10, gapY, passed: false })
    }
    for (const p of pipes) p.x -= pipeSpeed
    for (const p of pipes) {
      if (!p.passed && p.x + PIPE_W < ROCKET_X) {
        p.passed = true; score.value++
        pipeSpeed = Math.min(4.2, pipeSpeed + 0.06)
      }
    }
    pipes = pipes.filter(p => p.x > -PIPE_W - 20)

    // Collision
    if (ry - 10 < 0 || ry + 10 > H) { state.value = 'over'; return }
    for (const p of pipes) {
      if (ROCKET_X + 10 > p.x && ROCKET_X - 10 < p.x + PIPE_W) {
        if (ry - 10 < p.gapY || ry + 10 > p.gapY + GAP) { state.value = 'over'; return }
      }
    }
  }

  // Draw pipes
  for (const p of pipes) {
    ctx.save()
    ctx.shadowColor = 'rgba(168,85,247,0.6)'; ctx.shadowBlur = 10
    ctx.fillStyle   = 'rgba(90,30,140,0.85)'
    ctx.strokeStyle = 'rgba(168,85,247,0.8)'; ctx.lineWidth = 1.5
    // Top
    ctx.fillRect(p.x, 0, PIPE_W, p.gapY)
    ctx.strokeRect(p.x, 0, PIPE_W, p.gapY)
    ctx.fillRect(p.x - 5, p.gapY - 18, PIPE_W + 10, 18)
    ctx.strokeRect(p.x - 5, p.gapY - 18, PIPE_W + 10, 18)
    // Bottom
    const bTop = p.gapY + GAP
    ctx.fillRect(p.x, bTop, PIPE_W, H - bTop)
    ctx.strokeRect(p.x, bTop, PIPE_W, H - bTop)
    ctx.fillRect(p.x - 5, bTop, PIPE_W + 10, 18)
    ctx.strokeRect(p.x - 5, bTop, PIPE_W + 10, 18)
    ctx.restore()
  }

  // Draw rocket
  ctx.save()
  ctx.translate(ROCKET_X, ry)
  const tilt = Math.max(-Math.PI / 5, Math.min(Math.PI / 2.5, rvy * 0.055))
  ctx.rotate(tilt)

  // Flame
  if (state.value === 'playing') {
    ctx.save()
    ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 18
    const flameH = 10 + Math.random() * 8
    const grad = ctx.createLinearGradient(0, 14, 0, 14 + flameH)
    grad.addColorStop(0, 'rgba(255,200,50,0.9)')
    grad.addColorStop(1, 'rgba(255,60,10,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(-5, 14); ctx.lineTo(5, 14); ctx.lineTo(0, 14 + flameH)
    ctx.closePath(); ctx.fill()
    ctx.restore()
  }

  // Body
  ctx.save()
  ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 16
  const bodyGrad = ctx.createLinearGradient(-10, -16, 10, 14)
  bodyGrad.addColorStop(0, '#e0f7ff')
  bodyGrad.addColorStop(0.5, '#00d4ff')
  bodyGrad.addColorStop(1, '#0066aa')
  ctx.fillStyle = bodyGrad
  ctx.beginPath()
  ctx.moveTo(0, -16); ctx.lineTo(10, 14); ctx.lineTo(-10, 14); ctx.closePath()
  ctx.fill()
  ctx.restore()

  // Cockpit window
  ctx.fillStyle = '#fffde0'
  ctx.beginPath(); ctx.ellipse(0, -1, 4, 5.5, 0, 0, τ); ctx.fill()

  ctx.restore()

  // Score
  ctx.fillStyle = 'rgba(200,230,255,0.75)'
  ctx.font = "bold 22px 'Courier New', monospace"
  ctx.textAlign = 'center'
  ctx.fillText(score.value.toString(), W / 2, 36)

  // Overlays
  if (state.value !== 'playing') {
    ctx.fillStyle = 'rgba(3,7,18,0.78)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    if (state.value === 'idle') {
      ctx.fillStyle = '#00d4ff'
      ctx.font = "bold 24px 'Space Grotesk', sans-serif"
      ctx.fillText('FLAPPY ROCKET', W / 2, H / 2 - 30)
      ctx.fillStyle = 'rgba(200,220,255,0.55)'
      ctx.font = "12px 'Courier New', monospace"
      ctx.fillText('Click or SPACE to boost', W / 2, H / 2 + 12)
    } else {
      ctx.fillStyle = '#f472b6'
      ctx.font = "bold 24px 'Space Grotesk', sans-serif"
      ctx.fillText('CRASHED!', W / 2, H / 2 - 40)
      ctx.fillStyle = 'rgba(200,220,255,0.80)'
      ctx.font = "15px 'Courier New', monospace"
      ctx.fillText(`Score: ${score.value}`, W / 2, H / 2 + 2)
      ctx.fillStyle = 'rgba(200,220,255,0.45)'
      ctx.font = "12px 'Courier New', monospace"
      ctx.fillText('Click or SPACE to retry', W / 2, H / 2 + 40)
    }
  }
}

function onKey(e: KeyboardEvent) {
  if (e.code === 'Space') { e.preventDefault(); boost() }
}

onMounted(() => {
  if (canvasEl.value) { canvasEl.value.width = W; canvasEl.value.height = H }
  window.addEventListener('keydown', onKey)
  raf = requestAnimationFrame(frame)
})
onUnmounted(() => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey) })
</script>

<template>
  <div class="flex flex-col items-center gap-3 select-none">
    <canvas
      ref="canvasEl"
      class="rounded-xl border border-white/10 block cursor-pointer"
      @click="boost"
    />
    <p class="font-mono text-xs text-slate-600">Click or SPACE to boost • dodge the asteroid rings</p>
  </div>
</template>
