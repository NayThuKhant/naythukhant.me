import type { Component } from 'vue'
import { ControlLayout } from '~/types'
import {
  AsteroidDodge,
  BreakoutGame,
  ColorSurge,
  CosmicMinesweeper,
  CosmicPong,
  FlappyRocket,
  Game2048,
  GravityFlip,
  LaserBounce,
  MemoryMatch,
  MeteorCatcher,
  NeonRunner,
  NeonTetris,
  NeonWhack,
  OrbitShield,
  SnakeGame,
  SpaceInvaders,
  StarCatcher,
  TypeAttack,
  WarpTunnel,
} from '#components'

export type GameSlug =
  | 'space-invaders'
  | 'asteroid-dodge'
  | 'flappy-rocket'
  | 'cosmic-breakout'
  | 'neon-snake'
  | '2048'
  | 'planet-memory'
  | 'neon-tetris'
  | 'cosmic-pong'
  | 'meteor-catcher'
  | 'neon-runner'
  | 'gravity-flip'
  | 'orbit-shield'
  | 'star-catcher'
  | 'cosmic-minesweeper'
  | 'type-attack'
  | 'neon-whack'
  | 'laser-bounce'
  | 'warp-tunnel'
  | 'color-surge'

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
    desc: "Boost your rocket through narrow gaps. One tap to fly — don't crash.",
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
    desc: "Eat the glowing orbs and grow without hitting yourself. Speed builds up.",
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
  {
    slug: 'neon-tetris',
    id: 'NeonTetris',
    name: 'Neon Tetris',
    desc: 'Stack neon tetrominoes and clear lines before the stack reaches the top.',
    genre: 'CLASSIC',
    color: 'neon-blue',
    component: NeonTetris,
    controls: ControlLayout.Dpad,
  },
  {
    slug: 'cosmic-pong',
    id: 'CosmicPong',
    name: 'Cosmic Pong',
    desc: 'Face the CPU in a neon pong duel. First to 7 wins. Speed up or lose.',
    genre: 'ARCADE',
    color: 'neon-pink',
    component: CosmicPong,
    controls: ControlLayout.UpDown,
  },
  {
    slug: 'meteor-catcher',
    id: 'MeteorCatcher',
    name: 'Meteor Catcher',
    desc: 'Tap the falling meteors before they hit the ground. How long can you last?',
    genre: 'CASUAL',
    color: 'neon-emerald',
    component: MeteorCatcher,
    controls: ControlLayout.None,
  },
  {
    slug: 'neon-runner',
    id: 'NeonRunner',
    name: 'Neon Runner',
    desc: 'Dodge neon barriers in this endless side-scrolling runner — jump to survive.',
    genre: 'ONE-TAP',
    color: 'neon-blue',
    component: NeonRunner,
    controls: ControlLayout.Tap,
  },
  {
    slug: 'gravity-flip',
    id: 'GravityFlip',
    name: 'Gravity Flip',
    desc: 'Flip gravity to navigate a shifting sine-wave tunnel — how far can you go?',
    genre: 'ONE-TAP',
    color: 'neon-purple',
    component: GravityFlip,
    controls: ControlLayout.Tap,
  },
  {
    slug: 'orbit-shield',
    id: 'OrbitShield',
    name: 'Orbit Shield',
    desc: 'Rotate a neon arc shield to deflect incoming meteors and protect your planet.',
    genre: 'ARCADE',
    color: 'neon-emerald',
    component: OrbitShield,
    controls: ControlLayout.Lr,
  },
  {
    slug: 'star-catcher',
    id: 'StarCatcher',
    name: 'Star Catcher',
    desc: 'Pilot a spaceship to catch falling stars while dodging pink energy bombs.',
    genre: 'CASUAL',
    color: 'neon-pink',
    component: StarCatcher,
    controls: ControlLayout.Lr,
  },
  {
    slug: 'cosmic-minesweeper',
    id: 'CosmicMinesweeper',
    name: 'Cosmic Minesweeper',
    desc: 'Sweep a 9×9 minefield in deep space. Reveal cells, flag mines — clear the field without detonating.',
    genre: 'PUZZLE',
    color: 'neon-blue',
    component: CosmicMinesweeper,
    controls: ControlLayout.None,
  },
  {
    slug: 'type-attack',
    id: 'TypeAttack',
    name: 'Type Attack',
    desc: 'Asteroids rain down carrying space words. Type them out before they hit the ground.',
    genre: 'ARCADE',
    color: 'neon-purple',
    component: TypeAttack,
    controls: ControlLayout.None,
  },
  {
    slug: 'neon-whack',
    id: 'NeonWhack',
    name: 'Neon Whack',
    desc: 'Whack glowing alien heads as they pop out of space-station ports. Click fast before they disappear.',
    genre: 'CASUAL',
    color: 'neon-emerald',
    component: NeonWhack,
    controls: ControlLayout.None,
  },
  {
    slug: 'laser-bounce',
    id: 'LaserBounce',
    name: 'Laser Bounce',
    desc: 'Aim your laser and ricochet shots off arena walls to destroy neon targets. Clear every target before shots run out.',
    genre: 'PUZZLE',
    color: 'neon-pink',
    component: LaserBounce,
    controls: ControlLayout.LrFire,
  },
  {
    slug: 'warp-tunnel',
    id: 'WarpTunnel',
    name: 'Warp Tunnel',
    desc: 'Navigate a glowing ship through a pulsating wormhole. The tunnel tightens as you survive.',
    genre: 'SURVIVAL',
    color: 'neon-blue',
    component: WarpTunnel,
    controls: ControlLayout.UpDown,
  },
  {
    slug: 'color-surge',
    id: 'ColorSurge',
    name: 'Color Surge',
    desc: 'Aim and shoot colored bubbles to match groups of 3 or more. Chain pops to rack up massive points.',
    genre: 'ARCADE',
    color: 'neon-emerald',
    component: ColorSurge,
    controls: ControlLayout.LrFire,
  },
]

export const useGames = () => {
  const getGameBySlug = (slug: string) => games.find(game => game.slug === slug) ?? null
  return { games, getGameBySlug }
}
