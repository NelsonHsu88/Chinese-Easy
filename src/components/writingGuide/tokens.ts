/*
 * The writing guide's design system.
 *
 * A third visual language in the app, after the original brand/coral/amber
 * scales and the reading library's `read-*` cream. It is deliberately its own:
 * calmer and greener than the dashboard, cooler and more structured than the
 * storybook. Like `components/challenges/tokens.ts`, **this file is the only
 * place a colour literal belongs** — the screen's surfaces are mostly
 * border-plus-tint rather than Tailwind classes, and scattering hex values
 * through the JSX is exactly how a screen ends up with five nearly-identical
 * greens.
 *
 * Light-only, like the reading screens: the palette rests on warm cream, and a
 * dark repaint would be a different design rather than a recolour.
 */

export const guideColors = {
  background: '#FCFAF5',

  navy: '#14203A',
  textSecondary: '#536175',
  textMuted: '#87929F',

  /*
   * One primary green, one darker, one pale. Every green on this screen comes
   * from these three — a lesson that mixes #56C271 and #43A95B and #4FBF70
   * reads as slightly broken without anyone being able to say why.
   */
  green: '#50B964',
  greenDark: '#328C48',
  greenSoft: '#EBF7EC',
  /** The CTA fill, a shade firmer than `green` so white text carries on it. */
  greenCta: '#3FA953',

  border: '#DEE6E2',
  card: '#FFFDFC',

  gold: '#F0B94A',
  goldSoft: '#FFF6DB',

  // --- Card recipes: background + border, chosen together ---------------------
  infoCardBg: '#F7FAF7',
  infoCardBorder: '#E2E9E3',
  plainCardBg: '#FFFFFF',
  plainCardBorder: '#E5E6E2',
  /*
   * The takeaway is green, not gold. The written spec called for a gold
   * "important" card, but every takeaway in the four reference screens is a
   * pale green panel with a solid green badge — and the screens are the
   * authority. The gold tokens above stay defined but unused, so a later
   * warning or caution state has somewhere to come from.
   */
  takeawayBg: '#EFF5EF',
  takeawayBorder: '#DCE7DD',

  // --- Writing grid -----------------------------------------------------------
  gridCardBorder: '#CFE3D1',
  gridCardBg: '#FFFDFC',
  gridLine: '#DDE6DF',

  // --- Progress stepper -------------------------------------------------------
  stepInactiveBorder: '#DCE2DE',
  stepInactiveText: '#879294',
} as const

/*
 * The 4/8-point scale, plus the two odd values the design actually calls for:
 * a 22pt screen margin and a 14pt gap in the vertical rhythm. They are named
 * here rather than typed inline so they stay deliberate exceptions instead of
 * becoming licence for 13s and 19s elsewhere.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  /** Horizontal screen margin. Every major block aligns to this. */
  screen: 22,
  /** Header → progress, and character → explanation. */
  rhythm: 14,
} as const

/*
 * The vertical rhythm, in order down the page. Spelling it out as one object
 * keeps the four pages breathing identically — left to individual judgement,
 * every gap ends up slightly different.
 *
 * These are *minimum* gaps. The page body distributes any leftover height
 * between its blocks (see `WritingGuideModal`), so a short page opens these up
 * rather than stacking everything at the top over a pool of dead space. Nothing
 * here is ever the final measured gap; it is the smallest one allowed.
 */
export const rhythm = {
  headerToProgress: spacing.rhythm,
  progressToHeading: 22,
  headingToCopy: spacing.sm,
  copyToCharacter: spacing.xl,
  characterToExplanation: spacing.rhythm,
  explanationToCard: spacing.md,
  cardToControls: spacing.md,
  controlsToCta: spacing.md,
} as const

/*
 * Type scale. Sizes and line heights only — the weight is carried by the font
 * *family* (`font-nunito-extrabold` and friends), because React Native cannot
 * synthesise a weight the way a browser can and `fontWeight` alone does nothing.
 */
export const type = {
  header: { fontSize: 17 },
  /** Tight on purpose: the headings are two short lines and should read as one block. */
  heading: { fontSize: 30, lineHeight: 35, letterSpacing: -0.3 },
  intro: { fontSize: 16, lineHeight: 23 },
  cardTitle: { fontSize: 16.5 },
  cardBody: { fontSize: 15, lineHeight: 22 },
  button: { fontSize: 17 },
  progress: { fontSize: 14 },
  smallLabel: { fontSize: 12.5 },
} as const

/**
 * The only shadow on the screen, and only for the writing card. Everything else
 * separates itself with a border and a tint — the design is not made of
 * floating Material cards.
 */
export const softShadow = {
  shadowColor: '#14203A',
  shadowOffset: { width: 0, height: 3 },
  shadowRadius: 10,
  shadowOpacity: 0.05,
  elevation: 2,
} as const

/** Motion. Short, and none of it looping. */
export const motion = {
  /** Page content settling in: opacity 0→1 with a 6pt lift. */
  pageIn: 220,
  /** The Normal/Slow pill sliding between options. */
  segment: 200,
  /** A stroke-order rule row opening or closing. */
  ruleExpand: 200,
} as const
