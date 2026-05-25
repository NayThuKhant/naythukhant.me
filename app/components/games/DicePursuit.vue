<script setup lang="ts">
const CATEGORIES = [
  { key: 'ones',   label: 'Ones',         desc: 'Sum of all 1s' },
  { key: 'twos',   label: 'Twos',         desc: 'Sum of all 2s' },
  { key: 'threes', label: 'Threes',       desc: 'Sum of all 3s' },
  { key: 'fours',  label: 'Fours',        desc: 'Sum of all 4s' },
  { key: 'fives',  label: 'Fives',        desc: 'Sum of all 5s' },
  { key: 'sixes',  label: 'Sixes',        desc: 'Sum of all 6s' },
  { key: 'threeOfKind', label: '3 of a Kind', desc: 'Sum of all dice' },
  { key: 'fourOfKind',  label: '4 of a Kind', desc: 'Sum of all dice' },
  { key: 'fullHouse',   label: 'Full House',  desc: '25 pts' },
  { key: 'smallStraight', label: 'Sm. Straight', desc: '30 pts' },
  { key: 'largeStraight', label: 'Lg. Straight', desc: '40 pts' },
  { key: 'yahtzee', label: 'Yahtzee',     desc: '50 pts' },
  { key: 'chance',  label: 'Chance',      desc: 'Sum of all dice' },
]

type Cat = typeof CATEGORIES[number]['key']

const state    = ref<'idle' | 'playing' | 'won'>('idle')
const dice     = ref<number[]>([1,1,1,1,1])
const held     = ref<boolean[]>([false,false,false,false,false])
const rolls    = ref(0)
const turn     = ref(0)
const scores   = ref<Record<Cat, number | null>>({} as Record<Cat, number | null>)
const total    = ref(0)
const score    = ref(0)

function calcCategory(key: Cat, d: number[]): number {
  const counts = Array(7).fill(0)
  d.forEach(v => counts[v]++)
  const sum = d.reduce((a, b) => a + b, 0)
  const vals = Object.values(counts)
  const maxCount = Math.max(...vals)

  if (key === 'ones')   return d.filter(v => v === 1).reduce((a,b) => a+b, 0)
  if (key === 'twos')   return d.filter(v => v === 2).reduce((a,b) => a+b, 0)
  if (key === 'threes') return d.filter(v => v === 3).reduce((a,b) => a+b, 0)
  if (key === 'fours')  return d.filter(v => v === 4).reduce((a,b) => a+b, 0)
  if (key === 'fives')  return d.filter(v => v === 5).reduce((a,b) => a+b, 0)
  if (key === 'sixes')  return d.filter(v => v === 6).reduce((a,b) => a+b, 0)
  if (key === 'threeOfKind') return maxCount >= 3 ? sum : 0
  if (key === 'fourOfKind')  return maxCount >= 4 ? sum : 0
  if (key === 'fullHouse')   return (vals.includes(3) && vals.includes(2)) || maxCount === 5 ? 25 : 0
  if (key === 'smallStraight') {
    const uniq = [...new Set(d)].sort((a,b) => a-b)
    for (let i = 0; i <= uniq.length - 4; i++) {
      if (uniq[i+1] === uniq[i]!+1 && uniq[i+2] === uniq[i]!+2 && uniq[i+3] === uniq[i]!+3) return 30
    }
    return 0
  }
  if (key === 'largeStraight') {
    const uniq = [...new Set(d)].sort((a,b) => a-b)
    if (uniq.length === 5 && uniq[4]! - uniq[0]! === 4) return 40
    return 0
  }
  if (key === 'yahtzee') return maxCount === 5 ? 50 : 0
  if (key === 'chance')  return sum
  return 0
}

function initScores(): Record<Cat, number | null> {
  const s: Record<string, number | null> = {}
  CATEGORIES.forEach(c => s[c.key] = null)
  return s as Record<Cat, number | null>
}

function startGame() {
  dice.value = [1,1,1,1,1]
  held.value = [false,false,false,false,false]
  rolls.value = 0
  turn.value = 0
  total.value = 0
  scores.value = initScores()
  state.value = 'playing'
}

function rollDice() {
  if (state.value !== 'playing' || rolls.value >= 3) return
  dice.value = dice.value.map((d, i) => held.value[i] ? d : Math.ceil(Math.random() * 6))
  rolls.value++
}

function toggleHold(i: number) {
  if (rolls.value === 0) return
  held.value[i] = !held.value[i]
}

function scoreCategory(key: Cat) {
  if (scores.value[key] !== null || rolls.value === 0) return
  const val = calcCategory(key, dice.value)
  scores.value = { ...scores.value, [key]: val }
  total.value += val
  turn.value++
  rolls.value = 0
  held.value = [false,false,false,false,false]
  dice.value = [1,1,1,1,1]
  if (turn.value >= CATEGORIES.length) {
    score.value = total.value
    state.value = 'won'
  }
}

function restart() { startGame() }

const DIE_DOTS: Record<number, [number, number][]> = {
  1: [[50,50]],
  2: [[25,25],[75,75]],
  3: [[25,25],[50,50],[75,75]],
  4: [[25,25],[75,25],[25,75],[75,75]],
  5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
  6: [[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]],
}
</script>

<template>
  <div class="flex flex-col items-center gap-4 select-none">
    <div class="glass-hud px-6 py-2 flex items-center gap-6">
      <div class="text-center">
        <p class="hud-label text-[10px]">TURN</p>
        <p class="font-mono font-bold text-white text-lg">{{ turn }} / {{ CATEGORIES.length }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">ROLLS LEFT</p>
        <p class="font-mono font-bold text-white text-lg">{{ 3 - rolls }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">TOTAL</p>
        <p class="font-mono font-bold text-neon-purple text-lg">{{ total }}</p>
      </div>
    </div>

    <div v-if="state === 'idle'" class="flex flex-col items-center gap-3">
      <p class="font-mono text-xs text-slate-500 text-center">
        Roll 5 dice up to 3 times per turn. Score in 13 categories.<br>
        Hold dice between rolls. Yahtzee = 50 pts!
      </p>
      <button class="btn-neon-purple mt-2" @click="startGame">START GAME</button>
    </div>

    <div v-else class="relative flex flex-col gap-4 items-center w-full max-w-sm">
      <!-- Dice -->
      <div class="flex gap-3">
        <div
          v-for="(d, i) in dice"
          :key="i"
          class="relative w-14 h-14 rounded-xl border-2 cursor-pointer transition-all"
          :class="held[i]
            ? 'border-neon-purple bg-purple-900/30 shadow-[0_0_12px_#a855f7]'
            : 'border-slate-600 bg-slate-900 hover:border-slate-400'"
          @click="toggleHold(i)"
        >
          <svg viewBox="0 0 100 100" class="w-full h-full">
            <circle
              v-for="([dx, dy], di) in DIE_DOTS[d]"
              :key="di"
              :cx="dx" :cy="dy" r="9"
              :fill="held[i] ? '#a855f7' : '#e2e8f0'"
            />
          </svg>
          <div v-if="held[i]" class="absolute -top-2 -right-2 text-[9px] font-mono text-neon-purple font-bold">HELD</div>
        </div>
      </div>

      <button
        class="btn-neon-purple"
        :class="rolls >= 3 ? 'opacity-40 cursor-not-allowed' : ''"
        :disabled="rolls >= 3"
        @click="rollDice"
      >
        {{ rolls === 0 ? 'ROLL DICE' : rolls >= 3 ? 'NO ROLLS LEFT' : 'ROLL AGAIN' }}
      </button>

      <!-- Scorecard -->
      <div class="w-full grid grid-cols-2 gap-1 text-xs font-mono">
        <button
          v-for="cat in CATEGORIES"
          :key="cat.key"
          class="flex items-center justify-between px-2 py-1.5 rounded border transition-all text-left"
          :class="{
            'border-slate-700 bg-slate-900/50 text-slate-400 cursor-default': scores[cat.key as Cat] !== null,
            'border-neon-purple/50 bg-purple-900/20 text-neon-purple cursor-pointer hover:bg-purple-900/40': scores[cat.key as Cat] === null && rolls > 0,
            'border-slate-800 bg-transparent text-slate-600 cursor-default': scores[cat.key as Cat] === null && rolls === 0,
          }"
          :disabled="scores[cat.key as Cat] !== null || rolls === 0"
          @click="scoreCategory(cat.key as Cat)"
        >
          <span>{{ cat.label }}</span>
          <span
            class="font-bold"
            :class="scores[cat.key as Cat] !== null ? 'text-white' : rolls > 0 ? 'text-neon-purple/60' : ''"
          >
            {{ scores[cat.key as Cat] !== null ? scores[cat.key as Cat] : rolls > 0 ? calcCategory(cat.key as Cat, dice) : '—' }}
          </span>
        </button>
      </div>

      <GameResultOverlay v-if="state === 'won'" :state="state" :score="total" :extra="`${total} points total`" @restart="restart" />
    </div>
  </div>
</template>
