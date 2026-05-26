<script setup lang="ts">
interface Question {
  q: string
  a: string
  opts: string[]
}

const QUESTION_BANK: Question[] = [
  { q: 'How many planets are in our solar system?', a: '8', opts: ['6','7','8','9'] },
  { q: 'What is the speed of light (km/s)?', a: '300,000', opts: ['150,000','300,000','500,000','1,000,000'] },
  { q: 'Which planet is known as the Red Planet?', a: 'Mars', opts: ['Venus','Mars','Jupiter','Saturn'] },
  { q: 'What is the largest planet in our solar system?', a: 'Jupiter', opts: ['Saturn','Neptune','Jupiter','Uranus'] },
  { q: 'How many moons does Mars have?', a: '2', opts: ['0','1','2','4'] },
  { q: 'What is the closest star to Earth?', a: 'Proxima Centauri', opts: ['Sirius','Proxima Centauri','Betelgeuse','Alpha Centauri A'] },
  { q: 'In what year did humans first land on the Moon?', a: '1969', opts: ['1965','1967','1969','1972'] },
  { q: 'What is a light-year?', a: 'Distance light travels in a year', opts: ['Time for light to reach Moon','Distance light travels in a year','Speed of light','Distance from Earth to Sun'] },
  { q: 'What is the chemical symbol for gold?', a: 'Au', opts: ['Go','Ag','Au','Gd'] },
  { q: 'What is the atomic number of carbon?', a: '6', opts: ['4','6','8','12'] },
  { q: 'What force keeps planets in orbit?', a: 'Gravity', opts: ['Magnetism','Friction','Gravity','Nuclear force'] },
  { q: 'What is the hottest planet in our solar system?', a: 'Venus', opts: ['Mercury','Venus','Mars','Jupiter'] },
  { q: 'How many bones are in the adult human body?', a: '206', opts: ['196','206','216','226'] },
  { q: 'What is the powerhouse of the cell?', a: 'Mitochondria', opts: ['Nucleus','Ribosome','Mitochondria','Chloroplast'] },
  { q: 'Who developed the theory of relativity?', a: 'Albert Einstein', opts: ['Isaac Newton','Nikola Tesla','Albert Einstein','Galileo Galilei'] },
  { q: 'What is the most abundant gas in Earth\'s atmosphere?', a: 'Nitrogen', opts: ['Oxygen','Carbon Dioxide','Nitrogen','Argon'] },
  { q: 'What is the smallest unit of matter?', a: 'Atom', opts: ['Molecule','Cell','Atom','Electron'] },
  { q: 'Which dwarf planet was reclassified in 2006?', a: 'Pluto', opts: ['Eris','Ceres','Pluto','Makemake'] },
  { q: 'What does DNA stand for?', a: 'Deoxyribonucleic Acid', opts: ['Dynamic Nuclear Array','Deoxyribonucleic Acid','Digital Nucleic Acid','Dense Nucleotide Assembly'] },
  { q: 'How many sides does a hexagon have?', a: '6', opts: ['5','6','7','8'] },
  { q: 'What is the square root of 144?', a: '12', opts: ['11','12','13','14'] },
  { q: 'What is the largest ocean on Earth?', a: 'Pacific', opts: ['Atlantic','Indian','Pacific','Arctic'] },
  { q: 'How many continents are there?', a: '7', opts: ['5','6','7','8'] },
  { q: 'What is the capital of Australia?', a: 'Canberra', opts: ['Sydney','Melbourne','Canberra','Brisbane'] },
  { q: 'What is the longest river in the world?', a: 'Nile', opts: ['Amazon','Nile','Yangtze','Mississippi'] },
  { q: 'Which element is represented by the symbol Fe?', a: 'Iron', opts: ['Fluorine','Francium','Iron','Fermium'] },
  { q: 'What is the value of Pi (to 2 decimal places)?', a: '3.14', opts: ['3.12','3.14','3.16','3.18'] },
  { q: 'How many bytes are in a kilobyte (binary)?', a: '1024', opts: ['512','1000','1024','2048'] },
  { q: 'What galaxy is Earth located in?', a: 'Milky Way', opts: ['Andromeda','Milky Way','Triangulum','Centaurus A'] },
  { q: 'What is the name of the force that opposes motion?', a: 'Friction', opts: ['Gravity','Inertia','Friction','Tension'] },
]

const TOTAL_QUESTIONS = 10
const TIME_LIMIT = 15

const { correct: sfxCorrect, wrong: sfxWrong, win: sfxWin } = useGameSounds()

const state       = ref<'idle' | 'playing' | 'won'>('idle')
const questions   = ref<Question[]>([])
const qIdx        = ref(0)
const totalScore  = ref(0)
const score       = ref(0)
const timeLeft    = ref(TIME_LIMIT)
const answered    = ref<string | null>(null)   // selected option
const feedback    = ref<'correct' | 'wrong' | null>(null)
const advancingQ  = ref(false)
let timer = 0

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

function startGame() {
  questions.value = shuffle(QUESTION_BANK).slice(0, TOTAL_QUESTIONS)
  qIdx.value = 0
  totalScore.value = 0
  state.value = 'playing'
  startTimer()
}

function startTimer() {
  clearInterval(timer)
  timeLeft.value = TIME_LIMIT
  answered.value = null
  feedback.value = null
  advancingQ.value = false
  timer = window.setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      clearInterval(timer)
      handleAnswer(null)
    }
  }, 1000)
}

function handleAnswer(opt: string | null) {
  if (advancingQ.value) return
  clearInterval(timer)
  advancingQ.value = true
  answered.value = opt

  const current = questions.value[qIdx.value]!
  const isCorrect = opt === current.a

  let points = 0
  if (isCorrect) {
    const elapsed = TIME_LIMIT - timeLeft.value
    if (elapsed <= 5) points = 100
    else if (elapsed <= 10) points = 70
    else points = 40
    sfxCorrect()
    feedback.value = 'correct'
  } else {
    sfxWrong()
    feedback.value = 'wrong'
  }

  totalScore.value += points

  setTimeout(() => {
    const next = qIdx.value + 1
    if (next >= TOTAL_QUESTIONS) {
      score.value = totalScore.value
      sfxWin()
      state.value = 'won'
    } else {
      qIdx.value = next
      startTimer()
    }
  }, 1500)
}

function restart() {
  clearInterval(timer)
  startGame()
}

function optionClass(opt: string): string {
  if (!feedback.value) return 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-neon-blue/40 text-slate-300 cursor-pointer'
  const current = questions.value[qIdx.value]!
  if (opt === current.a) return 'border-neon-emerald/60 bg-neon-emerald/20 text-neon-emerald cursor-default'
  if (opt === answered.value && opt !== current.a) return 'border-red-400/60 bg-red-500/20 text-red-400 cursor-default'
  return 'border-white/5 bg-white/[0.02] text-slate-600 cursor-default'
}

const currentQ = computed(() => questions.value[qIdx.value] ?? null)
const timerPercent = computed(() => (timeLeft.value / TIME_LIMIT) * 100)
const timerColor = computed(() => {
  if (timeLeft.value > 10) return 'bg-neon-emerald'
  if (timeLeft.value > 5) return 'bg-amber-400'
  return 'bg-red-500'
})

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="relative flex flex-col items-center gap-4 select-none">

    <!-- Idle -->
    <div v-if="state === 'idle'" class="flex flex-col items-center gap-3">
      <p class="font-mono text-xs text-slate-500 text-center max-w-xs">
        10 space &amp; science trivia questions.<br>
        Answer fast for more points! Max 100 pts per question.<br>
        ≤5s → 100pts · ≤10s → 70pts · ≤15s → 40pts
      </p>
      <button class="btn-neon-blue mt-2" @click="startGame">START GAME</button>
    </div>

    <!-- Playing -->
    <div v-else-if="state === 'playing'" class="relative flex flex-col items-center gap-4 w-full max-w-sm">
      <!-- HUD -->
      <div class="glass-hud px-4 py-2 flex items-center gap-4 w-full justify-center">
        <span class="hud-label">Q <span class="text-white font-bold">{{ qIdx + 1 }}/{{ TOTAL_QUESTIONS }}</span></span>
        <span class="text-slate-600">|</span>
        <span class="hud-label">SCORE <span class="text-neon-emerald font-bold font-mono">{{ totalScore }}</span></span>
        <span class="text-slate-600">|</span>
        <span class="hud-label" :class="timeLeft <= 5 ? 'text-red-400' : 'text-slate-400'">
          ⏱ <span class="font-bold font-mono">{{ timeLeft }}s</span>
        </span>
      </div>

      <!-- Timer bar -->
      <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-1000 ease-linear"
          :class="timerColor"
          :style="{ width: `${timerPercent}%` }"
        />
      </div>

      <!-- Question -->
      <div class="w-full bg-white/[0.04] border border-white/10 rounded-xl px-5 py-4">
        <p class="font-mono text-sm text-white leading-relaxed text-center">{{ currentQ?.q }}</p>
      </div>

      <!-- Feedback banner -->
      <div v-if="feedback" class="text-center">
        <p
          class="font-mono text-sm font-bold"
          :class="feedback === 'correct' ? 'text-neon-emerald' : 'text-red-400'"
        >
          {{ feedback === 'correct' ? '✓ Correct!' : '✗ Wrong!' }}
        </p>
      </div>

      <!-- Options -->
      <div class="grid grid-cols-2 gap-2 w-full">
        <button
          v-for="(opt, i) in currentQ?.opts"
          :key="i"
          class="px-3 py-3 rounded-lg border font-mono text-xs text-left transition-all"
          :class="optionClass(opt)"
          :disabled="!!feedback"
          @click="handleAnswer(opt)"
        >
          <span class="text-slate-500 mr-1.5">{{ ['A','B','C','D'][i] }})</span>
          {{ opt }}
        </button>
      </div>
    </div>

    <!-- Won overlay -->
    <GameResultOverlay
      v-if="state === 'won'"
      :state="'won'"
      :score="score"
      :extra="`${score}/1000 points across ${TOTAL_QUESTIONS} questions`"
      @restart="restart"
    />
  </div>
</template>
