/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f0f4fb',
          100: '#d9e3f4',
          200: '#b3c7e9',
          300: '#7da0d5',
          400: '#4a75bd',
          500: '#2a559f',
          600: '#1B3A6B',
          700: '#162f57',
          800: '#112244',
          900: '#0c1a30',
          950: '#070f1c',
        },
        brand: {
          orange: '#F5900A',
          'orange-light': '#FFB347',
          'orange-dark': '#C4720A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
