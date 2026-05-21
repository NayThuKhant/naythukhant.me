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
        // Kept for any residual usages
        space: {
          bg: '#030712',
          surface: '#070a13',
          card: '#0a0f1a',
          muted: '#64748b',
          text: '#cbd5e1',
          white: '#f1f5f9',
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
        'gradient-void': 'radial-gradient(ellipse 80% 80% at 50% -10%, #0d1a2e 0%, #030712 60%)',
        'gradient-cyber': 'linear-gradient(135deg, #a855f7, #00d4ff, #00ff88)',
        'gradient-blue-purple': 'linear-gradient(135deg, #00d4ff, #a855f7)',
      },
      animation: {
        'float': 'float 7s ease-in-out infinite',
        'float-slow': 'float 11s ease-in-out 1.5s infinite',
        'float-fast': 'float 5s ease-in-out 0.8s infinite',
        'terminal-blink': 'terminal-blink 1s step-end infinite',
        'scan': 'scan 12s linear infinite',
        'glow-pulse-blue': 'glow-pulse-blue 3s ease-in-out infinite',
        'glow-pulse-purple': 'glow-pulse-purple 3s ease-in-out 1s infinite',
        'spin-slow': 'spin 20s linear infinite',
        'orbit': 'orbit 15s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '40%': { transform: 'translateY(-12px)' },
          '70%': { transform: 'translateY(-6px)' },
        },
        'terminal-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(200vh)' },
        },
        'glow-pulse-blue': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(0,212,255,0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(0,212,255,0.6), 0 0 60px rgba(0,212,255,0.2)' },
        },
        'glow-pulse-purple': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(168,85,247,0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(168,85,247,0.6), 0 0 60px rgba(168,85,247,0.2)' },
        },
        orbit: {
          from: { transform: 'rotate(0deg) translateX(120px) rotate(0deg)' },
          to: { transform: 'rotate(360deg) translateX(120px) rotate(-360deg)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
} satisfies Config
