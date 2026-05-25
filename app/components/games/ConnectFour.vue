<script setup lang="ts">
const COLS = 7
const ROWS = 6

type Cell = 0 | 1 | 2
const state  = ref<'idle' | 'playing' | 'won' | 'over' | 'draw'>('idle')
const board  = ref<Cell[][]>([])
const moves  = ref(0)
const score  = ref(0)
const hover  = ref<number | null>(null)
const cpuBusy = ref(false)

function makeBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[])
}

function dropRow(b: Cell[][], col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) if (b[r]![col] === 0) return r
  return -1
}

function checkWin(b: Cell[][], player: Cell): boolean {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]] as const
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (b[r]![c] !== player) continue
      for (const [dr, dc] of dirs) {
        let cnt = 1
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k, nc = c + dc * k
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || b[nr]![nc] !== player) break
          cnt++
        }
        if (cnt >= 4) return true
      }
    }
  }
  return false
}

function scoreWindow(window: Cell[], player: Cell): number {
  const opp = player === 2 ? 1 : 2 as Cell
  const mine = window.filter(c => c === player).length
  const empty = window.filter(c => c === 0).length
  const theirs = window.filter(c => c === opp).length
  if (mine === 4) return 100
  if (mine === 3 && empty === 1) return 5
  if (mine === 2 && empty === 2) return 2
  if (theirs === 3 && empty === 1) return -4
  return 0
}

function heuristic(b: Cell[][], player: Cell): number {
  let s = 0
  const center = Math.floor(COLS / 2)
  for (let r = 0; r < ROWS; r++) if (b[r]![center] === player) s += 3
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) s += scoreWindow([b[r]![c]!, b[r]![c+1]!, b[r]![c+2]!, b[r]![c+3]!], player)
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) s += scoreWindow([b[r]![c]!, b[r+1]![c]!, b[r+2]![c]!, b[r+3]![c]!], player)
  }
  return s
}

function minimax(b: Cell[][], depth: number, alpha: number, beta: number, maximizing: boolean): number {
  if (checkWin(b, 2)) return 1000 + depth
  if (checkWin(b, 1)) return -1000 - depth
  const validCols = Array.from({ length: COLS }, (_, i) => i).filter(c => dropRow(b, c) !== -1)
  if (validCols.length === 0 || depth === 0) return heuristic(b, 2)
  if (maximizing) {
    let best = -Infinity
    for (const c of validCols) {
      const r = dropRow(b, c)
      const nb = b.map(row => [...row]) as Cell[][]
      nb[r]![c] = 2
      best = Math.max(best, minimax(nb, depth - 1, alpha, beta, false))
      alpha = Math.max(alpha, best)
      if (alpha >= beta) break
    }
    return best
  } else {
    let best = Infinity
    for (const c of validCols) {
      const r = dropRow(b, c)
      const nb = b.map(row => [...row]) as Cell[][]
      nb[r]![c] = 1
      best = Math.min(best, minimax(nb, depth - 1, alpha, beta, true))
      beta = Math.min(beta, best)
      if (alpha >= beta) break
    }
    return best
  }
}

function cpuPick(b: Cell[][]): number {
  const valid = Array.from({ length: COLS }, (_, i) => i).filter(c => dropRow(b, c) !== -1)
  let bestCol = valid[Math.floor(Math.random() * valid.length)]!
  let bestScore = -Infinity
  for (const c of valid) {
    const r = dropRow(b, c)
    const nb = b.map(row => [...row]) as Cell[][]
    nb[r]![c] = 2
    const s = minimax(nb, 4, -Infinity, Infinity, false)
    if (s > bestScore) { bestScore = s; bestCol = c }
  }
  return bestCol
}

function startGame() {
  board.value = makeBoard()
  moves.value = 0
  cpuBusy.value = false
  state.value = 'playing'
}

async function drop(col: number) {
  if (state.value !== 'playing' || cpuBusy.value) return
  const b = board.value.map(r => [...r]) as Cell[][]
  const r = dropRow(b, col)
  if (r === -1) return

  b[r]![col] = 1
  moves.value++
  board.value = b

  if (checkWin(b, 1)) { score.value = moves.value; state.value = 'won'; return }
  if (!b[0]!.some((_, c) => dropRow(b, c) !== -1)) { state.value = 'draw'; return }

  cpuBusy.value = true
  await new Promise(res => setTimeout(res, 350))
  if (state.value !== 'playing') { cpuBusy.value = false; return }

  const nb = board.value.map(row => [...row]) as Cell[][]
  const cc = cpuPick(nb)
  const cr = dropRow(nb, cc)
  if (cr >= 0) { nb[cr]![cc] = 2; moves.value++ }
  board.value = nb
  cpuBusy.value = false

  if (checkWin(nb, 2)) { state.value = 'over'; return }
  if (!nb[0]!.some((_, c) => dropRow(nb, c) !== -1)) { state.value = 'draw' }
}

function restart() { startGame() }
</script>

<template>
  <div class="flex flex-col items-center gap-4 select-none">
    <div class="glass-hud px-6 py-2 flex items-center gap-6">
      <div class="text-center">
        <p class="hud-label text-[10px]">MOVES</p>
        <p class="font-mono font-bold text-white text-lg">{{ moves }}</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="w-3 h-3 rounded-full bg-neon-blue shadow-neon-sm-blue" />
        <span class="font-mono text-xs text-slate-400">You</span>
        <span class="font-mono text-xs text-slate-600">vs</span>
        <span class="font-mono text-xs text-slate-400">CPU</span>
        <span class="w-3 h-3 rounded-full bg-neon-pink" style="box-shadow: 0 0 8px #f472b6" />
      </div>
    </div>

    <div v-if="state === 'idle'" class="flex flex-col items-center gap-3">
      <p class="font-mono text-xs text-slate-500 text-center">
        Drop discs to get 4 in a row — horizontal, vertical, or diagonal.
      </p>
      <button class="btn-neon-purple mt-2" @click="startGame">START GAME</button>
    </div>

    <div v-else class="relative flex flex-col gap-1">
      <!-- Drop buttons -->
      <div class="flex gap-1">
        <button
          v-for="c in COLS"
          :key="c"
          class="w-10 h-5 flex items-center justify-center transition-all focus:outline-none"
          :class="hover === c - 1 && !cpuBusy ? 'text-neon-blue opacity-100' : 'opacity-0'"
          @mouseenter="hover = c - 1"
          @mouseleave="hover = null"
          @click="drop(c - 1)"
        >
          <span class="text-xs">▼</span>
        </button>
      </div>

      <!-- Board -->
      <div
        class="grid gap-1 bg-slate-900/80 rounded-xl p-2 border border-white/10"
        style="grid-template-columns: repeat(7, 2.5rem)"
        @mouseleave="hover = null"
      >
        <template v-for="(row, r) in board" :key="r">
          <button
            v-for="(cell, c) in row"
            :key="`${r}-${c}`"
            class="w-10 h-10 rounded-full border transition-all duration-200 cursor-pointer focus:outline-none"
            :class="{
              'border-slate-700 bg-slate-800': cell === 0,
              'border-blue-400 bg-neon-blue shadow-[0_0_10px_#00d4ff]': cell === 1,
              'border-pink-400 bg-neon-pink shadow-[0_0_10px_#f472b6]': cell === 2,
              'border-blue-500/40 bg-blue-900/20': cell === 0 && hover === c,
            }"
            @mouseenter="hover = c"
            @click="drop(c)"
          />
        </template>
      </div>

      <GameResultOverlay
        v-if="state === 'won' || state === 'over' || state === 'draw'"
        :state="state === 'won' ? 'won' : 'over'"
        :score="moves"
        :extra="state === 'draw' ? 'DRAW' : undefined"
        @restart="restart"
      />
    </div>
  </div>
</template>
