<script setup lang="ts">

const { data: page } = await useAsyncData('index', () =>
  queryCollection('pages').path('/').first()
)

useSeoMeta({
  title: page.value?.seo?.title ?? page.value?.title,
  description: page.value?.seo?.description ?? page.value?.description,
  ogTitle: page.value?.seo?.title ?? page.value?.title,
  ogDescription: page.value?.seo?.description ?? page.value?.description,
  twitterTitle: page.value?.seo?.title ?? page.value?.title,
  twitterDescription: page.value?.seo?.description ?? page.value?.description,
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

