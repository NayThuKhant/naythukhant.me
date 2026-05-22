<script setup lang="ts">
const route = useRoute()
const { data: post } = await useAsyncData(
  () => queryCollection('blog').path(`/blog/${route.params.slug}`).first()
)
if (!post.value) throw createError({ statusCode: 404, message: 'Post not found' })

const formattedDate = computed(() =>
  new Date(post.value!.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
)

useSeoMeta({
  title: post.value?.title,
  description: post.value?.description,
  ogTitle: post.value?.title,
  ogDescription: post.value?.description,
  twitterTitle: post.value?.title,
  twitterDescription: post.value?.description,
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <article class="relative z-10 pt-28 pb-24 px-6">
    <div class="max-w-3xl mx-auto">

      <NuxtLink
        to="/blog"
        class="inline-flex items-center gap-2 font-mono text-xs text-slate-600 hover:text-neon-purple transition-colors mb-12 tracking-widest uppercase"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" />
        </svg>
        BACK TO BLOG
      </NuxtLink>

      <header class="glass-hud overflow-hidden mb-10">
        <div v-if="post!.coverImage" class="relative h-56 md:h-72 overflow-hidden">
          <NuxtImg :src="post!.coverImage" :alt="post!.title" class="w-full h-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-[#030712]/80 via-transparent to-transparent" />
        </div>
        <div class="p-8">
          <p class="hud-label mb-3">TRANSMISSION</p>
          <time class="font-mono text-xs text-slate-600 tracking-wide">{{ formattedDate }}</time>
          <h1 class="font-display font-bold text-3xl md:text-4xl text-white mt-3 mb-4 leading-tight">{{ post!.title }}</h1>
          <p class="text-slate-400">{{ post!.summary }}</p>
          <div class="flex flex-wrap gap-1.5 mt-5">
            <span v-for="tag in post!.tags" :key="tag" class="cyber-tag-purple">#{{ tag }}</span>
          </div>
        </div>
      </header>

      <div class="prose prose-invert prose-space max-w-none">
        <ContentRenderer :value="post!" />
      </div>
    </div>
  </article>
</template>
