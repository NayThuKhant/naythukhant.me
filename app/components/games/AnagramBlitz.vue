<script setup lang="ts">
const WORDS = [
  'PLANET','ROCKET','COSMOS','NEBULA','GALAXY','COMET','PHOTON','PULSAR','QUASAR','METEOR',
  'AURORA','CRATER','ECLIPSE','FUSION','HELIUM','IMPACT','JOVIAN','KELVIN','LANDER','MIRROR',
  'NEUTRON','OXYGEN','PROTON','QUARTZ','RADIUS','SATURN','TETHER','VACUUM','VORTEX','ZENITH',
  'ARCTIC','BEACON','CARBON','DESIGN','ENERGY','FACTOR','GRAVEL','HAZARD','INSECT','JIGSAW',
  'KERNEL','LAUNCH','MODULE','NIMBUS','OUTPOST','PORTAL','RESCUE','SIGNAL','TRAVEL','UPLOAD',
]

const TIME_LIMIT = 60
const { correct: sfxCorrect, wrong: sfxWrong, lose: sfxLose } = useGameSounds()

const state   = ref<'idle' | 'playing' | 'over'>('idle')
const scrambled = ref('')
const answer  = ref('')
const input   = ref('')
const seconds = ref(TIME_LIMIT)
const score   = ref(0)
const feedback = ref<'correct' | 'wrong' | ''>('')
const usedWords = new Set<string>()
let timer = 0

function scramble(word: string): string {
  const arr = word.split('')
  let result = word
  let attempts = 0
  while (result === word && attempts < 20) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
    }
    result = arr.join('')
    attempts++
  }
  return result
}

function nextWord() {
  const available = WORDS.filter(w => !usedWords.has(w))
  if (!available.length) { endGame(); return }
  const word = available[Math.floor(Math.random() * available.length)]!
  answer.value = word
  scrambled.value = scramble(word)
  input.value = ''
  usedWords.add(word)
}

function startGame() {
  usedWords.clear()
  score.value = 0
  seconds.value = TIME_LIMIT
  feedback.value = ''
  clearInterval(timer)
  state.value = 'playing'
  nextWord()
  timer = window.setInterval(() => {
    seconds.value--
    if (seconds.value <= 0) endGame()
  }, 1000)
}

function endGame() {
  clearInterval(timer)
  sfxLose()
  state.value = 'over'
}

function submit() {
  if (state.value !== 'playing') return
  if (input.value.trim().toUpperCase() === answer.value) {
    score.value += 10
    sfxCorrect()
    feedback.value = 'correct'
    setTimeout(() => { feedback.value = ''; nextWord() }, 400)
  } else {
    score.value = Math.max(0, score.value - 1)
    sfxWrong()
    feedback.value = 'wrong'
    setTimeout(() => { feedback.value = '' }, 400)
    input.value = ''
  }
}

function skip() {
  if (state.value !== 'playing') return
  score.value = Math.max(0, score.value - 1)
  nextWord()
}

function restart() { startGame() }

function onKey(e: KeyboardEvent) {
  if (state.value !== 'playing') return
  if (e.key === 'Enter') submit()
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => { window.removeEventListener('keydown', onKey); clearInterval(timer) })
</script>

<template>
  <div class="flex flex-col items-center gap-6 select-none">
    <div class="glass-hud px-6 py-2 flex items-center gap-8">
      <div class="text-center">
        <p class="hud-label text-[10px]">SCORE</p>
        <p class="font-mono font-bold text-white text-lg">{{ score }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">TIME</p>
        <p class="font-mono font-bold text-lg" :class="seconds <= 10 ? 'text-neon-pink' : 'text-white'">{{ seconds }}s</p>
      </div>
    </div>

    <div v-if="state === 'idle'" class="flex flex-col items-center gap-3">
      <p class="font-mono text-xs text-slate-500 text-center">
        Unscramble the word in 60 seconds.<br>+10 pts per correct answer, -1 to skip.
      </p>
      <button class="btn-neon-purple mt-2" @click="startGame">START GAME</button>
    </div>

    <div v-else-if="state === 'playing'" class="flex flex-col items-center gap-5">
      <!-- Scrambled word -->
      <div
        class="font-mono font-bold text-4xl tracking-[0.3em] transition-all"
        :class="{
          'text-neon-emerald': feedback === 'correct',
          'text-neon-pink': feedback === 'wrong',
          'text-white': feedback === '',
        }"
      >
        {{ scrambled }}
      </div>

      <p class="font-mono text-xs text-slate-500">{{ answer.length }} letters — unscramble it!</p>

      <!-- Input -->
      <div class="flex gap-2 items-center">
        <input
          v-model="input"
          class="bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 font-mono text-lg text-white text-center uppercase tracking-widest focus:outline-none focus:border-neon-purple w-48"
          :class="{ 'border-neon-emerald': feedback === 'correct', 'border-neon-pink': feedback === 'wrong' }"
          maxlength="10"
          placeholder="TYPE HERE"
          autofocus
          @keydown.enter="submit"
        />
        <button class="btn-neon-blue text-xs px-3 py-2" @click="submit">CHECK</button>
      </div>

      <button class="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors" @click="skip">
        Skip (-1 pt)
      </button>
    </div>

    <div v-else class="flex flex-col items-center gap-4">
      <div class="glass-hud px-8 py-4 text-center">
        <p class="hud-label text-[10px] mb-2">FINAL SCORE</p>
        <p class="font-mono font-bold text-neon-emerald text-4xl">{{ score }}</p>
      </div>
      <button class="btn-neon-purple" @click="restart">PLAY AGAIN</button>
    </div>
  </div>
</template>
