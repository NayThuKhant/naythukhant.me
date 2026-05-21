export default async function useConfig() {
  return useAsyncData('config', () => queryCollection('config').first());
}
