/*
 * The listening drill's design system, built to the Beta 2.1 reference
 * (`SS930 Listening UI Redesigned.png`).
 *
 * The drill is pushed straight off the Review hub, so it lives in the same
 * ivory-and-jade room: the palette spreads `revColors` and only overrides what
 * the reference itself samples differently.
 *
 * **This file is the only place a colour literal belongs.** Light-only, like
 * the rest of this family.
 */

import { revColors, revShadow, revShoulders } from '../review/tokens'

export const listenColors = {
  ...revColors,

  /**
   * The page and the question card. Both were sampled from the reference and
   * the paintings were keyed against them (`processListeningArt.mjs`), so they
   * have to stay exactly these or the art grows a halo.
   */
  background: '#FFFFFF',
  card: '#FDF9F3',
  border: '#ECE8E0',

  /** The title — a deep teal navy, as the reference draws it. */
  ink: '#0F3143',
  /** "Listen carefully", the hanzi line under a gloss, the counter. */
  slate: '#5A6479',
  /** The unselected radio ring. */
  radio: '#A3A6AA',

  /** Progress, the audio disc, Check Answer. */
  green: '#3E9A4A',
  greenDark: '#2F7A3A',
  /** The halo behind the audio disc, and the selected option's fill. */
  greenHalo: '#E6F0E3',
  greenFill: '#F1F8EF',
  /** The replay disc. */
  replay: '#F1F5EC',
  track: '#EDECE6',

  /**
   * An unselected option. Translucent so the card's painting reads through the
   * last two rows, the way the reference paints it over them.
   */
  option: 'rgba(253, 251, 247, 0.72)',
  /** Check Answer before anything is picked — present, visibly not ready. */
  disabled: '#B9D3BC',
  disabledShoulder: '#9DBBA1',
} as const

export const listenShoulders = {
  primary: '#2B6E35',
  quiet: revShoulders.quiet,
} as const

export const listenType = {
  /** Nunito ExtraBold. "Listening". */
  title: { fontSize: 28, lineHeight: 34 },
  recent: { fontSize: 15, lineHeight: 20 },
  counter: { fontSize: 14, lineHeight: 18 },
  /** Nunito SemiBold, under the audio disc. */
  caption: { fontSize: 16, lineHeight: 21 },
  /** Nunito Bold, an option's English. A notch under the reference, so four rows fit without the page scrolling. */
  gloss: { fontSize: 16.5, lineHeight: 21 },
  /** The hanzi line under it. */
  hanzi: { fontSize: 16, lineHeight: 21 },
  button: { fontSize: 16.5, lineHeight: 22 },
} as const

export const listenSize = {
  /** The audio disc and the halo ring round it. */
  disc: 66,
  halo: 84,
  replay: 38,
  /**
   * The floor a row shrinks to on a short phone. The screen doesn't scroll, so
   * the rows are what gives — down to this, which still holds a one-line gloss
   * and its hanzi.
   */
  optionMinHeight: 48,
  /** How tall a row may grow when the card has height to spare. */
  optionMaxHeight: 68,
  radio: 20,
  button: 50,
  radius: { card: 24, option: 16 },
  /**
   * The card painting's width as a share of the card. The render is 456×346;
   * the reference spans about half the card, and it is drawn a little larger
   * here because the rows over it are shorter than the mockup's.
   */
  artShare: 0.64,
} as const

/** The card render is 456×346. */
export const LISTEN_CARD_ART_RATIO = 456 / 346
/** The foot render is 941×242 — the full width of the reference. */
export const LISTEN_FOOT_RATIO = 941 / 242

export const listenShadow = revShadow

/** Content column cap, like every full-screen layout in the app. */
export const LISTEN_CONTENT_MAX = 430
