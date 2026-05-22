export default function useConfig() {
    return useAsyncData(() => queryCollection('config').first())
}
