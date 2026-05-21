<script setup lang="ts">
const route = useRoute()
const scrolled = ref(false)

const links = [
  { label: 'Home', to: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { label: 'Projects', to: '/projects', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
  { label: 'Blog', to: '/blog', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h6m-6 4h6' },
]

onMounted(() => {
  window.addEventListener('scroll', () => { scrolled.value = window.scrollY > 30 }, { passive: true })
})
</script>

<template>
  <!-- Top bar -->
  <header
    class="fixed top-0 inset-x-0 z-50 transition-all duration-500"
    :class="scrolled
      ? 'bg-void/70 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_1px_40px_rgba(0,0,0,0.4)]'
      : 'bg-transparent'"
  >
    <div class="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-blue/40 to-transparent" />

    <nav class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-2 group">
        <span class="font-mono text-xs text-neon-blue/60 group-hover:text-neon-blue transition-colors">&lt;</span>
        <span class="font-display font-bold text-base text-white group-hover:text-neon-blue transition-colors tracking-wide">NAY THU KHANT</span>
        <span class="font-mono text-xs text-neon-purple/60 group-hover:text-neon-purple transition-colors">/&gt;</span>
      </NuxtLink>

      <!-- Desktop links -->
      <ul class="hidden md:flex items-center gap-1">
        <li v-for="link in links" :key="link.to">
          <NuxtLink
            :to="link.to"
            class="relative px-4 py-2 rounded-lg font-mono text-xs tracking-widest uppercase transition-all duration-300"
            :class="route.path === link.to
              ? 'text-neon-blue bg-neon-blue/10 border border-neon-blue/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'"
          >
            {{ link.label }}
            <span
              v-if="route.path === link.to"
              class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-neon-blue animate-glow-pulse-blue"
            />
          </NuxtLink>
        </li>
      </ul>

      <div class="hidden md:flex items-center gap-2 font-mono text-xs text-slate-500">
        <span class="w-1.5 h-1.5 rounded-full bg-neon-emerald animate-pulse" />
        <span class="text-neon-emerald/70">ONLINE</span>
      </div>
    </nav>
  </header>

  <!-- Mobile bottom tab bar -->
  <nav class="md:hidden fixed bottom-0 inset-x-0 z-50 bg-void/80 backdrop-blur-xl border-t border-white/[0.06]">
    <div class="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-purple/30 to-transparent" />
    <ul class="flex items-stretch h-16">
      <li v-for="link in links" :key="link.to" class="flex-1">
        <NuxtLink
          :to="link.to"
          class="flex flex-col items-center justify-center gap-1 h-full transition-all duration-300"
          :class="route.path === link.to ? 'text-neon-blue' : 'text-slate-600 hover:text-slate-400'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" :d="link.icon" />
          </svg>
          <span class="font-mono text-[10px] tracking-widest uppercase">{{ link.label }}</span>
          <span v-if="route.path === link.to" class="w-1 h-1 rounded-full bg-neon-blue" />
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
