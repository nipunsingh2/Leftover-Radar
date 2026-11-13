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
          light: '#F6F1E7',
          dark: '#10150F',
          DEFAULT: '#F6F1E7',
        },
        surface: {
          light: '#FBF8F1',
          dark: '#171E17',
          DEFAULT: '#FBF8F1',
        },
        ink: {
          DEFAULT: '#17211B',
          muted: '#5B665F',
          hairline: '#DDD5C4',
          dark: '#EDE8DA',
          'dark-muted': '#8A958E',
          'dark-hairline': '#263127',
        },
        forest: {
          DEFAULT: '#1F4D3A',
          hover: '#173B2D',
          dark: '#7FB59A',
          tint: '#E3EBDD',
        },
        saffron: {
          DEFAULT: '#C98A1B',
          tint: '#FBF1DD',
        },
        clay: {
          DEFAULT: '#A63D2F',
          tint: '#F8E8E6',
        },
        sage: {
          tint: '#E3EBDD',
        }
      },
      fontFamily: {
        serif: ['Newsreader', 'Fraunces', 'serif'],
        sans: ['"Instrument Sans"', '"IBM Plex Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        control: '6px',
        ticket: '2px',
      },
      borderWidth: {
        hairline: '1px',
      }
    },
  },
  plugins: [],
}
