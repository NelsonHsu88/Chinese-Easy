# Terms of Service — evidence inventory

Audit of the repository on 2026-10-12 (branch `upgrade-sdk-57`). Each row ties a
statement in `terms.html` to the code that makes it true. Re-check any row whose
file changes; the Terms are only as accurate as this table.

## Service and audience

| Finding | Evidence | Terms § |
|---|---|---|
| Mandarin learning app: FSRS review, dictionary, stroke writing, graded stories with narration, pronunciation practice | `README.md` "What it does"; `src/lib/srs.ts`; `src/data/stories.ts:3` | 3 |
| 106,617 searchable words (25,180 learning + 81,437 lookup) | `README.md`; CLAUDE.md "Word data" | landing page |
| Both scripts supported throughout | `settings.script`; `src/lib/textSegmentation.ts` | 3 |
| Lessons and My Town are hidden (`false`) — not described | `src/lib/features.ts:22,29` | — |
| Audience is 13+, not child-directed; no birth date collected | `src/lib/ads/adConfig.ts:83-121` | 2 |
| iOS, Android and a web build (`web.output: static`) | `app.json` | 1 |

## Accounts and authentication

| Finding | Evidence | Terms § |
|---|---|---|
| Account optional — "Skip" on the script page jumps past the account step to the placement test | `src/screens/Onboarding.tsx:111` (step order), `:472`, `:671` | 4 |
| Guest progress lives in its own device namespace | `src/screens/settings/General.tsx:50` | 4, 14 |
| Apple sign-in (iOS, ID token) | `src/context/AuthContext.tsx:286-287`; `app.json` `usesAppleSignIn` | 4 |
| Google sign-in (OAuth via browser) | `AuthContext.tsx:382-402` | 4 |
| Email + password, minimum 8 characters | `src/lib/passwordRules.ts:7` | 4 |
| Email confirmation / secure email change (Supabase dashboard settings) | `supabase/README.md` "Settings that live in the dashboard" | 4 |
| CAPTCHA (Cloudflare Turnstile) on sign-up, sign-in, reset | `src/components/auth/Captcha.tsx:18-25` | 4, 6, 12 |
| Session stored as a credential in SecureStore | `src/lib/secureSessionStore.ts` | (Privacy Policy) |

## Data, progress and deletion

| Finding | Evidence | Terms § |
|---|---|---|
| Cloud sync is off; progress is on-device only, nothing pushed | `src/lib/features.ts:30-46`; `supabase/README.md` "Nothing in the app reads or writes these tables yet" | 5 |
| Profile name, email and photo saved to local settings; photo copied into the app's document directory | `src/components/profile/EditProfileSheet.tsx:106`; `src/lib/avatarPhoto.ts:18-22` | 5 |
| Delete account in Settings → General, confirmation copy "permanently deletes… It can't be undone" | `General.tsx:274-342` | 14 |
| Server deletes the auth user; tables cascade | `supabase/functions/delete-account/index.ts:9-17,65` | 14 |
| Local namespace of a deleted account is purged | `AuthContext.tsx:449`; `src/lib/storage.ts:60-70` | 14 |
| Server-side size and row-count limits | `supabase/migrations/0003_constraints.sql:40-60`; `0004_row_limits.sql:9,60` | 6 |
| No in-app suspension/ban mechanism (dashboard only) | absence — no ban/suspend code in `src/` or `supabase/` | 14 (reviewer note) |

## Money: subscription and ads

| Finding | Evidence | Terms § |
|---|---|---|
| Subscription removes ads only; benefits list | `src/screens/Subscribe.tsx:72-82` | 8 |
| Monthly and yearly plans; reference prices $3 / $15 | `src/lib/subscription.ts:186-204` | 8 (prices deliberately omitted) |
| Billing through App Store / Google Play; renews automatically; cancel in store | `Subscribe.tsx:232-233`; `subscription.ts:171-178, 276-292` | 8 |
| Restore purchases | `Subscribe.tsx:310,404`; `subscription.ts:262-274` | 8 |
| **No store connected yet** — production purchase returns `unavailable` | `subscription.ts:9-36, 250-260`; `Subscribe.tsx:236` | reviewer note |
| No free trial configured | absence in `subscription.ts` | 8 placeholder |
| Learning never gated behind ads or payment | `src/lib/ads/rewarded.ts:19-22`; `adConfig.ts:130-150` | 3, 7 |
| Banner placements: dashboard, dictionary, books, challenges | `adConfig.ts:14`; `Dashboard.tsx:286`, `Dictionary.tsx:614`, `Books.tsx:274`, `Challenges.tsx:486` | 7 |
| Interstitials only after review session / story completion; frequency caps | `adConfig.ts:30-61` | 7 |
| No ads in drills, writing, reader, onboarding, placement, subscribe | `adConfig.ts:130-150` | 7 |
| G-rated ad content ceiling | `adConfig.ts:128` | 7 |
| UMP consent then ATT on iOS | `src/lib/ads/consent.ts:16-24, 93-101` | 7 |
| Rewarded ads built but not called anywhere | `rewarded.ts:6-11` | not described |
| Ad-free users never initialise the SDK | `src/context/AdsContext.tsx:27` | 7 |

## Content, automated features and IP

| Finding | Evidence | Terms § |
|---|---|---|
| No generative AI / LLM anywhere | `grep -ri "openai\|anthropic\|gpt-\|gemini\|llm"` over `src/`, `package.json` — no code hits | 9 |
| Dictionary from CC-CEDICT (CC BY-SA 4.0) | `scripts/buildWordBank.mjs:32`; `src/screens/settings/About.tsx:24-25` | 9, 11 |
| Example sentences only from Tatoeba (CC BY 2.0 FR) | `buildWordBank.mjs:36-45` | 9, 11 |
| Tatoeba **not** credited in About | `About.tsx:22-37` | reviewer note |
| Unihan (Unicode licence), hanzi-writer (MIT) credited | `About.tsx:15-33` | 11 |
| Stroke data from `hanzi-writer-data` (derived from Make Me a Hanzi) | `scripts/buildHanziData.mjs:7,23` | 11 (placeholder) |
| Stories are original, hand-authored | `src/data/stories.ts:3` | 11 |
| Pronunciation: device recogniser + syllable scoring, pass at 0.7 | `src/lib/pronunciation.ts:26`; `src/lib/speechRecognition.ts:205-248` | 9 |
| Android routes recognition through Google's speech service | `app.json` `androidSpeechServicePackages` | 9 |
| Narration via device TTS (`expo-speech`) | `src/lib/speech.ts:1,77` | 9 |
| Placement test is a sampled estimate | `src/lib/placement.ts`; CLAUDE.md "Onboarding" | 9 |
| XP/challenge rewards are internal counters, nothing purchasable | `src/lib/challenges.ts:35,96-175`; `src/lib/townEconomy.ts` | 10 |
| Repo has no LICENSE file | `ls LICENSE*` — none; origin `github.com/NelsonHsu88/Chinese-Easy` | reviewer note |

## Not determinable from code (placeholders in the draft)

Operator legal name and entity type · contact, security and copyright emails ·
mailing address · governing law and venue (California assumed) · liability floor
(US$50 assumed) · notice period for changes (30 days assumed) · arbitration
(deliberately omitted) · effective date · free-trial terms (none today).
