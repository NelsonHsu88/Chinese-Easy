/*
 * Home's artwork. (The previous Dashboard's pieces in `images/dashboard/` are
 * no longer drawn here; Profile and Subscription still use some of them.)
 */

/** The painted flame in the streak pill — an app asset, never a platform emoji. */
export const FIRE_ICON = require('../../assets/images/icons/fire.png')

/*
 * The redesigned Home's watercolour, cut from its reference mockup ("SS1012
 * Home Page Redesign UI 2") by `scripts/processHomeArt.mjs`. `box` is each
 * piece's crop in the mockup's 863px-wide pixels, which is how the screen
 * places it: everything on Home is laid out as a fraction of that width, so
 * the art lands where the mockup painted it at any column size.
 */
export const homeArt = {
  hero: { source: require('../../assets/images/home/hero.png'), box: { x: 375, y: 70, w: 488, h: 436 } },
  /** The word card's range, mirrored and sunless; Home lays it across the whole hero, under Shifu. */
  heroBackdrop: { source: require('../../assets/images/home/hero-backdrop.png'), box: { x: 385, y: 902, w: 431, h: 194 } },
  review: { source: require('../../assets/images/home/review.png'), box: { x: 455, y: 524, w: 361, h: 278 } },
  wordRange: { source: require('../../assets/images/home/word-range.png'), box: { x: 385, y: 902, w: 431, h: 194 } },
  lantern: { source: require('../../assets/images/home/lantern.png'), box: { x: 66, y: 1212, w: 94, h: 132 } },
  challengeTrees: {
    source: require('../../assets/images/home/challenge-trees.png'),
    box: { x: 45, y: 1318, w: 82, h: 178 },
  },
  challengeRocks: {
    source: require('../../assets/images/home/challenge-rocks.png'),
    box: { x: 238, y: 1452, w: 240, h: 44 },
  },
  challengeGift: {
    source: require('../../assets/images/home/challenge-gift.png'),
    box: { x: 605, y: 1280, w: 212, h: 216 },
  },
} as const

/** Shifu's mouth and the left edge of his face, in `hero`'s own pixels — where the bubble's tail points. */
export const HERO_SHIFU = { mouthY: 267, faceX: 140 } as const

/**
 * The cards' own edges in the mockup, which the art boxes above are measured
 * against. Every card spans the column.
 */
export const homeRefCards = {
  review: { x: 43, y: 509, w: 777, h: 296 },
  word: { x: 43, y: 820, w: 777, h: 370 },
  challenges: { x: 43, y: 1210, w: 777, h: 289 },
  week: { x: 43, y: 1517, w: 777, h: 200 },
} as const
