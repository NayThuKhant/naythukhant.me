<script setup lang="ts">
import {
  AsteroidDodge,
  BreakoutGame,
  FlappyRocket,
  Game2048,
  MemoryMatch,
  SnakeGame,
  SpaceInvaders,
} from '#components'

const { scrollFadeUp, staggered } = useAnimations()

const games = [
  {
    id: 'SpaceInvaders',
    name: 'Space Invaders',
    desc: 'Shoot down the alien fleet before they reach Earth. Classic arcade action.',
    genre: 'ARCADE',
    color: 'neon-blue',
  },
  {
    id: 'AsteroidDodge',
    name: 'Asteroid Dodge',
    desc: 'Pilot your ship through a relentless asteroid field. How long can you survive?',
    genre: 'SURVIVAL',
    color: 'neon-emerald',
  },
  {
    id: 'FlappyRocket',
    name: 'Flappy Rocket',
    desc: 'Boost your rocket through narrow gaps. One tap to fly — don\'t crash.',
    genre: 'ONE-TAP',
    color: 'neon-purple',
  },
  {
    id: 'BreakoutGame',
    name: 'Cosmic Breakout',
    desc: 'Break every neon brick with a bouncing energy ball. Classic and satisfying.',
    genre: 'ARCADE',
    color: 'neon-pink',
  },
  {
    id: 'SnakeGame',
    name: 'Neon Snake',
    desc: 'Eat the glowing orbs and grow without hitting yourself. Speed builds up.',
    genre: 'CLASSIC',
    color: 'neon-emerald',
  },
  {
    id: 'Game2048',
    name: '2048',
    desc: 'Slide and merge tiles to reach 2048. Deceptively simple, endlessly deep.',
    genre: 'PUZZLE',
    color: 'neon-blue',
  },
  {
    id: 'MemoryMatch',
    name: 'Planet Memory',
    desc: 'Match all 8 planet pairs in the fewest flips. Test your space memory.',
    genre: 'PUZZLE',
    color: 'neon-purple',
  },
]

type GameId = typeof games[number]['id']
const active = ref<GameId | null>(null)
const gameComponents: Record<GameId, unknown> = {
  SpaceInvaders,
  AsteroidDodge,
  FlappyRocket,
  BreakoutGame,
  SnakeGame,
  Game2048,
  MemoryMatch,
}

const activeGame = computed(() => games.find(g => g.id === active.value) ?? null)
const activeComponent = computed(() => active.value ? gameComponents[active.value] : null)

function open(id: GameId) { active.value = id }
function close() { active.value = null }

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

useSeoMeta({
  title: 'Game Center',
  description: 'Lightweight arcade games — play right in the browser.',
})
</script>

<template>
  <div class="relative z-10 pt-28 pb-32 px-6">
    <div class="max-w-6xl mx-auto">

      <div
        v-motion
        :initial="scrollFadeUp.initial"
        :visible-once="scrollFadeUp.visibleOnce"
        class="mb-14"
      >
        <p class="hud-label mb-3">RECREATION MODULE</p>
        <h1 class="font-display font-bold text-5xl md:text-6xl text-white">Game Center</h1>
        <p class="text-slate-500 mt-4 font-mono text-sm max-w-lg">
          Lightweight browser games. Click any card to launch. Press ESC to exit.
        </p>
      </div>

      <div class="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div
          v-for="(game, i) in games"
          :key="game.id"
          v-motion
          :initial="staggered(i, 60).initial"
          :visible-once="staggered(i, 60).visibleOnce"
        >
          <button
            class="glass-card w-full text-left p-5 flex flex-col gap-3 group"
            @click="open(game.id)"
          >
            <div class="flex items-start justify-between">
              <span
                class="font-mono text-[10px] tracking-[0.2em] px-2 py-0.5 rounded border"
                :class="{
                  'text-neon-blue/80 border-neon-blue/25 bg-neon-blue/10': game.color === 'neon-blue',
                  'text-neon-purple/80 border-neon-purple/25 bg-neon-purple/10': game.color === 'neon-purple',
                  'text-neon-emerald/80 border-neon-emerald/25 bg-neon-emerald/10': game.color === 'neon-emerald',
                  'text-neon-pink/80 border-neon-pink/25 bg-neon-pink/10': game.color === 'neon-pink',
                }"
              >{{ game.genre }}</span>
              <svg class="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 3l14 9-14 9V3z" />
              </svg>
            </div>
            <div>
              <h3 class="font-display font-semibold text-white text-base mb-1 group-hover:text-neon-blue transition-colors">{{ game.name }}</h3>
              <p class="font-mono text-xs text-slate-500 leading-relaxed">{{ game.desc }}</p>
            </div>
            <div class="mt-auto">
              <span class="font-mono text-xs text-slate-600 group-hover:text-neon-blue transition-colors tracking-widest uppercase">PLAY →</span>
            </div>
          </button>
        </div>
      </div>

    </div>

    <!-- Game modal -->
    <Teleport to="body">
      <Transition name="modal" mode="out-in">
        <div
          v-if="active"
          class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          @click.self="close"
        >
          <!-- Larger modal window for games -->
          <div class="glass-hud w-full max-w-5xl max-h-[92vh] overflow-auto flex flex-col gap-4 p-6">
            <!-- Modal header -->
            <div class="flex items-center justify-between">
              <div>
                <p class="hud-label text-[10px]">{{ activeGame?.genre }}</p>
                <h2 class="font-display font-bold text-white text-lg leading-tight">{{ activeGame?.name }}</h2>
              </div>
              <button
                class="w-8 h-8 rounded-lg border border-white/10 text-slate-500 hover:text-white hover:border-white/20 transition-all flex items-center justify-center font-mono text-sm"
                @click="close"
              >✕</button>
            </div>

            <!-- Game component (centered, gives room for larger canvases) -->
            <div class="game-wrapper w-full flex items-center justify-center py-4">
              <component :is="activeComponent" />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Modal backdrop + content transition (pop + slide) */
.modal-enter-active, .modal-leave-active {
  transition: opacity 220ms cubic-bezier(.2,.9,.3,1), transform 220ms cubic-bezier(.2,.9,.3,1);
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
.modal-enter-to, .modal-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* Game wrapper small pop for inner content (keeps canvas centered) */
.game-wrapper {
  transition: transform 220ms cubic-bezier(.2,.9,.3,1), opacity 220ms ease;
}
</style>
