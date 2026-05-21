<script setup lang="ts">
const route = useRoute()
const scrolled = ref(false)

const {data: config} = await useAsyncData('config', () => queryCollection('config').first())

const links = [
  {
    label: 'Home',
    to: '/',
    icon: 'i-lucide-house'
  },
  {
    label: 'Projects',
    to: '/projects',
    icon: 'i-lucide-folder-kanban'
  },
  {
    label: 'Blog',
    to: '/blog',
    icon: 'i-lucide-file-text'
  },
  {
    label: 'Game Center',
    to: '/games',
    icon: 'i-lucide-gamepad-2'
  },
]

onMounted(() => {
  window.addEventListener('scroll', () => {
    scrolled.value = window.scrollY > 30
  }, {passive: true})
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
    <div class="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-blue/40 to-transparent"/>

    <nav class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-2 group">
        <span class="font-mono text-xs text-neon-blue/60 group-hover:text-neon-blue transition-colors">&lt;</span>
        <span
            class="font-display font-bold text-base text-white group-hover:text-neon-blue transition-colors tracking-wide">{{
            config?.name
          }}</span>
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
        <span class="w-1.5 h-1.5 rounded-full bg-neon-emerald animate-pulse"/>
        <span class="text-neon-emerald/70">ONLINE</span>
      </div>
    </nav>
  </header>

  <!-- Mobile bottom tab bar -->
  <nav class="md:hidden fixed bottom-0 inset-x-0 z-50 bg-void/80 backdrop-blur-xl border-t border-white/[0.06]">
    <div class="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-purple/30 to-transparent"/>
    <ul class="flex items-stretch h-16">
      <li v-for="link in links" :key="link.to" class="flex-1">
        <NuxtLink
            :to="link.to"
            class="flex flex-col items-center justify-center gap-1 h-full transition-all duration-300"
            :class="route.path === link.to ? 'text-neon-blue' : 'text-slate-600 hover:text-slate-400'"
        >
          <Icon :name="link.icon" class="w-5 h-5" />
          <span class="font-mono text-[10px] tracking-widest uppercase">{{ link.label }}</span>
          <span v-if="route.path === link.to" class="w-1 h-1 rounded-full bg-neon-blue"/>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
