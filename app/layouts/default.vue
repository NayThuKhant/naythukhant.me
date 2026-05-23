<script setup lang="ts">
import { injectHead } from '@unhead/vue'
import useConfig from '~/composables/useConfig'

const { data: config } = useConfig()
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

// Apply the same titleTemplate format to og:title and twitter:title
const head = injectHead()
head.hooks.hook('tags:resolve', (ctx) => {
  const name = config.value?.name ?? ''
  if (!name) return
  for (const tag of ctx.tags) {
    if (tag.tag !== 'meta') continue
    const prop = tag.props?.property ?? tag.props?.name
    if ((prop === 'og:title' || prop === 'twitter:title') && tag.props?.content) {
      const raw: string = tag.props.content
      tag.props.content = raw.endsWith(` · ${name}`) ? raw : `${raw} · ${name}`
    }
  }
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
