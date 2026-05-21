export default function useConfig() {
  return useAsyncData('config', () => queryCollection('config').first())
}
