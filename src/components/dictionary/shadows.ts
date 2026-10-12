/*
 * Black drop shadows for the dictionary's cards and buttons — depth on
 * request, layered onto the resting `dict-card` surfaces that otherwise sit
 * flush against the page with only a drawn hairline for separation.
 *
 * Plain style objects, not `shadow-*` Tailwind classes, for two reasons (see
 * Styling in CLAUDE.md): a `boxShadow` class compiles to the iOS shadow props
 * only, so a card carrying nothing but a class is flat on Android; and
 * toggling a shadow class in and out of a `className` string crashes the
 * screen on native (nativewind#1557). A style object sidesteps both —
 * `elevation` is what actually draws it on Android, and nothing here is ever
 * conditional, so there is nothing to re-parse.
 *
 * Cards get the wider, softer shadow — bigger offset and blur, lower opacity —
 * which reads as "resting a little off the page" rather than "outlined in
 * black." Buttons get a tighter, slightly darker one: a smaller shape needs a
 * crisper shadow to read as pressable rather than merely floating.
 *
 * Pair either with a `borderRadius` matching the surface's own. A transparent
 * layer with no radius of its own casts a square-cornered shadow behind a
 * rounded card — set the same radius on the same style object and the shadow
 * follows the card's actual shape instead.
 *
 * `shadowRadius`/`shadowOpacity` were pushed higher once, chasing a more
 * dramatic "pop" — a screenshot of the resting (not animating) state showed
 * exactly why that was wrong: a black shadow spread that wide and that faint
 * over warm off-white paper doesn't read as a shadow any more, it reads as a
 * flat grey border sitting a visible margin outside the card. These values
 * are tighter on purpose — dark enough to read as ink near the edge, faded
 * out again well short of the width the grey band was.
 */
export const DICT_CARD_SHADOW = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 10,
  shadowOpacity: 0.18,
  elevation: 4,
} as const

export const DICT_BUTTON_SHADOW = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 5,
  shadowOpacity: 0.2,
  elevation: 3,
} as const

/*
 * Fills for the node that actually carries a shadow above, when that node
 * isn't the same one Tailwind paints via `className`.
 *
 * `PressScale` splits a card in two: `style` lands on the animated wrapper,
 * `className` on the plain view inside it (see that component's own
 * comment). A shadow set through `style` therefore sits on a node with no
 * fill of its own — transparent, but with the same `borderRadius` — and
 * without an opaque, correctly-shaped layer to compute a path from, iOS and
 * Android can fall back to the node's square bounding box for the shadow's
 * silhouette, poking a dark corner out past the rounded card sitting in
 * front of it. Painting the same colour here as the inner view's `className`
 * does costs nothing (the inner view paints over it, pixel for pixel) and
 * gives the shadow a shape to actually follow.
 *
 * These mirror the `dict.*` entries in `tailwind.config.js` and have to be
 * changed in step with them, the same rule `ICON_MUTED`/`ICON_GREEN`/
 * `ICON_GREEN_DARK` in `DictionaryControls.tsx` already follow.
 */
export const DICT_BG = {
  card: '#FFFDFA',
  green: '#4AA54B',
  greenDark: '#3E9845',
  greenPale: '#EAF5E8',
  /**
   * The sides of the raised buttons (the Dashboard's `LiftedFace`) — Add,
   * Stroke order, Practice. One step down from the face each stands on.
   */
  greenShoulder: '#378A39',
  greenDarkShoulder: '#2D7634',
  /** Removing a word from My Words — the armed confirm and its button. */
  coral: '#C8553F',
  coralPale: '#FBECE8',
} as const
