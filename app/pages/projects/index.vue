<script setup lang="ts">
const { scrollFadeUp } = useAnimations()

const { data: projects } = await useAsyncData('all-projects', () =>
  queryCollection('projects').order('order', 'ASC').all(),
)

const activeTag = ref<string | null>(null)

const allTags = computed(() => {
  const seen = new Set<string>()
  for (const project of projects.value ?? []) {
    for (const tag of project.tags ?? []) seen.add(tag)
  }
  return [...seen].sort()
})

const filtered = computed(() =>
  activeTag.value
    ? (projects.value ?? []).filter(p => p.tags?.includes(activeTag.value!))
    : (projects.value ?? []),
)

useSeoMeta({ title: 'Projects | Portfolio', description: 'Open-source and personal projects spanning the full stack.' })
</script>

<template>
  <div class="relative z-10 pt-28 pb-24 px-6">
    <div class="max-w-6xl mx-auto">

      <div
        v-motion
        :initial="scrollFadeUp.initial"
        :visible-once="scrollFadeUp.visibleOnce"
        class="mb-12"
      >
        <p class="hud-label mb-3">MISSION LOG</p>
        <h1 class="font-display font-bold text-5xl md:text-6xl text-white">Projects</h1>
        <p class="text-slate-500 mt-4 font-mono text-sm max-w-lg">
          Open-source tools, side experiments, and production systems — all things I've built.
        </p>
      </div>

      <!-- Tag filter -->
      <div
        v-if="allTags.length"
        class="flex flex-wrap gap-2 mb-10"
      >
        <button
          class="px-3 py-1 rounded-lg font-mono text-xs tracking-widest uppercase border transition-all duration-300"
          :class="activeTag === null
            ? 'bg-neon-blue/15 border-neon-blue/40 text-neon-blue'
            : 'bg-transparent border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'"
          @click="activeTag = null"
        >ALL</button>
        <button
          v-for="tag in allTags"
          :key="tag"
          class="px-3 py-1 rounded-lg font-mono text-xs tracking-widest uppercase border transition-all duration-300"
          :class="activeTag === tag
            ? 'bg-neon-blue/15 border-neon-blue/40 text-neon-blue'
            : 'bg-transparent border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'"
          @click="activeTag = tag"
        >{{ tag }}</button>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        <ProjectCard v-for="project in filtered" :key="project.path" :project="project" />
      </div>

      <p v-if="filtered.length === 0" class="font-mono text-sm text-slate-600 mt-16 text-center">
        No projects found for <span class="text-neon-blue">{{ activeTag }}</span>.
      </p>
    </div>
  </div>
</template>
