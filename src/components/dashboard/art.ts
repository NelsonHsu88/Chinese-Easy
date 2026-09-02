/*
 * The Dashboard's artwork, and the one number each piece needs.
 *
 * Every ratio here is the *processed* asset's own width/height as emitted by
 * `scripts/processDashboardArt.mjs` — measured after the trim, not from the
 * source render. That distinction matters: the trim is what removes each
 * render's transparent margin, so these ratios describe the visible painting
 * and nothing else. Re-run that script and these may need updating with it.
 *
 * Callers pick a width; `CardArt` derives the height.
 */

export const dashArt = {
  shifu: { source: require('../../assets/images/dashboard/shifu-bow.png'), ratio: 300 / 704 },
  fire: { source: require('../../assets/images/dashboard/fire.png'), ratio: 300 / 274 },
  wordMountains: { source: require('../../assets/images/dashboard/word-mountains.png'), ratio: 440 / 277 },
  scroll: { source: require('../../assets/images/dashboard/scroll.png'), ratio: 250 / 316 },
  bonsai: { source: require('../../assets/images/dashboard/bonsai.png'), ratio: 290 / 197 },

  /*
   * The hero reuses onboarding's scenery rather than shipping a second copy.
   * It is the same watercolour range and the same pagoda the reference shows
   * behind Shifu, and the learner has just walked past both of them.
   */
  sakura: { source: require('../../assets/images/onboarding/sakura-branch.png'), ratio: 560 / 318 },
  pagoda: { source: require('../../assets/images/onboarding/pagoda-mountains.png'), ratio: 460 / 277 },
} as const

/** The painted flame in the streak pill — an app asset, never a platform emoji. */
export const FIRE_ICON = require('../../assets/images/icons/fire.png')
