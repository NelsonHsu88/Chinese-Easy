/*
 * The Review hub's drill icons.
 *
 * One painted disc per drill, replacing the tinted circle with a Lucide glyph
 * (and, on flashcards, a bare 學) that stood here before. Each disc's own colour
 * is the same `circle` value its `revDrills` entry already carried, so they drop
 * into the existing 58pt slot without the cards being repainted around them.
 *
 * No ratio field, unlike `dashboard/art.ts`: `processReviewIcons.mjs` centres
 * every one of these on a square canvas precisely so a caller can draw them at
 * `width === height` and not have to know anything about the render's framing.
 */
export const revArt = {
  flashcards: require('../../assets/images/review/flashcards.png'),
  listening: require('../../assets/images/review/listening.png'),
  mistakes: require('../../assets/images/review/mistakes.png'),
} as const
