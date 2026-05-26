<script setup lang="ts">
// ─── Word list ────────────────────────────────────────────────────────────────
const WORDS = new Set(['the','and','for','are','but','not','you','all','can','her',
'was','one','our','out','day','get','has','him','his','how','man','new','now','old',
'see','two','way','who','boy','did','its','let','put','say','she','too','use',
'able','also','back','been','best','came','case','come','does','down','each',
'even','find','from','give','good','great','hand','have','here','high','home',
'into','just','keep','kind','know','last','left','like','line','live','long',
'look','made','make','many','more','most','much','must','name','need','next',
'only','open','over','part','play','real','same','seem','show','side','some',
'such','take','than','that','them','then','they','this','time','turn','very',
'want','well','went','were','when','will','with','word','work','year',
'about','above','after','again','begin','being','below','bring','build',
'carry','cause','clean','clear','close','could','doing','dream','drive',
'earth','every','fight','final','first','floor','found','going','great',
'green','group','grown','guard','heart','hello','human','large','learn',
'level','light','local','lower','might','money','month','order','other',
'peace','plant','point','power','print','proof','quite','raise','reach',
'ready','right','river','round','scale','serve','seven','short','since',
'small','sound','south','space','stand','start','state','still','store',
'story','study','sugar','table','think','three','times','today','total',
'touch','trade','train','treat','trial','trick','trust','truth','under',
'until','usual','value','visit','voice','water','where','which','while',
'white','whole','whose','woman','world','worry','worse','worst','worth','write',
'young','yours'])

// ─── Letter weights ────────────────────────────────────────────────────────────
const LETTER_POOL: string[] = []
const WEIGHTS: [string, number][] = [
  ['E',12],['A',9],['I',9],['O',8],['N',7],['T',7],['R',6],['S',6],['H',6],['L',5],
  ['D',4],['C',4],['U',4],['M',4],['P',3],['F',3],['G',3],['W',3],['Y',3],['B',2],
  ['V',2],['K',2],['X',1],['J',1],['Q',1],['Z',1],
]
for (const [ch, w] of WEIGHTS) { for (let i = 0; i < w; i++) LETTER_POOL.push(ch) }

function randomLetter(): string { return LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)]! }

// ─── Scoring ───────────────────────────────────────────────────────────────────
function wordPoints(len: number): number {
  if (len <= 2) return 0
  if (len === 3) return 1
  if (len === 4) return 2
  if (len === 5) return 4
  if (len === 6) return 7
  return 11
}

// ─── State ────────────────────────────────────────────────────────────────────
const { click: sfxClick, wordFound: sfxWordFound, wrong: sfxWrong } = useGameSounds()

const GAME_TIME = 90
const gameState   = ref<'idle' | 'playing' | 'won'>('idle')
const grid        = ref<string[]>([])          // 16 letters, row-major
const path        = ref<number[]>([])          // indices of current word path
const foundWords  = ref<Set<string>>(new Set())
const score       = ref(0)
const timeLeft    = ref(GAME_TIME)
const invalidAnim = ref(false)
const lastWord    = ref('')
let timerId = 0

// ─── Grid helpers ─────────────────────────────────────────────────────────────
function adjacent(a: number, b: number): boolean {
  const ar = Math.floor(a / 4), ac = a % 4
  const br = Math.floor(b / 4), bc = b % 4
  return Math.abs(ar - br) <= 1 && Math.abs(ac - bc) <= 1 && a !== b
}

function buildGrid(): string[] {
  return Array.from({ length: 16 }, randomLetter)
}

// ─── Game flow ────────────────────────────────────────────────────────────────
function startGame() {
  clearInterval(timerId)
  grid.value = buildGrid()
  path.value = []
  foundWords.value = new Set()
  score.value = 0
  timeLeft.value = GAME_TIME
  lastWord.value = ''
  invalidAnim.value = false
  gameState.value = 'playing'
  timerId = window.setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) endGame()
  }, 1000)
}

function endGame() {
  clearInterval(timerId)
  gameState.value = 'won'
}

function restart() { startGame() }

// ─── Letter selection ─────────────────────────────────────────────────────────
function selectCell(i: number) {
  if (gameState.value !== 'playing') return

  // Cancel if already last in path (double-click)
  if (path.value.length > 0 && path.value[path.value.length - 1] === i) {
    cancelPath()
    return
  }

  // Already in path — can't revisit
  if (path.value.includes(i)) {
    // If it's the second-to-last, treat as backtrack
    if (path.value.length >= 2 && path.value[path.value.length - 2] === i) {
      path.value = path.value.slice(0, -1)
      return
    }
    return
  }

  // Must be adjacent to last
  if (path.value.length > 0 && !adjacent(path.value[path.value.length - 1]!, i)) return

  sfxClick()
  path.value = [...path.value, i]
}

function cancelPath() {
  path.value = []
}

function submitWord() {
  if (gameState.value !== 'playing') return
  const word = path.value.map(i => grid.value[i]!).join('').toLowerCase()
  if (word.length < 3) { triggerInvalid(); return }
  if (foundWords.value.has(word)) { triggerInvalid(); return }
  if (!WORDS.has(word)) { sfxWrong(); triggerInvalid(); return }

  const pts = wordPoints(word.length)
  score.value += pts
  foundWords.value = new Set([...foundWords.value, word])
  lastWord.value = `+${pts}  "${word.toUpperCase()}"`
  sfxWordFound()
  path.value = []
}

function triggerInvalid() {
  invalidAnim.value = true
  setTimeout(() => { invalidAnim.value = false }, 400)
  path.value = []
}

// ─── Keyboard ─────────────────────────────────────────────────────────────────
function onKey(e: KeyboardEvent) {
  if (gameState.value !== 'playing') return
  if (e.key === 'Enter') submitWord()
  if (e.key === 'Escape') cancelPath()
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => { window.removeEventListener('keydown', onKey); clearInterval(timerId) })

// ─── Computed ─────────────────────────────────────────────────────────────────
const currentWord = computed(() => path.value.map(i => grid.value[i]!).join(''))

const timerClass = computed(() => {
  if (timeLeft.value <= 10) return 'text-red-400'
  if (timeLeft.value <= 30) return 'text-yellow-400'
  return 'text-neon-emerald'
})

function cellClass(i: number): string {
  const inPath = path.value.includes(i)
  const isLast = path.value.length > 0 && path.value[path.value.length - 1] === i
  if (isLast) return 'bg-neon-blue/30 border-neon-blue text-neon-blue scale-110'
  if (inPath) return 'bg-neon-purple/20 border-neon-purple/60 text-neon-purple'
  return 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 cursor-pointer'
}
</script>

<template>
  <div class="flex flex-col items-center gap-4 select-none">

    <!-- Idle -->
    <div v-if="gameState === 'idle'" class="flex flex-col items-center gap-4">
      <p class="font-mono text-xs text-slate-400 text-center max-w-xs leading-relaxed">
        Trace adjacent letters to form words.<br>
        <span class="text-neon-blue">3 letters=1pt · 4=2 · 5=4 · 6=7 · 7+=11</span><br>
        Press <span class="text-white">Enter</span> to submit · <span class="text-white">Esc</span> to cancel · 90 seconds!
      </p>
      <button class="btn-neon-blue mt-2" @click="startGame">START GAME</button>
    </div>

    <!-- Playing -->
    <div v-else class="relative flex flex-col items-center gap-3 w-full max-w-sm">

      <!-- HUD -->
      <div class="flex gap-6 glass-hud px-5 py-2 rounded-lg w-full justify-between">
        <div class="text-center">
          <p class="hud-label">TIME</p>
          <p class="font-mono font-bold text-sm" :class="timerClass">{{ timeLeft }}s</p>
        </div>
        <div class="text-center">
          <p class="hud-label">SCORE</p>
          <p class="font-mono font-bold text-sm text-neon-blue">{{ score }}</p>
        </div>
        <div class="text-center">
          <p class="hud-label">WORDS</p>
          <p class="font-mono font-bold text-sm text-neon-purple">{{ foundWords.size }}</p>
        </div>
      </div>

      <!-- Current word display -->
      <div class="h-7 flex items-center justify-center">
        <p
          v-if="currentWord"
          class="font-mono font-bold text-lg tracking-widest"
          :class="invalidAnim ? 'text-red-400 animate-[shake_0.4s_ease]' : 'text-white'"
        >{{ currentWord }}</p>
        <p v-else-if="lastWord" class="font-mono text-sm text-neon-emerald">{{ lastWord }}</p>
        <p v-else class="font-mono text-xs text-slate-600">Click letters to trace a word</p>
      </div>

      <!-- 4×4 grid -->
      <div class="grid grid-cols-4 gap-1.5">
        <button
          v-for="(letter, i) in grid"
          :key="i"
          class="w-14 h-14 flex items-center justify-center font-mono font-bold text-lg rounded-lg border-2 transition-all duration-100"
          :class="cellClass(i)"
          @click="selectCell(i)"
        >{{ letter }}</button>
      </div>

      <!-- Controls -->
      <div class="flex gap-3 mt-1">
        <button
          class="btn-neon-blue text-xs px-4 py-2"
          :disabled="path.length < 3"
          :class="path.length < 3 ? 'opacity-40 cursor-not-allowed' : ''"
          @click="submitWord"
        >SUBMIT</button>
        <button
          class="btn-neon-purple text-xs px-4 py-2"
          :disabled="path.length === 0"
          :class="path.length === 0 ? 'opacity-40 cursor-not-allowed' : ''"
          @click="cancelPath"
        >CANCEL</button>
      </div>

      <!-- Found words list -->
      <div v-if="foundWords.size > 0" class="w-full max-h-24 overflow-y-auto">
        <div class="flex flex-wrap gap-1.5 justify-center">
          <span
            v-for="w in [...foundWords].slice().reverse()"
            :key="w"
            class="font-mono text-[10px] px-2 py-0.5 rounded bg-neon-emerald/10 border border-neon-emerald/30 text-neon-emerald"
          >{{ w.toUpperCase() }}</span>
        </div>
      </div>

      <!-- Result overlay -->
      <GameResultOverlay
        v-if="gameState === 'won'"
        state="won"
        :score="score"
        :extra="`${foundWords.size} word${foundWords.size !== 1 ? 's' : ''} found`"
        @restart="restart"
      />
    </div>
  </div>
</template>

<style scoped>
@keyframes shake {
  0%, 100% { transform: translateX(0) }
  20% { transform: translateX(-5px) }
  40% { transform: translateX(5px) }
  60% { transform: translateX(-3px) }
  80% { transform: translateX(3px) }
}
</style>
