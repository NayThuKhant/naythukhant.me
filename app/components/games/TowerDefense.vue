<script setup lang="ts">
const canvasEl = ref<HTMLCanvasElement | null>(null)
const score    = ref(0)
const state    = ref<'idle' | 'playing' | 'won' | 'over'>('idle')

const CELL = 40, COLS = 12, ROWS = 12
const W = COLS * CELL, H = ROWS * CELL

const PATH: [number, number][] = [
  [0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[2,4],[3,4],[3,5],[3,6],[3,7],[3,8],
  [4,8],[5,8],[6,8],[6,7],[6,6],[6,5],[6,4],[6,3],[7,3],[8,3],[9,3],[10,3],
  [10,4],[10,5],[10,6],[10,7],[10,8],[10,9],[10,10],[11,10],[11,11],
]
const PATH_SET = new Set(PATH.map(([r, c]) => `${r},${c}`))
const BASE_ROW = 11, BASE_COL = 11

const { shoot: sfxShoot, pop: sfxPop, explosion: sfxExplosion, levelUp: sfxLevelUp, win: sfxWin, lose: sfxLose } = useGameSounds()

let raf = 0
let titlePulse = 0
let lives = 10
let money = 200
let wave = 0
let turrets: Turret[] = []
let enemies: Enemy[] = []
let bullets: Bullet[] = []
let waveTimer = 0
let spawned = 0
let spawnInterval = 0
let betweenWaves = false
let betweenTimer = 0
let frame = 0

interface Turret { row: number; col: number; cooldown: number }
interface Enemy  { x: number; y: number; hp: number; maxHp: number; pathIdx: number; id: number; dead: boolean }
interface Bullet { x: number; y: number; tx: number; ty: number; targetId: number; damage: number }

let enemyId = 0
const TOTAL_WAVES = 10

function pathPos(idx: number): { x: number; y: number } {
  const [r, c] = PATH[idx] ?? PATH[PATH.length - 1]!
  return { x: c! * CELL + CELL / 2, y: r! * CELL + CELL / 2 }
}

function reset() {
  lives = 10; money = 200; wave = 0; turrets = []; enemies = []; bullets = []
  waveTimer = 0; spawned = 0; spawnInterval = 0; betweenWaves = false; betweenTimer = 0; frame = 0; score.value = 0
}

function startGame() { reset(); state.value = 'playing'; startWave() }
function restart() { reset(); state.value = 'playing'; startWave() }

function startWave() {
  wave++
  spawned = 0
  spawnInterval = 0
  const count = wave * 3
  waveTimer = count
  betweenWaves = false
}

function spawnEnemy() {
  const start = pathPos(0)
  enemies.push({ x: start.x, y: start.y, hp: 50 + wave * 20, maxHp: 50 + wave * 20, pathIdx: 0, id: enemyId++, dead: false })
}

function onCanvasClick(e: MouseEvent) {
  if (state.value === 'idle') { startGame(); return }
  if (state.value !== 'playing') return
  const rect = canvasEl.value!.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const col = Math.floor(mx / CELL)
  const row = Math.floor(my / CELL)
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return
  if (PATH_SET.has(`${row},${col}`)) return
  if (turrets.some(t => t.row === row && t.col === col)) return
  if (money < 50) return
  money -= 50
  turrets.push({ row, col, cooldown: 0 })
}

function dist(ax: number, ay: number, bx: number, by: number) { return Math.hypot(ax - bx, ay - by) }

function drawArrow(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string) {
  ctx.save()
  ctx.shadowColor = color; ctx.shadowBlur = 10
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(cx, cy - 12)
  ctx.lineTo(cx + 10, cy + 8)
  ctx.lineTo(cx, cy + 3)
  ctx.lineTo(cx - 10, cy + 8)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function gameLoop(ts: number) {
  raf = requestAnimationFrame(gameLoop)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return
  titlePulse = ts
  frame++

  ctx.fillStyle = '#0a0f1a'
  ctx.fillRect(0, 0, W, H)

  if (state.value === 'playing') {
    // Spawn
    if (!betweenWaves) {
      spawnInterval++
      const spawnRate = Math.max(30, 80 - wave * 5)
      if (spawnInterval >= spawnRate && spawned < wave * 3) {
        spawnEnemy(); spawned++; spawnInterval = 0
      }
    }

    // Move enemies
    for (const e of enemies) {
      if (e.dead) continue
      const target = pathPos(Math.min(e.pathIdx + 1, PATH.length - 1))
      const dx = target.x - e.x, dy = target.y - e.y
      const d = Math.hypot(dx, dy)
      const speed = 1.2
      if (d < speed) {
        e.pathIdx++
        if (e.pathIdx >= PATH.length - 1) {
          // Reached base
          e.dead = true
          lives--
          sfxExplosion()
          if (lives <= 0) { state.value = 'over'; sfxLose(); return }
        }
      } else {
        e.x += (dx / d) * speed
        e.y += (dy / d) * speed
      }
    }

    // Turrets fire
    for (const t of turrets) {
      if (t.cooldown > 0) { t.cooldown--; continue }
      const tx = t.col * CELL + CELL / 2
      const ty = t.row * CELL + CELL / 2
      let closest: Enemy | null = null
      let minD = Infinity
      for (const e of enemies) {
        if (e.dead) continue
        const d = dist(tx, ty, e.x, e.y)
        if (d <= 80 && d < minD) { minD = d; closest = e }
      }
      if (closest) {
        bullets.push({ x: tx, y: ty, tx: closest.x, ty: closest.y, targetId: closest.id, damage: 25 })
        t.cooldown = 60
        sfxShoot()
      }
    }

    // Move bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i]!
      const dx = b.tx - b.x, dy = b.ty - b.y
      const d = Math.hypot(dx, dy)
      const speed = 6
      if (d < speed) {
        // Hit
        const target = enemies.find(e => e.id === b.targetId)
        if (target && !target.dead) {
          target.hp -= b.damage
          if (target.hp <= 0) {
            target.dead = true
            money += 10
            score.value += 50
            sfxPop()
          }
        }
        bullets.splice(i, 1)
      } else {
        b.x += (dx / d) * speed
        b.y += (dy / d) * speed
      }
    }

    enemies = enemies.filter(e => !e.dead)

    // Check wave end
    if (!betweenWaves && spawned >= wave * 3 && enemies.length === 0) {
      sfxLevelUp()
      if (wave >= TOTAL_WAVES) { state.value = 'won'; sfxWin(); return }
      betweenWaves = true
      betweenTimer = 180 // 3 seconds at 60fps
    }
    if (betweenWaves) {
      betweenTimer--
      if (betweenTimer <= 0) startWave()
    }
  }

  // Draw grid cells
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const isPath = PATH_SET.has(`${r},${c}`)
      const isBase = r === BASE_ROW && c === BASE_COL
      ctx.fillStyle = isPath ? '#0d2d2a' : '#111827'
      ctx.fillRect(c * CELL, r * CELL, CELL, CELL)
      if (!isPath && !isBase) {
        ctx.strokeStyle = 'rgba(255,255,255,0.04)'
        ctx.lineWidth = 0.5
        ctx.strokeRect(c * CELL, r * CELL, CELL, CELL)
      }
    }
  }

  // Draw path outline
  ctx.strokeStyle = '#14534a'
  ctx.lineWidth = 1
  for (const [r, c] of PATH) {
    ctx.strokeRect(c! * CELL, r! * CELL, CELL, CELL)
  }

  // Draw base
  const bx = BASE_COL * CELL, by = BASE_ROW * CELL
  ctx.save()
  ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 20
  ctx.fillStyle = 'rgba(168,85,247,0.3)'
  ctx.fillRect(bx + 4, by + 4, CELL - 8, CELL - 8)
  ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2
  ctx.strokeRect(bx + 4, by + 4, CELL - 8, CELL - 8)
  ctx.restore()

  // Draw turrets
  for (const t of turrets) {
    const cx = t.col * CELL + CELL / 2
    const cy = t.row * CELL + CELL / 2
    drawArrow(ctx, cx, cy, '#00d4ff')
    // Range ring (subtle)
    ctx.save()
    ctx.strokeStyle = 'rgba(0,212,255,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(cx, cy, 80, 0, Math.PI * 2); ctx.stroke()
    ctx.restore()
  }

  // Draw enemies
  for (const e of enemies) {
    ctx.save()
    ctx.shadowColor = '#f472b6'; ctx.shadowBlur = 10
    ctx.fillStyle = '#f472b6'
    ctx.beginPath(); ctx.arc(e.x, e.y, 10, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
    // HP bar
    const bw = 20, bh = 3
    const bx2 = e.x - bw / 2, by2 = e.y - 16
    ctx.fillStyle = '#1f2937'
    ctx.fillRect(bx2, by2, bw, bh)
    ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#00ff88' : '#fb923c'
    ctx.fillRect(bx2, by2, bw * (e.hp / e.maxHp), bh)
  }

  // Draw bullets
  ctx.save()
  ctx.fillStyle = '#facc15'
  ctx.shadowColor = '#facc15'; ctx.shadowBlur = 8
  for (const b of bullets) {
    ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()

  // HUD
  ctx.fillStyle = 'rgba(3,7,18,0.75)'
  ctx.fillRect(0, 0, W, 32)
  ctx.font = "11px 'Courier New', monospace"
  ctx.textAlign = 'left'
  ctx.fillStyle = '#f472b6'; ctx.fillText(`♥ ${lives}`, 8, 20)
  ctx.fillStyle = '#facc15'; ctx.fillText(`$ ${money}`, 72, 20)
  ctx.fillStyle = '#00d4ff'; ctx.fillText(`Wave ${wave}/${TOTAL_WAVES}`, 144, 20)
  ctx.fillStyle = '#a855f7'; ctx.fillText(`Score ${score.value}`, 260, 20)
  if (betweenWaves) {
    ctx.fillStyle = '#00ff88'
    ctx.textAlign = 'right'
    ctx.fillText(`Next wave in ${Math.ceil(betweenTimer / 60)}s`, W - 8, 20)
  }

  // Idle
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.82)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    const pulse = 0.5 + 0.5 * Math.sin(titlePulse * 0.003)
    ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 8 + pulse * 18
    ctx.fillStyle = '#00d4ff'
    ctx.font = "bold 26px 'Space Grotesk', sans-serif"
    ctx.fillText('TOWER DEFENSE', W / 2, H / 2 - 30)
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(200,220,255,0.45)'
    ctx.font = "13px 'Courier New', monospace"
    ctx.fillText('Click to start', W / 2, H / 2 + 10)
    ctx.fillText('Click empty cells to place turrets ($50)', W / 2, H / 2 + 32)
  }
}

onMounted(() => {
  const c = canvasEl.value!
  c.width = W; c.height = H
  c.addEventListener('click', onCanvasClick)
  raf = requestAnimationFrame(gameLoop)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  canvasEl.value?.removeEventListener('click', onCanvasClick)
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 select-none">
    <div class="glass-hud px-6 py-2 flex gap-6 items-center">
      <div class="text-center">
        <p class="hud-label text-[10px]">LIVES</p>
        <p class="font-mono font-bold text-neon-pink text-lg leading-tight">{{ state === 'playing' ? lives : '—' }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">MONEY</p>
        <p class="font-mono font-bold text-yellow-400 text-lg leading-tight">${{ state === 'playing' ? money : '—' }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">WAVE</p>
        <p class="font-mono font-bold text-neon-blue text-lg leading-tight">{{ state === 'playing' ? wave : '—' }}/10</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">SCORE</p>
        <p class="font-mono font-bold text-white text-lg leading-tight">{{ score }}</p>
      </div>
    </div>

    <div class="relative">
      <canvas ref="canvasEl" class="rounded-xl border border-white/10 block cursor-pointer" />
      <GameResultOverlay
        v-if="state === 'won' || state === 'over'"
        :state="state"
        :score="score"
        :extra="state === 'won' ? 'All waves survived!' : 'Base destroyed!'"
        @restart="restart"
      />
    </div>
    <p class="font-mono text-xs text-slate-600">Click empty cells to place turrets ($50 each) • Defend for 10 waves</p>
  </div>
</template>
