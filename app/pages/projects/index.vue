<script setup lang="ts">
import { DataKey } from '~/types'
const { scrollFadeUp } = useAnimations()
const route = useRoute()
const router = useRouter()

const { data } = await useAsyncData(DataKey.ProjectList, () => Promise.all([
  queryCollection('pages').path(route.path).first(),
  queryCollection('projects').all(),
]))

const page = computed(() => data.value?.[0])
const projects = computed(() => data.value?.[1] ?? [])

const activeTag = ref<string | null>((route.query.tag as string) || null)
watch(activeTag, (val) => router.replace({ query: val ? { tag: val } : {} }))

const allTags = computed(() => {
  const seen = new Set<string>()
  for (const p of projects.value) {
    for (const t of p.tags ?? []) seen.add(t)
  }
  return [...seen].sort()
})

const filtered = computed(() =>
  activeTag.value
    ? projects.value.filter(p => (p.tags ?? []).includes(activeTag.value as string))
    : projects.value
)

useSeoMeta({
  title: computed(() => page.value?.seo?.title ?? page.value?.title),
  description: computed(() => page.value?.seo?.description ?? page.value?.description),
  ogTitle: computed(() => page.value?.seo?.title ?? page.value?.title),
  ogDescription: computed(() => page.value?.seo?.description ?? page.value?.description),
  twitterTitle: computed(() => page.value?.seo?.title ?? page.value?.title),
  twitterDescription: computed(() => page.value?.seo?.description ?? page.value?.description),
  twitterCard: 'summary_large_image',
})
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
        <h1 class="font-display font-bold text-5xl md:text-6xl text-white">{{ page?.title }}</h1>
        <p class="text-slate-500 mt-4 font-mono text-sm max-w-lg">{{ page?.description }}</p>
      </div>

      <!-- Tag filter -->
      <div v-if="allTags.length" class="flex flex-wrap gap-2 mb-10">
        <button
          class="px-3 py-1.5 rounded-lg font-mono text-xs tracking-widest uppercase border transition-all duration-300"
          :class="activeTag === null
            ? 'bg-neon-blue/15 border-neon-blue/40 text-neon-blue'
            : 'bg-transparent border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'"
          @click="activeTag = null"
        >ALL</button>
        <button
          v-for="tag in allTags"
          :key="tag"
          class="px-3 py-1.5 rounded-lg font-mono text-xs tracking-widest uppercase border transition-all duration-300"
          :class="activeTag === tag
            ? 'bg-neon-blue/15 border-neon-blue/40 text-neon-blue'
            : 'bg-transparent border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'"
          @click="activeTag = tag"
        >#{{ tag }}</button>
      </div>

      <div class="flex flex-wrap justify-center gap-5">
        <ProjectCard v-for="project in filtered" :key="project.path" :project="project" class="w-full md:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]" />
      </div>

      <p v-if="filtered.length === 0" class="font-mono text-sm text-slate-600 mt-16 text-center">
        No projects for <span class="text-neon-blue">#{{ activeTag }}</span> yet.
      </p>
    </div>
  </div>
</template>
