<script setup lang="ts">
const route = useRoute()
const nuxtApp = useNuxtApp()
const key = `project-${route.params.slug}`
const { data: project } = await useAsyncData(key,
  () => queryCollection('projects').path(`/projects/${route.params.slug}`).first(),
  { getCachedData: (k) => nuxtApp.payload.data[k] ?? nuxtApp.static.data[k] },
)
if (!project.value) throw createError({ statusCode: 404, message: 'Project not found' })
useSeoMeta({
  title: project.value?.title,
  description: project.value?.description,
  ogTitle: project.value?.title,
  ogDescription: project.value?.description,
  twitterTitle: project.value?.title,
  twitterDescription: project.value?.description,
  twitterCard: 'summary_large_image',
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
      <div class="glass-hud overflow-hidden mb-10">
        <div v-if="project!.image" class="relative h-56 md:h-72 overflow-hidden">
          <NuxtImg :src="project!.image" :alt="project!.title" class="w-full h-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-[#030712]/80 via-transparent to-transparent" />
        </div>
        <div class="p-8">
        <p class="hud-label mb-3">PROJECT DETAIL</p>
        <h1 class="font-display font-bold text-4xl md:text-5xl text-white mb-3 leading-tight">{{ project!.title }}</h1>
        <p class="text-slate-400 text-base mb-6">{{ project!.description }}</p>

        <div class="flex flex-wrap gap-2 mb-6">
          <span v-for="tag in project!.tags" :key="tag" class="cyber-tag">{{ tag }}</span>
        </div>

        <div class="flex gap-4">
          <a
            v-for="ln in project!.links"
            :key="ln.link"
            :href="ln.link"
            target="_blank"
            rel="noopener"
            class="btn-neon-purple text-sm flex items-center gap-2"
          >
            <Icon v-if="ln.icon" :name="ln.icon" class="w-4 h-4" />
            <span>{{ ln.title }} →</span>
          </a>
        </div>
        </div>
      </div>

      <!-- MDX content -->
      <div class="prose prose-invert prose-space max-w-none">
        <ContentRenderer :value="project!" />
      </div>
    </div>
  </article>
</template>
