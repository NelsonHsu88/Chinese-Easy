/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // The warm ivory page background the reference mockups sit on — a shade lighter
        // than the visual system's "Soft Cream" (#FFF5E6), which is used for panels.
        canvas: '#fdfaf4',
        // "Jade Green" from the app's visual-system reference — matches Tailwind's
        // stock green-500 (#22c55e) almost exactly, so the scale below is that palette.
        brand: {
          50: '#eefdf4',
          100: '#d6fae3',
          200: '#b0f3cb',
          300: '#7ce7ac',
          400: '#43d488',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        // "Coral Red" #FF6B6B from the reference.
        coral: {
          50: '#fff1f1',
          100: '#ffe1e1',
          200: '#ffc9c9',
          300: '#ffa3a3',
          400: '#ff8a8a',
          500: '#ff6b6b',
          600: '#f04747',
          700: '#dc2f2f',
          800: '#b62525',
          900: '#962323',
        },
        // "Golden Amber" #F5B93D, with "Soft Cream" #FFF5E6 as the 50 shade — both from the reference.
        amber: {
          50: '#fff5e6',
          100: '#ffeacc',
          200: '#ffd699',
          300: '#fdc670',
          400: '#f9c158',
          500: '#f5b93d',
          600: '#db9f2e',
          700: '#b57e22',
          800: '#8f611b',
          900: '#734d16',
        },
      },
      fontFamily: {
        // "Source Han Serif SC" from the visual system — Noto Serif SC/TC is the same
        // typeface family under Google's naming, so it's the closest real match.
        hanzi: ['NotoSerifSC', 'NotoSerifTC', 'serif'],
        // "Nunito Rounded" from the visual system.
        sans: ['Nunito', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 10px -2px rgba(0,0,0,0.08), 0 1px 3px -1px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
