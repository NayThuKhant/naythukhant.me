<script setup lang="ts">
const route = useRoute()
const { data: project } = await useAsyncData(`project-${route.params.slug}`, () =>
  queryCollection('projects').path(`/projects/${route.params.slug}`).first(),
)
if (!project.value) throw createError({ statusCode: 404, message: 'Project not found' })
useSeoMeta({
  title: project.value.title,
  description: project.value.description,
  ogTitle: project.value.title,
  ogDescription: project.value.description,
  ogImage: project.value.image,
  twitterTitle: project.value.title,
  twitterDescription: project.value.description,
  twitterImage: project.value.image,
})
</script>

<template>
  <article class="relative z-10 pt-28 pb-24 px-6">
    <div class="max-w-3xl mx-auto">

      <NuxtLink
        to="/projects"
        class="inline-flex items-center gap-2 font-mono text-xs text-slate-600 hover:text-neon-blue transition-colors mb-12 tracking-widest uppercase"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" />
        </svg>
        BACK TO PROJECTS
      </NuxtLink>

      <!-- Header -->
      <div class="glass-hud p-8 mb-10">
        <p class="hud-label mb-3">PROJECT DETAIL</p>
        <h1 class="font-display font-bold text-4xl md:text-5xl text-white mb-3 leading-tight">{{ project!.title }}</h1>
        <p class="text-slate-400 text-base mb-6">{{ project!.description }}</p>

        <div class="flex flex-wrap gap-2 mb-6">
          <span v-for="tag in project!.tags" :key="tag" class="cyber-tag">{{ tag }}</span>
        </div>

        <div class="flex gap-4">
          <a
            v-if="project!.github"
            :href="project!.github"
            target="_blank"
            rel="noopener"
            class="btn-neon-purple text-sm"
          >
            GitHub →
          </a>
          <a
            v-if="project!.liveLink"
            :href="project!.liveLink"
            target="_blank"
            rel="noopener"
            class="btn-neon-blue text-sm"
          >
            Live Demo →
          </a>
        </div>
      </div>

      <!-- MDX content -->
      <div class="prose prose-invert prose-space max-w-none">
        <ContentRenderer :value="project!" />
      </div>
    </div>
  </article>
</template>
