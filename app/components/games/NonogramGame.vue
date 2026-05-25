<script setup lang="ts">
// Pre-built 8×8 nonogram puzzles (solution + row/col clues)
const PUZZLES = [
  {
    solution: [
      [0,0,1,1,1,1,0,0],
      [0,1,1,0,0,1,1,0],
      [1,1,0,0,0,0,1,1],
      [1,1,0,0,0,0,1,1],
      [1,1,1,1,1,1,1,1],
      [1,1,0,0,0,0,1,1],
      [1,1,0,0,0,0,1,1],
      [0,0,1,1,1,1,0,0],
    ],
    name: 'Diamond Frame',
  },
  {
    solution: [
      [0,0,0,1,1,0,0,0],
      [0,0,1,1,1,1,0,0],
      [0,1,1,0,0,1,1,0],
      [1,1,0,0,0,0,1,1],
      [1,1,1,1,1,1,1,1],
      [1,1,0,0,0,0,1,1],
      [1,1,0,0,0,0,1,1],
      [1,1,0,0,0,0,1,1],
    ],
    name: 'Rocket',
  },
  {
    solution: [
      [0,1,1,1,1,1,1,0],
      [1,1,0,0,0,0,1,1],
      [1,1,0,0,0,0,1,1],
      [0,1,1,0,0,1,1,0],
      [0,0,1,1,1,1,0,0],
      [0,0,1,0,0,1,0,0],
      [0,1,1,0,0,1,1,0],
      [1,1,0,0,0,0,1,1],
    ],
    name: 'Figure',
  },
  {
    solution: [
      [1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,0,1],
      [1,0,1,0,0,1,0,1],
      [1,0,1,0,0,1,0,1],
      [1,0,1,1,1,1,0,1],
      [1,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1],
    ],
    name: 'Frame',
  },
  {
    solution: [
      [0,0,1,1,1,1,0,0],
      [0,1,0,0,0,0,1,0],
      [1,0,0,1,1,0,0,1],
      [1,0,1,1,1,1,0,1],
      [1,0,1,1,1,1,0,1],
      [1,0,0,1,1,0,0,1],
      [0,1,0,0,0,0,1,0],
      [0,0,1,1,1,1,0,0],
    ],
    name: 'Oval',
  },
]

function getClues(lines: number[][]): number[][] {
  return lines.map(line => {
    const clues: number[] = []
    let count = 0
    for (const v of line) {
      if (v === 1) count++
      else if (count > 0) { clues.push(count); count = 0 }
    }
    if (count > 0) clues.push(count)
    return clues.length ? clues : [0]
  })
}

const SIZE = 8
const state    = ref<'idle' | 'playing' | 'won'>('idle')
const grid     = ref<number[][]>([])   // 0=empty, 1=filled, -1=crossed
const solution = ref<number[][]>([])
const rowClues = ref<number[][]>([])
const colClues = ref<number[][]>([])
const moves    = ref(0)
const score    = ref(0)
const puzzleName = ref('')

function startGame() {
  const puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)]!
  solution.value = puzzle.solution
  puzzleName.value = puzzle.name
  rowClues.value = getClues(puzzle.solution)
  const cols = Array.from({ length: SIZE }, (_, c) => puzzle.solution.map(row => row[c]!))
  colClues.value = getClues(cols)
  grid.value = Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
  moves.value = 0
  state.value = 'playing'
}

function clickCell(r: number, c: number) {
  if (state.value !== 'playing') return
  const g = grid.value.map(row => [...row])
  g[r]![c] = g[r]![c] === 1 ? 0 : 1
  grid.value = g
  moves.value++
  checkWin()
}

function rightClick(e: MouseEvent, r: number, c: number) {
  e.preventDefault()
  if (state.value !== 'playing') return
  const g = grid.value.map(row => [...row])
  g[r]![c] = g[r]![c] === -1 ? 0 : -1
  grid.value = g
}

function checkWin() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const filled = grid.value[r]![c] === 1
      const should = solution.value[r]![c] === 1
      if (filled !== should) return
    }
  }
  score.value = moves.value
  state.value = 'won'
}

function isRowDone(r: number): boolean {
  const filled = grid.value[r]!.map(v => v === 1 ? 1 : 0)
  return JSON.stringify(filled) === JSON.stringify(solution.value[r])
}

function isColDone(c: number): boolean {
  const filled = grid.value.map(row => row[c] === 1 ? 1 : 0)
  const sol = solution.value.map(row => row[c])
  return JSON.stringify(filled) === JSON.stringify(sol)
}

function restart() { startGame() }
</script>

<template>
  <div class="flex flex-col items-center gap-4 select-none" @contextmenu.prevent>
    <div class="glass-hud px-6 py-2 flex items-center gap-6">
      <div class="text-center">
        <p class="hud-label text-[10px]">MOVES</p>
        <p class="font-mono font-bold text-white text-lg">{{ moves }}</p>
      </div>
      <div v-if="state !== 'idle'" class="text-center">
        <p class="hud-label text-[10px]">PUZZLE</p>
        <p class="font-mono text-xs text-slate-300">{{ puzzleName }}</p>
      </div>
    </div>

    <div v-if="state === 'idle'" class="flex flex-col items-center gap-3">
      <p class="font-mono text-xs text-slate-500 text-center max-w-xs">
        Fill the grid using the number clues. Numbers show groups of filled cells in that row/column.<br>
        Left-click to fill, right-click to mark with ✕.
      </p>
      <button class="btn-neon-purple mt-2" @click="startGame">START GAME</button>
    </div>

    <div v-else class="relative">
      <!-- Nonogram grid with clues -->
      <div class="flex">
        <!-- Col clues header -->
        <div class="w-16" /><!-- spacer for row clues -->
        <div class="flex">
          <div
            v-for="c in SIZE"
            :key="c"
            class="w-9 flex flex-col items-center justify-end pb-1"
            :class="state === 'playing' && isColDone(c-1) ? 'opacity-40' : ''"
          >
            <span
              v-for="(n, i) in colClues[c-1]"
              :key="i"
              class="font-mono text-[10px] leading-tight"
              :class="isColDone(c-1) ? 'text-neon-emerald' : 'text-slate-400'"
            >{{ n }}</span>
          </div>
        </div>
      </div>

      <div class="flex">
        <!-- Row clues -->
        <div class="flex flex-col">
          <div
            v-for="r in SIZE"
            :key="r"
            class="h-9 w-16 flex items-center justify-end gap-0.5 pr-1"
          >
            <span
              v-for="(n, i) in rowClues[r-1]"
              :key="i"
              class="font-mono text-[10px]"
              :class="isRowDone(r-1) ? 'text-neon-emerald' : 'text-slate-400'"
            >{{ n }}</span>
          </div>
        </div>

        <!-- Grid cells -->
        <div class="grid border border-white/10 rounded-sm" :style="{ gridTemplateColumns: `repeat(${SIZE}, 2.25rem)` }">
          <template v-for="(row, r) in grid" :key="r">
            <button
              v-for="(cell, c) in row"
              :key="`${r}-${c}`"
              class="w-9 h-9 border flex items-center justify-center transition-colors focus:outline-none"
              :class="{
                'border-slate-800': true,
                'bg-purple-500/80': cell === 1,
                'bg-transparent hover:bg-slate-800': cell !== 1,
                'border-r-2 border-r-white/20': (c + 1) % 4 === 0 && c < SIZE - 1,
                'border-b-2 border-b-white/20': (r + 1) % 4 === 0 && r < SIZE - 1,
              }"
              @click="clickCell(r, c)"
              @contextmenu.prevent="rightClick($event, r, c)"
            >
              <span v-if="cell === -1" class="font-mono text-xs text-slate-600">✕</span>
            </button>
          </template>
        </div>
      </div>

      <GameResultOverlay v-if="state === 'won'" :state="state" :score="moves" @restart="restart" />
    </div>

    <p v-if="state === 'playing'" class="font-mono text-xs text-slate-600">Left-click: fill &nbsp;|&nbsp; Right-click: mark ✕</p>
  </div>
</template>
