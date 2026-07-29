/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefdf4',
          100: '#d6fae3',
          200: '#b0f3cb',
          300: '#7ce7ac',
          400: '#43d488',
          500: '#1fb96d',
          600: '#149457',
          700: '#137548',
          800: '#135c3c',
          900: '#124b33',
          950: '#062a1c',
        },
        coral: {
          50: '#fff1f0',
          100: '#ffe0dd',
          200: '#ffc6c0',
          300: '#ff9d92',
          400: '#fd6a58',
          500: '#f6432c',
          600: '#e3280f',
          700: '#bf1d0c',
          800: '#9d1c10',
          900: '#821c13',
        },
        amber: {
          50: '#fffbea',
          100: '#fff3c4',
          200: '#ffe58a',
          300: '#ffd24d',
          400: '#ffbb1f',
          500: '#f99b04',
          600: '#dd7302',
          700: '#b75106',
          800: '#943e0c',
          900: '#7a340e',
        },
      },
      fontFamily: {
        hanzi: ['NotoSansSC', 'NotoSansTC', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 10px -2px rgba(0,0,0,0.08), 0 1px 3px -1px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
