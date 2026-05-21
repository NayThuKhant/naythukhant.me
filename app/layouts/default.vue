<script setup lang="ts">
const { data: config } = await useAsyncData('config', () => queryCollection('config').first())
const route = useRoute()

const canonicalUrl = computed(() => (config.value?.siteUrl ?? '') + route.path)

useHead({
  titleTemplate: (title) => title ? `${title} · ${config.value?.seoTitle}` : (config.value?.seoTitle ?? ''),
  htmlAttrs: { lang: 'en' },
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
  ],
})

useSeoMeta({
  description: config.value?.seoDescription,
  ogUrl: canonicalUrl,
  ogTitle: config.value?.seoTitle,
  ogDescription: config.value?.seoDescription,
  ogImage: config.value?.seoImage,
  twitterCard: 'summary_large_image',
  twitterSite: config.value?.twitterHandle,
  twitterTitle: config.value?.seoTitle,
  twitterDescription: config.value?.seoDescription,
  twitterImage: config.value?.seoImage,
})
</script>

<template>
  <div class="min-h-screen flex flex-col text-slate-300 font-sans relative overflow-x-hidden">
    <CosmicBackground />
    <AppNavbar />
    <main class="relative z-10 flex-1 pb-16 md:pb-0">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
