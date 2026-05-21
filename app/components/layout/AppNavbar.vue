<script setup lang="ts">
const route = useRoute()
const scrolled = ref(false)
const menuOpen = ref(false)

const links = [
  { label: 'Home', to: '/' },
  { label: 'Projects', to: '/projects' },
  { label: 'Blog', to: '/blog' },
]

onMounted(() => {
  window.addEventListener('scroll', () => { scrolled.value = window.scrollY > 30 }, { passive: true })
})

watch(() => route.path, () => { menuOpen.value = false })
</script>

<template>
  <header
    class="fixed top-0 inset-x-0 z-50 transition-all duration-500"
    :class="scrolled
      ? 'bg-void/70 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_1px_40px_rgba(0,0,0,0.4)]'
      : 'bg-transparent'"
  >
    <!-- Subtle top accent line -->
    <div class="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-blue/40 to-transparent" />

    <nav class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <!-- Logo -->
      <NuxtLink to="/" class="flex items-center gap-2 group">
        <span class="font-mono text-xs text-neon-blue/60 group-hover:text-neon-blue transition-colors">&lt;</span>
        <span class="font-display font-bold text-base text-white group-hover:text-neon-blue transition-colors tracking-wide">PORTFOLIO</span>
        <span class="font-mono text-xs text-neon-purple/60 group-hover:text-neon-purple transition-colors">/&gt;</span>
      </NuxtLink>

      <!-- Desktop nav -->
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

      <!-- Status indicator (desktop) -->
      <div class="hidden md:flex items-center gap-2 font-mono text-xs text-slate-500">
        <span class="w-1.5 h-1.5 rounded-full bg-neon-emerald animate-pulse" />
        <span class="text-neon-emerald/70">ONLINE</span>
      </div>

      <!-- Mobile toggle -->
      <button
        class="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
        @click="menuOpen = !menuOpen"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path v-if="!menuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16" />
          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </nav>

    <!-- Mobile menu -->
    <Transition name="slide-down">
      <div v-if="menuOpen" class="md:hidden bg-void/90 backdrop-blur-xl border-b border-white/[0.06]">
        <ul class="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-1">
          <li v-for="link in links" :key="link.to">
            <NuxtLink
              :to="link.to"
              class="block px-4 py-2 rounded-lg font-mono text-xs tracking-widest uppercase transition-all"
              :class="route.path === link.to
                ? 'text-neon-blue bg-neon-blue/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5'"
            >{{ link.label }}</NuxtLink>
          </li>
        </ul>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.2s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
