/*
 * The Review hub's design system, built to the Beta 2.1 reference
 * (`SS928 Redesigned Review Screen.png`).
 *
 * Review is meant to be the bridge between the Dictionary and Learn, so it
 * takes something from each on purpose: from the Dictionary, Lora Bold
 * headlines, restrained surfaces with a drawn hairline and almost no shadow;
 * from Learn, watercolour painted straight onto the paper — in the hero, on the
 * left of each drill card, and along the foot of the page, and nowhere else.
 *
 * Still built on the Dashboard's palette rather than beside it (navy ink, the
 * shadow), since Review is pushed straight off the Dashboard. What differs is
 * sampled from the reference: the paper, the card, the jade.
 *
 * **This file is the only place a colour literal belongs.** Light-only, like
 * the rest of this family.
 */

import { dashColors, dashShadow, dashShadowLifted } from '../dashboard/tokens'
import { PAGE_SUBTITLE, PAGE_TITLE } from '../pageHeader'

export const revColors = {
  ...dashColors,

  /**
   * The page. Sampled from the reference, and it has to stay exactly this: the
   * hero and foot art were keyed against it (`processReviewArt.mjs`), and an
   * un-blended watercolour only reconstructs cleanly over the colour it was
   * un-blended from.
   */
  background: '#FFFFFF',
  /** Card surface — likewise the colour the three card scenes were keyed against. */
  card: '#FDFBF8',
  border: '#E7E4DE',

  /** Subtitles, descriptions, the small print under a stat. Muted blue-gray. */
  slate: '#5A6479',

  /** The primary button. Deeper than the Dashboard's green: forest, not lime. */
  jade: '#3D8057',
  /** The back arrow and the due-pill text. */
  jadeDark: '#2F6B43',
  /** The due pill, and the tile behind the "Due today" book. */
  mint: '#E8F3E7',

  /** The weak-words bars. */
  steel: '#6D7D90',
  /** The outline on the two quiet buttons. Visible, but nobody would call it a colour. */
  outline: '#A3A8B6',
} as const

/** 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40, plus the page margin. */
export const revSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  /** Horizontal page margin. Cards and the stats panel align to it. */
  screen: 20,
  /** How much further in the buttons sit than the cards, as the reference draws them. */
  buttonInset: 20,
} as const

/**
 * Sizes and line heights only — weight comes from the font *family*, because
 * React Native cannot synthesise one. Serif (Lora) for anything read as a
 * heading or a number; Nunito for labels and small print.
 */
export const revType = {
  /** Lora Bold. "Review" — the strongest thing on the page. */
  title: PAGE_TITLE,
  /** Lora. The two lines under it. */
  subtitle: PAGE_SUBTITLE,
  /** Lora. Shifu's line. */
  bubble: { fontSize: 14, lineHeight: 19 },
  /** Nunito ExtraBold / SemiBold, the streak pill. */
  streak: { fontSize: 15, lineHeight: 20 },
  /** Lora Bold, a stat's number. */
  statValue: { fontSize: 22, lineHeight: 26 },
  /** Nunito Regular, the label under it — one line, never bold. */
  statLabel: { fontSize: 12.5, lineHeight: 16 },
  /** Lora Bold, a drill's name. */
  cardTitle: { fontSize: 23, lineHeight: 28, letterSpacing: -0.2 },
  /** Nunito SemiBold, the description. */
  cardBody: { fontSize: 13.5, lineHeight: 17.5 },
  /** Nunito ExtraBold, inside a due pill. */
  pill: { fontSize: 13, lineHeight: 17 },
  /** Lora Bold, on every button. */
  cta: { fontSize: 17, lineHeight: 22 },
} as const

export const revRadius = {
  /** The book tile in the stats panel. */
  small: 12,
  /** Speech bubble. */
  medium: 20,
  /** Stats panel and drill cards. */
  large: 22,
  pill: 999,
} as const

/** Geometry. A drill card is a fixed grid, and all three draw the same one. */
export const revCard = {
  minHeight: 100,
  /**
   * The share of the card the painting occupies. The title starts just past
   * it — at 34.7% in the reference — so text never sits on the art.
   */
  artShare: 0.33,
  /** Gap between the art's right edge and the title. */
  textInset: 6,
  paddingY: 14,
  paddingRight: 14,
} as const

export const revButton = {
  primaryHeight: 54,
  quietHeight: 50,
} as const

/**
 * The side of each raised button (`LiftedFace`), one step down from its face.
 * Primary sits on the jade the back arrow uses; quiet on its own outline
 * colour, so the outline and the side read as one edge.
 */
export const revShoulders = {
  primary: '#2F6B43',
  quiet: '#A3A8B6',
} as const

/**
 * The hero's painting, which bleeds off the right edge of the screen and whose
 * bottom meets the stats panel's top — the panel cuts Shifu at the robe exactly
 * where the reference does.
 */
export const revHero = {
  /** Width at the 430pt design column; narrower phones scale it down with the column. */
  artWidth: 186,
  /** The trimmed render is 399×434. */
  artRatio: 399 / 434,
  /**
   * How far the bubble may run under the art's left edge. The render's first
   * 70px are a feathered fade (`processReviewArt.mjs`), so this reaches the
   * mist but stops short of Shifu's sleeve.
   */
  bubbleOverlap: 16,
  bubbleMax: 214,
} as const

/** The foot painting is 941×232 — the full width of the reference. */
export const REV_FOOT_RATIO = 941 / 232

/**
 * The only shadow on the screen, and it is a hint rather than elevation:
 * visible enough to separate a card from the paper, not enough to notice.
 */
export const revShadow = dashShadow

/** Slightly stronger. The streak pill and the primary button. */
export const revShadowLifted = dashShadowLifted

/**
 * The entrance: one beat, no stagger. Review is a screen a learner opens
 * already knowing what they came to do. The painting comes in from the right;
 * everything else rises.
 */
export const revEntrance = {
  at: 0,
  for: 380,
  slideY: 18,
  slideX: 28,
} as const

/** The design viewport. Wider windows centre the column rather than stretch it. */
export const REV_CONTENT_MAX = 430
