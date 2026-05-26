<script setup lang="ts">
type Piece = { player: 1 | 2; king: boolean } | null
type Board = (Piece)[][]

const { place: sfxPlace, pop: sfxPop, win: sfxWin, lose: sfxLose } = useGameSounds()

const state    = ref<'idle' | 'playing' | 'won' | 'over'>('idle')
const board    = ref<Board>([])
const selected = ref<[number, number] | null>(null)
const validMoves = ref<[number, number][]>([])
const score    = ref(0)
const cpuBusy  = ref(false)

function makeBoard(): Board {
  return Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: 8 }, (_, c) => {
      if ((r + c) % 2 === 1) {
        if (r < 3) return { player: 2, king: false }
        if (r > 4) return { player: 1, king: false }
      }
      return null
    })
  )
}

interface Move { from: [number, number]; to: [number, number]; captured?: [number, number] }

function getJumps(b: Board, r: number, c: number): Move[] {
  const piece = b[r]![c]!
  const dirs: [number, number][] = piece.king
    ? [[-1,-1],[-1,1],[1,-1],[1,1]]
    : piece.player === 1 ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]]
  const jumps: Move[] = []
  for (const [dr, dc] of dirs) {
    const mr = r + dr, mc = c + dc
    const jr = r + 2*dr, jc = c + 2*dc
    if (jr < 0 || jr > 7 || jc < 0 || jc > 7) continue
    const mid = b[mr]?.[mc]
    if (mid && mid.player !== piece.player && !b[jr]![jc]) {
      jumps.push({ from: [r, c], to: [jr, jc], captured: [mr, mc] })
    }
  }
  return jumps
}

function getMoves(b: Board, r: number, c: number): Move[] {
  const piece = b[r]![c]
  if (!piece) return []
  const jumps = getJumps(b, r, c)
  if (jumps.length) return jumps
  const dirs: [number, number][] = piece.king
    ? [[-1,-1],[-1,1],[1,-1],[1,1]]
    : piece.player === 1 ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]]
  const moves: Move[] = []
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc
    if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7 && !b[nr]![nc]) {
      moves.push({ from: [r, c], to: [nr, nc] })
    }
  }
  return moves
}

function allMoves(b: Board, player: 1 | 2): Move[] {
  const all: Move[] = []
  // Check if any jumps exist
  const jumps: Move[] = []
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (b[r]![c]?.player === player) jumps.push(...getJumps(b, r, c))
  }
  if (jumps.length) return jumps
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (b[r]![c]?.player === player) all.push(...getMoves(b, r, c))
  }
  return all
}

function applyMove(b: Board, move: Move): Board {
  const nb = b.map(row => row.map(cell => cell ? { ...cell } : null))
  const piece = nb[move.from[0]]![move.from[1]]!
  nb[move.to[0]]![move.to[1]] = piece
  nb[move.from[0]]![move.from[1]] = null
  if (move.captured) nb[move.captured[0]]![move.captured[1]] = null
  // King promotion
  if (piece.player === 1 && move.to[0] === 0) piece.king = true
  if (piece.player === 2 && move.to[0] === 7) piece.king = true
  return nb
}

function heuristic(b: Board): number {
  let score = 0
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = b[r]![c]
    if (!p) continue
    const val = p.king ? 3 : 1
    score += p.player === 2 ? val : -val
  }
  return score
}

function minimax(b: Board, depth: number, alpha: number, beta: number, maxing: boolean): number {
  const player = maxing ? 2 : 1 as 1 | 2
  const moves = allMoves(b, player)
  if (!moves.length || depth === 0) return heuristic(b)
  if (maxing) {
    let best = -Infinity
    for (const m of moves) {
      best = Math.max(best, minimax(applyMove(b, m), depth - 1, alpha, beta, false))
      alpha = Math.max(alpha, best)
      if (alpha >= beta) break
    }
    return best
  } else {
    let best = Infinity
    for (const m of moves) {
      best = Math.min(best, minimax(applyMove(b, m), depth - 1, alpha, beta, true))
      beta = Math.min(beta, best)
      if (alpha >= beta) break
    }
    return best
  }
}

function cpuChoose(b: Board): Move | null {
  const moves = allMoves(b, 2)
  if (!moves.length) return null
  let best = -Infinity, bestMove = moves[0]!
  for (const m of moves) {
    const s = minimax(applyMove(b, m), 3, -Infinity, Infinity, false)
    if (s > best) { best = s; bestMove = m }
  }
  return bestMove
}

function startGame() {
  board.value = makeBoard()
  selected.value = null
  validMoves.value = []
  cpuBusy.value = false
  score.value = 0
  state.value = 'playing'
}

function countPieces(b: Board, player: 1 | 2): number {
  let n = 0
  for (const row of b) for (const cell of row) if (cell?.player === player) n++
  return n
}

async function clickCell(r: number, c: number) {
  if (state.value !== 'playing' || cpuBusy.value) return
  const piece = board.value[r]![c]

  // If clicking on own piece, select it
  if (piece?.player === 1) {
    selected.value = [r, c]
    // Get all forced jump moves if any exist
    const forced = allMoves(board.value, 1).filter(m => m.captured)
    const moves = forced.length ? forced.filter(m => m.from[0] === r && m.from[1] === c) : getMoves(board.value, r, c)
    validMoves.value = moves.map(m => m.to)
    return
  }

  // If a piece is selected, try to move
  if (!selected.value) return
  const [sr, sc] = selected.value
  const move = allMoves(board.value, 1).find(m =>
    m.from[0] === sr && m.from[1] === sc && m.to[0] === r && m.to[1] === c
  )
  if (!move) { selected.value = null; validMoves.value = []; return }

  let nb = applyMove(board.value, move)
  selected.value = null
  validMoves.value = []

  if (move.captured) sfxPop(); else sfxPlace()

  // Multi-jump
  if (move.captured) {
    const furtherJumps = getJumps(nb, move.to[0], move.to[1])
    if (furtherJumps.length) {
      board.value = nb
      selected.value = move.to
      validMoves.value = furtherJumps.map(m => m.to)
      return
    }
  }

  board.value = nb

  if (!allMoves(nb, 2).length || countPieces(nb, 2) === 0) {
    score.value = countPieces(nb, 2) === 0 ? 12 : countPieces(nb, 1)
    sfxWin()
    state.value = 'won'; return
  }

  cpuBusy.value = true
  await new Promise(res => setTimeout(res, 350))
  if (state.value !== 'playing') { cpuBusy.value = false; return }

  const cpuMove = cpuChoose(board.value)
  if (cpuMove) {
    nb = applyMove(board.value, cpuMove)
    board.value = nb
  }
  cpuBusy.value = false

  if (!allMoves(nb, 1).length || countPieces(nb, 1) === 0) {
    sfxLose()
    state.value = 'over'
  }
}

function restart() { startGame() }

const isValid = computed(() => {
  const set = new Set(validMoves.value.map(([r, c]) => `${r},${c}`))
  return (r: number, c: number) => set.has(`${r},${c}`)
})
</script>

<template>
  <div class="flex flex-col items-center gap-4 select-none">
    <div class="glass-hud px-6 py-2 flex items-center gap-6">
      <div class="flex items-center gap-2">
        <span class="w-4 h-4 rounded-full bg-slate-200 border border-white" />
        <span class="font-mono text-xs text-slate-400">You</span>
        <span class="font-mono text-xs text-slate-600 mx-1">vs</span>
        <span class="font-mono text-xs text-slate-400">CPU</span>
        <span class="w-4 h-4 rounded-full bg-neon-blue shadow-neon-sm-blue" />
      </div>
    </div>

    <div v-if="state === 'idle'" class="flex flex-col items-center gap-3">
      <p class="font-mono text-xs text-slate-500 text-center">
        Standard checkers vs CPU. Capture all opponent pieces to win.<br>
        You play white (light squares). Jumps are mandatory.
      </p>
      <button class="btn-neon-blue mt-2" @click="startGame">START GAME</button>
    </div>

    <div v-else class="relative">
      <div class="grid grid-cols-8 border border-white/10 rounded-lg overflow-hidden">
        <template v-for="r in 8" :key="r">
        <div
          v-for="c in 8"
          :key="`${r}-${c}`"
          class="w-9 h-9 flex items-center justify-center cursor-pointer relative"
          :class="{
            'bg-slate-800': (r + c) % 2 === 0,
            'bg-slate-900': (r + c) % 2 !== 0,
            'ring-2 ring-neon-blue/60': selected && selected[0] === r-1 && selected[1] === c-1,
            'bg-neon-blue/10': isValid(r-1, c-1),
          }"
          @click="clickCell(r-1, c-1)"
        >
          <!-- Valid move dot -->
          <div v-if="isValid(r-1, c-1)" class="absolute w-3 h-3 rounded-full bg-neon-blue/50" />

          <!-- Piece -->
          <div
            v-if="board[r-1]![c-1]"
            class="w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all z-10"
            :class="{
              'bg-slate-100 border-white': board[r-1]![c-1]?.player === 1,
              'bg-neon-blue border-blue-300 shadow-[0_0_8px_#00d4ff]': board[r-1]![c-1]?.player === 2,
              'ring-2 ring-yellow-400': selected?.[0] === r-1 && selected?.[1] === c-1,
            }"
          >
            <span v-if="board[r-1]![c-1]?.king" class="text-[10px] font-bold" :class="board[r-1]![c-1]?.player === 1 ? 'text-slate-800' : 'text-white'">♔</span>
          </div>
        </div>
        </template>
      </div>

      <GameResultOverlay
        v-if="state === 'won' || state === 'over'"
        :state="state === 'won' ? 'won' : 'over'"
        :score="score"
        @restart="restart"
      />
    </div>

    <p v-if="state === 'playing'" class="font-mono text-xs text-slate-600">Click your piece, then click where to move</p>
  </div>
</template>
