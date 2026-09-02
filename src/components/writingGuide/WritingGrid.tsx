import { View } from 'react-native'
import Svg, { Line } from 'react-native-svg'
import { HanziStage, type HanziStageSpeed } from '../HanziStage'
import { guideColors as c, softShadow } from './tokens'

/*
 * The 米字格 practice square, with the character animating inside it.
 *
 * The guides are drawn here rather than by `HanziStage`'s own `showGuides`
 * because this card's grid belongs to the card: it is paler than the writer's
 * built-in one, and it has to sit *behind* the glyph at a fixed inset from the
 * card's rounded border rather than filling the writer's own box.
 *
 * The character is never rendered as text. It is drawn from real stroke-order
 * data by the writer, which is what lets it animate correctly and look written
 * rather than typeset.
 */

/** Guides are inset from the card edge so the square reads as paper, not as a table. */
const INSET = 16

/**
 * How much of the guide square the glyph fills.
 *
 * Enough to be the thing you look at, short of touching the guides — a
 * character that reaches the edges stops reading as sitting *inside* a box,
 * which is the one job the box has.
 */
const GLYPH_RATIO = 0.78

export function WritingGrid({
  character,
  speed,
  width,
  height,
  onDemoComplete,
}: {
  character: string
  speed: HanziStageSpeed
  /**
   * The card's outer size. Both are passed in rather than measured: `onLayout`
   * is not dependable for every view on the web target, and a grid that guesses
   * its own width draws its guides into a corner of a stretched card.
   */
  width: number
  height: number
  onDemoComplete?: () => void
}) {
  const innerWidth = width - INSET * 2
  const innerHeight = height - INSET * 2
  // The writing square is governed by the shorter side, so the character stays
  // square on a card that is wider than it is tall.
  const square = Math.min(innerWidth, innerHeight)

  return (
    <View
      style={{
        width,
        height,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.gridCardBorder,
        backgroundColor: c.gridCardBg,
        ...softShadow,
      }}
    >
      {/*
        Centre cross plus both diagonals, dashed and barely there. They exist to
        tell the eye where the middle of the square is; the moment they compete
        with the strokes they are doing harm.
      */}
      <Svg
        width={innerWidth}
        height={innerHeight}
        style={{ position: 'absolute', left: INSET, top: INSET }}
        opacity={0.65}
      >
        <Line x1={0} y1={innerHeight / 2} x2={innerWidth} y2={innerHeight / 2} {...guide} />
        <Line x1={innerWidth / 2} y1={0} x2={innerWidth / 2} y2={innerHeight} {...guide} />
        <Line x1={0} y1={0} x2={innerWidth} y2={innerHeight} {...guide} />
        <Line x1={innerWidth} y1={0} x2={0} y2={innerHeight} {...guide} />
      </Svg>

      {/*
        `holdCharacterOnComplete` is what makes this look like the reference.
        hanzi-writer fades its drawn strokes out the moment an animation ends,
        which left the card showing the faint grey *outline* — so the character
        that is meant to be the green centrepiece of the page spent most of its
        time invisible. Holding it repaints it in the stroke colour and leaves
        it there.
      */}
      <View className="flex-1 items-center justify-center">
        <View style={{ width: square * GLYPH_RATIO, height: square * GLYPH_RATIO }}>
          <HanziStage
            key={`${character}-${speed}`}
            character={character}
            mode="demo"
            speed={speed}
            showOutline
            holdCharacterOnComplete
            maxSize={square * GLYPH_RATIO}
            onDemoComplete={onDemoComplete}
          />
        </View>
      </View>
    </View>
  )
}

const guide = {
  stroke: c.gridLine,
  strokeWidth: 1,
  strokeDasharray: '4 5',
} as const
