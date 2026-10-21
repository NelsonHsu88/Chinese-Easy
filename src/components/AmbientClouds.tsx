import { useCallback, useEffect, useRef } from 'react'
import { Animated, Easing, Image, Platform, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { prefersReducedMotion } from './dashboard/entrance'

/*
 * Clouds drifting slowly across a hero painting's sky — the app's one piece of
 * ambient motion, there to make the watercolour feel alive rather than to be
 * watched.
 *
 * Rules it keeps:
 * - **Slow and linear.** A cloud takes 50–90 seconds to cross; constant motion
 *   uses linear easing, anything else would pulse.
 * - **Native driver** on device (transform only), so it costs the JavaScript
 *   thread nothing; on web the loop is JS-driven, so it **pauses whenever the
 *   screen loses focus** — a tab left mounted underneath never keeps animating.
 * - **Reduced motion** shows the clouds where they are, still.
 * - Behind the type, never in front of it, and `pointerEvents="none"`.
 */

const NATIVE = Platform.OS !== 'web'

const ART = {
  cluster: { source: require('../assets/images/decor/cloud-cluster.png'), ratio: 251 / 133 },
  wisp: { source: require('../assets/images/decor/cloud-wisp.png'), ratio: 177 / 103 },
  drift: { source: require('../assets/images/decor/cloud-drift.png'), ratio: 243 / 110 },
} as const

export interface CloudSpec {
  kind: keyof typeof ART
  /** Top edge as a share of the layer's height. */
  top: number
  /** Width as a share of the layer's width. */
  size: number
  /** Seconds to cross the whole layer once. */
  seconds: number
  /** Where along its crossing it starts, 0–1, so the sky is never empty at first. */
  start: number
  opacity?: number
}

/** Two clouds: what most heroes get. */
export const CLOUDS_FEW: CloudSpec[] = [
  { kind: 'wisp', top: 0.06, size: 0.24, seconds: 78, start: 0.18, opacity: 0.85 },
  { kind: 'cluster', top: 0.2, size: 0.2, seconds: 96, start: 0.62, opacity: 0.7 },
]

/** A fuller sky, for Learn. */
export const CLOUDS_MANY: CloudSpec[] = [
  { kind: 'wisp', top: 0.04, size: 0.26, seconds: 70, start: 0.1, opacity: 0.9 },
  { kind: 'cluster', top: 0.16, size: 0.22, seconds: 92, start: 0.45, opacity: 0.75 },
  { kind: 'drift', top: 0.3, size: 0.28, seconds: 84, start: 0.78, opacity: 0.6 },
  { kind: 'wisp', top: 0.48, size: 0.18, seconds: 110, start: 0.3, opacity: 0.55 },
]

function Cloud({ spec, width, height }: { spec: CloudSpec; width: number; height: number }) {
  const art = ART[spec.kind]
  const w = width * spec.size
  const h = w / art.ratio
  const progress = useRef(new Animated.Value(spec.start)).current
  const loop = useRef<Animated.CompositeAnimation | null>(null)

  const start = useCallback(() => {
    if (prefersReducedMotion()) return
    loop.current?.stop()
    /* Finish the current crossing from wherever it is, then loop whole crossings. */
    progress.stopAnimation((at: number) => {
      const from = typeof at === 'number' ? at : spec.start
      const first = Animated.timing(progress, {
        toValue: 1,
        duration: Math.max(0, (1 - from) * spec.seconds * 1000),
        easing: Easing.linear,
        useNativeDriver: NATIVE,
      })
      const again = Animated.loop(
        Animated.sequence([
          Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: NATIVE }),
          Animated.timing(progress, { toValue: 1, duration: spec.seconds * 1000, easing: Easing.linear, useNativeDriver: NATIVE }),
        ]),
      )
      loop.current = Animated.sequence([first, again])
      loop.current.start()
    })
  }, [progress, spec.seconds, spec.start])

  useFocusEffect(
    useCallback(() => {
      start()
      return () => {
        loop.current?.stop()
        loop.current = null
      }
    }, [start]),
  )
  useEffect(() => () => loop.current?.stop(), [])

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-w, width] })
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        top: height * spec.top,
        width: w,
        height: h,
        opacity: spec.opacity ?? 0.8,
        transform: [{ translateX }],
      }}
    >
      <Image source={art.source} resizeMode="contain" style={{ width: w, height: h }} />
    </Animated.View>
  )
}

/** A layer of drifting clouds, absolutely filling its parent's top `height` points. */
export function AmbientClouds({ width, height, clouds = CLOUDS_FEW }: { width: number; height: number; clouds?: CloudSpec[] }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', top: 0, left: 0, width, height, overflow: 'hidden' }}
    >
      {clouds.map((spec, i) => (
        <Cloud key={i} spec={spec} width={width} height={height} />
      ))}
    </View>
  )
}
