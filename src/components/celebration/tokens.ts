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
  title: { fontFamily: 'NunitoExtraBold', fontSize: 40, lineHeight: 48 },
  subtitle: { fontFamily: 'NunitoSemiBold', fontSize: 15, lineHeight: 21 },
  statValue: { fontFamily: 'NunitoExtraBold', fontSize: 20, lineHeight: 25 },
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

/**
 * The same beats for the 3D Shifu, timed to the render: the action starts on
 * the first frame, his feet meet the floor 1.75s in (render frame 145), and
 * he has settled into his finale by ~2.6s.
 */
export const celebTiming3D = {
  ...celebTiming,
  enterTo: 120,
  touchAt: 1750,
  landTo: 1950,
  textFrom: 1950,
  textTo: 2350,
  resultsFrom: 2350,
  end: 2700,
} as const

/**
 * Geometry of the 3D render (scripts/celebration/blender/render.py: 900×1100,
 * orthographic, 220px per metre), as fractions of the frame, measured from
 * the rendered frames.
 */
export const SHIFU_3D = {
  aspect: 900 / 1100,
  /** His soles, up from the frame's bottom edge. */
  feet: 97 / 1100,
  /** Standing height, soles to the top of his bun. */
  standing: (822 - 97) / 1100,
  /** The highest anything reaches at the top of the jump, up from the bottom. */
  apex: (1100 - 33) / 1100,
  /** Centre of his head when standing, up from the bottom. */
  head: 0.555,
  headRadius: 141 / 1100,
  /** The widest his sleeves reach, as a share of the frame's width. */
  span: (732 - 126) / 900,
  durationMs: 2950,
  loadBackstopMs: 900,
} as const

/** The cut-out's pixel size (scripts/celebration/cutout.mjs). */
export const SHIFU_ART = { width: 675, height: 828 } as const
export const CELEB_CONTENT_MAX = 430
