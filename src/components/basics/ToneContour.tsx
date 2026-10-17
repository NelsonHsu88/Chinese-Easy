import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, View } from 'react-native'
import Svg, { Circle, Line, Path } from 'react-native-svg'
import type { Tone } from '../../data/basics/types'
import { useReduceMotion } from '../tour/useReduceMotion'
import { basicsColors as c } from './tokens'

/*
 * A tone's pitch shape on the five-level scale linguists use (Chao numbers:
 * 1st 55, 2nd 35, 3rd 214 in isolation, 4th 51; the neutral tone a short dot).
 *
 * `sweepKey` replays the line drawing itself left to right — the lesson bumps
 * it when the matching audio *starts*, which is as close to synchronised as
 * speech without timing data gets. Reduced motion draws it whole.
 */

const W = 100
const H = 60
const PAD = 8

/** Pitch level 1–5 → y. */
const y = (level: number) => PAD + ((5 - level) / 4) * (H - PAD * 2)
const x = (share: number) => PAD + share * (W - PAD * 2)

const PATHS: Record<Exclude<Tone, 5>, string> = {
  1: `M ${x(0)} ${y(5)} L ${x(1)} ${y(5)}`,
  2: `M ${x(0)} ${y(3)} C ${x(0.45)} ${y(3)} ${x(0.7)} ${y(4.2)} ${x(1)} ${y(5)}`,
  3: `M ${x(0)} ${y(2)} C ${x(0.2)} ${y(1)} ${x(0.45)} ${y(0.9)} ${x(0.6)} ${y(1.1)} S ${x(0.85)} ${y(3)} ${x(1)} ${y(4)}`,
  4: `M ${x(0)} ${y(5)} C ${x(0.35)} ${y(5)} ${x(0.6)} ${y(3)} ${x(1)} ${y(1)}`,
}

const SWEEP_MS = 650

export function ToneContour({ tone, width = 88, sweepKey = 0 }: { tone: Tone; width?: number; sweepKey?: number }) {
  const height = (width * H) / W
  const ink = c.tone[tone]
  const reduce = useReduceMotion()
  const reveal = useRef(new Animated.Value(1)).current
  const [clipped, setClipped] = useState(false)

  useEffect(() => {
    if (!sweepKey || reduce) return
    setClipped(true)
    reveal.setValue(0)
    const anim = Animated.timing(reveal, {
      toValue: 1,
      duration: SWEEP_MS,
      easing: Easing.inOut(Easing.quad),
      // A width can't run on the native driver.
      useNativeDriver: false,
    })
    anim.start()
    // rAF stops in a hidden browser tab — never leave the line half drawn.
    const backstop = setTimeout(() => reveal.setValue(1), SWEEP_MS + 200)
    return () => {
      anim.stop()
      clearTimeout(backstop)
      reveal.setValue(1)
    }
  }, [sweepKey, reduce, reveal])

  const shape = (
    <Svg width={width} height={height} viewBox={`0 0 ${W} ${H}`}>
      {tone === 5 ? (
        <Circle cx={x(0.3)} cy={y(2.5)} r={5} fill={ink} />
      ) : (
        <Path d={PATHS[tone]} stroke={ink} strokeWidth={5} strokeLinecap="round" fill="none" />
      )}
    </Svg>
  )

  return (
    <View
      style={{ width, height }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <Svg width={width} height={height} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute' }}>
        {[1, 2, 3, 4, 5].map((level) => (
          <Line key={level} x1={x(0)} x2={x(1)} y1={y(level)} y2={y(level)} stroke={c.toneGrid} strokeWidth={1} />
        ))}
      </Svg>
      {clipped ? (
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height,
            overflow: 'hidden',
            width: reveal.interpolate({ inputRange: [0, 1], outputRange: [0, width] }),
          }}
        >
          {shape}
        </Animated.View>
      ) : (
        <View style={{ position: 'absolute', left: 0, top: 0 }}>{shape}</View>
      )}
    </View>
  )
}

