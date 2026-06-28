/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        forge: {
          bg:      'var(--forge-bg)',
          surface: 'var(--forge-surface)',
          card:    'var(--forge-card)',
          border:  'var(--forge-border)',
          muted:   'var(--forge-muted)',
          accent:  '#F7B731',
          green:   '#2EA043',
          red:     '#F85149',
        }
      }
    },
  },
  plugins: [],
}