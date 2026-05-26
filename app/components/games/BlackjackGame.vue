<script setup lang="ts">
type Suit = '♠' | '♥' | '♦' | '♣'
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

interface Card { rank: Rank; suit: Suit; hidden?: boolean }

const SUITS: Suit[] = ['♠', '♥', '♦', '♣']
const RANKS: Rank[] = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']

const { click: sfxClick, score: sfxScore, wrong: sfxWrong, win: sfxWin, lose: sfxLose } = useGameSounds()

const state       = ref<'idle' | 'betting' | 'playing' | 'result' | 'won' | 'over'>('idle')
const chips       = ref(100)
const bet         = ref(10)
const round       = ref(0)
const totalRounds = 5
const score       = ref(0)

const deck        = ref<Card[]>([])
const playerHand  = ref<Card[]>([])
const dealerHand  = ref<Card[]>([])
const roundResult = ref<'win' | 'lose' | 'push' | 'blackjack' | ''>('')
const doubleUsed  = ref(false)
const lastWin     = ref(0)

function makeDeck(): Card[] {
  const d: Card[] = []
  for (const suit of SUITS)
    for (const rank of RANKS)
      d.push({ rank, suit })
  // Shuffle
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[d[i], d[j]] = [d[j]!, d[i]!]
  }
  return d
}

function cardValue(card: Card): number {
  if (['J','Q','K'].includes(card.rank)) return 10
  if (card.rank === 'A') return 11
  return parseInt(card.rank)
}

function handTotal(hand: Card[]): number {
  let total = 0, aces = 0
  for (const c of hand) {
    if (c.hidden) continue
    total += cardValue(c)
    if (c.rank === 'A') aces++
  }
  while (total > 21 && aces > 0) { total -= 10; aces-- }
  return total
}

function isBust(hand: Card[]): boolean { return handTotal(hand) > 21 }

function isBlackjack(hand: Card[]): boolean {
  return hand.length === 2 && handTotal(hand) === 21
}

function cardColor(card: Card): string {
  return card.suit === '♥' || card.suit === '♦' ? 'text-red-400' : 'text-slate-200'
}

function dealCard(hidden = false): Card {
  return { ...deck.value.pop()!, hidden }
}

function startGame() {
  chips.value = 100
  round.value = 0
  score.value = 0
  state.value = 'betting'
}

function startRound() {
  if (bet.value > chips.value) bet.value = chips.value
  deck.value = makeDeck()
  round.value++
  doubleUsed.value = false
  roundResult.value = ''
  lastWin.value = 0
  sfxClick()

  const d: Card[] = [dealCard(), dealCard(true)]
  const p: Card[] = [dealCard(), dealCard()]
  dealerHand.value = d
  playerHand.value = p

  state.value = 'playing'

  // Check player blackjack
  if (isBlackjack(p)) {
    setTimeout(() => stand(), 200)
  }
}

function drawCard() {
  if (state.value !== 'playing') return
  sfxClick()
  playerHand.value = [...playerHand.value, dealCard()]
  if (isBust(playerHand.value)) {
    resolveRound()
  }
}

function doubleDown() {
  if (state.value !== 'playing' || playerHand.value.length !== 2) return
  if (bet.value * 2 > chips.value) return
  bet.value *= 2
  doubleUsed.value = true
  sfxClick()
  playerHand.value = [...playerHand.value, dealCard()]
  if (isBust(playerHand.value)) { resolveRound(); return }
  stand()
}

function stand() {
  if (state.value !== 'playing') return
  // Reveal dealer hole card
  dealerHand.value = dealerHand.value.map(c => ({ ...c, hidden: false }))

  // Dealer draws until ≥17
  while (handTotal(dealerHand.value) < 17) {
    dealerHand.value = [...dealerHand.value, dealCard()]
  }
  resolveRound()
}

function resolveRound() {
  const pTotal = handTotal(playerHand.value)
  const dTotal = handTotal(dealerHand.value.map(c => ({ ...c, hidden: false })))
  const pBJ = isBlackjack(playerHand.value)
  const dBJ = isBlackjack(dealerHand.value)

  let result: 'win' | 'lose' | 'push' | 'blackjack' = 'push'
  let winAmount = 0

  if (isBust(playerHand.value)) {
    result = 'lose'
    chips.value -= bet.value
    winAmount = -bet.value
    sfxWrong()
  } else if (pBJ && !dBJ) {
    result = 'blackjack'
    const bjWin = Math.floor(bet.value * 1.5)
    chips.value += bjWin
    winAmount = bjWin
    sfxScore()
  } else if (dBJ && !pBJ) {
    result = 'lose'
    chips.value -= bet.value
    winAmount = -bet.value
    sfxWrong()
  } else if (isBust(dealerHand.value) || pTotal > dTotal) {
    result = 'win'
    chips.value += bet.value
    winAmount = bet.value
    sfxScore()
  } else if (pTotal < dTotal) {
    result = 'lose'
    chips.value -= bet.value
    winAmount = -bet.value
    sfxWrong()
  } else {
    result = 'push'
    winAmount = 0
  }

  roundResult.value = result
  lastWin.value = winAmount
  state.value = 'result'

  // Reset bet to sane value
  if (bet.value > chips.value) bet.value = Math.min(chips.value, 50)
  if (bet.value < 10) bet.value = 10

  if (chips.value <= 0) {
    setTimeout(() => {
      score.value = chips.value
      sfxLose(); state.value = 'over'
    }, 1500)
  } else if (round.value >= totalRounds) {
    setTimeout(() => {
      score.value = chips.value
      if (chips.value >= 100) { sfxWin(); state.value = 'won' }
      else { sfxLose(); state.value = 'over' }
    }, 1500)
  }
}

function nextRound() {
  if (state.value !== 'result') return
  bet.value = Math.min(Math.max(bet.value, 10), Math.min(chips.value, 50))
  state.value = 'betting'
}

function restart() { startGame() }

const dealerTotal = computed(() => {
  const visible = dealerHand.value.filter(c => !c.hidden)
  const hand = visible.map(c => ({ ...c }))
  let t = 0, a = 0
  for (const c of hand) { t += cardValue(c); if (c.rank === 'A') a++ }
  while (t > 21 && a > 0) { t -= 10; a-- }
  return t
})

const resultLabel = computed(() => {
  if (roundResult.value === 'blackjack') return '✦ BLACKJACK! ✦'
  if (roundResult.value === 'win') return '✦ WIN! ✦'
  if (roundResult.value === 'lose') return '✗ BUST / LOSE'
  if (roundResult.value === 'push') return '— PUSH —'
  return ''
})

const resultColor = computed(() => {
  if (roundResult.value === 'win' || roundResult.value === 'blackjack') return 'text-neon-emerald'
  if (roundResult.value === 'lose') return 'text-red-400'
  return 'text-slate-400'
})
</script>

<template>
  <div class="flex flex-col items-center gap-4 select-none">

    <!-- Idle -->
    <div v-if="state === 'idle'" class="flex flex-col items-center gap-3">
      <p class="font-mono text-xs text-slate-500 text-center max-w-xs">
        5-round Blackjack. Start with 100 chips.<br>
        Beat the dealer without going over 21.<br>
        End with more than 100 chips to win!
      </p>
      <button class="btn-neon-blue mt-2" @click="startGame">START GAME</button>
    </div>

    <!-- Main game UI -->
    <div v-else class="flex flex-col items-center gap-4 w-full max-w-xs relative">

      <!-- HUD -->
      <div class="glass-hud px-4 py-2 flex items-center gap-4 w-full justify-center">
        <span class="hud-label">Round <span class="text-white font-bold">{{ round }}/{{ totalRounds }}</span></span>
        <span class="text-slate-600">|</span>
        <span class="hud-label">Chips <span class="text-neon-emerald font-bold font-mono">{{ chips }}</span></span>
      </div>

      <!-- Dealer hand -->
      <div class="flex flex-col items-center gap-1 w-full">
        <span class="hud-label text-xs text-slate-500">
          DEALER
          <span v-if="state !== 'playing'" class="text-white ml-1">({{ handTotal(dealerHand) }})</span>
          <span v-else class="text-white ml-1">({{ dealerTotal }})</span>
        </span>
        <div class="flex gap-2 flex-wrap justify-center min-h-[3.5rem]">
          <div
            v-for="(card, i) in dealerHand"
            :key="i"
            class="w-10 h-14 rounded-md border border-white/20 flex items-center justify-center font-mono text-xs font-bold bg-slate-800"
            :class="card.hidden ? 'text-slate-500' : cardColor(card)"
          >
            <span v-if="card.hidden">🂠</span>
            <span v-else>{{ card.rank }}{{ card.suit }}</span>
          </div>
        </div>
      </div>

      <!-- Result banner -->
      <div v-if="state === 'result'" class="text-center">
        <p class="font-mono text-sm font-bold" :class="resultColor">{{ resultLabel }}</p>
        <p class="font-mono text-xs text-slate-400 mt-0.5">
          {{ lastWin > 0 ? `+${lastWin}` : lastWin === 0 ? 'No change' : lastWin }} chips
        </p>
      </div>

      <!-- Player hand -->
      <div class="flex flex-col items-center gap-1 w-full">
        <span class="hud-label text-xs text-slate-500">
          YOU ({{ handTotal(playerHand) }})
          <span v-if="isBust(playerHand)" class="text-red-400 ml-1">BUST!</span>
          <span v-else-if="isBlackjack(playerHand)" class="text-neon-emerald ml-1">BLACKJACK!</span>
        </span>
        <div class="flex gap-2 flex-wrap justify-center min-h-[3.5rem]">
          <div
            v-for="(card, i) in playerHand"
            :key="i"
            class="w-10 h-14 rounded-md border border-white/20 flex items-center justify-center font-mono text-xs font-bold bg-slate-800"
            :class="cardColor(card)"
          >{{ card.rank }}{{ card.suit }}</div>
        </div>
      </div>

      <!-- Betting phase -->
      <div v-if="state === 'betting'" class="flex flex-col items-center gap-3 w-full">
        <div class="flex flex-col items-center gap-1">
          <span class="hud-label text-xs">BET: <span class="text-neon-blue font-bold font-mono">{{ bet }}</span> chips</span>
          <input
            v-model.number="bet"
            type="range"
            min="10"
            :max="Math.min(chips, 50)"
            step="10"
            class="w-40 accent-blue-400"
          />
        </div>
        <button class="btn-neon-blue" @click="startRound">DEAL</button>
      </div>

      <!-- Playing phase -->
      <div v-else-if="state === 'playing'" class="flex gap-3 flex-wrap justify-center">
        <button class="btn-neon-blue" @click="drawCard">HIT</button>
        <button class="btn-neon-purple" @click="stand">STAND</button>
        <button
          v-if="playerHand.length === 2 && chips >= bet * 2"
          class="btn-neon-pink"
          @click="doubleDown"
        >DOUBLE</button>
      </div>

      <!-- Result phase -->
      <div v-else-if="state === 'result'" class="flex flex-col items-center gap-2">
        <span v-if="chips > 0 && round < totalRounds" class="hud-label text-slate-500">Round {{ round }} of {{ totalRounds }}</span>
        <button v-if="chips > 0 && round < totalRounds" class="btn-neon-blue" @click="nextRound">NEXT ROUND</button>
      </div>

      <GameResultOverlay
        v-if="state === 'won' || state === 'over'"
        :state="state"
        :score="chips"
        :extra="state === 'won' ? `Profit: +${chips - 100} chips` : `Loss: ${chips - 100} chips`"
        @restart="restart"
      />
    </div>
  </div>
</template>
