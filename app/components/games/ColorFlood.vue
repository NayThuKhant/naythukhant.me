<script setup lang="ts">
const { click: sfxClick, score: sfxScore, win: sfxWin, lose: sfxLose } = useGameSounds()

const COLS   = 6
const COLORS = ['#f472b6', '#00d4ff', '#00ff88', '#a855f7', '#fb923c', '#facc15']
const MAX_MOVES = 25
const GRID_SIZE = 12

type Grid = number[][]

const state     = ref<'idle' | 'playing' | 'won' | 'over'>('idle')
const grid      = ref<Grid>([])
const movesUsed = ref(0)
const score     = ref(0)
const regionSize = ref(1)

function makeGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => Math.floor(Math.random() * COLS))
  )
}

function startGame() {
  grid.value = makeGrid()
  movesUsed.value = 0
  score.value = 0
  regionSize.value = floodRegion(grid.value).size
  state.value = 'playing'
}

// Flood fill: returns set of [r,c] strings in region from (0,0)
function floodRegion(g: Grid): Set<string> {
  const startColor = g[0]![0]!
  const visited = new Set<string>()
  const queue: [number, number][] = [[0, 0]]
  while (queue.length) {
    const [r, c] = queue.shift()!
    const key = `${r},${c}`
    if (visited.has(key)) continue
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue
    if (g[r]![c] !== startColor) continue
    visited.add(key)
    queue.push([r-1,c],[r+1,c],[r,c-1],[r,c+1])
  }
  return visited
}

// Apply color flood: change region color and absorb neighbors
function applyFlood(g: Grid, colorIdx: number): Grid {
  const ng = g.map(row => [...row])
  const currentColor = ng[0]![0]!
  if (colorIdx === currentColor) return ng

  // Fill current connected region with new color using BFS from (0,0)
  const queue: [number, number][] = [[0, 0]]
  const visited = new Set<string>()
  while (queue.length) {
    const [r, c] = queue.shift()!
    const key = `${r},${c}`
    if (visited.has(key)) continue
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue
    if (ng[r]![c] !== currentColor) continue
    visited.add(key)
    ng[r]![c] = colorIdx
    queue.push([r-1,c],[r+1,c],[r,c-1],[r,c+1])
  }

  return ng
}

function pickColor(colorIdx: number) {
  if (state.value !== 'playing') return
  const currentColor = grid.value[0]![0]!
  if (colorIdx === currentColor) return

  sfxClick()
  const prevSize = floodRegion(grid.value).size
  const ng = applyFlood(grid.value, colorIdx)
  grid.value = ng
  movesUsed.value++

  const newRegion = floodRegion(ng)
  regionSize.value = newRegion.size

  if (newRegion.size > prevSize + 2) sfxScore()

  // Check win: entire grid is one color
  if (newRegion.size === GRID_SIZE * GRID_SIZE) {
    score.value = MAX_MOVES - movesUsed.value
    sfxWin()
    state.value = 'won'
    return
  }

  if (movesUsed.value >= MAX_MOVES) {
    score.value = 0
    sfxLose()
    state.value = 'over'
  }
}

function restart() { startGame() }
</script>

<template>
  <div class="flex flex-col items-center gap-4 select-none">
    <!-- HUD -->
    <div class="glass-hud px-4 py-2 flex items-center gap-3">
      <span class="hud-label">MOVES</span>
      <span class="font-mono font-bold text-neon-blue">{{ movesUsed }}</span>
      <span class="text-slate-600">/</span>
      <span class="font-mono font-bold text-slate-400">{{ MAX_MOVES }}</span>
      <span class="text-slate-600 mx-1">|</span>
      <span class="hud-label">COVERAGE</span>
      <span class="font-mono font-bold text-neon-emerald text-xs">
        {{ Math.round((regionSize / (GRID_SIZE * GRID_SIZE)) * 100) }}%
      </span>
    </div>

    <!-- Idle -->
    <div v-if="state === 'idle'" class="flex flex-col items-center gap-3">
      <p class="font-mono text-xs text-slate-500 text-center max-w-xs">
        Flood fill the entire 12×12 grid in ≤25 moves.<br>
        Your region starts at the top-left corner.<br>
        Pick a color to expand your territory!
      </p>
      <button class="btn-neon-blue mt-2" @click="startGame">START GAME</button>
    </div>

    <!-- Game board -->
    <div v-else class="relative flex flex-col items-center gap-3">
      <!-- Grid -->
      <div
        class="border border-white/10 rounded-lg overflow-hidden"
        style="display: grid; grid-template-columns: repeat(12, 1.75rem)"
      >
        <template v-for="(row, r) in grid" :key="r">
          <div
            v-for="(colorIdx, c) in row"
            :key="`${r}-${c}`"
            class="w-7 h-7 transition-colors duration-150"
            :style="{ backgroundColor: COLORS[colorIdx] }"
          />
        </template>
      </div>

      <!-- Color picker buttons -->
      <div class="flex gap-2 flex-wrap justify-center">
        <button
          v-for="(color, i) in COLORS"
          :key="i"
          class="w-9 h-9 rounded-lg border-2 transition-all hover:scale-110 active:scale-95"
          :style="{
            backgroundColor: color,
            borderColor: grid[0]?.[0] === i ? 'white' : 'transparent',
            opacity: grid[0]?.[0] === i ? '0.5' : '1',
          }"
          :disabled="state !== 'playing' || grid[0]?.[0] === i"
          @click="pickColor(i)"
        />
      </div>

      <!-- Move bar -->
      <div class="w-full max-w-xs h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-300"
          :class="movesUsed / MAX_MOVES > 0.8 ? 'bg-red-500' : movesUsed / MAX_MOVES > 0.6 ? 'bg-amber-500' : 'bg-neon-emerald'"
          :style="{ width: `${(movesUsed / MAX_MOVES) * 100}%` }"
        />
      </div>

      <GameResultOverlay
        v-if="state === 'won' || state === 'over'"
        :state="state"
        :score="score"
        :extra="state === 'won' ? `Flooded in ${movesUsed} moves!` : `${regionSize}/${GRID_SIZE * GRID_SIZE} cells covered`"
        @restart="restart"
      />
    </div>
  </div>
</template>
