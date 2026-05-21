<script setup lang="ts">

import useConfig from '~/composables/useConfig'

const { data: config } = await useConfig()

useSeoMeta({
  title: config.value?.name,
  description: config.value?.description,
  ogTitle: config.value?.name,
  ogDescription: config.value?.description,
  twitterTitle: config.value?.name,
  twitterDescription: config.value?.description,
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <div>
    <HeroSection />
    <SkillsGrid />
    <FeaturedProjects />
    <FeaturedBlog />
  </div>
</template>

