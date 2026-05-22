<template>
  <div class="w-full h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center p-4">
    <div class="text-center">
      <div class="mb-6 text-6xl">🏎️</div>
      <h1 class="text-3xl font-bold text-neon-emerald mb-4">Planet Racer</h1>
      <div class="bg-slate-800 border border-neon-emerald/30 rounded-lg p-8 mb-6">
        <div class="text-5xl font-bold text-neon-emerald mb-4">{{ score }}</div>
        <div class="h-64 bg-gradient-to-b from-slate-900/50 to-slate-800 rounded border border-neon-emerald/20 mb-4 flex items-center justify-center overflow-hidden">
          <div class="text-6xl animate-bounce">🚀</div>
        </div>
        <button @click="startGame" class="px-6 py-2 bg-neon-emerald text-white rounded hover:bg-neon-emerald/80">
          {{ gameActive ? 'Playing...' : 'Start Race' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const score = ref(0)
const gameActive = ref(false)
let gameInterval: any

const startGame = () => {
  if (!gameActive.value) {
    score.value = 0
    gameActive.value = true
    gameInterval = setInterval(() => {
      score.value += 10
    }, 500)
    setTimeout(() => {
      gameActive.value = false
    }, 10000)
  }
}

onUnmounted(() => {
  if (gameInterval) clearInterval(gameInterval)
})
</script>

