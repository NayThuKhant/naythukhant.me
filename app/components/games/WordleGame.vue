<script setup lang="ts">
const WORDS = [
  'ABOUT','ABOVE','ABUSE','ACTOR','ACUTE','ADMIT','ADOPT','ADULT','AFTER','AGAIN',
  'AGENT','AGREE','AHEAD','ALARM','ALBUM','ALERT','ALIKE','ALIGN','ALIVE','ALLEY',
  'ALLOW','ALONE','ALONG','ALTER','ANGEL','ANGER','ANGLE','ANIME','ANNEX','ANTIC',
  'APART','APPLE','APPLY','ARENA','ARGUE','ARISE','ARMOR','ARRAY','ARROW','ASIDE',
  'ASKED','ATLAS','ATONE','ATTIC','AUDIT','AVERT','AVOID','AWARD','AWARE','AWFUL',
  'BASIC','BATCH','BEACH','BEGAN','BEGIN','BEING','BELLE','BELOW','BENCH','BERRY',
  'BIRTH','BISON','BLANK','BLAZE','BLEED','BLEND','BLESS','BLIND','BLOCK','BLOOM',
  'BLOWN','BLUES','BLUNT','BOARD','BOOST','BOOTH','BOUND','BRAIN','BRAND','BRAVE',
  'BREAD','BREAK','BREED','BRIBE','BRICK','BRIDE','BRIEF','BRING','BRISK','BROAD',
  'BROKE','BROOK','BROWN','BRUSH','BUILD','BUILT','BURST','BUYER','CABIN','CABLE',
  'CAMEL','CANDY','CARRY','CATCH','CAUSE','CHAIN','CHAIR','CHALK','CHAOS','CHASE',
  'CHEAP','CHECK','CHEEK','CHEER','CHESS','CHEST','CHIEF','CHILD','CHOSE','CHUNK',
  'CIVIC','CIVIL','CLAIM','CLAMP','CLASH','CLASP','CLASS','CLEAN','CLEAR','CLERK',
  'CLICK','CLIFF','CLIMB','CLING','CLOCK','CLONE','CLOSE','CLOUD','COACH','COAST',
  'COLOR','COMET','COMIC','CORAL','COULD','COUNT','COURT','COVER','CRACK','CRAFT',
  'CRANE','CRASH','CRAZY','CREAM','CREED','CRIME','CRISP','CROSS','CROWD','CROWN',
  'CRUEL','CRUSH','CURVE','DAILY','DANCE','DATUM','DECAY','DELAY','DELTA','DEMON',
  'DENSE','DEPOT','DEPTH','DERBY','DETOX','DIGIT','DIRTY','DISCO','DITCH','DIVER',
  'DIZZY','DODGE','DOING','DONOR','DOUBT','DOUGH','DOWEL','DRAFT','DRAIN','DRAMA',
  'DRANK','DRAPE','DRAWN','DREAM','DRESS','DRIED','DRIFT','DRINK','DRIVE','DROVE',
]

const MAX_GUESSES = 6
const WORD_LEN = 5

type LetterState = 'correct' | 'present' | 'absent' | ''
interface Row { letters: string[]; states: LetterState[] }

const { click: sfxClick, correct: sfxCorrect, wrong: sfxWrong, win: sfxWin, lose: sfxLose } = useGameSounds()

const state    = ref<'idle' | 'playing' | 'won' | 'over'>('idle')
const answer   = ref('')
const rows     = ref<Row[]>([])
const current  = ref('')
const score    = ref(0)
const shake    = ref(false)
const keyboard = ref<Record<string, LetterState>>({})

const KEYS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']

function startGame() {
  answer.value = WORDS[Math.floor(Math.random() * WORDS.length)]!
  rows.value = []
  current.value = ''
  keyboard.value = {}
  state.value = 'playing'
}

function press(key: string) {
  if (state.value !== 'playing') return
  if (key === 'BACKSPACE' || key === '⌫') {
    current.value = current.value.slice(0, -1)
  } else if (key === 'ENTER' || key === '↵') {
    submit()
  } else if (/^[A-Z]$/.test(key) && current.value.length < WORD_LEN) {
    sfxClick()
    current.value += key
  }
}

function submit() {
  if (current.value.length < WORD_LEN) { doShake(); return }
  const guess = current.value
  const ans = answer.value
  const states: LetterState[] = Array(WORD_LEN).fill('')
  const used = Array(WORD_LEN).fill(false)

  // Mark correct
  for (let i = 0; i < WORD_LEN; i++) {
    if (guess[i] === ans[i]) { states[i] = 'correct'; used[i] = true }
  }
  // Mark present
  for (let i = 0; i < WORD_LEN; i++) {
    if (states[i] === 'correct') continue
    for (let j = 0; j < WORD_LEN; j++) {
      if (!used[j] && guess[i] === ans[j]) { states[i] = 'present'; used[j] = true; break }
    }
    if (states[i] === '') states[i] = 'absent'
  }

  rows.value.push({ letters: guess.split(''), states })
  current.value = ''

  // Update keyboard
  for (let i = 0; i < WORD_LEN; i++) {
    const k = guess[i]!
    const cur = keyboard.value[k]
    if (cur !== 'correct') keyboard.value[k] = states[i]!
  }

  if (guess === ans) { score.value = rows.value.length; sfxWin(); state.value = 'won'; return }
  const hasCorrect = states.some(s => s === 'correct')
  const hasPresent = states.some(s => s === 'present')
  if (hasCorrect) sfxCorrect()
  else if (hasPresent) sfxWrong()
  if (rows.value.length >= MAX_GUESSES) { score.value = MAX_GUESSES; sfxLose(); state.value = 'over' }
}

function doShake() {
  shake.value = true
  setTimeout(() => { shake.value = false }, 400)
}

function restart() { startGame() }

function onKey(e: KeyboardEvent) {
  if (state.value !== 'playing') return
  const k = e.key.toUpperCase()
  if (k === 'BACKSPACE' || k === 'ENTER' || /^[A-Z]$/.test(k)) press(k)
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="flex flex-col items-center gap-4 select-none">
    <div v-if="state === 'idle'" class="flex flex-col items-center gap-3">
      <p class="font-mono text-xs text-slate-500 text-center">
        Guess the 5-letter word in 6 tries.<br>
        <span class="text-neon-emerald">Green</span> = correct position &nbsp;
        <span class="text-yellow-400">Yellow</span> = wrong position &nbsp;
        <span class="text-slate-500">Gray</span> = not in word
      </p>
      <button class="btn-neon-blue mt-2" @click="startGame">START GAME</button>
    </div>

    <div v-else class="relative flex flex-col items-center gap-3">
      <!-- Grid -->
      <div class="flex flex-col gap-1.5">
        <div
          v-for="(row, ri) in rows"
          :key="ri"
          class="flex gap-1.5"
        >
          <div
            v-for="(letter, li) in row.letters"
            :key="li"
            class="w-12 h-12 flex items-center justify-center font-mono font-bold text-lg rounded border-2"
            :class="{
              'bg-neon-emerald/20 border-neon-emerald text-neon-emerald': row.states[li] === 'correct',
              'bg-yellow-500/20 border-yellow-400 text-yellow-400': row.states[li] === 'present',
              'bg-slate-800 border-slate-700 text-slate-400': row.states[li] === 'absent',
            }"
          >{{ letter }}</div>
        </div>

        <!-- Current row -->
        <div
          v-if="rows.length < MAX_GUESSES && state === 'playing'"
          class="flex gap-1.5"
          :class="shake ? 'animate-[shake_0.4s_ease]' : ''"
        >
          <div
            v-for="i in WORD_LEN"
            :key="i"
            class="w-12 h-12 flex items-center justify-center font-mono font-bold text-lg rounded border-2 transition-colors"
            :class="current[i-1] ? 'border-white/40 text-white' : 'border-slate-700 text-transparent'"
          >{{ current[i - 1] || '·' }}</div>
        </div>

        <!-- Empty rows -->
        <div
          v-for="i in Math.max(0, MAX_GUESSES - rows.length - (state === 'playing' ? 1 : 0))"
          :key="`e${i}`"
          class="flex gap-1.5"
        >
          <div v-for="j in WORD_LEN" :key="j" class="w-12 h-12 rounded border-2 border-slate-800" />
        </div>
      </div>

      <!-- On-screen keyboard -->
      <div v-if="state === 'playing'" class="flex flex-col gap-1.5 mt-1">
        <div v-for="(row, ri) in KEYS" :key="ri" class="flex gap-1 justify-center">
          <button
            v-if="ri === 2"
            class="px-2 h-10 rounded font-mono text-xs font-bold bg-slate-700 text-white hover:bg-slate-600 transition-colors"
            @click="press('ENTER')"
          >↵</button>
          <button
            v-for="key in row.split('')"
            :key="key"
            class="w-8 h-10 rounded font-mono text-xs font-bold transition-colors"
            :class="{
              'bg-neon-emerald/30 text-neon-emerald border border-neon-emerald/50': keyboard[key] === 'correct',
              'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50': keyboard[key] === 'present',
              'bg-slate-800 text-slate-600 border border-slate-700': keyboard[key] === 'absent',
              'bg-slate-700 text-white hover:bg-slate-600 border border-slate-600': !keyboard[key],
            }"
            @click="press(key)"
          >{{ key }}</button>
          <button
            v-if="ri === 2"
            class="px-2 h-10 rounded font-mono text-xs font-bold bg-slate-700 text-white hover:bg-slate-600 transition-colors"
            @click="press('BACKSPACE')"
          >⌫</button>
        </div>
      </div>

      <!-- Reveal answer on loss -->
      <p v-if="state === 'over'" class="font-mono text-sm text-slate-400">
        The word was <span class="text-neon-pink font-bold">{{ answer }}</span>
      </p>

      <GameResultOverlay
        v-if="state === 'won' || state === 'over'"
        :state="state === 'won' ? 'won' : 'over'"
        :score="score"
        :extra="state === 'won' ? `Solved in ${score} guess${score === 1 ? '' : 'es'}` : `The word: ${answer}`"
        @restart="restart"
      />
    </div>
  </div>
</template>

<style scoped>
@keyframes shake {
  0%, 100% { transform: translateX(0) }
  20% { transform: translateX(-6px) }
  40% { transform: translateX(6px) }
  60% { transform: translateX(-4px) }
  80% { transform: translateX(4px) }
}
</style>
