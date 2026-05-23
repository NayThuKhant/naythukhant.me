<script setup lang="ts">
import useConfig from '~/composables/useConfig'

const { data: config } = await useConfig()
const { origin, href } = useRequestURL()

useHead({
  titleTemplate: (title) => title ? `${title} · ${config.value?.name ?? ''}` : (config.value?.name ?? ''),
  htmlAttrs: { lang: 'en' },
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'canonical', href },
  ],
})

useSeoMeta({
  ogUrl: href,
  ogImage: `${origin}/logo.png`,
  twitterImage: `${origin}/logo.png`,
})
</script>

<template>
  <div class="min-h-screen flex flex-col text-slate-300 font-sans relative overflow-x-hidden">
    <SolarSystemBackground />
    <AppNavbar />
    <main class="relative z-10 flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
