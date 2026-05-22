<script setup lang="ts">
import type { Post } from '~/types'

interface Props { post: Post }
const props = defineProps<Props>()

const { scrollScaleIn } = useAnimations()
const slug = computed(() => props.post.path.split('/').pop())

const formattedDate = computed(() =>
  new Date(props.post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
)
</script>

<template>
  <article
    v-motion
    :initial="scrollScaleIn.initial"
    :visible-once="scrollScaleIn.visibleOnce"
    class="group relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden
      transition-all duration-300 hover:-translate-y-2 hover:border-neon-purple/30 hover:shadow-neon-purple"
  >
    <!-- Cover image -->
    <div class="relative h-40 overflow-hidden">
      <NuxtImg
        v-if="post.coverImage"
        :src="post.coverImage"
        :alt="post.title"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div
        v-else
        class="w-full h-full bg-gradient-to-br from-neon-purple/20 via-neon-pink/10 to-transparent"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-transparent" />
    </div>

    <!-- Top accent line -->
    <div class="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-purple/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

    <div class="flex flex-col flex-1 p-6">
    <time class="font-mono text-[11px] text-slate-600 mb-3 tracking-wide">{{ formattedDate }}</time>

    <h2 class="font-display font-semibold text-base text-white mb-2 group-hover:text-neon-purple transition-colors duration-300 leading-snug">
      <NuxtLink :to="`/blog/${slug}`" class="after:absolute after:inset-0">{{ post.title }}</NuxtLink>
    </h2>

    <p class="text-slate-500 text-xs leading-relaxed line-clamp-3 flex-1 mb-5">{{ post.description }}</p>

    <div class="flex flex-wrap gap-1.5">
      <span
        v-for="tag in post.tags"
        :key="tag"
        class="cyber-tag-purple"
      >#{{ tag }}</span>
    </div>
    </div>
  </article>
</template>
