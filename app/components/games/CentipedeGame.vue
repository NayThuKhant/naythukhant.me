<script setup lang="ts">
const W = 480, H = 520
const CELL = 20
const COLS = W / CELL, ROWS = H / CELL  // 24 x 26
const τ = Math.PI * 2

const { shoot: sfxShoot, pop: sfxPop, die: sfxDie, win: sfxWin, lose: sfxLose } = useGameSounds()

const state = ref<'idle' | 'playing' | 'over' | 'won'>('idle')
const score = ref(0)
const lives = ref(3)
let raf = 0

const canvasEl = ref<HTMLCanvasElement | null>(null)

interface Segment { col: number; row: number; alive: boolean }
interface Mushroom { col: number; row: number; hp: number }
interface Bullet { x: number; y: number; alive: boolean }
interface Spider { x: number; y: number; vx: number; vy: number; alive: boolean }
interface Particle { x: number; y: number; vx: number; vy: number; age: number; color: string }

let segments: Segment[] = []
let mushrooms: Mushroom[] = []
let bullets: Bullet[] = []
let spiders: Spider[] = []
let particles: Particle[] = []
let playerX = W / 2
let centiDir = 1     // 1=right, -1=left
let centiMoveTimer = 0
let shootCooldown = 0
let spiderTimer = 0
let keys = { left: false, right: false, fire: false }

function spawnParticles(x: number, y: number, color: string, n = 6) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * τ
    const spd = 1 + Math.random() * 3
    particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, age: 0, color })
  }
}

function buildCentipede(headRow: number, headCol: number, length: number): Segment[] {
  return Array.from({ length }, (_, i) => ({ col: headCol - i, row: headRow, alive: true }))
}

function initGame() {
  segments = buildCentipede(0, COLS - 1, 12)
  mushrooms = []
  for (let i = 0; i < 30; i++) {
    mushrooms.push({
      col: Math.floor(Math.random() * COLS),
      row: 2 + Math.floor(Math.random() * (ROWS - 6)),
      hp: 4,
    })
  }
  bullets = []
  spiders = []
  particles = []
  playerX = W / 2
  centiDir = 1
  centiMoveTimer = 0
  shootCooldown = 0
  spiderTimer = 0
}

function startGame() {
  initGame()
  score.value = 0
  lives.value = 3
  state.value = 'playing'
}

function die() {
  lives.value--
  sfxDie()
  spawnParticles(playerX, H - CELL, '#00d4ff', 12)
  if (lives.value <= 0) { sfxLose(); state.value = 'over'; cancelAnimationFrame(raf); return }
  setTimeout(() => {
    playerX = W / 2
    bullets = []
  }, 400)
}

function moveCentipede() {
  const alive = segments.filter(s => s.alive)
  if (!alive.length) { sfxWin(); state.value = 'won'; cancelAnimationFrame(raf); return }

  const head = alive[0]!
  let drop = false

  for (const seg of alive) {
    const nextCol = seg.col + centiDir
    // Check wall or mushroom
    const mushroomHit = mushrooms.some(m => m.hp > 0 && m.col === nextCol && m.row === seg.row)
    if (nextCol < 0 || nextCol >= COLS || mushroomHit) { drop = true; break }
  }

  if (drop) {
    for (const seg of alive) seg.row++
    centiDir = -centiDir
    if (head.row >= ROWS - 2) {
      // Centipede reached bottom
      die()
      for (const seg of alive) seg.row = 0
      centiDir = 1
    }
  } else {
    for (const seg of alive) seg.col += centiDir
  }
}

function draw() {
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, W, H)

  // Player zone
  ctx.fillStyle = 'rgba(0,212,255,0.04)'
  ctx.fillRect(0, H - CELL * 3, W, CELL * 3)

  // Mushrooms
  for (const m of mushrooms) {
    if (m.hp <= 0) continue
    const x = m.col * CELL + CELL/2, y = m.row * CELL + CELL/2
    const alpha = m.hp / 4
    ctx.fillStyle = `rgba(0,255,136,${alpha * 0.8})`
    ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 4
    ctx.beginPath(); ctx.arc(x, y, CELL/2 - 2, 0, τ); ctx.fill()
    ctx.shadowBlur = 0
  }

  // Centipede
  centiMoveTimer++
  if (centiMoveTimer >= 8) { moveCentipede(); centiMoveTimer = 0 }

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i]!
    if (!s.alive) continue
    const x = s.col * CELL + CELL/2, y = s.row * CELL + CELL/2
    ctx.fillStyle = i === 0 ? '#a855f7' : '#7c3aed'
    ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 8
    ctx.beginPath(); ctx.arc(x, y, CELL/2 - 1, 0, τ); ctx.fill()
    ctx.shadowBlur = 0
    // Eyes on head
    if (i === 0) {
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(x - 4, y - 3, 2.5, 0, τ); ctx.fill()
      ctx.beginPath(); ctx.arc(x + 4, y - 3, 2.5, 0, τ); ctx.fill()
    }
  }

  // Player
  if (state.value === 'playing') {
    const spd = 3.5
    if (keys.left)  playerX = Math.max(CELL/2, playerX - spd)
    if (keys.right) playerX = Math.min(W - CELL/2, playerX + spd)
    if (keys.fire && shootCooldown <= 0) {
      bullets.push({ x: playerX, y: H - CELL * 1.5, alive: true })
      sfxShoot()
      shootCooldown = 12
    }
    if (shootCooldown > 0) shootCooldown--

    // Player ship
    const py = H - CELL * 1.5
    ctx.fillStyle = '#00d4ff'; ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.moveTo(playerX, py - 10)
    ctx.lineTo(playerX - 12, py + 10)
    ctx.lineTo(playerX + 12, py + 10)
    ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0
  }

  // Bullets
  for (const b of bullets) {
    b.y -= 8
    if (b.y < 0) { b.alive = false; continue }
    ctx.fillStyle = '#00d4ff'; ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 8
    ctx.fillRect(b.x - 2, b.y - 8, 4, 12); ctx.shadowBlur = 0

    // Hit mushroom
    for (const m of mushrooms) {
      if (m.hp <= 0) continue
      if (Math.abs(b.x - (m.col * CELL + CELL/2)) < CELL/2 && Math.abs(b.y - (m.row * CELL + CELL/2)) < CELL/2) {
        m.hp--; b.alive = false
        if (m.hp <= 0) spawnParticles(m.col * CELL + CELL/2, m.row * CELL + CELL/2, '#00ff88', 4)
        break
      }
    }

    // Hit centipede segment
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i]!
      if (!s.alive || !b.alive) continue
      if (Math.abs(b.x - (s.col * CELL + CELL/2)) < CELL/2 && Math.abs(b.y - (s.row * CELL + CELL/2)) < CELL/2) {
        s.alive = false; b.alive = false
        sfxPop()
        score.value += i === 0 ? 100 : 10
        mushrooms.push({ col: s.col, row: s.row, hp: 4 })
        spawnParticles(s.col * CELL + CELL/2, s.row * CELL + CELL/2, '#a855f7', 8)
        break
      }
    }
  }
  bullets = bullets.filter(b => b.alive)

  // Spiders
  spiderTimer++
  if (spiderTimer >= 200) {
    spiderTimer = 0
    spiders.push({ x: Math.random() < 0.5 ? -20 : W + 20, y: H - CELL * 4, vx: (Math.random() < 0.5 ? 1 : -1) * 2, vy: 0, alive: true })
  }
  for (const sp of spiders) {
    sp.x += sp.vx; sp.y += sp.vy
    sp.vy += (Math.random() - 0.5) * 0.5
    sp.vy = Math.max(-2, Math.min(2, sp.vy))
    sp.y = Math.max(H - CELL * 6, Math.min(H - CELL * 2, sp.y))
    if (sp.x < -30 || sp.x > W + 30) sp.alive = false

    ctx.fillStyle = '#fb923c'; ctx.shadowColor = '#fb923c'; ctx.shadowBlur = 8
    ctx.beginPath(); ctx.arc(sp.x, sp.y, 8, 0, τ); ctx.fill(); ctx.shadowBlur = 0

    // Spider hits player
    if (Math.hypot(sp.x - playerX, sp.y - (H - CELL * 1.5)) < 18) { sp.alive = false; die() }

    // Bullet hits spider
    for (const b of bullets) {
      if (!b.alive || !sp.alive) continue
      if (Math.hypot(b.x - sp.x, b.y - sp.y) < 14) {
        b.alive = false; sp.alive = false; score.value += 300
        spawnParticles(sp.x, sp.y, '#fb923c', 10)
      }
    }
  }
  spiders = spiders.filter(s => s.alive)

  // Particles
  for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.age++ }
  for (const p of particles) {
    const alpha = Math.max(0, 1 - p.age / 20)
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 4
    ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, τ); ctx.fill()
    ctx.shadowBlur = 0
  }
  ctx.globalAlpha = 1
  particles = particles.filter(p => p.age < 20)

  // HUD
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = "12px 'JetBrains Mono', monospace"
  ctx.textAlign = 'left'
  ctx.fillText(`Score: ${score.value}`, 8, 20)
  ctx.textAlign = 'right'
  ctx.fillText('♥'.repeat(lives.value), W - 8, 20)

  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.87)'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#a855f7'; ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 20
    ctx.font = "bold 26px 'Space Grotesk', sans-serif"; ctx.textAlign = 'center'
    ctx.fillText('CENTIPEDE', W/2, H/2 - 20); ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(200,220,255,0.5)'
    ctx.font = "12px 'JetBrains Mono', monospace"
    ctx.fillText('← → to move • SPACE to shoot', W/2, H/2 + 14)
    ctx.fillText('Click to start', W/2, H/2 + 34)
  }

  if (state.value === 'playing') raf = requestAnimationFrame(draw)
}

function onKey(e: KeyboardEvent) {
  if (state.value === 'idle') { startGame(); raf = requestAnimationFrame(draw); return }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); keys.left = true }
  if (e.key === 'ArrowRight') { e.preventDefault(); keys.right = true }
  if (e.key === ' ')          { e.preventDefault(); keys.fire = true }
}
function onKeyUp(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft')  keys.left = false
  if (e.key === 'ArrowRight') keys.right = false
  if (e.key === ' ')          keys.fire = false
}
function onClick() { if (state.value === 'idle') { startGame(); raf = requestAnimationFrame(draw) } }
function restart() { initGame(); score.value = 0; lives.value = 3; state.value = 'playing'; raf = requestAnimationFrame(draw) }

onMounted(() => {
  const canvas = canvasEl.value
  if (canvas) { canvas.width = W; canvas.height = H }
  canvas?.addEventListener('click', onClick)
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKeyUp)
  raf = requestAnimationFrame(draw)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  canvasEl.value?.removeEventListener('click', onClick)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('keyup', onKeyUp)
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
        <p class="hud-label text-[10px]">LIVES</p>
        <p class="font-mono font-bold text-white text-lg">{{ lives }}</p>
      </div>
    </div>
    <div class="relative">
      <canvas ref="canvasEl" class="rounded-xl border border-white/10 block cursor-pointer" />
      <GameResultOverlay
        v-if="state === 'over' || state === 'won'"
        :state="state === 'won' ? 'won' : 'over'"
        :score="score"
        @restart="restart"
      />
    </div>
    <p class="font-mono text-xs text-slate-600">← → to move • SPACE to shoot • Destroy all centipede segments</p>
  </div>
</template>
