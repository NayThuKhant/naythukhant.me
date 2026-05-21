export default defineNuxtConfig({
  modules: ['@nuxt/content', '@nuxtjs/tailwindcss', '@vueuse/motion/nuxt'],
  components: [{ path: '~/components', pathPrefix: false }],
  devtools: { enabled: true },
  compatibilityDate: '2024-04-03',
  css: ['~/assets/css/main.css'],
  content: {
    highlight: {
      theme: 'github-dark',
      langs: ['js', 'ts', 'vue', 'bash', 'json', 'css', 'html', 'python', 'go', 'rust'],
    },
  },
  app: {
    head: {
      title: 'Portfolio',
      meta: [{ name: 'description', content: 'Software Engineer Portfolio' }],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap' },
      ],
    },
  },
})
