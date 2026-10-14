# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Commands

```
npm install                      # install deps
npm run start | android | ios | web   # expo start (scan the QR with Expo Go)
npx tsc --noEmit                 # type-check: the general verify step, run after every change
npm test                         # src/**/__tests__/*.test.ts on Node's runner via tsx
npx expo-doctor                  # SDK/dependency/config consistency
npm run check:env production     # assert a release build's env is present and holds no secret
```

Tests cover where quiet mistakes are costly: `srs.test.ts` (FSRS; **every test fixes its own clock, none reads real time** — FSRS seeds fuzz from the review instant), `placement.test.ts` (no option is another question's answer; word set varies per attempt), `mixedDrills.test.ts` (Match only above five words, board rotation, gap identity), `exampleSentences.test.ts` (sentences checked through the app's own `segmentText`). Everything else is untested. `npm run lint` is a dead leftover (eslint isn't installed).

A type-check is not a compile — NativeWind/Babel errors and bad `require` paths only surface in Metro. With the dev server up, check one module: `curl -s -o /dev/null -w "%{http_code}" "http://localhost:8081/src/screens/Dictionary.bundle?platform=web&dev=true&minify=false"` (200 = compiled; says nothing about looks). `tsc` doesn't cover the JS template in `HanziStage/writerHtml.ts` — extract the `<script>` body and `node --check` it.

**Dependencies:** target **Expo SDK 57**; use `npx expo install`, and `npx expo install --fix -- --legacy-peer-deps` (the datetimepicker's optional `react-native-windows` peer breaks npm otherwise). SDK 57 renumbered `expo-*` packages to match the SDK (`expo-font ~57.x` is correct). `expo-speech-recognition` and `react-native-google-mobile-ads` sit outside the matrix — bump by hand.

### Asset pipeline (`scripts/`)

Plain `node scripts/<name>.mjs`, run by hand; outputs are committed. Most read from the gitignored `Photos for Reference/` (~225MB source art), so they can't run on a fresh clone.

- **Art croppers** (`process*Art.mjs`: Home, Learn, NewWords, Library, Settings, Review, MyWords, Challenges, Listening, Flashcard, SessionEnd, OnboardingRedesign) cut painting out of Beta 2.1 mockups and key it into alpha against the surface it sits on. Each **checks the mockup's pixel size** (usually 941×1672; Flashcard 705×1179; Learn 995×1580; Home 863×1822) and keys against colours sampled from it. **Page backgrounds are pure white by request** (every screen's `background`/`page` token, `canvas`, `dict.page`, `read.cream`) — the art was keyed against near-white cream, so it sits on white without a visible halo. Card fills the art sits on (`homeSurfaces`, `revColors.card`, `dashColors.card`, `fcColors.card`, `listenColors.*` cards) **must stay exactly as sampled**, or re-run the script. `processHomeArt.mjs` also diffuses text and controls out of its crops (`inpaint`), so the screen can draw its own on top.
- **Trim-and-resize** (`processDashboardArt`, `processOnboardingArt`, `processSubscriptionArt`, `processTourArt`): sources carry real alpha; the trim matters because art is positioned against card edges and a transparent margin silently becomes an offset. Tour checks its sheet is 1536×1024; `components/tour/art.ts` and `RedesignArt.tsx` carry asset sizes to update on re-run.
- `processAppIcon.mjs` — app icon set (`assets/images/icon.png`, adaptive foreground/background/monochrome, favicon) from `SS 1012 New App Icon.png`.
- `compressImages.mjs` — palette-quantises every PNG under `src/assets/images` (24.8MB → 6.3MB). **Re-run after any art script.**
- `buildWordBank.mjs` → both word tiers from CC-CEDICT in `.wordbank-data/`; **always follow with `repairExampleSenses.mjs`** (see Word data). `buildHanziData.mjs` (stroke data, tier 1, both scripts), `buildRadicalIndex.mjs` and `buildCharacterPinyin.mjs` (Unihan) — re-run when the bank grows.
- `generateSounds.mjs` (WAV effects), `embedHanziWriterEngine.mjs` (after bumping `hanzi-writer`). `mergeHanziData`, `processReviewIcons`, `buildStoryCovers` are superseded/unused.
- `assertBuildEnv.mjs` runs as `eas-build-pre-install`: refuses a preview/production build with missing `EXPO_PUBLIC_SUPABASE_*` or any `EXPO_PUBLIC_*` that looks like a `service_role` key. The runtime check in `lib/supabase.ts` is deliberately soft (signed-out, not crash), which is wrong for a release.

## Architecture

React Native + Expo (iOS, Android, web via react-native-web): a Duolingo-style Chinese app — FSRS vocab review, stroke-order writing, reading library, lessons, XP/streaks/challenges. **Both scripts are supported everywhere** via `settings.script`; stories are stored traditional and converted for display only.

**Feature flags** (`src/lib/features.ts`): `lessons` and `myTown` are both **false** — those screens compile but are unreachable. XP still accrues. The Lessons tab is relabelled "Learn". Gates are scattered at each entry point on purpose; `grep` the flag name to re-enable. `isRouteEnabled`/`safeRoute` degrade links.

### Routing

Expo Router rooted at `src/app/`; route files only re-export screens from `src/screens/` — edit the screen. `_layout.tsx` wraps `AppProvider`, loads fonts, holds the splash until `ready`, redirects to `/onboarding`, mounts `TourOverlay` and `useSubscribePrompt`, and calls `configureAudioSession()`.

- `(tabs)/`: Dashboard, Learn (`lessons-tab` → `Learn.tsx`, never scrolls, owns `WritingGuideModal`), Review (`review-tab`), Dictionary, Settings. **Never name a tab `review.tsx`/`dictionary`** — it collides with standalone routes and the navigator loops. Link to Review with `router.navigate('/review-tab')`, never `push` (stacks a second tab bar).
- `(tabs)/dictionary-tab/` is a nested `Stack` (index, `word/[wordId]`, `character/[character]`) so Back pops to browse and filters survive. **Never give those details `presentation: 'modal'`** — it hoists them out and Back falls to the first tab.
- Standalone routes over the tabs: `/review-session`, `/onboarding`, `/new-words`, `/my-words`, `/word/[id]`, `/character/[c]`, `/books`, `/story/[id]`, `/challenges`, `/radicals`, `/subscribe`, `/settings/*`, etc. My Words opens the standalone `/word/…` (pushing the tab's route pops My Words); `useInDictionaryTab()` tells them apart.
- **Never a bare `router.back()`** on a back arrow — deep links and web reloads have nothing to pop. Use `router.canGoBack() ? router.back() : router.replace('<parent>')`. (`LessonPlayer`, `Lessons`, `MyTown`, `Radicals` aren't guarded yet.)
- Stale `.expo/types/router.d.ts`: kill Metro, delete `.expo/types`, restart — don't cast.

### State (`src/context/AppContext.tsx`, `useApp()`)

Single global store, hydrated from AsyncStorage on mount (`ready` gates the splash). **A new persisted field needs**: an entry in `hydrate()`'s `Promise.all`, the `skipNextSave` ref, and a guarded save `useEffect` — copy `xp`/`completedLessonIds`. Settings fields ride in the settings blob (`{...DEFAULT_SETTINGS, ...loaded}`) and backfill for free. Notable fields: `newWordHistory` (persisted skips — a screen-local Set brought skipped words back every visit), `favoriteWordIds`, `matchHistory`, `listeningHistory`, `reviewLog` (capped 5,000), `tour`.

`src/lib/` splits pure logic (`srs`, `selectors`, `dictionary`, `definitions`, `textSegmentation`, `placement`, `pronunciation`, `narration`, `pagination`, `challenges`, …) from platform bridges (`storage`, `secureSessionStore`, `speech`, `speechRecognition`, `haptics`, `sound`). `devClock.ts` overrides "now" for streak/daily logic.

- **The Supabase session lives in `secureSessionStore.ts`, not AsyncStorage** — it's a credential. Values are chunked (SecureStore caps 2048 bytes; part count written last), web falls back to AsyncStorage (guard `Platform.OS` *before* any SecureStore call), and every failure resolves `null`. `app.json` sets `allowBackup: false`.
- **Auth** (`context/AuthContext.tsx`): Google (OAuth, PKCE), Apple (iOS only, native sheet → `signInWithIdToken` with a SHA-256 nonce), email + password (min 8, `lib/passwordRules.ts`). Every call Supabase CAPTCHA-protects (sign-up, password sign-in, Apple, reset) takes `captchaToken` from `useCaptcha()` (`components/auth/Captcha.tsx`, inert until `EXPO_PUBLIC_TURNSTILE_SITE_KEY` is set — enable it in Supabase at the same time). Emailed links land on `/auth/callback` or `/auth/reset-password`, which exchange the code on native themselves; the root layout exempts `/auth/*` from the onboarding redirect. Dashboard-only settings are listed in `supabase/README.md`.
- `speechRecognition.ts` `require`s its native module inside `try` — a static import crashes Expo Go on launch. `mandarinLocale.ts` ranks Mandarin tags (`zh-CN` first) and rejects Cantonese, which engines otherwise fall back to.

### Review and FSRS

`Review.tsx` is the hub; drills run in `ReviewSession.tsx` (`/review-session?mode=flashcards|mixed|mistakes|full|quick`; `listening` aliases `mixed`), which **builds its step list once at mount** — grading mutates the deck. Close with `router.back()`.

`src/lib/srs.ts` is **the only module that imports `ts-fsrs`**. Product rules:
- **Again** is the only failure (lapse + remedial writing reps). **Hard is a pass** — never map a failed answer to Hard.
- **"I don't know" never reaches the scheduler**: it re-queues the step once per word per session (step `key` includes the index). Flashcard offers it only before the reveal.
- **The interval on a button is the one committed**: `previewReview` makes one `repeat()` call and `gradeCard` takes that object back — recomputing later lands on a different day because of fuzz. Listening passes no preview.
- Response time is analytics only (capped 60s). Config in `FSRS_CONFIG` (0.90 retention, not user-facing). Easy on a new word ≈ 3 days (`EASY_FIRST_INTERVAL_DAYS`, lowered weight, not overridden due date).
- `isCardDue` compares instants. **`toFsrs` clamps `last_review` to `now`** — a future stamp (migrated v1 cards, dev clock, clock correction) makes ts-fsrs throw `Invalid delta_t` and kills the drill.
- `SrsCard` is schema v2 (FSRS snake_case fields, ISO strings converted only in `srs.ts`). `migrateDeck` from v1 SM-2 preserves due dates and fabricates no history.

**Mixed Drills** (`lib/mixedDrills.ts`, `buildMixedSteps`) alternate Listening, Fill the Gap (`clozeFor` finds the word by **entry id via `segmentText`**, never substring; options match character count) and Match the Pairs (deck > 5 words; **never grades a card**; rotates via `matchHistory`). Standalone Mixed uses `dueCardsFor` (new cards included); `full`/`quick` use `listeningCardsFor`. "Can't listen now" pauses listening 30 real minutes (`listeningPausedUntil`, device key) and converts remaining listening steps to ungraded gaps. Listening options show **no pinyin before checking**. Verdict colours come from `onbVerdict` (gold = "I don't know").

`ReviewFlashcard.tsx` owns its screen. The reveal is one veil fade (a page-coloured view over everything) with the swap underneath — fading the cards themselves showed Android shadows first. HanziStage keys WebViews on the character and re-inits the writer on other changes. Remedial reps (`flashcard/PracticeRep.tsx`): last rep is from memory; auto-advance after `AUTO_NEXT_MS` through one guarded `next`. Session end screens are `components/sessionEnd/SessionEnd.tsx`.

### Word data

- **Tier 1** `importedWords.json` (25,180, frequency-ranked; SRS, browse, stroke data). **Tier 2** `lookupWords.json` (81,437, id prefix `lk-`, `hskLevel` 7 = "Rare"; search only, packed string split lazily, `warmLookup()` on Dictionary mount). `searchWords` ranks the tiers **in separate passes**; tier 2 only fills an unfilled page. `wordById` falls through to tier 2 so rare words in My Words survive hydrate.
- **Example sentences come from the corpus, never generated.** `repairExampleSenses.mjs` keeps a sentence only if the word survives as a token under the app's segmenter (both scripts keyed, matched by entry id) — re-run after **any** bank rebuild, since verdicts depend on bank composition.
- Learning surfaces show `shortGloss(word)` (one chosen sense, `senseScore`), not `word.definition`. `newWordsPool` gates on `isTeachableWord` (no names/surnames/abbreviations).
- Search ranking ladder is `SCORE` in `lib/dictionary.ts`: English tiers (exact sense > word > word-prefix > letters), ties by sense index → `contentRank` → `hskLevel`. Pinyin prefixes count only on syllable boundaries. Plurals folded on the query. Per-entry work cached in a `WeakMap`.
- Radicals: `radicals.ts` (99 taught), `kangxiRadicals.ts` (all 214, naming), `characterRadicals.json` (index). Screens call `radicalFor` only.

### Story text and script

**Segment first, convert second**: `segmentText(text, bank, displayScript)` matches canonical traditional text, then sets each segment's `display`. `TextSegment.text` = canonical (offsets), `display` = draw, `word` = identity. Conversion uses the matched entry's `simplified`, else `scriptConversion.json` (trad→simp only). **Conversion never changes character count** (the build enforces it) — narration offsets, pagination and progress all count canonical characters. The segmenter index holds both scripts, traditional inserted first. Fonts via `hanziFont(script, weight)`, which spells class names as literals (Tailwind scans source); never rely on `font-hanzi`'s fallback chain for script-following text.

### HanziStage (stroke writer)

`hanzi-writer` runs in a `react-native-webview`, one per character. `hanziWriterEngine.ts` is **generated** — don't edit. `writerHtml.ts` holds the DOM logic (quiz/demo lifecycle, stroke-placement animation in 1024-unit space, `strokeHint` → gong, `holdCharacterOnComplete` which must apply in **both** quiz and demo branches). Multi-character words hold each finished glyph `CHARACTER_HOLD_MS` (900; flashcards pass 300 via `characterHoldMs`). Stroke data: bundled `src/assets/hanziData.json` (tier 1, both scripts, ~15.8MB), CDN fallback otherwise. Tier 2 is excluded to keep size down; to shrink further, narrow the character set, don't go CDN-only.

## Animation traps

1. **Use RN `Animated`, not Reanimated** (Reanimated doesn't drive on web). `useNativeDriver: Platform.OS !== 'web'`; layout props can't use native.
2. **NativeWind ignores `className` on `Animated.View`** — wrap a plain `View` with the classes.
3. An animated `transform` replaces the whole array — compose static transforms in (`useReveal`'s `extraTransform`).
4. **Every non-native animation needs a `setTimeout` backstop** forcing its end value — rAF stops in hidden browser tabs. The backstop must also cover whatever the completion **callback** does (`slideForward` once froze the session).
5. `useEntranceRun` skips the first focus (mount already plays it). Entrances that replay on focus **park themselves on blur**, as does `useScrollToTopOnFocus`.
6. **Android fades children's `elevation` shadows late** — a shadowed card inside a fade shows its shadow first. Use `ShadowSurface` / `useRevealedShadow` under a `ShadowRevealProvider` (`components/shadowReveal.tsx`); shadows share `SHADOW_EASING`/`shadowDuration()`.
7. For collapsing rows use per-row `marginBottom`, not container `gap`. On web, `onLayout` doesn't always fire — never gate an animation on it.

Engines: `dashboard/entrance.tsx` (`useEntranceRun`, `useReveal`, `useTypewriter`) and `settings/transition.tsx` (`useScreenTransition` — rises from below, `leave(go)` plays the exit *then* navigates; `useLeave()` for nested children).

## Native-only traps (web looks fine)

- **Never give a `Pressable` a style function** — dropped on native. Track press with `onPressIn/Out` and style an inner `View`.
- **Nested Pressables double-fire on web** — use `PressClaim`/`usePressClaim()` (`dashboard/parts.tsx`). A `disabled` Pressable on web swallows clicks inside it; drop `onPress` instead.
- **`pointerEvents` on a `Text` is ignored on native** — put it on a wrapping `View`. An absolutely-filled empty `View` is still a hit target.
- **`w-full` inside a content-sized parent inflates it on native** — use `alignSelf: 'stretch'`.
- Hanzi beside Latin text in a centred row needs `includeFontPadding: false` on both.
- **`shadow-*` classes draw nothing on Android** — use token objects with `elevation` (`dashShadow`, `revShadow`, …). `elevation` also decides draw order (hence `LiftedFace` puts it on the face too).
- **A `shadow-*` class toggled inside a conditional `className` crashes native** ("Couldn't find a navigation context", nativewind#1557). Vary colour only; put shadows on `style` (`CHIP_SHADOW`).
- `adjustsFontSizeToFit` is iOS-only — derive CJK sizes from width / char count.
- `PressableScale` takes layout on `wrapperStyle`; `PressScale`'s `style` goes on the animated view (a flex share there does nothing — wrap it).
- `tabBarStyle.height` must stay `TAB_BAR_BODY + Math.max(insets.bottom, 6)` (`lib/tabBar.ts`) or the bar sits under Android's nav.
- Never move an animated binding between views mid-gesture or at a turn's end (Android restores defaults for a frame — the book's page-flip flash).

## Styling and design systems

NativeWind v4 (`tailwind.config.js`), dark mode follows the OS; Reanimated v4 needs `react-native-worklets/plugin` in Babel. **Fonts are one family per weight** (`NunitoBold`, `NotoSerifTCSemiBold`, …) — `fontWeight` alone does nothing. Hanzi families: `font-hanzi*`, `-tc*`, `-sc*`, `-sans*`.

Redesigned screens each own a `tokens.ts`, **the only place colour literals belong**. Ivory-and-jade family: `dashboard/tokens.ts` → `settings/`, `review/` → `challenges/`, `listening/`, `flashcard/`, `myWords/`; the dictionary's `dict-*` Tailwind scale is the same family. Separate languages: `onboarding/`, `writingGuide/`, `book/` + `read-*`. All are **light-only**.

**Cap every full-screen column at 430 and centre it** (`*_CONTENT_MAX`); size art against `Math.min(width, MAX)`. **Fill height, don't cap it**: `flexGrow: 1` on the ScrollView content and column, `FlexGap` (min is basis *and* `minHeight`) for gaps, one deliberate slack absorber per screen.

Sound: `sound.ts` plays pre-rendered WAVs via expo-audio, players created lazily; **await the seek before `play()`** or effects play once per launch. Loudness lives in `generateSounds.mjs`'s `PEAKS`. Haptics vocabulary: `tick` browse, `tap` small, `thunk` weight, `thud` gong only; no-op on web.

## Screens — what to know

- **Home** (`Dashboard.tsx`, built to "SS 1012 New Home Redesigned UI"): `HomeHero` + `HomeCards` (Review and the word on offer side by side via `DashboardCard stretch`, then Daily Challenges and This Week), all Lora, tokens in the `home*` section of `dashboard/tokens.ts`. Art is placed by the mockup's own crop boxes (`homeArt`/`homeRefCards` in `art.ts`) scaled to the real width — move a crop in the script and the box must move with it. The "Earn reward" pill sits on the patch in-painted out of the gift crop. Cards that hold their own link pills pass `accessibilityRole="none"` (nested `<button>` on web). Buttons are `LiftedFace` (shoulder + face). This Week uses calendar weeks (`currentWeekActivity`).
- **Onboarding** (`Onboarding.tsx`): seven pages from `STEP_ORDER`; `OnbShell` = top bar / flexible middle / stable footer. Script page is second so `settings.script` exists before the placement test. Placement test is multiple choice (meaning/listening/cloze), sampled per attempt by seed, distractors from untested words nearest in level and excluded by rendered label; it deliberately keeps its classic card styling. `OnbPageTransition` mounts the arriving page underneath before the old one slides off; the spare slot needs `pointerEvents="none"`.
- **Challenges**: read targets via `challengeTarget`, lists via `offeredChallenges`. Claiming collapses and re-shows the card at `CLAIMED_OPACITY`. `charactersWritten`/`listeningAnswered` are device-only — `mergeDailyActivity` must carry them through.
- **New Words**: swipe left = skip, right = previous; neighbours pre-mounted and hidden by a wrapper's opacity; ignore taps for 80ms after a drag. No custom-word entry in the UI any more.
- **Dictionary**: built to its Beta 2.1 reference without brand block; hairlines, no shadows; Word to discover is `wordToDiscover`. Haptics on release when something changed; sound only for adding a word.
- **Settings**: hub + seven screens under `src/screens/settings/`. **`settings/developer` is `__DEV__`-only in two places** (hidden row in `General.tsx` *and* a `Redirect` guard above every hook in `Developer.tsx`) — its controls rewrite progress and entitlement. Nothing requests a native permission on mount.
- **Subscription**: no IAP package; `lib/subscription.ts` takes a `registerStore(adapter)`. Never grant on a button press — only from the store's outcome. `isAdFree` is the single source of truth (no `isPremium`).
- **Tour** (`components/tour/`, `lib/tour.ts`): four steps, offered not imposed, never resumed mid-step; spotlight is a wide border, targets via `<TourTarget id>`.
- **Books / reader**: three level shelves sized to fit; `BookCover` fades in once room and cover images load. Reader is `PageFlip` pages, each with its own turn value bound once; turn decided by distance (`TURN_DISTANCE`) or flick; PanResponder zeroes `dx` at grant, so use `claimedDx`. Narration (`lib/narration.ts`) rebuilds a timeline from `onBoundary` offsets; prefer local voices (Chrome remote voices fire no boundaries). Pagination (`lib/pagination.ts`) packs whole sentences; the book passes its own budget.
- **Speaking practice**: `gradePronunciation` compares syllables (initial 0.45 / final 0.40 / tone 0.15, `PASS_THRESHOLD` 0.7) — sound, not spelling.
- **Example sentences** render through `ReadingSentence.tsx` (per-word readings; `settings.showReadings` fades them without moving layout).
