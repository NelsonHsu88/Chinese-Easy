/*
 * One scale for every page heading — Learn, Review, Dictionary, Settings,
 * Challenges, My Words, the Reading Library — so moving between tabs doesn't
 * make the title jump in size or position. Lora Bold title, Lora subtitle;
 * colours stay in each screen's own tokens.
 */

/** Lora Bold. */
export const PAGE_TITLE = { fontSize: 44, lineHeight: 50, letterSpacing: -0.8 } as const

/** Lora — the line under a title. */
export const PAGE_SUBTITLE = { fontSize: 17, lineHeight: 23 } as const

/** From the top of the safe area (or the back-arrow row) to the title's box. */
export const PAGE_TITLE_TOP = 18
