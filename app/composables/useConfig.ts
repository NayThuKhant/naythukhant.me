// Thin wrapper kept for backwards-compat with existing call sites.
// Config is loaded once by the server plugin; this just exposes the store data.
export default function useConfig() {
  const store = useConfigStore()
  return { data: computed(() => store.config) }
}
