/*
 * The raised progress bar's palette: a jade pill standing on a darker edge, in a
 * sage track with its own lower edge — Duolingo's tactile bar in Chinese Easy's
 * softer greens. **The only place its colour literals belong.** Light-only,
 * like the rest of the ivory-and-jade family.
 */
export const raisedProgressColors = {
  track: '#E5ECE4',
  trackEdge: '#C9D8CC',
  fill: '#70AD7F',
  fillEdge: '#447853',
  /** The sheen along the top of the fill: white, barely there (see `raisedProgressSheen`). */
  highlight: '#FFFFFF',
} as const

/** The sheen's opacity at rest, and at the peak of the milestone glint. */
export const raisedProgressSheen = { rest: 0.34, glint: 0.62 } as const

/** Two sizes: a session header's bar, and a slimmer one inside a card. */
export const raisedProgressSize = {
  regular: { height: 16, depth: 4 },
  compact: { height: 10, depth: 3 },
} as const

export const raisedProgressMotion = {
  /** A step forward. */
  durationMs: 500,
  /** The sheen's brief brightening when the bar fills completely. */
  milestoneMs: 520,
  /** Grace before the backstop forces the end value (a hidden web tab stops rAF). */
  backstopMs: 150,
} as const
