<script setup lang="ts">
const { scrollFadeUp } = useAnimations()
const { data: projects } = await useAsyncData('all-projects', () =>
  queryCollection('projects').order('order', 'ASC').all(),
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
        class="mb-16"
      >
        <p class="hud-label mb-3">MISSION LOG</p>
        <h1 class="font-display font-bold text-5xl md:text-6xl text-white">Projects</h1>
        <p class="text-slate-500 mt-4 font-mono text-sm max-w-lg">
          Open-source tools, side experiments, and production systems — all things I've built.
        </p>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        <ProjectCard v-for="project in projects" :key="project.path" :project="project" />
      </div>
    </div>
  </div>
</template>
