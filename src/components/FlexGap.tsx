import { View } from 'react-native'

/**
 * A gap that takes its designed size, and absorbs slack when there is any.
 *
 * This is the piece that stops a screen from being laid out to its natural
 * height and leaving whatever the device has left over as a band of bare paper
 * under the last element. Put these where a section margin would have gone, in a
 * column whose container is `flexGrow: 1`, and the free space is shared out
 * between them in proportion to `grow` instead of pooling at the bottom.
 *
 * Three properties matter, and all three are why this is not just a `marginTop`:
 *
 * - **`min` is a `flexBasis`, not a height.** When the content is taller than
 *   the screen there is no free space to share, every gap sits at exactly its
 *   designed value, and the page scrolls. A short phone is therefore unaffected
 *   by any of this.
 * - **…and a `minHeight` as well, which is not belt and braces.** A flex basis
 *   alone measured zero on Android — every gap on the Dictionary collapsed, so
 *   the quick-links card was drawn hard against the bottom of the search field
 *   with its shadow landing on it, while the same screen on web sat at the
 *   designed 40. `minHeight` is a floor no flex maths can talk down, and where
 *   the basis is honoured it is inert (it is the same number).
 * - **`flexShrink: 0`.** Without it a gap would give its own space back under
 *   pressure, and the layout would compress rather than scroll.
 * - **`max` caps the growth.** Uncapped, one gap swallows everything and the
 *   result is a hole in the middle of the page instead of one at the foot of it
 *   — the same problem, moved. Leave `max` off only for a gap that is meant to
 *   be the last resort (inside a bounded card, say, where the slack has nowhere
 *   worse to go).
 */
export function FlexGap({
  min,
  max,
  grow = 1,
}: {
  min: number
  max?: number
  /** Relative share of the slack. Weights are only meaningful against siblings. */
  grow?: number
}) {
  return (
    <View
      pointerEvents="none"
      style={{ flexBasis: min, minHeight: min, flexGrow: grow, flexShrink: 0, maxHeight: max }}
    />
  )
}
