<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const score    = ref(0)
const state    = ref<'idle' | 'playing' | 'over'>('idle')

const W = 480, H = 280
const SHIP_X = 100
const τ = Math.PI * 2

// Star layers
interface Star { x: number; y: number; r: number; speed: number; alpha: number }

let raf = 0
let shipY = H / 2
let shipVY = 0
let distance = 0
let gapY = H / 2      // center of the gap
let gapSize = 160     // current gap height (narrows over time)
let waveOffset = 0
let stars: Star[] = []

function buildStars(): Star[] {
  const out: Star[] = []
  // 3 parallax layers
  for (let i = 0; i < 30; i++) out.push({ x: Math.random() * W, y: Math.random() * H, r: 0.6, speed: 0.4, alpha: 0.3 })
  for (let i = 0; i < 20; i++) out.push({ x: Math.random() * W, y: Math.random() * H, r: 1.0, speed: 1.0, alpha: 0.5 })
  for (let i = 0; i < 10; i++) out.push({ x: Math.random() * W, y: Math.random() * H, r: 1.6, speed: 2.0, alpha: 0.8 })
  return out
}

function reset() {
  shipY = H / 2
  shipVY = 0
  distance = 0
  gapY = H / 2
  gapSize = 160
  waveOffset = 0
  score.value = 0
  stars = buildStars()
}

// Compute top-wall bottom edge and bottom-wall top edge at a given X
function wallEdges(x: number, offset: number): { topBot: number; botTop: number } {
  const wave = Math.sin((x * 0.015) + offset) * 38 + Math.sin((x * 0.008) + offset * 0.7) * 18
  const center = H / 2 + wave
  const half = gapSize / 2
  return { topBot: center - half, botTop: center + half }
}

const keys = { up: false, down: false }

function frame(ts: number) {
  raf = requestAnimationFrame(frame)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return

  // Background
  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, W, H)

  // Stars (parallax)
  for (const s of stars) {
    if (state.value === 'playing') {
      s.x -= s.speed
      if (s.x < 0) { s.x = W; s.y = Math.random() * H }
    }
    ctx.save()
    ctx.globalAlpha = s.alpha
    ctx.fillStyle = '#c8dcff'
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, τ)
    ctx.fill()
    ctx.restore()
  }

  if (state.value === 'playing') {
    // Physics
    const gravity = 0.18
    const thrust = -0.45
    if (keys.up)   shipVY += thrust
    if (keys.down) shipVY += -thrust
    shipVY += gravity
    shipVY *= 0.88  // damping
    shipY += shipVY
    shipY = Math.max(10, Math.min(H - 10, shipY))

    // Advance tunnel
    waveOffset += 0.022
    distance += 1
    score.value = Math.floor(distance / 6)

    // Slowly narrow the gap
    if (gapSize > 68) gapSize -= 0.012
  }

  // Draw tunnel walls
  const resolution = 4  // draw a slice every N pixels
  for (let x = 0; x <= W; x += resolution) {
    const { topBot, botTop } = wallEdges(x + (state.value === 'playing' ? distance : 0), waveOffset)

    // Top wall gradient color
    const t = Math.min(1, distance / 1200)
    const r = Math.round(0 + t * 168)
    const g = Math.round(212 + t * (85 - 212))
    const b = Math.round(255 + t * (247 - 255))
    const glowColor = `rgb(${r},${g},${b})`

    ctx.save()
    ctx.shadowColor = glowColor
    ctx.shadowBlur = 8
    ctx.fillStyle = glowColor
    // Top wall
    ctx.fillRect(x, 0, resolution + 1, topBot)
    // Bottom wall
    ctx.fillRect(x, botTop, resolution + 1, H - botTop)
    ctx.restore()
  }

  // Draw tunnel edge glow lines
  ctx.save()
  ctx.lineWidth = 2
  const edgeGrad = ctx.createLinearGradient(0, 0, W, 0)
  edgeGrad.addColorStop(0, 'rgba(0,212,255,0.9)')
  edgeGrad.addColorStop(1, 'rgba(168,85,247,0.9)')
  ctx.strokeStyle = edgeGrad
  ctx.shadowColor = '#00d4ff'
  ctx.shadowBlur = 14
  ctx.beginPath()
  for (let x = 0; x <= W; x += resolution) {
    const { topBot } = wallEdges(x + (state.value === 'playing' ? distance : 0), waveOffset)
    if (x === 0) ctx.moveTo(x, topBot); else ctx.lineTo(x, topBot)
  }
  ctx.stroke()
  ctx.beginPath()
  ctx.shadowColor = '#a855f7'
  for (let x = 0; x <= W; x += resolution) {
    const { botTop } = wallEdges(x + (state.value === 'playing' ? distance : 0), waveOffset)
    if (x === 0) ctx.moveTo(x, botTop); else ctx.lineTo(x, botTop)
  }
  ctx.stroke()
  ctx.restore()

  // Collision check
  if (state.value === 'playing') {
    const { topBot, botTop } = wallEdges(SHIP_X + distance, waveOffset)
    if (shipY - 8 < topBot || shipY + 8 > botTop) {
      state.value = 'over'
    }
  }

  // Draw ship (neon-purple glowing triangle pointing right)
  if (state.value !== 'idle') {
    ctx.save()
    ctx.translate(SHIP_X, shipY)
    ctx.shadowColor = '#a855f7'
    ctx.shadowBlur = 20
    ctx.fillStyle = '#a855f7'
    ctx.beginPath()
    ctx.moveTo(14, 0)
    ctx.lineTo(-10, -9)
    ctx.lineTo(-6, 0)
    ctx.lineTo(-10, 9)
    ctx.closePath()
    ctx.fill()
    // Inner highlight
    ctx.shadowBlur = 4
    ctx.fillStyle = '#d8b4fe'
    ctx.beginPath()
    ctx.moveTo(8, 0)
    ctx.lineTo(-4, -4)
    ctx.lineTo(-4, 4)
    ctx.closePath()
    ctx.fill()
    // Engine exhaust
    if (state.value === 'playing') {
      const ex = Math.random() * 8 + 4
      ctx.shadowColor = '#00d4ff'
      ctx.shadowBlur = 10
      ctx.fillStyle = `rgba(0,212,255,${0.5 + Math.random() * 0.5})`
      ctx.beginPath()
      ctx.moveTo(-6, -3)
      ctx.lineTo(-6 - ex, 0)
      ctx.lineTo(-6, 3)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }

  // Overlays
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.80)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#00d4ff'
    ctx.font = "bold 26px 'Space Grotesk', sans-serif"
    ctx.fillText('WARP TUNNEL', W / 2, H / 2 - 28)
    ctx.fillStyle = 'rgba(200,220,255,0.55)'
    ctx.font = "13px 'Courier New', monospace"
    ctx.fillText('Press ↑ ↓ to start', W / 2, H / 2 + 10)
  }
}

function restart() {
  reset()
  state.value = 'playing'
}

function onKey(e: KeyboardEvent) {
  const down = e.type === 'keydown'
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    e.preventDefault()
    if (state.value !== 'playing' && down) { reset(); state.value = 'playing'; return }
    keys.up = down
  }
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    e.preventDefault()
    if (state.value !== 'playing' && down) { reset(); state.value = 'playing'; return }
    keys.down = down
  }
}

function onTouch(e: TouchEvent) {
  e.preventDefault()
  const touch = e.touches[0] ?? e.changedTouches[0]
  if (!touch) return
  const rect = canvasEl.value?.getBoundingClientRect()
  if (!rect) return
  const relY = touch.clientY - rect.top
  const midY = rect.height / 2
  if (e.type === 'touchstart') {
    if (state.value !== 'playing') { reset(); state.value = 'playing'; return }
    if (relY < midY) { keys.up = true; keys.down = false }
    else { keys.down = true; keys.up = false }
  } else {
    keys.up = false; keys.down = false
  }
}

onMounted(() => {
  if (canvasEl.value) { canvasEl.value.width = W; canvasEl.value.height = H }
  stars = buildStars()
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKey)
  canvasEl.value?.addEventListener('touchstart', onTouch, { passive: false })
  canvasEl.value?.addEventListener('touchend', onTouch, { passive: false })
  raf = requestAnimationFrame(frame)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('keyup', onKey)
  canvasEl.value?.removeEventListener('touchstart', onTouch)
  canvasEl.value?.removeEventListener('touchend', onTouch)
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 select-none">
    <div class="glass-hud px-6 py-2 text-center">
      <p class="hud-label text-[10px]">DISTANCE</p>
      <p class="font-mono font-bold text-white text-lg leading-tight">{{ score }}</p>
    </div>
    <div class="relative">
      <canvas ref="canvasEl" class="rounded-xl border border-white/10 block" />
      <div v-if="state === 'over'" class="absolute inset-0 rounded-xl flex items-center justify-center" style="background: rgba(3,7,18,0.88)">
        <div class="flex flex-col items-center gap-4 border border-white/10 bg-white/[0.04] rounded-2xl px-10 py-8">
          <p class="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-500">TUNNEL COLLAPSED</p>
          <p class="font-display font-bold text-4xl text-white">{{ score }}</p>
          <p class="hud-label text-[10px]">DISTANCE</p>
          <button
            class="mt-2 px-10 py-2.5 font-mono text-xs tracking-widest uppercase rounded-lg border border-neon-blue/30 bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20 hover:border-neon-blue/50 transition-all cursor-pointer"
            @click.stop="restart"
          >↺ RESTART</button>
        </div>
      </div>
    </div>
    <p class="font-mono text-xs text-slate-600">↑ ↓ to navigate • survive the wormhole</p>
  </div>
</template>
