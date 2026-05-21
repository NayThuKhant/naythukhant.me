<script setup lang="ts">
import useConfig from '~/composables/useConfig'

const { data: config } = useConfig()
const { isLoading } = useAppLoading()

useHead({
  titleTemplate: (title) => title ? `${title} · ${config.value?.name ?? ''}` : (config.value?.name ?? ''),
  htmlAttrs: { lang: 'en' },
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
  ],
})
</script>

<template>
  <div class="min-h-screen flex flex-col text-slate-300 font-sans relative overflow-x-hidden">
    <SolarSystemBackground />

    <!-- Full-page loading overlay -->
    <Transition name="page-loader">
      <PageLoader v-if="isLoading" />
    </Transition>

    <AppNavbar />
    <main class="relative z-10 flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>

<style>
.page-loader-enter-active { transition: opacity 0.2s ease; }
.page-loader-leave-active { transition: opacity 0.35s ease; }
.page-loader-enter-from,
.page-loader-leave-to    { opacity: 0; }
</style>
