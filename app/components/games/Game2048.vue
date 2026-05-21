<script setup lang="ts">
type Board = (number | null)[][]
type Dir = 'left' | 'right' | 'up' | 'down'

const SIZE = 4
const score  = ref(0)
const best   = ref(0)
const state  = ref<'idle' | 'playing' | 'won' | 'over'>('idle')
const board  = ref<Board>(emptyBoard())

function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
}

const rotateCW = (b: Board): Board =>
  Array.from({ length: SIZE }, (_, r) =>
    Array.from({ length: SIZE }, (_, c) => b[SIZE - 1 - c]![r]!)
  )

function spawn(b: Board) {
  const empty: [number, number][] = []
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (!b[r]![c]) empty.push([r, c])
  if (!empty.length) return
  const [r, c] = empty[Math.floor(Math.random() * empty.length)]!
  b[r]![c] = Math.random() < 0.9 ? 2 : 4
}

function slideLeft(row: (number | null)[]): { row: (number | null)[], gained: number } {
  const tiles = row.filter(Boolean) as number[]
  let gained = 0
  const merged: (number | null)[] = []
  let i = 0
  while (i < tiles.length) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      const v = tiles[i]! * 2
      merged.push(v); gained += v; i += 2
    } else {
      merged.push(tiles[i]!); i++
    }
  }
  while (merged.length < SIZE) merged.push(null)
  return { row: merged, gained }
}

function startGame() {
  const b = emptyBoard()
  spawn(b); spawn(b)
  board.value = b
  score.value = 0
  state.value = 'playing'
}

function move(dir: Dir) {
  if (state.value !== 'playing') return
  const rotations = { left: 0, up: 3, right: 2, down: 1 }[dir]
  let b: Board = board.value.map(r => [...r])
  for (let i = 0; i < rotations; i++) b = rotateCW(b)
  let gained = 0, moved = false
  const before = JSON.stringify(b)
  for (let r = 0; r < SIZE; r++) {
    const res = slideLeft(b[r]!)
    b[r] = res.row; gained += res.gained
  }
  if (JSON.stringify(b) === before) { for (let i = 0; i < rotations; i++) b = rotateCW(b); return }
  moved = true
  for (let i = 0; i < (4 - rotations) % 4; i++) b = rotateCW(b)
  score.value += gained
  if (score.value > best.value) best.value = score.value
  spawn(b)
  board.value = b
  if (b.flat().some(v => v === 2048)) { state.value = 'won'; return }
  const canMove = b.some((row, r) =>
    row.some((v, c) =>
      !v ||
      (c + 1 < SIZE && b[r]![c + 1] === v) ||
      (r + 1 < SIZE && b[r + 1]![c] === v)
    )
  )
  if (!canMove) state.value = 'over'
}

function onKey(e: KeyboardEvent) {
  const map: Record<string, Dir> = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down' }
  if (!(e.key in map)) return
  e.preventDefault()
  if (state.value !== 'playing') { startGame(); return }
  move(map[e.key]!)
}

const tileClass = (v: number | null): string => {
  if (!v) return 'bg-white/[0.03] border-white/5 text-transparent'
  const map: Record<number, string> = {
    2:    'bg-slate-700/80 border-slate-600 text-slate-200',
    4:    'bg-slate-600/80 border-slate-500 text-slate-100',
    8:    'bg-neon-blue/20 border-neon-blue/40 text-neon-blue',
    16:   'bg-neon-blue/30 border-neon-blue/55 text-neon-blue',
    32:   'bg-neon-purple/20 border-neon-purple/40 text-neon-purple',
    64:   'bg-neon-purple/30 border-neon-purple/55 text-neon-purple',
    128:  'bg-neon-emerald/20 border-neon-emerald/40 text-neon-emerald',
    256:  'bg-neon-emerald/30 border-neon-emerald/55 text-neon-emerald',
    512:  'bg-neon-pink/20 border-neon-pink/40 text-neon-pink',
    1024: 'bg-neon-pink/30 border-neon-pink/55 text-neon-pink',
    2048: 'bg-gradient-cyber border-white/40 text-white shadow-neon-blue',
  }
  return map[v] ?? 'bg-white/20 border-white/30 text-white'
}
const tileFs = (v: number | null) => v && v >= 1000 ? 'text-base' : v && v >= 100 ? 'text-lg' : 'text-xl'

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="flex flex-col items-center gap-4 select-none">
    <div class="flex gap-4">
      <div class="glass-hud px-5 py-2 text-center min-w-[72px]">
        <p class="hud-label text-[10px]">SCORE</p>
        <p class="font-mono font-bold text-white text-lg leading-tight">{{ score }}</p>
      </div>
      <div class="glass-hud px-5 py-2 text-center min-w-[72px]">
        <p class="hud-label text-[10px]">BEST</p>
        <p class="font-mono font-bold text-white text-lg leading-tight">{{ best }}</p>
      </div>
    </div>

    <div class="relative glass-hud p-3">
      <div class="grid gap-2" style="grid-template-columns:repeat(4,1fr)">
        <div
          v-for="(val, i) in board.flat()"
          :key="i"
          class="w-16 h-16 rounded-lg border flex items-center justify-center font-mono font-bold transition-all duration-100"
          :class="[tileClass(val), tileFs(val)]"
        >{{ val ?? '' }}</div>
      </div>

      <Transition name="fade">
        <div
          v-if="state !== 'playing'"
          class="absolute inset-0 rounded-2xl flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3"
        >
          <p class="font-display font-bold text-2xl" :class="state === 'won' ? 'text-neon-emerald' : 'text-white'">
            {{ state === 'idle' ? '2048' : state === 'won' ? 'YOU WIN!' : 'GAME OVER' }}
          </p>
          <p class="font-mono text-xs text-slate-400">Press any arrow key or click to {{ state === 'idle' ? 'start' : 'restart' }}</p>
          <button class="btn-neon-blue mt-1" @click="startGame">{{ state === 'idle' ? 'PLAY' : 'PLAY AGAIN' }}</button>
        </div>
      </Transition>
    </div>

    <p class="font-mono text-xs text-slate-600">Arrow keys to slide • merge tiles • reach 2048</p>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease }
.fade-enter-from, .fade-leave-to { opacity: 0 }
</style>
