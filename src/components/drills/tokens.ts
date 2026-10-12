/*
 * Mixed Drills' design system — the listening drill's, extended for the two
 * kinds built to the SS102 references (`SS 102 Fill in the Blank.png`,
 * `SS 102 Match the Pairs.png`).
 *
 * One session moves between all three kinds, so they are one room: the palette
 * spreads `listenColors` and adds only what the new references need. The page
 * colour in particular must stay `listenColors.background` — the foot painting
 * was keyed against it.
 *
 * **This file is the only place a colour literal belongs.** Light-only, like
 * the rest of this family.
 */

import { listenColors, listenShoulders, listenShadow, LISTEN_CONTENT_MAX, LISTEN_FOOT_RATIO } from '../listening/tokens'
import { onbVerdict } from '../onboarding/tokens'

export const drillColors = {
  ...listenColors,
  /** The dashed outline of the empty gap, and the reading above each word. */
  gapLine: '#5E9A6A',
  reading: '#6B7280',
  /** A matched pair, at rest — paler than the verdict fill, it is done rather than news. */
  matched: '#EAF4E8',
  matchedBorder: '#9CC7A3',
  /** The wash that flashes over a wrong pair, then fades — the verdict palette's coral, translucent so the tile's text reads through it. */
  wrong: 'rgba(244, 122, 106, 0.24)',
  wrongBorder: onbVerdict.incorrect.accent,
  /** A Match the Pairs tile at rest: a white face standing on a warm-grey shoulder, like the app's other raised buttons. */
  tileFace: '#FFFFFF',
  tileShoulder: '#DDD8CD',
  /** A revealed tile ("I don't know") sits down on a gold shoulder. */
  revealedShoulder: '#E2C77E',
} as const

/**
 * The answer sheet that rises from the bottom once an answer is checked
 * (SS1012 Correct UI): a wash in the verdict's colour under a cloud-edged top,
 * the judgement, and a Continue in the same hue. One tone per verdict — the
 * fill a step stronger than `onbVerdict`'s so the sheet reads as a surface over
 * the page rather than a tint on it, and the cloud's outline a step stronger again.
 */
export const drillSheet = {
  correct: {
    fill: '#DDF2D5',
    cloudLine: '#A8D9A0',
    text: onbVerdict.correct.text,
    accent: onbVerdict.correct.accent,
    button: '#4FAE62',
    shoulder: '#3A8A4B',
    confetti: ['#46A85B', '#7CC97F', '#A8DE8F', '#5DBB8A', '#C6EBB0'],
  },
  incorrect: {
    fill: '#FCE2DC',
    cloudLine: '#F1B2A5',
    text: onbVerdict.incorrect.text,
    accent: onbVerdict.incorrect.accent,
    button: '#EE6E5D',
    shoulder: '#C9503F',
    confetti: [] as string[],
  },
  unsure: {
    fill: '#FFF0CB',
    cloudLine: '#EDD08A',
    text: onbVerdict.unsure.text,
    accent: onbVerdict.unsure.accent,
    button: '#E9AE3A',
    shoulder: '#BF8A22',
    confetti: [] as string[],
  },
} as const

export const drillShoulders = listenShoulders
export const drillShadow = listenShadow

export const drillType = {
  /** Lora Bold, the drill's name. The SS102 references set it in serif, like the hub. */
  title: { fontSize: 28, lineHeight: 36 },
  counter: { fontSize: 14, lineHeight: 18 },
  button: { fontSize: 16.5, lineHeight: 22 },
  /** Fill the gap: the sentence, and the pinyin over each word. */
  sentence: { fontSize: 26, lineHeight: 36 },
  sentenceLong: { fontSize: 22, lineHeight: 31 },
  reading: { fontSize: 12.5, lineHeight: 16 },
  /** Lora Italic, the translation under it. */
  translation: { fontSize: 16, lineHeight: 22 },
  /** A four-up answer tile. */
  optionHanzi: { fontSize: 34, lineHeight: 44 },
  /** Match the pairs. */
  matchHanzi: { fontSize: 30, lineHeight: 38 },
  matchGloss: { fontSize: 17, lineHeight: 22 },
} as const

export const drillSize = {
  button: 50,
  /** Fill the gap's answer tiles. */
  optionHeight: 84,
  /** Match the pairs' tiles. */
  tileMin: 58,
  tileMax: 92,
  radius: { card: 24, tile: 14 },
  /** How long a wrong pair stays tinted before it has faded and can be tried again. */
  wrongFadeMs: 750,
  /** A matched tile settles to this opacity — still readable, plainly finished — over `matchedFadeMs`. */
  matchedOpacity: 0.5,
  matchedFadeMs: 420,
  /** How long a matched tile holds full strength first, so the green lands before it recedes. */
  matchedFadeDelayMs: 220,
} as const

/** The sakura corner is the onboarding branch, 560×318, mirrored into the top right. */
export const DRILL_SAKURA_RATIO = 560 / 318

export { LISTEN_CONTENT_MAX as DRILL_CONTENT_MAX, LISTEN_FOOT_RATIO as DRILL_FOOT_RATIO }
