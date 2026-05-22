<script setup lang="ts">
import { PlanetName } from '~/types'

interface Card {
  id: number
  planet: PlanetName
  flipped: boolean
  matched: boolean
  justMatched: boolean
}

const PLANET_COLORS: Record<PlanetName, string> = {
  [PlanetName.Mercury]: '#9e9e9e',
  [PlanetName.Venus]:   '#f5d060',
  [PlanetName.Earth]:   '#4fc3f7',
  [PlanetName.Mars]:    '#ef6c40',
  [PlanetName.Jupiter]: '#d4aa60',
  [PlanetName.Saturn]:  '#ffe082',
  [PlanetName.Uranus]:  '#80deea',
  [PlanetName.Neptune]: '#7986cb',
}

const state   = ref<'idle' | 'playing' | 'won'>('idle')
const cards   = ref<Card[]>([])
const flips   = ref(0)
const seconds = ref(0)
const locked  = ref(false)
let timer = 0

function buildDeck(): Card[] {
  const planets = Object.values(PlanetName)
  const pairs = [...planets, ...planets]
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pairs[i], pairs[j]] = [pairs[j]!, pairs[i]!]
  }
  return pairs.map((planet, id) => ({ id, planet, flipped: false, matched: false, justMatched: false }))
}

function startGame() {
  clearInterval(timer)
  cards.value = buildDeck()
  flips.value = 0
  seconds.value = 0
  locked.value = false
  state.value = 'playing'
  timer = window.setInterval(() => { seconds.value++ }, 1000)
}

function flip(card: Card) {
  if (locked.value || card.flipped || card.matched || state.value !== 'playing') return
  card.flipped = true
  flips.value++

  const open = cards.value.filter(c => c.flipped && !c.matched)
  if (open.length < 2) return

  locked.value = true
  const [a, b] = [open[0]!, open[1]!]
  if (a.planet === b.planet) {
    // Brief delay so user sees both cards face-up, then mark matched with pop animation
    setTimeout(() => {
      a.matched = b.matched = true
      a.justMatched = b.justMatched = true
      locked.value = false
      // Clear justMatched after pop animation
      setTimeout(() => { a.justMatched = b.justMatched = false }, 420)
      if (cards.value.every(c => c.matched)) {
        clearInterval(timer)
        state.value = 'won'
      }
    }, 200)
  } else {
    setTimeout(() => {
      a.flipped = b.flipped = false
      locked.value = false
    }, 900)
  }
}

const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`

function restart() {
  startGame()
}

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="flex flex-col items-center gap-4 select-none">
    <div class="glass-hud px-6 py-2 flex gap-6 items-center">
      <div class="text-center">
        <p class="hud-label text-[10px]">FLIPS</p>
        <p class="font-mono font-bold text-white text-lg leading-tight">{{ flips }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">TIME</p>
        <p class="font-mono font-bold text-white text-lg leading-tight">{{ fmtTime(seconds) }}</p>
      </div>
    </div>

    <div v-if="state === 'idle'" class="flex flex-col items-center gap-3">
      <button class="btn-neon-blue" @click.stop="startGame">START GAME</button>
      <p class="font-mono text-xs text-slate-600">Match all 8 planet pairs</p>
    </div>

    <div v-if="state === 'won'" class="relative">
      <GameResultOverlay :state="state" :score="flips" :extra="fmtTime(seconds)" @restart="restart" />
    </div>

    <div v-else class="grid grid-cols-4 gap-2">
      <div
        v-for="card in cards"
        :key="card.id"
        class="card-flip-wrapper w-16 h-16"
        :class="{ 'is-flipped': card.flipped || card.matched }"
        @click="flip(card)"
      >
        <!-- Card inner (rotates) -->
        <div
          class="card-flip-inner w-full h-full"
          :class="card.matched ? 'cursor-default' : (card.flipped ? 'cursor-default' : 'cursor-pointer')"
        >
          <!-- Back face -->
          <div
            class="card-face card-back rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center hover:border-white/20 hover:bg-white/[0.06] transition-colors"
          >
            <span class="font-mono text-lg text-slate-700">?</span>
          </div>

          <!-- Front face -->
          <div
            class="card-face card-front rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all duration-200"
            :class="[
              card.matched ? 'border-white/5 bg-white/[0.02] opacity-40' : 'border-white/20 bg-white/[0.06]',
              card.justMatched ? 'card-pop' : '',
            ]"
          >
            <span
              class="w-5 h-5 rounded-full"
              :style="{ background: PLANET_COLORS[card.planet], boxShadow: `0 0 8px ${PLANET_COLORS[card.planet]}` }"
            />
            <span class="font-mono text-[9px] text-slate-400 leading-none">{{ card.planet }}</span>
          </div>
        </div>
      </div>
    </div>

    <p v-if="state === 'playing'" class="font-mono text-xs text-slate-600">Click cards to reveal • find matching planets</p>
  </div>
</template>

<style scoped>
/* 3D card flip */
.card-flip-wrapper {
  perspective: 600px;
}

.card-flip-inner {
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-flip-wrapper.is-flipped .card-flip-inner {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.card-back {
  transform: rotateY(0deg);
}

.card-front {
  transform: rotateY(180deg);
}

/* Scale-pop on match */
@keyframes card-pop {
  0%   { transform: rotateY(180deg) scale(1); }
  40%  { transform: rotateY(180deg) scale(1.22); }
  70%  { transform: rotateY(180deg) scale(0.96); }
  100% { transform: rotateY(180deg) scale(1); }
}

.card-flip-wrapper.is-flipped .card-flip-inner .card-face.card-front.card-pop {
  animation: card-pop 0.4s ease-out;
}
</style>
