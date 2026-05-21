<script setup lang="ts">

import useConfig from '~/composables/useConfig'

const { data: config } = await useConfig()
const route = useRoute()

const { data: page } = await useAsyncData('page-meta-home', () =>
  queryCollection('pages').path('/').first(),
)

useHead({
  titleTemplate: (title) => title ? `${title} · ${page.value?.title ?? ''}` : (page.value?.title ?? ''),
  htmlAttrs: { lang: 'en' },
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
  ],
})

useSeoMeta({
  ...page.value?.seo,
  ogTitle: page.value?.title,
  ogDescription: page.value?.description,
  twitterTitle: page.value?.title,
  twitterDescription: page.value?.description,
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <div class="min-h-screen flex flex-col text-slate-300 font-sans relative overflow-x-hidden">
    <SolarSystemBackground />
    <AppNavbar />
    <main class="relative z-10 flex-1 pb-16 md:pb-0">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
