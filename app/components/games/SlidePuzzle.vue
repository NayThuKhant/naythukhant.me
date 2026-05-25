<script setup lang="ts">
const SIZE = 4
const state   = ref<'idle' | 'playing' | 'won'>('idle')
const tiles   = ref<number[]>([])
const moves   = ref(0)
const seconds = ref(0)
const score   = ref(0)
let timer = 0

function solved(t: number[]): boolean {
  for (let i = 0; i < SIZE * SIZE - 1; i++) if (t[i] !== i + 1) return false
  return t[SIZE * SIZE - 1] === 0
}

function isSolvable(arr: number[]): boolean {
  let inv = 0
  const a = arr.filter(x => x !== 0)
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i]! > a[j]!) inv++
  const blankRow = SIZE - Math.floor(arr.indexOf(0) / SIZE)
  return SIZE % 2 === 1 ? inv % 2 === 0 : (blankRow % 2 === 0) !== (inv % 2 === 0)
}

function shuffle(): number[] {
  const arr = [...Array(SIZE * SIZE).keys()].map(i => (i + 1) % (SIZE * SIZE))
  let attempts = 0
  do {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
    }
    attempts++
  } while ((!isSolvable(arr) || solved(arr)) && attempts < 1000)
  return arr
}

function startGame() {
  clearInterval(timer)
  tiles.value = shuffle()
  moves.value = 0
  seconds.value = 0
  state.value = 'playing'
  timer = window.setInterval(() => seconds.value++, 1000)
}

function clickTile(idx: number) {
  if (state.value !== 'playing') return
  const blank = tiles.value.indexOf(0)
  const r = Math.floor(idx / SIZE), c = idx % SIZE
  const br = Math.floor(blank / SIZE), bc = blank % SIZE
  if (Math.abs(r - br) + Math.abs(c - bc) !== 1) return
  const t = [...tiles.value]
  ;[t[idx], t[blank]] = [t[blank]!, t[idx]!]
  tiles.value = t
  moves.value++
  if (solved(t)) {
    clearInterval(timer)
    score.value = moves.value
    state.value = 'won'
  }
}

function fmtTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function restart() { startGame() }
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="flex flex-col items-center gap-4 select-none">
    <div class="glass-hud px-6 py-2 flex items-center gap-8">
      <div class="text-center">
        <p class="hud-label text-[10px]">MOVES</p>
        <p class="font-mono font-bold text-white text-lg">{{ moves }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">TIME</p>
        <p class="font-mono font-bold text-white text-lg">{{ fmtTime(seconds) }}</p>
      </div>
    </div>

    <div v-if="state === 'idle'" class="flex flex-col items-center gap-3">
      <p class="font-mono text-xs text-slate-500 text-center">
        Slide tiles to arrange 1–15 in order.<br>Click any tile adjacent to the blank space.
      </p>
      <button class="btn-neon-purple mt-2" @click="startGame">START GAME</button>
    </div>

    <div v-else class="relative">
      <div class="grid gap-2" style="grid-template-columns: repeat(4, 4rem)">
        <div
          v-for="(tile, idx) in tiles"
          :key="idx"
          class="h-16 rounded-lg flex items-center justify-center font-mono font-bold text-xl transition-all duration-100"
          :class="tile === 0
            ? 'bg-transparent border border-dashed border-slate-800 cursor-default'
            : 'bg-slate-900 border-2 border-pink-500/40 text-neon-pink cursor-pointer hover:border-pink-400 hover:shadow-[0_0_10px_#f472b6]'"
          @click="clickTile(idx)"
        >
          {{ tile || '' }}
        </div>
      </div>
      <GameResultOverlay v-if="state === 'won'" :state="state" :score="moves" :extra="fmtTime(seconds)" @restart="restart" />
    </div>

    <p v-if="state === 'playing'" class="font-mono text-xs text-slate-600">Click a tile next to the blank to slide it</p>
  </div>
</template>
