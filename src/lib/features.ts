/*
 * Feature switches for parts of the app that are built but currently hidden.
 *
 * Everything behind a `false` here is still complete and still compiled — the
 * screens, routes, data and persisted state are all untouched. Only the ways in
 * are hidden, so turning a flag back to `true` restores the feature without any
 * of it having to be rewritten.
 *
 * When re-enabling one, `grep` for the flag name to find every gate.
 */
export const FEATURES = {
  /**
   * The Duolingo-style unit path: `src/screens/Lessons.tsx`, `LessonPlayer.tsx`,
   * routes `/lessons` and `/lesson/[lessonId]`, and the data in
   * `src/data/units.ts` + `src/data/lessons.ts`.
   *
   * Note the Lessons *tab* stays in the tab bar when this is off — it's the only
   * way to reach New Words and Books, so it just loses the Lessons entry from
   * its picker sheet and is relabelled.
   */
  lessons: false,

  /**
   * My Town: `src/screens/MyTown.tsx`, route `/my-town`, and the buildings in
   * `src/data/townBuildings.ts`. XP still accrues while this is off, so a
   * returning player finds their balance intact.
   */
  myTown: false,

  /**
   * Restoring learning progress from Supabase on sign-in.
   *
   * Off, and read-only even when on: the app pulls the account's rows and
   * merges them into local state, and writes nothing back. An outbox is filled
   * and `lib/sync/push.ts` can drain one, but nothing calls `pushOutbox` — so
   * nothing a learner does on this device can reach the server or overwrite
   * what another device put there. Wiring the drain is the remaining work.
   *
   * **Two things must be true before this is turned on**, both recorded in
   * `supabase/README.md`:
   *  1. Word ids are a frozen contract. They have changed once already, and
   *     `AppContext` silently drops cards whose `wordId` does not resolve —
   *     after sync that deletion would replicate to every device.
   *  2. XP is no longer a bare counter. See `mergeXp` in `lib/sync/conflict.ts`
   *     for the stopgap and why it is one.
   */
  cloudSync: false,
} as const

export type FeatureKey = keyof typeof FEATURES

/** Routes that belong to a switched-off feature, for anything holding a link to one. */
const ROUTE_OWNER: Record<string, FeatureKey> = {
  '/lessons': 'lessons',
  '/my-town': 'myTown',
}

/** Whether a route can currently be navigated to. */
export function isRouteEnabled(route: string): boolean {
  const owner = ROUTE_OWNER[route]
  return owner ? FEATURES[owner] : true
}

/**
 * A route that's safe to push right now — the one asked for, or `fallback` if
 * its feature is switched off. Lets links to a hidden screen keep working as
 * something sensible instead of needing to be removed and later restored.
 */
export function safeRoute(route: string, fallback: string): string {
  return isRouteEnabled(route) ? route : fallback
}
