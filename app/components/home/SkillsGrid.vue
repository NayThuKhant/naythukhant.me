<script setup lang="ts">
import { DataKey } from '~/types'
const {scrollFadeUp, staggered} = useAnimations()

const {data: skills} = await useAsyncData(DataKey.Skills, () => queryCollection('skills').all())

const activeTag = ref<string | null>(null)

const allTags = computed(() => {
  const seen = new Set<string>()
  for (const s of skills.value ?? []) {
    for (const t of s.tags ?? []) seen.add(t)
  }
  return [...seen].sort()
})

const filtered = computed(() =>
    activeTag.value
        ? (skills.value ?? []).filter(s => (s.tags ?? []).includes(activeTag.value as string))
        : (skills.value ?? []),
)

const skillMotion = computed(() => filtered.value.map((_, i) => staggered(i, 40)))
</script>

<template>
  <section class="relative z-10 py-28 px-6">
    <div class="max-w-6xl mx-auto">

      <!-- Section header -->
      <div
          v-motion
          :initial="scrollFadeUp.initial"
          :visible-once="scrollFadeUp.visibleOnce"
          class="text-center mb-16"
      >
        <p class="hud-label mb-3">SYSTEM MODULES</p>
        <h2 class="font-display font-bold text-4xl md:text-5xl text-white">
          Skills &amp; Tech Stack
        </h2>
        <p class="mt-4 text-slate-500 font-mono text-sm">All systems operational</p>
      </div>

      <!-- Tag filter -->
      <div
          v-motion
          :initial="{ opacity: 0 }"
          :visible-once="{ opacity: 1, transition: { duration: 600, delay: 100 } }"
          class="flex flex-wrap justify-center gap-2 mb-12"
      >
        <button
            class="px-4 py-1.5 rounded-lg font-mono text-xs tracking-widest uppercase border transition-all duration-300"
            :class="activeTag === null
            ? 'bg-neon-blue/15 border-neon-blue/40 text-neon-blue shadow-neon-sm-blue'
            : 'bg-transparent border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'"
            @click="activeTag = null"
        >ALL
        </button>
        <button
            v-for="tag in allTags"
            :key="tag"
            class="px-4 py-1.5 rounded-lg font-mono text-xs tracking-widest uppercase border transition-all duration-300"
            :class="activeTag === tag
            ? 'bg-neon-purple/15 border-neon-purple/40 text-neon-purple shadow-neon-sm-purple'
            : 'bg-transparent border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'"
            @click="activeTag = tag"
        >#{{ tag }}
        </button>
      </div>

      <!-- Skills grid -->
      <div class="flex flex-wrap justify-center gap-2">
        <div
            v-for="(skill, index) in filtered"
            :key="skill.name"
            v-motion
            :initial="skillMotion[index]!.initial"
            :visible-once="skillMotion[index]!.visibleOnce"
            class="glass-card p-2.5 flex flex-col items-center gap-1.5 cursor-default group w-[calc(25%-6px)] sm:w-[calc(12.5%-7px)] lg:w-[calc(8.333%-7px)]"
        >
          <Icon
              :name="skill.icon"
              class="w-4 h-4 text-slate-400 group-hover:text-white transition-colors duration-300"
          />
          <span
              class="font-mono text-[10px] font-medium text-slate-400 group-hover:text-white transition-colors text-center leading-tight">
            {{ skill.name }}
          </span>
        </div>
      </div>

    </div>
  </section>
</template>
