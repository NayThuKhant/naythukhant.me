<script setup lang="ts">
const W = 480, H = 520
const τ = Math.PI * 2

const { shoot: sfxShoot, explosion: sfxExplosion, score: sfxScore, win: sfxWin, lose: sfxLose, levelUp: sfxLevelUp } = useGameSounds()

const state = ref<'idle' | 'playing' | 'over' | 'won'>('idle')
const score = ref(0)
const wave  = ref(1)
let raf = 0

const canvasEl = ref<HTMLCanvasElement | null>(null)

const CITY_Y = H - 40
const CITY_POSITIONS = [60, 120, 180, 300, 360, 420]
const BASE_POSITIONS = [W * 0.15, W * 0.5, W * 0.85]

interface City { x: number; alive: boolean }
interface Base { x: number; ammo: number }
interface Missile { x: number; y: number; tx: number; ty: number; speed: number; alive: boolean }
interface Interceptor { x: number; y: number; tx: number; ty: number; speed: number; exploding: boolean; radius: number; maxRadius: number }
interface Explosion { x: number; y: number; radius: number; maxRadius: number; growing: boolean; color: string }

let cities: City[] = []
let bases: Base[] = []
let missiles: Missile[] = []
let interceptors: Interceptor[] = []
let explosions: Explosion[] = []
let spawnTimer = 0
let spawnInterval = 120

function initGame() {
  cities = CITY_POSITIONS.map(x => ({ x, alive: true }))
  bases = BASE_POSITIONS.map(x => ({ x, ammo: 15 }))
  missiles = []
  interceptors = []
  explosions = []
  spawnTimer = 0
  spawnInterval = 120
  score.value = 0
  wave.value = 1
}

function spawnMissile() {
  const aliveCities = cities.filter(c => c.alive)
  if (!aliveCities.length) return
  const target = aliveCities[Math.floor(Math.random() * aliveCities.length)]!
  missiles.push({
    x: Math.random() * W,
    y: 0,
    tx: target.x + (Math.random() - 0.5) * 30,
    ty: CITY_Y,
    speed: 0.8 + wave.value * 0.2,
    alive: true,
  })
}

function launch(mx: number, my: number) {
  // Find nearest base
  let nearest = bases[0]!
  let minDist = Infinity
  for (const base of bases) {
    if (base.ammo <= 0) continue
    const d = Math.hypot(base.x - mx, H - base.ammo * 0 - my)
    if (d < minDist) { minDist = d; nearest = base }
  }
  if (!nearest || nearest.ammo <= 0) return
  nearest.ammo--
  sfxShoot()
  interceptors.push({
    x: nearest.x, y: H - 20,
    tx: mx, ty: my,
    speed: 8, exploding: false, radius: 0, maxRadius: 40,
  })
}

function draw() {
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, W, H)

  // Stars
  for (let i = 0; i < 60; i++) {
    const x = ((i * 137 + 50) % W), y = ((i * 73 + 100) % (H - 100))
    ctx.fillStyle = `rgba(255,255,255,${0.1 + (i % 5) * 0.05})`
    ctx.fillRect(x, y, 1, 1)
  }

  // Ground
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, CITY_Y + 20, W, H - CITY_Y - 20)

  // Bases
  for (const base of bases) {
    ctx.fillStyle = base.ammo > 0 ? '#00d4ff' : '#1e293b'
    ctx.shadowColor = base.ammo > 0 ? '#00d4ff' : 'none'
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.moveTo(base.x - 15, CITY_Y + 20)
    ctx.lineTo(base.x + 15, CITY_Y + 20)
    ctx.lineTo(base.x, CITY_Y)
    ctx.closePath()
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = "8px monospace"
    ctx.textAlign = 'center'
    ctx.fillText(String(base.ammo), base.x, CITY_Y + 34)
  }

  // Cities
  for (const city of cities) {
    if (city.alive) {
      ctx.fillStyle = '#a855f7'
      ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 10
      // Simple city shape
      ctx.fillRect(city.x - 12, CITY_Y, 24, 20)
      ctx.fillRect(city.x - 8, CITY_Y - 12, 8, 12)
      ctx.fillRect(city.x + 2, CITY_Y - 8, 8, 8)
      ctx.shadowBlur = 0
    } else {
      ctx.fillStyle = '#374151'
      ctx.fillRect(city.x - 12, CITY_Y, 24, 10)
    }
  }

  if (state.value === 'playing') {
    spawnTimer++
    if (spawnTimer >= spawnInterval) {
      spawnMissile()
      spawnTimer = 0
      if (missiles.length > wave.value * 5) spawnInterval = Math.max(60, spawnInterval - 5)
    }

    // Update missiles
    for (const m of missiles) {
      if (!m.alive) continue
      const dx = m.tx - m.x, dy = m.ty - m.y
      const dist = Math.hypot(dx, dy)
      if (dist < m.speed) {
        m.x = m.tx; m.y = m.ty; m.alive = false
        for (const city of cities) {
          if (city.alive && Math.abs(city.x - m.tx) < 20) { city.alive = false; break }
        }
        explosions.push({ x: m.tx, y: m.ty, radius: 0, maxRadius: 30, growing: true, color: '#ff4444' })
      } else {
        m.x += (dx / dist) * m.speed
        m.y += (dy / dist) * m.speed
      }
    }

    // Update interceptors
    for (const icp of interceptors) {
      if (icp.exploding) {
        icp.radius += 2.5
        for (const m of missiles) {
          if (!m.alive) continue
          if (Math.hypot(m.x - icp.tx, m.y - icp.ty) < icp.radius) {
            m.alive = false; score.value += 25; sfxScore()
            explosions.push({ x: m.x, y: m.y, radius: 0, maxRadius: 15, growing: true, color: '#00d4ff' })
          }
        }
      } else {
        const dx = icp.tx - icp.x, dy = icp.ty - icp.y
        const dist = Math.hypot(dx, dy)
        if (dist < icp.speed) { icp.x = icp.tx; icp.y = icp.ty; icp.exploding = true }
        else { icp.x += (dx / dist) * icp.speed; icp.y += (dy / dist) * icp.speed }
      }
    }

    // Update explosions
    for (const exp of explosions) {
      if (exp.growing) { exp.radius += 2; if (exp.radius >= exp.maxRadius) exp.growing = false }
      else exp.radius -= 1.5
    }

    missiles = missiles.filter(m => m.alive)
    interceptors = interceptors.filter(i => i.radius < i.maxRadius)
    explosions = explosions.filter(e => e.radius > 0)

    // Check wave clear
    if (missiles.length === 0 && interceptors.length === 0 && spawnTimer === 0) {
      const count = cities.filter(c => c.alive).length
      if (wave.value >= 5) {
        score.value += count * 100
        if (count > 0) { sfxWin(); state.value = 'won' } else { sfxLose(); state.value = 'over' }
        return
      } else if (count > 0) {
        sfxLevelUp()
        wave.value++
        spawnInterval = Math.max(50, 120 - wave.value * 15)
        for (const base of bases) base.ammo = 15
      }
    }

    // Check game over
    if (!cities.some(c => c.alive)) { sfxLose(); state.value = 'over'; return }
  }

  // Draw missiles
  for (const m of missiles) {
    ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6
    ctx.beginPath(); ctx.moveTo(m.x, m.y - 20); ctx.lineTo(m.x, m.y); ctx.stroke()
    ctx.globalAlpha = 1
    ctx.fillStyle = '#ff6666'; ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 6
    ctx.beginPath(); ctx.arc(m.x, m.y, 3, 0, τ); ctx.fill(); ctx.shadowBlur = 0
  }

  // Draw interceptors
  for (const icp of interceptors) {
    if (icp.exploding) {
      ctx.strokeStyle = '#00d4ff'; ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 15; ctx.lineWidth = 2
      ctx.globalAlpha = Math.max(0, 1 - icp.radius / icp.maxRadius)
      ctx.beginPath(); ctx.arc(icp.tx, icp.ty, icp.radius, 0, τ); ctx.stroke()
      ctx.globalAlpha = 1; ctx.shadowBlur = 0
    } else {
      ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.8
      ctx.beginPath(); ctx.moveTo(icp.x, icp.y + 10); ctx.lineTo(icp.x, icp.y); ctx.stroke()
      ctx.globalAlpha = 1
      ctx.fillStyle = '#00d4ff'; ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 8
      ctx.beginPath(); ctx.arc(icp.x, icp.y, 3, 0, τ); ctx.fill(); ctx.shadowBlur = 0
    }
  }

  // Draw explosions
  for (const exp of explosions) {
    ctx.strokeStyle = exp.color; ctx.shadowColor = exp.color; ctx.shadowBlur = 10
    ctx.globalAlpha = exp.radius / exp.maxRadius * 0.8; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(exp.x, exp.y, exp.radius, 0, τ); ctx.stroke()
    ctx.globalAlpha = 1; ctx.shadowBlur = 0
  }

  // Wave info
  if (state.value === 'playing') {
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = "12px 'JetBrains Mono', monospace"; ctx.textAlign = 'left'
    ctx.fillText(`Wave ${wave.value}/5  Score: ${score.value}`, 10, 20)
  }

  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.87)'; ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#f472b6'; ctx.shadowColor = '#f472b6'; ctx.shadowBlur = 20
    ctx.font = "bold 26px 'Space Grotesk', sans-serif"; ctx.textAlign = 'center'
    ctx.fillText('MISSILE COMMAND', W/2, H/2 - 24); ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(200,220,255,0.5)'
    ctx.font = "12px 'JetBrains Mono', monospace"
    ctx.fillText('Click to launch interceptors', W/2, H/2 + 12)
    ctx.fillText('Protect your cities across 5 waves', W/2, H/2 + 30)
  }

  raf = requestAnimationFrame(draw)
}

function onClick(e: MouseEvent) {
  if (state.value === 'idle') { initGame(); state.value = 'playing'; raf = requestAnimationFrame(draw); return }
  if (state.value !== 'playing') return
  const canvas = canvasEl.value!
  const rect = canvas.getBoundingClientRect()
  const mx = (e.clientX - rect.left) * (W / rect.width)
  const my = (e.clientY - rect.top) * (H / rect.height)
  launch(mx, my)
}

function restart() { initGame(); state.value = 'playing'; raf = requestAnimationFrame(draw) }

onMounted(() => {
  const canvas = canvasEl.value
  if (canvas) { canvas.width = W; canvas.height = H }
  canvas?.addEventListener('click', onClick)
  raf = requestAnimationFrame(draw)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  canvasEl.value?.removeEventListener('click', onClick)
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 select-none">
    <div class="glass-hud px-6 py-2 flex items-center gap-6">
      <div class="text-center">
        <p class="hud-label text-[10px]">SCORE</p>
        <p class="font-mono font-bold text-white text-lg">{{ score }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">WAVE</p>
        <p class="font-mono font-bold text-white text-lg">{{ wave }} / 5</p>
      </div>
    </div>
    <div class="relative">
      <canvas ref="canvasEl" class="rounded-xl border border-white/10 block cursor-crosshair" />
      <GameResultOverlay
        v-if="state === 'over' || state === 'won'"
        :state="state === 'won' ? 'won' : 'over'"
        :score="score"
        @restart="restart"
      />
    </div>
    <p class="font-mono text-xs text-slate-600">Click to launch interceptors — protect your purple cities</p>
  </div>
</template>
