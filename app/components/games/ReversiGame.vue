<script setup lang="ts">
type Cell = 0 | 1 | 2  // 0=empty, 1=blue(player), 2=pink(cpu)
type Board = Cell[][]

const { place: sfxPlace, pop: sfxPop, win: sfxWin, lose: sfxLose } = useGameSounds()

const state   = ref<'idle' | 'playing' | 'won' | 'over'>('idle')
const board   = ref<Board>([])
const hints   = ref<Set<string>>(new Set())
const score   = ref(0)
const cpuBusy = ref(false)
const blueCount = ref(2)
const pinkCount = ref(2)

const DIRS: [number, number][] = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]

function makeBoard(): Board {
  const b: Board = Array.from({ length: 8 }, () => Array(8).fill(0) as Cell[])
  b[3]![3] = 2; b[3]![4] = 1
  b[4]![3] = 1; b[4]![4] = 2
  return b
}

function getFlips(b: Board, r: number, c: number, player: Cell): [number, number][] {
  if (b[r]![c] !== 0) return []
  const opp = player === 1 ? 2 : 1
  const flips: [number, number][] = []
  for (const [dr, dc] of DIRS) {
    const line: [number, number][] = []
    let nr = r + dr, nc = c + dc
    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr]![nc] === opp) {
      line.push([nr, nc])
      nr += dr; nc += dc
    }
    if (line.length && nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr]![nc] === player) {
      flips.push(...line)
    }
  }
  return flips
}

function validMoves(b: Board, player: Cell): [number, number][] {
  const moves: [number, number][] = []
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (getFlips(b, r, c, player).length) moves.push([r, c])
  return moves
}

function applyMove(b: Board, r: number, c: number, player: Cell): Board {
  const nb = b.map(row => [...row] as Cell[])
  const flips = getFlips(nb, r, c, player)
  nb[r]![c] = player
  for (const [fr, fc] of flips) nb[fr]![fc] = player
  return nb
}

function countCells(b: Board, player: Cell): number {
  let n = 0
  for (const row of b) for (const cell of row) if (cell === player) n++
  return n
}

function isBoardFull(b: Board): boolean {
  for (const row of b) for (const cell of row) if (cell === 0) return false
  return true
}

function updateHints(b: Board) {
  const moves = validMoves(b, 1)
  hints.value = new Set(moves.map(([r, c]) => `${r},${c}`))
}

function updateCounts(b: Board) {
  blueCount.value = countCells(b, 1)
  pinkCount.value = countCells(b, 2)
}

function checkGameOver(b: Board) {
  const p1 = validMoves(b, 1)
  const p2 = validMoves(b, 2)
  const bc = countCells(b, 1)
  const pc = countCells(b, 2)
  if (isBoardFull(b) || (!p1.length && !p2.length)) {
    score.value = bc
    if (bc > pc) { sfxWin(); state.value = 'won' }
    else { sfxLose(); state.value = 'over' }
    return true
  }
  return false
}

function startGame() {
  const b = makeBoard()
  board.value = b
  cpuBusy.value = false
  score.value = 0
  updateCounts(b)
  updateHints(b)
  state.value = 'playing'
}

async function clickCell(r: number, c: number) {
  if (state.value !== 'playing' || cpuBusy.value) return
  if (!hints.value.has(`${r},${c}`)) return

  let b = applyMove(board.value, r, c, 1)
  sfxPlace()
  board.value = b
  updateCounts(b)
  hints.value = new Set()

  if (checkGameOver(b)) return

  // Check if CPU has moves
  if (!validMoves(b, 2).length) {
    // CPU skips, update hints for player
    updateHints(b)
    return
  }

  cpuBusy.value = true
  await new Promise(res => setTimeout(res, 400))
  if (state.value !== 'playing') { cpuBusy.value = false; return }

  // CPU greedy: pick move that maximizes pink discs
  const cpuMoves = validMoves(b, 2)
  let bestMove = cpuMoves[0]!
  let bestCount = -1
  for (const [mr, mc] of cpuMoves) {
    const nb = applyMove(b, mr, mc, 2)
    const cnt = countCells(nb, 2)
    if (cnt > bestCount) { bestCount = cnt; bestMove = [mr, mc] }
  }

  b = applyMove(b, bestMove[0], bestMove[1], 2)
  sfxPop()
  board.value = b
  updateCounts(b)
  cpuBusy.value = false

  if (checkGameOver(b)) return

  // Check if player has moves after CPU turn
  const p1moves = validMoves(b, 1)
  if (!p1moves.length) {
    // Player must skip; trigger CPU again
    // (rare: skip CPU turn if CPU also has none — handled above)
    updateHints(b)
    // Actually no moves for player, skip and go CPU again
    await doCpuTurn(b)
  } else {
    updateHints(b)
  }
}

async function doCpuTurn(b: Board) {
  if (state.value !== 'playing') return
  const cpuMoves = validMoves(b, 2)
  if (!cpuMoves.length) { checkGameOver(b); return }

  cpuBusy.value = true
  await new Promise(res => setTimeout(res, 400))
  if (state.value !== 'playing') { cpuBusy.value = false; return }

  let bestMove = cpuMoves[0]!
  let bestCount = -1
  for (const [mr, mc] of cpuMoves) {
    const nb = applyMove(b, mr, mc, 2)
    const cnt = countCells(nb, 2)
    if (cnt > bestCount) { bestCount = cnt; bestMove = [mr, mc] }
  }

  b = applyMove(b, bestMove[0], bestMove[1], 2)
  sfxPop()
  board.value = b
  updateCounts(b)
  cpuBusy.value = false
  if (checkGameOver(b)) return
  updateHints(b)
}

function restart() { startGame() }
</script>

<template>
  <div class="flex flex-col items-center gap-4 select-none">
    <!-- HUD -->
    <div class="glass-hud px-6 py-2 flex items-center gap-4">
      <span class="w-3 h-3 rounded-full bg-neon-blue shadow-[0_0_6px_#00d4ff]" />
      <span class="font-mono text-sm text-neon-blue font-bold">{{ blueCount }}</span>
      <span class="hud-label text-slate-500">vs</span>
      <span class="font-mono text-sm text-neon-pink font-bold">{{ pinkCount }}</span>
      <span class="w-3 h-3 rounded-full bg-neon-pink shadow-[0_0_6px_#f472b6]" />
      <span v-if="cpuBusy" class="hud-label text-slate-500 ml-2">CPU thinking…</span>
    </div>

    <!-- Idle -->
    <div v-if="state === 'idle'" class="flex flex-col items-center gap-3">
      <p class="font-mono text-xs text-slate-500 text-center max-w-xs">
        Classic Reversi (Othello). Flip your opponent's discs.<br>
        <span class="text-neon-blue">Blue</span> = You &nbsp;|&nbsp; <span class="text-neon-pink">Pink</span> = CPU<br>
        Most discs when board fills wins.
      </p>
      <button class="btn-neon-blue mt-2" @click="startGame">START GAME</button>
    </div>

    <!-- Board -->
    <div v-else class="relative">
      <div class="grid grid-cols-8 border border-white/10 rounded-lg overflow-hidden">
        <template v-for="r in 8" :key="r">
          <div
            v-for="c in 8"
            :key="`${r}-${c}`"
            class="w-10 h-10 flex items-center justify-center relative cursor-pointer transition-colors"
            :class="{
              'bg-emerald-950': (r + c) % 2 === 0,
              'bg-emerald-900': (r + c) % 2 !== 0,
              'hover:bg-emerald-800': hints.has(`${r-1},${c-1}`) && !cpuBusy,
            }"
            @click="clickCell(r-1, c-1)"
          >
            <!-- Hint dot -->
            <div
              v-if="hints.has(`${r-1},${c-1}`) && state === 'playing'"
              class="absolute w-3 h-3 rounded-full bg-neon-blue/40 border border-neon-blue/60"
            />
            <!-- Disc -->
            <div
              v-if="board[r-1]?.[c-1] !== 0"
              class="w-7 h-7 rounded-full transition-all duration-200"
              :class="{
                'bg-neon-blue shadow-[0_0_8px_#00d4ff] border-2 border-blue-300': board[r-1]?.[c-1] === 1,
                'bg-neon-pink shadow-[0_0_8px_#f472b6] border-2 border-pink-300': board[r-1]?.[c-1] === 2,
              }"
            />
          </div>
        </template>
      </div>

      <GameResultOverlay
        v-if="state === 'won' || state === 'over'"
        :state="state"
        :score="score"
        :extra="state === 'won' ? `You: ${blueCount} vs CPU: ${pinkCount}` : `CPU: ${pinkCount} vs You: ${blueCount}`"
        @restart="restart"
      />
    </div>

    <p v-if="state === 'playing'" class="font-mono text-xs text-slate-600">
      Click a <span class="text-neon-blue">blue dot</span> to place your disc
    </p>
  </div>
</template>
