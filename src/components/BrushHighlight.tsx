import type { ReactNode } from 'react'
import { View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

/*
 * The reference mockup highlights the learner's name with a marker swipe, not a
 * rounded rectangle: the ends are tapered and angled, the long edges bow and
 * wobble, and a second lighter pass overlaps the first the way a real highlighter
 * does. These are hand-authored paths in a 0-100 box drawn with
 * preserveAspectRatio="none", so one shape stretches to whatever the name's
 * width happens to be instead of needing an asset per name length.
 */

/*
 * The ends are straight slanted cuts rather than curves — that chisel edge is
 * what reads as a marker nib; rounding them turns the whole thing back into a
 * pill. The long edges carry one gentle wave each so they don't look ruled.
 */
const STROKE_MAIN = 'M 1.5,66 L 5,16 C 28,8 52,15 74,7 L 92,20 L 88.5,72 C 66,84 40,78 20,86 Z'

/** A second, lighter pass along the bottom, as if the marker were dragged back. */
const STROKE_SECOND_PASS = 'M 6,72 C 30,82 58,77 86,66 L 89,74 C 62,88 32,90 8,82 Z'

/** The detached fleck a drying nib leaves past the end of the swipe. */
const STROKE_FLECK = 'M 95,26 L 99.5,31 L 98,64 L 93.5,60 Z'

interface BrushHighlightProps {
  children: ReactNode
  color?: string
  /** How far the stroke bleeds past the content, in points. */
  bleedX?: number
  bleedTop?: number
  bleedBottom?: number
}

export function BrushHighlight({
  children,
  color = '#f5b93d',
  bleedX = 14,
  bleedTop = 4,
  bleedBottom = 2,
}: BrushHighlightProps) {
  return (
    <View className="self-start">
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: -bleedX, right: -bleedX, top: bleedTop, bottom: bleedBottom }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <Path d={STROKE_MAIN} fill={color} />
          <Path d={STROKE_SECOND_PASS} fill={color} opacity={0.55} />
          <Path d={STROKE_FLECK} fill={color} opacity={0.75} />
        </Svg>
      </View>
      {children}
    </View>
  )
}
