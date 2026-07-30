# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```
npm install          # install deps
npm run start         # expo start — runs the Metro dev server, scan the QR with Expo Go
npm run android        # expo start --android
npm run ios             # expo start --ios
npm run web               # expo start --web (react-native-web target)
npx tsc --noEmit            # type-check the whole project — the closest thing to a build/verify step
npx expo-doctor               # validate SDK/dependency/config-plugin consistency
```

There is no test suite in this repo. The `lint` script in package.json (`eslint .`) is a leftover from before this project was migrated to Expo — eslint is not currently installed, so that script will fail until it's reconfigured.

When bumping dependencies, prefer `npx expo install <package>` (or `npx expo install --fix`) over plain `npm install` — it resolves versions against the current Expo SDK's compatibility matrix instead of npm's "latest". This project currently targets **Expo SDK 54**; `expo`, `react`, `react-native`, and every `expo-*`/`react-native-*` package must stay aligned to that SDK's versions (see `node_modules/expo/package.json`'s own dependency versions as the source of truth if `expo install --fix` doesn't cover something). `@react-native-community/datetimepicker` requires `npm install --legacy-peer-deps` — it has an optional peer on `react-native-windows` that npm's resolver treats as a conflict even though this project doesn't target Windows.

## Architecture

This is a React Native + Expo app (not a website) — a spaced-repetition Chinese vocabulary trainer with stroke-order writing practice. It runs on iOS, Android, and (via react-native-web) in a browser.

### Routing vs. screen implementation

Expo Router is file-based, rooted at `src/app/` (not a top-level `app/` — Expo Router auto-detects `src/app` when there's no root-level `app/` dir). Files under `src/app/` are intentionally thin: each just re-exports the actual screen component from `src/screens/`, e.g. `src/app/(tabs)/index.tsx` is `export { Dashboard as default } from '../../screens/Dashboard'`. When changing a screen's UI/logic, edit the file in `src/screens/`, not the route file.

- `src/app/_layout.tsx` — root layout. Wraps everything in `AppProvider` (see below), loads fonts, and gates rendering: nothing renders (splash screen stays up) until `AppContext`'s `ready` flag and fonts are both true, then it redirects to `/onboarding` if onboarding isn't complete, mirroring the old web app's route-guard logic.
- `src/app/(tabs)/` — the four tab screens (Dashboard, New Words, Dictionary, Settings) via Expo Router's `Tabs`. The "Review" tab is a special case: its `tabPress` listener always calls `e.preventDefault()` and pushes the standalone `/review` route instead of switching tabs — Review is a distraction-free full-screen flow that lives outside the tab chrome, not actual tab content. `src/app/(tabs)/review.tsx` only exists as a redirect fallback for that route slot.
- `src/app/review.tsx`, `due-words.tsx`, `onboarding.tsx`, `profile.tsx` — standalone routes pushed on top of the tabs, not nested in them.

### State and persistence

`src/context/AppContext.tsx` is the single global store (settings, SRS deck, custom words, daily progress, streak, onboarding state), exposed via `useApp()`. All persisted state loads from AsyncStorage once on mount (`src/lib/storage.ts`); until that finishes, `ready` is `false` and the root layout keeps the splash screen up. Don't add new persisted fields without also adding them to the `hydrate()` `Promise.all` and a guarded save `useEffect` (the guard skips saving the placeholder default on first render, before hydration has overwritten it).

### Business logic vs. platform bridges in `src/lib/`

Split the module by whether it touches a platform API:
- Pure logic, safe to unit-test or reuse anywhere: `srs.ts` (SM-2-style scheduler), `selectors.ts` (deck queries — due cards, new-word pool), `date.ts`, `hanzi.ts` (simplified/traditional + pinyin/zhuyin display resolution), `zhuyin.ts`, `placement.ts`, `progress.ts` (heatmap/streak stats), `categories.ts`.
- Platform bridges, each a thin wrapper you'd swap if the underlying Expo API changed: `storage.ts` (AsyncStorage), `speech.ts` (expo-speech), `haptics.ts` (expo-haptics), `sound.ts` (expo-audio, playing pre-rendered WAV files — see below).

### Word data

`src/data/hskFrequency.ts` merges a small hand-curated word list (with example sentences) with a large bulk-imported dictionary (`src/data/importedWords.json`, no examples) into the full word bank. `src/data/mockDeck.ts` seeds a demo SRS deck; `src/data/placementTest.ts` is the fixed onboarding placement-test word list.

### HanziStage — the stroke-order writer

`src/components/HanziStage/` is the one genuinely unusual part of this codebase. The `hanzi-writer` npm package draws stroke animations into real SVG/DOM and has no React Native port, so it runs inside a `react-native-webview`:

- `hanziWriterEngine.ts` — **auto-generated**, do not hand-edit. It's `hanzi-writer`'s minified UMD bundle copied into a JS string constant, produced by `scripts/embedHanziWriterEngine.mjs` from `node_modules/hanzi-writer/dist/hanzi-writer.min.js`. Re-run that script after ever bumping the `hanzi-writer` dependency.
- `writerHtml.ts` — the static HTML/JS every glyph's WebView loads. This is where the actual `HanziWriter.create()` call, demo/quiz lifecycle, and the "first stroke" hint overlay for blind quiz mode live (all DOM APIs, so they have to run here, not on the RN side).
- `HanziStage.tsx` — the RN-side bridge. Looks up each character's stroke data (from the bundled `src/assets/hanziData.json`, falling back to the `hanzi-writer-data` CDN for characters not bundled, e.g. custom words), sends it into the WebView via `postMessage` once the WebView signals it's ready, and translates the WebView's posted-back events into the same `onQuizProgress` / `onQuizComplete` / `onDemoComplete` callback props the screens consume. One WebView is created per character in a word; multi-character words animate/quiz one character at a time.

`src/assets/hanziData.json` (character → stroke/median data for ~1,500 characters) was generated once by `scripts/mergeHanziData.mjs` from a since-deleted `public/hanzi-data/` directory of per-character files — that script isn't re-runnable as-is unless that source directory is restored; treat `hanziData.json` as the canonical bundled dataset going forward.

### Sound

`src/lib/sound.ts` plays three short effects (stroke-scratch, positive chime, retry tone) via `expo-audio`, from WAV files pre-rendered by `scripts/generateSounds.mjs` (there's no Web Audio API / oscillator synthesis available in React Native, so these are baked offline instead of generated at runtime). `AudioPlayer` instances are created lazily on first play, not at module scope — creating them eagerly crashes during Expo Router's static web render pass, where no audio backend exists yet.

### Styling

NativeWind v4 — Tailwind classes on RN components, configured in `tailwind.config.js` (brand/coral/amber color scales, `font-sans`/`font-hanzi` families) and `babel.config.js`/`metro.config.js`. Dark mode follows the OS color scheme automatically (NativeWind syncs to `useColorScheme()` on its own); there's no manual dark-mode toggle code. `react-native-reanimated` v4 requires `react-native-worklets/plugin` in `babel.config.js` (not the older `react-native-reanimated/plugin` — the babel plugin moved packages in Reanimated v4).
