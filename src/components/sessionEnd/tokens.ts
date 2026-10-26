/*
 * The review session's two end screens — "Nothing to Review" and "Session
 * Complete!" — built to the Beta 2.1 references (`SS930 Nothing to Review
 * Redesign Ui.png`, `SS930 Session Complete Redesign UI.png`).
 *
 * Same room as the Review hub they close back to, so the palette spreads
 * `revColors` and the button is the hub's own `ReviewButton`. The one thing that
 * is not shared is the paper: each mockup is on its own slightly warmer cream,
 * and its painting was keyed against that cream (`processSessionEndArt.mjs`).
 * An un-blended watercolour only reconstructs cleanly over the colour it was
 * un-blended from, so `emptyPage` and `donePage` must stay exactly these.
 *
 * Light-only, like every screen in this family.
 */
import { revColors, revShadow } from '../review/tokens'

export const endColors = {
  ...revColors,
  emptyPage: '#FFFFFF',
  /** `emptyPage` at zero alpha: the top of the fade under the full-bleed hero. */
  emptyPageClear: 'rgba(255,255,255,0)',
  donePage: '#FFFFFF',
  /** The tip and stats cards: a shade lighter than either page, on a hairline. */
  panel: '#FFFDF9',
  /** Accuracy: the number, and the icon on its mint disc. */
  accuracy: '#2E7D4F',
  accuracyDisc: '#E8F1E6',
  /** Streak: the number is gold, the flame orange on a peach disc. */
  streak: '#D69A2D',
  flame: '#F07A2F',
  flameDisc: '#FDEBDF',
} as const

export const endType = {
  /** Lora Bold. "Nothing to Review" / "Session Complete!". */
  title: { fontSize: 38, lineHeight: 45, letterSpacing: -0.5 },
  /** Lora. The two lines under it. */
  subtitle: { fontSize: 18, lineHeight: 24 },
  /** Lora. The tip beside the scroll. */
  tip: { fontSize: 15, lineHeight: 21 },
  /** Lora, small capitals by hand: "ACCURACY", "STREAK". */
  statLabel: { fontSize: 13, lineHeight: 17, letterSpacing: 0.7 },
  /** Lora Bold, the stat itself. */
  statValue: { fontSize: 36, lineHeight: 42 },
  /** Lora, the line under it. */
  statNote: { fontSize: 14, lineHeight: 19 },
} as const

export const endSpacing = {
  screen: 20,
  titleGap: 8,
  /** Subtitle to card, and card to the foot. */
  section: 18,
} as const

export const endRadius = { card: 22 } as const

export const endShadow = revShadow

/** The stats card's icon discs, at the 430pt column. */
export const END_DISC = 64

/*
 * Art proportions, from the trimmed renders. React Native does not size an
 * Image from its intrinsic dimensions, so each one is laid out from these.
 */
export const endArt = {
  emptyHero: 941 / 833,
  doneHero: 941 / 715,
  scroll: 292 / 192,
  /** The scroll's width as a share of the column, as the reference draws it. */
  scrollShare: 292 / 941,
  emptyFoot: 941 / 320,
  doneFoot: 941 / 381,
} as const

/*
 * Where the button sits on the foot painting, as fractions of the painting's
 * width — the soft hole `processSessionEndArt.mjs` cut where the mockup's
 * button was. Move these and the crop boxes together.
 */
export const endFoot = {
  empty: { top: 26 / 941, inset: 108 / 941 },
  done: { top: 30 / 941, inset: 110 / 941 },
} as const

/**
 * Height everything under the hero needs, per state, at the 430pt design
 * column: title, subtitle, card and the gaps between them. The hero is given
 * what is left of the screen after this and the foot, so a short phone shrinks
 * the painting before it scrolls. Estimated from the type sizes above; re-measure
 * if anything below the hero changes height.
 */
export const endContentBelow = { empty: 270, done: 300 } as const

/** The hero never shrinks below this share of its natural height. */
export const END_HERO_MIN = 0.6

export const END_CONTENT_MAX = 430
