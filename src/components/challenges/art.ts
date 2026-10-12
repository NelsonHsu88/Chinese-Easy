import type { ChallengeScene } from '../../lib/challenges'

/*
 * The Challenges screen's artwork.
 *
 * Everything here except the flame and the hero is cropped out of the
 * reference mockup by `scripts/processChallengesArt.mjs` and keyed into real alpha — the hero
 * against the page colour, the card scenes against the card colour, the gift
 * and corner against the reward card's — so each sits on its surface with no
 * rectangle behind it. Change any of those colours in `tokens.ts` and re-run
 * the script, or the paintings grow a faint halo.
 */
export const chalArt = {
  /* The Profile screen's hero: the same sun, range, pagoda and sakura as the
     reference drew here, without Shifu, who was taken off this screen. */
  hero: require('../../assets/images/profile/hero.png'),
  gift: require('../../assets/images/challenges/gift.png'),
  corner: require('../../assets/images/challenges/reward-corner.png'),
  /** The app's own painted flame, shared with the Dashboard and Review. */
  fire: require('../../assets/images/icons/fire.png'),
} as const

/** `streak` has no painting: the card draws the flame on a disc instead. */
export const SCENE_ART: Record<Exclude<ChallengeScene, 'streak'>, number> = {
  words: require('../../assets/images/challenges/card-words.png'),
  writing: require('../../assets/images/challenges/card-writing.png'),
  listening: require('../../assets/images/challenges/card-listening.png'),
  review: require('../../assets/images/challenges/card-review.png'),
  gift: require('../../assets/images/challenges/gift.png'),
}

/** The fire render is 328×384. */
export const FIRE_RATIO = 328 / 384
