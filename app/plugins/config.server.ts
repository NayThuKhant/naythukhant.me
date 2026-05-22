// Loads site config once on the server; Pinia state is serialized into the
// nuxt payload and rehydrated on the client — no second fetch needed.
export default defineNuxtPlugin(async () => {
  const store = useConfigStore()
  await store.load()
})
