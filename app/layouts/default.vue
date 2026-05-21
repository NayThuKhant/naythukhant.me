<template>
  <div class="min-h-screen bg-void text-slate-300 font-sans relative overflow-x-hidden">
    <StarBackground />
    <!-- Ambient nebula blobs (CSS, no canvas cost) -->
    <div class="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div class="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-neon-purple/5 blur-[120px]" />
      <div class="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-neon-blue/5 blur-[120px]" />
      <div class="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-neon-emerald/4 blur-[100px]" />
    </div>
    <AppNavbar />
    <main class="relative z-10">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
