<script setup lang="ts">
const CELL = 22
const COLS = 21, ROWS = 21
const W = COLS * CELL, H = ROWS * CELL + 40
const τ = Math.PI * 2

// Maze: 0=wall, 1=dot, 2=power pellet, 3=empty
const MAZE_TEMPLATE = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0],
  [0,2,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,2,0],
  [0,1,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,0,0,1,0,1,0,0,0,0,0,0,0,1,0,1,0,0,1,0],
  [0,1,1,1,1,0,1,1,1,0,0,0,1,1,1,0,1,1,1,1,0],
  [0,0,0,0,1,0,0,0,3,0,0,0,3,0,0,0,1,0,0,0,0],
  [0,0,0,0,1,0,3,3,3,3,3,3,3,3,3,0,1,0,0,0,0],
  [0,0,0,0,1,0,3,0,0,3,3,3,0,0,3,0,1,0,0,0,0],
  [3,3,3,3,1,3,3,0,3,3,3,3,3,0,3,3,1,3,3,3,3],
  [0,0,0,0,1,0,3,0,0,0,0,0,0,0,3,0,1,0,0,0,0],
  [0,0,0,0,1,0,3,3,3,3,3,3,3,3,3,0,1,0,0,0,0],
  [0,0,0,0,1,0,3,0,0,0,0,0,0,0,3,0,1,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,0],
  [0,1,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,1,0],
  [0,2,1,0,1,1,1,1,1,1,3,1,1,1,1,1,1,0,1,2,0],
  [0,0,1,0,1,0,1,0,0,0,0,0,0,0,1,0,1,0,1,0,0],
  [0,1,1,1,1,0,1,1,1,0,0,0,1,1,1,0,1,1,1,1,0],
  [0,1,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
]

const state = ref<'idle' | 'playing' | 'over' | 'won'>('idle')
const score = ref(0)
const lives = ref(3)
let raf = 0
const canvasEl = ref<HTMLCanvasElement | null>(null)

let maze: number[][] = MAZE_TEMPLATE.map(r => [...r])
interface Ghost { col: number; row: number; dir: [number,number]; scared: boolean; scaredTimer: number; color: string }
let pac = { col: 10, row: 16, dir: [1,0] as [number,number], nextDir: [1,0] as [number,number], mouthAngle: 0, mouthOpen: true }
let ghosts: Ghost[] = []
let pacMoveTimer = 0
let ghostMoveTimer = 0
let powerTimer = 0
let totalDots = 0
let eatenDots = 0

function initMaze(): number[][] { return MAZE_TEMPLATE.map(r => [...r]) }

function isWall(maze: number[][], r: number, c: number): boolean {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true
  return maze[r]![c] === 0
}

function canMove(maze: number[][], r: number, c: number, dr: number, dc: number): boolean {
  return !isWall(maze, r + dr, c + dc)
}

function bfsNextDir(maze: number[][], fromR: number, fromC: number, toR: number, toC: number): [number,number] {
  const queue: [number, number, [number,number]][] = [[fromR, fromC, [0,0]]]
  const visited = new Set<string>([`${fromR},${fromC}`])
  const DIRS: [number,number][] = [[0,1],[0,-1],[1,0],[-1,0]]
  while (queue.length) {
    const [r, c, firstDir] = queue.shift()!
    if (r === toR && c === toC) return firstDir
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc
      const key = `${nr},${nc}`
      if (!visited.has(key) && !isWall(maze, nr, nc)) {
        visited.add(key)
        queue.push([nr, nc, firstDir[0] === 0 && firstDir[1] === 0 ? [dr,dc] : firstDir])
      }
    }
  }
  return [0,0]
}

function initGame() {
  maze = initMaze()
  totalDots = 0; eatenDots = 0
  for (const row of maze) for (const cell of row) if (cell === 1 || cell === 2) totalDots++

  pac = { col: 10, row: 16, dir: [1,0], nextDir: [1,0], mouthAngle: 0, mouthOpen: true }
  ghosts = [
    { col: 9,  row: 10, dir: [-1,0], scared: false, scaredTimer: 0, color: '#ef4444' },
    { col: 10, row: 10, dir: [1,0],  scared: false, scaredTimer: 0, color: '#f472b6' },
    { col: 11, row: 10, dir: [0,1],  scared: false, scaredTimer: 0, color: '#00d4ff' },
  ]
  pacMoveTimer = 0
  ghostMoveTimer = 0
  powerTimer = 0
}

function startGame() {
  initGame()
  score.value = 0
  lives.value = 3
  state.value = 'playing'
}

function trySetDir(dr: number, dc: number) {
  pac.nextDir = [dr, dc]
}

let keys = { up: false, down: false, left: false, right: false }

function draw() {
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, W, H)

  // Draw maze
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = maze[r]![c]
      const x = c * CELL, y = r * CELL
      if (cell === 0) {
        ctx.fillStyle = '#00d4ff'
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2)
        ctx.fillStyle = '#0284c7'
        ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4)
      } else if (cell === 1) {
        ctx.fillStyle = '#f1f5f9'
        ctx.beginPath(); ctx.arc(x + CELL/2, y + CELL/2, 2, 0, τ); ctx.fill()
      } else if (cell === 2) {
        const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.006)
        ctx.fillStyle = `rgba(168,85,247,${pulse})`
        ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 8
        ctx.beginPath(); ctx.arc(x + CELL/2, y + CELL/2, 5, 0, τ); ctx.fill()
        ctx.shadowBlur = 0
      }
    }
  }

  if (state.value === 'playing') {
    // Move pac
    pacMoveTimer++
    if (pacMoveTimer >= 5) {
      pacMoveTimer = 0
      if (canMove(maze, pac.row, pac.col, pac.nextDir[0], pac.nextDir[1])) pac.dir = pac.nextDir
      if (canMove(maze, pac.row, pac.col, pac.dir[0], pac.dir[1])) {
        pac.row += pac.dir[0]; pac.col += pac.dir[1]
        if (pac.col < 0) pac.col = COLS - 1
        if (pac.col >= COLS) pac.col = 0
        const cell = maze[pac.row]![pac.col]
        if (cell === 1) { maze[pac.row]![pac.col] = 3; score.value += 10; eatenDots++ }
        if (cell === 2) {
          maze[pac.row]![pac.col] = 3; score.value += 50; eatenDots++
          for (const g of ghosts) { g.scared = true; g.scaredTimer = 150 }
          powerTimer = 150
        }
      }
    }

    // Move ghosts
    ghostMoveTimer++
    if (ghostMoveTimer >= 10) {
      ghostMoveTimer = 0
      for (const g of ghosts) {
        if (g.scared) { g.scaredTimer--; if (g.scaredTimer <= 0) g.scared = false }
        const useRandom = Math.random() < 0.25 || g.scared
        if (useRandom) {
          const DIRS: [number,number][] = [[0,1],[0,-1],[1,0],[-1,0]]
          const valid = DIRS.filter(([dr,dc]) => canMove(maze, g.row, g.col, dr, dc) && !(dr === -g.dir[0] && dc === -g.dir[1]))
          if (valid.length) g.dir = valid[Math.floor(Math.random() * valid.length)]!
        } else {
          g.dir = bfsNextDir(maze, g.row, g.col, pac.row, pac.col)
        }
        if (canMove(maze, g.row, g.col, g.dir[0], g.dir[1])) {
          g.row += g.dir[0]; g.col += g.dir[1]
          if (g.col < 0) g.col = COLS - 1
          if (g.col >= COLS) g.col = 0
        }
        if (g.row === pac.row && g.col === pac.col) {
          if (g.scared) {
            g.scared = false; score.value += 200
            g.row = 10; g.col = 10
          } else {
            lives.value--
            if (lives.value <= 0) { state.value = 'over'; return }
            pac.col = 10; pac.row = 16; pac.dir = [1,0]
            for (const gh of ghosts) { gh.row = 10; gh.col = 10; gh.scared = false }
          }
        }
      }
    }

    if (eatenDots >= totalDots) { state.value = 'won'; return }
  }

  // Draw ghosts
  for (const g of ghosts) {
    const gx = g.col * CELL + CELL/2, gy = g.row * CELL + CELL/2
    const color = g.scared ? (g.scaredTimer < 40 ? (Math.floor(Date.now() / 200) % 2 === 0 ? '#fff' : '#1e40af') : '#1e40af') : g.color
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 8
    // Ghost body
    ctx.beginPath()
    ctx.arc(gx, gy - 2, CELL/2 - 3, Math.PI, 0)
    ctx.lineTo(gx + CELL/2 - 3, gy + CELL/2 - 2)
    for (let i = 0; i <= 2; i++) {
      const wx = gx + CELL/2 - 3 - (i * (CELL-6)/3)
      ctx.quadraticCurveTo(wx - (CELL-6)/6, gy + CELL/2 - 2 + 5, wx - (CELL-6)/3, gy + CELL/2 - 2)
    }
    ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0
    if (!g.scared) {
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(gx - 4, gy - 4, 3, 0, τ); ctx.fill()
      ctx.beginPath(); ctx.arc(gx + 4, gy - 4, 3, 0, τ); ctx.fill()
    }
  }

  // Draw pac-man
  pac.mouthAngle += pac.mouthOpen ? 0.15 : -0.15
  if (pac.mouthAngle > 0.35) pac.mouthOpen = false
  if (pac.mouthAngle < 0.02) pac.mouthOpen = true

  const px = pac.col * CELL + CELL/2, py = pac.row * CELL + CELL/2
  const angle = Math.atan2(pac.dir[0], pac.dir[1])
  ctx.fillStyle = '#facc15'; ctx.shadowColor = '#facc15'; ctx.shadowBlur = 10
  ctx.beginPath()
  ctx.moveTo(px, py)
  ctx.arc(px, py, CELL/2 - 2, angle + pac.mouthAngle, angle + τ - pac.mouthAngle)
  ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0

  // Handle keys
  if (keys.up)    trySetDir(-1, 0)
  if (keys.down)  trySetDir(1, 0)
  if (keys.left)  trySetDir(0, -1)
  if (keys.right) trySetDir(0, 1)

  // HUD
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = "13px 'JetBrains Mono', monospace"
  ctx.textAlign = 'left'
  ctx.fillText(`Score: ${score.value}`, 8, ROWS * CELL + 24)
  ctx.textAlign = 'right'
  ctx.fillText('♥'.repeat(lives.value), W - 8, ROWS * CELL + 24)

  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.87)'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#facc15'; ctx.shadowColor = '#facc15'; ctx.shadowBlur = 20
    ctx.font = "bold 30px 'Space Grotesk', sans-serif"; ctx.textAlign = 'center'
    ctx.fillText('PAC-MAN', W/2, H/2 - 24); ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(200,220,255,0.5)'
    ctx.font = "12px 'JetBrains Mono', monospace"
    ctx.fillText('Arrow keys to move', W/2, H/2 + 12)
    ctx.fillText('Click to start', W/2, H/2 + 32)
  }

  if (state.value === 'idle' || state.value === 'playing') raf = requestAnimationFrame(draw)
}

function onKey(e: KeyboardEvent) {
  if (state.value === 'idle') { startGame(); return }
  if (e.key === 'ArrowUp')    { e.preventDefault(); keys.up = true }
  if (e.key === 'ArrowDown')  { e.preventDefault(); keys.down = true }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); keys.left = true }
  if (e.key === 'ArrowRight') { e.preventDefault(); keys.right = true }
}
function onKeyUp(e: KeyboardEvent) {
  if (e.key === 'ArrowUp')    keys.up = false
  if (e.key === 'ArrowDown')  keys.down = false
  if (e.key === 'ArrowLeft')  keys.left = false
  if (e.key === 'ArrowRight') keys.right = false
}

function onClick() { if (state.value === 'idle') startGame() }
function restart() { initGame(); score.value = 0; lives.value = 3; state.value = 'playing'; raf = requestAnimationFrame(draw) }

onMounted(() => {
  const canvas = canvasEl.value
  if (canvas) { canvas.width = W; canvas.height = H }
  canvas?.addEventListener('click', onClick)
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKeyUp)
  raf = requestAnimationFrame(draw)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  canvasEl.value?.removeEventListener('click', onClick)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('keyup', onKeyUp)
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 select-none">
    <div class="glass-hud px-6 py-2 flex items-center gap-6">
      <div class="text-center">
        <p class="hud-label text-[10px]">SCORE</p>
        <p class="font-mono font-bold text-white text-lg">{{ score }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">LIVES</p>
        <p class="font-mono font-bold text-white text-lg">{{ lives }}</p>
      </div>
    </div>
    <div class="relative">
      <canvas ref="canvasEl" class="rounded-xl border border-white/10 block cursor-pointer" />
      <GameResultOverlay
        v-if="state === 'over' || state === 'won'"
        :state="state === 'won' ? 'won' : 'over'"
        :score="score"
        @restart="restart"
      />
    </div>
    <p class="font-mono text-xs text-slate-600">Arrow keys to move • Eat all dots • Power pellets let you eat ghosts</p>
  </div>
</template>
