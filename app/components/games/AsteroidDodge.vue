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
interface Particle { x: number; y: number; vx: number; vy: number; age: number; maxAge: number; r: number; color: string }
interface ScorePopup { x: number; y: number; vy: number; age: number; maxAge: number; text: string }

let raf = 0
let shipX = W / 2
let asteroids: Asteroid[] = []
let spawnTimer = 0
let invincible = 0
let elapsed = 0
let lastTs = 0
const keys = { left: false, right: false }
let particles: Particle[] = []
let scorePopups: ScorePopup[] = []
let shakeTimer = 0
let titlePulse = 0

const { die: sfxDie, lose: sfxLose } = useGameSounds()

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

function spawnParticles(x: number, y: number, color: string, count = 7) {
  for (let i = 0; i < count; i++) {
    const angle = (τ / count) * i + Math.random() * 0.6
    const speed = 1.5 + Math.random() * 3
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, maxAge: 22, r: 2 + Math.random() * 2, color })
  }
}

function reset() {
  shipX = W / 2; asteroids = []
  spawnTimer = 0; elapsed = 0; invincible = 0
  score.value = 0; lives.value = 3
  particles = []; scorePopups = []; shakeTimer = 0
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
  titlePulse = ts

  let shakeX = 0, shakeY = 0
  if (shakeTimer > 0) {
    shakeX = (Math.random() - 0.5) * 8
    shakeY = (Math.random() - 0.5) * 8
    shakeTimer--
  }

  ctx.save()
  if (shakeTimer > 0) ctx.translate(shakeX, shakeY)

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

    // Asteroids that pass off screen — small score reward
    const passed = asteroids.filter(a => a.y > H + 60)
    for (const a of passed) {
      scorePopups.push({ x: a.x, y: H - 20, vy: -0.8, age: 0, maxAge: 35, text: '+1' })
    }
    asteroids = asteroids.filter(a => a.y < H + 60)

    // Collision (ship is a triangle, approximate as circle r=16)
    if (invincible <= 0) {
      for (const a of asteroids) {
        const dist = Math.hypot(a.x - shipX, a.y - SHIP_Y)
        if (dist < a.r + 14) {
          lives.value--
          sfxDie()
          invincible = 2000
          shakeTimer = 8
          // Particle burst on hit
          spawnParticles(shipX, SHIP_Y, '#00d4ff', 8)
          if (lives.value <= 0) { ctx.restore(); state.value = 'over'; sfxLose(); return }
          break
        }
      }
    }

    // Update particles
    for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.age++ }
    particles = particles.filter(p => p.age < p.maxAge)

    // Update score popups
    for (const sp of scorePopups) { sp.y += sp.vy; sp.age++ }
    scorePopups = scorePopups.filter(sp => sp.age < sp.maxAge)
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
  ctx.font = "bold 11px 'Courier New', monospace"
  ctx.textAlign = 'center'
  for (const sp of scorePopups) {
    const t = 1 - sp.age / sp.maxAge
    ctx.globalAlpha = t
    ctx.fillStyle = '#00ff88'
    ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 6
    ctx.fillText(sp.text, sp.x, sp.y)
  }
  ctx.restore()


  // Idle title overlay with pulsing glow
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.80)'; ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    const pulse = 0.5 + 0.5 * Math.sin(titlePulse * 0.003)
    ctx.shadowColor = '#00d4ff'
    ctx.shadowBlur = 8 + pulse * 18
    ctx.fillStyle = '#00d4ff'
    ctx.font = "bold 26px 'Space Grotesk', sans-serif"
    ctx.fillText('ASTEROID DODGE', W / 2, H / 2 - 36)
    ctx.shadowBlur = 0
    // Animated asteroid shapes
    for (let i = 0; i < 3; i++) {
      const ax = W / 2 - 40 + i * 40
      const ay = H / 2 + 4 + Math.sin(titlePulse * 0.0015 + i * 1.2) * 5
      const ar = 8 + i * 3
      ctx.save()
      ctx.translate(ax, ay)
      ctx.rotate(titlePulse * 0.0005 * (i % 2 === 0 ? 1 : -1))
      ctx.strokeStyle = `rgba(175,158,138,${0.5 + pulse * 0.4})`; ctx.lineWidth = 1.5
      ctx.fillStyle = 'rgba(80,70,60,0.6)'
      ctx.beginPath()
      for (let j = 0; j < 7; j++) {
        const angle = (τ / 7) * j
        const jit = ar * (0.78 + 0.22 * Math.sin(j * 2.3))
        j === 0 ? ctx.moveTo(Math.cos(angle)*jit, Math.sin(angle)*jit) : ctx.lineTo(Math.cos(angle)*jit, Math.sin(angle)*jit)
      }
      ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.restore()
    }
    ctx.fillStyle = 'rgba(200,220,255,0.45)'
    ctx.font = "12px 'Courier New', monospace"
    ctx.fillText('Press ← → or SPACE to start', W / 2, H / 2 + 44)
  }

  ctx.restore()
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

    <div class="glass-hud px-6 py-2 flex gap-6 items-center">
      <div class="text-center">
        <p class="hud-label text-[10px]">TIME</p>
        <p class="font-mono font-bold text-white text-lg leading-tight">{{ score }}s</p>
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
    <p class="font-mono text-xs text-slate-600">← → or A D to move • survive the asteroid field</p>
  </div>
</template>
