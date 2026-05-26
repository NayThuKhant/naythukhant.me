<script setup lang="ts">
// 6×6 grid puzzles — each entry: [color_index, row, col] pairs define endpoints
const PALETTE = ['#f472b6','#00d4ff','#00ff88','#a855f7','#fb923c','#facc15']
const PUZZLES: Array<{ size: number; pairs: [number, number, number][][] }> = [
  { size: 6, pairs: [
    [[0,0,0],[0,5,5]], [[1,0,5],[1,5,0]], [[2,0,2],[2,3,2]],
    [[3,1,0],[3,1,5]], [[4,2,1],[4,4,4]], [[5,3,0],[5,5,3]],
  ]},
  { size: 6, pairs: [
    [[0,0,1],[0,5,4]], [[1,0,3],[1,3,0]], [[2,1,2],[2,4,5]],
    [[3,0,5],[3,5,0]], [[4,2,0],[4,2,5]], [[5,1,4],[5,4,1]],
  ]},
  { size: 6, pairs: [
    [[0,0,0],[0,4,0]], [[1,0,2],[1,5,2]], [[2,0,4],[2,3,4]],
    [[3,1,1],[3,4,5]], [[4,2,3],[4,5,3]], [[5,3,0],[5,5,5]],
  ]},
]

type Path = { cells: [number, number][]; color: number }

const { click: sfxClick, correct: sfxCorrect, win: sfxWin } = useGameSounds()

const state     = ref<'idle' | 'playing' | 'won'>('idle')
const gridSize  = ref(6)
const endpoints = ref<Map<string, number>>(new Map())  // "r,c" -> colorIdx
const paths     = ref<Path[]>([])       // completed paths
const drawing   = ref<Path | null>(null) // active drawing
const moves     = ref(0)
const score     = ref(0)

function key(r: number, c: number) { return `${r},${c}` }

function startGame() {
  const puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)]!
  gridSize.value = puzzle.size
  const eps = new Map<string, number>()
  for (const pair of puzzle.pairs) {
    const [p1, p2] = pair
    const [ci, r1, c1] = p1!
    const [, r2, c2] = p2!
    eps.set(key(r1, c1), ci)
    eps.set(key(r2, c2), ci)
  }
  endpoints.value = eps
  paths.value = []
  drawing.value = null
  moves.value = 0
  state.value = 'playing'
}

function colorAt(r: number, c: number): number | null {
  const k = key(r, c)
  if (endpoints.value.has(k)) return endpoints.value.get(k)!
  for (const p of paths.value) {
    if (p.cells.some(([pr, pc]) => pr === r && pc === c)) return p.color
  }
  if (drawing.value?.cells.some(([dr, dc]) => dr === r && dc === c)) return drawing.value.color
  return null
}

function isEndpoint(r: number, c: number) { return endpoints.value.has(key(r, c)) }
function endpointColor(r: number, c: number) { return endpoints.value.get(key(r, c)) }

function adjacent(a: [number, number], b: [number, number]): boolean {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1
}

function mouseDown(r: number, c: number) {
  if (state.value !== 'playing') return
  const col = colorAt(r, c)
  if (col === null) return
  const ep = endpointColor(r, c)
  const activeColor = ep !== undefined ? ep : col
  paths.value = paths.value.filter(p => p.color !== activeColor)
  sfxClick()
  drawing.value = { color: activeColor, cells: [[r, c]] }
}

function mouseEnter(r: number, c: number) {
  if (!drawing.value) return
  const d = drawing.value
  const last = d.cells[d.cells.length - 1]!

  // Backtrack
  const secondLast = d.cells[d.cells.length - 2]
  if (secondLast && secondLast[0] === r && secondLast[1] === c) {
    d.cells.pop()
    return
  }

  if (!adjacent(last, [r, c])) return

  // Don't draw over other colors' cells
  const existing = colorAt(r, c)
  if (existing !== null && existing !== d.color) {
    if (!isEndpoint(r, c)) return
  }

  // Don't revisit
  if (d.cells.some(([cr, cc]) => cr === r && cc === c)) return

  d.cells.push([r, c])

  // Complete if reached matching endpoint
  const ep = endpointColor(r, c)
  if (ep === d.color) {
    paths.value.push({ ...d, cells: [...d.cells] })
    moves.value++
    sfxCorrect()
    drawing.value = null
    checkWin()
  }
}

function mouseUp() {
  drawing.value = null
}

function checkWin() {
  const G = gridSize.value
  const totalCells = G * G
  const covered = new Set<string>()
  for (const p of paths.value) p.cells.forEach(([r,c]) => covered.add(key(r, c)))
  if (covered.size === totalCells) {
    score.value = moves.value
    sfxWin()
    state.value = 'won'
  }
}

function restart() { startGame() }

const CELL = 48
</script>

<template>
  <div class="flex flex-col items-center gap-4 select-none" @mouseup="mouseUp">
    <div class="glass-hud px-6 py-2 flex items-center gap-6">
      <div class="text-center">
        <p class="hud-label text-[10px]">PATHS</p>
        <p class="font-mono font-bold text-white text-lg">{{ paths.length }} / 6</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">MOVES</p>
        <p class="font-mono font-bold text-white text-lg">{{ moves }}</p>
      </div>
    </div>

    <div v-if="state === 'idle'" class="flex flex-col items-center gap-3">
      <p class="font-mono text-xs text-slate-500 text-center max-w-xs">
        Connect matching color dots with a path. Fill every cell to win.
        Drag from a dot to draw a path.
      </p>
      <button class="btn-neon-purple mt-2" @click="startGame">START GAME</button>
    </div>

    <div v-else class="relative">
      <div
        class="grid border border-white/10 rounded-lg overflow-hidden"
        :style="{ gridTemplateColumns: `repeat(${gridSize}, ${CELL}px)`, userSelect: 'none' }"
      >
        <template v-for="r in gridSize" :key="r">
        <div
          v-for="c in gridSize"
          :key="`${r},${c}`"
          class="relative border border-white/5 cursor-pointer transition-colors"
          :style="{ width: `${CELL}px`, height: `${CELL}px` }"
          :class="{
            'bg-white/5': colorAt(r-1, c-1) !== null,
          }"
          @mousedown.prevent="mouseDown(r-1, c-1)"
          @mouseenter="mouseEnter(r-1, c-1)"
        >
          <!-- Path fill -->
          <div
            v-if="colorAt(r-1, c-1) !== null"
            class="absolute inset-1 rounded-sm opacity-40"
            :style="{ backgroundColor: PALETTE[colorAt(r-1, c-1)!] }"
          />

          <!-- Endpoint circle -->
          <div
            v-if="isEndpoint(r-1, c-1)"
            class="absolute inset-2 rounded-full border-2"
            :style="{
              backgroundColor: PALETTE[endpointColor(r-1, c-1)!] + '33',
              borderColor: PALETTE[endpointColor(r-1, c-1)!],
              boxShadow: `0 0 10px ${PALETTE[endpointColor(r-1, c-1)!]}`,
            }"
          />
        </div>
        </template>
      </div>

      <GameResultOverlay v-if="state === 'won'" :state="state" :score="moves" @restart="restart" />
    </div>

    <p v-if="state === 'playing'" class="font-mono text-xs text-slate-600">Drag from dots to connect matching colors — fill every cell</p>
  </div>
</template>
