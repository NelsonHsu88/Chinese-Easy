# Architecture, routing, state, styling (full notes)

Detail split out of CLAUDE.md. Read when touching navigation, the global store, auth, or design tokens.

## Overview

React Native + Expo (iOS, Android, web via react-native-web): a Duolingo-style Chinese app — FSRS vocab review, stroke-order writing, reading library, lessons, XP/streaks/challenges. **Both scripts are supported everywhere** via `settings.script`; stories are stored traditional and converted for display only.

**Feature flags** (`src/lib/features.ts`): `lessons` and `myTown` are both **false** — those screens compile but are unreachable. XP still accrues. The Lessons tab is relabelled "Learn". Gates are scattered at each entry point on purpose; `grep` the flag name to re-enable. `isRouteEnabled`/`safeRoute` degrade links.

`expo-*` packages are numbered to match the SDK (`expo-font ~58.x` is correct). `npx expo install --fix -- --legacy-peer-deps` is needed because the datetimepicker's optional `react-native-windows` peer breaks npm otherwise.

## Routing

Expo Router rooted at `src/app/`; route files only re-export screens from `src/screens/` — edit the screen. `_layout.tsx` wraps `AppProvider`, loads fonts, holds the splash until `ready`, redirects to `/onboarding`, mounts `TourOverlay` and `useSubscribePrompt`, and calls `configureAudioSession()`.

- `(tabs)/`: Dashboard, Learn (`lessons-tab` → `Learn.tsx`, never scrolls, owns `WritingGuideModal`), Review (`review-tab`), Dictionary, Profile (`profile-tab` → `Profile.tsx`, Duolingo-style; its gear opens Settings). **Never name a tab `review.tsx`/`dictionary`** — it collides with standalone routes and the navigator loops. Link to Review with `router.navigate('/review-tab')`, never `push` (stacks a second tab bar).
- `(tabs)/dictionary-tab/` is a nested `Stack` (index, `word/[wordId]`, `character/[character]`) so Back pops to browse and filters survive. **Never give those details `presentation: 'modal'`** — it hoists them out and Back falls to the first tab.
- Standalone routes over the tabs: `/review-session`, `/onboarding`, `/new-words`, `/my-words`, `/word/[id]`, `/character/[c]`, `/books`, `/stories`, `/story/[id]`, `/challenges`, `/radicals`, `/subscribe`, `/settings/*`, etc. My Words opens the standalone `/word/…` (pushing the tab's route pops My Words); `useInDictionaryTab()` tells them apart.
- **Never a bare `router.back()`** on a back arrow — deep links and web reloads have nothing to pop. Use `router.canGoBack() ? router.back() : router.replace('<parent>')`. (`LessonPlayer`, `Lessons`, `MyTown`, `Radicals` aren't guarded yet.)
- Stale `.expo/types/router.d.ts`: kill Metro, delete `.expo/types`, restart — don't cast.

## State (`src/context/AppContext.tsx`, `useApp()`)

Single global store, hydrated from AsyncStorage on mount (`ready` gates the splash). **A new persisted field needs**: an entry in `hydrate()`'s `Promise.all`, the `skipNextSave` ref, and a guarded save `useEffect` — copy `xp`/`completedLessonIds`. Settings fields ride in the settings blob (`{...DEFAULT_SETTINGS, ...loaded}`) and backfill for free. Notable fields: `newWordHistory` (persisted skips — a screen-local Set brought skipped words back every visit), `favoriteWordIds`, `matchHistory`, `listeningHistory`, `reviewLog` (capped 5,000), `tour`.

`src/lib/` splits pure logic (`srs`, `selectors`, `dictionary`, `definitions`, `textSegmentation`, `placement`, `pronunciation`, `narration`, `pagination`, `challenges`, …) from platform bridges (`storage`, `secureSessionStore`, `speech`, `speechRecognition`, `haptics`, `sound`). `devClock.ts` overrides "now" for streak/daily logic.

- **The Supabase session lives in `secureSessionStore.ts`, not AsyncStorage** — it's a credential. Values are chunked (SecureStore caps 2048 bytes; part count written last), web falls back to AsyncStorage (guard `Platform.OS` *before* any SecureStore call), and every failure resolves `null`. `app.json` sets `allowBackup: false`.
- **Auth** (`context/AuthContext.tsx`): Google (OAuth, PKCE), Apple (iOS only, native sheet → `signInWithIdToken` with a SHA-256 nonce), email + password (min 8, `lib/passwordRules.ts`). Every call Supabase CAPTCHA-protects (sign-up, password sign-in, Apple, reset) takes `captchaToken` from `useCaptcha()` (`components/auth/Captcha.tsx`, inert until `EXPO_PUBLIC_TURNSTILE_SITE_KEY` is set — enable it in Supabase at the same time). Emailed links land on `/auth/callback` or `/auth/reset-password`, which exchange the code on native themselves; the root layout exempts `/auth/*` from the onboarding redirect. Dashboard-only settings are listed in `supabase/README.md`.
- `speechRecognition.ts` `require`s its native module inside `try` — a static import crashes Expo Go on launch. `mandarinLocale.ts` ranks Mandarin tags (`zh-CN` first) and rejects Cantonese, which engines otherwise fall back to.

## Styling and design systems

NativeWind v4 (`tailwind.config.js`), dark mode follows the OS; Reanimated v4 needs `react-native-worklets/plugin` in Babel. **Nunito is the only Latin typeface** (Lora, Inter and Nunito Sans were folded into it); **fonts are one family per weight** (`NunitoBold`, `NunitoSemiBoldItalic`, `NotoSerifTCSemiBold`, …) — `fontWeight` alone does nothing. Hanzi families: `font-hanzi*`, `-tc*`, `-sc*`, `-sans*`. Fonts via `hanziFont(script, weight)`, which spells class names as literals (Tailwind scans source); never rely on `font-hanzi`'s fallback chain for script-following text.

**Every button is one object: `RaisedButton`** (`dashboard/parts.tsx` — `LiftedFace` in a `PressableScale`: the face sinks onto a darker shoulder and springs back). New buttons use it with a face/shoulder pair from the screen's tokens; bare text links, bare icons, cards and list rows are not buttons. **The one exception is the back arrow: every back control is `components/BackArrow.tsx`** — a flat grey chevron (`dashColors.backArrow`), never a raised disc (SS1025). Redesigned screens each own a `tokens.ts`, **the only place colour literals belong**. Ivory-and-jade family: `dashboard/tokens.ts` → `settings/`, `review/` → `challenges/`, `listening/`, `flashcard/`, `myWords/`; the dictionary's `dict-*` Tailwind scale is the same family. Separate languages: `onboarding/`, `writingGuide/`, `book/` + `read-*`. All are **light-only**.

`PressableScale` takes layout on `wrapperStyle`; `PressScale`'s `style` goes on the animated view (a flex share there does nothing — wrap it). `elevation` also decides draw order on Android (hence `LiftedFace` puts it on the face too). A `shadow-*` class toggled inside a conditional `className` crashes native ("Couldn't find a navigation context", nativewind#1557) — vary colour only; put shadows on `style` (`CHIP_SHADOW`). An absolutely-filled empty `View` is still a hit target.

**Cap every full-screen column at 430 and centre it** (`*_CONTENT_MAX`); size art against `Math.min(width, MAX)`. **Fill height, don't cap it**: `flexGrow: 1` on the ScrollView content and column, `FlexGap` (min is basis *and* `minHeight`) for gaps, one deliberate slack absorber per screen.

Sound: `sound.ts` plays pre-rendered WAVs via expo-audio, players created lazily; **await the seek before `play()`** or effects play once per launch. Loudness lives in `generateSounds.mjs`'s `PEAKS`. Haptics vocabulary: `tick` browse, `tap` small, `thunk` weight, `thud` gong only; no-op on web.

## Tests (what each pins)

`srs.test.ts` (FSRS; every test fixes its own clock — FSRS seeds fuzz from the review instant), `placement.test.ts` (no option is another question's answer; word set varies per attempt), `mixedDrills.test.ts` (Match only above five words, board rotation, gap identity), `exampleSentences.test.ts` (sentences checked through `segmentText`), `narration.test.ts` (highlight holds until the voice starts, rests at punctuation, never steps back), `basics.test.ts` (simplified learner sees no traditional-only hanzi; zhuyin learner sees no pinyin outside the lessons that teach it), `levelTest.test.ts` (twenty distinct next-level words, new set per attempt, two mistakes allowed), `multipleMeanings.test.ts` (on 說/被/打, off synonym lists like 我), `search.test.ts` (English hits outrank coincidental pinyin).
