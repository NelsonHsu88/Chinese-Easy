import { BUILDER_SYLLABLES } from '../data/basics/sounds'
import type { Tone, ZhItem } from '../data/basics/types'
import { TONE_NAMES, TONE_SHAPES } from './basics'

/*
 * How Chinese Basics' interactive steps judge an answer — pure, so it can be
 * tested without a screen.
 *
 * Every check follows the same arc: answer → feedback → (if wrong) one more
 * try → (if still wrong) the answer is shown and the learner moves on. Nobody
 * is stuck on a step, and a lesson is never "failed" by one mistake. What is
 * recorded is whether the first try was right, which is the honest measure of
 * what the learner already knew.
 */

/** Tries before the answer is shown. */
export const MAX_TRIES = 2

export type CheckStatus = 'answering' | 'wrong' | 'right' | 'revealed'

export interface ChoiceState {
  /** The option currently selected, before or after checking. */
  picked: number | null
  /** Checks made so far. */
  tries: number
  /** Options already tried and found wrong — disabled for the next try. */
  ruledOut: number[]
  status: CheckStatus
}

export const CHOICE_START: ChoiceState = { picked: null, tries: 0, ruledOut: [], status: 'answering' }

export function choiceSelect(state: ChoiceState, index: number): ChoiceState {
  if (state.status !== 'answering' || state.ruledOut.includes(index)) return state
  return { ...state, picked: index }
}

export function choiceCheck(state: ChoiceState, answer: number): ChoiceState {
  if (state.status !== 'answering' || state.picked === null) return state
  const tries = state.tries + 1
  if (state.picked === answer) return { ...state, tries, status: 'right' }
  return {
    ...state,
    tries,
    ruledOut: [...state.ruledOut, state.picked],
    status: tries >= MAX_TRIES ? 'revealed' : 'wrong',
  }
}

/** After "Try again": the wrong pick is cleared and ruled out. */
export function choiceRetry(state: ChoiceState): ChoiceState {
  if (state.status !== 'wrong') return state
  return { ...state, picked: null, status: 'answering' }
}

export function isSettled(status: CheckStatus): boolean {
  return status === 'right' || status === 'revealed'
}

export function rightFirstTime(state: { status: CheckStatus; tries: number }): boolean {
  return state.status === 'right' && state.tries === 1
}

/* ── Sentence builder ─────────────────────────────────────────────────────── */

export interface OrderState {
  /** Indexes into the sentence's words, in the order placed. */
  placed: number[]
  tries: number
  status: CheckStatus
  /** How many words from the start were right on the last check. */
  rightPrefix: number
}

export const ORDER_START: OrderState = { placed: [], tries: 0, status: 'answering', rightPrefix: 0 }

export function orderPlace(state: OrderState, word: number, total: number): OrderState {
  if (state.status !== 'answering' || state.placed.includes(word) || state.placed.length >= total) return state
  return { ...state, placed: [...state.placed, word] }
}

export function orderRemove(state: OrderState, position: number): OrderState {
  if (state.status !== 'answering') return state
  return { ...state, placed: state.placed.filter((_, i) => i !== position) }
}

/**
 * Checks the placed order. Words are compared by their hanzi, not by index,
 * so a sentence with the same word twice accepts either tile in either place.
 */
export function orderCheck(state: OrderState, words: { key: string }[]): OrderState {
  if (state.status !== 'answering' || state.placed.length !== words.length) return state
  const tries = state.tries + 1
  let rightPrefix = 0
  while (rightPrefix < words.length && words[state.placed[rightPrefix]].key === words[rightPrefix].key) rightPrefix++
  if (rightPrefix === words.length) return { ...state, tries, rightPrefix, status: 'right' }
  return { ...state, tries, rightPrefix, status: tries >= MAX_TRIES ? 'revealed' : 'wrong' }
}

/** "Try again" keeps the words that were right from the start, and lifts the rest. */
export function orderRetry(state: OrderState): OrderState {
  if (state.status !== 'wrong') return state
  return { ...state, placed: state.placed.slice(0, state.rightPrefix), status: 'answering' }
}

export function orderFeedback(state: OrderState, total: number): string {
  if (state.status === 'right') return 'That’s the right order.'
  if (state.status === 'revealed') return 'Here’s the right order.'
  if (state.rightPrefix === 0) return 'Not quite — think about which word comes first.'
  if (state.rightPrefix === 1) return 'Almost! The first word is right. Check what follows it.'
  return `Almost! The first ${state.rightPrefix} of ${total} words are in the right order.`
}

/* ── Tones ────────────────────────────────────────────────────────────────── */

const ORDINAL: Record<Tone, string> = { 1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'neutral' }

/** Specific feedback for a wrong tone pick: what they chose, what it was. */
export function toneFeedback(picked: Tone, answer: Tone): string {
  return `Almost! You picked the ${ORDINAL[picked]} tone, which is ${TONE_SHAPES[picked]}. This was the ${ORDINAL[answer]} tone — listen for how it’s ${TONE_SHAPES[answer]}.`
}

/** The hint after a first wrong tone pick — the answer stays hidden for the retry. */
export function toneRetryHint(picked: Tone): string {
  return `Almost! The ${ORDINAL[picked]} tone is ${TONE_SHAPES[picked]}, and this one isn’t. Listen again for the shape of the pitch.`
}

export function toneLabel(tone: Tone): string {
  return TONE_NAMES[tone]
}

/* ── Syllable builder ─────────────────────────────────────────────────────── */

const MARKS: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
}

/**
 * Puts a tone mark on a toneless pinyin syllable by the standard rule: on a or
 * e if present, on the o of ou, otherwise on the last vowel. Neutral (5) and
 * an unmarkable syllable come back unchanged.
 */
export function markTone(base: string, tone: Tone): string {
  if (tone === 5) return base
  let at = base.search(/[ae]/)
  if (at < 0) at = base.indexOf('ou')
  if (at < 0) {
    for (let i = base.length - 1; i >= 0; i--) {
      if (MARKS[base[i]]) {
        at = i
        break
      }
    }
  }
  if (at < 0) return base
  return base.slice(0, at) + MARKS[base[at]][tone - 1] + base.slice(at + 1)
}

export type BuildResult =
  | { kind: 'incomplete' }
  /** Not a Mandarin syllable at all. */
  | { kind: 'invalid'; base: string }
  /** Real, but only as a neutral-tone particle — nothing to play. */
  | { kind: 'neutral-only'; base: string }
  /** Real syllable, but no common character has this tone. */
  | { kind: 'no-tone'; base: string; pinyin: string }
  | { kind: 'ok'; base: string; pinyin: string; example: ZhItem }

export function buildSyllable(initial: string | null, final: string | null, tone: Tone | null): BuildResult {
  if (!initial || !final) return { kind: 'incomplete' }
  const base = initial + final
  const entry = BUILDER_SYLLABLES[base]
  if (!entry) return { kind: 'invalid', base }
  if (Object.keys(entry.tones).length === 0) return { kind: 'neutral-only', base }
  if (!tone || tone === 5) return { kind: 'incomplete' }
  const pinyin = markTone(base, tone)
  const example = entry.tones[tone as 1 | 2 | 3 | 4]
  return example ? { kind: 'ok', base, pinyin, example } : { kind: 'no-tone', base, pinyin }
}

/** Whether an initial and a final ever combine (ignoring tone). */
export function combines(initial: string, final: string): boolean {
  return !!BUILDER_SYLLABLES[initial + final]
}

/* ── Scoring ──────────────────────────────────────────────────────────────── */

export function lessonScore(firstTries: readonly boolean[]): { correct: number; total: number } {
  return { correct: firstTries.filter(Boolean).length, total: firstTries.length }
}

/**
 * Whether the finish card should suggest another run. Never a gate: the
 * lesson still counts as done.
 */
export function suggestPractice(score: { correct: number; total: number }): boolean {
  return score.total > 0 && score.correct / score.total < 0.6
}
