<script setup lang="ts">
import useConfig from '~/composables/useConfig'

const route = useRoute()
const scrolled = ref(false)
const menuOpen = ref(false)

const { data: config, pending } = useConfig()
const { track } = useAppLoading()
track(pending)

const links = [
  { label: 'Home',        to: '/',        icon: 'i-lucide-house' },
  { label: 'Projects',    to: '/projects', icon: 'i-lucide-folder-kanban' },
  { label: 'Blog',        to: '/blog',     icon: 'i-lucide-file-text' },
  { label: 'Game Center', to: '/games',    icon: 'i-lucide-gamepad-2' },
]

watch(() => route.path, () => { menuOpen.value = false })

onMounted(() => {
  window.addEventListener('scroll', () => { scrolled.value = window.scrollY > 30 }, { passive: true })
})
</script>

<template>
  <header
    class="fixed top-0 inset-x-0 z-50 transition-all duration-500"
    :class="scrolled
      ? 'bg-void/70 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_1px_40px_rgba(0,0,0,0.4)]'
      : 'bg-transparent'"
  >
    <div class="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-blue/40 to-transparent" />

    <nav class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <!-- Logo -->
      <NuxtLink to="/" class="flex items-center gap-2 group">
        <span class="font-mono text-xs text-neon-blue/60 group-hover:text-neon-blue transition-colors">&lt;</span>
        <span class="font-display font-bold text-base text-white group-hover:text-neon-blue transition-colors tracking-wide">{{ config?.name }}</span>
        <span class="font-mono text-xs text-neon-purple/60 group-hover:text-neon-purple transition-colors">/&gt;</span>
      </NuxtLink>

      <!-- Desktop links -->
      <ul class="hidden md:flex items-center gap-1">
        <li v-for="link in links" :key="link.to">
          <NuxtLink
            :to="link.to"
            class="relative flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs tracking-widest uppercase transition-all duration-300"
            :class="route.path === link.to
              ? 'text-neon-blue bg-neon-blue/10 border border-neon-blue/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'"
          >
            <Icon :name="link.icon" class="w-3.5 h-3.5" />
            {{ link.label }}
            <span
              v-if="route.path === link.to"
              class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-neon-blue animate-glow-pulse-blue"
            />
          </NuxtLink>
        </li>
      </ul>

      <!-- Desktop status -->
      <div class="hidden md:flex items-center gap-2 font-mono text-xs text-slate-500">
        <span class="w-1.5 h-1.5 rounded-full bg-neon-emerald animate-pulse" />
        <span class="text-neon-emerald/70">ONLINE</span>
      </div>

      <!-- Mobile: burger button -->
      <button
        class="md:hidden flex flex-col items-center justify-center gap-1.5 w-9 h-9 rounded-lg text-slate-400 hover:text-white transition-colors"
        :aria-expanded="menuOpen"
        aria-label="Toggle menu"
        @click="menuOpen = !menuOpen"
      >
        <span
          class="block w-5 h-px bg-current rounded transition-all duration-300"
          :class="menuOpen ? 'rotate-45 translate-y-[7px]' : ''"
        />
        <span
          class="block w-5 h-px bg-current rounded transition-all duration-300"
          :class="menuOpen ? 'opacity-0 scale-x-0' : ''"
        />
        <span
          class="block w-5 h-px bg-current rounded transition-all duration-300"
          :class="menuOpen ? '-rotate-45 -translate-y-[7px]' : ''"
        />
      </button>
    </nav>

    <!-- Mobile dropdown menu -->
    <Transition name="slide-down">
      <div
        v-if="menuOpen"
        class="md:hidden border-t border-white/[0.06] bg-void/90 backdrop-blur-xl"
      >
        <ul class="flex flex-col py-3 px-4 gap-1">
          <li v-for="link in links" :key="link.to">
            <NuxtLink
              :to="link.to"
              class="flex items-center gap-3 px-4 py-3 rounded-xl font-mono text-sm tracking-widest uppercase transition-all duration-200"
              :class="route.path === link.to
                ? 'text-neon-blue bg-neon-blue/10 border border-neon-blue/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'"
            >
              <Icon :name="link.icon" class="w-4 h-4 shrink-0" />
              {{ link.label }}
            </NuxtLink>
          </li>
        </ul>
        <div class="flex items-center gap-2 px-8 pb-4 font-mono text-[10px] text-neon-emerald/50">
          <span class="w-1.5 h-1.5 rounded-full bg-neon-emerald animate-pulse" />
          ONLINE
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
