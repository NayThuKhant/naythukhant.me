<script setup lang="ts">
const COLORS = ['#f472b6', '#00d4ff', '#00ff88', '#a855f7']
const GLOWS  = ['#f472b6', '#00d4ff', '#00ff88', '#a855f7']

const state = ref<'idle' | 'showing' | 'input' | 'over' | 'won'>('idle')
const sequence = ref<number[]>([])
const playerIdx = ref(0)
const activeIdx = ref<number | null>(null)
const round = ref(0)
const score = ref(0)

let timers: ReturnType<typeof setTimeout>[] = []

function clearTimers() {
  timers.forEach(clearTimeout)
  timers = []
}

function after(ms: number, fn: () => void) {
  timers.push(setTimeout(fn, ms))
}

function startGame() {
  clearTimers()
  sequence.value = []
  playerIdx.value = 0
  round.value = 0
  score.value = 0
  state.value = 'showing'
  addAndPlay()
}

function addAndPlay() {
  sequence.value.push(Math.floor(Math.random() * 4))
  round.value = sequence.value.length
  playerIdx.value = 0
  playFrom(0)
}

function playFrom(i: number) {
  state.value = 'showing'
  if (i >= sequence.value.length) {
    state.value = 'input'
    return
  }
  after(300, () => {
    activeIdx.value = sequence.value[i]!
    after(600, () => {
      activeIdx.value = null
      after(200, () => playFrom(i + 1))
    })
  })
}

function press(idx: number) {
  if (state.value !== 'input') return
  activeIdx.value = idx
  after(150, () => { activeIdx.value = null })

  if (sequence.value[playerIdx.value] !== idx) {
    score.value = round.value - 1
    state.value = 'over'
    return
  }
  playerIdx.value++
  if (playerIdx.value === sequence.value.length) {
    score.value = round.value
    if (round.value >= 20) { state.value = 'won'; return }
    after(700, addAndPlay)
  }
}

function restart() { startGame() }

onUnmounted(clearTimers)
</script>

<template>
  <div class="flex flex-col items-center gap-6 select-none">
    <div class="glass-hud px-6 py-2 flex items-center gap-8">
      <div class="text-center">
        <p class="hud-label text-[10px]">ROUND</p>
        <p class="font-mono font-bold text-white text-lg">{{ round }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">STATUS</p>
        <p class="font-mono text-xs font-bold" :class="state === 'input' ? 'text-neon-emerald' : 'text-slate-500'">
          {{ state === 'input' ? 'YOUR TURN' : state === 'showing' ? 'WATCH...' : '—' }}
        </p>
      </div>
    </div>

    <div v-if="state === 'idle'" class="flex flex-col items-center gap-3">
      <p class="font-mono text-xs text-slate-500 text-center">Watch the color pattern, then repeat it.<br>The sequence grows every round. Reach 20!</p>
      <button class="btn-neon-blue mt-2" @click="startGame">START GAME</button>
    </div>

    <div v-else class="relative">
      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="(color, i) in COLORS"
          :key="i"
          class="w-32 h-32 rounded-2xl border-2 transition-all duration-100 cursor-pointer focus:outline-none"
          :style="{
            backgroundColor: activeIdx === i ? color + 'bb' : color + '18',
            borderColor: activeIdx === i ? color : color + '44',
            boxShadow: activeIdx === i ? `0 0 28px ${GLOWS[i]}` : 'none',
            transform: activeIdx === i ? 'scale(1.05)' : 'scale(1)',
          }"
          :disabled="state !== 'input'"
          @click="press(i)"
        />
      </div>
      <GameResultOverlay
        v-if="state === 'over' || state === 'won'"
        :state="state === 'won' ? 'won' : 'over'"
        :score="score"
        :extra="`Round ${score + (state === 'over' ? 0 : 1)}`"
        @restart="restart"
      />
    </div>

    <p v-if="state !== 'idle'" class="font-mono text-xs text-slate-600">Watch the pattern, then click to repeat</p>
  </div>
</template>
