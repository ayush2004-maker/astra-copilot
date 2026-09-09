/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx,html}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        astra: {
          50: '#f4f5f9',
          100: '#e8eaf2',
          200: '#cbd1e3',
          300: '#a3adce',
          400: '#7383b4',
          500: '#53659c',
          600: '#414f82',
          700: '#353f6b',
          800: '#2e3559',
          900: '#272d4c',
          950: '#141727',
          dark: '#0f111a',
          surface: '#181b28',
          card: '#1e2235',
          border: '#2a304a',
          primary: '#6366f1',
          primaryHover: '#4f46e5',
          accent: '#06b6d4',
        }
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        }
      }
    },
  },
  plugins: [],
}
