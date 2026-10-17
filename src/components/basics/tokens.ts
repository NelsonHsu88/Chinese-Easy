/*
 * Chinese Basics' design system, built to the Beta 2.1 reference
 * (`SS 1014 Writing Basic UI redesign.png`).
 *
 * The ivory-and-jade family again — Review's palette, which is the Dashboard's
 * — with the sage the reference uses for its progress bar and its soft pill
 * buttons. Lora for headings, Nunito for small print, hairline cards with the
 * family's faint shadow.
 *
 * **This file is the only place a colour literal belongs.** Light-only, like
 * the rest of this family.
 */

import { drillColors, drillSheet, drillType } from '../drills/tokens'
import { onbVerdict } from '../onboarding/tokens'
import { revColors, revShoulders, revSpacing, revType } from '../review/tokens'
import { PAGE_SUBTITLE, PAGE_TITLE } from '../pageHeader'
import type { PlayHue } from '../dashboard/tokens'
import type { BasicsGroupId } from '../../data/basics'

/**
 * Each group's hue in the SS1017 palette — its tile on Chinese Basics, and the
 * wash its lessons' cards and progress take, so a lesson is visibly part of the
 * group it was opened from.
 */
export const BASICS_GROUP_HUE: Record<BasicsGroupId, PlayHue> = {
  pronunciation: 'blossom',
  characters: 'jade',
  writing: 'honey',
  sentences: 'sky',
}

/*
 * Every role below resolves to a colour the rest of the app already uses —
 * Review's jade and mint, the drills' green progress and selection, and
 * `onbVerdict` for right / wrong / revealed — so a Basics lesson looks like
 * the same room as a Mixed Drills session. Only the card (keyed art) and the
 * tone inks are Basics' own.
 */
export const basicsColors = {
  ...revColors,

  /**
   * Card surface, sampled from the reference. The card scenes were keyed
   * against it (`scripts/processBasicsArt.mjs`), so it must stay exactly this.
   */
  card: '#FDFCFA',

  /** The progress fill — the drills' progress green. */
  sage: drillColors.green,
  /** Text and chevrons on the soft pill — Review's dark jade. */
  sageDark: revColors.jadeDark,
  /** The soft pill and chevron circle — Review's mint. */
  sageSoft: revColors.mint,
  /** An empty progress track, as in the drills. */
  track: drillColors.track,

  /** A wrong answer's outline, ink and fill — the app's verdict palette. */
  wrong: onbVerdict.incorrect.accent,
  wrongInk: onbVerdict.incorrect.text,
  wrongSoft: onbVerdict.incorrect.fill,
  /** A right answer's. */
  right: onbVerdict.correct.accent,
  rightInk: onbVerdict.correct.text,
  rightSoft: onbVerdict.correct.fill,
  /** A revealed answer — gold, the app's "I don't know". */
  unsureInk: onbVerdict.unsure.text,
  unsureSoft: onbVerdict.unsure.fill,

  /** Label on the solid jade button. */
  onSolid: '#FFFFFF',

  /**
   * The side of each raised button (`BasicsRaised`, `LiftedFace`), a step
   * down from its face — the same shoulders the drills use.
   */
  shoulder: {
    jade: revShoulders.primary,
    sage: drillColors.disabled,
    quiet: drillColors.tileShoulder,
    selected: drillColors.greenDark,
    right: drillSheet.correct.shoulder,
    wrong: drillSheet.incorrect.shoulder,
    disabled: drillColors.disabledShoulder,
  },

  /** A selected (not yet checked) option — the drills' green selection. */
  selected: drillColors.greenFill,
  selectedBorder: drillColors.green,

  /**
   * One ink per tone, for the pitch contours. Never the only signal — every
   * contour is labelled with its tone's name.
   */
  tone: {
    1: '#3D8057',
    2: '#B7822A',
    3: '#6B5BB5',
    4: '#C75A4F',
    5: '#8C97A6',
  },
  /** The pitch grid behind a contour. */
  toneGrid: '#ECE9E2',
} as const

/** Cap on every full-screen column, as everywhere in the app. */
export const BASICS_CONTENT_MAX = 430
export const BASICS_GUTTER = 20
export const BASICS_RADIUS = 24

/**
 * Spacing: Review's 4-point scale, so a Basics screen sits on the same rhythm
 * as the rest of the family. Use these, never a loose number.
 */
export const basicsSpacing = revSpacing

export const basicsRadius = {
  /** The Continue card, the group tiles, a lesson's step card. */
  card: BASICS_RADIUS,
  /** A lesson row, a lesson's own cards. */
  row: 20,
  /** Panels inside a card: feedback, an example line. */
  inner: 16,
  pill: 999,
} as const

/**
 * Sizes and line heights only; weight comes from the font family. Lora for
 * anything read as a heading or as content, Nunito for labels and counters.
 * One size per role, so the three screens never disagree.
 */
export const basicsType = {
  /** Lora Bold, Chinese Basics' own page title. */
  pageTitle: PAGE_TITLE,
  /** Lora, the line under it. */
  pageSubtitle: PAGE_SUBTITLE,
  /** Lora Bold, a group's title on its own screen. */
  groupTitle: { fontSize: 32, lineHeight: 38, letterSpacing: -0.4 },
  /** Lora Bold, a step's heading and the finish card's title. */
  stepTitle: { fontSize: 25, lineHeight: 31 },
  /** Lora Bold, the Continue card's lesson. */
  cardTitle: { fontSize: 21, lineHeight: 26 },
  /** Lora Bold, a group tile. */
  tileTitle: { fontSize: 18, lineHeight: 23, letterSpacing: -0.2 },
  /** Lora Bold, a lesson row. */
  rowTitle: { fontSize: 17, lineHeight: 22 },
  /** Lora Bold, the lesson player's header. */
  headerTitle: { fontSize: 16, lineHeight: 21 },
  /** Lora, a step's explanation. */
  body: { fontSize: 16, lineHeight: 23 },
  /** Lora, feedback and finish-card lines. */
  bodySmall: { fontSize: 15, lineHeight: 21 },
  /** Lora, a tile's or row's description. */
  cardBody: { fontSize: 13.5, lineHeight: 18.5 },
  /** Nunito Bold, uppercase: "CONTINUE LESSON", a module heading. */
  eyebrow: { fontSize: 12, lineHeight: 16, letterSpacing: 1.6 },
  /** Nunito, counters and durations: "3 / 7 lessons", "5 min". */
  meta: { fontSize: 13, lineHeight: 17 },
  /** Nunito Bold, inside a pill. */
  pill: { fontSize: 12, lineHeight: 16 },
  /** Lora Bold, a button on the hub screens, as on Review and Home. */
  hubButton: revType.cta,
  /** Nunito Bold, a button inside a lesson, as in the drills. */
  lessonButton: drillType.button,
} as const
