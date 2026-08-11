import type { AppSettings, SrsCard, VocabWord } from '../types'
import { isPastOrToday } from './date'
import { isTeachableWord } from './definitions'

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
    return copy.sort((a, b) => a.easeFactor - b.easeFactor || a.dueDate.localeCompare(b.dueDate))
  }
  return copy.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

/** Cards that are actually ready to review right now (ignores cards mid remedial-practice). */
export function dueCardsFor(deck: SrsCard[], settings: AppSettings): SrsCard[] {
  const ready = deck.filter((c) => c.practiceQueue === 0 && isPastOrToday(c.dueDate))
  return orderCards(ready, settings.reviewOrder).slice(0, settings.dailyReviewLimit)
}

/** Every due card, unlimited by the daily review cap — for browsing, not the review session itself. */
export function allDueCardsFor(deck: SrsCard[], settings: AppSettings): SrsCard[] {
  const ready = deck.filter((c) => c.practiceQueue === 0 && isPastOrToday(c.dueDate))
  return orderCards(ready, settings.reviewOrder)
}

export function dueCountFor(deck: SrsCard[]): number {
  return deck.filter((c) => c.practiceQueue === 0 && isPastOrToday(c.dueDate)).length
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
 * bad day. Hardest (lowest ease) first, so a Mistakes session opens on the worst
 * offender.
 */
export function mistakeCardsFor(deck: SrsCard[]): SrsCard[] {
  return deck
    .filter((c) => c.lapses >= 2)
    .sort((a, b) => b.lapses - a.lapses || a.easeFactor - b.easeFactor)
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
  return allWords
    .filter((w) => !addedIds.has(w.id) && !w.custom)
    .filter((w) => w.hskLevel >= settings.hskLevel && w.hskLevel <= settings.hskLevel + 1)
    .filter((w) => characterCount(w) <= NEW_WORD_MAX_CHARS)
    .filter(hasExampleSentence)
    .filter(isTeachableWord)
    .sort((a, b) => a.hskLevel - b.hskLevel || a.id.localeCompare(b.id))
}
