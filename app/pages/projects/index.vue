<script setup lang="ts">
const { scrollFadeUp } = useAnimations()

const [{ data: projects }, { data: categories }] = await Promise.all([
  useAsyncData('all-projects', () => queryCollection('projects').order('order', 'ASC').all()),
  useAsyncData('project-categories', () => queryCollection('projectCategories').order('order', 'ASC').all()),
])

const activeCategory = ref<string | null>(null)

const filtered = computed(() =>
  activeCategory.value
    ? (projects.value ?? []).filter(p => p.category === activeCategory.value)
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

      <!-- Category filter -->
      <div
        v-if="categories?.length"
        class="flex flex-wrap gap-2 mb-10"
      >
        <button
          class="px-3 py-1.5 rounded-lg font-mono text-xs tracking-widest uppercase border transition-all duration-300"
          :class="activeCategory === null
            ? 'bg-neon-blue/15 border-neon-blue/40 text-neon-blue'
            : 'bg-transparent border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'"
          @click="activeCategory = null"
        >ALL</button>
        <button
          v-for="cat in categories"
          :key="cat.key"
          class="px-3 py-1.5 rounded-lg font-mono text-xs tracking-widest uppercase border transition-all duration-300"
          :class="activeCategory === cat.key
            ? 'bg-neon-blue/15 border-neon-blue/40 text-neon-blue'
            : 'bg-transparent border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'"
          @click="activeCategory = cat.key"
        >{{ cat.label }}</button>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        <ProjectCard v-for="project in filtered" :key="project.path" :project="project" />
      </div>

      <p v-if="filtered.length === 0" class="font-mono text-sm text-slate-600 mt-16 text-center">
        No projects in <span class="text-neon-blue">{{ categories?.find(c => c.key === activeCategory)?.label }}</span> yet.
      </p>
    </div>
  </div>
</template>
