/*
 * The Review hub's design system.
 *
 * Like `settings/tokens.ts`, this is built **on top of** the Dashboard's palette
 * rather than beside it. Review is pushed straight off the Dashboard and off the
 * tab bar, so the two want to be the same room: same ivory paper, same navy ink,
 * same coral and green. Only what a hub of three drills needs and a dashboard
 * does not is added here.
 *
 * **This file is the only place a colour literal belongs.** Light-only, like the
 * rest of this family — the design rests on warm paper under watercolour, and a
 * dark repaint would be a different design rather than a recolour.
 */

import { dashColors, dashShadow, dashShadowLifted, dashSpacing } from '../dashboard/tokens'

export const revColors = {
  ...dashColors,

  /**
   * Mistakes. The one cool accent on the screen, so the third drill reads as a
   * different kind of work from the two above it rather than as more of the same.
   *
   * Deliberately *not* `setColors.blueGray` from Settings: that one is a muted
   * analytics tint sitting behind a small icon, where this has to hold white at
   * 26pt inside a filled circle. A desaturated blue there goes grey.
   */
  blue: '#6286D8',
  blueSoft: '#EEF2FB',

  /**
   * Fallen petals along the foot of the screen. Pale enough to read as drift
   * rather than as marks on the page — it sits under the buttons, and anything
   * with more contrast starts competing with them.
   */
  petal: '#F2C8C0',
} as const

/** Per-drill surfaces. A tinted card, a filled icon circle, and the count's ink. */
export const revDrills = {
  flashcards: { fill: revColors.coralSoft, circle: revColors.coral, ink: revColors.coralDark },
  listening: { fill: revColors.greenSoft, circle: revColors.green, ink: revColors.greenDark },
  mistakes: { fill: revColors.blueSoft, circle: revColors.blue, ink: revColors.blue },
} as const

/**
 * The spacing scale, restricted to 4/8/12/16/20/24/32 plus the page margin.
 *
 * A hub screen is mostly gaps, which makes it exactly the kind of layout where
 * one stray 13 and one stray 19 turn into a rhythm nobody can put right later.
 */
export const revSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  /** Horizontal page margin. Every card, button and the title align to it. */
  screen: dashSpacing.screen,
} as const

/**
 * Type scale. Sizes and line heights only — weight comes from the font *family*,
 * because React Native cannot synthesise one and `fontWeight` alone does nothing.
 */
export const revType = {
  /** Nunito ExtraBold. "Review". Far smaller than the Dashboard's greeting: this
   *  screen is a place to choose from, not a place to be welcomed to. */
  title: { fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  /** Nunito ExtraBold, the number in the streak pill. */
  streak: { fontSize: 16, lineHeight: 21 },
  /** Nunito ExtraBold, Shifu's line. */
  bubble: { fontSize: 16, lineHeight: 21, letterSpacing: -0.15 },
  /** Nunito ExtraBold, a stat's number. */
  statValue: { fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  /** Nunito SemiBold, the label under it. */
  statLabel: { fontSize: 13, lineHeight: 17 },
  /** Nunito ExtraBold, inside a REVIEW / LISTEN / IMPROVE pill. */
  tag: { fontSize: 10, lineHeight: 13, letterSpacing: 0.7 },
  /** Nunito ExtraBold, a drill's name. */
  cardTitle: { fontSize: 18, lineHeight: 23, letterSpacing: -0.2 },
  /** Nunito SemiBold, the two lines under it. */
  cardBody: { fontSize: 13, lineHeight: 18 },
  /** Nunito ExtraBold, the due count on a drill card. */
  count: { fontSize: 28, lineHeight: 32, letterSpacing: -0.6 },
  /** Nunito SemiBold, the word "due" under it. */
  countUnit: { fontSize: 12, lineHeight: 16 },
  /** Nunito ExtraBold, on the primary call to action. */
  cta: { fontSize: 18, lineHeight: 24 },
  /** Nunito ExtraBold, on the quieter one. */
  ctaQuiet: { fontSize: 16.5, lineHeight: 22 },
} as const

/** Geometry. A drill card is a fixed grid, and all three draw the same one. */
export const revCard = {
  radius: 20,
  /** Minimum height — a long description at large text sizes may push it taller. */
  minHeight: 126,
  padding: 16,
  /**
   * The painted disc at the left.
   *
   * Sized up from 58: these carry real illustration — a brush and a blossom on
   * the flashcards disc, an eraser and a tick on the mistakes one — where the
   * flat glyph they replaced only had to be legible as a shape. At the old size
   * the detail was there but too small to read, which made the discs look like
   * icons that had come out wrong rather than pictures.
   */
  circle: 68,
  /** Gap between that circle and the text column. */
  circleGap: 14,
  /** The white circular chevron at the right. */
  chevron: 40,
} as const

export const revRadius = {
  card: 20,
  bubble: 18,
  /** The two calls to action, and the streak pill. */
  pill: 999,
} as const

/**
 * The only shadow on the screen, and it is a hint rather than elevation — the
 * Dashboard's, unchanged. Separation comes from the tinted card fills, a
 * hairline border and spacing, not from lifting things off the page.
 */
export const revShadow = dashShadow

/** Slightly stronger. The streak pill, the chevron buttons and the primary CTA. */
export const revShadowLifted = dashShadowLifted

/**
 * The entrance, which is deliberately *not* the Dashboard's.
 *
 * There, six elements arrive in sequence and the staging is the point — the
 * screen introduces itself. Here everything moves at once. Review is a screen a
 * learner opens already knowing what they came to do, and a two-second
 * choreography stands between them and the button they were reaching for. One
 * beat, and the page is ready.
 *
 * The cards rise; the range comes in from the right. That difference is the only
 * one, and it is there because the range is scenery arriving from off-page while
 * the cards are content settling onto it.
 */
export const revEntrance = {
  /** No stagger: every element shares this. */
  at: 0,
  for: 520,
  /** Cards, Shifu, the bubble and the foot decoration. */
  slideY: 26,
  /** The range only. Longer, because it has further to come from. */
  slideX: 34,
} as const

/** The design viewport. Wider windows centre the column rather than stretch it. */
export const REV_CONTENT_MAX = 430
