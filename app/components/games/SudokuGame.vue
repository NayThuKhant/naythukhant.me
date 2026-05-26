<script setup lang="ts">
type Difficulty = 'easy' | 'medium' | 'hard'
const REMOVE_COUNT: Record<Difficulty, number> = { easy: 30, medium: 40, hard: 50 }

const { click: sfxClick, wrong: sfxWrong, win: sfxWin } = useGameSounds()

const state      = ref<'idle' | 'playing' | 'won'>('idle')
const puzzle     = ref<number[][]>([])   // 0 = empty
const solution   = ref<number[][]>([])
const given      = ref<boolean[][]>([])  // true = pre-filled clue
const selected   = ref<[number, number] | null>(null)
const notes      = ref<Set<number>[][]>([])
const noteMode   = ref(false)
const seconds    = ref(0)
const score      = ref(0)
const difficulty = ref<Difficulty>('medium')
let timer = 0

// --- Sudoku generator (backtracking) ---
function isValid(b: number[][], r: number, c: number, n: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (b[r]![i] === n) return false
    if (b[i]![c] === n) return false
  }
  const br = Math.floor(r / 3) * 3
  const bc = Math.floor(c / 3) * 3
  for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
    if (b[br + dr]![bc + dc] === n) return false
  }
  return true
}

function solve(b: number[][]): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (b[r]![c] !== 0) continue
      const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5)
      for (const n of nums) {
        if (isValid(b, r, c, n)) {
          b[r]![c] = n
          if (solve(b)) return true
          b[r]![c] = 0
        }
      }
      return false
    }
  }
  return true
}

function generatePuzzle(diff: Difficulty): { puzzle: number[][], solution: number[][] } {
  const sol: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0))
  solve(sol)
  const puz = sol.map(row => [...row])
  let toRemove = REMOVE_COUNT[diff]
  const cells = Array.from({ length: 81 }, (_, i) => i).sort(() => Math.random() - 0.5)
  for (const idx of cells) {
    if (toRemove <= 0) break
    const r = Math.floor(idx / 9), c = idx % 9
    puz[r]![c] = 0
    toRemove--
  }
  return { puzzle: puz, solution: sol }
}

function startGame() {
  clearInterval(timer)
  const { puzzle: p, solution: s } = generatePuzzle(difficulty.value)
  puzzle.value = p.map(row => [...row])
  solution.value = s
  given.value = p.map(row => row.map(v => v !== 0))
  notes.value = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()))
  selected.value = null
  seconds.value = 0
  state.value = 'playing'
  timer = window.setInterval(() => seconds.value++, 1000)
}

function selectCell(r: number, c: number) {
  if (state.value !== 'playing') return
  if (selected.value?.[0] === r && selected.value?.[1] === c) selected.value = null
  else selected.value = [r, c]
}

function enterNumber(n: number) {
  if (!selected.value || state.value !== 'playing') return
  const [r, c] = selected.value
  if (given.value[r]![c]) return

  if (noteMode.value) {
    const set = new Set(notes.value[r]![c])
    if (set.has(n)) set.delete(n); else set.add(n)
    notes.value[r]![c] = set
    return
  }

  const p = puzzle.value.map(row => [...row])
  p[r]![c] = p[r]![c] === n ? 0 : n
  puzzle.value = p

  notes.value[r]![c] = new Set()

  if (p[r]![c] !== 0 && p[r]![c] !== solution.value[r]![c]) sfxWrong()
  else sfxClick()
  checkWin()
}

function checkWin() {
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    if (puzzle.value[r]![c] !== solution.value[r]![c]) return
  }
  clearInterval(timer)
  score.value = seconds.value
  sfxWin()
  state.value = 'won'
}

function isHighlighted(r: number, c: number): boolean {
  if (!selected.value) return false
  const [sr, sc] = selected.value
  if (r === sr && c === sc) return false
  return r === sr || c === sc ||
    (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3))
}

function isConflict(r: number, c: number): boolean {
  const v = puzzle.value[r]![c]
  if (!v) return false
  for (let i = 0; i < 9; i++) {
    if (i !== c && puzzle.value[r]![i] === v) return true
    if (i !== r && puzzle.value[i]![c] === v) return true
  }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3
  for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
    const nr = br + dr, nc = bc + dc
    if ((nr !== r || nc !== c) && puzzle.value[nr]![nc] === v) return true
  }
  return false
}

function isSameNumber(r: number, c: number): boolean {
  if (!selected.value) return false
  const v = puzzle.value[selected.value[0]]![selected.value[1]]
  return !!v && puzzle.value[r]![c] === v
}

function fmtTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function restart() { startGame() }

function onKey(e: KeyboardEvent) {
  if (state.value !== 'playing') return
  const n = parseInt(e.key)
  if (n >= 1 && n <= 9) enterNumber(n)
  else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') enterNumber(0)
  else if (e.key === 'n' || e.key === 'N') noteMode.value = !noteMode.value
  else if (e.key === 'ArrowRight' && selected.value) selected.value = [selected.value[0], Math.min(8, selected.value[1]+1)]
  else if (e.key === 'ArrowLeft'  && selected.value) selected.value = [selected.value[0], Math.max(0, selected.value[1]-1)]
  else if (e.key === 'ArrowDown'  && selected.value) selected.value = [Math.min(8, selected.value[0]+1), selected.value[1]]
  else if (e.key === 'ArrowUp'    && selected.value) selected.value = [Math.max(0, selected.value[0]-1), selected.value[1]]
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => { window.removeEventListener('keydown', onKey); clearInterval(timer) })
</script>

<template>
  <div class="flex flex-col items-center gap-4 select-none">
    <div class="glass-hud px-4 py-2 flex items-center gap-6">
      <div class="text-center">
        <p class="hud-label text-[10px]">TIME</p>
        <p class="font-mono font-bold text-white text-lg">{{ fmtTime(seconds) }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">MODE</p>
        <p
          class="font-mono text-xs font-bold cursor-pointer transition-colors"
          :class="noteMode ? 'text-neon-purple' : 'text-slate-400'"
          @click="noteMode = !noteMode"
        >{{ noteMode ? 'NOTES ON' : 'NORMAL' }}</p>
      </div>
    </div>

    <div v-if="state === 'idle'" class="flex flex-col items-center gap-4">
      <div class="flex gap-2">
        <button
          v-for="d in (['easy','medium','hard'] as Difficulty[])"
          :key="d"
          class="px-3 py-1.5 rounded font-mono text-xs border transition-all capitalize"
          :class="difficulty === d
            ? 'bg-neon-blue/20 border-neon-blue text-neon-blue'
            : 'border-slate-700 text-slate-400 hover:border-slate-500'"
          @click="difficulty = d"
        >{{ d }}</button>
      </div>
      <p class="font-mono text-xs text-slate-500 text-center max-w-xs">
        Fill every row, column and 3×3 box with numbers 1–9.<br>
        Press N to toggle note mode. Arrow keys to navigate.
      </p>
      <button class="btn-neon-blue" @click="startGame">START GAME</button>
    </div>

    <div v-else class="relative flex flex-col items-center gap-3">
      <!-- 9×9 grid -->
      <div class="grid border-2 border-white/20 rounded-lg overflow-hidden" style="grid-template-columns: repeat(9, 2.5rem)">
        <template v-for="(row, r) in puzzle" :key="r">
          <div
            v-for="(cell, c) in row"
            :key="`${r}-${c}`"
            class="w-10 h-10 flex items-center justify-center cursor-pointer transition-colors relative border"
            :class="{
              'border-white/20': (c+1) % 3 === 0 && c < 8,
              'border-white/10': !((c+1) % 3 === 0 && c < 8),
              'border-b-white/20': (r+1) % 3 === 0 && r < 8,
              'border-b-white/10': !((r+1) % 3 === 0 && r < 8),
              'bg-neon-blue/20': selected?.[0] === r && selected?.[1] === c,
              'bg-white/[0.06]': isHighlighted(r, c) && !(selected?.[0] === r && selected?.[1] === c),
              'bg-neon-blue/10': isSameNumber(r, c) && !(selected?.[0] === r && selected?.[1] === c),
            }"
            @click="selectCell(r, c)"
          >
            <!-- Notes grid -->
            <div v-if="!cell && notes[r]![c]!.size" class="grid grid-cols-3 gap-0 w-full h-full p-0.5">
              <span
                v-for="n in 9"
                :key="n"
                class="flex items-center justify-center font-mono text-[7px] leading-none"
                :class="notes[r]![c]!.has(n) ? 'text-neon-purple/80' : 'text-transparent'"
              >{{ n }}</span>
            </div>

            <!-- Number -->
            <span
              v-else
              class="font-mono font-bold text-base"
              :class="{
                'text-slate-300': given[r]![c] && !isConflict(r, c),
                'text-neon-blue': !given[r]![c] && cell && !isConflict(r, c),
                'text-neon-pink font-bold': isConflict(r, c),
                'text-transparent': !cell,
              }"
            >{{ cell || '·' }}</span>
          </div>
        </template>
      </div>

      <!-- Number pad -->
      <div class="flex gap-1.5">
        <button
          v-for="n in 9"
          :key="n"
          class="w-9 h-9 rounded font-mono font-bold text-sm border transition-all focus:outline-none"
          :class="noteMode
            ? 'border-purple-500/40 text-neon-purple hover:bg-purple-900/30'
            : 'border-slate-600 text-slate-300 hover:border-neon-blue hover:text-neon-blue'"
          @click="enterNumber(n)"
        >{{ n }}</button>
        <button
          class="w-9 h-9 rounded font-mono text-sm border border-slate-700 text-slate-500 hover:text-white hover:border-slate-500 transition-all"
          @click="enterNumber(0)"
        >✕</button>
      </div>

      <GameResultOverlay v-if="state === 'won'" :state="state" :score="seconds" :extra="fmtTime(seconds)" @restart="restart" />
    </div>
  </div>
</template>
