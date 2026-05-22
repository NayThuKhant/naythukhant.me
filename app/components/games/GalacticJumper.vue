<template>
  <div class="w-full h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center p-4">
    <div class="text-center">
      <div class="mb-6 text-6xl">🚀</div>
      <h1 class="text-3xl font-bold text-neon-purple mb-4">Galactic Jumper</h1>
      <div class="bg-slate-800 border border-neon-purple/30 rounded-lg p-6 mb-6">
        <div class="h-64 bg-gradient-to-b from-slate-900 to-slate-800 rounded border border-neon-purple/20 mb-4 flex flex-col items-center justify-between p-4">
          <div class="text-blue-400 text-xl">↑ {{ height }} ↑</div>
          <div class="text-5xl animate-bounce">🚀</div>
          <div class="w-20 h-1 bg-neon-purple rounded"></div>
        </div>
        <div class="text-3xl font-bold text-neon-purple mb-4">{{ score }}</div>
        <button @click="jump" class="px-6 py-2 bg-neon-purple text-white rounded hover:bg-neon-purple/80">
          JUMP
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const score = ref(0)
const height = ref(0)
let gameInterval: any

const jump = () => {
  height.value += 10
  score.value += 10
}

onMounted(() => {
  gameInterval = setInterval(() => {
    if (Math.random() > 0.7) {
      height.value = Math.max(0, height.value - 5)
    }
  }, 1000)
})
</script>

