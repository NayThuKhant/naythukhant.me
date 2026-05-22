<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const score    = ref(0)
const lives    = ref(3)
const state    = ref<'idle' | 'playing' | 'over'>('idle')

const W = 380, H = 540
const SHIP_Y = H - 70
const SHIP_W = 22, SHIP_H = 30
const τ = Math.PI * 2

interface Asteroid { x: number; y: number; r: number; vx: number; vy: number; rot: number; rotV: number; sides: number }

let raf = 0
let shipX = W / 2
let asteroids: Asteroid[] = []
let spawnTimer = 0
let invincible = 0
let elapsed = 0
let lastTs = 0
const keys = { left: false, right: false }

function spawnInterval() { return Math.max(600, 1800 - elapsed * 0.3) }
function asteroidSpeed()  { return 1.5 + elapsed * 0.0008 }

function spawnAsteroid() {
  const r = 12 + Math.random() * 22
  const x = r + Math.random() * (W - r * 2)
  const speed = asteroidSpeed() * (0.7 + Math.random() * 0.6)
  asteroids.push({
    x, y: -r - 10, r,
    vx: (Math.random() - 0.5) * 1.2,
    vy: speed,
    rot: 0, rotV: (Math.random() - 0.5) * 0.04,
    sides: 6 + Math.floor(Math.random() * 4),
  })
}

function reset() {
  shipX = W / 2; asteroids = []
  spawnTimer = 0; elapsed = 0; invincible = 0
  score.value = 0; lives.value = 3
}

function startGame() { reset(); state.value = 'playing' }

function restart() {
  reset()
  state.value = 'playing'
}

function drawAsteroid(ctx: CanvasRenderingContext2D, a: Asteroid, alpha: number) {
  ctx.save()
  ctx.translate(a.x, a.y); ctx.rotate(a.rot)
  ctx.globalAlpha = alpha
  ctx.shadowColor = 'rgba(175,158,138,0.6)'; ctx.shadowBlur = 8
  ctx.strokeStyle = 'rgba(175,158,138,0.85)'; ctx.lineWidth = 1.5
  ctx.fillStyle   = 'rgba(80,70,60,0.7)'
  ctx.beginPath()
  for (let i = 0; i < a.sides; i++) {
    const angle = (τ / a.sides) * i
    const jitter = a.r * (0.78 + 0.22 * Math.sin(i * 2.3))
    const px = Math.cos(angle) * jitter, py = Math.sin(angle) * jitter
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  }
  ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.restore()
}

function frame(ts: number) {
  raf = requestAnimationFrame(frame)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return
  const dt = Math.min(ts - lastTs, 50)
  lastTs = ts

  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, W, H)

  // Starfield
  ctx.fillStyle = 'rgba(200,215,255,0.10)'
  for (let i = 0; i < 50; i++) {
    const sx = (i * 79 + 17) % W
    const sy = ((i * 137 + ts * 0.015) % H + H) % H
    ctx.fillRect(sx, sy, 1 + (i % 3 === 0 ? 1 : 0), 1 + (i % 3 === 0 ? 1 : 0))
  }

  if (state.value === 'playing') {
    elapsed += dt
    score.value = Math.floor(elapsed / 1000)
    if (invincible > 0) invincible -= dt
    spawnTimer += dt
    if (spawnTimer > spawnInterval()) { spawnTimer = 0; spawnAsteroid() }

    // Ship movement
    const sp = 5
    if (keys.left)  shipX = Math.max(SHIP_W + 2, shipX - sp)
    if (keys.right) shipX = Math.min(W - SHIP_W - 2, shipX + sp)

    // Move asteroids
    for (const a of asteroids) { a.x += a.vx; a.y += a.vy; a.rot += a.rotV }
    asteroids = asteroids.filter(a => a.y < H + 60)

    // Collision (ship is a triangle, approximate as circle r=16)
    if (invincible <= 0) {
      for (const a of asteroids) {
        const dist = Math.hypot(a.x - shipX, a.y - SHIP_Y)
        if (dist < a.r + 14) {
          lives.value--
          invincible = 2000
          if (lives.value <= 0) { state.value = 'over'; return }
          break
        }
      }
    }
  }

  // Draw asteroids
  for (const a of asteroids) drawAsteroid(ctx, a, 1)

  // Draw ship
  ctx.save()
  ctx.translate(shipX, SHIP_Y)
  const blink = invincible > 0 && Math.floor(invincible / 150) % 2 === 0
  if (!blink) {
    // Engine flame
    if (state.value === 'playing' && (keys.left || keys.right || true)) {
      ctx.save()
      ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 12
      const fh = 10 + Math.random() * 7
      const fg = ctx.createLinearGradient(0, SHIP_H / 2, 0, SHIP_H / 2 + fh)
      fg.addColorStop(0, 'rgba(255,180,40,0.85)'); fg.addColorStop(1, 'rgba(255,40,0,0)')
      ctx.fillStyle = fg
      ctx.beginPath()
      ctx.moveTo(-5, SHIP_H / 2); ctx.lineTo(5, SHIP_H / 2); ctx.lineTo(0, SHIP_H / 2 + fh)
      ctx.closePath(); ctx.fill()
      ctx.restore()
    }
    // Body
    ctx.save()
    ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 16
    const sg = ctx.createLinearGradient(0, -SHIP_H / 2, 0, SHIP_H / 2)
    sg.addColorStop(0, '#e0f7ff'); sg.addColorStop(0.5, '#00d4ff'); sg.addColorStop(1, '#004488')
    ctx.fillStyle = sg
    ctx.beginPath()
    ctx.moveTo(0, -SHIP_H / 2); ctx.lineTo(SHIP_W, SHIP_H / 2); ctx.lineTo(-SHIP_W, SHIP_H / 2)
    ctx.closePath(); ctx.fill()
    // Wings
    ctx.fillStyle = 'rgba(0,150,200,0.6)'
    ctx.beginPath(); ctx.moveTo(SHIP_W, SHIP_H / 2); ctx.lineTo(SHIP_W + 10, SHIP_H / 2 + 6); ctx.lineTo(SHIP_W - 6, SHIP_H / 2); ctx.closePath(); ctx.fill()
    ctx.beginPath(); ctx.moveTo(-SHIP_W, SHIP_H / 2); ctx.lineTo(-SHIP_W - 10, SHIP_H / 2 + 6); ctx.lineTo(-SHIP_W + 6, SHIP_H / 2); ctx.closePath(); ctx.fill()
    ctx.restore()
    // Cockpit
    ctx.fillStyle = '#fffde0'
    ctx.beginPath(); ctx.ellipse(0, 0, 5, 7, 0, 0, τ); ctx.fill()
  }
  ctx.restore()

  // HUD
  ctx.fillStyle = 'rgba(200,220,255,0.65)'
  ctx.font = "13px 'Courier New', monospace"
  ctx.textAlign = 'left'; ctx.fillText(`${score.value}s`, 14, 26)
  ctx.textAlign = 'right'; ctx.fillText('♥ '.repeat(lives.value).trim(), W - 14, 26)

  // Overlays (idle title screen only — over handled by HTML popup)
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.80)'; ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#00d4ff'
    ctx.font = "bold 26px 'Space Grotesk', sans-serif"
    ctx.fillText('ASTEROID DODGE', W / 2, H / 2 - 36)
    ctx.fillStyle = 'rgba(200,220,255,0.45)'
    ctx.font = "12px 'Courier New', monospace"
    ctx.fillText('Press ← → or SPACE to start', W / 2, H / 2 + 44)
  }
}

function onKey(e: KeyboardEvent) {
  const down = e.type === 'keydown'
  if (e.key === 'ArrowLeft'  || e.key === 'a') { e.preventDefault(); keys.left  = down }
  if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); keys.right = down }
  if (e.code === 'Space' && down) { e.preventDefault(); if (state.value === 'idle') startGame() }
  if (e.key === 'ArrowLeft' && down && state.value === 'idle') startGame()
  if (e.key === 'ArrowRight' && down && state.value === 'idle') startGame()
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
    <div class="relative">
      <canvas ref="canvasEl" class="rounded-xl border border-white/10 block" />

      <!-- Result popup -->
      <div
        v-if="state === 'over'"
        class="absolute inset-0 rounded-xl flex items-center justify-center"
        style="background: rgba(3,7,18,0.88)"
      >
        <div class="flex flex-col items-center gap-4 border border-white/10 bg-white/[0.04] rounded-2xl px-10 py-8">
          <p class="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-500">GAME OVER</p>
          <p class="font-display font-bold text-4xl text-white">{{ score }}</p>
          <p class="hud-label text-[10px]">SCORE</p>
          <button
            class="mt-2 px-10 py-2.5 font-mono text-xs tracking-widest uppercase rounded-lg border border-neon-blue/30 bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20 hover:border-neon-blue/50 transition-all cursor-pointer"
            @click.stop="restart"
          >↺ RESTART</button>
        </div>
      </div>
    </div>
    <p class="font-mono text-xs text-slate-600">← → or A D to move • survive the asteroid field</p>
  </div>
</template>
