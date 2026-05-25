<script setup lang="ts">
const GRID_SIZE = 10
const WORD_SETS = [
  ['NEBULA','COMET','GALAXY','PULSAR','QUASAR','METEOR','ORBIT','PHOTON'],
  ['PLANET','ROCKET','COSMOS','AURORA','CRATER','FUSION','HELIUM','IMPACT'],
  ['SATURN','NEUTRON','OXYGEN','PROTON','VACUUM','VORTEX','ZENITH','SIGNAL'],
]

type Dir = [number, number]
const DIRS: Dir[] = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]

interface PlacedWord { word: string; r: number; c: number; dr: number; dc: number }

const state     = ref<'idle' | 'playing' | 'won'>('idle')
const grid      = ref<string[][]>([])
const words     = ref<string[]>([])
const found     = ref<Set<string>>(new Set())
const placed    = ref<PlacedWord[]>([])
const dragStart = ref<{ r: number; c: number } | null>(null)
const dragEnd   = ref<{ r: number; c: number } | null>(null)
const seconds   = ref(0)
const score     = ref(0)
let timer = 0

function makeGrid(): string[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26)))
  )
}

function placeWord(g: string[][], word: string): PlacedWord | null {
  const shuffledDirs = [...DIRS].sort(() => Math.random() - 0.5)
  for (let attempt = 0; attempt < 50; attempt++) {
    const r = Math.floor(Math.random() * GRID_SIZE)
    const c = Math.floor(Math.random() * GRID_SIZE)
    for (const [dr, dc] of shuffledDirs) {
      const er = r + dr * (word.length - 1)
      const ec = c + dc * (word.length - 1)
      if (er < 0 || er >= GRID_SIZE || ec < 0 || ec >= GRID_SIZE) continue
      let fits = true
      for (let i = 0; i < word.length; i++) {
        const nr = r + dr * i, nc = c + dc * i
        if (g[nr]![nc] !== word[i] && g[nr]![nc]!.length === 1 && g[nr]![nc] !== String.fromCharCode(65 + Math.floor(Math.random() * 26))) {
          fits = false; break
        }
      }
      if (fits) {
        for (let i = 0; i < word.length; i++) g[r + dr * i]![c + dc * i] = word[i]!
        return { word, r, c, dr, dc }
      }
    }
  }
  return null
}

function buildPuzzle(wordList: string[]): { g: string[][], placed: PlacedWord[] } {
  const g = makeGrid()
  const placedWords: PlacedWord[] = []
  for (const word of wordList) {
    const p = placeWord(g, word)
    if (p) placedWords.push(p)
  }
  return { g, placed: placedWords }
}

function startGame() {
  clearInterval(timer)
  const wordSet = WORD_SETS[Math.floor(Math.random() * WORD_SETS.length)]!
  const { g, placed: p } = buildPuzzle(wordSet)
  grid.value = g
  placed.value = p
  words.value = p.map(pw => pw.word)
  found.value = new Set()
  seconds.value = 0
  dragStart.value = null
  dragEnd.value = null
  state.value = 'playing'
  timer = window.setInterval(() => seconds.value++, 1000)
}

function cellsInSelection(): Set<string> {
  const cells = new Set<string>()
  if (!dragStart.value || !dragEnd.value) return cells
  const { r: r1, c: c1 } = dragStart.value
  const { r: r2, c: c2 } = dragEnd.value
  const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1)
  if (dr === 0 && dc === 0) { cells.add(`${r1},${c1}`); return cells }
  // Only allow straight lines
  const steps = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1))
  for (let i = 0; i <= steps; i++) cells.add(`${r1 + dr * i},${c1 + dc * i}`)
  return cells
}

const highlighted = computed(() => cellsInSelection())

function foundCells(): Set<string> {
  const cells = new Set<string>()
  for (const pw of placed.value) {
    if (!found.value.has(pw.word)) continue
    for (let i = 0; i < pw.word.length; i++) cells.add(`${pw.r + pw.dr * i},${pw.c + pw.dc * i}`)
  }
  return cells
}

const foundSet = computed(() => foundCells())

function startDrag(r: number, c: number) {
  if (state.value !== 'playing') return
  dragStart.value = { r, c }
  dragEnd.value = { r, c }
}

function moveDrag(r: number, c: number) {
  if (!dragStart.value) return
  dragEnd.value = { r, c }
}

function endDrag() {
  if (!dragStart.value || !dragEnd.value) return
  const cells = cellsInSelection()
  if (cells.size === 0) { dragStart.value = null; dragEnd.value = null; return }

  const { r: r1, c: c1 } = dragStart.value
  const { r: r2, c: c2 } = dragEnd.value
  const dr = r2 === r1 && c2 === c1 ? 0 : Math.sign(r2 - r1)
  const dc = r2 === r1 && c2 === c1 ? 0 : Math.sign(c2 - c1)
  const len = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1)) + 1
  let word = ''
  for (let i = 0; i < len; i++) word += grid.value[r1 + dr * i]![c1 + dc * i] || ''

  if (words.value.includes(word) && !found.value.has(word)) {
    found.value = new Set([...found.value, word])
    if (found.value.size === words.value.length) {
      clearInterval(timer)
      score.value = seconds.value
      state.value = 'won'
    }
  }
  dragStart.value = null
  dragEnd.value = null
}

function fmtTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function restart() { startGame() }
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="flex flex-col items-center gap-4 select-none" @mouseup="endDrag">
    <div class="glass-hud px-6 py-2 flex items-center gap-6">
      <div class="text-center">
        <p class="hud-label text-[10px]">FOUND</p>
        <p class="font-mono font-bold text-white text-lg">{{ found.size }} / {{ words.length }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">TIME</p>
        <p class="font-mono font-bold text-white text-lg">{{ fmtTime(seconds) }}</p>
      </div>
    </div>

    <div v-if="state === 'idle'" class="flex flex-col items-center gap-3">
      <p class="font-mono text-xs text-slate-500 text-center">
        Find all hidden space words. Click and drag to select a word.
      </p>
      <button class="btn-neon-blue mt-2" @click="startGame">START GAME</button>
    </div>

    <div v-else class="relative flex gap-6 items-start">
      <!-- Grid -->
      <div class="grid border border-white/10 rounded-lg overflow-hidden" :style="{ gridTemplateColumns: `repeat(${GRID_SIZE}, 2rem)` }">
        <template v-for="(row, r) in grid" :key="r">
          <div
            v-for="(letter, c) in row"
            :key="`${r}-${c}`"
            class="w-8 h-8 flex items-center justify-center font-mono text-sm font-bold cursor-pointer border border-white/5 transition-colors"
            :class="{
              'bg-neon-blue/30 text-neon-blue': highlighted.has(`${r},${c}`) && !foundSet.has(`${r},${c}`),
              'bg-neon-emerald/25 text-neon-emerald': foundSet.has(`${r},${c}`),
              'text-slate-300 hover:bg-slate-800': !highlighted.has(`${r},${c}`) && !foundSet.has(`${r},${c}`),
            }"
            @mousedown="startDrag(r, c)"
            @mouseenter="moveDrag(r, c)"
          >{{ letter }}</div>
        </template>
      </div>

      <!-- Word list -->
      <div class="flex flex-col gap-1 min-w-24">
        <p class="hud-label text-[10px] mb-1">WORDS</p>
        <span
          v-for="word in words"
          :key="word"
          class="font-mono text-xs transition-all"
          :class="found.has(word) ? 'text-neon-emerald line-through opacity-50' : 'text-slate-300'"
        >{{ word }}</span>
      </div>

      <GameResultOverlay v-if="state === 'won'" :state="state" :score="seconds" :extra="fmtTime(seconds)" @restart="restart" />
    </div>
  </div>
</template>
