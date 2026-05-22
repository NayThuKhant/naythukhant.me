<template>
  <div class="w-full h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center p-4">
    <div class="text-center">
      <div class="mb-6 text-6xl">♚</div>
      <h1 class="text-3xl font-bold text-neon-purple mb-4">Astro Checkers</h1>
      <div class="bg-slate-800 border border-neon-purple/30 rounded-lg p-6 mb-6">
        <div class="grid grid-cols-8 gap-1 bg-slate-800 mb-6">
          <div v-for="i in 64" :key="i" class="w-8 h-8 flex items-center justify-center text-sm" :class="(i % 16 < 8 && Math.floor((i-1)/8) % 2 === 0) || (i % 16 >= 8 && Math.floor((i-1)/8) % 2 === 1) ? 'bg-slate-600' : 'bg-slate-400'">
            <span v-if="i % 3 === 0">●</span>
          </div>
        </div>
        <div class="text-2xl font-bold text-neon-purple mb-4">{{ score }} pts</div>
        <button @click="resetGame" class="px-6 py-2 bg-neon-purple text-white rounded hover:bg-neon-purple/80">
          {{ gameActive ? 'Playing' : 'Play' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const score = ref(0)
const gameActive = ref(false)

const resetGame = () => {
  score.value = 0
  gameActive.value = true
  setInterval(() => {
    if (gameActive.value) score.value += 5
  }, 1000)
}
</script>

