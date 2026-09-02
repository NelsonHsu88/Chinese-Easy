/*
 * The subscription screen's artwork, and the one number each piece needs.
 *
 * Every ratio is the *trimmed* asset's own width/height — measured after the
 * trim its script performs, not from the source render — because a caller picks
 * a width and the height is derived from it. React Native does not size an
 * `Image` from its intrinsic dimensions the way a browser does, so a width with
 * no height lays out at zero and the artwork silently vanishes.
 *
 * Only Shifu is new here. The rest is the app's existing watercolour: this
 * screen is a room in the same house as the Dashboard and onboarding, and a
 * second copy of the same range would be megabytes spent on making it look
 * slightly different.
 */

export const subArt = {
  /** Purchase state: the welcoming, thumbs-up Shifu. Trimmed to his own edges. */
  shifuThumbsUp: {
    source: require('../../assets/images/subscription/shifu-thumbs-up.png'),
    ratio: 400 / 708,
  },
  /**
   * Subscribed state: Shifu with his hands together. The Dashboard's asset,
   * reused deliberately — it is the same render the reference uses, already
   * trimmed and already in the bundle.
   */
  shifuGratitude: {
    source: require('../../assets/images/dashboard/shifu-bow.png'),
    ratio: 300 / 704,
  },
  /**
   * The hero backdrop. Onboarding's pagoda range, drawn mirrored so the pagoda
   * stands to the *right* of the mountains as the reference has it — the same
   * `scaleX: -1` trick the Dashboard hero uses rather than a second asset.
   */
  pagodaRange: {
    source: require('../../assets/images/onboarding/pagoda-mountains.png'),
    ratio: 460 / 277,
  },
  /** The branch across the top-left, bleeding off the edge. */
  sakura: {
    source: require('../../assets/images/onboarding/sakura-branch.png'),
    ratio: 560 / 318,
  },
  /**
   * The subscribed state's closing scenery, along the foot of the page. It is
   * the widest, calmest landscape in the app and it exists to *end* the screen:
   * misty ranges and trees fading up into the cream.
   */
  panorama: {
    source: require('../../assets/images/onboarding/mountains-panorama.png'),
    ratio: 880 / 326,
  },
} as const
