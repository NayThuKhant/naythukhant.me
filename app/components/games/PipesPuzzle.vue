<script setup lang="ts">
// ─── Types ──────────────────────────────────────────────────────────────────
type TileType = 'straight' | 'elbow' | 'tee' | 'cross' | 'source' | 'sink'
interface Tile { type: TileType; rot: number }
interface Puzzle { size: number; tiles: Tile[] }

// ─── Connection maps ─────────────────────────────────────────────────────────
// Sides: 0=up 1=right 2=down 3=left
const CONNECTIONS: Record<TileType, number[][]> = {
  straight: [[1,3],[0,2],[1,3],[0,2]],
  elbow:    [[1,2],[2,3],[3,0],[0,1]],
  tee:      [[1,2,3],[0,2,3],[0,1,3],[0,1,2]],
  cross:    [[0,1,2,3],[0,1,2,3],[0,1,2,3],[0,1,2,3]],
  source:   [[1,2],[1,2],[1,2],[1,2]],  // always right+down
  sink:     [[0,3],[0,3],[0,3],[0,3]],  // always up+left
}

function connects(tile: Tile, side: number): boolean {
  return CONNECTIONS[tile.type][tile.rot]!.includes(side)
}

// ─── Puzzle data (10 puzzles, first 5 are 6×6, last 5 are 7×7) ───────────────
// Each tile encodes the SOLVED rotation; startGame() applies random offsets.
// Layout: row-major. Source always at [0,0], sink at [size-1, size-1].

function makePuzzle(size: number, tileTypes: TileType[], solvedRots: number[]): Puzzle {
  const tiles: Tile[] = tileTypes.map((type, i) => ({ type, rot: solvedRots[i]! }))
  return { size, tiles }
}

// 6×6 puzzles (solved state; startGame randomises rotations)
const RAW_PUZZLES: Puzzle[] = [
  // Puzzle 1 — 6×6
  makePuzzle(6, [
    'source','elbow','straight','elbow','elbow','elbow',
    'elbow' ,'cross','straight','cross','straight','elbow',
    'straight','elbow','elbow','elbow','elbow','elbow',
    'straight','elbow','straight','straight','straight','elbow',
    'elbow','elbow','straight','straight','elbow','elbow',
    'elbow','straight','straight','straight','straight','sink',
  ], [
    0,3,0,3,2,1,
    1,0,1,0,0,2,
    1,1,0,0,3,1,
    1,0,0,0,0,2,
    1,3,0,0,3,2,
    0,0,0,0,0,0,
  ]),
  // Puzzle 2 — 6×6
  makePuzzle(6, [
    'source','straight','elbow','elbow','straight','elbow',
    'straight','straight','elbow','elbow','straight','elbow',
    'elbow','straight','elbow','elbow','straight','elbow',
    'elbow','straight','elbow','elbow','straight','elbow',
    'straight','elbow','straight','straight','elbow','elbow',
    'elbow','straight','straight','straight','straight','sink',
  ], [
    0,0,3,2,1,1,
    1,0,3,2,1,1,
    1,0,3,2,1,1,
    0,0,0,3,1,2,
    1,3,0,0,3,2,
    0,0,0,0,0,0,
  ]),
  // Puzzle 3 — 6×6
  makePuzzle(6, [
    'source','elbow','tee','elbow','straight','elbow',
    'elbow','elbow','straight','elbow','straight','elbow',
    'straight','straight','straight','straight','straight','elbow',
    'elbow','elbow','elbow','elbow','elbow','elbow',
    'elbow','cross','straight','straight','cross','elbow',
    'elbow','elbow','straight','straight','elbow','sink',
  ], [
    0,3,2,2,1,1,
    0,3,1,3,1,2,
    1,0,0,0,0,2,
    1,3,2,3,2,2,
    0,0,0,0,0,2,
    0,3,0,0,3,0,
  ]),
  // Puzzle 4 — 6×6
  makePuzzle(6, [
    'source','straight','elbow','straight','elbow','elbow',
    'straight','straight','elbow','straight','elbow','straight',
    'elbow','straight','elbow','elbow','straight','straight',
    'elbow','elbow','straight','straight','elbow','straight',
    'straight','cross','straight','straight','cross','elbow',
    'elbow','elbow','straight','straight','elbow','sink',
  ], [
    0,0,3,0,3,1,
    1,0,3,0,3,1,
    1,0,3,3,0,0,
    0,3,0,0,3,0,
    1,0,0,0,0,2,
    0,3,0,0,3,0,
  ]),
  // Puzzle 5 — 6×6
  makePuzzle(6, [
    'source','elbow','straight','elbow','elbow','elbow',
    'elbow','tee','elbow','straight','cross','elbow',
    'straight','elbow','cross','elbow','elbow','straight',
    'elbow','straight','elbow','elbow','tee','elbow',
    'elbow','straight','straight','straight','elbow','elbow',
    'elbow','elbow','straight','straight','elbow','sink',
  ], [
    0,3,0,3,2,1,
    0,0,1,0,0,2,
    1,3,0,3,3,1,
    0,1,3,2,0,2,
    0,0,0,0,3,2,
    0,3,0,0,3,0,
  ]),

  // Puzzle 6 — 7×7
  makePuzzle(7, [
    'source','straight','elbow','elbow','straight','elbow','elbow',
    'straight','straight','elbow','elbow','straight','elbow','straight',
    'elbow','straight','elbow','straight','straight','straight','straight',
    'elbow','elbow','straight','straight','straight','elbow','straight',
    'straight','elbow','elbow','straight','straight','elbow','straight',
    'elbow','elbow','straight','straight','elbow','elbow','elbow',
    'elbow','straight','straight','straight','straight','straight','sink',
  ], [
    0,0,3,2,1,1,2,
    1,0,3,2,1,3,0,
    0,0,3,0,0,0,0,
    0,3,0,0,0,3,0,
    1,3,2,0,0,3,0,
    0,3,0,0,3,2,2,
    0,0,0,0,0,0,0,
  ]),
  // Puzzle 7 — 7×7
  makePuzzle(7, [
    'source','elbow','straight','straight','elbow','elbow','elbow',
    'elbow','tee','elbow','straight','elbow','straight','elbow',
    'straight','elbow','elbow','elbow','elbow','straight','straight',
    'elbow','cross','straight','straight','cross','straight','elbow',
    'straight','elbow','elbow','elbow','elbow','straight','elbow',
    'elbow','tee','elbow','straight','elbow','elbow','elbow',
    'elbow','elbow','straight','straight','straight','straight','sink',
  ], [
    0,3,0,0,3,2,1,
    0,0,1,0,3,1,2,
    1,3,3,2,3,0,0,
    0,0,0,0,0,0,2,
    1,3,2,3,3,0,2,
    0,0,3,0,3,2,2,
    0,3,0,0,0,0,0,
  ]),
  // Puzzle 8 — 7×7
  makePuzzle(7, [
    'source','elbow','straight','elbow','elbow','elbow','elbow',
    'elbow','cross','elbow','cross','straight','cross','elbow',
    'straight','elbow','straight','elbow','straight','elbow','straight',
    'elbow','straight','elbow','straight','elbow','straight','elbow',
    'straight','elbow','straight','elbow','straight','elbow','straight',
    'elbow','cross','elbow','cross','elbow','cross','elbow',
    'elbow','straight','straight','straight','straight','straight','sink',
  ], [
    0,3,0,3,2,2,1,
    0,0,3,0,1,0,2,
    1,3,1,3,1,3,1,
    0,0,0,0,0,0,2,
    1,3,1,3,1,3,1,
    0,0,3,0,3,0,2,
    0,0,0,0,0,0,0,
  ]),
  // Puzzle 9 — 7×7
  makePuzzle(7, [
    'source','straight','straight','elbow','elbow','elbow','elbow',
    'elbow','straight','straight','elbow','straight','elbow','elbow',
    'elbow','straight','straight','elbow','straight','straight','straight',
    'elbow','elbow','straight','straight','straight','straight','elbow',
    'straight','elbow','straight','elbow','elbow','straight','elbow',
    'elbow','elbow','elbow','elbow','cross','elbow','elbow',
    'elbow','straight','straight','straight','straight','straight','sink',
  ], [
    0,0,0,3,2,2,1,
    0,1,0,3,0,3,2,
    0,1,0,3,0,0,0,
    0,3,0,0,0,0,2,
    1,3,0,3,3,0,2,
    0,3,2,3,0,3,2,
    0,0,0,0,0,0,0,
  ]),
  // Puzzle 10 — 7×7
  makePuzzle(7, [
    'source','elbow','tee','elbow','elbow','elbow','elbow',
    'elbow','tee','elbow','tee','elbow','tee','elbow',
    'straight','elbow','elbow','elbow','elbow','elbow','straight',
    'straight','straight','straight','straight','straight','straight','straight',
    'straight','elbow','elbow','elbow','elbow','elbow','straight',
    'elbow','tee','elbow','tee','elbow','tee','elbow',
    'elbow','elbow','tee','elbow','elbow','elbow','sink',
  ], [
    0,3,2,3,2,2,1,
    0,0,3,0,3,0,2,
    1,3,2,3,2,3,1,
    0,0,0,0,0,0,0,
    1,3,2,3,2,3,1,
    0,0,3,0,3,0,2,
    0,3,1,3,2,3,0,
  ]),
]

// ─── Sound & state ────────────────────────────────────────────────────────────
const { click: sfxClick, correct: sfxCorrect, win: sfxWin, wrong: sfxWrong } = useGameSounds()

const gameState    = ref<'idle' | 'playing' | 'won'>('idle')
const puzzleIdx    = ref(0)
const tiles        = ref<Tile[]>([])
const gridSize     = ref(6)
const clickCount   = ref(0)
const score        = ref(0)
const connectedSet = ref<Set<number>>(new Set())

// ─── Helpers ──────────────────────────────────────────────────────────────────
function idx(r: number, c: number, size: number) { return r * size + c }

function buildConnected(tileArr: Tile[], size: number): Set<number> {
  const visited = new Set<number>()
  const queue: number[] = [0]  // start from source (0,0)
  while (queue.length) {
    const cur = queue.shift()!
    if (visited.has(cur)) continue
    visited.add(cur)
    const r = Math.floor(cur / size)
    const c = cur % size
    const tile = tileArr[cur]!
    // Check all 4 neighbours
    const neighbours: [number, number, number, number][] = [
      [r-1, c, 0, 2], // up: this side=0, neighbour side=2
      [r, c+1, 1, 3], // right: this side=1, neighbour side=3
      [r+1, c, 2, 0], // down: this side=2, neighbour side=0
      [r, c-1, 3, 1], // left: this side=3, neighbour side=1
    ]
    for (const [nr, nc, mySide, theirSide] of neighbours) {
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
      const ni = idx(nr, nc, size)
      if (visited.has(ni)) continue
      const neighbour = tileArr[ni]!
      if (connects(tile, mySide) && connects(neighbour, theirSide)) {
        queue.push(ni)
      }
    }
  }
  return visited
}

function checkWin(tileArr: Tile[], size: number): boolean {
  const connected = buildConnected(tileArr, size)
  return connected.has(idx(size - 1, size - 1, size))
}

// ─── Game flow ────────────────────────────────────────────────────────────────
function startGame() {
  puzzleIdx.value = 0
  loadPuzzle(0)
  gameState.value = 'playing'
}

function loadPuzzle(pIdx: number) {
  const raw = RAW_PUZZLES[pIdx]!
  gridSize.value = raw.size
  // Randomise rotations (except source and sink)
  tiles.value = raw.tiles.map(t => {
    if (t.type === 'source' || t.type === 'sink') return { ...t }
    const randomOffset = Math.floor(Math.random() * 4)
    return { type: t.type, rot: (t.rot + randomOffset) % 4 }
  })
  clickCount.value = 0
  connectedSet.value = buildConnected(tiles.value, raw.size)
}

function rotateTile(i: number) {
  if (gameState.value !== 'playing') return
  const t = tiles.value[i]!
  if (t.type === 'source' || t.type === 'sink') return
  sfxClick()
  tiles.value[i] = { ...t, rot: (t.rot + 1) % 4 }
  clickCount.value++
  connectedSet.value = buildConnected(tiles.value, gridSize.value)
  const sinkIdx = idx(gridSize.value - 1, gridSize.value - 1, gridSize.value)
  if (connectedSet.value.has(sinkIdx)) {
    sfxCorrect()
    if (puzzleIdx.value < 9) {
      setTimeout(() => {
        puzzleIdx.value++
        loadPuzzle(puzzleIdx.value)
      }, 600)
    } else {
      score.value = Math.max(1, 500 - clickCount.value)
      sfxWin()
      gameState.value = 'won'
    }
  }
}

function restart() {
  startGame()
}

// ─── Rendering helpers ────────────────────────────────────────────────────────
function tileChar(tile: Tile): string {
  if (tile.type === 'source') return '◉'
  if (tile.type === 'sink')   return '◎'
  if (tile.type === 'cross')  return '┼'
  if (tile.type === 'straight') return tile.rot % 2 === 0 ? '─' : '│'
  if (tile.type === 'elbow') {
    const chars = ['└','┘','┐','┌']
    return chars[tile.rot]!
  }
  if (tile.type === 'tee') {
    const chars = ['┴','┤','┬','├']
    return chars[tile.rot]!
  }
  return '?'
}

function tileColor(i: number, tile: Tile): string {
  if (tile.type === 'source') return 'text-neon-emerald'
  if (tile.type === 'sink')   return 'text-neon-pink'
  if (connectedSet.value.has(i)) return 'text-neon-blue'
  return 'text-slate-500'
}

function tileBg(i: number, tile: Tile): string {
  if (tile.type === 'source') return 'bg-neon-emerald/10 border-neon-emerald/40'
  if (tile.type === 'sink')   return 'bg-neon-pink/10 border-neon-pink/40'
  if (connectedSet.value.has(i)) return 'bg-neon-blue/10 border-neon-blue/30'
  return 'bg-white/5 border-white/10 hover:bg-white/10'
}

const cellSize = computed(() => gridSize.value === 6 ? 'w-11 h-11 text-xl' : 'w-9 h-9 text-lg')
</script>

<template>
  <div class="flex flex-col items-center gap-4 select-none">

    <!-- Idle -->
    <div v-if="gameState === 'idle'" class="flex flex-col items-center gap-4">
      <p class="font-mono text-xs text-slate-400 text-center max-w-xs leading-relaxed">
        Rotate pipe tiles so water flows from
        <span class="text-neon-emerald">source ◉</span> to
        <span class="text-neon-pink">sink ◎</span> with no gaps.<br>
        Click any tile to rotate it 90°.
      </p>
      <button class="btn-neon-blue mt-2" @click="startGame">START GAME</button>
    </div>

    <!-- Playing -->
    <div v-else class="relative flex flex-col items-center gap-3">

      <!-- HUD -->
      <div class="flex gap-6 glass-hud px-5 py-2 rounded-lg">
        <div class="text-center">
          <p class="hud-label">PUZZLE</p>
          <p class="font-mono font-bold text-sm text-neon-blue">{{ puzzleIdx + 1 }}/10</p>
        </div>
        <div class="text-center">
          <p class="hud-label">CLICKS</p>
          <p class="font-mono font-bold text-sm text-neon-purple">{{ clickCount }}</p>
        </div>
        <div class="text-center">
          <p class="hud-label">GRID</p>
          <p class="font-mono font-bold text-sm text-slate-400">{{ gridSize }}×{{ gridSize }}</p>
        </div>
      </div>

      <!-- Grid -->
      <div
        class="grid gap-1"
        :style="{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }"
      >
        <button
          v-for="(tile, i) in tiles"
          :key="i"
          :class="[
            'flex items-center justify-center rounded border font-mono font-bold transition-all duration-150',
            cellSize,
            tileBg(i, tile),
            tileColor(i, tile),
            tile.type !== 'source' && tile.type !== 'sink' ? 'cursor-pointer active:scale-95' : 'cursor-default',
          ]"
          @click="rotateTile(i)"
        >
          {{ tileChar(tile) }}
        </button>
      </div>

      <p class="font-mono text-[10px] text-slate-600 text-center">Click tiles to rotate · Connect ◉ to ◎</p>

      <!-- Overlay -->
      <GameResultOverlay
        v-if="gameState === 'won'"
        state="won"
        :score="score"
        extra="All 10 puzzles solved!"
        @restart="restart"
      />
    </div>
  </div>
</template>
