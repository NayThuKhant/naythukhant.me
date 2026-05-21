import type { Component } from 'vue'
import { ControlLayout } from '~/types'
import {
  AsteroidDodge,
  BreakoutGame,
  FlappyRocket,
  Game2048,
  MemoryMatch,
  SnakeGame,
  SpaceInvaders,
} from '#components'

export type GameSlug =
  | 'space-invaders'
  | 'asteroid-dodge'
  | 'flappy-rocket'
  | 'cosmic-breakout'
  | 'neon-snake'
  | '2048'
  | 'planet-memory'

export interface GameEntry {
  slug: GameSlug
  id: string
  name: string
  desc: string
  genre: string
  color: 'neon-blue' | 'neon-emerald' | 'neon-purple' | 'neon-pink'
  component: Component
  controls: ControlLayout
}

export const games: GameEntry[] = [
  {
    slug: 'space-invaders',
    id: 'SpaceInvaders',
    name: 'Space Invaders',
    desc: 'Shoot down the alien fleet before they reach Earth. Classic arcade action.',
    genre: 'ARCADE',
    color: 'neon-blue',
    component: SpaceInvaders,
    controls: ControlLayout.LrFire,
  },
  {
    slug: 'asteroid-dodge',
    id: 'AsteroidDodge',
    name: 'Asteroid Dodge',
    desc: 'Pilot your ship through a relentless asteroid field. How long can you survive?',
    genre: 'SURVIVAL',
    color: 'neon-emerald',
    component: AsteroidDodge,
    controls: ControlLayout.Lr,
  },
  {
    slug: 'flappy-rocket',
    id: 'FlappyRocket',
    name: 'Flappy Rocket',
    desc: 'Boost your rocket through narrow gaps. One tap to fly — don\'t crash.',
    genre: 'ONE-TAP',
    color: 'neon-purple',
    component: FlappyRocket,
    controls: ControlLayout.Tap,
  },
  {
    slug: 'cosmic-breakout',
    id: 'BreakoutGame',
    name: 'Cosmic Breakout',
    desc: 'Break every neon brick with a bouncing energy ball. Classic and satisfying.',
    genre: 'ARCADE',
    color: 'neon-pink',
    component: BreakoutGame,
    controls: ControlLayout.Lr,
  },
  {
    slug: 'neon-snake',
    id: 'SnakeGame',
    name: 'Neon Snake',
    desc: 'Eat the glowing orbs and grow without hitting yourself. Speed builds up.',
    genre: 'CLASSIC',
    color: 'neon-emerald',
    component: SnakeGame,
    controls: ControlLayout.Dpad,
  },
  {
    slug: '2048',
    id: 'Game2048',
    name: '2048',
    desc: 'Slide and merge tiles to reach 2048. Deceptively simple, endlessly deep.',
    genre: 'PUZZLE',
    color: 'neon-blue',
    component: Game2048,
    controls: ControlLayout.Dpad,
  },
  {
    slug: 'planet-memory',
    id: 'MemoryMatch',
    name: 'Planet Memory',
    desc: 'Match all 8 planet pairs in the fewest flips. Test your space memory.',
    genre: 'PUZZLE',
    color: 'neon-purple',
    component: MemoryMatch,
    controls: ControlLayout.None,
  },
]

export const useGames = () => {
  const getGameBySlug = (slug: string) => games.find(game => game.slug === slug) ?? null
  return { games, getGameBySlug }
}

