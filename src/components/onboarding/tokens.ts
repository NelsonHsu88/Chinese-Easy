/*
 * The onboarding design system.
 *
 * Like `challenges/tokens.ts` and `writingGuide/tokens.ts`, **this file is the
 * only place a colour literal belongs**. Onboarding is almost entirely
 * absolutely-positioned artwork and tinted card surfaces rather than Tailwind
 * classes, so hex values scattered through the JSX is exactly how the flow ends
 * up with four slightly different greens across six screens the learner sees
 * back to back.
 *
 * Light-only. The palette is cream paper under watercolour, and a dark repaint
 * would be a different design rather than a recolour — the same call the
 * reading screens and the writing guide already made.
 */

export const onbColors = {
  page: '#FCFAF5',

  navy: '#14203A',
  textSecondary: '#536175',
  textMuted: '#8A96A5',

  green: '#46A85B',
  greenDark: '#328C48',
  greenSoft: '#EEF8EF',

  coral: '#F47A6A',
  coralSoft: '#FFF0EC',

  blue: '#70ADD1',
  blueSoft: '#EFF7FC',

  gold: '#F0B94A',
  goldSoft: '#FFF6DB',

  card: '#FFFDFC',
  border: '#E7E5DE',

  /** Divider rules and the inactive page dots — lighter than `border`. */
  hairline: '#EDEAE2',
  dotInactive: '#DBD7CD',
} as const

/**
 * The 4/8 spacing scale, and the one value outside it the design actually
 * calls for: a 22pt horizontal margin. It is named here so it stays a
 * deliberate exception rather than licence for 13s and 19s elsewhere.
 */
export const onbSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  /** Horizontal content margin. Text and controls align to this; art does not. */
  screen: 22,
} as const

/**
 * Type scale. Sizes and line heights only — weight comes from the font
 * *family*, because React Native cannot synthesise one and `fontWeight` alone
 * does nothing. Pair each entry with the family named in its comment.
 */
export const onbType = {
  /** Nunito ExtraBold. The one big line at the top of a page. */
  title: { fontSize: 27, lineHeight: 32, letterSpacing: -0.3 },
  /** Nunito ExtraBold, for the welcome screen's wordmark. */
  wordmark: { fontSize: 26, lineHeight: 31, letterSpacing: -0.2 },
  /** Nunito SemiBold. The supporting line under a title. */
  body: { fontSize: 14.5, lineHeight: 21 },
  /** Nunito Bold. */
  cardTitle: { fontSize: 14.5, lineHeight: 19 },
  /** Nunito SemiBold. */
  cardBody: { fontSize: 12.5, lineHeight: 17.5 },
  /** Nunito ExtraBold. */
  button: { fontSize: 16 },
  /** Nunito Bold — the "Skip" / "Log in" style inline actions. */
  link: { fontSize: 14 },
  /** Nunito SemiBold — "Question 2 of 10" and the settings note. */
  footnote: { fontSize: 12.5, lineHeight: 17 },
} as const

/**
 * The only shadow in the flow. Cards separate themselves with a border and a
 * tint; this is a hint that one sits above the page, not Material elevation.
 */
export const onbShadow = {
  shadowColor: '#14203A',
  shadowOffset: { width: 0, height: 3 },
  shadowRadius: 10,
  shadowOpacity: 0.05,
  elevation: 2,
} as const

/** The primary call to action, identical on every screen that has one. */
export const onbCta = {
  height: 51,
  radius: 25.5,
} as const

export const onbRadius = {
  card: 16,
  cardLarge: 18,
} as const

/** Motion. Short, none of it looping. */
export const onbMotion = {
  /** A choice card changing selected state. */
  select: 180,
  /** Button press dip, and the spring back out. */
  press: 100,
  /**
   * The welcome screen's entrance. Long enough to read as scenery assembling
   * itself rather than as the page stuttering, short enough that a returning
   * user is not made to sit through it.
   */
  enter: 620,
  /** How far apart the entering pieces start, in ms. */
  enterStagger: 110,
  /** How far off-screen each piece begins, in points. */
  enterSlide: 56,
  /** The result toast arriving under the placement question. */
  toast: 240,
  /**
   * A page leaving. The two halves of a page change are sequential, not
   * overlapped: the old page slides off and only then does the new one build
   * itself back up, so nothing is ever half-in and half-out at once.
   */
  exit: 260,
  /**
   * How far the leaving page travels, as a fraction of the column width.
   *
   * Far enough to actually leave rather than to nudge. It is paired with an
   * accelerating ease and a fade held back until the movement is under way
   * (see `OnbPageTransition`), which is what makes it read as "slid away and
   * then went" rather than as a panel dimming in place.
   */
  exitSlide: 0.78,
  /**
   * One element of the arriving page rising into its place. Shorter than the
   * welcome screen's `enter`, because six or seven of these play in sequence
   * and the learner is waiting on the last one.
   */
  rise: 420,
  /** How far apart consecutive rising elements start, in ms. */
  riseStagger: 50,
  /** How far below its resting place a rising element begins, in points. */
  riseSlide: 26,
  /**
   * Scenery drifting in behind the content. Slower and further than the
   * elements in front of it — the artwork is meant to settle after the page
   * it decorates, not to compete with it.
   */
  art: 560,
  artSlide: 46,
} as const

/**
 * The three verdicts a placement answer can get.
 *
 * Right and wrong are the palette's own green and coral — coral *is* this
 * design's red, and dropping a pure #FF0000 into a watercolour page would look
 * like an error dialog from a different app. "I don't know" is gold, because it
 * is deliberately neither: the learner told the truth rather than guessing, and
 * colouring that like a mistake punishes the one honest answer on the screen.
 */
export const onbVerdict = {
  correct: { fill: '#EAF6EC', border: '#BFE3C7', text: '#2F7D43', accent: '#46A85B' },
  incorrect: { fill: '#FDECE8', border: '#F8C9BF', text: '#C4503C', accent: '#F47A6A' },
  unsure: { fill: '#FFF6DB', border: '#F3DFAB', text: '#9A7220', accent: '#F0B94A' },
} as const

export type VerdictKind = keyof typeof onbVerdict

/**
 * Opacity for the decorative watercolour.
 *
 * The panorama sits *behind* body copy on three screens, so it is held well
 * back — at full strength the ridge lines read as underlines through the text.
 * The sakura never overlaps text and keeps its own density.
 */
export const onbArt = {
  panorama: 0.62,
  cloud: 0.5,
} as const
