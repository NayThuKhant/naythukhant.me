<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const score    = ref(0)
const lives    = ref(3)
const state    = ref<'idle' | 'playing' | 'over'>('idle')

const W = 400, H = 300
const LIFE_MAX = 3
const SHIP_W = 40
const SHIP_H = 22
const SHIP_SPEED = 4
const CATCH_ZONE = SHIP_H / 2 + 6
const τ = Math.PI * 2

interface FallingObj {
  x: number; y: number; vy: number
  r: number; isBomb: boolean; twinkle: number
}

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
let shipX = W / 2
let objects: FallingObj[] = []
let spawnTimer = 0
let spawnInterval = 1100
let speedMult = 1
let lastTs = 0
let leftDown = false
let rightDown = false
let particles: Particle[] = []
let popups: ScorePopup[] = []
let shipFlash = 0    // hit flash on ship (bomb catch)
let deathAnim = 0

const { score: sfxScore, miss: sfxMiss, lose: sfxLose } = useGameSounds()

function spawnParticles(x: number, y: number, color: string, n = 7) {
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * τ
    const spd = 1.5 + Math.random() * 3
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      age: 0, maxAge: 18 + Math.floor(Math.random() * 8),
      color, size: 1.5 + Math.random() * 2.5,
    })
  }
}

function spawnPopup(x: number, y: number, text: string) {
  popups.push({ x, y, age: 0, maxAge: 40, text })
}

function updateParticles() {
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy
    p.vy += 0.06
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
    ctx.arc(p.x, p.y, p.size, 0, τ)
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

function newObject(): FallingObj {
  const isBomb = Math.random() < 0.28
  const r = isBomb ? 9 : 10 + Math.random() * 6
  return {
    x: r + Math.random() * (W - r * 2),
    y: -r * 2,
    vy: (1.5 + Math.random() * 1.2) * speedMult,
    r, isBomb,
    twinkle: Math.random() * τ,
  }
}

function drawStars(ctx: CanvasRenderingContext2D, ts: number) {
  ctx.fillStyle = 'rgba(200,220,255,0.18)'
  for (let i = 0; i < 40; i++) {
    const sx = (i * 91 + ts * 0.002) % W
    const sy = (i * 163 + ts * 0.0008) % H
    ctx.fillRect(sx, sy, 1.5, 1.5)
  }
}

function drawShip(ctx: CanvasRenderingContext2D, ts: number) {
  const sy = H - SHIP_H - 8
  const cx = shipX
  const pulse = 0.5 + 0.5 * Math.sin(ts * 0.004)

  ctx.save()
  ctx.shadowColor = '#00d4ff'
  ctx.shadowBlur = 14 + 6 * pulse
  ctx.fillStyle = '#00d4ff'
  ctx.beginPath()
  ctx.moveTo(cx, sy - SHIP_H / 2)
  ctx.lineTo(cx - SHIP_W / 2, sy + SHIP_H / 2)
  ctx.lineTo(cx + SHIP_W / 2, sy + SHIP_H / 2)
  ctx.closePath()
  ctx.fill()
  ctx.shadowBlur = 6
  ctx.fillStyle = 'rgba(180,240,255,0.9)'
  ctx.beginPath()
  ctx.arc(cx, sy - 2, 5, 0, τ)
  ctx.fill()
  ctx.shadowColor = '#a855f7'
  ctx.shadowBlur = 10
  ctx.fillStyle = '#a855f7'
  ctx.beginPath()
  ctx.ellipse(cx, sy + SHIP_H / 2 + 4, 8, 4, 0, 0, τ)
  ctx.fill()
  // Hit flash
  if (shipFlash > 0) {
    ctx.globalAlpha = 0.7 * (shipFlash / 5)
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = '#ffffff'
    ctx.shadowBlur = 20
    ctx.beginPath()
    ctx.arc(cx, sy, SHIP_W / 2 + 4, 0, τ)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

function drawObject(ctx: CanvasRenderingContext2D, obj: FallingObj, ts: number) {
  ctx.save()
  if (obj.isBomb) {
    ctx.shadowColor = '#f472b6'
    ctx.shadowBlur = 16
    ctx.fillStyle = '#f472b6'
    ctx.beginPath()
    ctx.arc(obj.x, obj.y, obj.r, 0, τ)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#030712'
    ctx.beginPath()
    ctx.arc(obj.x - 3, obj.y - 2, 2, 0, τ)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(obj.x + 3, obj.y - 2, 2, 0, τ)
    ctx.fill()
    ctx.fillRect(obj.x - 3, obj.y + 2, 6, 1.5)
  } else {
    const twinkle = 0.6 + 0.4 * Math.sin(ts * 0.005 + obj.twinkle)
    ctx.shadowColor = '#00ff88'
    ctx.shadowBlur = 18 * twinkle
    ctx.fillStyle = '#00ff88'
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const outerAngle = (i * τ) / 5 - Math.PI / 2
      const innerAngle = outerAngle + Math.PI / 5
      const ox = obj.x + Math.cos(outerAngle) * obj.r
      const oy = obj.y + Math.sin(outerAngle) * obj.r
      const ix = obj.x + Math.cos(innerAngle) * (obj.r * 0.42)
      const iy = obj.y + Math.sin(innerAngle) * (obj.r * 0.42)
      if (i === 0) ctx.moveTo(ox, oy)
      else ctx.lineTo(ox, oy)
      ctx.lineTo(ix, iy)
    }
    ctx.closePath()
    ctx.fill()
    ctx.shadowBlur = 6
    ctx.fillStyle = 'rgba(200,255,220,0.9)'
    ctx.beginPath()
    ctx.arc(obj.x, obj.y, obj.r * 0.2, 0, τ)
    ctx.fill()
  }
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
  drawStars(ctx, ts)

  if (state.value === 'playing') {
    if (leftDown)  shipX = Math.max(SHIP_W / 2, shipX - SHIP_SPEED * dt * 0.06)
    if (rightDown) shipX = Math.min(W - SHIP_W / 2, shipX + SHIP_SPEED * dt * 0.06)

    spawnTimer += dt
    if (spawnTimer > spawnInterval) {
      objects.push(newObject())
      spawnTimer = 0
      spawnInterval = Math.max(500, spawnInterval - 12)
    }

    const shipTopY = H - SHIP_H - 8 - SHIP_H / 2 - CATCH_ZONE
    const shipBotY = H - 8 + CATCH_ZONE

    const toRemove: number[] = []
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i]!
      obj.y += obj.vy

      if (
        obj.y + obj.r >= shipTopY &&
        obj.y - obj.r <= shipBotY &&
        obj.x >= shipX - SHIP_W / 2 - obj.r &&
        obj.x <= shipX + SHIP_W / 2 + obj.r
      ) {
        toRemove.push(i)
        if (obj.isBomb) {
          // Bomb caught — red particles, ship flash
          spawnParticles(obj.x, obj.y, '#f472b6', 8)
          sfxMiss()
          shipFlash = 5
          lives.value = Math.max(0, lives.value - 1)
          if (lives.value <= 0) {
            deathAnim = 1
            state.value = 'over'
            sfxLose()
          }
        } else {
          // Star caught — green particles, popup
          spawnParticles(obj.x, obj.y, '#00ff88', 7)
          spawnPopup(obj.x, H - SHIP_H - 30, '+1')
          score.value++
          sfxScore()
          speedMult = Math.min(2.5, speedMult + 0.025)
        }
      } else if (obj.y - obj.r > H + 10) {
        toRemove.push(i)
      }
    }
    for (const i of toRemove) objects.splice(i, 1)
    if (shipFlash > 0) shipFlash--
  }

  for (const obj of objects) drawObject(ctx, obj, ts)
  drawShip(ctx, ts)

  // Particles + popups
  updateParticles()
  drawParticles(ctx)
  drawPopups(ctx)

  // Death ring
  if (deathAnim > 0 && deathAnim <= 20) {
    const t = deathAnim / 20
    const sy = H - SHIP_H - 8
    const r = 10 + t * 60
    ctx.save()
    ctx.globalAlpha = (1 - t) * 0.8
    ctx.strokeStyle = '#f472b6'
    ctx.shadowColor = '#f472b6'
    ctx.shadowBlur = 20
    ctx.lineWidth = 3 * (1 - t) + 1
    ctx.beginPath()
    ctx.arc(shipX, sy, r, 0, τ)
    ctx.stroke()
    ctx.restore()
    deathAnim++
  }

  // Overlays
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.82)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    const pulse = 0.6 + 0.4 * Math.sin(ts * 0.003)
    ctx.save()
    ctx.shadowColor = '#00ff88'
    ctx.shadowBlur  = 20 + 14 * pulse
    ctx.fillStyle   = `rgba(0,255,136,${0.7 + 0.3 * pulse})`
    ctx.font = "bold 26px 'Space Grotesk', sans-serif"
    ctx.fillText('STAR CATCHER', W / 2, H / 2 - 28)
    ctx.restore()
    ctx.fillStyle = 'rgba(200,220,255,0.55)'
    ctx.font = "13px 'Courier New', monospace"
    ctx.fillText('Catch stars, dodge bombs', W / 2, H / 2 + 8)
    if (Math.floor(ts / 600) % 2 === 0) {
      ctx.fillStyle = 'rgba(200,220,255,0.35)'
      ctx.font = "12px 'Courier New', monospace"
      ctx.fillText('Press any arrow key to start', W / 2, H / 2 + 30)
    }
  }
}

function startGame() {
  objects = []
  spawnTimer = 0
  spawnInterval = 1100
  speedMult = 1
  shipX = W / 2
  score.value = 0
  lives.value = LIFE_MAX
  particles = []
  popups = []
  shipFlash = 0
  deathAnim = 0
  state.value = 'playing'
}

function restart() {
  objects = []
  spawnTimer = 0
  spawnInterval = 1100
  speedMult = 1
  shipX = W / 2
  score.value = 0
  lives.value = LIFE_MAX
  particles = []
  popups = []
  shipFlash = 0
  deathAnim = 0
  state.value = 'playing'
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    e.preventDefault()
    if (state.value === 'idle') { startGame(); return }
    if (state.value === 'over') return
    leftDown = true
  }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    e.preventDefault()
    if (state.value === 'idle') { startGame(); return }
    if (state.value === 'over') return
    rightDown = true
  }
}

function onKeyUp(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') leftDown = false
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') rightDown = false
}

function onTouchStart(e: TouchEvent) {
  e.preventDefault()
  if (state.value === 'idle') { startGame(); return }
  if (state.value === 'over') return
  const rect = canvasEl.value!.getBoundingClientRect()
  for (const t of Array.from(e.changedTouches)) {
    const cx = t.clientX - rect.left
    if (cx < rect.width / 2) leftDown = true
    else rightDown = true
  }
}

function onTouchEnd(e: TouchEvent) {
  e.preventDefault()
  leftDown = false
  rightDown = false
  const rect = canvasEl.value!.getBoundingClientRect()
  for (const t of Array.from(e.touches)) {
    const cx = t.clientX - rect.left
    if (cx < rect.width / 2) leftDown = true
    else rightDown = true
  }
}

onMounted(() => {
  if (canvasEl.value) { canvasEl.value.width = W; canvasEl.value.height = H }
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKeyUp)
  raf = requestAnimationFrame(frame)
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('keyup', onKeyUp)
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
        <p class="hud-label text-[10px]">LIVES</p>
        <p class="font-mono font-bold text-neon-pink text-lg leading-tight">
          <span v-for="i in LIFE_MAX" :key="i" :class="i <= lives ? 'opacity-100' : 'opacity-20'">♥</span>
        </p>
      </div>
    </div>
    <div class="relative">
      <canvas
        ref="canvasEl"
        class="rounded-xl border border-white/10 block touch-none"
        @touchstart="onTouchStart"
        @touchend="onTouchEnd"
      />
      <GameResultOverlay :state="state" :score="score" @restart="restart" />
    </div>
    <p class="font-mono text-xs text-slate-600">← → to move • catch stars • dodge bombs</p>
  </div>
</template>
