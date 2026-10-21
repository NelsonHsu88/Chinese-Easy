/*
 * The Challenges design system, built to the Beta 2.1 reference
 * (`SS 929 Redesigned Challenges.png`).
 *
 * This screen used to be one of the self-contained palettes — greyer greens,
 * warmer golds, Nunito throughout. The redesign moves it into the
 * ivory-and-jade family instead, next to Review, which it is visibly a sibling
 * of: Lora Bold headings, hairline-bordered cards with almost no shadow, and
 * watercolour painted straight onto the paper in the hero, on the left of each
 * card, and in the completion reward. So the palette is spread from
 * `revColors`, and only what the reference adds is defined here.
 *
 * **This file is the only place a colour literal belongs.** Light-only, like
 * the rest of this family.
 */

import { revColors, revShadow } from '../review/tokens'
import { PAGE_SUBTITLE, PAGE_TITLE } from '../pageHeader'

export const chalColors = {
  ...revColors,

  /**
   * The page and the card. Sampled from the reference, and they have to stay
   * exactly these: the paintings were keyed against them
   * (`processChallengesArt.mjs`), and an un-blended watercolour only
   * reconstructs cleanly over the colour it was un-blended from.
   */
  background: '#FFFFFF',
  card: '#FCFAF6',
  /** The completion reward card — a shade warmer, so it reads as a prize. */
  reward: '#FAF7F0',
  border: '#E3E1D9',

  /** Subtitle, descriptions, the resets line. */
  slate: '#5A6A80',

  /** The active tab, the progress bars and the day checks. */
  jade: '#3C9561',
  /** The side of a raised jade button (active tab, Claim) — a step below `jade`. */
  jadeShoulder: '#2B7148',
  /** The side of a raised quiet button (an inactive tab). */
  quietShoulder: '#DCD9CF',
  bar: '#459E67',
  track: '#E7E6E2',
  /** Today, begun but not yet counted: a pale disc in the check's family. */
  todayRing: '#B1E8C2',
  todayWash: '#E8F4E6',
  /** A day with nothing in it, past or future. */
  dayEmpty: '#E6E6E4',

  /** The reward pill. */
  goldWash: '#FEF1D6',
  star: '#E0A93E',
  goldInk: '#B37E24',

  /** The streak flame's disc. */
  peach: '#FEE6D6',

  onJade: '#FFFFFF',
} as const

/**
 * The refined Challenges palette: fewer colours, used more deliberately. The
 * cards are near-white with a hairline, so the paintings carry the colour; one
 * jade drives the tabs, the bars and Claim; one gold drives every reward.
 *
 * Kept apart from `chalColors` because Profile spreads that object, and this
 * refinement is for this screen only. Two values are a step darker than the
 * brief asked (`jade`, `goldInk`, `slate`) so white-on-jade tab labels, the
 * "+10" and the small descriptions stay at about 4.5:1 contrast.
 */
export const chalPalette = {
  page: '#FAF9F6',
  ink: '#1C263D',
  slate: '#66738A',
  border: '#E5E4DC',

  /** The selected tab and Claim. Brief: #5D906E. */
  jade: '#4F8461',
  /** The selected tab's thin lower edge. */
  jadeEdge: '#43724F',
  onJade: '#FFFFFF',

  /** The claimed pill's quiet fill. (Progress bars are the shared `RaisedProgressBar`.) */
  track: '#E2E8DF',

  /** The reward pill. Brief text: #A77E35. */
  goldWash: '#FBF3DF',
  star: '#C49A49',
  goldInk: '#8F6C2A',
} as const

/** Each challenge kind's card: a whisper of colour, a hairline, and an accent for its chevron. */
export const chalSceneTint = {
  words: { fill: '#FAF9F4', border: '#E6E7E0', accent: '#6F9B78' },
  writing: { fill: '#FCF9F1', border: '#EBE5D5', accent: '#BE9A5C' },
  listening: { fill: '#F6F9FA', border: '#DFE7E9', accent: '#7B9CAC' },
  review: { fill: '#FBF7F5', border: '#EBE1DD', accent: '#BA9287' },
} as const

export const chalSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  /** Horizontal page margin. */
  screen: 20,
} as const

/**
 * Sizes only — weight comes from the font *family*. Lora for anything read as
 * a heading, a number or prose, as the reference draws it; Nunito nowhere but
 * the pill and tab labels, which are UI rather than reading.
 */
export const chalType = {
  title: PAGE_TITLE,
  subtitle: PAGE_SUBTITLE,
  bubble: { fontSize: 13, lineHeight: 18 },
  streakTitle: { fontSize: 18, lineHeight: 23 },
  streakSub: { fontSize: 13.5, lineHeight: 18 },
  dayLetter: { fontSize: 11.5, lineHeight: 14 },
  tab: { fontSize: 15.5, lineHeight: 20 },
  section: { fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  resets: { fontSize: 13.5, lineHeight: 18 },
  /* Wraps rather than truncating — see `ChallengeCard`. */
  cardTitle: { fontSize: 15.5, lineHeight: 19.5 },
  cardBody: { fontSize: 12.5, lineHeight: 16 },
  count: { fontSize: 13.5, lineHeight: 17 },
  reward: { fontSize: 14, lineHeight: 18 },
  rewardTitle: { fontSize: 15.5, lineHeight: 20 },
} as const

export const chalRadius = {
  medium: 18,
  large: 20,
  pill: 999,
} as const

/** A challenge card. All of them draw the same grid. */
export const chalCard = {
  minHeight: 78,
  /** The share of the card the painting occupies; the title starts just past it. */
  artShare: 0.3,
  /**
   * How much of the painting the text column starts over: its right-hand
   * fifth is the feathered fade (`processChallengesArt.mjs`), which is mist
   * rather than subject, and the mockup's title sits on it.
   */
  textOverlap: 0.1,
  paddingY: 12,
  paddingRight: 10,
  /** Gap between cards — carried as each row's own margin so a claimed one can collapse it. */
  gap: 10,
} as const

export const chalReward = {
  minHeight: 88,
  /** Gift painting's share of the card. */
  giftShare: 0.3,
  /** The sakura-and-pagoda corner's share. */
  cornerShare: 0.3,
} as const

/** The streak card's week: seven equal columns. */
export const chalWeek = {
  dot: 16,
  flame: 44,
} as const

/**
 * The hero painting, which bleeds off the right edge and whose bottom meets the
 * streak card's top. It is the Profile screen's hero (no Shifu).
 */
export const chalHero = {
  /** Width at the 430pt design column; narrower phones scale it with the column. */
  artWidth: 236,
  /** The render is 455×242. */
  artRatio: 455 / 242,
} as const

/** Ratios of the cropped renders, for sizing — RN will not size an Image from its pixels. */
export const CHAL_ART_RATIO = {
  card: 200 / 127,
  gift: 208 / 134,
  corner: 197 / 135,
} as const

export const chalShadow = revShadow

/** One beat, like Review: the painting in from the right, everything else rising. */
export const chalEntrance = {
  at: 0,
  for: 380,
  slideY: 18,
  slideX: 28,
} as const

export const CHAL_CONTENT_MAX = 430
