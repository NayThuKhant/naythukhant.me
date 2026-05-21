<template>
  <div class="flex flex-col items-center justify-center gap-4 py-24">
    <div class="relative w-12 h-12">
      <div class="absolute inset-0 rounded-full border-2 border-white/5 border-t-neon-blue animate-spin" style="animation-duration:0.85s" />
      <div class="absolute inset-0 rounded-full border border-neon-blue/10 border-b-neon-purple/40 animate-spin" style="animation-duration:1.4s;animation-direction:reverse" />
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="w-1.5 h-1.5 rounded-full bg-neon-blue/70 animate-pulse" />
      </div>
    </div>
    <p class="font-mono text-[10px] tracking-[0.3em] text-slate-700 uppercase animate-pulse">Loading</p>
  </div>
</template>
