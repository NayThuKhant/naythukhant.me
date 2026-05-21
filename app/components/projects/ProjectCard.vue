<script setup lang="ts">
import type { Project } from '~/types'

interface Props { project: Project }
const props = defineProps<Props>()

const { scrollScaleIn } = useAnimations()
const slug = computed(() => props.project.path.split('/').pop())

// Deterministic gradient fallback based on title
const gradientIndex = computed(() => {
  const gradients = [
    'from-neon-blue/20 via-neon-purple/10 to-transparent',
    'from-neon-purple/20 via-neon-pink/10 to-transparent',
    'from-neon-emerald/20 via-neon-blue/10 to-transparent',
    'from-neon-pink/20 via-neon-purple/10 to-transparent',
  ]
  let hash = 0
  for (const c of props.project.title) hash += c.charCodeAt(0)
  return gradients[hash % gradients.length]
})
</script>

<template>
  <article
    v-motion
    :initial="scrollScaleIn.initial"
    :visible-once="scrollScaleIn.visibleOnce"
    class="group relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden
      transition-all duration-400 hover:-translate-y-2 hover:border-neon-blue/30 hover:shadow-neon-blue"
  >
    <!-- Image / gradient header -->
    <div class="relative h-44 overflow-hidden">
      <img
        v-if="project.image"
        :src="project.image"
        :alt="project.title"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div
        v-else
        class="w-full h-full bg-gradient-to-br"
        :class="gradientIndex"
      >
        <!-- Abstract grid pattern -->
        <div class="absolute inset-0 opacity-20"
          style="background-image: linear-gradient(rgba(0,212,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.15) 1px, transparent 1px); background-size: 24px 24px;"
        />
        <!-- Project initials -->
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="font-display font-bold text-4xl text-white/10 select-none">
            {{ project.title.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() }}
          </span>
        </div>
      </div>

      <!-- Overlay gradient -->
      <div class="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-transparent" />

      <!-- Corner badge -->
      <div class="absolute top-3 right-3 font-mono text-[10px] px-2 py-0.5 rounded
        bg-void/70 border border-white/10 text-neon-blue/70 backdrop-blur-sm">
        PROJECT
      </div>
    </div>

    <!-- Card body -->
    <div class="flex flex-col flex-1 p-5">
      <h3 class="font-display font-semibold text-base text-white mb-2 group-hover:text-neon-blue transition-colors duration-300 leading-snug">
        <NuxtLink :to="`/projects/${slug}`" class="after:absolute after:inset-0">
          {{ project.title }}
        </NuxtLink>
      </h3>

      <p class="text-slate-500 text-xs leading-relaxed line-clamp-3 flex-1 mb-4">
        {{ project.description }}
      </p>

      <!-- Tags -->
      <div class="flex flex-wrap gap-1.5 mb-5">
        <span
          v-for="tag in project.tags"
          :key="tag"
          class="cyber-tag"
        >{{ tag }}</span>
      </div>

      <!-- Links -->
      <div class="flex gap-3 relative z-10 border-t border-white/[0.06] pt-4">
        <a
          v-if="project.github"
          :href="project.github"
          target="_blank"
          rel="noopener"
          class="flex items-center gap-1.5 font-mono text-xs text-slate-500 hover:text-neon-purple transition-colors"
          @click.stop
        >
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.23 1.84 1.23 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.05.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          Source
        </a>
        <a
          v-if="project.liveLink"
          :href="project.liveLink"
          target="_blank"
          rel="noopener"
          class="flex items-center gap-1.5 font-mono text-xs text-slate-500 hover:text-neon-blue transition-colors"
          @click.stop
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Live
        </a>
        <span class="flex-1" />
        <span class="font-mono text-[10px] text-slate-700">VIEW →</span>
      </div>
    </div>
  </article>
</template>
