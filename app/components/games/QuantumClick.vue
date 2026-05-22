<template>
  <div class="w-full h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center p-4">
    <div class="text-center">
      <div class="mb-6 text-6xl">⚡</div>
      <h1 class="text-3xl font-bold text-neon-blue mb-4">Quantum Click</h1>
      <div class="bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 border border-neon-blue/30 rounded-lg p-8 mb-6">
        <div class="text-5xl font-bold text-neon-blue mb-4">{{ energy }}</div>
        <button @click="click" class="px-8 py-4 bg-neon-blue text-white rounded-lg font-bold hover:bg-neon-blue/80 text-lg mb-4">
          CLICK ME
        </button>
        <div class="text-slate-300 text-sm">Energy per click: +{{ clickPower }}</div>
      </div>
      <div class="grid grid-cols-3 gap-3 mb-6">
        <button
          v-for="upgrade in upgrades"
          :key="upgrade.name"
          @click="buyUpgrade(upgrade)"
          :disabled="energy < upgrade.cost"
          class="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:opacity-50 text-white rounded border border-slate-500"
        >
          <div class="text-sm font-bold">{{ upgrade.name }}</div>
          <div class="text-xs text-slate-300">{{ upgrade.cost }}&euro;</div>
        </button>
      </div>
      <div class="text-slate-400 text-sm">Total Upgrades: {{ totalUpgrades }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Upgrade {
  name: string
  cost: number
  power: number
}

const energy = ref(0)
const clickPower = ref(1)
const totalUpgrades = ref(0)

const upgrades = ref<Upgrade[]>([
  { name: 'Power Up', cost: 50, power: 1 },
  { name: 'Reactor +', cost: 100, power: 2 },
  { name: 'Quantum Boost', cost: 500, power: 5 },
])

const click = () => {
  energy.value += clickPower.value
}

const buyUpgrade = (upgrade: Upgrade) => {
  if (energy.value >= upgrade.cost) {
    energy.value -= upgrade.cost
    clickPower.value += upgrade.power
    totalUpgrades.value += 1
    upgrade.cost = Math.floor(upgrade.cost * 1.15)
  }
}
</script>

