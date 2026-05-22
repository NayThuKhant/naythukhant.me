<template>
  <div class="w-full h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center p-4">
    <div class="text-center">
      <div class="mb-6 text-6xl">🌟</div>
      <h1 class="text-3xl font-bold text-neon-purple mb-4">Star Maze</h1>
      <div class="grid gap-4 mb-6">
        <div class="bg-slate-800 border border-neon-purple/30 rounded-lg p-4">
          <div class="text-4xl font-bold text-neon-purple mb-2">{{ score }}</div>
          <div class="text-slate-400">Stars Collected</div>
        </div>
        <div class="grid grid-cols-8 gap-1 bg-slate-800 p-4 rounded-lg border border-neon-purple/30">
          <div v-for="(cell, i) in maze" :key="i" class="w-6 h-6 flex items-center justify-center text-sm">
            <span v-if="i === playerPos" class="text-yellow-400">●</span>
            <span v-else-if="cell === 'wall'" class="w-full h-full bg-neon-purple/30 rounded"></span>
            <span v-else-if="cell === 'star'" class="text-neon-cyan">★</span>
          </div>
        </div>
      </div>
      <button @click="resetGame" class="px-6 py-2 bg-neon-purple text-white rounded hover:bg-neon-purple/80 mb-4">
        {{ gameActive ? 'Restart' : 'Start' }}
      </button>
      <p class="text-slate-400 text-sm">Arrow keys to move • Level: {{ level }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const maze = ref<string[]>([])
const playerPos = ref(0)
const score = ref(0)
const level = ref(1)
const gameActive = ref(false)
const gridSize = 64

const initMaze = () => {
  const newMaze = Array(gridSize).fill('empty')
  const wallCount = level.value * 5
  for (let i = 0; i < wallCount; i++) {
    newMaze[Math.floor(Math.random() * gridSize)] = 'wall'
  }
  const starCount = 5 + level.value
  for (let i = 0; i < starCount; i++) {
    let pos
    do {
      pos = Math.floor(Math.random() * gridSize)
    } while (newMaze[pos] !== 'empty')
    newMaze[pos] = 'star'
  }
  maze.value = newMaze
  playerPos.value = 0
  gameActive.value = true
}

const resetGame = () => {
  score.value = 0
  level.value = 1
  initMaze()
}

const movePlayer = (direction: string) => {
  if (!gameActive.value) return
  let newPos = playerPos.value
  const cols = 8
  switch (direction) {
    case 'ArrowUp':
      if (playerPos.value >= cols) newPos -= cols
      break
    case 'ArrowDown':
      if (playerPos.value < gridSize - cols) newPos += cols
      break
    case 'ArrowLeft':
      if (playerPos.value % cols !== 0) newPos -= 1
      break
    case 'ArrowRight':
      if (playerPos.value % cols !== cols - 1) newPos += 1
      break
  }

  if (maze.value[newPos] !== 'wall') {
    if (maze.value[newPos] === 'star') {
      score.value += 10
      maze.value[newPos] = 'empty'
      if (maze.value.every(cell => cell !== 'star')) {
        level.value += 1
        initMaze()
      }
    }
    playerPos.value = newPos
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

