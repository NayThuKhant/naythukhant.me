<script setup lang="ts">
import { PlanetName } from '~/types'

interface Card {
  id: number
  planet: PlanetName
  flipped: boolean
  matched: boolean
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
  return pairs.map((planet, id) => ({ id, planet, flipped: false, matched: false }))
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
    a.matched = b.matched = true
    locked.value = false
    if (cards.value.every(c => c.matched)) {
      clearInterval(timer)
      state.value = 'won'
    }
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
    <div class="flex gap-4">
      <div class="glass-hud px-5 py-2 text-center min-w-[72px]">
        <p class="hud-label text-[10px]">FLIPS</p>
        <p class="font-mono font-bold text-white text-lg leading-tight">{{ flips }}</p>
      </div>
      <div class="glass-hud px-5 py-2 text-center min-w-[72px]">
        <p class="hud-label text-[10px]">TIME</p>
        <p class="font-mono font-bold text-white text-lg leading-tight">{{ fmtTime(seconds) }}</p>
      </div>
    </div>

    <div v-if="state === 'idle'" class="flex flex-col items-center gap-3">
      <button class="btn-neon-blue" @click.stop="startGame">START GAME</button>
      <p class="font-mono text-xs text-slate-600">Match all 8 planet pairs</p>
    </div>

    <div v-if="state === 'won'" class="flex flex-col items-center gap-3">
      <div class="flex flex-col items-center gap-4 border border-white/10 bg-white/[0.04] rounded-2xl px-10 py-8">
        <p class="font-mono text-[10px] tracking-[0.2em] uppercase text-neon-emerald">ALL MATCHED!</p>
        <p class="font-display font-bold text-2xl text-white">{{ flips }} flips</p>
        <p class="font-mono text-sm text-slate-400">{{ fmtTime(seconds) }}</p>
        <button class="mt-2 px-10 py-2.5 font-mono text-xs tracking-widest uppercase rounded-lg border border-neon-blue/30 bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20 hover:border-neon-blue/50 transition-all cursor-pointer" @click.stop="restart">↺ PLAY AGAIN</button>
      </div>
    </div>

    <div v-else class="grid grid-cols-4 gap-2">
      <button
        v-for="card in cards"
        :key="card.id"
        class="w-16 h-16 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center gap-0.5"
        :class="card.matched
          ? 'border-white/5 bg-white/[0.02] cursor-default opacity-40'
          : card.flipped
            ? 'border-white/20 bg-white/[0.06] cursor-default'
            : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06] cursor-pointer'"
        @click="flip(card)"
      >
        <template v-if="card.flipped || card.matched">
          <span
            class="w-5 h-5 rounded-full"
            :style="{ background: PLANET_COLORS[card.planet], boxShadow: `0 0 8px ${PLANET_COLORS[card.planet]}` }"
          />
          <span class="font-mono text-[9px] text-slate-400 leading-none">{{ card.planet }}</span>
        </template>
        <template v-else>
          <span class="font-mono text-lg text-slate-700">?</span>
        </template>
      </button>
    </div>

    <p v-if="state === 'playing'" class="font-mono text-xs text-slate-600">Click cards to reveal • find matching planets</p>
  </div>
</template>
