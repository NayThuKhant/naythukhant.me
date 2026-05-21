export default defineNuxtConfig({
  modules: ['@nuxt/content', 'nuxt-studio', '@nuxtjs/tailwindcss', '@vueuse/motion/nuxt'],
  components: [{ path: '~/components', pathPrefix: false }],
  devtools: { enabled: true },
  compatibilityDate: '2024-04-03',
  css: ['~/assets/css/main.css'],
  content: {
    build: {
      markdown: {
        highlight: {
          theme: 'github-dark',
          langs: ['js', 'ts', 'vue', 'bash', 'json', 'css', 'html', 'python', 'go', 'rust'],
        },
      },
    },
  },
  studio: {
    route: '/_studio',
    repository: {
      provider: 'github',
      owner: process.env.STUDIO_REPO_OWNER,
      repo: process.env.STUDIO_REPO_NAME,
      branch: process.env.STUDIO_REPO_BRANCH,
    },
  },
  app: {
    head: {
      script: [
        { src: '/_vercel/speed-insights/script.js', defer: true },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap' },
      ],
    },
  },
})
