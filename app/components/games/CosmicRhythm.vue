<template>
  <div class="w-full h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center p-4">
    <div class="text-center">
      <div class="mb-6 text-6xl">🎵</div>
      <h1 class="text-3xl font-bold text-neon-blue mb-4">Cosmic Rhythm</h1>
      <div class="bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 border border-neon-blue/30 rounded-lg p-8 mb-6">
        <div class="text-4xl font-bold text-neon-blue mb-6">{{ score }}</div>
        <div class="grid grid-cols-4 gap-3 mb-6">
          <button v-for="i in 4" :key="i" @click="tap(i)" class="py-4 bg-gradient-to-b from-neon-blue to-blue-900 rounded-lg hover:from-neon-blue/80 hover:to-blue-800 active:scale-95">
            ⬤
          </button>
        </div>
        <button @click="startGame" class="px-6 py-2 bg-neon-blue text-white rounded hover:bg-neon-blue/80">
          {{ gameActive ? 'Playing' : 'Start' }}
        </button>
      </div>
      <p class="text-slate-400 text-sm">Tap the sequence in time with the beat!</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const score = ref(0)
const gameActive = ref(false)
let sequence: number[] = []
let playerSequence: number[] = []
let beatIndex = 0

const tap = (button: number) => {
  if (!gameActive.value) return
  playerSequence.push(button)
  if (playerSequence[playerSequence.length - 1] === sequence[playerSequence.length - 1]) {
    score.value += 10
    if (playerSequence.length === sequence.length) {
      playerSequence = []
      sequence.push(Math.floor(Math.random() * 4))
    }
  } else {
    gameActive.value = false
  }
}

const startGame = () => {
  sequence = [Math.floor(Math.random() * 4)]
  playerSequence = []
  score.value = 0
  gameActive.value = true
}
</script>

