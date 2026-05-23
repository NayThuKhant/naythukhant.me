<script setup lang="ts">

const { data: page } = await useAsyncData('index', () =>
  queryCollection('pages').path('/').first()
)

useSeoMeta({
  title: computed(() => page.value?.seo?.title),
  description: computed(() => page.value?.seo?.description),
  ogTitle: computed(() => page.value?.seo?.title),
  ogDescription: computed(() => page.value?.seo?.description),
  twitterTitle: computed(() => page.value?.seo?.title),
  twitterDescription: computed(() => page.value?.seo?.description),
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

