/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        forge: {
          bg: '#0A0B0D',
          surface: '#111318',
          card: '#161B22',
          border: '#21262D',
          muted: '#8B949E',
          accent: '#F7B731',
          green: '#2EA043',
          red: '#F85149',
        }
      }
    },
  },
  plugins: [],
}
