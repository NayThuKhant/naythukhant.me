<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const score    = ref(0)
const lives    = ref(3)
const state    = ref<'idle' | 'playing' | 'over'>('idle')

const W = 480, H = 320
const τ = Math.PI * 2

const WORDS = [
  'NEBULA', 'QUASAR', 'PULSAR', 'COMET', 'AURORA', 'COSMOS', 'GALAXY',
  'ORBIT', 'PHOTON', 'ZENITH', 'LUNAR', 'SOLAR', 'VORTEX', 'PLASMA',
  'NOVA', 'TITAN', 'ETHER', 'VOID', 'STELLAR', 'ECLIPSE',
  'METEOR', 'ASTEROID', 'NEUTRON', 'PROTON', 'HYPNOS', 'ATLAS',
  'ANDROMEDA', 'CORONA', 'HELIOS', 'LYRA', 'CYGNUS', 'SIRIUS',
  'VEGA', 'RIGEL', 'ALTAIR', 'DENEB', 'POLARIS', 'ANTARES', 'CASTOR', 'POLLUX',
]

type Asteroid = {
  id: number
  word: string
  x: number
  y: number
  speed: number
  radius: number
  typed: number
  exploding: boolean
  explodeTimer: number
  hue: number
}

let asteroids: Asteroid[] = []
let currentTyped = ''
let nextId = 0
let raf = 0
let lastSpawn = 0
let spawnInterval = 3000
let frameTs = 0

function spawnAsteroid(ts: number) {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)]!
  const radius = 18 + Math.floor(Math.random() * 10)
  const x = radius + Math.random() * (W - radius * 2)
  const difficulty = Math.min(score.value * 0.03, 1.2)
  const speed = 0.3 + Math.random() * 0.4 + difficulty * 0.5
  asteroids.push({
    id: nextId++,
    word,
    x,
    y: -radius,
    speed,
    radius,
    typed: 0,
    exploding: false,
    explodeTimer: 0,
    hue: Math.random() < 0.5 ? 0 : 1, // 0=blue, 1=purple
  })
  lastSpawn = ts
  spawnInterval = Math.max(1200, 3000 - score.value * 60)
}

function reset() {
  asteroids = []
  currentTyped = ''
  nextId = 0
  score.value = 0
  lives.value = 3
  lastSpawn = frameTs
  spawnInterval = 3000
}

function activeAsteroid(): Asteroid | null {
  // Target the lowest non-exploding asteroid
  let best: Asteroid | null = null
  for (const a of asteroids) {
    if (a.exploding) continue
    if (!best || a.y > best.y) best = a
  }
  return best
}

function drawAsteroid(ctx: CanvasRenderingContext2D, a: Asteroid) {
  if (a.exploding) {
    const t = a.explodeTimer / 20
    const r = a.radius + t * 30
    const alpha = 1 - t
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.shadowColor = '#f472b6'
    ctx.shadowBlur = 30
    ctx.strokeStyle = '#f472b6'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(a.x, a.y, r, 0, τ)
    ctx.stroke()
    // Inner flash
    ctx.fillStyle = `rgba(244,114,182,${alpha * 0.4})`
    ctx.beginPath()
    ctx.arc(a.x, a.y, r * 0.5, 0, τ)
    ctx.fill()
    ctx.restore()
    return
  }

  const active = activeAsteroid()
  const isActive = active?.id === a.id
  const color = a.hue === 0 ? '#00d4ff' : '#a855f7'
  const glowColor = a.hue === 0 ? '#00d4ff' : '#a855f7'

  ctx.save()
  ctx.shadowColor = glowColor
  ctx.shadowBlur = isActive ? 20 : 8

  // Irregular asteroid shape
  ctx.fillStyle = isActive ? color.replace('ff', '44') : 'rgba(20,20,35,0.85)'
  ctx.strokeStyle = color
  ctx.lineWidth = isActive ? 2 : 1.5
  ctx.beginPath()
  const points = 8
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * τ
    const jitter = 0.7 + ((a.id * 37 + i * 13) % 30) / 100
    const rx = a.x + Math.cos(angle) * a.radius * jitter
    const ry = a.y + Math.sin(angle) * a.radius * jitter
    i === 0 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()

  // Word label below asteroid
  const typed = a.word.slice(0, a.typed)
  const remaining = a.word.slice(a.typed)
  const fontSize = 11
  const labelY = a.y + a.radius + 14

  ctx.save()
  ctx.font = `bold ${fontSize}px 'Courier New', monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  // Typed portion (bright)
  if (typed.length > 0) {
    const fullW = ctx.measureText(a.word).width
    const typedW = ctx.measureText(typed).width
    const startX = a.x - fullW / 2

    ctx.save()
    ctx.shadowColor = '#00ff88'
    ctx.shadowBlur = 8
    ctx.fillStyle = '#00ff88'
    ctx.textAlign = 'left'
    ctx.fillText(typed, startX, labelY)
    ctx.restore()

    // Remaining portion
    ctx.save()
    ctx.fillStyle = isActive ? 'rgba(255,255,255,0.9)' : 'rgba(200,200,220,0.5)'
    ctx.textAlign = 'left'
    ctx.fillText(remaining, startX + typedW, labelY)
    ctx.restore()
  } else {
    ctx.fillStyle = isActive ? 'rgba(255,255,255,0.9)' : 'rgba(200,200,220,0.5)'
    ctx.fillText(a.word, a.x, labelY)
  }
  ctx.restore()
}


function frame(ts: number) {
  raf = requestAnimationFrame(frame)
  frameTs = ts
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, W, H)

  // Subtle grid
  ctx.fillStyle = 'rgba(255,255,255,0.015)'
  for (let x = 0; x < W; x += 40) ctx.fillRect(x, 0, 1, H)
  for (let y = 0; y < H; y += 40) ctx.fillRect(0, y, W, 1)

  // Ground line
  ctx.save()
  ctx.shadowColor = '#f472b6'
  ctx.shadowBlur = 6
  ctx.strokeStyle = 'rgba(244,114,182,0.3)'
  ctx.lineWidth = 1
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.moveTo(0, H - 8)
  ctx.lineTo(W, H - 8)
  ctx.stroke()
  ctx.restore()

  if (state.value === 'playing') {
    // Spawn
    if (ts - lastSpawn > spawnInterval && asteroids.filter(a => !a.exploding).length < 5) {
      spawnAsteroid(ts)
    }

    // Update
    for (const a of asteroids) {
      if (a.exploding) {
        a.explodeTimer++
      } else {
        a.y += a.speed
        if (a.y - a.radius > H - 8) {
          // Hit ground
          lives.value--
          a.exploding = true
          a.explodeTimer = 0
          currentTyped = ''
          if (lives.value <= 0) {
            state.value = 'over'
          }
        }
      }
    }

    // Remove finished explosions
    asteroids = asteroids.filter(a => !a.exploding || a.explodeTimer < 20)

    // Draw
    for (const a of asteroids) drawAsteroid(ctx, a)
  }

  // Overlays
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.82)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'

    ctx.save()
    ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 24
    ctx.fillStyle = '#a855f7'
    ctx.font = "bold 28px 'Space Grotesk', sans-serif"
    ctx.fillText('TYPE ATTACK', W / 2, H / 2 - 32)
    ctx.restore()
    ctx.fillStyle = 'rgba(200,220,255,0.55)'
    ctx.font = "13px 'Courier New', monospace"
    ctx.fillText('Press any key to begin', W / 2, H / 2 + 8)
  }
}

function onKey(e: KeyboardEvent) {
  if (state.value === 'idle') {
    if (e.key === 'Enter' || (e.key.length === 1 && /[A-Za-z]/.test(e.key))) {
      reset()
      state.value = 'playing'
    }
    return
  }

  if (state.value === 'over') return

  if (state.value !== 'playing') return

  if (e.key === 'Backspace') {
    if (currentTyped.length > 0) {
      currentTyped = currentTyped.slice(0, -1)
      const active = activeAsteroid()
      if (active) active.typed = currentTyped.length
    }
    return
  }

  if (e.key.length !== 1 || !/[A-Za-z]/.test(e.key)) return

  const ch = e.key.toUpperCase()
  const active = activeAsteroid()
  if (!active) return

  const expected = active.word[active.typed]
  if (expected && ch === expected) {
    active.typed++
    currentTyped = active.word.slice(0, active.typed)
    if (active.typed === active.word.length) {
      // Destroy!
      active.exploding = true
      active.explodeTimer = 0
      score.value++
      currentTyped = ''
    }
  } else {
    // Wrong key — reset typed progress on active
    active.typed = 0
    currentTyped = ''
  }
}

function restart() {
  asteroids = []
  currentTyped = ''
  nextId = 0
  score.value = 0
  lives.value = 3
  lastSpawn = frameTs
  spawnInterval = 3000
  state.value = 'playing'
}

onMounted(() => {
  const canvas = canvasEl.value
  if (canvas) { canvas.width = W; canvas.height = H }
  window.addEventListener('keydown', onKey)
  raf = requestAnimationFrame(frame)
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 select-none">
    <div class="flex gap-4">
      <div class="glass-hud px-6 py-2 text-center">
        <p class="hud-label text-[10px]">SCORE</p>
        <p class="font-mono font-bold text-white text-lg leading-tight">{{ score }}</p>
      </div>
      <div class="glass-hud px-6 py-2 text-center">
        <p class="hud-label text-[10px]">LIVES</p>
        <p class="font-mono font-bold text-neon-pink text-lg leading-tight">
          <span v-for="i in 3" :key="i" :class="i <= lives ? 'opacity-100' : 'opacity-20'">♥</span>
        </p>
      </div>
    </div>
    <div class="relative">
      <canvas ref="canvasEl" class="rounded-xl border border-white/10 block" />
      <div v-if="state === 'over'" class="absolute inset-0 rounded-xl flex items-center justify-center" style="background: rgba(3,7,18,0.88)">
        <div class="flex flex-col items-center gap-4 border border-white/10 bg-white/[0.04] rounded-2xl px-10 py-8">
          <p class="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-500">GAME OVER</p>
          <p class="font-display font-bold text-4xl text-white">{{ score }}</p>
          <p class="hud-label text-[10px]">WORDS DESTROYED</p>
          <button class="mt-2 px-10 py-2.5 font-mono text-xs tracking-widest uppercase rounded-lg border border-neon-blue/30 bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20 hover:border-neon-blue/50 transition-all cursor-pointer" @click.stop="restart">↺ RESTART</button>
        </div>
      </div>
    </div>
    <p class="font-mono text-xs text-slate-600">Type the words to destroy asteroids • don't let them land</p>
  </div>
</template>
