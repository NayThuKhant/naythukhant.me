<script setup lang="ts">
const SIZE = 5
const state = ref<'idle' | 'playing' | 'won'>('idle')
const grid = ref<boolean[][]>([])
const moves = ref(0)
const score = ref(0)

function applyToggle(g: boolean[][], r: number, c: number): boolean[][] {
  const result = g.map(row => [...row])
  for (const [dr, dc] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]] as const) {
    const nr = r + dr, nc = c + dc
    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) result[nr]![nc] = !result[nr]![nc]
  }
  return result
}

function startGame() {
  let g: boolean[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(false))
  const clicks = 6 + Math.floor(Math.random() * 8)
  for (let i = 0; i < clicks; i++) {
    g = applyToggle(g, Math.floor(Math.random() * SIZE), Math.floor(Math.random() * SIZE))
  }
  if (g.every(row => row.every(c => !c))) g[2]![2] = true
  grid.value = g
  moves.value = 0
  state.value = 'playing'
}

function click(r: number, c: number) {
  if (state.value !== 'playing') return
  grid.value = applyToggle(grid.value, r, c)
  moves.value++
  if (grid.value.every(row => row.every(cell => !cell))) {
    score.value = moves.value
    state.value = 'won'
  }
}

function restart() { startGame() }
</script>

<template>
  <div class="flex flex-col items-center gap-6 select-none">
    <div class="glass-hud px-6 py-2 flex items-center gap-6">
      <div class="text-center">
        <p class="hud-label text-[10px]">MOVES</p>
        <p class="font-mono font-bold text-white text-lg">{{ moves }}</p>
      </div>
    </div>

    <div v-if="state === 'idle'" class="flex flex-col items-center gap-3">
      <p class="font-mono text-xs text-slate-500 text-center max-w-xs">
        Turn all lights OFF. Clicking a cell flips it and its 4 neighbors.
      </p>
      <button class="btn-neon-purple mt-2" @click="startGame">START GAME</button>
    </div>

    <div v-else class="relative flex flex-col items-center gap-4">
      <div class="grid gap-2" style="grid-template-columns: repeat(5, 3.5rem)">
        <template v-for="(row, r) in grid" :key="r">
          <button
            v-for="(cell, c) in row"
            :key="`${r}-${c}`"
            class="h-14 rounded-lg border-2 transition-all duration-100 focus:outline-none"
            :class="cell
              ? 'bg-purple-500/80 border-purple-400 shadow-[0_0_16px_#a855f7]'
              : 'bg-slate-900 border-slate-700 hover:border-slate-500'"
            @click="click(r, c)"
          />
        </template>
      </div>
      <GameResultOverlay v-if="state === 'won'" :state="state" :score="moves" @restart="restart" />
    </div>

    <p v-if="state === 'playing'" class="font-mono text-xs text-slate-600">Click cells to toggle lights</p>
  </div>
</template>
