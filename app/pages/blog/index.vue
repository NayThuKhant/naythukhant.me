<script setup lang="ts">
const { scrollFadeUp } = useAnimations()
const { data: posts } = await useAsyncData('all-posts', () =>
  queryCollection('blog').order('date', 'DESC').all(),
)
useSeoMeta({ title: 'Blog | Portfolio', description: 'Writing on software engineering, tools, and the craft.' })
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
        <p class="hud-label mb-3">TRANSMISSIONS</p>
        <h1 class="font-display font-bold text-5xl md:text-6xl text-white">Blog</h1>
        <p class="text-slate-500 mt-4 font-mono text-sm max-w-lg">
          Thoughts on software engineering, open source, and the tools I use to build things.
        </p>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        <PostCard v-for="post in posts" :key="post.path" :post="post" />
      </div>
    </div>
  </div>
</template>
