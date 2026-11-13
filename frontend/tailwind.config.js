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
          light: '#FAF7F2',
          dark: '#121514',
          subtle: '#F3EFE6',
          'dark-subtle': '#1A201D',
          DEFAULT: '#FAF7F2',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#1A201D',
          frosted: 'rgba(255, 255, 255, 0.92)',
          'dark-frosted': 'rgba(26, 32, 29, 0.88)',
          DEFAULT: '#FFFFFF',
        },
        ink: {
          DEFAULT: '#191C1A',
          muted: '#616763',
          hairline: 'rgba(25, 28, 26, 0.09)',
          dark: '#F5F2EA',
          'dark-muted': '#96A09A',
          'dark-hairline': 'rgba(255, 255, 255, 0.09)',
        },
        matcha: {
          DEFAULT: '#1E4D38',
          hover: '#153A2A',
          light: '#3FA373',
          tint: '#E8F4EE',
          'dark-tint': '#162E22',
        },
        persimmon: {
          DEFAULT: '#FF6B35',
          hover: '#E85A26',
          tint: '#FFF1EB',
          'dark-tint': '#331C14',
        },
        yuzu: {
          DEFAULT: '#F7C948',
          tint: '#FFF9E6',
          dark: '#E5B530',
        },
        berry: {
          DEFAULT: '#E03131',
          tint: '#FFEBEB',
          dark: '#FA5252',
        },
        lavender: {
          DEFAULT: '#7048E8',
          tint: '#F3F0FF',
        }
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
      borderRadius: {
        bento: '20px',
        card: '16px',
        control: '10px',
        pill: '9999px',
      },
      boxShadow: {
        quirky: '0 2px 0 0 rgba(25, 28, 26, 0.06), 0 8px 24px -4px rgba(25, 28, 26, 0.05)',
        'quirky-hover': '0 4px 0 0 rgba(25, 28, 26, 0.08), 0 14px 32px -6px rgba(25, 28, 26, 0.09)',
        'quirky-dark': '0 2px 0 0 rgba(0, 0, 0, 0.3), 0 8px 24px -4px rgba(0, 0, 0, 0.35)',
        tactile: '0 2px 0 0 rgba(25, 28, 26, 0.1)',
        'tactile-dark': '0 2px 0 0 rgba(0, 0, 0, 0.4)',
      },
      keyframes: {
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        radarPulse: {
          '0%': { transform: 'scale(0.95)', opacity: '0.8' },
          '50%': { transform: 'scale(1.15)', opacity: '0.2' },
          '100%': { transform: 'scale(0.95)', opacity: '0.8' },
        },
        springPop: {
          '0%': { transform: 'scale(0.95)' },
          '60%': { transform: 'scale(1.03)' },
          '100%': { transform: 'scale(1)' },
        },
        mascotBounce: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-12px) scale(1.05)' },
        },
        liquidGlow: {
          '0%, 100%': { opacity: '0.5', filter: 'blur(14px)' },
          '50%': { opacity: '0.9', filter: 'blur(22px)' },
        },
        steamFloat: {
          '0%': { transform: 'translateY(0) scale(0.8)', opacity: '0' },
          '50%': { opacity: '0.7' },
          '100%': { transform: 'translateY(-20px) scale(1.2)', opacity: '0' },
        }
      },
      animation: {
        'radar-sweep': 'radarSweep 6s linear infinite',
        'radar-pulse': 'radarPulse 3s ease-in-out infinite',
        'spring-pop': 'springPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'mascot-bounce': 'mascotBounce 2.4s ease-in-out infinite',
        'liquid-glow': 'liquidGlow 4s ease-in-out infinite',
        'steam-float': 'steamFloat 2.2s ease-out infinite',
      }
    },
  },
  plugins: [],
}
