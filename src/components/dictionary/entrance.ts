/*
 * The Dictionary's entrance.
 *
 * One beat: the page rises as a single piece, like the Review hub, because a
 * dictionary is one object rather than a set of unrelated cards. It used to be
 * followed by Shifu and a typed speech bubble; the landing redesign dropped
 * both, so the page opens on its title and search field and nothing else moves.
 *
 * The machinery is `dashboard/entrance.tsx` — same `useReveal`, same
 * hidden-tab backstop, same Animated-not-Reanimated constraint. Only the
 * timings live here.
 */
export const dictEntrance = {
  page: { at: 0, for: 620, rise: 22 },
} as const
