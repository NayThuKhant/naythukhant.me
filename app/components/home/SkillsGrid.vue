<script setup lang="ts">
import { skills, skillCategories } from '@@/data/skills'

const { scrollFadeUp, staggered } = useAnimations()
const activeCategory = ref<string | null>(null)

const filtered = computed(() =>
  activeCategory.value ? skills.filter(s => s.category === activeCategory.value) : skills,
)

// Pre-compute stagger variants for all skills so template has no function calls
const skillMotion = computed(() => skills.map((_, i) => staggered(i, 40)))

const categoryColor: Record<string, string> = {
  language: 'neon-blue',
  frontend: 'neon-purple',
  backend: 'neon-emerald',
  devops: 'neon-pink',
  tools: 'neon-blue',
}

const barColor: Record<string, string> = {
  language: 'bg-neon-blue',
  frontend: 'bg-neon-purple',
  backend: 'bg-neon-emerald',
  devops: 'bg-neon-pink',
  tools: 'bg-neon-blue',
}
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

      <!-- Category filter -->
      <div
        v-motion
        :initial="{ opacity: 0 }"
        :visible-once="{ opacity: 1, transition: { duration: 600, delay: 100 } }"
        class="flex flex-wrap justify-center gap-2 mb-12"
      >
        <button
          class="px-4 py-1.5 rounded-lg font-mono text-xs tracking-widest uppercase border transition-all duration-300"
          :class="activeCategory === null
            ? 'bg-neon-blue/15 border-neon-blue/40 text-neon-blue shadow-neon-sm-blue'
            : 'bg-transparent border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'"
          @click="activeCategory = null"
        >ALL</button>
        <button
          v-for="cat in skillCategories"
          :key="cat.key"
          class="px-4 py-1.5 rounded-lg font-mono text-xs tracking-widest uppercase border transition-all duration-300"
          :class="activeCategory === cat.key
            ? 'bg-neon-purple/15 border-neon-purple/40 text-neon-purple shadow-neon-sm-purple'
            : 'bg-transparent border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'"
          @click="activeCategory = cat.key"
        >{{ cat.label }}</button>
      </div>

      <!-- Skills grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div
          v-for="(skill, index) in filtered"
          :key="skill.name"
          v-motion
          :initial="skillMotion[index]!.initial"
          :visible-once="skillMotion[index]!.visibleOnce"
          class="glass-card p-4 flex flex-col items-center gap-3 cursor-default group"
        >
          <!-- Name -->
          <span class="font-mono text-xs font-medium text-slate-300 group-hover:text-white transition-colors text-center leading-tight">
            {{ skill.name }}
          </span>

          <!-- Proficiency bar -->
          <div class="w-full">
            <div class="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-700"
                :class="barColor[skill.category] ?? 'bg-neon-blue'"
                :style="{ width: `${(skill.level / 5) * 100}%`, opacity: '0.7' }"
              />
            </div>
          </div>

          <!-- Level dots -->
          <div class="flex gap-1">
            <span
              v-for="i in 5"
              :key="i"
              class="w-1.5 h-1.5 rounded-full transition-colors duration-300"
              :class="i <= skill.level
                ? (barColor[skill.category] ?? 'bg-neon-blue') + ' opacity-80'
                : 'bg-white/10'"
            />
          </div>
        </div>
      </div>

    </div>
  </section>
</template>
