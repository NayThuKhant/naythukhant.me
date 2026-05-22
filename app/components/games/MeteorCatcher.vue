<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const score = ref(0)
const lives = ref(3)
const state = ref<'idle' | 'playing' | 'over'>('idle')

const W = 400, H = 420
const LIFE_MAX = 3
const MAX_METEORS = 7

const COLORS = [
  { fill: '#f97316', glow: '#f97316' },
  { fill: '#ef4444', glow: '#ef4444' },
  { fill: '#a855f7', glow: '#a855f7' },
  { fill: '#f472b6', glow: '#f472b6' },
]

interface Meteor { x: number; y: number; vy: number; r: number; fill: string; glow: string; pts: number }

let raf = 0
let meteors: Meteor[] = []
let spawnTimer = 0
let spawnInterval = 1400
let speedMult = 1
let lastTs = 0

function newMeteor(): Meteor {
  const c = COLORS[Math.floor(Math.random() * COLORS.length)]!
  const r = 16 + Math.random() * 16
  return {
    x: r + Math.random() * (W - r * 2),
    y: -r * 2,
    vy: (1.2 + Math.random() * 1.6) * speedMult,
    r,
    fill: c.fill,
    glow: c.glow,
    pts: Math.round(500 / r / 10) * 10,
  }
}

function frame(ts: number) {
  raf = requestAnimationFrame(frame)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return
  const dt = Math.min(ts - lastTs, 50)
  lastTs = ts

  ctx.fillStyle = '#030712'; ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = 'rgba(200,220,255,0.12)'
  for (let i = 0; i < 45; i++) {
    const sx = (i * 97 + ts * 0.004) % W
    const sy = (i * 173) % H
    ctx.fillRect(sx, sy, 1.5, 1.5)
  }

  if (state.value === 'playing') {
    spawnTimer += dt
    if (spawnTimer > spawnInterval && meteors.length < MAX_METEORS) {
      meteors.push(newMeteor())
      spawnTimer = 0
      spawnInterval = Math.max(600, spawnInterval - 18)
    }

    for (const m of meteors) m.y += m.vy

    const missed = meteors.filter(m => m.y - m.r > H)
    if (missed.length > 0) {
      meteors = meteors.filter(m => m.y - m.r <= H)
      lives.value = Math.max(0, lives.value - missed.length)
      if (lives.value <= 0) state.value = 'over'
    }
  }

  for (const m of meteors) {
    ctx.save()
    ctx.shadowColor = m.glow; ctx.shadowBlur = 20
    const grad = ctx.createRadialGradient(m.x - m.r * 0.3, m.y - m.r * 0.3, 0, m.x, m.y, m.r)
    grad.addColorStop(0, 'rgba(255,255,255,0.9)')
    grad.addColorStop(0.3, m.fill)
    grad.addColorStop(1, 'rgba(0,0,0,0.3)')
    ctx.fillStyle = grad
    ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }

  ctx.font = "12px 'Courier New', monospace"; ctx.fillStyle = 'rgba(200,220,255,0.35)'
  ctx.textAlign = 'left';  ctx.fillText(`SCORE: ${score.value}`, 12, 22)
  ctx.textAlign = 'right'; ctx.fillText(`${'♦'.repeat(lives.value)}${'◇'.repeat(LIFE_MAX - lives.value)}`, W - 12, 22)

  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.82)'; ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#f97316'
    ctx.font = "bold 22px 'Space Grotesk', sans-serif"
    ctx.fillText('METEOR CATCHER', W / 2, H / 2 - 24)
    ctx.fillStyle = 'rgba(200,220,255,0.5)'
    ctx.font = "11px 'Courier New', monospace"
    ctx.fillText('Tap meteors before they hit ground', W / 2, H / 2 + 10)
    ctx.fillText('Tap to start', W / 2, H / 2 + 28)
  }
}

function hitTest(clientX: number, clientY: number) {
  const rect = canvasEl.value!.getBoundingClientRect()
  const sx = W / rect.width, sy = H / rect.height
  const cx = (clientX - rect.left) * sx
  const cy = (clientY - rect.top) * sy
  const i = meteors.findIndex(m => (cx - m.x) ** 2 + (cy - m.y) ** 2 <= (m.r * 1.3) ** 2)
  if (i >= 0) {
    score.value += meteors[i]!.pts
    speedMult = Math.min(2.5, speedMult + 0.03)
    meteors.splice(i, 1)
  }
}

function startGame() {
  meteors = []; spawnTimer = 0; spawnInterval = 1400; speedMult = 1
  score.value = 0; lives.value = LIFE_MAX; state.value = 'playing'
}

function restart() {
  startGame()
}

function onClick(e: MouseEvent) {
  if (state.value === 'over') return
  if (state.value === 'idle') { startGame(); return }
  hitTest(e.clientX, e.clientY)
}

function onTouch(e: TouchEvent) {
  e.preventDefault()
  if (state.value === 'over') return
  if (state.value === 'idle') { startGame(); return }
  for (const t of Array.from(e.changedTouches)) hitTest(t.clientX, t.clientY)
}

onMounted(() => {
  if (canvasEl.value) { canvasEl.value.width = W; canvasEl.value.height = H }
  raf = requestAnimationFrame(frame)
})
onUnmounted(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="flex flex-col items-center gap-3 select-none">
    <div class="relative">
      <canvas
        ref="canvasEl"
        class="rounded-xl border border-white/10 block cursor-crosshair touch-none"
        @click="onClick"
        @touchstart="onTouch"
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
          <button
            class="mt-2 px-10 py-2.5 font-mono text-xs tracking-widest uppercase rounded-lg border border-neon-blue/30 bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20 hover:border-neon-blue/50 transition-all cursor-pointer"
            @click.stop="restart"
          >↺ RESTART</button>
        </div>
      </div>
    </div>
    <p class="font-mono text-xs text-slate-600">Tap/click meteors before they hit ground</p>
  </div>
</template>
