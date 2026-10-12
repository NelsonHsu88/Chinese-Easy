/*
 * The bottom tab bar's geometry, shared by the bar itself (`(tabs)/_layout.tsx`)
 * and by anything that has to sit clear of it (the guided tour). Kept out of the
 * route file so importing it doesn't reach into Expo Router's route tree, and in
 * one place so the two can't drift — the old tour carried its own copy of the
 * height, which was still 70 after the bar had become 58.
 */

/**
 * The tab bar's height above the safe-area inset: 6 of top padding plus one
 * `TabItem` (5 + 23 icon + 3 + 15 label + 5 = 51), plus a point of air.
 */
export const TAB_BAR_BODY = 58

/** The inset under the tabs: the system's own, floored at 6 (see the layout). */
export function tabBarInset(insetBottom: number): number {
  return Math.max(insetBottom, 6)
}

/** The bar's full height, inset included. */
export function tabBarHeight(insetBottom: number): number {
  return TAB_BAR_BODY + tabBarInset(insetBottom)
}
