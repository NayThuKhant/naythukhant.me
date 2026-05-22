<template>
  <div class="w-full h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center p-4">
    <div class="text-center">
      <div class="mb-6 text-6xl">🔴</div>
      <h1 class="text-3xl font-bold text-neon-pink mb-4">Void Connect</h1>
      <div class="bg-slate-800 border border-neon-pink/30 rounded-lg p-6 mb-6">
        <div class="grid grid-cols-7 gap-1 mb-6 bg-slate-800 p-2 rounded">
          <div v-for="i in 42" :key="i" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-600 text-xs">
            {{ i % 7 < 3 ? '●' : '' }}
          </div>
        </div>
        <div class="text-3xl font-bold text-neon-pink mb-4">{{ score }}</div>
        <button @click="startGame" class="px-6 py-2 bg-neon-pink text-white rounded hover:bg-neon-pink/80">
          {{ gameActive ? 'Playing' : 'Start' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const score = ref(0)
const gameActive = ref(false)

const startGame = () => {
  gameActive.value = true
  score.value = 0
  let timer = setInterval(() => {
    score.value += Math.floor(Math.random() * 5) + 1
  }, 500)
  setTimeout(() => {
    gameActive.value = false
    clearInterval(timer)
  }, 15000)
}
</script>

