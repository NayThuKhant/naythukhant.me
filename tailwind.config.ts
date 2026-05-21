import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{vue,ts}', './content/**/*.md'],
  theme: {
    extend: {
      colors: {
        void: '#030712',
        deep: '#070a13',
        neon: {
          blue: '#00d4ff',
          purple: '#a855f7',
          emerald: '#00ff88',
          pink: '#f472b6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'neon-blue': '0 0 20px rgba(0,212,255,0.45), 0 0 60px rgba(0,212,255,0.15)',
        'neon-purple': '0 0 20px rgba(168,85,247,0.45), 0 0 60px rgba(168,85,247,0.15)',
        'neon-emerald': '0 0 20px rgba(0,255,136,0.45), 0 0 60px rgba(0,255,136,0.15)',
        'neon-sm-blue': '0 0 12px rgba(0,212,255,0.35)',
        'neon-sm-purple': '0 0 12px rgba(168,85,247,0.35)',
        'neon-sm-emerald': '0 0 12px rgba(0,255,136,0.35)',
        'glass': '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        'glass-lg': '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      backgroundImage: {
        'gradient-cyber': 'linear-gradient(135deg, #a855f7, #00d4ff, #00ff88)',
      },
      animation: {
        'terminal-blink': 'terminal-blink 1s step-end infinite',
        'glow-pulse-blue': 'glow-pulse-blue 3s ease-in-out infinite',
      },
      keyframes: {
        'terminal-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'glow-pulse-blue': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(0,212,255,0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(0,212,255,0.6), 0 0 60px rgba(0,212,255,0.2)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
} satisfies Config
