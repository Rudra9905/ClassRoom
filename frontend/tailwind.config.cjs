/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca'
        },
        accent: {
          50: '#ecfeff',
          100: '#cffafe',
          500: '#14b8a6',
          600: '#0d9488'
        }
      },
      boxShadow: {
        soft: '0 10px 25px rgba(15, 23, 42, 0.06)'
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem'
      }
    }
  },
  plugins: [],
};
