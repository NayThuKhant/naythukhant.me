<script setup lang="ts">
const { scrollFadeUp, staggered } = useAnimations()

const [{ data: skills }, { data: categories }] = await Promise.all([
  useAsyncData('skills', () => queryCollection('skills').order('order', 'ASC').all()),
  useAsyncData('skill-categories', () => queryCollection('skillCategories').order('order', 'ASC').all()),
])

const activeCategory = ref<string | null>(null)

const filtered = computed(() =>
  activeCategory.value
    ? (skills.value ?? []).filter(s => s.category === activeCategory.value)
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
          v-for="cat in categories"
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
          <Icon
            :name="skill.icon"
            class="w-8 h-8 text-slate-400 group-hover:text-white transition-colors duration-300"
          />
          <span class="font-mono text-xs font-medium text-slate-300 group-hover:text-white transition-colors text-center leading-tight">
            {{ skill.name }}
          </span>
        </div>
      </div>

    </div>
  </section>
</template>
