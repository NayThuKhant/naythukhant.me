<template>
  <footer class="relative z-10 mt-32 border-t border-white/[0.06]">
    <div class="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neon-purple/30 to-transparent" />
    <div class="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">

      <div class="flex items-center gap-3 font-mono text-xs text-slate-600">
        <span class="text-neon-blue/40">◈</span>
        <span>PORTFOLIO OS v2.0.1</span>
        <span class="text-neon-blue/40">◈</span>
        <span class="text-slate-700">{{ new Date().getFullYear() }}</span>
      </div>

      <ContactLinks size="sm" />

      <p class="font-mono text-xs text-slate-700">
        Built with <span class="text-neon-emerald/60">Nuxt</span> + <span class="text-neon-purple/60">❤</span>
      </p>

    </div>
  </footer>
</template>
