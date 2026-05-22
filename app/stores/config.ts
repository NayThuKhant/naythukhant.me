import { defineStore } from 'pinia'
import { DataKey } from '~/types'
import type { BootLine } from '~/types'

export interface SiteConfig {
  greeting: string
  name: string
  description: string
  taglines: { text: string }[]
  bootLines: BootLine[]
  contacts: { label: string; url: string; icon: string }[]
}

export const useConfigStore = defineStore(DataKey.Config, () => {
  const config = ref<SiteConfig | null>(null)

  async function load() {
    if (config.value) return
    const data = await queryCollection('config').first()
    config.value = data as SiteConfig | null
  }

  return { config, load }
})
