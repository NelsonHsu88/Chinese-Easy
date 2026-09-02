import { pinyinForCharacter } from './characterReading'
import { splitTone } from './zhuyin'
import type { VocabWord } from '../types'

/*
 * Deciding whether what the learner said matches the word they were shown.
 *
 * This grades **sound, not spelling**. The old version asked whether the
 * recogniser's text contained the target's characters, which graded the
 * recogniser's guess at meaning rather than the learner's mouth: say 謝謝
 * perfectly and be marked wrong because the engine wrote 寫寫, or 泄泄, or picked
 * the wrong homophone out of the dozens Mandarin has. A learner cannot hear the
 * difference between those and neither can a microphone — they are the same
 * sound, and the same sound is what was asked for.
 *
 * So both sides are turned into syllables — initial, final, tone — and compared.
 * Pure logic on purpose: the microphone and the recogniser live in
 * `speechRecognition.ts`, and everything here can be reasoned about without a
 * device.
 */

/**
 * A pass. Deliberately lenient: this is a speaking drill, not an exam, and the
 * cost of failing someone who said the word well is that they stop using it.
 */
export const PASS_THRESHOLD = 0.7

/**
 * When a single syllable counts as "heard" for the live per-syllable feedback.
 *
 * Separate from `PASS_THRESHOLD` because it answers a different question — not
 * "was the word good enough" but "has this syllable landed yet", which is what
 * lets a two-syllable word light up one character at a time. Set where a
 * syllable with the right sounds but a wrong tone (0.85) still counts and a
 * wrong consonant (0.55) doesn't.
 */
const SYLLABLE_HEARD = 0.7

/*
 * What each part of a syllable is worth.
 *
 * The consonant and the vowel carry the sound; the tone is scored but doesn't
 * dominate, so one tone slip in an otherwise perfect word is forgiven and a
 * wrong syllable never is. `EXTRA_TONE_ERROR` then takes back part of that
 * leniency: forgiving *one* tone is encouragement, forgiving every tone in the
 * word would be teaching that tones are optional.
 */
const INITIAL_WEIGHT = 0.45
const FINAL_WEIGHT = 0.4
const TONE_WEIGHT = 0.15
const EXTRA_TONE_ERROR = 0.15

/** Neutral tone is genuinely ambiguous in recognised speech, so mismatching it is a half-error. */
const NEUTRAL_TONE = 5

/**
 * Everything that isn't a Han character. Recognisers hand back punctuation the
 * learner never spoke ("謝謝。"), stray spaces between syllables, and sometimes
 * a latin fragment when they mishear — none of which should decide a match.
 *
 * Covers the CJK Unified Ideographs block plus Extension A, which between them
 * hold every character in the word bank.
 */
const NON_HANZI = /[^㐀-䶿一-鿿]/g

/** Reduces recognised text to the bare characters worth comparing. */
export function normaliseTranscript(text: string): string {
  return text.replace(NON_HANZI, '')
}

// --- Characters to syllables ---------------------------------------------------

export interface Syllable {
  initial: string
  final: string
  tone: number
}

const TWO_LETTER_INITIALS = ['zh', 'ch', 'sh']

/**
 * Splits a toneless syllable into initial and final.
 *
 * Zero-initial syllables (yī, wǒ, ān) keep an empty initial, which is correct
 * rather than a fallback — they genuinely have no consonant, and two of them
 * agreeing on "nothing" should count as agreeing.
 */
function splitSyllable(base: string): { initial: string; final: string } {
  const two = TWO_LETTER_INITIALS.find((i) => base.startsWith(i))
  if (two) return { initial: two, final: base.slice(2) }
  if (/^[bpmfdtnlgkhjqxrzcs]/.test(base)) return { initial: base[0], final: base.slice(1) }
  return { initial: '', final: base }
}

/** One pinyin token ("xiè") to a scored syllable. */
export function parseSyllable(token: string): Syllable | null {
  const cleaned = token.trim().toLowerCase().replace(/[^a-züÀ-ɏ]/gi, '')
  if (!cleaned) return null
  const { base, tone } = splitTone(cleaned)
  if (!base) return null
  return { ...splitSyllable(base), tone }
}

/** The syllables of a word, read off its own pinyin — the authoritative reading. */
export function syllablesOfWord(word: VocabWord): Syllable[] {
  return word.pinyin
    .split(/\s+/)
    .map(parseSyllable)
    .filter((s): s is Syllable => s !== null)
}

/**
 * The syllables of recognised text, one per character.
 *
 * Characters with no bundled reading are dropped rather than scored as a
 * mismatch: an unknown character is the *index's* gap, and charging the learner
 * for it would fail them for the engine's choice of glyph.
 */
export function syllablesOfTranscript(text: string): Syllable[] {
  const out: Syllable[] = []
  for (const character of normaliseTranscript(text)) {
    const reading = pinyinForCharacter(character)
    if (!reading) continue
    const syllable = parseSyllable(reading)
    if (syllable) out.push(syllable)
  }
  return out
}

// --- Scoring -------------------------------------------------------------------

/** How alike two finals are: exact, or credit for the shared run ("ang" vs "an"). */
function finalSimilarity(a: string, b: string): number {
  if (a === b) return 1
  if (!a || !b) return 0
  let shared = 0
  while (shared < a.length && shared < b.length && a[shared] === b[shared]) shared++
  return shared / Math.max(a.length, b.length)
}

interface SyllablePair {
  score: number
  toneWrong: boolean
}

function compareSyllable(target: Syllable, heard: Syllable): SyllablePair {
  const initial = target.initial === heard.initial ? 1 : 0
  const final = finalSimilarity(target.final, heard.final)

  let tone = 0
  let toneWrong = false
  if (target.tone === heard.tone) {
    tone = 1
  } else if (target.tone === NEUTRAL_TONE || heard.tone === NEUTRAL_TONE) {
    // Neutral tone is barely marked in running speech and recognisers guess at
    // it, so calling this a full error would punish an accurate speaker.
    tone = 0.5
  } else {
    toneWrong = true
  }

  return {
    score: initial * INITIAL_WEIGHT + final * FINAL_WEIGHT + tone * TONE_WEIGHT,
    toneWrong,
  }
}

/** One alignment of the target against a same-length run of heard syllables. */
interface Alignment {
  score: number
  /** Per target syllable: did this one land? Drives the live green feedback. */
  heard: boolean[]
}

function scoreWindow(target: Syllable[], heard: Syllable[], offset: number): Alignment {
  let total = 0
  let toneErrors = 0
  const landed: boolean[] = []

  for (let i = 0; i < target.length; i++) {
    const other = heard[offset + i]
    if (!other) {
      landed.push(false)
      continue
    }
    const { score, toneWrong } = compareSyllable(target[i], other)
    total += score
    if (toneWrong) toneErrors++
    landed.push(score >= SYLLABLE_HEARD)
  }

  const mean = total / target.length
  // The first tone slip is already priced into TONE_WEIGHT. Each one after it
  // costs extra, so "every tone wrong" lands well below a pass even though
  // "one tone wrong" doesn't.
  const penalty = toneErrors > 1 ? (toneErrors - 1) * EXTRA_TONE_ERROR : 0
  return { score: Math.max(0, mean - penalty), heard: landed }
}

/**
 * How close an utterance came to the target word, 0–1.
 *
 * The target is slid along the heard syllables and the best alignment wins,
 * because recognisers pad short utterances into something sentence-shaped —
 * "是謝謝" for 謝謝 — and someone who said the word correctly shouldn't be marked
 * down for the engine's guess at the context around it. Missing syllables score
 * zero, so a half-said word can't pass on its good half.
 */
export function pronunciationScore(target: Syllable[], heard: Syllable[]): Alignment {
  const empty: Alignment = { score: 0, heard: target.map(() => false) }
  if (target.length === 0 || heard.length === 0) return empty

  const lastOffset = Math.max(0, heard.length - target.length)
  let best = empty
  for (let offset = 0; offset <= lastOffset; offset++) {
    const alignment = scoreWindow(target, heard, offset)
    if (alignment.score > best.score) best = alignment
    if (best.score === 1) break
  }
  return best
}

export interface PronunciationResult {
  /** 0–1, the best any of the recogniser's candidate transcripts managed. */
  score: number
  passed: boolean
  /** The transcript that scored best — what to show back as "we heard…". */
  transcript: string
  /**
   * One flag per syllable of the target: has this syllable been said yet?
   *
   * Interim results arrive while the learner is still speaking, so on a
   * two-syllable word the first flag flips before the second — which is what
   * the mic screen uses to show progress through the word rather than a verdict
   * at the end.
   */
  heard: boolean[]
}

/**
 * Grades an attempt against every candidate transcript the recogniser offered.
 *
 * They're alternatives for one utterance, so the best is the fair one to grade:
 * a runner-up spelling that happens to be homophone-correct is evidence the
 * sounds were right, not evidence of a second attempt.
 */
export function gradePronunciation(word: VocabWord, transcripts: string[]): PronunciationResult {
  const target = syllablesOfWord(word)
  let best: PronunciationResult = { score: 0, passed: false, transcript: '', heard: target.map(() => false) }

  for (const raw of transcripts) {
    const spoken = syllablesOfTranscript(raw)
    if (spoken.length === 0) continue
    const alignment = pronunciationScore(target, spoken)
    if (alignment.score > best.score || !best.transcript) {
      best = {
        score: alignment.score,
        passed: alignment.score >= PASS_THRESHOLD,
        transcript: raw.trim(),
        heard: alignment.heard,
      }
    }
  }

  return best
}

/** The best transcript to show back as "we heard…", or '' when nothing usable came through. */
export function bestTranscript(transcripts: string[]): string {
  return transcripts.find((t) => normaliseTranscript(t).length > 0)?.trim() ?? ''
}
