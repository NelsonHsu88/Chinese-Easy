/*
 * The completion celebration's palette, type and choreography. The same ivory
 * as the learning loader, the Review screens' jade, and the gold of the
 * painting's own sparkle marks.
 */
export const celebColors = {
  page: '#FAF9F6',
  navy: '#1B2A4A',
  slate: '#5A6479',
  /** The wash behind "Great job!", as the reference paints it. */
  wash: '#F6E7B8',
  /** The sparkle marks around his head. */
  gold: '#F2C14E',
  shadow: '#2B3A55',
  petal: '#F4B9C6',
  petalDeep: '#E99AAE',
  card: '#FFFFFF',
  cardBorder: '#E9E6DF',
  xp: '#C98A1B',
  xpDisc: '#FBF0D6',
  words: '#3D8057',
  wordsDisc: '#E6F1E6',
  accuracy: '#3E6FB0',
  accuracyDisc: '#E5EDF8',
} as const

export const celebType = {
  /** Lora Bold, at the 430pt column; scaled with it. */
  title: { fontFamily: 'LoraBold', fontSize: 40, lineHeight: 48 },
  subtitle: { fontFamily: 'Lora', fontSize: 15, lineHeight: 21 },
  statValue: { fontFamily: 'LoraBold', fontSize: 20, lineHeight: 25 },
  statLabel: { fontFamily: 'NunitoSemiBold', fontSize: 12.5, lineHeight: 16 },
} as const

/** Milliseconds on the celebration's single clock. */
export const celebTiming = {
  enterTo: 140, // Shifu fades in
  crouchTo: 250, // anticipation
  liftTo: 650, // the jump
  turnTo: 1150, // the turn at the top
  touchAt: 1330, // feet meet the ground
  landTo: 1450, // squash and rebound settle
  textFrom: 1450,
  textTo: 1850,
  resultsFrom: 1850,
  end: 2200,
  /** Forces the final frame if the clock's callback never comes. */
  backstop: 400,
} as const

/** The cut-out's pixel size (scripts/celebration/cutout.mjs). */
export const SHIFU_ART = { width: 675, height: 828 } as const
export const CELEB_CONTENT_MAX = 430
