/*
 * The Challenges palette and geometry, sampled from the reference mockup.
 *
 * One source, because the failure mode this prevents is real: a screen with five
 * slightly different greens, where each was picked by eye in a different
 * component. Nothing under `src/components/challenges/` should contain a colour
 * literal — if a value is needed that isn't here, it belongs here first.
 *
 * Deliberately a fourth namespace rather than a reuse of the reading library's
 * `read-*` scale: these greens are greyer and the golds warmer. Don't mix them.
 * The matching Tailwind entries are the shadows only (`shadow-chal`,
 * `shadow-chal-tabs`, `shadow-chal-claim`) — colours live here, since most of
 * them are consumed by animated or state-dependent styles rather than classes.
 */
export const CHAL = {
  /** Page. */
  bg: '#fcfaf6',
  card: '#fffdfc',
  line: '#ece7dd',

  /** Type. */
  navy: '#151d2d',
  body: '#6f7674',
  muted: '#b4c0b9',

  /** In-progress accents. Each challenge's own tone overrides these on its bar. */
  coral: '#ec7567',
  coralDark: '#d1573b',

  /** Completion. */
  mint: '#d8e6d7',
  mintPale: '#eef5ec',
  mintLine: '#dfeadd',
  mintTrack: '#dbe8d9',
  mintBorder: '#c6ddc4',
  green: '#89a796',
  greenDeep: '#5e8672',
  greenInk: '#2f5744',
  greenTile: '#3f6b52',
  ringTrack: '#e6ece6',

  /** Reward. */
  goldSoft: '#fbe0b3',
  gold: '#f3bf80',
  goldEdge: '#e0a75f',
  goldInk: '#8a5a1f',
  goldDeep: '#5c3a10',
  goldWash: '#fdf6e8',
  goldWashLine: '#f6e3c2',

  /** Surfaces and empty tracks. */
  warm: '#f8f1e3',
  warmLine: '#f0e5cf',
  track: '#eceae7',

  /** Type that sits on a filled green shape. */
  onGreen: '#ffffff',

  /** Handwritten note. */
  noteInk: '#5c4622',
} as const

/** The 8-point spacing scale the whole screen is laid out on. */
export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const

/** Screen gutter. Every card edge, the header and the tabs align to this. */
export const GUTTER = SPACING.xxl

/** Card geometry, straight out of the spec — not to be improvised per component. */
export const CARD = {
  radius: 22,
  padding: 16,
  gap: 14,
  tile: 76,
  tileRadius: 20,
  tileGap: 16,
} as const

/** Hero geometry. */
export const HERO = { radius: 24, padding: 24, minHeight: 175, ring: 108, ringStroke: 9 } as const

/** Segmented control geometry. */
export const TABS = { height: 52, radius: 26, padding: 6, pillHeight: 40, pillRadius: 20 } as const
