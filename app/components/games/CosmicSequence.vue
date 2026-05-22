<template>
  <div class="w-full h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center p-4">
    <div class="text-center">
      <div class="mb-6 text-6xl">🔷</div>
      <h1 class="text-3xl font-bold text-neon-blue mb-4">Cosmic Sequence</h1>
      <div class="bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 border border-neon-blue/30 rounded-lg p-8 mb-6">
        <div class="grid grid-cols-4 gap-3 mb-6">
          <button v-for="i in 4" :key="i" @click="playerClick(i)" class="py-6 px-4 rounded-lg font-bold text-white" :class="[colors[i], i === currentHighlight ? 'ring-4 ring-white' : '']">
            •
          </button>
        </div>
        <div class="text-3xl font-bold text-neon-blue mb-4">Level: {{ level }}</div>
        <button @click="startGame" class="px-6 py-2 bg-neon-blue text-white rounded hover:bg-neon-blue/80">
          {{ gameActive ? 'Listening...' : 'Start' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const sequence = ref<number[]>([])
const playerSequence = ref<number[]>([])
const level = ref(0)
const gameActive = ref(false)
const currentHighlight = ref(-1)
const colors = ['bg-neon-blue', 'bg-neon-purple', 'bg-neon-pink', 'bg-neon-emerald']

const playerClick = async (i: number) => {
  if (!gameActive.value) return
  playerSequence.value.push(i)
  currentHighlight.value = i
  await new Promise(r => setTimeout(r, 300))
  currentHighlight.value = -1

  if (playerSequence.value[playerSequence.value.length - 1] !== sequence.value[playerSequence.value.length - 1]) {
    gameActive.value = false
    level.value = 0
  } else if (playerSequence.value.length === sequence.value.length) {
    playerSequence.value = []
    await new Promise(r => setTimeout(r, 500))
    playSequence()
  }
}

const playSequence = async () => {
  for (let i of sequence.value) {
    await new Promise(r => setTimeout(r, 600))
    currentHighlight.value = i
    await new Promise(r => setTimeout(r, 300))
    currentHighlight.value = -1
  }
}

const startGame = () => {
  sequence.value = [Math.floor(Math.random() * 4)]
  playerSequence.value = []
  level.value = 1
  gameActive.value = true
  playSequence()
}
</script>

