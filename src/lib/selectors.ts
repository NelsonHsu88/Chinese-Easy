import type { AppSettings, LearningGoal, SrsCard, VocabWord, WordCategory } from '../types'
import { isCardDue } from './srs'
import { isFunctionWord, isTeachableWord } from './definitions'

export function orderCards(cards: SrsCard[], order: AppSettings['reviewOrder']): SrsCard[] {
  const copy = [...cards]
  if (order === 'shuffled') {
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }
  if (order === 'hardest-first') {
    // FSRS `difficulty` runs 1 (easiest) to 10, the opposite way round to SM-2's
    // ease factor this used to sort on — so hardest-first is now descending.
    return copy.sort((a, b) => b.difficulty - a.difficulty || a.due.localeCompare(b.due))
  }
  return copy.sort((a, b) => a.due.localeCompare(b.due))
}

/** Cards that are actually ready to review right now (ignores cards mid remedial-practice). */
export function dueCardsFor(deck: SrsCard[], settings: AppSettings): SrsCard[] {
  const ready = deck.filter((c) => c.practiceQueue === 0 && isCardDue(c))
  return orderCards(ready, settings.reviewOrder).slice(0, settings.dailyReviewLimit)
}

/** Every due card, unlimited by the daily review cap — for browsing, not the review session itself. */
export function allDueCardsFor(deck: SrsCard[], settings: AppSettings): SrsCard[] {
  const ready = deck.filter((c) => c.practiceQueue === 0 && isCardDue(c))
  return orderCards(ready, settings.reviewOrder)
}

export function dueCountFor(deck: SrsCard[]): number {
  return deck.filter((c) => c.practiceQueue === 0 && isCardDue(c)).length
}

/**
 * Cards the learner has slipped on at least once. Surfaced as the "Weak words"
 * counter on the Review hub — a wider net than {@link mistakeCardsFor}, which is
 * what the Mistakes drill actually runs.
 */
export function weakCardsFor(deck: SrsCard[]): SrsCard[] {
  return deck.filter((c) => c.lapses >= 1)
}

/**
 * Cards the learner *consistently* gets wrong — two or more lapses, not just one
 * bad day. Hardest (highest FSRS difficulty) first, so a Mistakes session opens on the worst
 * offender.
 */
export function mistakeCardsFor(deck: SrsCard[]): SrsCard[] {
  return deck
    .filter((c) => c.lapses >= 2)
    .sort((a, b) => b.lapses - a.lapses || b.difficulty - a.difficulty)
}

/**
 * The drill half of a Full or Quick review: due cards that have been studied at
 * least once. Those sessions run flashcards first, so a brand-new card has just
 * been introduced there and is left out here rather than met twice in a row.
 *
 * Standalone Mixed Drills does *not* use this — it runs on {@link dueCardsFor},
 * so a word the learner has just added is drillable straight away, the same as
 * in Flashcards.
 */
export function listeningCardsFor(deck: SrsCard[], settings: AppSettings): SrsCard[] {
  return dueCardsFor(deck, settings).filter((c) => c.reps > 0)
}

/** Longest word New Words will introduce, in characters. */
const NEW_WORD_MAX_CHARS = 2

/** Spread rather than `.length` so a rare surrogate-pair character counts as one. */
function characterCount(word: VocabWord): number {
  return [...word.traditional].length
}

/** A usable example needs the sentence itself and its gloss; example pinyin is optional. */
function hasExampleSentence(word: VocabWord): boolean {
  return Boolean(word.example?.traditional && word.example.translation)
}

/**
 * Words to introduce next: the learner's own HSK level plus one stretch level.
 *
 * The floor matters as much as the ceiling — someone placed at HSK 6 has no use
 * for HSK 1 vocabulary, so levels below theirs are excluded rather than merely
 * sorted last. Sorting still puts their own level ahead of the stretch level.
 *
 * Once both are used up the queue doesn't end: it carries on with the rest of
 * the bank's teachable words, commonest first — everything above the window,
 * then anything left below it. Frequency is what makes a word worth learning,
 * so after the HSK-shaped start a learner keeps meeting practical vocabulary
 * rather than an empty screen.
 *
 * Three further gates keep the cards teachable: only one- and two-character
 * words, only words that already carry an example sentence, and only words that
 * actually translate into something a learner can hold onto. The sentence filter
 * is a filter and never a generator — example sentences come from the bundled
 * corpus, and a word without one is skipped rather than given an invented one.
 *
 * That last gate matters because the bulk bank is a whole dictionary: without it
 * the queue serves up transliterated names, surnames and bare grammatical notes
 * alongside real vocabulary. See `isTeachableWord`.
 */
export function newWordsPool(
  allWords: VocabWord[],
  deck: SrsCard[],
  settings: AppSettings,
  /** Shuffles near-equal frequencies; omit for a fixed order. See {@link NEW_WORDS_SESSION_SEED}. */
  seed?: number,
): VocabWord[] {
  const addedIds = new Set(deck.map((c) => c.wordId))
  const level = settings.hskLevel
  const inWindow = (w: VocabWord) => w.hskLevel >= level && w.hskLevel <= level + 1
  const teachable = teachableWords(allWords).filter((w) => !addedIds.has(w.id))
  const candidates = teachable.filter(inWindow)

  /*
   * Order matters as much as membership here. This used to sort by id, which for
   * these ids means sorting by the Chinese itself — so every word sharing a head
   * character landed together and a learner met 一下, 一個, 一些, 一切, 一定,
   * 一樣… twelve in a row before reaching anything else.
   *
   * The word bank is stored in frequency order (的, 我, 你, 是, 在, 他 …), so a
   * word's position in it is a genuine measure of how much use it will get:
   * within each HSK level, the commonest word comes first.
   *
   * With a seed, each word's rank is nudged by up to NEW_WORD_JITTER places, so
   * words of near-equal frequency arrive in a different order each session
   * while the commonest still come well before the rare. The nudge hangs off
   * the word's id, not its position in this list, so adding or skipping a word
   * never reshuffles the rest.
   */
  const frequencyRank = new Map(allWords.map((w, i) => [w.id, i]))
  const rank = (w: VocabWord) =>
    (frequencyRank.get(w.id) ?? 0) + (seed === undefined ? 0 : jitter(w.id, seed) * NEW_WORD_JITTER)
  const ordered = candidates.sort((a, b) => a.hskLevel - b.hskLevel || rank(a) - rank(b))

  /* After the window, in bank (frequency) order: above it first, then below.
     Kept apart from the window's ordering so goal-weighting never pulls these
     ahead of the learner's own level. */
  const beyond = [
    ...teachable.filter((w) => w.hskLevel > level + 1),
    ...teachable.filter((w) => w.hskLevel < level),
  ]

  return [
    ...spreadHeadCharacters(weightTowardsGoal(ordered, settings.learningGoal)),
    ...spreadHeadCharacters(weightTowardsGoal(beyond, settings.learningGoal)),
  ]
}

const teachableCache = new WeakMap<VocabWord[], VocabWord[]>()

/** Every word New Words could ever offer, in bank (frequency) order. Cached per bank. */
function teachableWords(allWords: VocabWord[]): VocabWord[] {
  let list = teachableCache.get(allWords)
  if (!list) {
    list = allWords.filter(isNewWordCandidate)
    teachableCache.set(allWords, list)
  }
  return list
}

/** How far, in frequency places, a seeded shuffle may move a word. */
const NEW_WORD_JITTER = 30

/**
 * One seed per app launch, shared by every screen that offers new words, so
 * Home's card and New Words agree on what comes next.
 */
export const NEW_WORDS_SESSION_SEED = Math.floor(Math.random() * 2 ** 31)

/** A stable pseudo-random number in [0, 1) for this word under this seed (FNV-1a). */
function jitter(id: string, seed: number): number {
  let h = (2166136261 ^ seed) >>> 0
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h / 2 ** 32
}

/** Whether New Words could ever offer this word, regardless of level or deck. */
function isNewWordCandidate(w: VocabWord): boolean {
  return (
    !w.custom &&
    characterCount(w) <= NEW_WORD_MAX_CHARS &&
    hasExampleSentence(w) &&
    isTeachableWord(w) &&
    !isFunctionWord(w)
  )
}

// --- HSK level progress ---------------------------------------------------------

export const HSK_MAX_LEVEL = 6

/**
 * The share of a level's teachable words a learner studies before moving up.
 *
 * New Words serves each level commonest-first, so 60% of it is the words a
 * learner will meet most. The other 40% is the long tail, which takes far longer
 * to learn and gives far less back. Measured against the teachable pool (626 at
 * HSK 1, 1,264 at HSK 4), not the raw level, because the rest of the level
 * (names, three-character compounds, words with no example) is never offered.
 */
const LEVEL_UP_SHARE = 0.6

const teachableCounts = new WeakMap<VocabWord[], Map<number, number>>()

/** Words studied at a level before the learner moves past it. */
export function levelUpTarget(allWords: VocabWord[], level: number): number {
  let counts = teachableCounts.get(allWords)
  if (!counts) {
    counts = new Map()
    for (const w of allWords) if (isNewWordCandidate(w)) counts.set(w.hskLevel, (counts.get(w.hskLevel) ?? 0) + 1)
    teachableCounts.set(allWords, counts)
  }
  return Math.max(1, Math.round((counts.get(level) ?? 0) * LEVEL_UP_SHARE))
}

/**
 * Words at each HSK level the learner has *studied*: in the deck and reviewed
 * at least once. Adding a word isn't learning it, so a learner can't level up
 * just by adding words.
 */
export function studiedByLevel(deck: SrsCard[], wordLevel: (wordId: string) => number | undefined): Map<number, number> {
  const out = new Map<number, number>()
  for (const card of deck) {
    if (card.reps < 1) continue
    const level = wordLevel(card.wordId)
    if (level) out.set(level, (out.get(level) ?? 0) + 1)
  }
  return out
}

/**
 * The level a learner at `level` has earned: one up for each level whose
 * target they've met, in a row. Never lower than where they are, so a level
 * set by the placement test or by hand is never taken away.
 */
export function earnedHskLevel(allWords: VocabWord[], studied: Map<number, number>, level: number): number {
  let earned = level
  while (earned < HSK_MAX_LEVEL && (studied.get(earned) ?? 0) >= levelUpTarget(allWords, earned)) earned++
  return earned
}

/** The share of the queue New Words aims to fill from the learner's goal categories. */
const GOAL_FOCUS_SHARE = 0.6

/**
 * The categories New Words leans towards for each onboarding learning goal.
 *
 * Kept here rather than in `categories.ts` on purpose: that module imports
 * lucide icons, and this one is pure logic that the node test runner has to be
 * able to import without a React Native environment.
 *
 * Each goal names more than its single obvious category because the categories
 * are coarse. A trip is eating in restaurants as much as it is transport, so
 * `travel` carries `food`; exam prep is the academic register, which is `work`
 * and `science` together.
 *
 * `daily-life` names `daily` — 94.7% of the bank — which makes it deliberately a
 * no-op. It is the default goal, its words are already what the queue serves,
 * and weighting towards a category that large could only push other things out.
 */
const GOAL_CATEGORIES: Record<LearningGoal, WordCategory[]> = {
  'daily-life': ['daily', 'people'],
  travel: ['travel', 'food'],
  exam: ['work', 'science'],
  culture: ['people', 'food'],
}

/**
 * Reorders the queue so the learner's onboarding goal is what they mostly meet,
 * without removing anything.
 *
 * **This is a ceiling, not a quota, and the difference is the whole design.**
 * The bank's categories are wildly uneven — 94.7% of it is `daily`, and at any
 * one HSK level the entire teachable pool holds 8-26 travel words, 13-26 food
 * and 3-10 science. A true 60% quota is therefore unachievable past the first
 * few dozen cards, and enforcing one would mean spending a learner's whole first
 * fortnight on the handful of travel words that exist and then dropping to none.
 * So the merge takes goal words at up to {@link GOAL_FOCUS_SHARE} *while they
 * last* and falls through to the rest of the queue when they don't: someone who
 * picked Travel meets the travel vocabulary at their level early, in among
 * ordinary words, rather than either never or all at once.
 *
 * Two properties this must keep, both of which are why it is a merge rather than
 * a sort:
 *
 *  - **Nothing is dropped or duplicated.** The output is a permutation of the
 *    input. A goal is a bias on the order words arrive in and must never make a
 *    word unreachable — the queue is also the only route to most of the bank.
 *  - **The existing ordering survives inside each stream.** Both halves keep the
 *    frequency/contentRank order they arrived in, so within the goal words the
 *    learner still meets the commonest first.
 *
 * The share is a floor as well as a ceiling in the sense that matters: if the
 * goal categories already exceed it naturally (which `daily-life` does, at 94%),
 * the queue is returned untouched. Interleaving there would *reduce* the goal's
 * share to exactly 60% and pull rarities forward to fill the rest — a goal
 * making the queue worse at serving itself.
 */
function weightTowardsGoal(ordered: VocabWord[], goal: LearningGoal): VocabWord[] {
  const focus = new Set(GOAL_CATEGORIES[goal] ?? [])
  if (focus.size === 0) return ordered

  const preferred: VocabWord[] = []
  const rest: VocabWord[] = []
  for (const word of ordered) (focus.has(word.category) ? preferred : rest).push(word)

  // Already at or above the target share — see the note above on `daily-life`.
  if (preferred.length >= ordered.length * GOAL_FOCUS_SHARE) return ordered
  if (preferred.length === 0) return ordered

  const out: VocabWord[] = []
  let p = 0
  let r = 0
  while (p < preferred.length || r < rest.length) {
    // Take a goal word whenever doing so keeps the running share under target,
    // which is what spreads them through the queue instead of front-loading a
    // block of them and then never showing another.
    const wantPreferred = p < preferred.length && (out.length === 0 || p < (out.length + 1) * GOAL_FOCUS_SHARE)
    if (wantPreferred) out.push(preferred[p++])
    else if (r < rest.length) out.push(rest[r++])
    else out.push(preferred[p++])
  }
  return out
}

/**
 * Nudges apart neighbours that share a first character, keeping the incoming
 * order otherwise. A single forward pass: on a clash, pull up the nearest later
 * word with a different head rather than reshuffling everything.
 */
function spreadHeadCharacters(words: VocabWord[]): VocabWord[] {
  const out = [...words]
  for (let i = 1; i < out.length; i++) {
    if (out[i].traditional[0] !== out[i - 1].traditional[0]) continue
    const swapWith = out.findIndex((w, j) => j > i && w.traditional[0] !== out[i - 1].traditional[0])
    if (swapWith === -1) break // everything left shares this head; nothing to gain
    ;[out[i], out[swapWith]] = [out[swapWith], out[i]]
  }
  return out
}
