/*
 * Mixed Drills — the plan for one session of it, and the pieces each question
 * kind needs. Pure: no React, no platform, an injectable `random` so the tests
 * can fix it.
 *
 * Three kinds of question, all drawn from the learner's own deck:
 *
 *  - **listening** — a due word is spoken, pick which of four it was.
 *  - **fillGap** — one of the bank's own example sentences with a due word cut
 *    out, pick which of four fills it. Sentences come from the corpus and are
 *    never invented; a word whose example doesn't contain it exactly once as a
 *    *segmented word* (the same test `exampleSentences.test.ts` holds the bank
 *    to) falls through to listening.
 *  - **match** — five words from My Words against their meanings. Practice, not
 *    review: it is drawn from the whole deck rather than the due pool, so it
 *    never grades a card, and it only appears once the deck has more than five
 *    words (`MATCH_MIN_DECK`). Which words it shows is **rotated** through the
 *    deck by when each was last matched, so a learner meets every word in turn
 *    instead of the same five every session.
 */

import { segmentText, type TextSegment } from './textSegmentation'
import { displayWord } from './hanzi'
import { isTeachableWord, shortGloss } from './definitions'
import type { ScriptMode, VocabWord } from '../types'

/** One thing to do, in order. Option ids are fixed at plan time so distractors stay put across re-renders. */
export type DrillStep = (
  | { kind: 'flashcards'; wordId: string }
  | { kind: 'listening'; wordId: string; optionIds: string[] }
  | { kind: 'fillGap'; wordId: string; optionIds: string[] }
  | { kind: 'match'; wordIds: string[] }
) & {
  /** A second go at an earlier step (a miss or "I don't know"), not part of the planned count. */
  retry?: boolean
}

/**
 * Where the session's count stands: the question being worked on, of the
 * planned total. Retries aren't counted, so a miss leaves the count where it
 * was and only a right answer moves it on. Every step still ahead (retries
 * included) stands for one planned question not yet done.
 */
export function sessionProgress(steps: readonly DrillStep[], index: number): { step: number; total: number } {
  const total = Math.max(1, steps.filter((s) => !s.retry).length)
  const done = total - (steps.length - index)
  return { step: Math.min(total, Math.max(1, done + 1)), total }
}

/** "More than five words" — below this, Match the Pairs is left out of the session entirely. */
export const MATCH_MIN_DECK = 6
/** Pairs on one board, as the reference draws it. */
export const MATCH_PAIRS = 5
/** One board per this many questions, so a long session gets a few and a short one gets one. */
const QUESTIONS_PER_MATCH = 5
const MAX_MATCH_ROUNDS = 3
/** Where the first board lands: a few questions in, not as the opening screen. */
const FIRST_MATCH_AFTER = 3

type Random = () => number

export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function charCount(text: string): number {
  return [...text].length
}

// --- Listening ------------------------------------------------------------------

/**
 * Three wrong answers for a listening question. Drawn from the rest of the
 * learner's own deck first — words they're studying make far better distractors
 * than random dictionary entries — and topped up from the word bank at a similar
 * HSK level only if the deck is too small.
 */
export function listeningDistractors(
  answer: VocabWord,
  deckWords: VocabWord[],
  wordBank: VocabWord[],
  random: Random = Math.random,
): VocabWord[] {
  const picked = shuffle(
    deckWords.filter((w) => w.id !== answer.id),
    random,
  ).slice(0, 3)
  if (picked.length === 3) return picked

  const taken = new Set([answer.id, ...picked.map((w) => w.id)])
  const filler = shuffle(
    wordBank.filter((w) => !taken.has(w.id) && Math.abs(w.hskLevel - answer.hskLevel) <= 1),
    random,
  )
  return [...picked, ...filler.slice(0, 3 - picked.length)]
}

// --- Fill the gap ---------------------------------------------------------------

export interface Cloze {
  /** The example sentence, segmented in the learner's script. */
  segments: TextSegment[]
  /** Which segment is the gap. */
  gap: number
}

/**
 * The word's example sentence with the word located in it, or null when the
 * sentence can't fairly carry a gap.
 *
 * The match is by **entry id**, through the app's own segmenter — not a
 * substring search. 說 the verb inside 別說 is not the word 說, and a gap cut
 * out of the middle of another word would be a question with no right answer.
 * Exactly one occurrence, or two gaps would share one answer.
 */
export function clozeFor(word: VocabWord, script: ScriptMode, wordBank: VocabWord[]): Cloze | null {
  const example = word.example
  if (!example?.traditional || !example.translation) return null
  // Segment the canonical traditional text and display in the learner's
  // script — the same order the reader uses, so identity survives conversion.
  const segments = segmentText(example.traditional, wordBank, script)
  const hits = segments.flatMap((s, i) => (s.word?.id === word.id ? [i] : []))
  if (hits.length !== 1) return null
  return { segments, gap: hits[0] }
}

/**
 * Three wrong answers for a gap: other words the same length as the answer, so
 * the width of the gap gives nothing away. The deck first, then the bank at a
 * similar level. Never a word already printed elsewhere in the sentence, and
 * never one that *looks* the same as the answer in the learner's script.
 */
export function gapDistractors(
  answer: VocabWord,
  cloze: Cloze,
  deckWords: VocabWord[],
  wordBank: VocabWord[],
  script: ScriptMode,
  random: Random = Math.random,
): VocabWord[] {
  const length = charCount(displayWord(answer, script))
  const inSentence = new Set(cloze.segments.map((s) => s.display))
  const seen = new Set<string>([displayWord(answer, script)])
  const fits = (w: VocabWord) => {
    const form = displayWord(w, script)
    return w.id !== answer.id && charCount(form) === length && !inSentence.has(form) && !seen.has(form)
  }

  const picked: VocabWord[] = []
  const take = (pool: VocabWord[]) => {
    for (const w of pool) {
      if (picked.length === 3) return
      if (!fits(w)) continue
      picked.push(w)
      seen.add(displayWord(w, script))
    }
  }

  take(shuffle(deckWords, random))
  if (picked.length < 3) {
    take(
      shuffle(
        wordBank.filter((w) => Math.abs(w.hskLevel - answer.hskLevel) <= 1 && isTeachableWord(w)),
        random,
      ),
    )
  }
  return picked
}

/** Word forms an English verb or noun commonly takes in a translation. */
function inflections(base: string): string[] {
  const forms = [base, `${base}s`, `${base}es`, `${base}ed`, `${base}d`, `${base}ing`]
  if (base.endsWith('e')) forms.push(`${base.slice(0, -1)}ing`)
  if (base.endsWith('y')) forms.push(`${base.slice(0, -1)}ies`, `${base.slice(0, -1)}ied`)
  return forms
}

/**
 * The translation with the answer's meaning blanked out — "Every morning I ___
 * a cup of tea." — when its gloss can be found in it, and the translation as
 * it is when it can't.
 *
 * Only a whole-word match on the gloss (less a leading "to"), and only when it
 * occurs exactly once. A translation is a translation of the *sentence*, not of
 * each word in it, so most of the time nothing lines up and the full English is
 * shown: that is a hint about meaning, which the question isn't testing — it
 * asks which characters say it.
 */
export function blankTranslation(translation: string, answer: VocabWord): string {
  const gloss = shortGloss(answer)
    .split(/[;,(]/)[0]
    .trim()
    .replace(/^to /i, '')
    .toLowerCase()
  if (!gloss || gloss.length < 2) return translation

  const escaped = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const words = gloss.split(/\s+/)
  const last = words.pop() as string
  const head = words.map(escaped).join('\\s+')
  const tail = `(?:${inflections(last).map(escaped).join('|')})`
  const pattern = new RegExp(`\\b${head ? `${head}\\s+` : ''}${tail}\\b`, 'gi')

  const matches = translation.match(pattern)
  if (!matches || matches.length !== 1) return translation
  return translation.replace(pattern, '___')
}

/**
 * A Fill the Gap question for `word`, or null when it can't fairly have one —
 * no sentence that carries it exactly once, too few same-length distractors, or
 * a sentence another gap in this session has already used. `usedSentences` is
 * shared across the session and updated here, so no sentence is shown twice.
 */
function fillGapStep(
  word: VocabWord,
  deckWords: VocabWord[],
  wordBank: VocabWord[],
  script: ScriptMode,
  usedSentences: Set<string>,
  random: Random,
): DrillStep | null {
  const sentence = word.example?.traditional
  if (!sentence || usedSentences.has(sentence)) return null
  const cloze = clozeFor(word, script, wordBank)
  const options = cloze ? gapDistractors(word, cloze, deckWords, wordBank, script, random) : []
  if (!cloze || options.length !== 3) return null
  usedSentences.add(sentence)
  return { kind: 'fillGap', wordId: word.id, optionIds: shuffle([word, ...options], random).map((w) => w.id) }
}

// --- Can't listen now -----------------------------------------------------------

/** How long "Can't listen now" turns listening off for. */
export const LISTENING_PAUSE_MINUTES = 30

/** Whether listening is currently turned off. An unparseable stamp is treated as no pause. */
export function isListeningPaused(pausedUntil: string | null, now: number = Date.now()): boolean {
  if (!pausedUntil) return false
  const until = Date.parse(pausedUntil)
  return !Number.isNaN(until) && until > now
}

/**
 * The session with every listening question from `from` onwards swapped for a
 * Fill the Gap on the same word — what "Can't listen now" does to a session
 * already under way.
 *
 * Steps before `from` are history and are left alone. A word is never given a
 * second gap: one that already has a Fill the Gap anywhere in the session, or
 * that comes up twice in what's left (an "I don't know" re-queue), is dropped
 * rather than repeated, and so is any word whose sentence another gap has
 * already shown. A dropped word is simply not asked — its card stays due and
 * its schedule is untouched.
 */
export function withoutListening(
  steps: DrillStep[],
  from: number,
  {
    getWord,
    deckWords,
    wordBank,
    script,
    random = Math.random,
  }: {
    getWord: (id: string) => VocabWord | undefined
    deckWords: VocabWord[]
    wordBank: VocabWord[]
    script: ScriptMode
    random?: Random
  },
): DrillStep[] {
  const gapped = new Set<string>()
  const usedSentences = new Set<string>()
  for (const s of steps) {
    if (s.kind !== 'fillGap') continue
    gapped.add(s.wordId)
    const sentence = getWord(s.wordId)?.example?.traditional
    if (sentence) usedSentences.add(sentence)
  }

  const rest: DrillStep[] = []
  for (const s of steps.slice(from)) {
    if (s.kind !== 'listening') {
      rest.push(s)
      continue
    }
    const word = getWord(s.wordId)
    if (!word || gapped.has(word.id)) continue
    const gap = fillGapStep(word, deckWords, wordBank, script, usedSentences, random)
    if (!gap) continue
    gapped.add(word.id)
    rest.push(s.retry ? { ...gap, retry: true } : gap)
  }
  return [...steps.slice(0, from), ...rest]
}

// --- Missed questions --------------------------------------------------------

/** A missed question comes back at least this many questions later, when there are that many left. */
export const RETRY_MIN_GAP = 2

/**
 * A missed Listening or Fill the Gap question, put back into the session so
 * it has to be answered right before the session can end.
 *
 * The copy's options are reshuffled, so the right answer isn't remembered by
 * its position, and it lands at a random spot at least `RETRY_MIN_GAP`
 * questions on (or at the end, if fewer are left), never straight after the
 * miss. Other step kinds are returned unchanged.
 */
export function requeueMissed(steps: DrillStep[], index: number, random: Random = Math.random): DrillStep[] {
  const missed = steps[index]
  if (!missed || (missed.kind !== 'listening' && missed.kind !== 'fillGap')) return steps
  const retry: DrillStep = { ...missed, optionIds: shuffle(missed.optionIds, random), retry: true }
  const earliest = index + 1 + RETRY_MIN_GAP
  const at = earliest >= steps.length ? steps.length : earliest + Math.floor(random() * (steps.length - earliest + 1))
  return [...steps.slice(0, at), retry, ...steps.slice(at)]
}

// --- Match the pairs ------------------------------------------------------------

/**
 * Words for one board, least recently matched first.
 *
 * `matchedAt` is when each word was last on a board (ISO), persisted across
 * sessions — a word never matched sorts first, so the rotation walks the whole
 * deck before anything repeats. Ties are shuffled, so a fresh deck doesn't come
 * out in the order it was added.
 *
 * A board never carries two words with the same meaning or the same characters:
 * either would give the learner two right answers for one tile.
 */
export function pickMatchWords(
  deckWords: VocabWord[],
  matchedAt: Record<string, string>,
  script: ScriptMode,
  exclude: ReadonlySet<string> = new Set(),
  count = MATCH_PAIRS,
  random: Random = Math.random,
): VocabWord[] {
  const stamp = (w: VocabWord) => {
    const at = matchedAt[w.id]
    const t = at ? Date.parse(at) : NaN
    return Number.isNaN(t) ? -Infinity : t
  }
  // Shuffle, then a stable sort: ties stay in shuffled order.
  const ordered = shuffle(
    deckWords.filter((w) => !exclude.has(w.id)),
    random,
  ).sort((a, b) => stamp(a) - stamp(b))

  const picked: VocabWord[] = []
  const glosses = new Set<string>()
  const forms = new Set<string>()
  for (const w of ordered) {
    if (picked.length === count) break
    const gloss = shortGloss(w).toLowerCase()
    const form = displayWord(w, script)
    if (!gloss || glosses.has(gloss) || forms.has(form)) continue
    picked.push(w)
    glosses.add(gloss)
    forms.add(form)
  }
  return picked.length === count ? picked : []
}

// --- The plan -------------------------------------------------------------------

/**
 * The question steps for a set of due words, plus Match the Pairs boards
 * interleaved among them.
 *
 * Question kinds alternate where they can — listening, then a gap, then
 * listening — so the session doesn't run as one kind followed by another. A
 * word with no usable sentence is always a listening question. Boards go in
 * only when there is at least one question (an empty queue stays "Nothing to
 * review") and only for a deck of more than five words.
 */
export function buildMixedSteps({
  dueWords,
  deckWords,
  wordBank,
  script,
  matchedAt,
  listening = true,
  random = Math.random,
}: {
  dueWords: VocabWord[]
  deckWords: VocabWord[]
  wordBank: VocabWord[]
  script: ScriptMode
  matchedAt: Record<string, string>
  /** False while the learner can't listen: every question is a gap, and a word with no usable sentence sits this session out. */
  listening?: boolean
  random?: Random
}): DrillStep[] {
  const questions: DrillStep[] = []
  const usedSentences = new Set<string>()
  let gapTurn = !listening
  for (const word of dueWords) {
    if (gapTurn) {
      const gap = fillGapStep(word, deckWords, wordBank, script, usedSentences, random)
      if (gap) {
        questions.push(gap)
        gapTurn = !listening
        continue
      }
    }
    if (!listening) continue
    const options = listeningDistractors(word, deckWords, wordBank, random)
    // Fewer than three distractors means no real multiple choice — skip rather
    // than show a question the learner can answer by elimination.
    if (options.length < 3) continue
    questions.push({ kind: 'listening', wordId: word.id, optionIds: shuffle([word, ...options], random).map((w) => w.id) })
    gapTurn = true
  }

  if (questions.length === 0 || deckWords.length < MATCH_MIN_DECK) return questions

  const rounds = Math.min(MAX_MATCH_ROUNDS, Math.ceil(questions.length / QUESTIONS_PER_MATCH))
  const boards: DrillStep[] = []
  const used = new Set<string>()
  for (let r = 0; r < rounds; r++) {
    // Words already on a board this session sit out the next one; once the
    // deck can't fill a board without them, there are no more boards.
    const words = pickMatchWords(deckWords, matchedAt, script, used, MATCH_PAIRS, random)
    if (words.length === 0) break
    words.forEach((w) => used.add(w.id))
    boards.push({ kind: 'match', wordIds: words.map((w) => w.id) })
  }

  const steps: DrillStep[] = []
  let next = Math.min(FIRST_MATCH_AFTER, questions.length)
  questions.forEach((q, i) => {
    if (i === next && boards.length) {
      steps.push(boards.shift() as DrillStep)
      next += QUESTIONS_PER_MATCH
    }
    steps.push(q)
  })
  // A short session's board lands at the end rather than not at all.
  steps.push(...boards)
  return steps
}
