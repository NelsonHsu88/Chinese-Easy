import { useEffect, useRef } from 'react'
import { Animated, Easing, Platform, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useReduceMotion } from '../tour/useReduceMotion'
import { ANSWER_MOTION } from './questionMotion'
import { answerFx } from './tokens'

/*
 * The two flourishes a right answer gets on top of its spring
 * (`useAnswerReaction`): a highlight that sweeps once across it, and a few
 * sparks that lift off its top edge. Both are decoration — they draw above the
 * fill and below the text, take no touches, and are skipped entirely under
 * reduced motion. Each plays once when `play` turns true, with a timer
 * backstop that parks it at its end (invisible) if a hidden browser tab stops
 * the animation (see CLAUDE.md, Animation).
 */

const NATIVE = Platform.OS !== 'web'

/**
 * A soft, slightly diagonal band of light that crosses the answer left to
 * right, once. Put it first inside the answer's coloured view, so the text
 * draws over it; `radius` should match that view's corners.
 *
 * Driven on `left` in percentages (JS driver), so it needs no measured width —
 * `onLayout` isn't reliable on web (see CLAUDE.md, Animation).
 */
export function AnswerShimmer({ play, radius = 0 }: { play: boolean; radius?: number }) {
  const reduce = useReduceMotion()
  const sweep = useRef(new Animated.Value(0)).current
  const on = play && !reduce

  useEffect(() => {
    if (!on) return
    sweep.setValue(0)
    const anim = Animated.timing(sweep, {
      toValue: 1,
      duration: ANSWER_MOTION.shimmerMs,
      delay: ANSWER_MOTION.shimmerDelayMs,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    })
    anim.start()
    const backstop = setTimeout(() => sweep.setValue(1), ANSWER_MOTION.shimmerDelayMs + ANSWER_MOTION.shimmerMs + 150)
    return () => {
      anim.stop()
      clearTimeout(backstop)
    }
  }, [on, sweep])

  if (!on) return null
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius, overflow: 'hidden' }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: '-50%',
          bottom: '-50%',
          width: '34%',
          // Starts wholly off the left edge and ends wholly off the right, so nothing lingers.
          left: sweep.interpolate({ inputRange: [0, 1], outputRange: ['-60%', '125%'] }),
          transform: [{ rotate: '16deg' }],
        }}
      >
        <LinearGradient
          colors={[answerFx.shimmerClear, answerFx.shimmer, answerFx.shimmerClear]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  )
}

/** Where each spark starts on the answer's box (percent) and how far it drifts (points). */
const SPARKS = [
  { left: '10%', top: '6%', dx: -9, dy: -15, size: 6 },
  { left: '48%', top: '-4%', dx: 2, dy: -18, size: 5 },
  { left: '84%', top: '4%', dx: 10, dy: -14, size: 6 },
  { left: '97%', top: '45%', dx: 13, dy: -5, size: 5 },
] as const

/**
 * Four tiny diamonds that lift off a right answer's upper edge and fade —
 * a quick "yes", nowhere near confetti. Put it inside the answer's view; the
 * sparks start on its edge and drift a little way out, so the view must not
 * clip (`overflow: 'hidden'`).
 */
export function AnswerSparks({ play }: { play: boolean }) {
  const reduce = useReduceMotion()
  const values = useRef(SPARKS.map(() => new Animated.Value(0))).current
  const on = play && !reduce

  useEffect(() => {
    if (!on) return
    values.forEach((v) => v.setValue(0))
    const anim = Animated.parallel(
      values.map((v, i) =>
        Animated.timing(v, {
          toValue: 1,
          duration: ANSWER_MOTION.sparkMs,
          delay: ANSWER_MOTION.sparkDelayMs + i * ANSWER_MOTION.sparkStaggerMs,
          easing: Easing.out(Easing.quad),
          useNativeDriver: NATIVE,
        }),
      ),
    )
    anim.start()
    const end = ANSWER_MOTION.sparkDelayMs + ANSWER_MOTION.sparkStaggerMs * SPARKS.length + ANSWER_MOTION.sparkMs
    const backstop = setTimeout(() => values.forEach((v) => v.setValue(1)), end + 150)
    return () => {
      anim.stop()
      clearTimeout(backstop)
    }
  }, [on, values])

  if (!on) return null
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {SPARKS.map((spark, i) => {
        const v = values[i]
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: spark.left,
              top: spark.top,
              width: spark.size,
              height: spark.size,
              borderRadius: 1.5,
              backgroundColor: answerFx.sparks[i % answerFx.sparks.length],
              opacity: v.interpolate({ inputRange: [0, 0.15, 0.6, 1], outputRange: [0, 1, 0.8, 0] }),
              transform: [
                { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, spark.dx] }) },
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, spark.dy] }) },
                { rotate: '45deg' },
                { scale: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1, 0.6] }) },
              ],
            }}
          />
        )
      })}
    </View>
  )
}
