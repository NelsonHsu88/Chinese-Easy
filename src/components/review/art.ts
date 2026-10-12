/*
 * The Review hub's artwork.
 *
 * Everything here except the flame is cropped out of the reference mockup by
 * `scripts/processReviewArt.mjs` and keyed into real alpha — the hero and foot
 * against the page colour, the card scenes against the card colour — so each
 * sits on its surface with no rectangle behind it. Those two colours are
 * `revColors.background` and `revColors.card`; change either and re-run the
 * script, or the paintings grow a faint halo.
 *
 * Ratios are the trimmed renders' own: React Native does not size an `Image`
 * from its intrinsic dimensions, so a width with no height lays out at zero.
 */
export const revArt = {
  hero: require('../../assets/images/review/hero.png'),
  foot: require('../../assets/images/review/foot.png'),
  cards: {
    flashcards: require('../../assets/images/review/card-flashcards.png'),
    listening: require('../../assets/images/review/card-listening.png'),
    mistakes: require('../../assets/images/review/card-mistakes.png'),
  },
  /** The app's own painted flame, shared with the Dashboard. */
  fire: require('../../assets/images/icons/fire.png'),
} as const

/** The fire render is 328×384. */
export const FIRE_RATIO = 328 / 384
