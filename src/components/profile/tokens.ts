import type { PlayHue } from '../dashboard/tokens'
import type { ProfileRewardId } from '../../lib/progression/profileRewards'
/*
 * The Profile design system, built to the Beta 2.1 reference
 * (`SS 929 Redesigned Profile UI Screen.png`).
 *
 * The ivory-and-jade family again — spread from the Challenges palette, which
 * is spread from Review's, which is spread from the Dashboard's. The profile is
 * meant to read as the Dictionary's restraint with Learn's watercolour, which is
 * exactly what that family already is: Lora headings, hairline cards, almost no
 * shadow, paint in a few deliberate places.
 *
 * **This file is the only place a colour literal belongs.** Light-only.
 *
 * Two small palettes here are cosmetics, and they colour the Profile screens
 * only: `profileInk.plain` is the default treatment and `profileInk.jade` is
 * what the Jade Ink reward swaps in. Nothing outside `components/profile/` and
 * the profile screens may read them — the reward's whole promise is that it
 * does not reskin the app.
 */

import { chalColors, chalShadow } from '../challenges/tokens'

export const profColors = {
  ...chalColors,
  /** The page the hero and garden were keyed against (`processProfileArt.mjs`). */
  background: '#FFFFFF',
  card: '#FDFBF7',
  /** Reward tiles and the garden panel: a shade warmer than the card they sit in. */
  tile: '#FAF8F3',
  border: '#E6E2DA',

  /** The avatar disc — the same muted sage as the Settings profile card's. */
  /* Greener for SS1017, and deep enough that the white initial on it reads (3:1). */
  sage: '#6FA377',

  /** The streak stat's disc, and the XP star's. */
  fireDisc: '#FEE6D6',
  starDisc: '#FDF0D2',

  /** Pewter: the empty badge slot on the profile shelf. The gold* values are the gold tier's. */
  gold: '#E8BF6A',
  goldRing: '#CF9F45',
  goldInk: '#7A5418',
  pewter: '#E7E8EA',
  pewterRing: '#C8CCD2',
  pewterInk: '#8A93A0',
  /** A medal's face is lit from the top left: `…Light` is the lit side, `…Deep` the rim. */
  goldLight: '#F8E2A6',
  goldDeep: '#B9853A',
  pewterLight: '#F6F7F8',
  pewterDeep: '#B4BAC2',
  /** A pinned medal's rim under Jade Ink. */
  jadeLight: '#CFE7D7',
  /**
   * A medal's ribbon tails: cinnabar once earned — the red of a seal and of
   * festival banners, and the one warm accent the gold needs beside the jade —
   * and the pewter's own greys while still to earn. `…Deep` is the far tail,
   * in shadow, which is what makes two flat shapes read as folded cloth.
   */
  ribbon: '#C9574A',
  ribbonDeep: '#A8443A',
  ribbonLocked: '#D5D8DD',
  ribbonLockedDeep: '#C2C7CE',
  /** Medal highlight — the glint, drawn at low opacity. */
  glint: '#FFFFFF',

  /** The quiet button's shoulder: a warm grey, lighter than the review outline. */
  quietShoulder: '#D6D1C6',

  /** A tile for something earned or worn — the faintest wash of the mint. */
  earnedTile: '#F5F9F3',
  /**
   * An achievement row once earned. Clearly greener than `earnedTile`: every
   * medal is drawn in full colour whether earned or not, so this wash is the
   * thing that says "you have this".
   */
  achievedTile: '#E7F4E9',
  achievedBorder: '#BCDDC4',

  /** Locked things. */
  locked: '#EFEEEA',
  lockedInk: '#8C929C',

  /** The photo framer: the page cream laid over the photo outside the circle. */
  framerShade: 'rgba(252, 251, 246, 0.74)',

  /** The celebration's scrim. */
  scrim: 'rgba(20, 32, 58, 0.34)',

  /*
   * The Duolingo-style Profile tab: the soft jade banner the big avatar sits
   * on, the dashed ring and its "+" when there's no photo yet, the hairline
   * under the pinned header, the small-caps section labels, and the
   * "Finish your profile" card's wash.
   */
  banner: '#DDEFD7',
  bannerRing: '#8FC398',
  hairline: '#E8E5DE',
  caps: '#7C8596',
  finish: '#EAF4E7',
  finishBorder: '#D3E6CE',
} as const

/**
 * The profile's accent ink — the XP bar, the level pill, the seal beside the
 * name. Default and Jade Ink; see the note at the top of the file.
 */
/**
 * Each cosmetic's hue in the SS1017 palette — the wash its tile wears on Profile
 * and on Rewards: mist is sky, the wreath blossom, the ink jade.
 */
export const REWARD_HUE: Record<ProfileRewardId, PlayHue> = {
  misty_mountain_background: 'sky',
  sakura_frame: 'blossom',
  jade_ink: 'jade',
}

export const profileInk = {
  plain: { bar: '#86B596', pill: '#E9F3EA', pillInk: '#3F7A55', seal: null },
  jade: { bar: '#2E7D57', pill: '#DDEFE3', pillInk: '#1F5E40', seal: '#2E7D57' },
} as const

/**
 * Medal metals, by achievement tier (`achievementTier`). Each medal face is lit
 * from the top left: `light` is the lit side, `face` the body, `deep` the rim,
 * `ring` the inner line and `ink` the icon on it. Gold is the original medal.
 */
export const medalMetals = {
  bronze: { light: '#F4CFA8', face: '#CD8F58', deep: '#8F5A2C', ring: '#A9703E', ink: '#5B3418' },
  silver: { light: '#FBFCFD', face: '#CBD2DA', deep: '#8A939E', ring: '#A6AFBA', ink: '#46505D' },
  gold: { light: '#F8E2A6', face: '#E8BF6A', deep: '#B9853A', ring: '#CF9F45', ink: '#7A5418' },
  diamond: { light: '#F0FBFF', face: '#9FD9EE', deep: '#4A9BBA', ring: '#6DB7D3', ink: '#1C5A72' },
  mythic: { light: '#EBDCFF', face: '#A97BE2', deep: '#6A3CA6', ring: '#8A5CC9', ink: '#3A1866' },
} as const

export type ProfileInk = (typeof profileInk)[keyof typeof profileInk]

export const profSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  screen: 20,
} as const

export const profType = {
  title: { fontSize: 42, lineHeight: 48, letterSpacing: -0.6 },
  subtitle: { fontSize: 16, lineHeight: 21 },
  name: { fontSize: 28, lineHeight: 33 },
  pill: { fontSize: 14, lineHeight: 18 },
  xp: { fontSize: 13.5, lineHeight: 18 },
  statValue: { fontSize: 21, lineHeight: 25 },
  statLabel: { fontSize: 12.5, lineHeight: 16 },
  section: { fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  link: { fontSize: 14, lineHeight: 18 },
  tileTitle: { fontSize: 14, lineHeight: 18 },
  tileBody: { fontSize: 12, lineHeight: 15.5 },
  tag: { fontSize: 12, lineHeight: 15 },
  button: { fontSize: 16, lineHeight: 20 },
  body: { fontSize: 14, lineHeight: 19 },
  /** The Profile tab: the pinned name, the small-caps labels, the stat row and the overview tiles. */
  header: { fontSize: 23, lineHeight: 29 },
  caps: { fontSize: 13, lineHeight: 17, letterSpacing: 1 },
  rowValue: { fontSize: 19, lineHeight: 24 },
  rowLabel: { fontSize: 13.5, lineHeight: 18 },
  tileValue: { fontSize: 17, lineHeight: 22 },
  tileLabel: { fontSize: 12.5, lineHeight: 16 },
} as const

export const profRadius = {
  small: 12,
  medium: 16,
  large: 20,
  pill: 999,
} as const

export const profAvatar = {
  size: 84,
  /** The Sakura Frame wreath's diameter, relative to the avatar. */
  frameScale: 1.42,
} as const

export const profHero = {
  artWidth: 250,
  /** The render is 455×242. */
  artRatio: 455 / 242,
} as const

/** Ratios of the cropped renders — RN will not size an Image from its pixels. */
export const PROF_ART_RATIO = {
  cardMountains: 270 / 140,
  garden: 486 / 212,
} as const

export const profShadow = chalShadow

export const profEntrance = { at: 0, for: 380, slideY: 18, slideX: 28 } as const

export const PROF_CONTENT_MAX = 430
