/*
 * The Settings design system.
 *
 * Unlike `challenges/`, `onboarding/` and `writingGuide/` — each of which owns
 * a self-contained palette — this one is deliberately **built on top of the
 * Dashboard's**. Settings sits behind the same tab bar as the Dashboard and is
 * reached from it constantly, so the two want to be the same room rather than
 * two rooms in the same house: same ivory paper, same navy ink, same green.
 *
 * What is added here is only what a settings screen needs and a dashboard does
 * not: two more icon tints, and the hairline that separates rows inside a
 * grouped card. **This file is still the only place a colour literal belongs.**
 *
 * Light-only, like every other screen in this family. The design rests on warm
 * paper under watercolour; a dark repaint would be a different design.
 */

import { dashColors, dashRadius, dashShadow, dashSpacing } from '../dashboard/tokens'
import { PAGE_SUBTITLE, PAGE_TITLE } from '../pageHeader'

export const setColors = {
  ...dashColors,

  /**
   * Progress. The one cool tint on the screen, so the analytics row reads as a
   * different kind of thing from the study rows above it.
   */
  blueGray: '#607A95',
  blueSoft: '#EDF3F7',

  /**
   * General. Deliberately the quietest circle in either card — it is the drawer
   * everything unglamorous lives in, and it should not compete.
   */
  slate: '#7C8798',
  slateSoft: '#F1F0EC',

  /**
   * The hairline between rows of one grouped card.
   *
   * A step warmer and darker than the card border, because it sits *on* the
   * card rather than against the page: the card's own border colour disappears
   * entirely once there is no ivory behind it.
   */
  separator: '#ECE9E3',

  /**
   * The avatar disc. A muted sage rather than the brand green — the initial is
   * a stand-in for a photograph, and at 56pt the full-strength green reads as a
   * button somebody forgot to label.
   */
  sage: '#6FA377',
} as const

/**
 * The spacing scale, restricted.
 *
 * Only 4/8/12/16/20/24/32 plus the page margin. Anything not on this list is a
 * number somebody guessed, and a settings screen is mostly gaps — it is exactly
 * the kind of layout where a stray 13 and a stray 19 turn into a rhythm nobody
 * can put right afterwards.
 */
export const setSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  /** Horizontal page margin. Cards, headings and the title all align to it. */
  screen: dashSpacing.screen,
} as const

/**
 * Type scale. Sizes and line heights only — the weight comes from the font
 * *family*, because React Native cannot synthesise one.
 */
export const setType = {
  /** Lora Bold. "Settings" — the same heading face as Learn, Review and the Dictionary. */
  title: PAGE_TITLE,
  /** Lora, the line under it. */
  subtitle: PAGE_SUBTITLE,
  /** Lora Bold — "Study", "Account & App". */
  section: { fontSize: 20, lineHeight: 25, letterSpacing: -0.2 },
  /** Lora Bold, a hub row's own name. */
  rowTitle: { fontSize: 16.5, lineHeight: 21 },
  /** Nunito SemiBold, the line under it. */
  rowSubtitle: { fontSize: 13.5, lineHeight: 18 },
  /** Nunito Bold, the green summary at the right of a row. */
  rowValue: { fontSize: 14, lineHeight: 19 },
  /** Lora Bold, the profile card's name. */
  profileName: { fontSize: 19, lineHeight: 24, letterSpacing: -0.2 },
  /** Nunito SemiBold, the email under it. */
  profileMeta: { fontSize: 13.5, lineHeight: 18 },
  /** Nunito ExtraBold, the avatar's initial. */
  avatar: { fontSize: 27, lineHeight: 34 },
  /** Nunito ExtraBold, a detail screen's own heading. */
  detailTitle: { fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  /** Nunito ExtraBold, a control group's heading on a detail screen. */
  groupTitle: { fontSize: 13, lineHeight: 17, letterSpacing: 0.3 },
  /** Nunito SemiBold, the explanation under a control. */
  hint: { fontSize: 12.5, lineHeight: 17 },
} as const

export const setRadius = {
  /** Matches `dashRadius.card`, so a Settings card and a Dashboard card agree. */
  card: dashRadius.card,
  inner: 14,
} as const

/**
 * The only shadow on the screen, and it is a hint rather than elevation — the
 * Dashboard's, unchanged. Separation here comes from spacing, a hairline border
 * and the card sitting a shade off the ivory page, not from lifting things up.
 */
export const setShadow = dashShadow

/** Row geometry. A row is a fixed grid, and every screen draws the same one. */
export const setRow = {
  /** Minimum height. Content can push it taller at large accessibility sizes. */
  minHeight: 78,
  /** Diameter of the tinted circle at the left. */
  icon: 45,
  /** Gap between that circle and the title column. */
  iconGap: 13,
  /** Horizontal padding inside a grouped card. */
  padding: 16,
} as const

/** Motion. A press dip and nothing else — the Dashboard's, at half strength. */
export const setMotion = {
  press: 120,
  pressScale: 0.99,
} as const

/**
 * The transition between Settings and a category screen.
 *
 * The whole point is that it should not read as a change of screen. Only the
 * *content* moves — the ivory page and the tab bar stay exactly where they are —
 * so what the eye sees is one surface rearranging itself rather than two pages
 * sliding past each other.
 *
 * `rise` is what buys that, and it is deliberately small. Content that travels
 * a screen's height is a page turn; a couple of lines of movement is the same
 * page thinking. It is a fixed number of points rather than a fraction of the
 * viewport because this is a *vertical* move now, and a share of the height
 * would make the same gesture twice as far on a tall phone as on a short one.
 *
 * The two durations are not equal on purpose. Leaving is quicker than arriving:
 * the screen being left has already been read, so holding it costs the learner
 * time for nothing, while the screen arriving needs long enough to be followed
 * into place. Together they land just under half a second.
 */
export const setTransition = {
  /** Travel distance, in points. Content rises this far into place. */
  rise: 34,
  /**
   * Departing, in ms. The next screen waits for this, so it is short — an
   * exit should always be quicker than the arrival it hands over to.
   */
  out: 220,
  /**
   * Arriving, in ms.
   *
   * 380 with the strong ease-out curve. At 290 with the old, weaker curve the arrival was over before the eye
   * had followed it — it registered as the next screen simply being there, with
   * a flicker, rather than as one surface sliding into place. This is the pace
   * the Dashboard's own scenery arrives at, and these two screens sit behind
   * the same tab bar.
   */
  in: 520,
  /**
   * Extra ms before the hidden-tab backstop force-settles an animation.
   *
   * Every animation here runs without the native driver on web, which means
   * requestAnimationFrame — and a browser stops that dead for a background tab.
   * Without the backstop, opening a category in a tab that is not in front
   * leaves the screen parked off to one side at opacity 0, permanently, and the
   * navigation that was supposed to follow the exit never happens at all.
   */
  backstop: 90,
} as const

/** The design viewport. Wider screens centre the column rather than stretch it. */
export const SET_CONTENT_MAX = 430
