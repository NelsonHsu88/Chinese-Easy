/*
 * The flashcard's design system, built to the Beta 2.1 reference
 * (`SS 1011 Flashcards Redesign UI.png`).
 *
 * Flashcards are pushed off the Review hub, so they live in the same
 * ivory-and-jade room: the palette spreads `revColors` and overrides only what
 * the reference samples differently.
 *
 * **This file is the only place a colour literal belongs.** Light-only, like
 * the rest of this family.
 */

import { revColors, revShadow, revShoulders } from '../review/tokens'
import type { Grade } from '../../types'

export const fcColors = {
  ...revColors,

  /** The page, sampled from the reference. */
  background: '#FFFFFF',
  /**
   * Both cards. All three paintings were keyed against exactly this
   * (`processFlashcardArt.mjs`), so it has to stay this or the art grows a halo.
   */
  card: '#FDFCF9',
  border: '#ECEAE5',

  /** The word, and the example sentence's hanzi. */
  ink: '#1C2235',
  /** The gloss. */
  body: '#3F4555',
  /** "FLASHCARDS", the counter, the translation, "I don't know". */
  slate: '#7E8595',

  /** The reading under the word; the progress bar; Show Answer. */
  green: '#5E9E59',
  greenDark: '#3D7A3E',
  /** The speaker disc and the due pill. */
  mint: '#ECF4E9',
  mintBorder: '#D2E0CE',
  track: '#EBEAE4',
  /** Type and icons on a coloured surface — Show Answer, the grade tiles. */
  onColor: '#FFFFFF',
  /** A grade's interval, a step under its name. */
  onColorSoft: 'rgba(255, 255, 255, 0.88)',
  /** The reset and back discs. */
  disc: '#FFFFFF',
} as const

/**
 * The four grade tiles: fill, and the darker tone their mountains are painted
 * in. Sampled from the reference; each tile darkens a little towards its foot
 * there, which the mountains carry here.
 */
export const fcGrades: Record<Grade, { fill: string; hills: string }> = {
  again: { fill: '#D9806F', hills: '#B4574A' },
  hard: { fill: '#DCA85F', hills: '#B4843B' },
  good: { fill: '#7FB57A', hills: '#55904F' },
  easy: { fill: '#6A8ED8', hills: '#4A6DB6' },
}

export const fcShoulders = {
  primary: revShoulders.primary,
} as const

export const fcType = {
  /** Nunito ExtraBold, letter-spaced. "FLASHCARDS". */
  label: { fontSize: 12.5, lineHeight: 16, letterSpacing: 1.6 },
  counter: { fontSize: 13, lineHeight: 17 },
  /** The word on the answer card. Hanzi face per script. */
  word: { fontSize: 50, lineHeight: 62 },
  /** Its reading. */
  reading: { fontSize: 17, lineHeight: 22 },
  /** Nunito SemiBold. The gloss. */
  gloss: { fontSize: 21, lineHeight: 27 },
  /** Lora Bold. The gloss when it *is* the question ("Write in Chinese"). */
  prompt: { fontSize: 28, lineHeight: 34 },
  /** Lora Italic. The example's translation. */
  translation: { fontSize: 15.5, lineHeight: 21 },
  /** Nunito Bold, inside the due pill. */
  pill: { fontSize: 14, lineHeight: 18 },
  /** Lora Bold, a grade's name. */
  grade: { fontSize: 15, lineHeight: 18 },
  /** Nunito SemiBold, the interval under it. */
  interval: { fontSize: 12, lineHeight: 15 },
  button: { fontSize: 17, lineHeight: 22 },
  quiet: { fontSize: 15, lineHeight: 20 },
} as const

export const fcSize = {
  pad: 16,
  radius: { card: 22, tile: 18 },
  /** The writing card never gets smaller than this; below it the page scrolls. */
  writingMin: 210,
  /**
   * Once the answer is up the stage is only replaying the stroke order, and the
   * answer card has grown, so it gives ground — that is what keeps the grade
   * tiles on screen on a 640pt phone instead of under the fold.
   */
  writingMinRevealed: 140,
  /** Reset, hint and back. */
  disc: 44,
  speaker: 46,
  /** The grade tiles. Compact: icon, name and interval and no more. */
  tile: 70,
  tileGap: 9,
  button: 54,
  /** Shares of the card's width each painting takes, as the reference draws them. */
  sakuraShare: 0.3,
  hillsShare: 0.48,
} as const

/** Each render's width ÷ height (the script writes them at twice the crop). */
export const FC_SAKURA_RATIO = 190 / 245
export const FC_HILLS_RATIO = 320 / 175

export const fcShadow = revShadow

/**
 * How long a finished character in a multi-character word holds before the
 * next slides in. The writer's default (900ms) suits the practice sheet; in a
 * review the learner has already seen what they wrote.
 */
export const FC_CHARACTER_HOLD_MS = 300

/**
 * The reveal: everything under the header dips out over `outMs`, swaps, and
 * comes back over `inMs`, the answer and tiles rising `rise` as they arrive.
 * `holdMs` is how long a character the learner just finished writing stays on
 * screen before that starts.
 */
export const fcReveal = { holdMs: 380, outMs: 150, inMs: 360, rise: 14, backstop: 160 } as const

/**
 * The rewrite reps' writing card: it leaves to the left and the next rep's
 * arrives from the right, the way the session itself moves forward.
 */
export const fcRepSlide = { outMs: 160, inMs: 300, backstop: 160 } as const

/** Content column cap, like every full-screen layout in the app. */
export const FC_CONTENT_MAX = 430
