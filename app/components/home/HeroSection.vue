<script setup lang="ts">
import type { BootLine } from '~/types'
import { BootLineType } from '~/types'

import useConfig from '~/composables/useConfig'
const { data: config } = await useConfig()

const bootLines = computed(() => config.value?.bootLines ?? [])
const taglines = computed(() => config.value?.taglines ?? [])

const completedLines = ref<BootLine[]>([])
const currentTyping = ref('')
const showCursor = ref(true)
const bootDone = ref(false)
let cancelled = false

onUnmounted(() => { cancelled = true })

const typeText = (text: string, speed = 22): Promise<void> =>
  new Promise(resolve => {
    let i = 0
    const tick = setInterval(() => {
      if (cancelled) { clearInterval(tick); resolve(); return }
      currentTyping.value = text.slice(0, ++i)
      if (i >= text.length) { clearInterval(tick); resolve() }
    }, speed)
  })

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

onMounted(async () => {
  await sleep(300)
  for (const line of bootLines.value) {
    if (cancelled) return
    await typeText(line.text, line.type === BootLineType.Header ? 14 : 22)
    if (cancelled) return
    completedLines.value.push(line)
    currentTyping.value = ''
    await sleep(line.type === BootLineType.Header ? 200 : 80)
  }
  showCursor.value = false
  await sleep(600)
  bootDone.value = true
})

const taglineIndex = ref(0)
const taglineVisible = ref(false)

watch(bootDone, async (done) => {
  if (!done) return
  await sleep(1400)
  if (cancelled) return
  taglineVisible.value = true
  const interval = setInterval(() => {
    if (cancelled) { clearInterval(interval); return }
    taglineVisible.value = false
    setTimeout(() => {
      taglineIndex.value = (taglineIndex.value + 1) % (taglines.value.length || 1)
      taglineVisible.value = true
    }, 380)
  }, 3200)
  onUnmounted(() => clearInterval(interval))
})
</script>

<template>
  <section class="relative z-10 min-h-screen px-6 pt-16">
    <!--
      Fixed-height stage: both terminal and hero are absolute-positioned inside,
      so neither affects document flow and there is zero layout shift.
    -->
    <div class="relative w-full min-h-screen flex items-center justify-center">

      <!-- ── Terminal boot window ── -->
      <Transition name="terminal-out">
        <div
          v-if="!bootDone"
          class="absolute inset-0 flex items-center justify-center w-full px-6"
        >
          <div class="w-full max-w-xl scanlines">
            <div class="glass-hud overflow-hidden">
              <!-- Title bar -->
              <div class="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
                <span class="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <span class="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <span class="w-2.5 h-2.5 rounded-full bg-neon-emerald/70" />
                <span class="ml-3 font-mono text-xs text-slate-600 tracking-widest">Terminal</span>
              </div>

              <!-- Body -->
              <div class="p-6 font-mono text-sm min-h-[220px]">
                <div
                  v-for="(line, i) in completedLines"
                  :key="i"
                  class="mb-1 flex gap-2"
                >
                  <span :class="{
                    'text-neon-blue font-bold': line.type === BootLineType.Header,
                    'text-slate-400': line.type === BootLineType.Sys,
                    'neon-text-emerald': line.type === BootLineType.Done,
                  }">{{ line.text }}</span>
                  <span v-if="line.suffix" class="text-neon-emerald ml-1">[{{ line.suffix }}]</span>
                </div>

                <div v-if="currentTyping" class="flex items-center text-slate-300">
                  <span>{{ currentTyping }}</span>
                  <span v-if="showCursor" class="ml-0.5 inline-block w-2 h-4 bg-neon-blue animate-terminal-blink" />
                </div>
                <span v-else-if="showCursor && completedLines.length === 0" class="inline-block w-2 h-4 bg-neon-blue animate-terminal-blink" />
              </div>
            </div>
            <p class="mt-3 text-center font-mono text-xs text-slate-700">initializing...</p>
          </div>
        </div>
      </Transition>

      <!-- ── Hero content ── -->
      <Transition name="hero-in">
        <div
          v-if="bootDone"
          class="w-full max-w-4xl mx-auto text-center"
        >
          <!-- Name -->
          <h1
            v-motion
            :initial="{ y: 35 }"
            :enter="{ y: 0, transition: { duration: 700, delay: 80, ease: 'easeOut' } }"
            class="font-display font-bold text-5xl sm:text-6xl md:text-7xl leading-tight mb-4"
          >
            <span class="block text-white mb-1">{{ config?.greeting }}</span>
            <span class="block gradient-text-cyber">{{ config?.name }}</span>
          </h1>

          <!-- Subtitle -->
          <p
            v-motion
            :initial="{ y: 25 }"
            :enter="{ y: 0, transition: { duration: 600, delay: 160, ease: 'easeOut' } }"
            class="font-mono text-lg text-slate-400 mb-4 tracking-wide"
          >
            <span class="text-neon-blue/80">~/</span>{{ config?.description }}
          </p>

          <!-- Cycling tagline — reserved height to prevent shifts -->
          <div class="relative h-7 mb-10">
            <Transition name="fade-swap">
              <p
                v-if="taglineVisible"
                :key="taglineIndex"
                class="w-full text-center font-mono text-sm text-slate-500"
              >
                {{ taglines[taglineIndex]?.text }}
              </p>
            </Transition>
          </div>

          <!-- CTA buttons -->
          <div
            v-motion
            :initial="{ y: 20 }"
            :enter="{ y: 0, transition: { duration: 500, delay: 260, ease: 'easeOut' } }"
            class="flex flex-wrap gap-4 justify-center"
          >
            <NuxtLink to="/projects" class="btn-neon-blue">
              Explore Projects <span class="ml-1 font-mono">→</span>
            </NuxtLink>
            <NuxtLink to="/blog" class="btn-neon-purple">
              Read Blog <span class="ml-1 font-mono">→</span>
            </NuxtLink>
          </div>

          <!-- Contact links -->
          <div
            v-motion
            :initial="{ y: 16 }"
            :enter="{ y: 0, transition: { duration: 500, delay: 360, ease: 'easeOut' } }"
            class="flex justify-center mt-12"
          >
            <ContactLinks />
          </div>
        </div>
      </Transition>

    </div>

    <!-- Scroll cue — centering and bounce must be on separate elements because
         animate-bounce keyframes use transform: translateY() directly, which
         overwrites -translate-x-1/2 and shifts the label to the right. -->
    <div v-if="bootDone" class="absolute bottom-10 left-1/2 -translate-x-1/2">
      <div class="flex flex-col items-center gap-2 text-slate-700 animate-bounce">
        <span class="font-mono text-xs tracking-widest pl-[0.1em]">SCROLL</span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  </section>
</template>

<style scoped>
/*
  Terminal dissolves out: shrinks, blurs, drifts up.
  position:absolute+inset-0 keeps it in the same space as the hero
  so it doesn't push content around while leaving.
*/
.terminal-out-leave-active {
  transition: opacity 0.7s ease, transform 0.7s cubic-bezier(0.4, 0, 0.2, 1), filter 0.7s ease;
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 1.5rem;
}
.terminal-out-leave-to {
  opacity: 0;
  transform: scale(0.93) translateY(-28px);
  filter: blur(6px);
}

/*
  Hero rises in as a single block — opacity goes 0→1 here.
  Children only animate Y (no opacity), so there's no compounding.
*/
.hero-in-enter-active {
  transition: opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.85s cubic-bezier(0.16, 1, 0.3, 1);
}
.hero-in-enter-from {
  opacity: 0;
  transform: translateY(48px);
}

/* Cycling tagline cross-fade */
.fade-swap-enter-active { transition: opacity 0.35s ease, transform 0.35s ease; }
.fade-swap-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; position: absolute; inset-inline: 0; text-align: center; }
.fade-swap-enter-from   { opacity: 0; transform: translateY(10px); }
.fade-swap-leave-to     { opacity: 0; transform: translateY(-10px); }
</style>
