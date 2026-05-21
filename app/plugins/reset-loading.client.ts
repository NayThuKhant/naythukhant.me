export default defineNuxtPlugin(() => {
  useState('app-loading-count', () => 0).value = 0
})
