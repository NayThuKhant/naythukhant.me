<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const score    = ref(0)
const state    = ref<'idle' | 'playing' | 'over'>('idle')

const W = 400, H = 220
const PLAYER_X = 60
const BAR_W    = 14
const GAP_H    = 72
const GRAVITY  = 0.38
const JUMP_VY  = -8.5
const BASE_SPEED = 2.6

interface Bar { x: number; gapY: number; passed: boolean }

let raf = 0
let lastTs = 0
let py    = 0    // player Y (centre)
let pvy   = 0   // player vertical velocity
let bars: Bar[] = []
let barTimer    = 0
let speed       = BASE_SPEED

function reset() {
  py = H / 2
  pvy = 0
  bars = []
  barTimer = 0
  score.value = 0
  speed = BASE_SPEED
}

function restart() {
  reset()
  state.value = 'playing'
}

function jump() {
  if (state.value === 'over') { restart(); return }
  if (state.value === 'idle') { reset(); state.value = 'playing'; return }
  pvy = JUMP_VY
}

function frame(ts: number) {
  raf = requestAnimationFrame(frame)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return
  const dt = Math.min(ts - lastTs, 50)
  lastTs = ts

  // Background
  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, W, H)

  // Moving star dots
  ctx.fillStyle = 'rgba(200,220,255,0.10)'
  for (let i = 0; i < 50; i++) {
    const sx = ((i * 83 + ts * 0.025) % W)
    const sy = (i * 113) % H
    ctx.fillRect(sx, sy, 1, 1)
  }

  // Ground / ceiling subtle lines
  ctx.save()
  ctx.strokeStyle = 'rgba(0,212,255,0.15)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(W, H); ctx.stroke()
  ctx.restore()

  if (state.value === 'playing') {
    // Physics
    pvy += GRAVITY
    py  += pvy
    barTimer += dt

    // Spawn bars
    if (barTimer > 1500) {
      barTimer = 0
      const margin = 20
      const gapY = margin + Math.random() * (H - margin * 2 - GAP_H)
      bars.push({ x: W + 10, gapY, passed: false })
    }

    // Move bars
    for (const b of bars) b.x -= speed

    // Score + speed up
    for (const b of bars) {
      if (!b.passed && b.x + BAR_W < PLAYER_X) {
        b.passed = true
        score.value++
        speed = Math.min(6.5, speed + 0.08)
      }
    }

    bars = bars.filter(b => b.x > -BAR_W - 20)

    // Collision: floor / ceiling (player half-height = 8)
    if (py - 8 < 0 || py + 8 > H) {
      state.value = 'over'
      return
    }

    // Collision: bars
    for (const b of bars) {
      if (PLAYER_X + 10 > b.x && PLAYER_X - 10 < b.x + BAR_W) {
        if (py - 8 < b.gapY || py + 8 > b.gapY + GAP_H) {
          state.value = 'over'
          return
        }
      }
    }
  }

  // Draw bars (neon-pink)
  for (const b of bars) {
    ctx.save()
    ctx.shadowColor = '#f472b6'
    ctx.shadowBlur  = 14
    ctx.fillStyle   = 'rgba(180,50,100,0.85)'
    ctx.strokeStyle = '#f472b6'
    ctx.lineWidth   = 1.5
    // Top section
    ctx.fillRect(b.x, 0, BAR_W, b.gapY)
    ctx.strokeRect(b.x, 0, BAR_W, b.gapY)
    // Bottom section
    const bTop = b.gapY + GAP_H
    ctx.fillRect(b.x, bTop, BAR_W, H - bTop)
    ctx.strokeRect(b.x, bTop, BAR_W, H - bTop)
    // Gap highlight edges
    ctx.shadowBlur = 8
    ctx.strokeStyle = 'rgba(255,180,220,0.6)'
    ctx.lineWidth   = 1
    ctx.beginPath()
    ctx.moveTo(b.x, b.gapY); ctx.lineTo(b.x + BAR_W, b.gapY)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(b.x, bTop); ctx.lineTo(b.x + BAR_W, bTop)
    ctx.stroke()
    ctx.restore()
  }

  // Draw player ship (neon-blue glowing rect/ship)
  ctx.save()
  ctx.translate(PLAYER_X, py)
  const tilt = Math.max(-0.4, Math.min(0.4, pvy * 0.04))
  ctx.rotate(tilt)
  ctx.shadowColor = '#00d4ff'
  ctx.shadowBlur  = 20
  // Body
  const bodyGrad = ctx.createLinearGradient(-10, -8, 10, 8)
  bodyGrad.addColorStop(0, '#e0f7ff')
  bodyGrad.addColorStop(0.5, '#00d4ff')
  bodyGrad.addColorStop(1, '#005580')
  ctx.fillStyle = bodyGrad
  ctx.beginPath()
  ctx.moveTo(12, 0)
  ctx.lineTo(-8, -8)
  ctx.lineTo(-4, 0)
  ctx.lineTo(-8, 8)
  ctx.closePath()
  ctx.fill()
  // Engine glow
  if (state.value === 'playing') {
    ctx.save()
    ctx.shadowColor = '#00ffff'
    ctx.shadowBlur  = 12
    ctx.fillStyle   = 'rgba(0,220,255,0.7)'
    ctx.beginPath()
    ctx.moveTo(-8, -4); ctx.lineTo(-14 - Math.random() * 4, 0); ctx.lineTo(-8, 4)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()

  // Overlays
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.80)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.save()
    ctx.shadowColor = '#00d4ff'
    ctx.shadowBlur  = 18
    ctx.fillStyle   = '#00d4ff'
    ctx.font        = "bold 26px 'Space Grotesk', sans-serif"
    ctx.fillText('NEON RUNNER', W / 2, H / 2 - 28)
    ctx.restore()
    ctx.fillStyle = 'rgba(200,220,255,0.55)'
    ctx.font      = "13px 'Courier New', monospace"
    ctx.fillText('Press Space or tap to start', W / 2, H / 2 + 10)
  }
}

function onKey(e: KeyboardEvent) {
  if (e.code === 'Space' || e.key === 'ArrowUp') {
    e.preventDefault()
    jump()
  }
}

function onTouch(e: TouchEvent) {
  e.preventDefault()
  jump()
}

onMounted(() => {
  if (canvasEl.value) { canvasEl.value.width = W; canvasEl.value.height = H }
  window.addEventListener('keydown', onKey)
  canvasEl.value?.addEventListener('touchstart', onTouch, { passive: false })
  raf = requestAnimationFrame(frame)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
  canvasEl.value?.removeEventListener('touchstart', onTouch)
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 select-none">
    <div class="glass-hud px-6 py-2 text-center">
      <p class="hud-label text-[10px]">SCORE</p>
      <p class="font-mono font-bold text-white text-lg leading-tight">{{ score }}</p>
    </div>
    <div class="relative">
      <canvas
        ref="canvasEl"
        class="rounded-xl border border-white/10 block cursor-pointer"
        @click="jump"
      />
      <div
        v-if="state === 'over'"
        class="absolute inset-0 rounded-xl flex items-center justify-center"
        style="background: rgba(3,7,18,0.88)"
      >
        <div class="flex flex-col items-center gap-4 border border-white/10 bg-white/[0.04] rounded-2xl px-10 py-8">
          <p class="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-500">GAME OVER</p>
          <p class="font-display font-bold text-4xl text-white">{{ score }}</p>
          <p class="hud-label text-[10px]">SCORE</p>
          <button class="mt-2 px-10 py-2.5 font-mono text-xs tracking-widest uppercase rounded-lg border border-neon-blue/30 bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20 hover:border-neon-blue/50 transition-all cursor-pointer" @click.stop="restart">↺ RESTART</button>
        </div>
      </div>
    </div>
    <p class="font-mono text-xs text-slate-600">Space or tap to jump • dodge the barriers</p>
  </div>
</template>
