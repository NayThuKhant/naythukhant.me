<script setup lang="ts">
type CellState = 'empty' | 'ship' | 'hit' | 'miss'
type Grid = CellState[][]

interface Ship { size: number; name: string; row: number; col: number; horiz: boolean; sunk: boolean }

const SHIP_DEFS = [
  { size: 5, name: 'Carrier' },
  { size: 4, name: 'Battleship' },
  { size: 3, name: 'Cruiser' },
  { size: 3, name: 'Submarine' },
  { size: 2, name: 'Destroyer' },
]

const { shoot: sfxShoot, pop: sfxPop, miss: sfxMiss, win: sfxWin, lose: sfxLose } = useGameSounds()

const state       = ref<'idle' | 'setup' | 'battle' | 'won' | 'over'>('idle')
const score       = ref(0)

// Setup state
const placingIdx  = ref(0)
const orientation = ref<'H' | 'V'>('H')
const hoverCell   = ref<[number, number] | null>(null)

// Grids
const playerGrid  = ref<Grid>([])
const cpuGrid     = ref<Grid>([])   // actual positions
const cpuFog      = ref<Grid>([])   // what player sees
const playerShips = ref<Ship[]>([])
const cpuShips    = ref<Ship[]>([])

// CPU targeting
const cpuHits     = ref<[number, number][]>([])
const cpuFired    = ref<Set<string>>(new Set())
const cpuBusy     = ref(false)

function makeGrid(): Grid {
  return Array.from({ length: 10 }, () => Array(10).fill('empty') as CellState[])
}

function canPlace(grid: Grid, row: number, col: number, size: number, horiz: boolean): boolean {
  for (let i = 0; i < size; i++) {
    const r = horiz ? row : row + i
    const c = horiz ? col + i : col
    if (r < 0 || r >= 10 || c < 0 || c >= 10) return false
    if (grid[r]![c] !== 'empty') return false
  }
  return true
}

function placeShipOnGrid(grid: Grid, row: number, col: number, size: number, horiz: boolean) {
  for (let i = 0; i < size; i++) {
    const r = horiz ? row : row + i
    const c = horiz ? col + i : col
    grid[r]![c] = 'ship'
  }
}

function randomPlace(grid: Grid, size: number): { row: number; col: number; horiz: boolean } | null {
  for (let attempt = 0; attempt < 200; attempt++) {
    const horiz = Math.random() < 0.5
    const row = Math.floor(Math.random() * (horiz ? 10 : 10 - size + 1))
    const col = Math.floor(Math.random() * (horiz ? 10 - size + 1 : 10))
    if (canPlace(grid, row, col, size, horiz)) return { row, col, horiz }
  }
  return null
}

function generateCpuShips(): { ships: Ship[]; grid: Grid } {
  const grid = makeGrid()
  const ships: Ship[] = []
  for (const def of SHIP_DEFS) {
    const pos = randomPlace(grid, def.size)
    if (!pos) continue
    placeShipOnGrid(grid, pos.row, pos.col, def.size, pos.horiz)
    ships.push({ ...def, ...pos, sunk: false })
  }
  return { ships, grid }
}

function randomizePlacement() {
  const grid = makeGrid()
  const ships: Ship[] = []
  for (const def of SHIP_DEFS) {
    const pos = randomPlace(grid, def.size)
    if (!pos) continue
    placeShipOnGrid(grid, pos.row, pos.col, def.size, pos.horiz)
    ships.push({ ...def, ...pos, sunk: false })
  }
  playerGrid.value = grid
  playerShips.value = ships
  placingIdx.value = SHIP_DEFS.length // all placed
}

function startSetup() {
  playerGrid.value = makeGrid()
  playerShips.value = []
  placingIdx.value = 0
  orientation.value = 'H'
  hoverCell.value = null
  state.value = 'setup'
}

function toggleOrientation() {
  orientation.value = orientation.value === 'H' ? 'V' : 'H'
}

const currentShip = computed(() => SHIP_DEFS[placingIdx.value] ?? null)

function hoverPreview(r: number, c: number) {
  hoverCell.value = [r, c]
}

function previewCells(r: number, c: number): [number, number][] {
  if (!currentShip.value) return []
  const cells: [number, number][] = []
  for (let i = 0; i < currentShip.value.size; i++) {
    cells.push(orientation.value === 'H' ? [r, c + i] : [r + i, c])
  }
  return cells
}

function isPreviewValid(r: number, c: number): boolean {
  if (!currentShip.value) return false
  return canPlace(playerGrid.value, r, c, currentShip.value.size, orientation.value === 'H')
}

function clickSetupCell(r: number, c: number) {
  if (!currentShip.value) return
  const horiz = orientation.value === 'H'
  if (!canPlace(playerGrid.value, r, c, currentShip.value.size, horiz)) return
  const def = currentShip.value
  const grid = playerGrid.value.map(row => [...row] as CellState[])
  placeShipOnGrid(grid, r, c, def.size, horiz)
  playerGrid.value = grid
  playerShips.value.push({ ...def, row: r, col: c, horiz, sunk: false })
  placingIdx.value++
}

function startBattle() {
  if (placingIdx.value < SHIP_DEFS.length) return
  const { ships, grid } = generateCpuShips()
  cpuShips.value = ships
  cpuGrid.value = grid
  cpuFog.value = makeGrid()
  cpuHits.value = []
  cpuFired.value = new Set()
  cpuBusy.value = false
  score.value = 0
  state.value = 'battle'
}

function checkSunkShips(ships: Ship[], grid: Grid, fog: Grid): Ship[] {
  return ships.map(ship => {
    if (ship.sunk) return ship
    for (let i = 0; i < ship.size; i++) {
      const r = ship.horiz ? ship.row : ship.row + i
      const c = ship.horiz ? ship.col + i : ship.col
      if (fog[r]![c] !== 'hit') return ship
    }
    return { ...ship, sunk: true }
  })
}

function countSunk(ships: Ship[]): number {
  return ships.filter(s => s.sunk).length
}

async function fireAt(r: number, c: number) {
  if (state.value !== 'battle' || cpuBusy.value) return
  const fog = cpuFog.value.map(row => [...row] as CellState[])
  if (fog[r]![c] !== 'empty') return

  sfxShoot()
  const actual = cpuGrid.value[r]![c]
  if (actual === 'ship') {
    fog[r]![c] = 'hit'
    sfxPop()
    cpuShips.value = checkSunkShips(cpuShips.value, cpuGrid.value, fog)
  } else {
    fog[r]![c] = 'miss'
    sfxMiss()
  }
  cpuFog.value = fog
  score.value = countSunk(cpuShips.value)

  if (cpuShips.value.every(s => s.sunk)) {
    sfxWin(); state.value = 'won'; return
  }

  // CPU turn
  cpuBusy.value = true
  await new Promise(res => setTimeout(res, 600))
  if (state.value !== 'battle') { cpuBusy.value = false; return }
  cpuFire()
  cpuBusy.value = false
}

function cpuFire() {
  let target: [number, number] | null = null

  // Smart targeting: if there are hits, try adjacent
  if (cpuHits.value.length) {
    const lastHit = cpuHits.value[cpuHits.value.length - 1]!
    const adj: [number, number][] = [[-1,0],[1,0],[0,-1],[0,1]]
    for (const [dr, dc] of adj) {
      const nr = lastHit[0] + dr, nc = lastHit[1] + dc
      if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10 && !cpuFired.value.has(`${nr},${nc}`)) {
        target = [nr, nc]; break
      }
    }
  }

  // Random fallback
  if (!target) {
    const cells: [number, number][] = []
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++)
        if (!cpuFired.value.has(`${r},${c}`)) cells.push([r, c])
    if (!cells.length) return
    target = cells[Math.floor(Math.random() * cells.length)]!
  }

  const [r, c] = target
  cpuFired.value.add(`${r},${c}`)
  sfxShoot()

  const grid = playerGrid.value.map(row => [...row] as CellState[])
  if (grid[r]![c] === 'ship') {
    grid[r]![c] = 'hit'
    sfxPop()
    cpuHits.value.push([r, c])
    playerShips.value = checkSunkShips(playerShips.value, makePlayerActualGrid(), playerGrid.value)
  } else {
    if (grid[r]![c] === 'empty') { grid[r]![c] = 'miss'; sfxMiss() }
    // Remove last hit from targeting if we missed while targeting
    if (cpuHits.value.length) cpuHits.value.pop()
  }
  playerGrid.value = grid

  if (playerShips.value.every(s => s.sunk)) {
    sfxLose(); state.value = 'over'
  }
}

function makePlayerActualGrid(): Grid {
  // Rebuild player actual ship positions from ship list
  const g = makeGrid()
  for (const ship of playerShips.value) {
    for (let i = 0; i < ship.size; i++) {
      const r = ship.horiz ? ship.row : ship.row + i
      const c = ship.horiz ? ship.col + i : ship.col
      if (g[r] && g[r]![c] !== undefined) g[r]![c] = 'ship'
    }
  }
  return g
}

function restart() { startSetup() }

// Compute preview validity map for setup
const previewMap = computed<Map<string, 'valid' | 'invalid'>>(() => {
  const m = new Map<string, 'valid' | 'invalid'>()
  if (!hoverCell.value || !currentShip.value) return m
  const [hr, hc] = hoverCell.value
  const cells = previewCells(hr, hc)
  const valid = isPreviewValid(hr, hc)
  for (const [r, c] of cells) {
    if (r >= 0 && r < 10 && c >= 0 && c < 10)
      m.set(`${r},${c}`, valid ? 'valid' : 'invalid')
  }
  return m
})
</script>

<template>
  <div class="flex flex-col items-center gap-4 select-none">

    <!-- Idle -->
    <div v-if="state === 'idle'" class="flex flex-col items-center gap-3">
      <p class="font-mono text-xs text-slate-500 text-center max-w-xs">
        Classic Battleship! Place your 5 ships, then sink the CPU fleet.<br>
        Click to place ships. Toggle H/V for orientation.
      </p>
      <button class="btn-neon-blue mt-2" @click="startSetup">START GAME</button>
    </div>

    <!-- Setup phase -->
    <div v-else-if="state === 'setup'" class="flex flex-col items-center gap-3">
      <div class="glass-hud px-4 py-2 flex items-center gap-3">
        <span class="hud-label">
          {{ currentShip ? `Place: ${currentShip.name} (${currentShip.size})` : 'All ships placed!' }}
        </span>
        <button v-if="currentShip" class="btn-neon-purple text-xs px-3 py-1" @click="toggleOrientation">
          {{ orientation }} — Toggle
        </button>
      </div>

      <!-- Player grid for setup -->
      <div
        class="grid border border-white/10 rounded-lg overflow-hidden"
        style="grid-template-columns: repeat(10, 2.25rem)"
        @mouseleave="hoverCell = null"
      >
        <template v-for="r in 10" :key="r">
          <div
            v-for="c in 10"
            :key="`${r}-${c}`"
            class="w-9 h-9 flex items-center justify-center border border-white/5 cursor-pointer transition-colors"
            :class="{
              'bg-neon-blue/50 border-neon-blue':   playerGrid[r-1]?.[c-1] === 'ship',
              'bg-neon-emerald/30 border-neon-emerald/60': previewMap.get(`${r-1},${c-1}`) === 'valid',
              'bg-red-500/30 border-red-400/60':    previewMap.get(`${r-1},${c-1}`) === 'invalid',
              'bg-slate-900/60':                    playerGrid[r-1]?.[c-1] === 'empty' && !previewMap.has(`${r-1},${c-1}`),
            }"
            @mouseover="hoverCell = [r-1, c-1]"
            @click="clickSetupCell(r-1, c-1)"
          />
        </template>
      </div>

      <div class="flex gap-3">
        <button class="btn-neon-purple" @click="randomizePlacement">RANDOM</button>
        <button
          class="btn-neon-emerald"
          :class="placingIdx < SHIP_DEFS.length ? 'opacity-40 cursor-not-allowed' : ''"
          @click="startBattle"
        >READY</button>
      </div>

      <!-- Ship status -->
      <div class="flex flex-wrap gap-2 justify-center">
        <span
          v-for="(def, i) in SHIP_DEFS"
          :key="i"
          class="font-mono text-[10px] px-2 py-0.5 rounded border"
          :class="i < placingIdx ? 'text-neon-emerald border-neon-emerald/40 bg-neon-emerald/10' : 'text-slate-500 border-slate-700'"
        >{{ def.name }}</span>
      </div>
    </div>

    <!-- Battle phase -->
    <div v-else class="relative flex flex-col items-center gap-4">
      <!-- HUD -->
      <div class="glass-hud px-4 py-2 flex items-center gap-4">
        <span class="hud-label">Your ships: {{ playerShips.filter(s => !s.sunk).length }}</span>
        <span class="text-slate-600">|</span>
        <span class="hud-label text-neon-pink">CPU sunk: {{ score }}/{{ SHIP_DEFS.length }}</span>
        <span v-if="cpuBusy" class="hud-label text-slate-500">CPU firing…</span>
      </div>

      <div class="flex gap-6 flex-wrap justify-center">
        <!-- Player grid (display only) -->
        <div class="flex flex-col items-center gap-1">
          <span class="hud-label text-xs text-slate-500">YOUR FLEET</span>
          <div class="grid border border-white/10 rounded overflow-hidden" style="grid-template-columns: repeat(10, 1.6rem)">
            <template v-for="r in 10" :key="r">
              <div
                v-for="c in 10"
                :key="`p${r}-${c}`"
                class="w-[1.6rem] h-[1.6rem] flex items-center justify-center border border-white/5 text-[10px] font-bold"
                :class="{
                  'bg-neon-blue/40':  playerGrid[r-1]?.[c-1] === 'ship',
                  'bg-red-500/70':    playerGrid[r-1]?.[c-1] === 'hit',
                  'bg-slate-700/30':  playerGrid[r-1]?.[c-1] === 'miss',
                  'bg-slate-900/40':  playerGrid[r-1]?.[c-1] === 'empty',
                }"
              >
                <span v-if="playerGrid[r-1]?.[c-1] === 'hit'" class="text-red-300">✕</span>
                <span v-else-if="playerGrid[r-1]?.[c-1] === 'miss'" class="text-slate-600">·</span>
              </div>
            </template>
          </div>
        </div>

        <!-- CPU grid (fog of war) -->
        <div class="flex flex-col items-center gap-1">
          <span class="hud-label text-xs text-neon-pink">ENEMY WATERS</span>
          <div class="grid border border-white/10 rounded overflow-hidden" style="grid-template-columns: repeat(10, 1.6rem)">
            <template v-for="r in 10" :key="r">
              <div
                v-for="c in 10"
                :key="`c${r}-${c}`"
                class="w-[1.6rem] h-[1.6rem] flex items-center justify-center border border-white/5 text-[10px] font-bold cursor-pointer transition-colors"
                :class="{
                  'bg-red-600/70 cursor-default':   cpuFog[r-1]?.[c-1] === 'hit',
                  'bg-slate-700/50 cursor-default':  cpuFog[r-1]?.[c-1] === 'miss',
                  'bg-slate-900/40 hover:bg-neon-blue/10': cpuFog[r-1]?.[c-1] === 'empty',
                }"
                @click="fireAt(r-1, c-1)"
              >
                <span v-if="cpuFog[r-1]?.[c-1] === 'hit'" class="text-red-300">✕</span>
                <span v-else-if="cpuFog[r-1]?.[c-1] === 'miss'" class="text-slate-500">·</span>
              </div>
            </template>
          </div>
        </div>
      </div>

      <GameResultOverlay
        v-if="state === 'won' || state === 'over'"
        :state="state"
        :score="score"
        :extra="state === 'won' ? 'Enemy fleet destroyed!' : 'Your fleet was sunk!'"
        @restart="restart"
      />
    </div>
  </div>
</template>
