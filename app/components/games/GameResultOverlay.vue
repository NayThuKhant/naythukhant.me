<script setup lang="ts">
const props = defineProps<{
  state: string
  score: number
  title: string
  slug: string
  extra?: string
}>()

const emit = defineEmits<{ restart: [] }>()

const isWon = computed(() => props.state === 'won')
const show  = computed(() => props.state === 'over' || props.state === 'won')
</script>

<template>
  <Transition name="result-fade">
    <div
      v-if="show"
      class="absolute inset-0 rounded-xl flex items-center justify-center z-20"
      style="background: rgba(3,7,18,0.92); backdrop-filter: blur(2px)"
    >
      <div class="flex flex-col items-center gap-3 border border-white/10 bg-white/[0.04] rounded-2xl px-8 py-7 w-64">

        <!-- Result label -->
        <p
          class="font-mono text-[10px] tracking-[0.25em] uppercase"
          :class="isWon ? 'text-neon-emerald' : 'text-red-400'"
        >{{ isWon ? '✦ VICTORY ✦' : '✦ GAME OVER ✦' }}</p>

        <!-- Game title -->
        <p class="font-display font-bold text-base text-white leading-tight text-center">{{ title }}</p>

        <!-- Score -->
        <div class="text-center">
          <p
            class="font-display font-bold text-5xl leading-none"
            :class="isWon ? 'text-neon-emerald' : 'text-white'"
          >{{ score.toLocaleString() }}</p>
          <p class="hud-label text-[10px] mt-1">SCORE</p>
        </div>

        <!-- Extra info -->
        <p v-if="extra" class="font-mono text-[11px] text-slate-500 text-center">{{ extra }}</p>

        <!-- Game URL -->
        <NuxtLink
          :to="`/games/${slug}`"
          class="font-mono text-[10px] text-slate-600 hover:text-neon-blue transition-colors"
        >/games/{{ slug }}</NuxtLink>

        <!-- Restart — only way to restart, prevents accidental skips -->
        <button
          class="mt-1 w-full py-2.5 font-mono text-xs tracking-widest uppercase rounded-lg border transition-all cursor-pointer"
          :class="isWon
            ? 'border-neon-emerald/30 bg-neon-emerald/10 text-neon-emerald hover:bg-neon-emerald/20 hover:border-neon-emerald/50'
            : 'border-neon-blue/30 bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20 hover:border-neon-blue/50'"
          @click.stop="emit('restart')"
        >↺ PLAY AGAIN</button>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
.result-fade-enter-active { transition: opacity 0.3s ease, transform 0.3s ease }
.result-fade-leave-active { transition: opacity 0.2s ease }
.result-fade-enter-from   { opacity: 0; transform: scale(0.97) }
.result-fade-leave-to     { opacity: 0 }
</style>
