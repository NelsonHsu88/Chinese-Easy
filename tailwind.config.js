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
        // Challenges: the palette lives in src/components/challenges/tokens.ts,
        // not here. Almost all of it is consumed by animated or state-dependent
        // styles rather than class names, and two sources for one palette is
        // exactly how a screen ends up with five slightly different greens.
        // The dictionary's own scale.
        //
        // Originally a cool-grey system on #F8FAFC with pure white cards, built
        // to a mockup that looked like every other SaaS dashboard. It is now
        // warm ivory under jade, which puts it in the same family as the reading
        // screens, the Dashboard and Settings rather than standing apart from
        // all three — the dictionary is reached from inside the app, not from a
        // different app.
        //
        // Kept as its own `dict-*` namespace rather than folded into
        // `canvas`/`read-*`: the dictionary is built almost entirely from
        // Tailwind classes where those screens are built from inline style
        // objects, and every one of these values is consumed by a class name.
        dict: {
          // Rice paper. Never pure white — the whole screen reads as paper.
          page: '#FDFBF5',
          // A card is a shade *warmer* than white, and lighter than the page.
          card: '#FFFDFA',
          // Deep ink with a hint of navy, not black.
          heading: '#18263A',
          body: '#42526B',
          muted: '#8290A6',
          // Warm, and very nearly invisible: separation here comes from the card
          // sitting a shade off the paper, not from a drawn edge.
          line: '#EDE7DB',
          // Jade. Softer and less acidic than the stock green it replaces.
          green: '#4AA54B',
          'green-dark': '#3E9845',
          // Pale mint for selected states and quiet green fills.
          'green-pale': '#EAF5E8',
          // Backing colours for the category tiles, one per WordCategory. Left
          // as they were — these pastels already read warm, and they are the one
          // place on the screen where colour is allowed to be playful.
          'tile-green': '#e7f6ec',
          'tile-blue': '#e0edf9',
          'tile-peach': '#fdeee4',
          'tile-lilac': '#ece9fa',
          'tile-butter': '#fdf0d2',
          'tile-rose': '#fbe6ec',
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
        // The marker-hand script the reading screens use for their one
        // handwritten note per screen.
        handwriting: ['Caveat', 'cursive'],
        // The Dashboard greeting's learner name. A separate family from
        // `handwriting` on purpose — Kalam is an upright marker hand, Caveat a
        // connected slanted script, and they are not interchangeable at size.
        handwritten: ['KalamBold', 'cursive'],

        // Reading-UI faces. React Native can't synthesise weights the way a browser
        // can, so every weight is loaded as its own family (same reason
        // `font-hanzi-bold` exists above) and selected by family, not fontWeight.
        'nunito-semibold': ['NunitoSemiBold', 'sans-serif'],
        'nunito-bold': ['NunitoBold', 'sans-serif'],
        'nunito-extrabold': ['NunitoExtraBold', 'sans-serif'],
        'nunito-black': ['NunitoBlack', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        'inter-medium': ['InterMedium', 'sans-serif'],
        'inter-semibold': ['InterSemiBold', 'sans-serif'],
        'inter-bold': ['InterBold', 'sans-serif'],
        // The literary serif English prose is set in — deliberately not the UI sans,
        // so translations read like a storybook rather than app chrome.
        lora: ['Lora', 'serif'],
        // Script-specific faces, paired with the `hanzi-sc-*` set below. Neither
        // carries a fallback to the other on purpose: `hanziFont` picks the face
        // from `settings.script` so each script gets its own regional glyph
        // forms, which a shared fallback chain would flatten.
        'hanzi-tc': ['NotoSerifTCMedium', 'serif'],
        'hanzi-tc-semibold': ['NotoSerifTCSemiBold', 'serif'],
        // Sans-serif traditional hanzi, for the writing guide — its Chinese UI
        // text sits inside Nunito sentences, where the serif reads as a quote
        // from the reader rather than as part of the sentence.
        'hanzi-sans': ['NotoSansTC', 'sans-serif'],
        'hanzi-sans-medium': ['NotoSansTCMedium', 'sans-serif'],
        'hanzi-sans-bold': ['NotoSansTCBold', 'sans-serif'],
        'handwriting-medium': ['CaveatMedium', 'cursive'],

        // Dictionary UI faces — Nunito Sans, a different typeface from the
        // rounded `sans`/`nunito-*` families above. Weight is chosen by family,
        // never by `fontWeight`.
        'dict-sans': ['NunitoSans', 'sans-serif'],
        'dict-semibold': ['NunitoSansSemiBold', 'sans-serif'],
        'dict-bold': ['NunitoSansBold', 'sans-serif'],
        'dict-extrabold': ['NunitoSansExtraBold', 'sans-serif'],
        // Traditional-only serif at Regular, for large vocabulary display where
        // a real 400 weight reads better than the Medium `hanzi-tc` face.
        'hanzi-tc-regular': ['NotoSerifTC', 'serif'],

        /*
         * Simplified-only counterparts to the `hanzi-tc*` faces above, for the
         * surfaces that render a word in whichever script the learner chose.
         *
         * Deliberately NOT the same thing as `font-hanzi`, which lists SC ahead
         * of TC as a *fallback chain* — that covers both character sets, but it
         * also hands a traditional learner SC regional glyph forms for every
         * character the SC face happens to contain, which is most of them. The
         * two Noto faces disagree on the shape of characters like 骨 and 直 even
         * where the codepoint is identical, so the script preference has to pick
         * the face rather than lean on a fallback. `hanziFont` in lib/hanzi.ts
         * is the one place that choice is made.
         */
        'hanzi-sc': ['NotoSerifSCMedium', 'serif'],
        'hanzi-sc-regular': ['NotoSerifSC', 'serif'],
        'hanzi-sc-semibold': ['NotoSerifSCSemiBold', 'serif'],
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
        // Dictionary cards. Tinted with the slate the page is built from rather
        // than black, so a white card reads as raised without a visible edge —
        // the borders in this system are for dividers, not card outlines.
        // Challenges. Its spec asks for one very soft shadow and nothing else —
        // no shadow on icon tiles, XP chips or progress bars, which is what
        // keeps a screen this dense from reading as generic app chrome.
        chal: '0 5px 20px rgba(60,48,30,0.06)',
        'chal-tabs': '0 3px 12px rgba(60,48,30,0.07)',
        'chal-claim': '0 4px 14px rgba(206,150,60,0.35)',
        dict: '0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.05)',
        'dict-lifted': '0 2px 4px rgba(15,23,42,0.05), 0 10px 24px rgba(15,23,42,0.07)',
      },
      borderRadius: {
        // The dictionary system's card radius — the mockups sit at 18–20px,
        // between Tailwind's 2xl (16) and 3xl (24).
        dict: '20px',
        'dict-sm': '14px',
      },
    },
  },
  plugins: [],
}
