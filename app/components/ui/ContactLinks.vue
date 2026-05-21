<script setup lang="ts">
import { ComponentSize } from '~/types'

interface Props {
  size?: ComponentSize
}
withDefaults(defineProps<Props>(), {
  size: ComponentSize.Md,
})

const { data: config } = await useAsyncData('config', () => queryCollection('config').first())

const contacts = computed(() => config.value?.contacts ?? [])
</script>

<template>
  <div class="flex items-center gap-3 flex-wrap">
    <a
      v-for="contact in contacts"
      :key="contact.label"
      :href="contact.url"
      :target="contact.url.startsWith('mailto:') ? undefined : '_blank'"
      :rel="contact.url.startsWith('mailto:') ? undefined : 'noopener noreferrer'"
      :aria-label="contact.label"
      class="rounded-lg text-slate-400 border border-slate-800 bg-slate-900/50 hover:text-white hover:border-slate-700 hover:bg-slate-800 transition-all duration-300 flex items-center justify-center"
      :class="size === ComponentSize.Sm ? 'p-1.5' : 'p-2'"
    >
      <Icon
        :name="contact.icon"
        :class="size === ComponentSize.Sm ? 'w-4 h-4' : 'w-5 h-5'"
      />
    </a>
  </div>
</template>