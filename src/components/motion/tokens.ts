/*
 * Colours for the answer feedback effects (`answerFeedback.tsx`), shared by
 * every question screen. The only place their colour literals belong.
 */

export const answerFx = {
  /** The highlight that sweeps once across a right answer: white, so on the jade fill it reads as a lighter jade. */
  shimmer: 'rgba(255, 255, 255, 0.62)',
  shimmerClear: 'rgba(255, 255, 255, 0)',
  /** The few sparks that lift off a right answer: jade and a muted gold, in turn. */
  sparks: ['#4FAE62', '#D9A93A', '#7CC48A', '#C9A24B'],
} as const
