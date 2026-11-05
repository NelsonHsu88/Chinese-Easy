# CLAUDE.md

Guidance for Claude Code in this repo. This file holds the rules that matter on most tasks. Detail lives in `docs/claude/`; **read the matching file before working in that area**:

- `docs/claude/architecture.md`: full routing, state/auth, styling and design-system notes, what each test pins
- `docs/claude/screens.md`: per-screen notes (launch intro, learning loader, celebration, Home, Onboarding, Challenges, Basics, Level test, New Words, Dictionary, Profile/Settings, Subscription, Tour, Books/reader, Speaking, example sentences)
- `docs/claude/review.md`: Review hub, FSRS product rules, Mixed Drills, flashcard reveal, session end
- `docs/claude/word-data.md`: word bank tiers, example sentences, definitions/notes, search ranking, radicals, story segmentation/script conversion, HanziStage
- `docs/claude/assets.md`: every `scripts/` asset/data pipeline (art croppers, launch/loading video, word bank builders, sounds)

## Commands

```
npm install
npm run start | android | ios | web   # expo start
npx tsc --noEmit                 # verify step: run after every change
npm test                         # src/**/__tests__/*.test.ts via tsx
npx expo-doctor
npm run check:env production
```

Tests (`src/lib/__tests__/`) cover srs (**every test fixes its own clock**), placement, mixedDrills, exampleSentences, narration, basics, levelTest, multipleMeanings, search, tour, newWordsPool, weakWords (Weak words / Mistakes). Everything else is untested. `npm run lint` is dead.

A type-check is not a compile: NativeWind/Babel errors and bad `require` paths only show in Metro. With the dev server up: `curl -s -o /dev/null -w "%{http_code}" "http://localhost:8081/src/screens/Dictionary.bundle?platform=web&dev=true&minify=false"` (200 = compiled). `tsc` skips the JS template in `HanziStage/writerHtml.ts`; extract its `<script>` and `node --check` it.

**Dependencies:** Expo **SDK 58** (RN 0.88, React 19.3). Use `npx expo install` / `npx expo install --fix -- --legacy-peer-deps`. RN 0.88 removed `InteractionManager`; use `runAfterInteractions` from `lib/afterInteractions.ts`. Ref types are `*Instance` (`ScrollViewInstance`, `ViewInstance`); WebView refs are `ComponentRef<typeof WebView>`. `expo-speech-recognition` and `react-native-google-mobile-ads` are bumped by hand. Asset scripts are `node scripts/<name>.mjs`, outputs committed (see assets.md); **run `compressImages.mjs` after any art script**; **after any word bank rebuild run `npx tsx scripts/repairExampleSenses.mjs` then `node scripts/applyHskLevels.mjs`** (levels are HSK 3.0; see word-data.md).

## Architecture

React Native + Expo (iOS, Android, web): Duolingo-style Chinese app. **Both scripts supported everywhere** via `settings.script`; stories stored traditional, converted for display only. Feature flags in `src/lib/features.ts`: `lessons` and `myTown` are **false** (screens compile but are unreachable; grep the flag to re-enable); `interstitialAds` is **false** (no pop-up ads shown or fetched; banners unaffected).

### Routing (Expo Router, `src/app/`)

Route files only re-export screens from `src/screens/`; edit the screen. `_layout.tsx` wraps `AppProvider`, holds the splash until `ready`, redirects to `/onboarding`, mounts `TourOverlay`.

- Tabs: Dashboard, Learn (`lessons-tab`), Review (`review-tab`), Dictionary (`dictionary-tab/`, a nested Stack), Profile (`profile-tab`). **Never name a tab `review.tsx`/`dictionary`** (collides with standalone routes, navigator loops). Link to Review with `router.navigate('/review-tab')`, never `push`.
- **Never give the dictionary-tab details `presentation: 'modal'`.**
- Standalone routes sit over the tabs (`/review-session`, `/word/[id]`, `/character/[c]`, `/books`, `/story/[id]`, `/settings/*`, …). `useInDictionaryTab()` tells tab vs standalone word pages apart.
- **Never a bare `router.back()`** on a back arrow: `router.canGoBack() ? router.back() : router.replace('<parent>')`.
- Stale `.expo/types/router.d.ts`: kill Metro, delete `.expo/types`, restart. Don't cast.

### State (`src/context/AppContext.tsx`, `useApp()`)

One global store hydrated from AsyncStorage. **A new persisted field needs** an entry in `hydrate()`'s `Promise.all`, the `skipNextSave` ref, and a guarded save `useEffect` (copy `xp`). Settings fields ride the settings blob and backfill for free. `src/lib/` splits pure logic from platform bridges; `devClock.ts` overrides "now".

- **Supabase session lives in `secureSessionStore.ts`, not AsyncStorage** (chunked, web falls back, guard `Platform.OS` before any SecureStore call, failures resolve `null`).
- Auth (`context/AuthContext.tsx`): Google, Apple (iOS), email+password. CAPTCHA-protected calls take `captchaToken` from `useCaptcha()`.
- `speechRecognition.ts` `require`s its native module inside `try`; a static import crashes Expo Go.

### Key product rules (detail in review.md / word-data.md)

- `src/lib/srs.ts` is **the only module importing `ts-fsrs`**. **Again is the only failure; Hard is a pass.** The interval shown on a button is the one committed (`previewReview` → `gradeCard`). `toFsrs` clamps `last_review` to now. `ReviewSession` builds its step list once at mount.
- Learning surfaces show `shortGloss(word)`, not `word.definition`. Cloze finds words **by entry id via `segmentText`**, never substring. Saved words/cards store ids only.
- **Segment first, convert second**; script conversion never changes character count.
- HanziStage outline toggles via the `outline` message, **never via `initKey`**. `hanziWriterEngine.ts` is generated: don't edit.

## Animation traps

1. **RN `Animated`, not Reanimated** (Reanimated doesn't drive on web). `useNativeDriver: Platform.OS !== 'web'`.
2. **NativeWind ignores `className` on `Animated.View`**: wrap a plain `View`.
3. An animated `transform` replaces the whole array; compose static transforms in.
4. **Every non-native animation needs a `setTimeout` backstop** forcing its end value, covering its completion callback too.
5. `useEntranceRun` skips the first focus; focus-replaying entrances park on blur.
6. **Android fades children's `elevation` shadows late**: use `ShadowSurface`/`useRevealedShadow` (`components/shadowReveal.tsx`).
7. Collapsing rows: per-row `marginBottom`, not `gap`. Never gate an animation on `onLayout` (web).

Engines: `dashboard/entrance.tsx` (`useEntranceRun`, `useReveal`, `useTypewriter`), `settings/transition.tsx` (`useScreenTransition`, `leave(go)`).

## Native-only traps (web looks fine)

- **Never give a `Pressable` a style function**; use `onPressIn/Out` and style an inner `View`.
- **Nested Pressables double-fire on web**: `PressClaim`/`usePressClaim()`. A `disabled` Pressable on web swallows clicks; drop `onPress` instead.
- `pointerEvents` on `Text` is ignored on native; wrap a `View`.
- **`w-full` in a content-sized parent inflates it on native**: `alignSelf: 'stretch'`.
- **`shadow-*` classes draw nothing on Android**: use token objects with `elevation`. **A `shadow-*` class in a conditional `className` crashes native**.
- `adjustsFontSizeToFit` is iOS-only. Hanzi beside Latin in a centred row needs `includeFontPadding: false`.
- `tabBarStyle.height` must stay `TAB_BAR_BODY + Math.max(insets.bottom, 6)`.
- Never move an animated binding between views mid-gesture.

## Styling

NativeWind v4; **Nunito is the only Latin typeface, one font family per weight** (`NunitoBold`; `fontWeight` alone does nothing). Hanzi via `hanziFont(script, weight)`.

- **Every button is `RaisedButton`** (`dashboard/parts.tsx`) with a face/shoulder pair from the screen's tokens. **Every back control is `components/BackArrow.tsx`.**
- Each redesigned screen owns a `tokens.ts`, **the only place colour literals belong**. All light-only. Page backgrounds are pure white; card fills that art sits on must stay exactly as sampled (see assets.md).
- **Cap full-screen columns at 430 and centre**; fill height (`flexGrow: 1`, `FlexGap`), don't cap it.
- Sound: **await the seek before `play()`**. Haptics: `tick` browse, `tap` small, `thunk` weight, `thud` gong only.
