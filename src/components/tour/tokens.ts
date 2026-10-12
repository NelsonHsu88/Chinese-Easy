import { revColors, revShadow } from '../review/tokens'

/*
 * The guided tour's design system, built to `SS107 Tour UI Redesign.png`.
 *
 * In the ivory-and-jade family — it spreads `revColors`, so the tour is the
 * same room as the Dashboard and Review it points at, not a fifth palette laid
 * over them. As with every `tokens.ts` here, **this file is the only place a
 * colour literal belongs** in `components/tour/`, and it is light-only for the
 * same reason the rest of the family is.
 *
 * The tour is deliberately lighter than onboarding: compact type, one sentence
 * a card, a scrim rather than scenery. Onboarding is the welcome; this is a
 * guide standing beside the real app.
 */
export const tourColors = {
  ...revColors,
  /** Tooltip paper. Sampled from the reference: a warmer ivory than a card. */
  paper: '#FCF8EE',
  /** Its hairline — warm grey, a step below the paper. */
  edge: '#ECE3D5',
  /** The reference's CTA green, between the Dashboard's lime and Review's forest. */
  cta: '#4F9255',
  /** The CTA's shoulder (see `LiftedFace`). */
  ctaShoulder: '#3A7342',
  /** Type and icons on the CTA. */
  onCta: '#FFFFFF',
  /** The dim around the spotlight: the app's navy, not black. */
  scrim: 'rgba(20, 32, 58, 0.42)',
  /** The spotlight's ring. */
  glow: '#7FC28E',
  /** The saved-word toast's tick disc. */
  success: '#5E9C66',
} as const

/** The tooltip's own soft shadow — the family's, a touch lifted. */
export const tourShadow = {
  ...revShadow,
  shadowOpacity: 0.12,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
} as const

/** Spotlight geometry. */
export const tourSpot = {
  /** Space between the target's edge and the cut-out's. */
  padding: 8,
  /** Width of the dim frame drawn round the cut-out (see `Spotlight`). */
  frame: 2400,
  ring: 2,
  glowOpacity: 0.55,
  /**
   * The ring's pulse: it breathes between `glowOpacity` and full, and on each
   * breath a second ring ripples outward by `pulseReach` points and fades.
   * Measured in points rather than a scale, so a wide card and a small button
   * ripple by the same visible amount.
   */
  pulseMs: 1600,
  pulseReach: 10,
  pulseRippleOpacity: 0.7,
} as const

/** Tooltip geometry. */
export const tourCard = {
  radius: 19,
  paddingX: 18,
  paddingTop: 16,
  paddingBottom: 14,
  /** Widest a tooltip gets; narrower screens take the column less margins. */
  maxWidth: 360,
  /** Kept between a tooltip and the edge of the screen. */
  margin: 16,
  /** Kept between a tooltip and the thing it points at. */
  targetGap: 16,
  /** The small Shifu beside the copy, when a step has room for him. */
  shifu: 64,
  /** The welcome prompt's larger Shifu. */
  shifuWelcome: 84,
  /** The sakura in the top-right corner. */
  sakura: 74,
  buttonHeight: 40,
} as const

/** Type — compact on purpose. Families by name: RN cannot synthesise weights. */
export const tourType = {
  title: { fontFamily: 'LoraBold', fontSize: 19, lineHeight: 24 },
  body: { fontFamily: 'NunitoSemiBold', fontSize: 14.5, lineHeight: 20 },
  button: { fontFamily: 'NunitoExtraBold', fontSize: 15 },
  quiet: { fontFamily: 'NunitoBold', fontSize: 14 },
  toast: { fontFamily: 'LoraBold', fontSize: 16, lineHeight: 21 },
} as const

/** Motion, in ms. Restrained; under Reduce Motion everything but fades is dropped. */
export const tourMotion = {
  backdrop: 150,
  morph: 230,
  card: 190,
  /** How far a tooltip or Shifu rises as it arrives. */
  rise: 8,
  /** The Dashboard's entrance has to land before the welcome prompt does. */
  welcomeDelay: 1400,
  /**
   * The saved-word toast: a soft arrival, a long enough hold to actually be
   * read, then a slow fade rather than vanishing. Its whole life is
   * `toastIn + toastHold + toastOut` (`toastLifetime`); the tour waits that
   * long before moving on.
   */
  toastIn: 320,
  toastHold: 2600,
  toastOut: 700,
  /** How often a step's target is re-measured while it is up. */
  remeasure: 250,
  /** Give up on a target that has not appeared, and fall back to a plain card. */
  targetTimeout: 2500,
} as const
