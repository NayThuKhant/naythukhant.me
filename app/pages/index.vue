<script setup lang="ts">

const { data: page } = await useAsyncData('index', () =>
  queryCollection('pages').path('/').first()
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
  <div>
    <HeroSection />
    <SkillsGrid />
    <FeaturedProjects />
    <FeaturedBlog />
  </div>
</template>

