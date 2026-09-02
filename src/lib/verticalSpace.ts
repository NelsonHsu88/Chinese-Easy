/**
 * Vertical rhythm that responds to the height of the device.
 *
 * The web idiom for this is `clamp(12px, 1.6dvh, 22px)`. React Native has no
 * `dvh` and no `clamp()`, so this is the same three numbers done in JS against
 * `useWindowDimensions().height` — which is the honest measurement anyway, since
 * `vh` units on a mobile browser famously include chrome the user cannot see.
 *
 * The rule these exist to enforce: **a phone-sized screen must never grow.** On
 * a 390×844 iPhone every `share` below lands under its `min` and the layout
 * comes out at exactly the numbers it was designed to, which is the point —
 * extra room on a taller device is a bonus to spend, never a baseline to raise.
 */

/**
 * @param min The designed value. Returned on every phone-sized viewport.
 * @param share Fraction of viewport height (0.016 is CSS's `1.6dvh`).
 * @param max The ceiling. Past this, extra height goes somewhere else.
 * @param viewport `useWindowDimensions().height`.
 */
export function vspace(min: number, share: number, max: number, viewport: number): number {
  return Math.round(Math.min(max, Math.max(min, viewport * share)))
}
