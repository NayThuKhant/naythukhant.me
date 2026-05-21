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

      <div class="flex items-center gap-4">
        <a
          href="https://github.com" target="_blank" rel="noopener"
          aria-label="GitHub"
          class="p-2 rounded-lg text-slate-600 hover:text-neon-purple hover:bg-neon-purple/10 border border-transparent hover:border-neon-purple/20 transition-all duration-300"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.23 1.84 1.23 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.05.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        </a>
        <a
          href="https://linkedin.com" target="_blank" rel="noopener"
          aria-label="LinkedIn"
          class="p-2 rounded-lg text-slate-600 hover:text-neon-blue hover:bg-neon-blue/10 border border-transparent hover:border-neon-blue/20 transition-all duration-300"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.37V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.35-1.85 3.58 0 4.24 2.36 4.24 5.43v6.31zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45C23.2 24 24 23.23 24 22.27V1.73C24 .77 23.2 0 22.22 0z"/>
          </svg>
        </a>
      </div>

      <p class="font-mono text-xs text-slate-700">
        Built with <span class="text-neon-emerald/60">Nuxt</span> + <span class="text-neon-purple/60">❤</span>
      </p>
    </div>
  </footer>
</template>
