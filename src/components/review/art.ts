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
  hero: require('../../assets/images/app/review-hero.png'),
  foot: require('../../assets/images/review/foot.png'),
  /* The `tinted/` copies (`scripts/processTintedArt.mjs`): each mode card
     wears its own SS1017 wash, and their paper takes it. */
  cards: {
    flashcards: require('../../assets/images/app/review-flashcards.png'),
    listening: require('../../assets/images/app/review-mixed.png'),
    mistakes: require('../../assets/images/app/review-mistakes.png'),
  },
  /** Shifu's portrait beside the quote at the foot, and the pagoda scene at its right. 136×140, 208×168. */
  shifuQuote: require('../../assets/images/app/review-quote-shifu.png'),
  quoteScene: require('../../assets/images/app/review-quote-scene.png'),
  /** The app's own painted flame, shared with the Dashboard. */
  fire: require('../../assets/images/icons/fire.png'),
} as const

/** The fire render is 328×384. */
export const FIRE_RATIO = 328 / 384
