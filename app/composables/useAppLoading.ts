export function useAppLoading() {
  const count = useState('app-loading-count', () => 0)
  const isLoading = computed(() => count.value > 0)

  function track(pending: Ref<boolean>) {
    watch(pending, (curr, prev) => {
      if (curr && !prev) count.value++
      else if (!curr && prev !== undefined) count.value = Math.max(0, count.value - 1)
    }, { immediate: true })

    onUnmounted(() => {
      if (pending.value) count.value = Math.max(0, count.value - 1)
    })
  }

  return { isLoading, track }
}
