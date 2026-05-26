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

// --- Particle / popup interfaces ---
interface Particle {
  x: number; y: number
  vx: number; vy: number
  age: number; maxAge: number
  color: string; size: number
}
interface ScorePopup {
  x: number; y: number
  age: number; maxAge: number
  text: string
}

let raf = 0
let lastTs = 0
let py    = 0    // player Y (centre)
let pvy   = 0   // player vertical velocity
let bars: Bar[] = []
let barTimer    = 0
let speed       = BASE_SPEED

// Animation state
let particles: Particle[] = []
let popups: ScorePopup[] = []
let playerTrail: { x: number; y: number }[] = []
let deathAnim = 0        // 0 = inactive, 1..20 = frame counter
let hitFlash  = 0        // white flash on player

const { jump: sfxJump, score: sfxScore, die: sfxDie } = useGameSounds()

function spawnParticles(x: number, y: number, color: string, n = 7) {
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 1.5 + Math.random() * 2.5
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0, maxAge: 18 + Math.floor(Math.random() * 8),
      color, size: 1.5 + Math.random() * 2,
    })
  }
}

function spawnPopup(x: number, y: number, text: string) {
  popups.push({ x, y, age: 0, maxAge: 40, text })
}

function updateParticles() {
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy
    p.vy += 0.08
    p.age++
  }
  particles = particles.filter(p => p.age < p.maxAge)
}

function drawParticles(ctx: CanvasRenderingContext2D) {
  for (const p of particles) {
    const alpha = 1 - p.age / p.maxAge
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    ctx.shadowColor = p.color
    ctx.shadowBlur = 6
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawPopups(ctx: CanvasRenderingContext2D) {
  for (const pop of popups) {
    const alpha = 1 - pop.age / pop.maxAge
    const dy = -30 * (pop.age / pop.maxAge)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.shadowColor = '#ffd700'
    ctx.shadowBlur = 8
    ctx.fillStyle = '#ffd700'
    ctx.font = "bold 13px 'Courier New', monospace"
    ctx.textAlign = 'center'
    ctx.fillText(pop.text, pop.x, pop.y + dy)
    ctx.restore()
    pop.age++
  }
  popups = popups.filter(p => p.age < p.maxAge)
}

function reset() {
  py = H / 2
  pvy = 0
  bars = []
  barTimer = 0
  score.value = 0
  speed = BASE_SPEED
  particles = []
  popups = []
  playerTrail = []
  deathAnim = 0
  hitFlash = 0
}

function restart() {
  reset()
  state.value = 'playing'
}

function jump() {
  if (state.value === 'over') return
  if (state.value === 'idle') { reset(); state.value = 'playing'; return }
  pvy = JUMP_VY
  sfxJump()
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
    // Record trail
    playerTrail.push({ x: PLAYER_X, y: py })
    if (playerTrail.length > 5) playerTrail.shift()

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
        sfxScore()
        speed = Math.min(6.5, speed + 0.08)
        // Spawn score popup near player
        spawnPopup(PLAYER_X + 20, py - 20, '+1')
        // Tiny particle burst (cyan)
        spawnParticles(PLAYER_X, py, '#00d4ff', 5)
      }
    }

    bars = bars.filter(b => b.x > -BAR_W - 20)

    // Collision: floor / ceiling
    if (py - 8 < 0 || py + 8 > H) {
      // Death animation
      deathAnim = 1
      spawnParticles(PLAYER_X, py, '#00d4ff', 12)
      sfxDie()
      state.value = 'over'
      return
    }

    // Collision: bars
    for (const b of bars) {
      if (PLAYER_X + 10 > b.x && PLAYER_X - 10 < b.x + BAR_W) {
        if (py - 8 < b.gapY || py + 8 > b.gapY + GAP_H) {
          deathAnim = 1
          spawnParticles(PLAYER_X, py, '#00d4ff', 12)
          sfxDie()
          state.value = 'over'
          return
        }
      }
    }

    if (hitFlash > 0) hitFlash--
  }

  // Draw bars (neon-pink)
  for (const b of bars) {
    ctx.save()
    ctx.shadowColor = '#f472b6'
    ctx.shadowBlur  = 14
    ctx.fillStyle   = 'rgba(180,50,100,0.85)'
    ctx.strokeStyle = '#f472b6'
    ctx.lineWidth   = 1.5
    ctx.fillRect(b.x, 0, BAR_W, b.gapY)
    ctx.strokeRect(b.x, 0, BAR_W, b.gapY)
    const bTop = b.gapY + GAP_H
    ctx.fillRect(b.x, bTop, BAR_W, H - bTop)
    ctx.strokeRect(b.x, bTop, BAR_W, H - bTop)
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

  // Draw trail (ghost copies of player)
  for (let i = 0; i < playerTrail.length; i++) {
    const t = playerTrail[i]!
    const alpha = (i / playerTrail.length) * 0.35
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(t.x, t.y)
    ctx.shadowColor = '#00d4ff'
    ctx.shadowBlur = 8
    ctx.fillStyle = '#00d4ff'
    ctx.beginPath()
    ctx.moveTo(12, 0); ctx.lineTo(-8, -8); ctx.lineTo(-4, 0); ctx.lineTo(-8, 8)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  // Draw player ship (neon-blue glowing rect/ship)
  ctx.save()
  ctx.translate(PLAYER_X, py)
  const tilt = Math.max(-0.4, Math.min(0.4, pvy * 0.04))
  ctx.rotate(tilt)
  ctx.shadowColor = '#00d4ff'
  ctx.shadowBlur  = 20
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
  // Hit flash overlay
  if (hitFlash > 0) {
    ctx.globalAlpha = 0.7 * (hitFlash / 4)
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = '#ffffff'
    ctx.shadowBlur = 16
    ctx.beginPath()
    ctx.arc(0, 0, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
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

  // Particles drawn after player but before overlays
  updateParticles()
  drawParticles(ctx)
  drawPopups(ctx)

  // Death expanding ring
  if (deathAnim > 0 && deathAnim <= 20) {
    const t = deathAnim / 20
    const r = 10 + t * 60
    ctx.save()
    ctx.globalAlpha = (1 - t) * 0.8
    ctx.strokeStyle = '#00d4ff'
    ctx.shadowColor = '#00d4ff'
    ctx.shadowBlur = 20
    ctx.lineWidth = 3 * (1 - t) + 1
    ctx.beginPath()
    ctx.arc(PLAYER_X, py, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
    deathAnim++
  }

  // Overlays
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.80)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    // Pulsing idle glow
    const pulse = 0.6 + 0.4 * Math.sin(ts * 0.003)
    ctx.save()
    ctx.shadowColor = '#00d4ff'
    ctx.shadowBlur  = 18 + 14 * pulse
    ctx.fillStyle   = `rgba(0,212,255,${0.7 + 0.3 * pulse})`
    ctx.font        = "bold 26px 'Space Grotesk', sans-serif"
    ctx.fillText('NEON RUNNER', W / 2, H / 2 - 28)
    ctx.restore()
    // Blinking instruction
    if (Math.floor(ts / 600) % 2 === 0) {
      ctx.fillStyle = 'rgba(200,220,255,0.55)'
      ctx.font      = "13px 'Courier New', monospace"
      ctx.fillText('Press Space or tap to start', W / 2, H / 2 + 10)
    }
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
      <GameResultOverlay :state="state" :score="score" @restart="restart" />
    </div>
    <p class="font-mono text-xs text-slate-600">Space or tap to jump • dodge the barriers</p>
  </div>
</template>
