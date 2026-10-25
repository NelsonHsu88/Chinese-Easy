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
  /* SS1017: Shifu with his scroll, the pagoda and the blossom — "SS1017 New Home
     Redesign UI (6)", cut by `processSS1017Art.mjs` and placed in this 863px frame. */
  /* The hero is now drawn full width by `RefHero` ("SS1017 New APP DesIGN UI (5)"); `box` is unused. */
  /* SS1020: Shifu correctly proportioned, with the mockup's type and streak pill painted out
     (`scripts/processSS1020HeroArt.mjs`). Laid full width at its own ratio (`HOME_HERO_SIZE`). */
  hero: { source: require('../../assets/images/app/home-hero-ss1020.png'), box: { x: 0, y: 0, w: 1170, h: 780 } },
  /** The word card's range, mirrored and sunless; Home lays it across the whole hero, under Shifu. */
  heroBackdrop: { source: require('../../assets/images/home/hero-backdrop.png'), box: { x: 385, y: 902, w: 431, h: 194 } },
  /* The next four are from "SS1017 New APP DesIGN UI (5)", their boxes converted
     into this 863px frame against each card's edges (that mockup's cards are 740px wide). */
  /* The Review card keeps its SS1012 painting (`processHomeArt.mjs`). */
  review: { source: require('../../assets/images/home/review.png'), box: { x: 455, y: 524, w: 361, h: 278 } },
  wordRange: { source: require('../../assets/images/app/home-word.png'), box: { x: 295, y: 860, w: 521, h: 302 } },
  /** The gift on its gold disc, beside "Daily Challenges". */
  lantern: { source: require('../../assets/images/app/home-challenge-icon.png'), box: { x: 64, y: 1231, w: 92, h: 92 } },
  challengeTrees: {
    source: require('../../assets/images/home/challenge-trees.png'),
    box: { x: 45, y: 1318, w: 82, h: 178 },
  },
  challengeRocks: {
    source: require('../../assets/images/home/challenge-rocks.png'),
    box: { x: 238, y: 1452, w: 240, h: 44 },
  },
  /** The whole gift (the Challenges screen's own), centred in a disc on the reward row. */
  challengeGift: {
    source: require('../../assets/images/challenges/gift.png'),
    box: { x: 0, y: 0, w: 208, h: 134 },
  },
} as const

/** The header painting's pixel size; the screen lays it at this ratio, never stretched. */
export const HOME_HERO_SIZE = { width: 1170, height: 780 } as const

/** Shifu's mouth and the left edge of his face, in the old `hero`'s own pixels — where the bubble's tail pointed. */
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
