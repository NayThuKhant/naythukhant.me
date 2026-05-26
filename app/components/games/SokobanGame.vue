<script setup lang="ts">
// Tile chars: ' '=floor, '#'=wall, '.'=goal, '$'=box, '*'=box-on-goal, '@'=player, '+'=player-on-goal
const LEVELS: string[][] = [
  ['#########','#.......#','#.@$$...#','#.......#','#....$..#','#.......#','#########'],
  ['########','#......#','#.@$...#','#...$..#','#...$.#.#','#...*..#','#..#...#','########'],
  ['##########','#.....#..#','#.@$..#..#','#.....#..#','#..$#...$#','#.....#..#','#....*...#','##########'],
  [' #####','##...##','#.@$.##','#...$..#','##..#..#',' ##.#..#','  #....#','  ######'],
  ['########','##..#..#','#.@$.$.#','#..#...#','#....$.#','#..#...#','#....**#','########'],
]

const CELL = 44
const COLORS = { wall: '#1e293b', floor: '#070a13', goal: '#0f2a1a', box: '#78350f', boxGoal: '#00ff88', player: '#00d4ff' }

type Pos = [number, number]

const { move: sfxMove, drop: sfxDrop, levelUp: sfxLevelUp, win: sfxWin } = useGameSounds()

const state    = ref<'idle' | 'playing' | 'won'>('idle')
const levelIdx = ref(0)
const grid     = ref<string[][]>([])
const playerPos = ref<Pos>([0, 0])
const moveCount = ref(0)
const totalMoves = ref(0)
const score    = ref(0)
let history: string[][][] = []

function parseLevel(lvl: string[]): { grid: string[][], player: Pos } {
  const g = lvl.map(row => row.split(''))
  let player: Pos = [0, 0]
  for (let r = 0; r < g.length; r++) for (let c = 0; c < (g[r]?.length ?? 0); c++) {
    if (g[r]![c] === '@' || g[r]![c] === '+') player = [r, c]
  }
  return { grid: g, player }
}

function startGame() {
  levelIdx.value = 0
  totalMoves.value = 0
  loadLevel(0)
}

function loadLevel(idx: number) {
  const { grid: g, player } = parseLevel(LEVELS[idx]!)
  grid.value = g
  playerPos.value = player
  moveCount.value = 0
  history = []
  state.value = 'playing'
}

function cellAt(g: string[][], r: number, c: number): string {
  return g[r]?.[c] ?? '#'
}

function isBox(c: string) { return c === '$' || c === '*' }
function isGoal(c: string) { return c === '.' || c === '*' || c === '+' }
function isFloor(c: string) { return c === ' ' || c === '.' || c === '@' || c === '+' }

function move(dr: number, dc: number) {
  if (state.value !== 'playing') return
  const g = grid.value.map(r => [...r])
  const [pr, pc] = playerPos.value
  const nr = pr + dr, nc = pc + dc

  const dest = cellAt(g, nr, nc)
  if (!isFloor(dest) && !isBox(dest)) return

  // Save history
  history.push(grid.value.map(r => [...r]))

  const curr = cellAt(g, pr, pc)
  const playerLeaves = curr === '+' ? '.' : ' '

  if (isBox(dest)) {
    const br = nr + dr, bc = nc + dc
    const beyond = cellAt(g, br, bc)
    if (!isFloor(beyond)) return
    history[history.length - 1]  // already saved
    const boxPlaces = isGoal(beyond) ? '*' : '$'
    g[br]![bc] = boxPlaces
    g[nr]![nc] = isGoal(dest) ? '+' : '@'
    g[pr]![pc] = playerLeaves
    sfxDrop()
  } else {
    g[nr]![nc] = isGoal(dest) ? '+' : '@'
    g[pr]![pc] = playerLeaves
    sfxMove()
  }

  grid.value = g
  playerPos.value = [nr, nc]
  moveCount.value++

  if (checkWin(g)) {
    totalMoves.value += moveCount.value
    const next = levelIdx.value + 1
    if (next >= LEVELS.length) {
      score.value = totalMoves.value
      sfxWin()
      state.value = 'won'
    } else {
      sfxLevelUp()
      levelIdx.value = next
      setTimeout(() => loadLevel(next), 600)
    }
  }
}

function undo() {
  if (!history.length) return
  grid.value = history.pop()!
  // Find player pos
  for (let r = 0; r < grid.value.length; r++) {
    for (let c = 0; c < (grid.value[r]?.length ?? 0); c++) {
      if (grid.value[r]![c] === '@' || grid.value[r]![c] === '+') { playerPos.value = [r, c]; return }
    }
  }
  moveCount.value = Math.max(0, moveCount.value - 1)
}

function checkWin(g: string[][]): boolean {
  for (const row of g) for (const cell of row) if (cell === '$') return false
  return true
}

function cellColor(cell: string): string {
  if (cell === '#') return COLORS.wall
  if (cell === '.' || cell === '+') return COLORS.goal
  return COLORS.floor
}

function restart() { startGame() }

function onKey(e: KeyboardEvent) {
  if (state.value !== 'playing') return
  if (e.key === 'ArrowUp')    { e.preventDefault(); move(-1, 0) }
  if (e.key === 'ArrowDown')  { e.preventDefault(); move(1, 0) }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); move(0, -1) }
  if (e.key === 'ArrowRight') { e.preventDefault(); move(0, 1) }
  if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey || true)) undo()
}

function onGameKey(e: KeyboardEvent) {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') move(
    e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0,
    e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
  )
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="flex flex-col items-center gap-4 select-none">
    <div class="glass-hud px-4 py-2 flex items-center gap-6">
      <div class="text-center">
        <p class="hud-label text-[10px]">LEVEL</p>
        <p class="font-mono font-bold text-white text-lg">{{ levelIdx + 1 }} / {{ LEVELS.length }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">MOVES</p>
        <p class="font-mono font-bold text-white text-lg">{{ moveCount }}</p>
      </div>
      <button class="font-mono text-xs text-slate-500 hover:text-slate-300 px-2 py-1 border border-slate-700 rounded transition-colors" @click="undo">
        ↩ Undo
      </button>
    </div>

    <div v-if="state === 'idle'" class="flex flex-col items-center gap-3">
      <p class="font-mono text-xs text-slate-500 text-center max-w-xs">
        Push all boxes onto the green goal squares. Arrow keys to move.<br>
        Undo: Z key. Complete all 5 levels!
      </p>
      <button class="btn-neon-blue mt-2" @click="startGame">START GAME</button>
    </div>

    <div v-else class="relative flex flex-col items-center gap-2">
      <!-- Grid -->
      <div class="rounded-xl overflow-hidden border border-white/10">
        <div
          v-for="(row, r) in grid"
          :key="r"
          class="flex"
        >
          <div
            v-for="(cell, c) in row"
            :key="`${r}-${c}`"
            class="flex items-center justify-center"
            :style="{ width: `${CELL}px`, height: `${CELL}px`, backgroundColor: cellColor(cell) }"
          >
            <!-- Wall -->
            <div
              v-if="cell === '#'"
              class="w-full h-full"
              style="background: linear-gradient(135deg, #1e293b, #0f172a)"
            />
            <!-- Box -->
            <div
              v-else-if="cell === '$'"
              class="w-8 h-8 rounded border-2 border-amber-600"
              style="background: linear-gradient(135deg, #92400e, #78350f)"
            />
            <!-- Box on goal -->
            <div
              v-else-if="cell === '*'"
              class="w-8 h-8 rounded border-2 border-neon-emerald shadow-[0_0_10px_#00ff88]"
              style="background: linear-gradient(135deg, #065f46, #064e3b)"
            />
            <!-- Player -->
            <div
              v-else-if="cell === '@' || cell === '+'"
              class="w-7 h-7 rounded-full border-2 border-blue-300 shadow-[0_0_12px_#00d4ff]"
              style="background: radial-gradient(circle, #60a5fa, #00d4ff)"
            />
            <!-- Goal dot -->
            <div
              v-else-if="cell === '.'"
              class="w-3 h-3 rounded-full bg-neon-emerald/40 border border-neon-emerald/60"
            />
          </div>
        </div>
      </div>

      <!-- Mobile controls -->
      <div class="flex flex-col items-center gap-1">
        <button class="w-10 h-10 rounded bg-slate-800 border border-slate-700 text-white font-bold hover:bg-slate-700 transition-colors" @click="move(-1, 0)">▲</button>
        <div class="flex gap-1">
          <button class="w-10 h-10 rounded bg-slate-800 border border-slate-700 text-white font-bold hover:bg-slate-700 transition-colors" @click="move(0, -1)">◀</button>
          <button class="w-10 h-10 rounded bg-slate-800 border border-slate-700 text-white font-bold hover:bg-slate-700 transition-colors" @click="move(1, 0)">▼</button>
          <button class="w-10 h-10 rounded bg-slate-800 border border-slate-700 text-white font-bold hover:bg-slate-700 transition-colors" @click="move(0, 1)">▶</button>
        </div>
      </div>

      <GameResultOverlay v-if="state === 'won'" :state="state" :score="totalMoves" :extra="`${totalMoves} total moves`" @restart="restart" />
    </div>
  </div>
</template>
