<script setup lang="ts">
const route = useRoute()
const { getGameBySlug } = useGames()

const game = computed(() => getGameBySlug(String(route.params.slug)))

if (!game.value) throw createError({ statusCode: 404, message: 'Game not found' })

// Provide game context so GameResultOverlay can display name + URL without
// each game component needing to know its own slug.
provide('gameTitle', game.value.name)
provide('gameSlug', game.value.slug)

useSeoMeta({
  title: computed(() => game.value?.name),
  description: computed(() => game.value?.desc),
  ogTitle: computed(() => game.value?.name),
  ogDescription: computed(() => game.value?.desc),
  twitterTitle: computed(() => game.value?.name),
  twitterDescription: computed(() => game.value?.desc),
  twitterCard: 'summary_large_image',
})

const gameAreaRef = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)
const isCssFullscreen = ref(false)

async function toggleFullscreen() {
  if (!isFullscreen.value) {
    if (gameAreaRef.value?.requestFullscreen) {
      try {
        await gameAreaRef.value.requestFullscreen()
        return
      } catch {
        // Native fullscreen rejected (iOS Safari) — fall through to CSS mode
      }
    }
    isCssFullscreen.value = true
    isFullscreen.value = true
  } else {
    if (document.fullscreenElement) document.exitFullscreen()
    isCssFullscreen.value = false
    isFullscreen.value = false
  }
}

onMounted(() => {
  const onChange = () => {
    const active = !!document.fullscreenElement
    isFullscreen.value = active
    if (!active) isCssFullscreen.value = false
  }
  document.addEventListener('fullscreenchange', onChange)
  onUnmounted(() => document.removeEventListener('fullscreenchange', onChange))
})
</script>

<template>
  <article class="relative z-10 pt-24 pb-16">

    <!-- Plain text header -->
    <div class="px-4 sm:px-6 max-w-5xl mx-auto mb-6">
      <div class="flex items-center justify-between mb-6">
        <NuxtLink
          to="/games"
          class="inline-flex items-center gap-2 font-mono text-xs text-slate-600 hover:text-neon-blue transition-colors tracking-widest uppercase"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" />
          </svg>
          BACK TO GAME CENTER
        </NuxtLink>

        <button
          class="inline-flex items-center gap-2 font-mono text-xs text-slate-500 hover:text-neon-blue transition-colors tracking-widest uppercase"
          @click="toggleFullscreen"
        >
          <svg v-if="!isFullscreen" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 4v4H4M16 4v4h4M8 20v-4H4M16 20v-4h4" />
          </svg>
          {{ isFullscreen ? 'EXIT' : 'FULLSCREEN' }}
        </button>
      </div>

      <h1 class="font-display font-bold text-3xl md:text-4xl text-white leading-tight">{{ game!.name }}</h1>
      <p class="text-slate-500 text-sm mt-2 max-w-xl">{{ game!.desc }}</p>
    </div>

    <!-- Game area (native fullscreen or non-fullscreen) -->
    <div
      v-show="!isCssFullscreen"
      ref="gameAreaRef"
      class="game-area relative flex flex-col items-center"
    >
      <!-- Exit button shown inside native fullscreen -->
      <button
        v-if="isFullscreen && !isCssFullscreen"
        class="fullscreen-exit-btn"
        @click="toggleFullscreen"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 4v4H4M16 4v4h4M8 20v-4H4M16 20v-4h4" />
        </svg>
        EXIT
      </button>
      <component :is="game!.component" />
      <GameKeyboard :layout="game!.controls" />
    </div>

    <!-- CSS fullscreen overlay teleported to body to escape main's z-index stacking context -->
    <Teleport to="body">
      <div v-if="isCssFullscreen" class="css-fullscreen-overlay">
        <button class="fullscreen-exit-btn" @click="toggleFullscreen">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 4v4H4M16 4v4h4M8 20v-4H4M16 20v-4h4" />
          </svg>
          EXIT
        </button>
        <component :is="game!.component" />
        <GameKeyboard :layout="game!.controls" />
      </div>
    </Teleport>

  </article>
</template>

<style scoped>
.game-area :deep(canvas) {
  width: 100%;
  height: auto;
  max-width: 100vw;
  display: block;
}

/* Native fullscreen */
.game-area:fullscreen,
.game-area:-webkit-full-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #030712;
  padding: 1rem;
}

.fullscreen-exit-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 50;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-family: ui-monospace, monospace;
  font-size: 0.65rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgb(100 116 139);
  background: rgba(255 255 255 / 0.05);
  border: 1px solid rgba(255 255 255 / 0.1);
  border-radius: 0.5rem;
  padding: 0.375rem 0.625rem;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.fullscreen-exit-btn:hover {
  color: rgb(0 212 255);
  border-color: rgba(0 212 255 / 0.4);
}
</style>

<!-- Global styles for the teleported CSS fullscreen overlay (outside component scope) -->
<style>
.css-fullscreen-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: #030712;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3.5rem 1rem 1rem;
}

.css-fullscreen-overlay canvas {
  max-height: calc(100svh - 140px);
  width: auto;
  max-width: 100%;
  display: block;
}

.css-fullscreen-overlay .fullscreen-exit-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 510;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-family: ui-monospace, monospace;
  font-size: 0.65rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgb(100 116 139);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 0.375rem 0.625rem;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.css-fullscreen-overlay .fullscreen-exit-btn:hover {
  color: rgb(0, 212, 255);
  border-color: rgba(0, 212, 255, 0.4);
}
</style>
