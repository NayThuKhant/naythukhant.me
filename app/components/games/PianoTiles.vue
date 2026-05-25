<script setup lang="ts">
const W = 320, H = 480
const COLS = 4
const COL_W = W / COLS

const state  = ref<'idle' | 'playing' | 'over'>('idle')
const score  = ref(0)
const lives  = ref(3)
let raf = 0

interface Tile { col: number; y: number; h: number; hit: boolean; missed: boolean; flashAge: number }
let tiles: Tile[] = []
let speed = 3
let spawnTimer = 0
const SPAWN_INTERVAL = 60  // frames
const TILE_H = 80
const HIT_ZONE_Y = H - 80

const canvasEl = ref<HTMLCanvasElement | null>(null)

function reset() {
  tiles = []
  speed = 3
  score.value = 0
  lives.value = 3
  spawnTimer = 0
}

function spawnTile() {
  const col = Math.floor(Math.random() * COLS)
  tiles.push({ col, y: -TILE_H, h: TILE_H, hit: false, missed: false, flashAge: 0 })
}

function draw(ts: number) {
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, W, H)

  // Column dividers
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 1
  for (let i = 1; i < COLS; i++) {
    ctx.beginPath(); ctx.moveTo(i * COL_W, 0); ctx.lineTo(i * COL_W, H); ctx.stroke()
  }

  // Hit zone line
  ctx.strokeStyle = 'rgba(244,114,182,0.4)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(0, HIT_ZONE_Y); ctx.lineTo(W, HIT_ZONE_Y); ctx.stroke()

  // Update & draw tiles
  spawnTimer++
  if (spawnTimer >= SPAWN_INTERVAL) { spawnTile(); spawnTimer = 0 }

  for (const tile of tiles) {
    tile.y += speed
    if (tile.flashAge > 0) tile.flashAge++

    if (!tile.hit && !tile.missed && tile.y > HIT_ZONE_Y + tile.h) {
      tile.missed = true
      lives.value--
      if (lives.value <= 0) { state.value = 'over'; cancelAnimationFrame(raf); return }
    }

    const x = tile.col * COL_W
    if (tile.hit) {
      const alpha = Math.max(0, 1 - tile.flashAge / 15)
      ctx.fillStyle = `rgba(244,114,182,${alpha * 0.6})`
      ctx.fillRect(x + 2, tile.y, COL_W - 4, tile.h)
    } else if (tile.missed) {
      ctx.fillStyle = 'rgba(255,60,60,0.2)'
      ctx.fillRect(x + 2, tile.y, COL_W - 4, tile.h)
    } else {
      ctx.fillStyle = '#f472b6'
      ctx.shadowColor = '#f472b6'
      ctx.shadowBlur = 8
      ctx.fillRect(x + 2, tile.y, COL_W - 4, tile.h)
      ctx.shadowBlur = 0
    }
  }

  tiles = tiles.filter(t => t.y < H + 20 && !(t.hit && t.flashAge > 15))

  // Score display
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = "bold 20px 'JetBrains Mono', monospace"
  ctx.textAlign = 'center'
  ctx.fillText(String(score.value), W / 2, 40)

  // Lives
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < lives.value ? '#f472b6' : '#1e293b'
    ctx.shadowColor = i < lives.value ? '#f472b6' : 'transparent'
    ctx.shadowBlur = i < lives.value ? 8 : 0
    ctx.beginPath()
    ctx.arc(20 + i * 22, 65, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }

  // Idle overlay
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.85)'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#f472b6'
    ctx.shadowColor = '#f472b6'
    ctx.shadowBlur = 20
    ctx.font = "bold 22px 'Space Grotesk', sans-serif"
    ctx.textAlign = 'center'
    ctx.fillText('PIANO TILES', W/2, H/2 - 20)
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(200,200,255,0.5)'
    ctx.font = "12px 'JetBrains Mono', monospace"
    ctx.fillText('Click to start', W/2, H/2 + 16)
  }

  speed = 3 + Math.floor(score.value / 15) * 0.5

  raf = requestAnimationFrame(draw)
}

function hitTile(col: number) {
  for (let i = tiles.length - 1; i >= 0; i--) {
    const t = tiles[i]!
    if (t.col === col && !t.hit && !t.missed && t.y + t.h >= HIT_ZONE_Y - 20 && t.y <= HIT_ZONE_Y + t.h) {
      t.hit = true
      t.flashAge = 1
      score.value++
      return true
    }
  }
  return false
}

function onClick(e: MouseEvent) {
  const canvas = canvasEl.value
  if (!canvas) return

  if (state.value === 'idle') {
    reset()
    state.value = 'playing'
    return
  }

  if (state.value !== 'playing') return
  const rect = canvas.getBoundingClientRect()
  const x = (e.clientX - rect.left) * (W / rect.width)
  const col = Math.floor(x / COL_W)
  hitTile(col)
}

function onKey(e: KeyboardEvent) {
  if (state.value !== 'playing') return
  const map: Record<string, number> = { 'd': 0, 'f': 1, 'j': 2, 'k': 3, 'D': 0, 'F': 1, 'J': 2, 'K': 3 }
  if (e.key in map) hitTile(map[e.key]!)
}

function restart() {
  reset()
  state.value = 'playing'
}

onMounted(() => {
  const canvas = canvasEl.value
  if (canvas) { canvas.width = W; canvas.height = H }
  canvas?.addEventListener('click', onClick)
  window.addEventListener('keydown', onKey)
  raf = requestAnimationFrame(draw)
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  canvasEl.value?.removeEventListener('click', onClick)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 select-none">
    <div class="glass-hud px-6 py-2 flex items-center gap-6">
      <div class="text-center">
        <p class="hud-label text-[10px]">SCORE</p>
        <p class="font-mono font-bold text-white text-lg">{{ score }}</p>
      </div>
    </div>
    <div class="relative">
      <canvas ref="canvasEl" class="rounded-xl border border-white/10 block cursor-pointer" />
      <GameResultOverlay v-if="state === 'over'" :state="'over'" :score="score" @restart="restart" />
    </div>
    <p class="font-mono text-xs text-slate-600">Click the pink tiles before they pass the line • Keys: D F J K</p>
  </div>
</template>
