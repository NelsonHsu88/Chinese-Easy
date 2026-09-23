/*
 * The resting shadow under a pill-shaped filter chip, as a style object.
 *
 * ── Why this is not a `shadow-card` class ────────────────────────────────────
 * **A `shadow-*` utility must not sit on one side of a conditional
 * `className`.** Toggling one in or out of the class string makes NativeWind
 * re-parse the rule during render, and under Expo Router that reaches for a
 * navigation context which isn't available yet. The screen dies with
 *
 *     Couldn't find a navigation context. Have you wrapped your app with
 *     'NavigationContainer'?
 *
 * attributed to whichever `Pressable` carried the class — which is a long way
 * from the real cause. It is an open NativeWind bug (nativewind#1557), it
 * reproduces only on native (the web CSS-interop path is unaffected, so a
 * browser build looks perfectly healthy), and it fires on the *first tap*,
 * because that is the render where the class string first changes.
 *
 * Both filter rows in the app were written as
 *
 *     `... ${active ? 'bg-brand-500' : 'bg-white shadow-card dark:bg-slate-900'}`
 *
 * with the shadow in the inactive branch alone, so every one of those chips
 * crashed its screen when tapped. Keeping the class string varying by colour
 * only, and putting the shadow on `style` — a plain prop NativeWind never
 * re-parses — is what fixes it.
 *
 * ── Why `elevation` is here ──────────────────────────────────────────────────
 * Not incidental. `shadow-card` compiled to the iOS shadow props only, and
 * Android draws shadows from `elevation` alone, so these chips were flat on
 * Android for as long as they used the class. See the Styling section of
 * CLAUDE.md. The values mirror the `card` entry in `tailwind.config.js`'s
 * `boxShadow`, which is where the design for this palette still lives.
 */
export const CHIP_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 10,
  shadowOpacity: 0.08,
  elevation: 2,
} as const
