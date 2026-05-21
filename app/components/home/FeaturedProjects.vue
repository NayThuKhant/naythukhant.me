<script setup lang="ts">
const { scrollFadeUp } = useAnimations()
const { data: projects } = await useAsyncData('featured-projects', () =>
  queryCollection('projects').where('featured', '=', true).order('order', 'ASC').limit(3).all(),
)
</script>

<template>
  <section class="relative z-10 py-28 px-6">
    <div class="max-w-6xl mx-auto">

      <div
        v-motion
        :initial="scrollFadeUp.initial"
        :visible-once="scrollFadeUp.visibleOnce"
        class="flex items-end justify-between mb-16"
      >
        <div>
          <p class="hud-label mb-3">FEATURED BUILDS</p>
          <h2 class="font-display font-bold text-4xl md:text-5xl text-white">Projects</h2>
        </div>
        <NuxtLink
          to="/projects"
          class="hidden md:flex items-center gap-2 font-mono text-xs text-slate-500 hover:text-neon-blue transition-colors tracking-widest uppercase"
        >
          VIEW ALL
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </NuxtLink>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        <ProjectCard
          v-for="project in projects"
          :key="project.path"
          :project="project"
        />
      </div>

      <div class="mt-10 text-center md:hidden">
        <NuxtLink to="/projects" class="font-mono text-xs text-slate-500 hover:text-neon-blue transition-colors tracking-widest uppercase">
          VIEW ALL PROJECTS →
        </NuxtLink>
      </div>

    </div>
  </section>
</template>
