<script setup lang="ts">
const { scrollFadeUp } = useAnimations()
const route = useRoute()
const router = useRouter()

const { data: posts } = await useAsyncData('all-posts', () =>
  queryCollection('blog').order('stem', 'ASC').all(),
)

const activeTag = ref<string | null>((route.query.tag as string) || null)

watch(activeTag, (val) => {
  router.replace({ query: val ? { tag: val } : {} })
})

const allTags = computed(() => {
  const seen = new Set<string>()
  for (const post of posts.value ?? []) {
    for (const tag of post.tags ?? []) seen.add(tag)
  }
  return [...seen].sort()
})

const filtered = computed(() =>
  activeTag.value
    ? (posts.value ?? []).filter(p => p.tags?.includes(activeTag.value!))
    : (posts.value ?? []),
)

useSeoMeta({
  title: 'Blog',
  description: 'Writing on software engineering, tools, and the craft.',
  ogTitle: 'Blog',
  ogDescription: 'Writing on software engineering, tools, and the craft.',
  twitterTitle: 'Blog',
  twitterDescription: 'Writing on software engineering, tools, and the craft.',
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
        <p class="hud-label mb-3">TRANSMISSIONS</p>
        <h1 class="font-display font-bold text-5xl md:text-6xl text-white">Blog</h1>
        <p class="text-slate-500 mt-4 font-mono text-sm max-w-lg">
          Thoughts on software engineering, open source, and the tools I use to build things.
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
            ? 'bg-neon-purple/15 border-neon-purple/40 text-neon-purple'
            : 'bg-transparent border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'"
          @click="activeTag = null"
        >ALL</button>
        <button
          v-for="tag in allTags"
          :key="tag"
          class="px-3 py-1 rounded-lg font-mono text-xs tracking-widest uppercase border transition-all duration-300"
          :class="activeTag === tag
            ? 'bg-neon-purple/15 border-neon-purple/40 text-neon-purple'
            : 'bg-transparent border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'"
          @click="activeTag = tag"
        >#{{ tag }}</button>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        <PostCard v-for="post in filtered" :key="post.path" :post="post" />
      </div>

      <p v-if="filtered.length === 0" class="font-mono text-sm text-slate-600 mt-16 text-center">
        No posts found for <span class="text-neon-purple">#{{ activeTag }}</span>.
      </p>
    </div>
  </div>
</template>
