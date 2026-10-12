import type { ImageSourcePropType } from 'react-native'
import type { GardenItemId, GardenSlotId } from '../../lib/progression/gardenItems'
import type { ProfileRewardId } from '../../lib/progression/profileRewards'
import type { AchievementCategory } from '../../lib/progression/achievements'

/*
 * The Profile family's artwork. Everything except the bonsai is cropped from
 * the reference by `scripts/processProfileArt.mjs` and keyed into real alpha.
 */
export const profArt = {
  hero: require('../../assets/images/profile/hero.png'),
  /** Drawn only while the Misty Mountain Background is equipped. */
  cardMountains: require('../../assets/images/profile/card-mountains.png'),
  /** A full wreath: the Sakura Frame thumbnail *and* the frame around the avatar. */
  sakuraWreath: require('../../assets/images/profile/reward-sakura.png'),
  garden: require('../../assets/images/profile/garden.png'),
  fire: require('../../assets/images/icons/fire.png'),
} as const

export const REWARD_ART: Record<ProfileRewardId, ImageSourcePropType> = {
  misty_mountain_background: require('../../assets/images/profile/reward-misty.png'),
  sakura_frame: require('../../assets/images/profile/reward-sakura.png'),
  jade_ink: require('../../assets/images/profile/reward-ink.png'),
}

export const FIRE_RATIO = 328 / 384

/**
 * Each decoration's render and how it stands in the garden: `height` is its
 * height as a share of the garden scene's, so a lantern is a lantern's size
 * whichever slot it is in.
 */
export const GARDEN_ART: Record<GardenItemId, { source: ImageSourcePropType; ratio: number; height: number }> = {
  bamboo: { source: require('../../assets/images/profile/deco-bamboo.png'), ratio: 140 / 182, height: 0.78 },
  stone_lantern: { source: require('../../assets/images/profile/deco-stone-lantern.png'), ratio: 52 / 74, height: 0.3 },
  hanging_lantern: { source: require('../../assets/images/profile/deco-hanging-lantern.png'), ratio: 46 / 72, height: 0.26 },
  sakura_tree: { source: require('../../assets/images/profile/deco-sakura-tree.png'), ratio: 172 / 180, height: 0.84 },
  /* The Dashboard's own bonsai render (290×197). */
  bonsai: { source: require('../../assets/images/dashboard/bonsai.png'), ratio: 290 / 197, height: 0.4 },
  small_pagoda: { source: require('../../assets/images/profile/deco-pagoda.png'), ratio: 108 / 132, height: 0.56 },
}

/**
 * Where each slot stands in the scene, as shares of its width and height: the
 * horizontal centre and the ground line an item's base sits on. `left` and
 * `right` are where the reference's bamboo and sakura tree stood (both faded
 * out of the base painting); the two centre slots are on the near bank.
 */
export const GARDEN_SLOT_POSITION: Record<GardenSlotId, { x: number; ground: number; depth: number }> = {
  left: { x: 0.17, ground: 0.8, depth: 1 },
  centerLeft: { x: 0.46, ground: 0.97, depth: 3 },
  centerRight: { x: 0.64, ground: 0.95, depth: 3 },
  right: { x: 0.82, ground: 0.8, depth: 1 },
}

/**
 * A painting per achievement category, for the banners that head each group
 * on the Achievements screen. None of this is new art: it is the Challenges
 * card scenes and the Dashboard's campfire and scroll, already in the bundle
 * and already keyed against a near-identical card colour, so an achievement
 * reads as belonging to the same activity the learner practises elsewhere.
 * `ratio` is width / height of the trimmed render.
 */
export const ACHIEVEMENT_ART: Record<AchievementCategory, { source: ImageSourcePropType; ratio: number }> = {
  vocabulary: { source: require('../../assets/images/challenges/card-words.png'), ratio: 200 / 125 },
  review: { source: require('../../assets/images/challenges/card-review.png'), ratio: 200 / 128 },
  writing: { source: require('../../assets/images/challenges/card-writing.png'), ratio: 200 / 127 },
  listening: { source: require('../../assets/images/challenges/card-listening.png'), ratio: 200 / 128 },
  reading: { source: require('../../assets/images/dashboard/scroll.png'), ratio: 250 / 316 },
  streak: { source: require('../../assets/images/dashboard/fire.png'), ratio: 300 / 274 },
  challenges: { source: require('../../assets/images/challenges/gift.png'), ratio: 208 / 134 },
}
