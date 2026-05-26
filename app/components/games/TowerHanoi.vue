<script setup lang="ts">
const { move: sfxMove, wrong: sfxWrong, win: sfxWin } = useGameSounds()

const RING_COUNT = 5
const PAR = 31

const state    = ref<'idle' | 'playing' | 'won'>('idle')
const pegs     = ref<number[][]>([[], [], []])
const selected = ref<{ peg: number; ring: number } | null>(null)
const moves    = ref(0)
const invalid  = ref(false)
const score    = ref(0)

const RING_COLORS = [
  'bg-neon-blue border-blue-300 shadow-[0_0_8px_#00d4ff]',
  'bg-neon-purple border-purple-300 shadow-[0_0_8px_#a855f7]',
  'bg-neon-pink border-pink-300 shadow-[0_0_8px_#f472b6]',
  'bg-neon-emerald border-emerald-300 shadow-[0_0_8px_#00ff88]',
  'bg-amber-500 border-amber-300 shadow-[0_0_8px_#f59e0b]',
]

// Ring widths as % of peg zone
const RING_WIDTHS = ['w-10', 'w-16', 'w-24', 'w-32', 'w-40']

function startGame() {
  pegs.value = [[5, 4, 3, 2, 1], [], []]
  selected.value = null
  moves.value = 0
  invalid.value = false
  state.value = 'playing'
}

function ringWidthClass(ring: number): string {
  return RING_WIDTHS[ring - 1] ?? 'w-10'
}

function ringColorClass(ring: number): string {
  return RING_COLORS[ring - 1] ?? RING_COLORS[0]!
}

function clickPeg(pegIdx: number) {
  if (state.value !== 'playing') return

  const peg = pegs.value[pegIdx]!

  if (!selected.value) {
    // Select top ring from this peg
    if (!peg.length) return
    const ring = peg[peg.length - 1]!
    selected.value = { peg: pegIdx, ring }
    return
  }

  const { peg: fromPeg, ring } = selected.value

  if (fromPeg === pegIdx) {
    // Deselect
    selected.value = null
    return
  }

  // Try to move
  const destPeg = pegs.value[pegIdx]!
  const topOfDest = destPeg[destPeg.length - 1] ?? Infinity

  if (ring > topOfDest) {
    // Invalid move
    sfxWrong()
    invalid.value = true
    setTimeout(() => { invalid.value = false }, 400)
    selected.value = null
    return
  }

  // Valid move
  const newPegs = pegs.value.map(p => [...p])
  newPegs[fromPeg]!.pop()
  newPegs[pegIdx]!.push(ring)
  pegs.value = newPegs
  selected.value = null
  moves.value++
  sfxMove()

  // Check win
  if (pegs.value[2]!.length === RING_COUNT) {
    score.value = Math.max(1, PAR - moves.value + 1)
    sfxWin()
    state.value = 'won'
  }
}

function restart() { startGame() }

const pegNames = ['Left', 'Middle', 'Right']
</script>

<template>
  <div class="flex flex-col items-center gap-6 select-none">
    <!-- HUD -->
    <div class="glass-hud px-6 py-2 flex items-center gap-4">
      <span class="hud-label">MOVES</span>
      <span class="font-mono text-lg font-bold text-neon-blue">{{ moves }}</span>
      <span class="text-slate-600">|</span>
      <span class="hud-label">PAR {{ PAR }}</span>
    </div>

    <!-- Idle -->
    <div v-if="state === 'idle'" class="flex flex-col items-center gap-3">
      <p class="font-mono text-xs text-slate-500 text-center max-w-xs">
        Move all 5 rings from Left to Right peg.<br>
        You cannot place a larger ring on a smaller one.<br>
        Par = {{ PAR }} moves.
      </p>
      <button class="btn-neon-blue mt-2" @click="startGame">START GAME</button>
    </div>

    <!-- Pegs -->
    <div v-else class="relative flex flex-col items-center gap-2">
      <div class="flex gap-4">
        <div
          v-for="(peg, pi) in pegs"
          :key="pi"
          class="flex flex-col items-center cursor-pointer"
          :class="{ 'opacity-60': invalid && selected?.peg === pi }"
          style="width: 11rem"
          @click="clickPeg(pi)"
        >
          <!-- Peg label -->
          <span
            class="font-mono text-[10px] mb-2 transition-colors"
            :class="selected && selected.peg !== pi ? 'text-neon-blue' : 'text-slate-600'"
          >{{ pegNames[pi] }}</span>

          <!-- Rings stacked above base -->
          <div class="flex flex-col-reverse items-center gap-1 relative" style="min-height: 9rem">
            <!-- Peg bar (vertical) -->
            <div
              class="absolute left-1/2 -translate-x-1/2 w-1.5 rounded-full"
              :class="selected?.peg === pi ? 'bg-neon-blue/80' : 'bg-slate-600'"
              style="bottom: 0; height: 9.5rem"
            />

            <div
              v-for="ring in peg"
              :key="ring"
              class="relative z-10 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150"
              :class="[
                ringWidthClass(ring),
                ringColorClass(ring),
                selected?.peg === pi && selected?.ring === ring
                  ? 'ring-4 ring-white/60 brightness-125 scale-105'
                  : '',
              ]"
            />
          </div>

          <!-- Base -->
          <div
            class="w-44 h-2 rounded-full mt-1"
            :class="selected?.peg === pi ? 'bg-neon-blue/60' : 'bg-slate-700'"
          />
        </div>
      </div>

      <!-- Instruction -->
      <p class="font-mono text-xs text-slate-600 mt-2">
        <template v-if="selected">
          Ring <span class="text-neon-blue font-bold">{{ selected.ring }}</span> selected — click a peg to move
        </template>
        <template v-else>
          Click a peg to select its top ring
        </template>
      </p>

      <!-- Invalid flash -->
      <p v-if="invalid" class="font-mono text-xs text-red-400 animate-pulse">Cannot place larger ring on smaller!</p>

      <GameResultOverlay
        v-if="state === 'won'"
        :state="'won'"
        :score="score"
        :extra="`Completed in ${moves} moves (par ${PAR})`"
        @restart="restart"
      />
    </div>
  </div>
</template>

