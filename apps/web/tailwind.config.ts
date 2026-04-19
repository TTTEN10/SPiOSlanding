import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#1E995E',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        secondary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#6A5B9A',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        },
        neutral: {
          light: '#EAE8FF',
          dark: '#BDDBC8',
        },
        text: {
          primary: '#001515',
        },
        accent: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        }
      },
      fontFamily: {
        'titillium': ['Titillium Web', 'sans-serif'],
        'noto': ['Noto Sans', 'sans-serif'],
        sans: ['Titillium Web', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        'light': '300',
        'regular': '400',
        'semibold': '600',
      },
    },
  },
  plugins: [],
}

export default config
