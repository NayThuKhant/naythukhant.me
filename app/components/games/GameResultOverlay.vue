<script setup lang="ts">
const props = defineProps<{
  state: string
  score: number
  extra?: string
}>()

const emit = defineEmits<{ restart: [] }>()

// Title and slug are injected from the game page ([slug].vue).
const injectedTitle = inject<string>('gameTitle', '')
const injectedSlug  = inject<string>('gameSlug', '')

const isWon   = computed(() => props.state === 'won')
const show    = computed(() => props.state === 'over' || props.state === 'won')
const copied  = ref(false)

async function copyLink() {
  try {
    const url = window.location.href
    await navigator.clipboard.writeText(url)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // Fallback: do nothing silently
  }
}
</script>

<template>
  <Transition name="result-fade">
    <div
      v-if="show"
      class="absolute inset-0 rounded-xl flex items-center justify-center z-20"
      style="background: rgba(3,7,18,0.92); backdrop-filter: blur(2px)"
    >
      <div class="flex flex-col items-center gap-3 border border-white/10 bg-white/[0.04] rounded-2xl px-8 py-7 w-64">

        <p
          class="font-mono text-[10px] tracking-[0.25em] uppercase"
          :class="isWon ? 'text-neon-emerald' : 'text-red-400'"
        >{{ isWon ? '✦ VICTORY ✦' : '✦ GAME OVER ✦' }}</p>

        <p v-if="injectedTitle" class="font-display font-bold text-base text-white leading-tight text-center">
          {{ injectedTitle }}
        </p>

        <div class="text-center">
          <p
            class="font-display font-bold text-5xl leading-none"
            :class="isWon ? 'text-neon-emerald' : 'text-white'"
          >{{ score.toLocaleString() }}</p>
          <p class="hud-label text-[10px] mt-1">SCORE</p>
        </div>

        <p v-if="extra" class="font-mono text-[11px] text-slate-500 text-center">{{ extra }}</p>

        <!-- Copy game URL button -->
        <button
          class="inline-flex items-center gap-1.5 font-mono text-[10px] transition-colors px-2 py-1 rounded border"
          :class="copied
            ? 'text-neon-emerald border-neon-emerald/40 bg-neon-emerald/10'
            : 'text-slate-500 border-white/10 bg-white/5 hover:text-neon-blue hover:border-neon-blue/30'"
          @click.stop="copyLink"
        >
          <svg v-if="!copied" class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <svg v-else class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          {{ copied ? 'Link copied!' : 'Copy game link' }}
        </button>

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
