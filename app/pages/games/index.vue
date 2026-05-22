<script setup lang="ts">
const { scrollFadeUp, staggered } = useAnimations()
const { games } = useGames()
const route = useRoute()

const { data: page } = await useAsyncData(() =>
  queryCollection('pages').path(route.path).first()
)

useSeoMeta({
  title: computed(() => page.value?.seo.title ?? ''),
  description: computed(() => page.value?.seo.description ?? ''),
  ogTitle: computed(() => page.value?.seo.title ?? ''),
  ogDescription: computed(() => page.value?.seo.description ?? ''),
  twitterCard: 'summary_large_image',
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
        <h1 class="font-display font-bold text-5xl md:text-6xl text-white">{{ page?.title }}</h1>
        <p class="text-slate-500 mt-4 font-mono text-sm max-w-lg">{{ page?.description }}</p>
      </div>

      <div class="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div
          v-for="(game, i) in games"
          :key="game.id"
          v-motion
          :initial="staggered(i, 60).initial"
          :visible-once="staggered(i, 60).visibleOnce"
        >
          <NuxtLink
            :to="`/games/${game.slug}`"
            class="glass-card w-full text-left p-5 flex flex-col gap-3 group"
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
          </NuxtLink>
        </div>
      </div>

    </div>
  </div>
</template>
