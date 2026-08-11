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
        // Palette for the Reading Library / Story Reader redesign. Namespaced under
        // `read-` because it deliberately overlaps the older scales above (its coral
        // and amber are warmer and less saturated) and the two must not be mixed.
        // The governing idea: nothing is pure grey or pure black — even the darkest
        // ink carries a little navy, which is what keeps the screens feeling soft.
        read: {
          cream: '#fdfbf5',
          paper: '#fffdf8',
          ink: '#1a1a2e',
          body: '#292936',
          muted: '#8a8a99',
          'muted-light': '#aaa8a4',
          line: '#e9e4da',
          'line-light': '#f0ece4',
          mint: '#d9f2e0',
          'mint-soft': '#eaf7ef',
          green: '#2e7d5b',
          'green-button': '#45b887',
          blush: '#fde4e1',
          coral: '#e5645a',
          'coral-bright': '#f46757',
          'coral-soft': '#fceae5',
          amber: '#fbebcf',
          ochre: '#c88a2e',
          highlight: '#f9e58c',
          star: '#ffc414',
          sky: '#dfeff8',
          indigo: '#597895',
          'nav-inactive': '#65656e',
        },
      },
      fontFamily: {
        // "Source Han Serif SC" from the visual system — Noto Serif SC/TC is the same
        // typeface family under Google's naming, so it's the closest real match.
        hanzi: ['NotoSerifSC', 'NotoSerifTC', 'serif'],
        // CJK glyphs have no synthesisable bold — this maps to the real 700 face.
        'hanzi-bold': ['NotoSerifSCBold', 'NotoSerifTCBold', 'serif'],
        // "Nunito Rounded" from the visual system.
        sans: ['Nunito', 'sans-serif'],
        // The marker-hand script the dashboard greeting puts the learner's name in.
        handwriting: ['Caveat', 'cursive'],

        // Reading-UI faces. React Native can't synthesise weights the way a browser
        // can, so every weight is loaded as its own family (same reason
        // `font-hanzi-bold` exists above) and selected by family, not fontWeight.
        'nunito-bold': ['NunitoBold', 'sans-serif'],
        'nunito-black': ['NunitoBlack', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        'inter-medium': ['InterMedium', 'sans-serif'],
        'inter-semibold': ['InterSemiBold', 'sans-serif'],
        'inter-bold': ['InterBold', 'sans-serif'],
        // The literary serif English prose is set in — deliberately not the UI sans,
        // so translations read like a storybook rather than app chrome.
        lora: ['Lora', 'serif'],
        // Traditional-only faces: the reader always renders traditional hanzi, so
        // unlike `font-hanzi` these don't need the SC fallback in front.
        'hanzi-tc': ['NotoSerifTCMedium', 'serif'],
        'hanzi-tc-semibold': ['NotoSerifTCSemiBold', 'serif'],
        'handwriting-medium': ['CaveatMedium', 'cursive'],
      },
      boxShadow: {
        card: '0 2px 10px -2px rgba(0,0,0,0.08), 0 1px 3px -1px rgba(0,0,0,0.06)',
        // Broad and extremely faint, tinted warm rather than black — paper resting a
        // couple of millimetres above a desk, not a card floating on a web dashboard.
        paper: '0 6px 18px rgba(65,49,27,0.065), 0 2px 4px rgba(65,49,27,0.025)',
        'paper-lifted': '0 10px 28px rgba(76,58,37,0.10), 0 2px 6px rgba(76,58,37,0.04)',
        'paper-sheet': '0 -10px 30px rgba(66,50,29,0.08)',
        // Action buttons in the word sheet. These lift further off the page than
        // anything else in the reading UI on purpose — they're the one place the
        // learner is meant to act, and the coloured bloom under the primary
        // button reads as a glow rather than a drop shadow.
        'glow-jade': '0 8px 22px rgba(69,184,135,0.45), 0 2px 6px rgba(69,184,135,0.28)',
        'glow-paper': '0 6px 18px rgba(76,58,37,0.18), 0 2px 5px rgba(76,58,37,0.09)',
      },
    },
  },
  plugins: [],
}
