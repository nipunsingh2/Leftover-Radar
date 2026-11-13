/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          light: '#F8F5EE',
          dark: '#0B140E',
          subtle: '#F2ECE0',
          'dark-subtle': '#101D15',
          DEFAULT: '#F8F5EE',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#122219',
          frosted: 'rgba(255, 255, 255, 0.78)',
          'dark-frosted': 'rgba(18, 34, 25, 0.78)',
          DEFAULT: '#FFFFFF',
        },
        ink: {
          DEFAULT: '#14231B',
          muted: '#5A6B61',
          hairline: 'rgba(197, 160, 89, 0.22)',
          dark: '#E8F0EA',
          'dark-muted': '#8FA297',
          'dark-hairline': 'rgba(255, 255, 255, 0.08)',
        },
        gold: {
          50: '#FAF6EC',
          100: '#F4ECCD',
          200: '#E8D89B',
          300: '#DCBF6F',
          DEFAULT: '#C5A059',
          500: '#AA853D',
          deep: '#88682B',
          glow: 'rgba(197, 160, 89, 0.35)',
        },
        forest: {
          DEFAULT: '#164232',
          hover: '#0F2D21',
          dark: '#6CB292',
          'dark-hover': '#539878',
          tint: '#EAF2EC',
          'dark-tint': '#16281E',
        },
        saffron: {
          DEFAULT: '#C98223',
          tint: '#FEF7ED',
          dark: '#E5A142',
        },
        clay: {
          DEFAULT: '#9E2A2B',
          tint: '#FDF2F0',
          dark: '#E05354',
        },
        sage: {
          DEFAULT: '#557A68',
          tint: '#E8EFEA',
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Newsreader', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Instrument Sans', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        engraved: ['Cinzel', 'serif'],
      },
      borderRadius: {
        bento: '16px',
        control: '8px',
        ticket: '4px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(15, 45, 33, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.7)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
        'gold-glow': '0 0 25px -4px rgba(197, 160, 89, 0.35)',
        'emerald-glow': '0 0 24px -4px rgba(22, 66, 50, 0.4)',
        'bento-hover': '0 16px 36px -8px rgba(15, 45, 33, 0.12), 0 0 0 1px rgba(197, 160, 89, 0.35)',
        'card-ornate': '0 4px 20px -2px rgba(15, 45, 33, 0.06), 0 0 0 1px rgba(197, 160, 89, 0.18)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.02)' },
        },
        floatSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        }
      },
      animation: {
        shimmer: 'shimmer 2.5s infinite',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'float-subtle': 'floatSubtle 4s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
