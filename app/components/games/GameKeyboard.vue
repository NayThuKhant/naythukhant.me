<script setup lang="ts">
import { ControlLayout } from '~/types'

const props = defineProps<{ layout: ControlLayout }>()

const pressed = ref<Set<string>>(new Set())

function dispatch(key: string, code: string, type: 'keydown' | 'keyup') {
  window.dispatchEvent(new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true }))
}

function press(key: string, code: string) {
  if (pressed.value.has(code)) return
  pressed.value = new Set([...pressed.value, code])
  dispatch(key, code, 'keydown')
}

function release(key: string, code: string) {
  if (!pressed.value.has(code)) return
  const s = new Set(pressed.value)
  s.delete(code)
  pressed.value = s
  dispatch(key, code, 'keyup')
}

function btn(key: string, code: string) {
  return {
    onMousedown:  (e: MouseEvent) => { e.preventDefault(); press(key, code) },
    onMouseup:    ()               => release(key, code),
    onMouseleave: ()               => release(key, code),
    onTouchstart: (e: TouchEvent)  => { e.preventDefault(); press(key, code) },
    onTouchend:   (e: TouchEvent)  => { e.preventDefault(); release(key, code) },
    onTouchcancel:()               => release(key, code),
  }
}

const isPressed = (code: string) => pressed.value.has(code)

// Mirror real keyboard presses onto the visual state
function onRealDown(e: KeyboardEvent) { pressed.value = new Set([...pressed.value, e.code]) }
function onRealUp(e: KeyboardEvent)   { const s = new Set(pressed.value); s.delete(e.code); pressed.value = s }

onMounted(() => {
  window.addEventListener('keydown', onRealDown)
  window.addEventListener('keyup',   onRealUp)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onRealDown)
  window.removeEventListener('keyup',   onRealUp)
})
</script>

<template>
  <div v-if="layout !== ControlLayout.None" class="flex justify-center items-center select-none py-4">

    <!-- D-pad: Snake, 2048 -->
    <div v-if="layout === ControlLayout.Dpad" class="grid grid-cols-3 gap-2" style="width: 192px">
      <div />
      <button v-bind="btn('ArrowUp', 'ArrowUp')"       :class="['gk-btn h-14 flex-col gap-0.5', isPressed('ArrowUp')    && 'gk-active']">
        <span class="text-base leading-none">↑</span>
        <span class="gk-key">↑ key</span>
      </button>
      <div />
      <button v-bind="btn('ArrowLeft', 'ArrowLeft')"   :class="['gk-btn h-14 flex-col gap-0.5', isPressed('ArrowLeft')  && 'gk-active']">
        <span class="text-base leading-none">←</span>
        <span class="gk-key">← key</span>
      </button>
      <div class="h-14 rounded-xl bg-white/[0.02] border border-white/[0.06]" />
      <button v-bind="btn('ArrowRight', 'ArrowRight')" :class="['gk-btn h-14 flex-col gap-0.5', isPressed('ArrowRight') && 'gk-active']">
        <span class="text-base leading-none">→</span>
        <span class="gk-key">→ key</span>
      </button>
      <div />
      <button v-bind="btn('ArrowDown', 'ArrowDown')"   :class="['gk-btn h-14 flex-col gap-0.5', isPressed('ArrowDown')  && 'gk-active']">
        <span class="text-base leading-none">↓</span>
        <span class="gk-key">↓ key</span>
      </button>
      <div />
    </div>

    <!-- Left + action + Right: Space Invaders, Breakout, Asteroid Dodge -->
    <div v-else-if="layout === ControlLayout.LrFire || layout === ControlLayout.Lr" class="flex items-center gap-3">
      <button v-bind="btn('ArrowLeft', 'ArrowLeft')"   :class="['gk-btn w-16 h-16 flex-col gap-0.5', isPressed('ArrowLeft')  && 'gk-active']">
        <span class="text-xl leading-none">←</span>
        <span class="gk-key">← key</span>
      </button>
      <button v-bind="btn(' ', 'Space')"               :class="['gk-btn w-20 h-16 flex-col gap-0.5', isPressed('Space') && 'gk-active']">
        <span class="text-[11px] tracking-widest leading-none">{{ layout === ControlLayout.LrFire ? 'FIRE' : 'START' }}</span>
        <span class="gk-key">SPACE</span>
      </button>
      <button v-bind="btn('ArrowRight', 'ArrowRight')" :class="['gk-btn w-16 h-16 flex-col gap-0.5', isPressed('ArrowRight') && 'gk-active']">
        <span class="text-xl leading-none">→</span>
        <span class="gk-key">→ key</span>
      </button>
    </div>

    <!-- Single tap: Flappy Rocket -->
    <button
      v-else-if="layout === ControlLayout.Tap"
      v-bind="btn(' ', 'Space')"
      :class="['gk-btn w-64 h-16 flex-col gap-1', isPressed('Space') && 'gk-active']"
    >
      <span class="text-xs tracking-widest leading-none">TAP TO BOOST</span>
      <span class="gk-key">SPACE</span>
    </button>

  </div>
</template>

<style scoped>
.gk-btn {
  @apply rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm
    flex items-center justify-center text-slate-400 font-mono
    transition-all duration-75 cursor-pointer touch-none;
}
.gk-active {
  @apply bg-neon-blue/20 border-neon-blue/50 text-neon-blue;
  box-shadow: 0 0 14px rgba(0, 212, 255, 0.35);
}
.gk-key {
  @apply text-[9px] tracking-widest text-slate-600 leading-none font-mono uppercase;
}
.gk-active .gk-key {
  @apply text-neon-blue/50;
}
</style>
