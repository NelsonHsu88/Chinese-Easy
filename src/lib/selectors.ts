import type { AppSettings, LearningGoal, SrsCard, VocabWord, WordCategory } from '../types'
import { isCardDue } from './srs'
import { contentRank, isFunctionWord, isTeachableWord } from './definitions'

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
 * The pool the listening drill runs on: due cards that have been studied at
 * least once. A word you've never seen can't meaningfully be *recognised* by
 * ear, so brand-new cards are left to the flashcard phase to introduce.
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
 * sorted last. Sorting still puts their own level ahead of the stretch level, and
 * once both are exhausted the pool empties and New Words prompts them to raise
 * their level in Settings.
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
export function newWordsPool(allWords: VocabWord[], deck: SrsCard[], settings: AppSettings): VocabWord[] {
  const addedIds = new Set(deck.map((c) => c.wordId))
  const candidates = allWords
    .filter((w) => !addedIds.has(w.id) && !w.custom)
    .filter((w) => w.hskLevel >= settings.hskLevel && w.hskLevel <= settings.hskLevel + 1)
    .filter((w) => characterCount(w) <= NEW_WORD_MAX_CHARS)
    .filter(hasExampleSentence)
    .filter(isTeachableWord)
    .filter((w) => !isFunctionWord(w))

  /*
   * Order matters as much as membership here. This used to sort by id, which for
   * these ids means sorting by the Chinese itself — so every word sharing a head
   * character landed together and a learner met 一下, 一個, 一些, 一切, 一定,
   * 一樣… twelve in a row before reaching anything else.
   *
   * The word bank is stored in frequency order (的, 我, 你, 是, 在, 他 …), so a
   * word's position in it is a genuine measure of how much use it will get. That
   * is the real answer to "show me words worth learning", and it beats any
   * heuristic scoring: concrete words first via contentRank, then commonest
   * first within each band.
   */
  const frequencyRank = new Map(allWords.map((w, i) => [w.id, i]))
  const ordered = candidates.sort(
    (a, b) =>
      a.hskLevel - b.hskLevel ||
      contentRank(a) - contentRank(b) ||
      (frequencyRank.get(a.id) ?? 0) - (frequencyRank.get(b.id) ?? 0),
  )

  return spreadHeadCharacters(weightTowardsGoal(ordered, settings.learningGoal))
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
