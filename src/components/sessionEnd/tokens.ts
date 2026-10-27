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
  /* The three stats: each number in its icon's colour, the icon on a pale disc. */
  /** XP earned: gold. */
  xp: '#C98A1B',
  xpDisc: '#FBF0D6',
  /** Words reviewed: jade. */
  words: '#2E7D4F',
  wordsDisc: '#E8F1E6',
  /** Accuracy: blue. */
  accuracy: '#3E6FB0',
  accuracyDisc: '#E5EDF8',
} as const

/*
 * The result boxes (Duolingo's lesson-complete boxes): a frame colour (the
 * header band and the outline), the number's ink, and the sparkles. Gold for
 * XP, jade for accuracy, blue for the count.
 */
export const endBoxes = {
  xp: { frame: '#F2B33D', ink: '#C98A1B', star: '#F6C658' },
  accuracy: { frame: '#5BAE5A', ink: '#2E7D4F', star: '#7CC66A' },
  count: { frame: '#4A93DB', ink: '#2F6FB5', star: '#73B2EE' },
  body: '#FFFFFF',
  label: '#FFFFFF',
} as const

/** The boxes' geometry: the header band, the white body, its outline. */
export const endBoxSize = { header: 26, body: 62, outline: 3, radius: 16, gap: 10 } as const

export const endType = {
  /** Lora Bold. "Nothing to Review" / "Session Complete!". */
  title: { fontSize: 38, lineHeight: 45, letterSpacing: -0.5 },
  /** Lora. The two lines under it. */
  subtitle: { fontSize: 18, lineHeight: 24 },
  /** Lora. The tip beside the scroll. */
  tip: { fontSize: 15, lineHeight: 21 },
} as const

export const endSpacing = {
  screen: 20,
  titleGap: 8,
  /** Subtitle to card, and card to the foot. */
  section: 18,
} as const

export const endRadius = { card: 22 } as const

export const endShadow = revShadow


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
export const endContentBelow = { empty: 270, done: 280 } as const


export const END_CONTENT_MAX = 430
