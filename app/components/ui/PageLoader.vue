<template>
  <div class="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#030712]">

    <!-- Subtle starfield -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        v-for="i in 60"
        :key="i"
        class="absolute rounded-full bg-white"
        :style="{
          width: `${1 + (i % 3) * 0.5}px`,
          height: `${1 + (i % 3) * 0.5}px`,
          left: `${(i * 73) % 100}%`,
          top: `${(i * 137) % 100}%`,
          opacity: 0.04 + (i % 5) * 0.04,
        }"
      />
    </div>

    <!-- Spinner rings -->
    <div class="relative w-20 h-20 mb-8">
      <div class="absolute inset-0 rounded-full border-2 border-neon-blue/10 border-t-neon-blue animate-spin" style="animation-duration:0.9s" />
      <div class="absolute inset-2 rounded-full border border-neon-purple/10 border-b-neon-purple/50 animate-spin" style="animation-duration:1.5s;animation-direction:reverse" />
      <div class="absolute inset-4 rounded-full border border-neon-emerald/10 border-t-neon-emerald/40 animate-spin" style="animation-duration:2.1s" />
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="w-2 h-2 rounded-full bg-neon-blue/80 animate-pulse" style="box-shadow:0 0 12px rgba(0,212,255,0.8)" />
      </div>
    </div>

    <!-- Label -->
    <p class="font-mono text-[11px] tracking-[0.4em] text-slate-600 uppercase">Initialising</p>

  </div>
</template>
