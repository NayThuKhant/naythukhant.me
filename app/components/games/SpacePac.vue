<template>
  <div class="w-full h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center p-4">
    <div class="text-center">
      <div class="mb-6 text-6xl">🎮</div>
      <h1 class="text-3xl font-bold text-neon-purple mb-4">Space Pac</h1>
      <div class="grid grid-cols-5 gap-2 mb-8 bg-slate-800 p-6 rounded-lg border border-neon-purple/30">
        <div v-for="(cell, i) in maze" :key="i" class="w-8 h-8 flex items-center justify-center">
          <div v-if="i === playerPos" class="text-yellow-400 text-2xl">●</div>
          <div v-else-if="cell === 'wall'" class="w-full h-full bg-neon-purple/40 rounded"></div>
          <div v-else-if="cell === 'pellet'" class="w-1 h-1 bg-neon-cyan rounded-full"></div>
          <div v-else class="w-full h-full"></div>
        </div>
      </div>
      <div class="text-neon-cyan text-lg mb-4">Score: {{ score }}</div>
      <button @click="resetGame" class="px-6 py-2 bg-neon-purple text-white rounded hover:bg-neon-purple/80">
        {{ gameActive ? 'Restart' : 'Start Game' }}
      </button>
      <p class="text-slate-400 mt-4 text-sm">Use arrow keys to move • Collect all pellets!</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const maze = ref<string[]>([])
const playerPos = ref(12)
const score = ref(0)
const gameActive = ref(false)
const gridSize = 25

const initMaze = () => {
  const newMaze = Array(gridSize).fill('empty')
  // Add walls
  for (let i = 0; i < 25; i += 5) newMaze[i] = 'wall'
  // Add pellets
  for (let i = 0; i < 25; i++) {
    if (newMaze[i] !== 'wall' && i !== 12) newMaze[i] = 'pellet'
  }
  maze.value = newMaze
  score.value = 0
  gameActive.value = true
}

const resetGame = () => {
  playerPos.value = 12
  initMaze()
}

const movePlayer = (direction: string) => {
  if (!gameActive.value) return
  let newPos = playerPos.value
  switch (direction) {
    case 'ArrowUp':
      if (playerPos.value >= 5) newPos -= 5
      break
    case 'ArrowDown':
      if (playerPos.value < 20) newPos += 5
      break
    case 'ArrowLeft':
      if (playerPos.value % 5 !== 0) newPos -= 1
      break
    case 'ArrowRight':
      if (playerPos.value % 5 !== 4) newPos += 1
      break
  }

  if (maze.value[newPos] !== 'wall') {
    if (maze.value[newPos] === 'pellet') {
      score.value += 10
      maze.value[newPos] = 'empty'
    }
    playerPos.value = newPos

    if (maze.value.every(cell => cell !== 'pellet')) {
      gameActive.value = false
    }
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  movePlayer(e.key)
}

onMounted(() => {
  initMaze()
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

