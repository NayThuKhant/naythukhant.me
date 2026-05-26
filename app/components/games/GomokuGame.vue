<script setup lang="ts">
const SIZE = 15
type Cell = 0 | 1 | 2

const { place: sfxPlace, win: sfxWin, lose: sfxLose } = useGameSounds()

const state    = ref<'idle' | 'playing' | 'won' | 'over'>('idle')
const board    = ref<Cell[][]>([])
const moves    = ref(0)
const score    = ref(0)
const hover    = ref<{ r: number; c: number } | null>(null)
const cpuBusy  = ref(false)
const winCells = ref<[number, number][]>([])

const winSet = computed(() => new Set(winCells.value.map(([r, c]) => `${r},${c}`)))

function makeBoard(): Cell[][] {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0) as Cell[])
}

function countDir(b: Cell[][], r: number, c: number, dr: number, dc: number, player: Cell): number {
  let count = 0
  let nr = r + dr, nc = c + dc
  while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && b[nr]![nc] === player) {
    count++; nr += dr; nc += dc
  }
  return count
}

function getWinCells(b: Cell[][], r: number, c: number, player: Cell): [number, number][] {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]] as const
  for (const [dr, dc] of dirs) {
    const cells: [number, number][] = [[r, c]]
    let nr = r + dr, nc = c + dc
    while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && b[nr]![nc] === player) {
      cells.push([nr, nc]); nr += dr; nc += dc
    }
    nr = r - dr; nc = c - dc
    while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && b[nr]![nc] === player) {
      cells.push([nr, nc]); nr -= dr; nc -= dc
    }
    if (cells.length >= 5) return cells
  }
  return []
}

function checkWin(b: Cell[][], r: number, c: number, player: Cell): boolean {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]] as const
  for (const [dr, dc] of dirs) {
    const total = 1 + countDir(b, r, c, dr, dc, player) + countDir(b, r, c, -dr, -dc, player)
    if (total >= 5) return true
  }
  return false
}

function scorePos(b: Cell[][], r: number, c: number, player: Cell): number {
  let s = 0
  const dirs = [[0,1],[1,0],[1,1],[1,-1]] as const
  for (const [dr, dc] of dirs) {
    const count = 1 + countDir(b, r, c, dr, dc, player) + countDir(b, r, c, -dr, -dc, player)
    if (count >= 5) s += 100000
    else if (count === 4) s += 1000
    else if (count === 3) s += 100
    else if (count === 2) s += 10
  }
  return s
}

function cpuMove(b: Cell[][]): { r: number; c: number } {
  let best = -1, br = 7, bc = 7
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (b[r]![c] !== 0) continue
      let hasNeighbor = false
      for (let dr = -2; dr <= 2 && !hasNeighbor; dr++) {
        for (let dc = -2; dc <= 2 && !hasNeighbor; dc++) {
          const nr = r + dr, nc = c + dc
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && b[nr]![nc] !== 0) hasNeighbor = true
        }
      }
      if (!hasNeighbor && (r !== 7 || c !== 7)) continue
      const cpuScore = scorePos(b, r, c, 2)
      const playerScore = scorePos(b, r, c, 1)
      const total = cpuScore * 1.1 + playerScore
      if (total > best) { best = total; br = r; bc = c }
    }
  }
  return { r: br, c: bc }
}

function startGame() {
  board.value = makeBoard()
  moves.value = 0
  winCells.value = []
  cpuBusy.value = false
  state.value = 'playing'
}

async function place(r: number, c: number) {
  if (state.value !== 'playing' || cpuBusy.value || board.value[r]![c] !== 0) return
  const b = board.value.map(row => [...row]) as Cell[][]
  b[r]![c] = 1
  moves.value++
  board.value = b
  sfxPlace()

  if (checkWin(b, r, c, 1)) {
    winCells.value = getWinCells(b, r, c, 1)
    score.value = moves.value
    sfxWin()
    setTimeout(() => { state.value = 'won' }, 1400)
    return
  }

  cpuBusy.value = true
  await new Promise(res => setTimeout(res, 200))
  if (state.value !== 'playing') { cpuBusy.value = false; return }

  const nb = board.value.map(row => [...row]) as Cell[][]
  const { r: cr, c: cc } = cpuMove(nb)
  nb[cr]![cc] = 2
  moves.value++
  board.value = nb
  cpuBusy.value = false

  if (checkWin(nb, cr, cc, 2)) {
    winCells.value = getWinCells(nb, cr, cc, 2)
    sfxLose()
    setTimeout(() => { state.value = 'over' }, 1400)
  }
}

function restart() {
  winCells.value = []
  startGame()
}
</script>

<template>
  <div class="flex flex-col items-center gap-4 select-none">
    <div class="glass-hud px-6 py-2 flex items-center gap-8">
      <div class="text-center">
        <p class="hud-label text-[10px]">MOVES</p>
        <p class="font-mono font-bold text-white text-lg">{{ moves }}</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-slate-200" />
        <span class="font-mono text-xs text-slate-400">You</span>
        <span class="font-mono text-xs text-slate-600 mx-1">vs</span>
        <span class="font-mono text-xs text-slate-400">CPU</span>
        <span class="w-3 h-3 rounded-full bg-neon-emerald shadow-[0_0_6px_#00ff88]" />
      </div>
    </div>

    <div v-if="state === 'idle'" class="flex flex-col items-center gap-3">
      <p class="font-mono text-xs text-slate-500 text-center">
        Place stones to get 5 in a row.<br>Horizontal, vertical, or diagonal.
      </p>
      <button class="btn-neon-blue mt-2" @click="startGame">START GAME</button>
    </div>

    <div v-else class="relative">
      <!-- 15×15 board -->
      <div
        class="relative rounded-xl border border-white/10 overflow-hidden"
        :style="{ width: `${SIZE * 28}px`, height: `${SIZE * 28}px`, background: '#070a13' }"
      >
        <!-- Grid lines -->
        <svg class="absolute inset-0 pointer-events-none" :width="SIZE * 28" :height="SIZE * 28">
          <line v-for="i in SIZE" :key="`v${i}`"
            :x1="(i - 0.5) * 28" :y1="14" :x2="(i - 0.5) * 28" :y2="(SIZE - 0.5) * 28"
            stroke="rgba(255,255,255,0.08)" stroke-width="1" />
          <line v-for="i in SIZE" :key="`h${i}`"
            :x1="14" :y1="(i - 0.5) * 28" :x2="(SIZE - 0.5) * 28" :y2="(i - 0.5) * 28"
            stroke="rgba(255,255,255,0.08)" stroke-width="1" />
        </svg>

        <!-- Cells -->
        <div
          class="absolute inset-0 grid"
          :style="{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gridTemplateRows: `repeat(${SIZE}, 1fr)` }"
        >
          <template v-for="r in SIZE" :key="r">
          <div
            v-for="c in SIZE"
            :key="`${r}-${c}`"
            class="flex items-center justify-center cursor-pointer"
            @mouseenter="hover = { r: r-1, c: c-1 }"
            @mouseleave="hover = null"
            @click="place(r-1, c-1)"
          >
            <div
              v-if="board[r-1]![c-1] !== 0"
              class="w-5 h-5 rounded-full border transition-all duration-300"
              :class="[
                board[r-1]![c-1] === 1
                  ? 'bg-slate-100 border-white shadow-[0_0_6px_white]'
                  : 'bg-neon-emerald border-emerald-300 shadow-[0_0_8px_#00ff88]',
                winSet.has(`${r-1},${c-1}`)
                  ? 'scale-125 ring-2 ring-yellow-400 shadow-[0_0_16px_#facc15] animate-pulse'
                  : '',
              ]"
            />
            <div
              v-else-if="hover?.r === r-1 && hover?.c === c-1 && !cpuBusy && state === 'playing'"
              class="w-4 h-4 rounded-full bg-slate-300/30 border border-slate-300/40"
            />
          </div>
          </template>
        </div>
      </div>

      <GameResultOverlay
        v-if="state === 'won' || state === 'over'"
        :state="state === 'won' ? 'won' : 'over'"
        :score="moves"
        @restart="restart"
      />
    </div>

    <p v-if="state === 'playing'" class="font-mono text-xs text-slate-600">Click to place your stone (white) — get 5 in a row</p>
  </div>
</template>
