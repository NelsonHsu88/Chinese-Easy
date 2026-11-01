# Review and FSRS

Detail split out of CLAUDE.md. Read when working in this area.

### Review and FSRS

`Review.tsx` is the hub; drills run in `ReviewSession.tsx` (`/review-session?mode=flashcards|mixed|mistakes|full|quick`; `listening` aliases `mixed`), which **builds its step list once at mount** — grading mutates the deck. Close with `router.back()`.

`src/lib/srs.ts` is **the only module that imports `ts-fsrs`**. Product rules:
- **Again** is the only failure (lapse + remedial writing reps). **Hard is a pass** — never map a failed answer to Hard.
- **"I don't know" on a flashcard is an Again**: offered only before the reveal, it shows the answer already marked Again (the Again tile plus one Continue, same row height), and Continue commits `onGrade('again')` — lapse + remedial writing reps. In the drills (listening, fill the gap, match) it re-queues the step once per word per session, ungraded (step `key` includes the index), but counts as a miss via `markWordUnknown` (`recentLapses` + 1). Weak words = a lapse or a recent miss; Mistakes = a recent miss or 2+ lapses (`selectors.ts`).
- **The interval on a button is the one committed**: `previewReview` makes one `repeat()` call and `gradeCard` takes that object back — recomputing later lands on a different day because of fuzz. Listening passes no preview.
- Response time is analytics only (capped 60s). Config in `FSRS_CONFIG` (0.90 retention, not user-facing). Easy on a new word ≈ 3 days (`EASY_FIRST_INTERVAL_DAYS`, lowered weight, not overridden due date).
- `isCardDue` compares instants. **`toFsrs` clamps `last_review` to `now`** — a future stamp (migrated v1 cards, dev clock, clock correction) makes ts-fsrs throw `Invalid delta_t` and kills the drill.
- `SrsCard` is schema v2 (FSRS snake_case fields, ISO strings converted only in `srs.ts`). `migrateDeck` from v1 SM-2 preserves due dates and fabricates no history.

**Mixed Drills** (`lib/mixedDrills.ts`, `buildMixedSteps`) alternate Listening, Fill the Gap (`clozeFor` finds the word by **entry id via `segmentText`**, never substring; options match character count) and Match the Pairs (deck > 5 words; **never grades a card**; rotates via `matchHistory`), plus ungraded Speaking steps where speech recognition exists (flashcards never lead into speaking). Standalone Mixed uses `dueCardsFor` (new cards included); `full`/`quick` use `listeningCardsFor`. "Can't listen now" pauses listening 30 real minutes (`listeningPausedUntil`, device key) and converts remaining listening steps to ungraded gaps. Listening options show **no pinyin before checking**. Verdict colours come from `onbVerdict` (gold = "I don't know").

`ReviewFlashcard.tsx` owns its screen. The reveal is a sheet rising from below: answer card + grade tiles (backed in the page colour, tiles trailing) slide up over the still question, which hides once covered. The region under the writer is sized for the taller layer from mount (both rendered and measured), so the reveal changes no layout and the writer never resizes. Slides only — no fades (Android child shadows). HanziStage keys WebViews on the character and re-inits the writer on other changes. Remedial reps (`flashcard/PracticeRep.tsx`): last rep is from memory; auto-advance after `AUTO_NEXT_MS` through one guarded `next`. Session end screens are `components/sessionEnd/SessionEnd.tsx` (XP earned = `xp` minus its value at mount): the painting full-bleed (edge to edge, under the status bar) in both states; "Session Complete" shows Duolingo-style result boxes (`ResultBoxes.tsx`: TOTAL XP / accuracy verdict / CARDS, each popping in with sparkles, counting up, then its header landing, staggered, with backstops). `/session-end-preview` is a `__DEV__`-only route (`?reviewed=&correct=&xp=&mode=`, long-press to replay).
