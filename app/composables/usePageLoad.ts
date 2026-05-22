type QFn<T> = () => Promise<T | null>
type QMap = Record<string, QFn<any>>
type Resolve<T extends QMap> = {
  [K in keyof T]: T[K] extends QFn<infer R> ? R | null : never
}

export function usePageLoad<T extends QMap>(key: string, queries: T) {
  const keys = Object.keys(queries) as Array<keyof T & string>
  const nuxtApp = useNuxtApp()

  const { data: raw, pending } = useAsyncData(
    key,
    () => Promise.all(keys.map(k => queries[k]!().catch(() => null))),
    {
      default: (): null[] => keys.map(() => null),
      // Reuse pre-rendered payload on SPA navigation so queryCollection never runs client-side
      getCachedData: (k) => nuxtApp.payload.data[k] ?? nuxtApp.static.data[k],
    },
  )

  const data = computed<Resolve<T>>(() =>
    Object.fromEntries(
      keys.map((k, i) => [k, raw.value?.[i] ?? null])
    ) as Resolve<T>
  )

  return { data, pending }
}
