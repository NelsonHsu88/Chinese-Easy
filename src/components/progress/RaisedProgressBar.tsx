import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native'
import {
  raisedProgressColors,
  raisedProgressMotion as m,
  raisedProgressSheen as sheenOpacity,
  raisedProgressSize,
} from './tokens'

/*
 * The app's progress bar: a jade pill raised off a sage track, like a piece of
 * polished jade set into the page.
 *
 * Layers, back to front:
 *   track edge  — the track's darker lower lip, `depth` below the track face
 *   track face  — the sage groove
 *   fill edge   — the jade's darker underside, `depth` below the fill face
 *   fill face   — the jade itself
 *   highlight   — a faint sheen along the fill's upper third
 *
 * The three fill layers live inside one animated box and take their width from
 * it, so they can never drift apart mid-animation. The box is never clipped:
 * clipping would square off the pill's rounded ends. Instead, any progress
 * above zero is at least one pill wide (`minWidth`), so the smallest step is
 * still a round bead rather than a sliver.
 *
 * Width is a layout property, so the animation is JS-driven (RN `Animated`,
 * which — unlike Reanimated — also runs on web), with a timer backstop that
 * lands the final value if the browser stops animating a hidden tab.
 */

type Size = keyof typeof raisedProgressSize

export function RaisedProgressBar({
  progress,
  initialProgress,
  delayMs = 0,
  size = 'regular',
  colors,
  accessibilityLabel,
  style,
}: {
  /** 0 to 1. Values outside are clamped. */
  progress: number
  /**
   * Where the bar starts on mount. A screen that remounts per question passes
   * the previous question's progress, so each one opens with the step forward.
   * Defaults to `progress` (no movement on mount).
   */
  initialProgress?: number
  /** Waits this long before moving — e.g. until a screen has slid in. */
  delayMs?: number
  size?: Size
  /** Recolours the bar (a tinted card's hue); anything left out stays jade. */
  colors?: Partial<RaisedProgressColors>
  /** Read with the percentage, e.g. "Question 3 of 12". */
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
}) {
  const { height, depth } = raisedProgressSize[size]
  const c = colors ? { ...raisedProgressColors, ...colors } : raisedProgressColors
  const to = clamp01(progress)
  const from = clamp01(initialProgress ?? to)

  const value = useRef(new Animated.Value(from)).current
  const sheen = useRef(new Animated.Value(0)).current
  const shown = useRef(from)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const previous = shown.current
    shown.current = to
    if (previous === to) return
    if (reduceMotion) {
      value.setValue(to)
      return
    }

    const anim = Animated.timing(value, {
      toValue: to,
      duration: m.durationMs,
      delay: delayMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    })
    // Filling the bar is a milestone: the sheen brightens once as it lands.
    const milestone =
      to >= 1 && previous < 1
        ? Animated.sequence([
            Animated.timing(sheen, { toValue: 1, duration: m.milestoneMs / 2, easing: Easing.out(Easing.quad), useNativeDriver: false }),
            Animated.timing(sheen, { toValue: 0, duration: m.milestoneMs / 2, easing: Easing.in(Easing.quad), useNativeDriver: false }),
          ])
        : null
    const run = milestone ? Animated.sequence([anim, milestone]) : anim
    run.start()

    const backstop = setTimeout(() => {
      value.setValue(to)
      sheen.setValue(0)
    }, delayMs + m.durationMs + (milestone ? m.milestoneMs : 0) + m.backstopMs)
    return () => {
      clearTimeout(backstop)
      run.stop()
      /* An interrupted step still lands where it was going: the reduce-motion
         setting arrives a moment after mount and re-runs this effect, which
         would otherwise leave the bar frozen part-way. */
      value.setValue(to)
      sheen.setValue(0)
    }
  }, [to, delayMs, reduceMotion, value, sheen])

  const width = value.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' })
  const radius = height / 2
  const percent = Math.round(to * 100)

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: percent, text: `${percent}%` }}
      style={[{ height: height + depth, flexGrow: 1 }, style]}
    >
      {/* The track: its lip, then its face. */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: depth, height, borderRadius: radius, backgroundColor: c.trackEdge }} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height, borderRadius: radius, backgroundColor: c.track }} />

      {/* The fill: one box, three layers. Hidden outright at zero, so no bead shows. */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width,
          minWidth: to > 0 ? height : 0,
          opacity: to > 0 ? 1 : 0,
        }}
      >
        <View style={{ position: 'absolute', left: 0, right: 0, top: depth, height, borderRadius: radius, backgroundColor: c.fillEdge }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height, borderRadius: radius, backgroundColor: c.fill }} />
        <Animated.View
          style={{
            position: 'absolute',
            left: radius * 0.7,
            right: radius * 0.7,
            top: height * 0.18,
            height: Math.max(2, height * 0.24),
            borderRadius: height,
            backgroundColor: c.highlight,
            opacity: sheen.interpolate({ inputRange: [0, 1], outputRange: [sheenOpacity.rest, sheenOpacity.glint] }),
          }}
        />
      </Animated.View>
    </View>
  )
}

export type RaisedProgressColors = { [K in keyof typeof raisedProgressColors]: string }

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0
}

/** The system's reduce-motion setting, kept current. False until it's known. */
function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    let live = true
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (live) setReduce(on)
      })
      .catch(() => {})
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (on: boolean) => setReduce(on))
    return () => {
      live = false
      sub?.remove?.()
    }
  }, [])
  return reduce
}
