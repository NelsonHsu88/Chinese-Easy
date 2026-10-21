import { Animated, Image, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { ShadowSurface } from './shadowReveal'
import { dashShadow, refBubble } from './dashboard/tokens'
import { AmbientClouds, CLOUDS_FEW, type CloudSpec } from './AmbientClouds'

/*
 * Pieces shared by the screens built to "SS1017 New APP DesIGN UI (1…6)".
 *
 * Each hero there is one landscape across the whole phone, cut full width by
 * `scripts/processAppDesignArt.mjs` with the mockup's own type masked out. A
 * screen lays it at the top of its column and draws its own type over it, so
 * every measurement here converts the mockup's pixels into the column's
 * points: the phone screen in those mockups is 783px wide, and the crops start
 * at y = 122, just under the status bar.
 */

/** The mockups' phone screen, in their own pixels. */
export const REF_SCREEN_PX = 783
/** Where every hero crop starts in the mockups (just below the status bar). */
export const REF_TOP_PX = 122

/** Mockup pixels → column points. */
export function refScale(column: number): number {
  return column / REF_SCREEN_PX
}

/** A mockup y coordinate as points below the top of the column. */
export function refY(px: number, column: number): number {
  return (px - REF_TOP_PX) * refScale(column)
}

/**
 * A full-width hero painting, absolutely placed at the top of its column and
 * out of flow, so it costs the layout nothing. Behind everything on purpose:
 * the screen's own title, subtitle and bubble sit where the mockup's were.
 */
export function RefHero({
  source,
  ratio,
  column,
  left = 0,
  animatedStyle,
  clouds = CLOUDS_FEW,
}: {
  source: number
  /** The render's width / height. */
  ratio: number
  column: number
  /** Offset from the parent's left edge — minus the gutter when the parent is padded. */
  left?: number
  animatedStyle?: StyleProp<ViewStyle> | Animated.WithAnimatedObject<ViewStyle>
  /** Clouds drifting behind the painting's sky; `false` for none. */
  clouds?: CloudSpec[] | false
}) {
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ position: 'absolute', top: 0, left, width: column, height: column / ratio }, animatedStyle as ViewStyle]}
    >
      {/* Behind the painting: the clouds pass behind its mountains and figures and show through its sky. */}
      {clouds && <AmbientClouds width={column} height={(column / ratio) * 0.7} clouds={clouds} />}
      <Image source={source} resizeMode="stretch" style={{ width: column, height: column / ratio }} />
    </Animated.View>
  )
}

/**
 * The bubble's type size for a column: Learn's rule, which every Shifu line
 * shares so the hand reads the same size on Home, Learn and Review.
 */
/** Shifu's bubble width in mockup pixels — Learn's, which Review shares so the two read alike. */
export const SHIFU_BUBBLE_REF_WIDTH = 334

export function shifuBubbleFontSize(column: number): number {
  return Math.max(12.5, 13.6 * refScale(column) * 2)
}

/**
 * Shifu's line as the new references draw it: a cream card with a hairline,
 * set in the brush hand, tilted a few degrees, its tail pointing at him.
 * The one speech bubble: Home, Learn and Review all draw this, with
 * `shifuBubbleFontSize` for the type.
 */
export function ShifuBubble({
  message,
  width,
  tilt = -3,
  fontSize = 15,
}: {
  message: string
  width: number
  tilt?: number
  fontSize?: number
}) {
  return (
    <View style={{ width, transform: [{ rotate: `${tilt}deg` }] }}>
      <ShadowSurface
        shadow={dashShadow}
        style={{
          backgroundColor: refBubble.fill,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: refBubble.border,
          paddingHorizontal: 16,
          paddingVertical: 11,
        }}
      >
        <Text className="font-handwritten" style={{ fontSize, lineHeight: fontSize * 1.4, color: refBubble.ink }}>
          {message}
        </Text>
      </ShadowSurface>
      {/* Drawn after the body so it covers the body's border where the two meet. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: -6,
          top: 22,
          width: 12,
          height: 12,
          backgroundColor: refBubble.fill,
          borderTopWidth: 1,
          borderRightWidth: 1,
          borderColor: refBubble.border,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  )
}
