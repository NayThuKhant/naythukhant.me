<script setup lang="ts">
const route = useRoute()
const { getGameBySlug } = useGames()

const game = computed(() => getGameBySlug(String(route.params.slug)))

if (!game.value) throw createError({ statusCode: 404, message: 'Game not found' })

useSeoMeta({
  title: game.value?.name,
  description: game.value?.desc,
  ogTitle: game.value?.name,
  ogDescription: game.value?.desc,
  twitterTitle: game.value?.name,
  twitterDescription: game.value?.desc,
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <article class="relative z-10 pt-28 pb-24 px-6">
    <div class="max-w-5xl mx-auto">
      <NuxtLink
        to="/games"
        class="inline-flex items-center gap-2 font-mono text-xs text-slate-600 hover:text-neon-blue transition-colors mb-12 tracking-widest uppercase"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" />
        </svg>
        BACK TO GAME CENTER
      </NuxtLink>

      <header class="glass-hud p-8 mb-10">
        <p class="hud-label mb-3">RECREATION MODULE</p>
        <p
          class="font-mono text-xs tracking-[0.2em] px-2 py-0.5 rounded border inline-flex mb-4"
          :class="{
            'text-neon-blue/80 border-neon-blue/25 bg-neon-blue/10': game!.color === 'neon-blue',
            'text-neon-purple/80 border-neon-purple/25 bg-neon-purple/10': game!.color === 'neon-purple',
            'text-neon-emerald/80 border-neon-emerald/25 bg-neon-emerald/10': game!.color === 'neon-emerald',
            'text-neon-pink/80 border-neon-pink/25 bg-neon-pink/10': game!.color === 'neon-pink',
          }"
        >{{ game!.genre }}</p>
        <h1 class="font-display font-bold text-4xl md:text-5xl text-white leading-tight">{{ game!.name }}</h1>
        <p class="text-slate-400 text-base mt-4 max-w-2xl">{{ game!.desc }}</p>
      </header>

      <div class="glass-hud p-6 md:p-8 flex items-center justify-center">
        <component :is="game!.component" />
      </div>
    </div>
  </article>
</template>

