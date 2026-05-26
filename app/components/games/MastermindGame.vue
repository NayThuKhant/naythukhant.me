<script setup lang="ts">
const COLORS = ['#f472b6', '#00d4ff', '#00ff88', '#a855f7', '#fb923c', '#facc15']
const CODE_LEN = 4
const MAX_ROWS = 10

type Guess = { code: number[]; blacks: number; whites: number }

const { click: sfxClick, correct: sfxCorrect, win: sfxWin, lose: sfxLose } = useGameSounds()

const state    = ref<'idle' | 'playing' | 'won' | 'over'>('idle')
const secret   = ref<number[]>([])
const guesses  = ref<Guess[]>([])
const current  = ref<number[]>([])
const selected = ref<number | null>(null)
const score    = ref(0)

function makeSecret(): number[] {
  const arr: number[] = []
  while (arr.length < CODE_LEN) {
    const c = Math.floor(Math.random() * COLORS.length)
    if (!arr.includes(c)) arr.push(c)
  }
  return arr
}

function evaluate(guess: number[], secret: number[]): { blacks: number; whites: number } {
  let blacks = 0, whites = 0
  const sUsed = Array(COLORS.length).fill(false)
  const gUsed = Array(CODE_LEN).fill(false)
  for (let i = 0; i < CODE_LEN; i++) {
    if (guess[i] === secret[i]) { blacks++; sUsed[secret[i]!] = true; gUsed[i] = true }
  }
  for (let i = 0; i < CODE_LEN; i++) {
    if (gUsed[i]) continue
    for (let j = 0; j < CODE_LEN; j++) {
      if (!sUsed[secret[j]!] && !gUsed[j] && guess[i] === secret[j]) {
        whites++; sUsed[secret[j]!] = true; break
      }
    }
  }
  return { blacks, whites }
}

function startGame() {
  secret.value = makeSecret()
  guesses.value = []
  current.value = []
  selected.value = null
  state.value = 'playing'
}

function pickSlot(i: number) {
  if (state.value !== 'playing') return
  selected.value = i
}

function pickColor(c: number) {
  if (state.value !== 'playing' || selected.value === null) return
  sfxClick()
  const arr = [...current.value]
  while (arr.length <= selected.value) arr.push(-1)
  arr[selected.value] = c
  current.value = arr
  const next = arr.findIndex((v, i) => i > selected.value! && v === -1)
  selected.value = next !== -1 ? next : arr.findIndex(v => v === -1)
  if (selected.value === -1) selected.value = null
}

function submit() {
  if (state.value !== 'playing') return
  if (current.value.length < CODE_LEN || current.value.some(v => v === -1)) return
  const { blacks, whites } = evaluate(current.value, secret.value)
  guesses.value.push({ code: [...current.value], blacks, whites })
  current.value = []
  selected.value = null
  if (blacks === CODE_LEN) {
    score.value = guesses.value.length
    sfxWin()
    state.value = 'won'
  } else if (guesses.value.length >= MAX_ROWS) {
    score.value = MAX_ROWS
    sfxLose()
    state.value = 'over'
  } else if (blacks > 0 || whites > 0) {
    sfxCorrect()
  }
}

function restart() { startGame() }
</script>

<template>
  <div class="flex flex-col items-center gap-4 select-none">
    <div class="glass-hud px-6 py-2 flex items-center gap-8">
      <div class="text-center">
        <p class="hud-label text-[10px]">GUESSES</p>
        <p class="font-mono font-bold text-white text-lg">{{ guesses.length }} / {{ MAX_ROWS }}</p>
      </div>
    </div>

    <div v-if="state === 'idle'" class="flex flex-col items-center gap-3">
      <p class="font-mono text-xs text-slate-500 text-center max-w-xs">
        Crack the 4-color secret code in 10 tries.<br>
        ■ = right color &amp; position &nbsp;□ = right color, wrong position
      </p>
      <button class="btn-neon-blue mt-2" @click="startGame">START GAME</button>
    </div>

    <div v-else class="relative flex flex-col gap-3">
      <!-- Past guesses -->
      <div class="flex flex-col gap-1">
        <div
          v-for="(g, gi) in guesses"
          :key="gi"
          class="flex items-center gap-3"
        >
          <div class="flex gap-1.5">
            <span
              v-for="(c, ci) in g.code"
              :key="ci"
              class="w-8 h-8 rounded-full border-2"
              :style="{ backgroundColor: COLORS[c], borderColor: COLORS[c] }"
            />
          </div>
          <div class="grid grid-cols-2 gap-0.5">
            <span
              v-for="i in CODE_LEN"
              :key="i"
              class="w-3 h-3 rounded-sm"
              :class="i <= g.blacks ? 'bg-white' : i <= g.blacks + g.whites ? 'bg-slate-500' : 'bg-slate-800'"
            />
          </div>
          <span class="font-mono text-xs text-slate-500 w-16">{{ g.blacks }}■ {{ g.whites }}□</span>
        </div>
      </div>

      <!-- Current guess row -->
      <div v-if="state === 'playing'" class="flex items-center gap-3">
        <div class="flex gap-1.5">
          <button
            v-for="i in CODE_LEN"
            :key="i"
            class="w-8 h-8 rounded-full border-2 transition-all focus:outline-none"
            :style="current[i-1] !== undefined && current[i-1] !== -1
              ? { backgroundColor: COLORS[current[i-1]!], borderColor: COLORS[current[i-1]!], boxShadow: selected === i-1 ? '0 0 12px white' : 'none' }
              : { backgroundColor: 'transparent', borderColor: selected === i-1 ? 'white' : '#334155' }"
            @click="pickSlot(i - 1)"
          />
        </div>
        <button
          class="btn-neon-blue text-xs px-3 py-1.5"
          :disabled="current.length < CODE_LEN || current.some(v => v === -1)"
          @click="submit"
        >
          CHECK
        </button>
      </div>

      <!-- Color palette -->
      <div v-if="state === 'playing'" class="flex gap-2 mt-1">
        <button
          v-for="(color, ci) in COLORS"
          :key="ci"
          class="w-8 h-8 rounded-full border-2 border-white/20 transition-all hover:scale-110 hover:border-white/60 focus:outline-none"
          :style="{ backgroundColor: color }"
          @click="pickColor(ci)"
        />
      </div>

      <!-- Reveal secret on loss -->
      <div v-if="state === 'over'" class="flex gap-1.5">
        <span class="font-mono text-xs text-slate-500 mr-2 self-center">Secret:</span>
        <span
          v-for="(c, ci) in secret"
          :key="ci"
          class="w-8 h-8 rounded-full border-2"
          :style="{ backgroundColor: COLORS[c], borderColor: COLORS[c] }"
        />
      </div>

      <GameResultOverlay
        v-if="state === 'won' || state === 'over'"
        :state="state === 'won' ? 'won' : 'over'"
        :score="score"
        :extra="state === 'won' ? `Cracked in ${score} guesses` : 'Code not cracked'"
        @restart="restart"
      />
    </div>
  </div>
</template>
