<script setup lang="ts">
const bootLines = [
  { text: 'PORTFOLIO OS v2.0.1 — NEURAL BOOT SEQUENCE', type: 'header' },
  { text: '>>> Establishing neural link...........', suffix: 'OK', type: 'sys' },
  { text: '>>> Loading star navigation charts....', suffix: 'OK', type: 'sys' },
  { text: '>>> Calibrating quantum warp drive....', suffix: 'OK', type: 'sys' },
  { text: '>>> Mounting portfolio modules.........', suffix: 'OK', type: 'sys' },
  { text: '>>> All systems nominal. Welcome, Engineer.', type: 'done' },
]

const completedLines = ref<typeof bootLines>([])
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
  for (const line of bootLines) {
    if (cancelled) return
    await typeText(line.text, line.type === 'header' ? 14 : 22)
    if (cancelled) return
    completedLines.value.push(line)
    currentTyping.value = ''
    await sleep(line.type === 'header' ? 200 : 80)
  }
  showCursor.value = false
  await sleep(600)
  // Hero starts immediately — both transitions run simultaneously for a cross-dissolve
  bootDone.value = true
})

const taglines = [
  'Building scalable distributed systems.',
  'Crafting beautiful, performant UIs.',
  'Shipping open-source tools.',
  'Exploring the edge of the stack.',
]
const taglineIndex = ref(0)
const taglineVisible = ref(false)

watch(bootDone, async (done) => {
  if (!done) return
  // tagline appears after hero has settled
  await sleep(1400)
  if (cancelled) return
  taglineVisible.value = true
  const interval = setInterval(() => {
    if (cancelled) { clearInterval(interval); return }
    taglineVisible.value = false
    setTimeout(() => {
      taglineIndex.value = (taglineIndex.value + 1) % taglines.length
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
                <span class="ml-3 font-mono text-xs text-slate-600 tracking-widest">NEURAL_BOOT — zsh</span>
              </div>

              <!-- Body -->
              <div class="p-6 font-mono text-sm min-h-[220px]">
                <div
                  v-for="(line, i) in completedLines"
                  :key="i"
                  class="mb-1 flex gap-2"
                >
                  <span :class="{
                    'text-neon-blue font-bold': line.type === 'header',
                    'text-slate-400': line.type === 'sys',
                    'neon-text-emerald': line.type === 'done',
                  }">{{ line.text }}</span>
                  <span v-if="line.suffix" class="text-neon-emerald ml-1">[ {{ line.suffix }} ]</span>
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
          <!-- Status badge — Y-only motion, parent handles opacity -->
          <div
            v-motion
            :initial="{ y: 20 }"
            :enter="{ y: 0, transition: { duration: 500 } }"
            class="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full glass-hud font-mono text-xs text-neon-emerald border-neon-emerald/20"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-neon-emerald animate-pulse" />
            AVAILABLE FOR WORK
          </div>

          <!-- Name -->
          <h1
            v-motion
            :initial="{ y: 35 }"
            :enter="{ y: 0, transition: { duration: 700, delay: 80, ease: 'easeOut' } }"
            class="font-display font-bold text-5xl sm:text-6xl md:text-7xl leading-tight mb-4"
          >
            <span class="block text-white mb-1">Hi, I'm</span>
            <span class="block gradient-text-cyber">Your Name</span>
          </h1>

          <!-- Subtitle -->
          <p
            v-motion
            :initial="{ y: 25 }"
            :enter="{ y: 0, transition: { duration: 600, delay: 160, ease: 'easeOut' } }"
            class="font-mono text-lg text-slate-400 mb-4 tracking-wide"
          >
            <span class="text-neon-blue/80">~/</span>Software Engineer
          </p>

          <!-- Cycling tagline — reserved height to prevent shifts -->
          <div class="h-7 mb-10">
            <Transition name="fade-swap">
              <p
                v-if="taglineVisible"
                :key="taglineIndex"
                class="font-mono text-sm text-slate-500"
              >
                {{ taglines[taglineIndex] }}
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

          <!-- Social links -->
          <div
            v-motion
            :initial="{ y: 16 }"
            :enter="{ y: 0, transition: { duration: 500, delay: 360, ease: 'easeOut' } }"
            class="flex items-center justify-center gap-6 mt-12"
          >
            <a
              v-for="social in [
                { label: 'GitHub', href: 'https://github.com', d: 'M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.23 1.84 1.23 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.05.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z' },
                { label: 'LinkedIn', href: 'https://linkedin.com', d: 'M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.37V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.35-1.85 3.58 0 4.24 2.36 4.24 5.43v6.31zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45C23.2 24 24 23.23 24 22.27V1.73C24 .77 23.2 0 22.22 0z' },
              ]"
              :key="social.label"
              :href="social.href"
              target="_blank"
              rel="noopener"
              :aria-label="social.label"
              class="p-2 rounded-lg text-slate-600 hover:text-white hover:bg-white/5 transition-all duration-300"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path :d="social.d" />
              </svg>
            </a>
          </div>
        </div>
      </Transition>

    </div>

    <!-- Scroll cue -->
    <div
      v-if="bootDone"
      class="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-700 animate-bounce"
    >
      <span class="font-mono text-xs tracking-widest">SCROLL</span>
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7" />
      </svg>
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
.fade-swap-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; position: absolute; }
.fade-swap-enter-from   { opacity: 0; transform: translateY(10px); }
.fade-swap-leave-to     { opacity: 0; transform: translateY(-10px); }
</style>
