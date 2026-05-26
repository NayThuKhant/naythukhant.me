<script setup lang="ts">
import { ControlLayout } from '~/types'

const canvasEl = ref<HTMLCanvasElement | null>(null)
const score    = ref(0)
const livesRef = ref(3)
const levelRef = ref(1)
const state    = ref<'idle' | 'playing' | 'won' | 'over'>('idle')

const W = 480, H = 360
const WORLD_W = 2400
const GRAVITY = 0.5
const JUMP_VEL = -11
const MOVE_SPEED = 3.5
const PLAYER_W = 24, PLAYER_H = 32
const COIN_R = 8
const τ = Math.PI * 2

const { jump: sfxJump, score: sfxScore, die: sfxDie, levelUp: sfxLevelUp, win: sfxWin, lose: sfxLose } = useGameSounds()

let raf = 0
let titlePulse = 0

interface Platform { x: number; y: number; w: number; h: number }
interface Coin     { x: number; y: number; collected: boolean }
interface Enemy    { x: number; y: number; w: number; h: number; vx: number; minX: number; maxX: number; dead: boolean }

let player = { x: 60, y: 200, vx: 0, vy: 0, onGround: false, dead: false }
let platforms: Platform[] = []
let coins: Coin[] = []
let enemies: Enemy[] = []
let flagX = 0, flagY = 0
let cameraX = 0
let lives = 3
let level = 1
let deathTimer = 0
let keys = { left: false, right: false, up: false }

// Seeded pseudo-random for level generation
function seededRand(seed: number) {
  let s = seed
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
}

function generateLevel(lvl: number) {
  const rand = seededRand(lvl * 31337)
  const plats: Platform[] = []
  const coinList: Coin[] = []
  const enemyList: Enemy[] = []

  // Ground
  plats.push({ x: 0, y: 300, w: WORLD_W, h: 60 })

  // Floating platforms
  let px = 200
  while (px < WORLD_W - 300) {
    const pw = 80 + Math.floor(rand() * 100)
    const ph = 14
    const py = 200 + Math.floor(rand() * 80)
    plats.push({ x: px, y: py, w: pw, h: ph })

    // Coins on top
    const coinCount = 1 + Math.floor(rand() * 3)
    for (let i = 0; i < coinCount; i++) {
      coinList.push({ x: px + (i + 1) * (pw / (coinCount + 1)), y: py - COIN_R - 4, collected: false })
    }

    // Enemy on some platforms
    if (rand() < 0.3 + lvl * 0.05 && pw > 60) {
      const ew = 24, eh = 24
      enemyList.push({
        x: px + 10, y: py - eh,
        w: ew, h: eh,
        vx: 1 + rand() * 0.5,
        minX: px, maxX: px + pw - ew,
        dead: false,
      })
    }

    const gap = 80 + Math.floor(rand() * 100)
    px += pw + gap
  }

  // Some coins on ground
  for (let i = 0; i < 5; i++) {
    const cx = 100 + i * 350 + Math.floor(rand() * 100)
    coinList.push({ x: cx, y: 300 - COIN_R - 4, collected: false })
  }

  // Flag at end
  const lastPlat = plats[plats.length - 1]!
  flagX = Math.min(WORLD_W - 60, 2280)
  flagY = lastPlat.y - 40

  platforms = plats
  coins = coinList
  enemies = enemyList
}

function spawnPlayer() {
  player = { x: 60, y: 240, vx: 0, vy: 0, onGround: false, dead: false }
  cameraX = 0
}

function reset() {
  lives = 3; level = 1; score.value = 0; deathTimer = 0
  livesRef.value = lives; levelRef.value = level
  generateLevel(level)
  spawnPlayer()
}

function startGame() { reset(); state.value = 'playing' }
function restart()   { reset(); state.value = 'playing' }

function startLevel(lvl: number) {
  level = lvl; levelRef.value = lvl
  generateLevel(lvl)
  spawnPlayer()
  deathTimer = 0
}

function onKey(e: KeyboardEvent) {
  const down = e.type === 'keydown'
  if (e.key === 'ArrowLeft')  { e.preventDefault(); keys.left  = down }
  if (e.key === 'ArrowRight') { e.preventDefault(); keys.right = down }
  if ((e.key === 'ArrowUp' || e.code === 'Space') && down) {
    e.preventDefault(); keys.up = true
  }
  if ((e.key === 'ArrowUp' || e.code === 'Space') && !down) {
    keys.up = false
  }
  if (e.code === 'Space' && down && state.value === 'idle') { e.preventDefault(); startGame() }
}

function rectOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

let jumpPressed = false

function draw(ts: number) {
  raf = requestAnimationFrame(draw)
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) return
  titlePulse = ts

  if (state.value === 'playing') {
    // Death respawn
    if (player.dead) {
      deathTimer++
      if (deathTimer > 60) {
        if (lives <= 0) { state.value = 'over'; sfxLose(); return }
        spawnPlayer(); deathTimer = 0
      }
    } else {
      // Input
      if (keys.left)  player.vx = -MOVE_SPEED
      else if (keys.right) player.vx = MOVE_SPEED
      else player.vx *= 0.8

      if (keys.up && !jumpPressed && player.onGround) {
        player.vy = JUMP_VEL; player.onGround = false; sfxJump()
      }
      jumpPressed = keys.up

      // Gravity
      player.vy += GRAVITY
      player.x += player.vx
      player.y += player.vy
      player.onGround = false

      // Platform collisions
      for (const p of platforms) {
        if (rectOverlap(player.x, player.y, PLAYER_W, PLAYER_H, p.x, p.y, p.w, p.h)) {
          // Resolve: push out from least penetrating side
          const overlapLeft  = (player.x + PLAYER_W) - p.x
          const overlapRight = (p.x + p.w) - player.x
          const overlapTop   = (player.y + PLAYER_H) - p.y
          const overlapBot   = (p.y + p.h) - player.y
          const minH = Math.min(overlapLeft, overlapRight)
          const minV = Math.min(overlapTop, overlapBot)
          if (minV < minH) {
            if (overlapTop < overlapBot && player.vy >= 0) {
              player.y = p.y - PLAYER_H; player.vy = 0; player.onGround = true
            } else if (overlapBot < overlapTop && player.vy < 0) {
              player.y = p.y + p.h; player.vy = 0
            }
          } else {
            if (overlapLeft < overlapRight) player.x = p.x - PLAYER_W
            else player.x = p.x + p.w
            player.vx = 0
          }
        }
      }

      // Clamp to world
      if (player.x < 0) { player.x = 0; player.vx = 0 }
      if (player.x + PLAYER_W > WORLD_W) { player.x = WORLD_W - PLAYER_W }

      // Fall off bottom
      if (player.y > H + 100) {
        player.dead = true; lives--; livesRef.value = lives
        sfxDie()
        if (lives <= 0) { state.value = 'over'; sfxLose(); return }
      }

      // Coins
      for (const coin of coins) {
        if (coin.collected) continue
        if (Math.hypot(player.x + PLAYER_W / 2 - coin.x, player.y + PLAYER_H / 2 - coin.y) < COIN_R + PLAYER_W / 2) {
          coin.collected = true; score.value += 10; sfxScore()
        }
      }

      // Enemies
      for (const en of enemies) {
        if (en.dead) continue
        en.x += en.vx
        if (en.x <= en.minX || en.x + en.w >= en.maxX) en.vx = -en.vx

        if (rectOverlap(player.x, player.y, PLAYER_W, PLAYER_H, en.x, en.y, en.w, en.h)) {
          // Stomp from above?
          if (player.vy > 0 && player.y + PLAYER_H < en.y + en.h * 0.6) {
            en.dead = true; player.vy = -7; score.value += 50; sfxScore()
          } else {
            player.dead = true; lives--; livesRef.value = lives; sfxDie()
            if (lives <= 0) { state.value = 'over'; sfxLose(); return }
          }
        }
      }

      // Flag touch
      const flagTouched = rectOverlap(player.x, player.y, PLAYER_W, PLAYER_H, flagX - 8, flagY, 16, 40)
      if (flagTouched) {
        score.value += 200
        if (level >= 3) { state.value = 'won'; sfxWin(); return }
        sfxLevelUp()
        startLevel(level + 1)
        return
      }
    }

    // Camera
    cameraX = Math.max(0, Math.min(WORLD_W - W, player.x - 200))
  }

  // Draw sky
  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, W, H)

  // Stars (parallax)
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  for (let i = 0; i < 30; i++) {
    const sx = ((i * 97 + 13) % WORLD_W - cameraX * 0.3) % W
    const sy = (i * 53 + 7) % (H - 80)
    if (sx >= 0 && sx < W) { ctx.beginPath(); ctx.arc(sx, sy, 1, 0, τ); ctx.fill() }
  }

  const cx = cameraX

  // Platforms
  for (const p of platforms) {
    const px = p.x - cx
    if (px + p.w < 0 || px > W) continue
    ctx.save()
    ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 6
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2
    ctx.fillStyle = 'rgba(0,30,60,0.8)'
    ctx.fillRect(px, p.y, p.w, p.h)
    ctx.strokeRect(px, p.y, p.w, p.h)
    ctx.restore()
  }

  // Coins
  for (const coin of coins) {
    if (coin.collected) continue
    const coinX = coin.x - cx
    if (coinX < -20 || coinX > W + 20) continue
    ctx.save()
    ctx.shadowColor = '#facc15'; ctx.shadowBlur = 10
    ctx.fillStyle = '#facc15'
    ctx.beginPath(); ctx.arc(coinX, coin.y, COIN_R, 0, τ); ctx.fill()
    ctx.restore()
  }

  // Enemies
  for (const en of enemies) {
    if (en.dead) continue
    const ex = en.x - cx
    if (ex < -40 || ex > W + 40) continue
    ctx.save()
    ctx.shadowColor = '#f472b6'; ctx.shadowBlur = 8
    ctx.fillStyle = '#f472b6'
    ctx.fillRect(ex, en.y, en.w, en.h)
    // Eyes
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(ex + 4, en.y + 6, 5, 5)
    ctx.fillRect(ex + 14, en.y + 6, 5, 5)
    ctx.fillStyle = '#030712'
    ctx.fillRect(ex + 5, en.y + 7, 3, 3)
    ctx.fillRect(ex + 15, en.y + 7, 3, 3)
    ctx.restore()
  }

  // Flag
  const fxDraw = flagX - cx
  if (fxDraw > -20 && fxDraw < W + 20) {
    ctx.save()
    ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 12
    ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(fxDraw, flagY + 40); ctx.lineTo(fxDraw, flagY); ctx.stroke()
    ctx.fillStyle = '#00ff88'
    ctx.beginPath(); ctx.moveTo(fxDraw, flagY); ctx.lineTo(fxDraw + 20, flagY + 10); ctx.lineTo(fxDraw, flagY + 20); ctx.closePath(); ctx.fill()
    ctx.restore()
  }

  // Player
  if (state.value === 'playing' && !player.dead) {
    const px2 = player.x - cx
    ctx.save()
    ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 14
    ctx.fillStyle = '#00d4ff'
    ctx.fillRect(px2, player.y, PLAYER_W, PLAYER_H)
    // Visor
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillRect(px2 + 5, player.y + 6, PLAYER_W - 10, 8)
    ctx.restore()
  }

  // HUD overlay
  ctx.save()
  ctx.fillStyle = 'rgba(3,7,18,0.6)'
  ctx.fillRect(0, 0, W, 30)
  ctx.font = "11px 'Courier New', monospace"
  ctx.textAlign = 'left'
  ctx.fillStyle = '#f472b6'; ctx.fillText(`♥ ${lives}`, 8, 20)
  ctx.fillStyle = '#facc15'; ctx.fillText(`Score: ${score.value}`, 70, 20)
  ctx.fillStyle = '#00d4ff'; ctx.textAlign = 'right'
  ctx.fillText(`Level ${level}/3`, W - 8, 20)
  ctx.restore()

  // Death flash
  if (state.value === 'playing' && player.dead) {
    ctx.fillStyle = `rgba(255,0,0,${0.3 * (1 - deathTimer / 60)})`
    ctx.fillRect(0, 0, W, H)
  }

  // Idle overlay
  if (state.value === 'idle') {
    ctx.fillStyle = 'rgba(3,7,18,0.82)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    const pulse = 0.5 + 0.5 * Math.sin(titlePulse * 0.003)
    ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 8 + pulse * 18
    ctx.fillStyle = '#00d4ff'
    ctx.font = "bold 26px 'Space Grotesk', sans-serif"
    ctx.fillText('NEON PLATFORMER', W / 2, H / 2 - 40)
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(200,220,255,0.45)'
    ctx.font = "13px 'Courier New', monospace"
    ctx.fillText('← → to move  ↑ / Space to jump', W / 2, H / 2 + 4)
    ctx.fillText('Collect coins, avoid enemies, reach the flag!', W / 2, H / 2 + 26)
    ctx.fillText('Press SPACE or click to play', W / 2, H / 2 + 50)
  }
}

onMounted(() => {
  const c = canvasEl.value!
  c.width = W; c.height = H
  c.addEventListener('click', () => { if (state.value === 'idle') startGame() })
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKey)
  raf = requestAnimationFrame(draw)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('keyup', onKey)
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 select-none">
    <div class="glass-hud px-6 py-2 flex gap-6 items-center">
      <div class="text-center">
        <p class="hud-label text-[10px]">SCORE</p>
        <p class="font-mono font-bold text-white text-lg leading-tight">{{ score }}</p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">LIVES</p>
        <p class="font-mono font-bold text-neon-pink text-lg leading-tight tracking-widest">
          {{ '♥'.repeat(livesRef) }}{{ '♡'.repeat(Math.max(0, 3 - livesRef)) }}
        </p>
      </div>
      <div class="text-center">
        <p class="hud-label text-[10px]">LEVEL</p>
        <p class="font-mono font-bold text-neon-blue text-lg leading-tight">{{ levelRef }}/3</p>
      </div>
    </div>

    <div class="relative">
      <canvas ref="canvasEl" class="rounded-xl border border-white/10 block cursor-pointer" />
      <GameResultOverlay
        v-if="state === 'won' || state === 'over'"
        :state="state"
        :score="score"
        :extra="state === 'won' ? 'All 3 levels cleared!' : 'No lives left!'"
        @restart="restart"
      />
    </div>

    <GameKeyboard :layout="ControlLayout.Dpad" />
    <p class="font-mono text-xs text-slate-600">← → Move · ↑/Space Jump · Reach the flag to advance</p>
  </div>
</template>
