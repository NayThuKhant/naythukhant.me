<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const score    = ref(0)
const lives    = ref(3)
const level    = ref(1)
const typed    = ref(0)
const state    = ref<'idle' | 'playing' | 'over'>('idle')

const W = 400, H = 460
const τ = Math.PI * 2
const MAX_LIVES     = 3
const MAX_ON_SCREEN = 9      // more simultaneous words
const LEVEL_UP_AT   = 6      // level up faster
const DANGER_Y      = H - 36

const POOL: string[][] = [
  // tier 0 — short (3-5 chars, level 1)
  ['mars', 'moon', 'nova', 'star', 'void', 'warp', 'beam', 'dark', 'dust', 'glow',
   'halo', 'neon', 'ring', 'flux', 'core', 'fire', 'spin', 'grid', 'byte', 'orb',
   'ray', 'sun', 'ion', 'gas', 'arc', 'comet', 'orbit', 'probe', 'radar', 'laser'],
  // tier 1 — medium (6-8 chars, level 2-3)
  ['nebula', 'photon', 'plasma', 'quasar', 'saturn', 'signal', 'vector', 'pulsar',
   'meteor', 'galaxy', 'cosmos', 'aurora', 'zenith', 'vortex', 'helium', 'debris',
   'impact', 'launch', 'module', 'oxygen', 'rocket', 'fusion', 'planet', 'crater',
   'corona', 'flares', 'transit', 'eclipse'],
  // tier 2 — long (8-12 chars, level 4+)
  ['asteroid', 'supernova', 'wormhole', 'stardust', 'blackhole', 'antimatter',
   'cosmology', 'magnitude', 'telescope', 'interstellar', 'spaceship', 'radiation',
   'exoplanet', 'singularity', 'trajectory', 'propulsion', 'navigation', 'combustion'],
]

interface FallingWord {
  id: number; text: string; x: number; y: number; speed: number
  progress: number; active: boolean
  dying: boolean; dyAge: number; dyMax: number; missed: boolean
  errFlash: number  // frames of red-flash on wrong key
}
interface Particle {
  x: number; y: number; vx: number; vy: number
  age: number; maxAge: number; color: string; r: number
}
interface BgStar { x: number; y: number; sz: number; op: number }

let uid        = 1
let words:     FallingWord[] = []
let particles: Particle[]    = []
let bgStars:   BgStar[]      = []
let activeId:  number | null = null
let spawnTimer = 0
let spawnEvery = 180
let destroyed  = 0
let ctx2d:     CanvasRenderingContext2D | null = null
let raf        = 0

function pickWord(): string {
  // Blend tiers so difficulty ramps smoothly
  const lv = level.value
  const pool =
    lv === 1 ? POOL[0]! :
    lv === 2 ? [...POOL[0]!, ...POOL[1]!] :
    lv === 3 ? POOL[1]! :
    lv === 4 ? [...POOL[1]!, ...POOL[2]!] :
    POOL[2]!
  return pool[Math.floor(Math.random() * pool.length)]!
}

function fallSpeed(): number {
  // Steeper speed curve: ~1.5× faster by level 5
  return 0.45 + (level.value - 1) * 0.16 + Math.random() * 0.16
}

function spawnWord() {
  const text = pickWord()
  const halfW = (text.length * 9.6) / 2 + 8
  const x = halfW + 12 + Math.random() * (W - halfW * 2 - 24)
  words.push({
    id: uid++, text, x, y: -10,
    speed: fallSpeed(),
    progress: 0, active: false,
    dying: false, dyAge: 0, dyMax: 18, missed: false, errFlash: 0,
  })
}

function burst(x: number, y: number, color: string, n = 12) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * τ + (Math.random() - 0.5) * 0.7
    const spd = 1.6 + Math.random() * 3.8
    particles.push({ x, y,
      vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 0.5,
      age: 0, maxAge: 22 + Math.floor(Math.random() * 14),
      color, r: 1.5 + Math.random() * 2.5 })
  }
}

function destroyWord(w: FallingWord) {
  w.dying = true; w.active = false
  activeId = null
  destroyed++
  typed.value++
  score.value += 10 + w.text.length * 4 + (level.value - 1) * 6
  burst(w.x, w.y, '#00ff88', 14)
  if (destroyed % LEVEL_UP_AT === 0) {
    level.value++
    spawnEvery = Math.max(55, spawnEvery - 22)  // spawn faster each level
  }
}

function initStars() {
  bgStars = Array.from({ length: 55 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    sz: Math.random() * 1.6 + 0.4, op: Math.random() * 0.35 + 0.08,
  }))
}

function startGame() {
  words = []; particles = []
  activeId = null; spawnTimer = 70
  spawnEvery = 180; destroyed = 0
  score.value = 0; lives.value = MAX_LIVES
  level.value = 1; typed.value = 0
  spawnEvery = 160      // tighter initial spawn rate
  state.value = 'playing'
  initStars()
  spawnWord()
}

function onKey(e: KeyboardEvent) {
  if (state.value !== 'playing') {
    if (state.value === 'idle' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); startGame() }
    return
  }

  const ch = e.key.toLowerCase()
  if (ch.length !== 1 || !/[a-z]/.test(ch)) return
  e.preventDefault()

  if (activeId !== null) {
    const w = words.find(w => w.id === activeId && !w.dying)
    if (w) {
      if (w.text[w.progress] === ch) {
        w.progress++
        if (w.progress >= w.text.length) destroyWord(w)
      } else {
        w.errFlash = 6  // flash red for 6 frames
      }
      return
    }
    activeId = null
  }

  // Lock onto most-dangerous word starting with ch
  const cands = words.filter(w => !w.dying && w.text[0] === ch)
  if (!cands.length) return
  cands.sort((a, b) => b.y - a.y)
  const target = cands[0]!

  const prev = words.find(w => w.id === activeId)
  if (prev) { prev.active = false; prev.progress = 0 }

  target.active = true
  target.progress = 1
  activeId = target.id
  if (target.progress >= target.text.length) destroyWord(target)
}

function frame() {
  raf = requestAnimationFrame(frame)
  if (!ctx2d) {
    ctx2d = canvasEl.value?.getContext('2d') ?? null
    if (!ctx2d) return
  }
  const ctx = ctx2d

  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, W, H)

  for (const s of bgStars) {
    ctx.globalAlpha = s.op
    ctx.fillStyle   = '#ffffff'
    ctx.fillRect(s.x, s.y, s.sz, s.sz)
  }
  ctx.globalAlpha = 1

  ctx.save()
  ctx.strokeStyle = 'rgba(239,68,68,0.38)'
  ctx.lineWidth   = 1
  ctx.setLineDash([4, 7])
  ctx.beginPath(); ctx.moveTo(0, DANGER_Y); ctx.lineTo(W, DANGER_Y); ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()

  if (state.value === 'playing') {
    const liveCount = words.filter(w => !w.dying).length
    if (++spawnTimer >= spawnEvery && liveCount < MAX_ON_SCREEN) {
      spawnTimer = 0
      spawnWord()
    }

    for (const w of words) {
      if (w.dying) { w.dyAge++; continue }
      if (w.errFlash > 0) w.errFlash--
      w.y += w.speed
      if (w.y >= DANGER_Y + 12) {
        w.missed = true; w.dying = true; w.dyAge = w.dyMax
        if (w.active) activeId = null
        burst(w.x, DANGER_Y, '#ef4444', 8)
        lives.value--
        if (lives.value <= 0) state.value = 'over'
      }
    }
    words = words.filter(w => !(w.dying && w.dyAge >= w.dyMax))

    for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.07; p.age++ }
    particles = particles.filter(p => p.age < p.maxAge)
  }

  // Particles
  ctx.save()
  ctx.shadowBlur = 7
  for (const p of particles) {
    const a = 1 - p.age / p.maxAge
    ctx.globalAlpha = a
    ctx.fillStyle = ctx.shadowColor = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r * (0.6 + 0.4 * a), 0, τ)
    ctx.fill()
  }
  ctx.restore()

  // Words
  ctx.save()
  ctx.font         = "bold 15px 'JetBrains Mono','Courier New',monospace"
  ctx.textBaseline = 'middle'
  ctx.textAlign    = 'left'

  for (const w of words) {
    const alpha = w.dying ? Math.max(0, 1 - w.dyAge / w.dyMax) : 1
    if (alpha <= 0) continue

    const danger  = Math.max(0, Math.min(1, (w.y - H * 0.55) / (DANGER_Y - H * 0.55)))
    const fullW   = ctx.measureText(w.text).width
    const startX  = w.x - fullW / 2

    if (w.active && !w.dying) {
      ctx.globalAlpha = alpha * 0.11
      ctx.fillStyle   = '#00d4ff'
      ctx.fillRect(startX - 6, w.y - 12, fullW + 12, 24)
    }

    ctx.globalAlpha = alpha

    if (w.progress > 0) {
      const typedStr = w.text.slice(0, w.progress)
      const typedW   = ctx.measureText(typedStr).width
      ctx.fillStyle   = '#00ff88'
      ctx.shadowColor = '#00ff88'
      ctx.shadowBlur  = w.active ? 10 : 4
      ctx.fillText(typedStr, startX, w.y)

      const rem = w.text.slice(w.progress)
      if (w.errFlash > 0) {
        ctx.fillStyle   = '#f87171'
        ctx.shadowColor = '#ef4444'
        ctx.shadowBlur  = 10
      } else if (w.active) {
        ctx.fillStyle   = '#e2e8f0'
        ctx.shadowColor = '#00d4ff'
        ctx.shadowBlur  = 7
      } else {
        const rr = Math.round(180 + danger * 75)
        const gg = Math.round(200 - danger * 140)
        const bb = Math.round(255 - danger * 200)
        ctx.fillStyle   = `rgba(${rr},${gg},${bb},0.82)`
        ctx.shadowColor = danger > 0.45 ? '#ef4444' : 'transparent'
        ctx.shadowBlur  = danger > 0.45 ? 5 : 0
      }
      ctx.fillText(rem, startX + typedW, w.y)
    } else {
      if (w.active) {
        ctx.fillStyle   = '#ffffff'
        ctx.shadowColor = '#00d4ff'
        ctx.shadowBlur  = 8
      } else {
        const rr = Math.round(180 + danger * 75)
        const gg = Math.round(200 - danger * 140)
        const bb = Math.round(255 - danger * 200)
        ctx.fillStyle   = `rgba(${rr},${gg},${bb},0.78)`
        ctx.shadowColor = danger > 0.45 ? '#ef4444' : 'transparent'
        ctx.shadowBlur  = danger > 0.45 ? 5 : 0
      }
      ctx.fillText(w.text, startX, w.y)
    }

    if (w.active && !w.dying) {
      const curX  = startX + ctx.measureText(w.text.slice(0, w.progress)).width
      const charW = ctx.measureText(w.text[w.progress] ?? ' ').width
      ctx.globalAlpha = 0.9
      ctx.fillStyle   = '#00d4ff'
      ctx.shadowColor = '#00d4ff'
      ctx.shadowBlur  = 4
      ctx.fillRect(curX, w.y + 9, charW, 2)
    }
  }
  ctx.restore()

  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.88)'
    ctx.fillRect(0, 0, W, H)
    const p = 0.5 + 0.5 * Math.sin(Date.now() * 0.0028)
    ctx.textAlign   = 'center'
    ctx.font        = "bold 28px 'Space Grotesk',sans-serif"
    ctx.fillStyle   = `rgba(168,85,247,${0.7 + 0.3 * p})`
    ctx.shadowColor = '#a855f7'
    ctx.shadowBlur  = 12 + 14 * p
    ctx.fillText('TYPE ATTACK', W / 2, H / 2 - 38)
    ctx.shadowBlur  = 0
    ctx.font        = "13px 'Courier New',monospace"
    ctx.fillStyle   = 'rgba(200,220,255,0.52)'
    ctx.fillText('Words fall from space.', W / 2, H / 2 + 2)
    ctx.fillText('Type them before they reach the danger line.', W / 2, H / 2 + 20)
    ctx.font        = "12px 'Courier New',monospace"
    ctx.fillStyle   = `rgba(200,220,255,${0.28 + 0.22 * p})`
    ctx.fillText('Press Space or Enter to begin', W / 2, H / 2 + 52)
  }
}

onMounted(() => {
  if (canvasEl.value) { canvasEl.value.width = W; canvasEl.value.height = H }
  initStars()
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

    <div class="glass-hud px-6 py-2 flex gap-6 items-center">
      <div class="text-center">
        <p class="hud-label text-[10px]">SCORE</p>
        <p class="font-mono font-bold text-white text-lg leading-tight">{{ score }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">WORDS</p>
        <p class="font-mono font-bold text-white text-lg leading-tight">{{ typed }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">LEVEL</p>
        <p class="font-mono font-bold text-white text-lg leading-tight">{{ level }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">LIVES</p>
        <p class="font-mono font-bold text-neon-pink text-lg leading-tight tracking-widest">
          {{ '♥'.repeat(lives) }}{{ '♡'.repeat(Math.max(0, MAX_LIVES - lives)) }}
        </p>
      </div>
    </div>

    <div class="relative">
      <canvas
        ref="canvasEl"
        class="rounded-xl border border-white/10 block"
        :style="{ width: `${W}px`, height: `${H}px` }"
      />

      <GameResultOverlay :state="state" :score="score" :extra="`${typed} words · LVL ${level}`" @restart="startGame" />

      <Transition name="fade">
        <div
          v-if="state === 'idle'"
          class="absolute inset-0 rounded-xl flex flex-col items-center justify-end pb-8"
        >
          <button class="btn-neon-purple" @click.stop="startGame">START</button>
        </div>
      </Transition>
    </div>

    <p class="font-mono text-xs text-slate-600">First letter locks target · type the full word · wrong keys ignored</p>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease }
.fade-enter-from, .fade-leave-to       { opacity: 0 }
</style>
