<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const score    = ref(0)
const state    = ref<'idle' | 'playing' | 'over'>('idle')

const W = 480, H = 220
const PLAYER_X   = 80
const WALL_THICK = 22   // top and bottom wall thickness
const GRAVITY    = 0.32
const BASE_SPEED = 2.2

// Tunnel undulation via sine: gap centre oscillates vertically
// gapCentre(x) = H/2 + amplitude * sin(x / wavelength + phase)
let raf       = 0
let lastTs    = 0
let py        = 0    // player Y centre
let pvy       = 0   // vertical velocity
let gravDir   = 1   // +1 = fall down, -1 = fall up
let scrollX   = 0   // how far the world has scrolled (for score / sine phase)
let speed     = BASE_SPEED
let amplitude = 30   // sine wave amplitude of gap centre (grows over time)
let wavelength = 260  // sine wavelength

function gapCentre(worldX: number): number {
  return H / 2 + amplitude * Math.sin(worldX / wavelength)
}

const GAP_HALF = 45   // half-height of the navigable gap (wall edge to wall edge)

function wallTop(worldX: number): number {
  return gapCentre(worldX) - GAP_HALF
}
function wallBot(worldX: number): number {
  return gapCentre(worldX) + GAP_HALF
}

function reset() {
  py = H / 2
  pvy = 0
  gravDir = 1
  scrollX = 0
  speed = BASE_SPEED
  amplitude = 30
  wavelength = 260
  score.value = 0
}

function restart() {
  reset()
  state.value = 'playing'
}

function flipGravity() {
  if (state.value === 'over') { restart(); return }
  if (state.value === 'idle') { reset(); state.value = 'playing'; return }
  gravDir = -gravDir
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

  // Moving stars
  ctx.fillStyle = 'rgba(200,220,255,0.08)'
  for (let i = 0; i < 60; i++) {
    const sx = ((i * 79 + ts * 0.018) % W)
    const sy = (i * 127) % H
    ctx.fillRect(sx, sy, 1, 1)
  }

  if (state.value === 'playing') {
    // Physics
    pvy += GRAVITY * gravDir
    py  += pvy
    scrollX += speed
    score.value = Math.floor(scrollX / 80)

    // Difficulty ramp
    speed = Math.min(5.0, BASE_SPEED + scrollX * 0.0008)
    amplitude = Math.min(55, 30 + scrollX * 0.006)

    // Collision: player against top/bottom tunnel walls at player X
    const worldPlayerX = scrollX + PLAYER_X
    const wTop = wallTop(worldPlayerX)
    const wBot = wallBot(worldPlayerX)
    const pHalf = 7

    if (py - pHalf < wTop - WALL_THICK + WALL_THICK || py - pHalf < wTop) {
      state.value = 'over'
      return
    }
    if (py + pHalf > wBot) {
      state.value = 'over'
      return
    }
    // Hard screen edges
    if (py - pHalf < 0 || py + pHalf > H) {
      state.value = 'over'
      return
    }
  }

  // Draw tunnel walls (cyan gradient strips, per screen column)
  const STEP = 4  // sample every N pixels for performance
  for (let sx = 0; sx < W; sx += STEP) {
    const wx = scrollX + sx
    const cTop = wallTop(wx)
    const cBot = wallBot(wx)

    // Top wall fill (dark with cyan edge)
    ctx.fillStyle = 'rgba(0,30,50,0.95)'
    ctx.fillRect(sx, 0, STEP, cTop)
    // Bottom wall fill
    ctx.fillRect(sx, cBot, STEP, H - cBot)
  }

  // Glow edge lines for tunnel walls
  ctx.save()
  ctx.shadowColor = '#00d4ff'
  ctx.shadowBlur  = 12
  ctx.strokeStyle = '#00d4ff'
  ctx.lineWidth   = 2
  // Top edge
  ctx.beginPath()
  for (let sx = 0; sx <= W; sx += 2) {
    const wx  = scrollX + sx
    const cTop = wallTop(wx)
    if (sx === 0) ctx.moveTo(sx, cTop)
    else          ctx.lineTo(sx, cTop)
  }
  ctx.stroke()
  // Bottom edge
  ctx.beginPath()
  for (let sx = 0; sx <= W; sx += 2) {
    const wx  = scrollX + sx
    const cBot = wallBot(wx)
    if (sx === 0) ctx.moveTo(sx, cBot)
    else          ctx.lineTo(sx, cBot)
  }
  ctx.stroke()
  ctx.restore()

  // Draw player (neon-purple triangle)
  ctx.save()
  ctx.translate(PLAYER_X, py)
  // Flip triangle based on gravity direction
  ctx.scale(1, gravDir)
  ctx.shadowColor = '#a855f7'
  ctx.shadowBlur  = 22
  const grad = ctx.createLinearGradient(-8, -10, 8, 10)
  grad.addColorStop(0, '#e9d5ff')
  grad.addColorStop(0.5, '#a855f7')
  grad.addColorStop(1, '#5b21b6')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(0, -10)
  ctx.lineTo(9, 8)
  ctx.lineTo(-9, 8)
  ctx.closePath()
  ctx.fill()
  // Engine flare
  if (state.value === 'playing') {
    ctx.save()
    ctx.shadowColor = '#c084fc'
    ctx.shadowBlur  = 10
    ctx.fillStyle   = 'rgba(192,132,252,0.55)'
    ctx.beginPath()
    ctx.moveTo(-5, 8); ctx.lineTo(5, 8); ctx.lineTo(0, 14 + Math.random() * 5)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()

  // Gravity direction indicator (small arrow)
  if (state.value === 'playing') {
    ctx.save()
    ctx.fillStyle   = 'rgba(168,85,247,0.45)'
    ctx.font        = "11px 'Courier New', monospace"
    ctx.textAlign   = 'left'
    const arrow = gravDir === 1 ? '▼ GRAV' : '▲ FLIP'
    ctx.fillText(arrow, 8, H - 8)
    ctx.restore()
  }

  // Overlays
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.80)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.save()
    ctx.shadowColor = '#a855f7'
    ctx.shadowBlur  = 18
    ctx.fillStyle   = '#a855f7'
    ctx.font        = "bold 26px 'Space Grotesk', sans-serif"
    ctx.fillText('GRAVITY FLIP', W / 2, H / 2 - 28)
    ctx.restore()
    ctx.fillStyle = 'rgba(200,220,255,0.55)'
    ctx.font      = "13px 'Courier New', monospace"
    ctx.fillText('Press Space or tap to start', W / 2, H / 2 + 10)
  }
}

function onKey(e: KeyboardEvent) {
  if (e.code === 'Space' || e.key === 'ArrowUp') {
    e.preventDefault()
    flipGravity()
  }
}

function onTouch(e: TouchEvent) {
  e.preventDefault()
  flipGravity()
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
      <p class="hud-label text-[10px]">DISTANCE</p>
      <p class="font-mono font-bold text-white text-lg leading-tight">{{ score }}</p>
    </div>
    <div class="relative">
      <canvas
        ref="canvasEl"
        class="rounded-xl border border-white/10 block cursor-pointer"
        @click="flipGravity"
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
    <p class="font-mono text-xs text-slate-600">Space or tap to flip gravity • survive the tunnel</p>
  </div>
</template>
