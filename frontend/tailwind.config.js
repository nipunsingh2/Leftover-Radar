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
          light: '#F9F7F2',
          dark: '#0E1310',
          subtle: '#F2EFE8',
          'dark-subtle': '#141C17',
          DEFAULT: '#F9F7F2',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#16201A',
          frosted: 'rgba(255, 255, 255, 0.85)',
          'dark-frosted': 'rgba(22, 32, 26, 0.8)',
          DEFAULT: '#FFFFFF',
        },
        ink: {
          DEFAULT: '#16201A',
          muted: '#5A6B61',
          hairline: 'rgba(22, 32, 26, 0.08)',
          dark: '#F0EDE6',
          'dark-muted': '#8D9C93',
          'dark-hairline': 'rgba(255, 255, 255, 0.08)',
        },
        racing: {
          DEFAULT: '#143828',
          hover: '#0E291D',
          dark: '#3AA676',
          'dark-hover': '#2F8C63',
          tint: '#EBF3EE',
          'dark-tint': '#16281E',
        },
        brass: {
          light: '#D9AF6B',
          DEFAULT: '#B88D48',
          deep: '#8F6B2F',
          tint: '#FDF8EE',
          'dark-tint': '#262014',
        },
        ochre: {
          DEFAULT: '#C07818',
          tint: '#FEF7ED',
          dark: '#E09226',
        },
        crimson: {
          DEFAULT: '#A83228',
          tint: '#FDF2F0',
          dark: '#E5554B',
        },
        sage: {
          DEFAULT: '#5A7A68',
          tint: '#EAF1ED',
        }
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        bento: '14px',
        control: '8px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(20, 32, 26, 0.04), 0 1px 2px -1px rgba(20, 32, 26, 0.04)',
        'card-hover': '0 10px 28px -4px rgba(20, 32, 26, 0.08), 0 2px 6px -1px rgba(20, 32, 26, 0.04)',
        glass: '0 4px 20px 0 rgba(14, 25, 19, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.9)',
        'glass-dark': '0 4px 20px 0 rgba(0, 0, 0, 0.35), inset 0 1px 0 0 rgba(255, 255, 255, 0.07)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }
    },
  },
  plugins: [],
}
