import { useEffect, useRef, useState, type ComponentType } from 'react'
import { Animated, Easing, Platform, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useReduceMotion } from '../tour/useReduceMotion'
import { successHaptic, tickHaptic } from '../../lib/haptics'
import { endBoxSize as B, endBoxes } from './tokens'

/*
 * The session's results as Duolingo's lesson-complete boxes, played one after
 * another:
 *
 *   1. a ring of sparkles bursts where the box will stand;
 *   2. the box pops in (an overshoot, then settles) — only its white body and
 *      outline, with the icon and a number counting up from zero, fast at
 *      first and easing into its value;
 *   3. as the count lands, the coloured header band rises out from behind the
 *      body with its label, and a light haptic marks it.
 *
 * The next box starts while the one before is still counting, so the three
 * overlap the way Duolingo's do rather than waiting in line.
 *
 * Transforms and opacity run on the native driver; the count is its own JS
 * value, read by a listener into the text. Every value has a timer backstop
 * that forces its final frame (hidden browser tabs stop rAF), and reduced
 * motion shows the finished boxes at once.
 */

const NATIVE = Platform.OS !== 'web'

/** When each box starts after the one before, and the beats inside one box. */
const STAGGER_MS = 560
const COUNT_DELAY_MS = 120
const COUNT_MS = 760
const BURST_MS = 520
const BACKSTOP_MS = 220

export type ResultBox = {
  key: string
  /** The header's label, shown once the count lands. */
  label: string
  icon: ComponentType<{ size: number; color: string; strokeWidth: number; fill?: string }>
  /** Filled icons (the XP bolt) take their ink as a fill too. */
  filledIcon?: boolean
  value: number
  format: (n: number) => string
  tone: { frame: string; ink: string; star: string }
}

export function ResultBoxes({ boxes, width, startDelay = 0 }: { boxes: ResultBox[]; width: number; startDelay?: number }) {
  const boxWidth = (width - B.gap * (boxes.length - 1)) / boxes.length
  return (
    <View style={{ flexDirection: 'row', gap: B.gap, justifyContent: 'center' }}>
      {boxes.map((box, i) => (
        <OneBox key={box.key} box={box} width={boxWidth} delay={startDelay + i * STAGGER_MS} last={i === boxes.length - 1} />
      ))}
    </View>
  )
}

function OneBox({ box, width, delay, last }: { box: ResultBox; width: number; delay: number; last: boolean }) {
  const reduceMotion = useReduceMotion()
  const pop = useRef(new Animated.Value(0)).current // native: scale + opacity
  const burst = useRef(new Animated.Value(0)).current // native: the sparkles
  const header = useRef(new Animated.Value(0)).current // native: the band
  const count = useRef(new Animated.Value(0)).current // JS: the number
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms))
    const finish = () => {
      pop.setValue(1)
      burst.setValue(1)
      header.setValue(1)
      count.setValue(1)
      setShown(box.value)
    }
    if (reduceMotion) {
      finish()
      return
    }

    const id = count.addListener(({ value }) => setShown(Math.round(value * box.value)))
    const countAt = delay + COUNT_DELAY_MS
    const landAt = countAt + COUNT_MS

    const anim = Animated.parallel([
      Animated.timing(burst, { toValue: 1, duration: BURST_MS, delay, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }),
      Animated.spring(pop, { toValue: 1, delay, damping: 9, stiffness: 220, mass: 0.7, useNativeDriver: NATIVE }),
      Animated.timing(count, { toValue: 1, duration: COUNT_MS, delay: countAt, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.spring(header, { toValue: 1, delay: landAt, damping: 11, stiffness: 260, mass: 0.6, useNativeDriver: NATIVE }),
    ])
    anim.start()
    later(() => (last ? successHaptic() : tickHaptic()), landAt)
    // Lands the final frame even if a hidden tab stalls the animations.
    later(finish, landAt + 600 + BACKSTOP_MS)
    return () => {
      anim.stop()
      count.removeListener(id)
      timers.forEach(clearTimeout)
    }
    // Once per mount: a session ends once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { tone } = box
  const Icon = box.icon
  const text = box.format(shown)
  const finalText = box.format(box.value)
  /* Sized for the final value, so the number doesn't change size as it counts. */
  const inner = width - B.outline * 2 - 12
  const valueSize = Math.min(24, (inner - 26) / Math.max(1, finalText.length * 0.62))
  const height = B.header + B.body

  return (
    <View style={{ width, height }}>
      <Sparkles burst={burst} tone={tone.star} width={width} height={height} />
      <Animated.View
        style={{
          width,
          height,
          opacity: pop.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
          transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }],
        }}
        accessible
        accessibilityLabel={`${box.label}: ${finalText}`}
      >
        {/* The header band, behind the body's top edge; it rises out from behind it. */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: B.header + B.radius,
            borderTopLeftRadius: B.radius,
            borderTopRightRadius: B.radius,
            backgroundColor: tone.frame,
            alignItems: 'center',
            paddingTop: 5,
            opacity: header,
            transform: [{ translateY: header.interpolate({ inputRange: [0, 1], outputRange: [B.header * 0.7, 0] }) }],
          }}
        >
          <Text
            numberOfLines={1}
            style={{ fontFamily: 'NunitoExtraBold', fontSize: 12, lineHeight: 16, letterSpacing: 0.9, color: endBoxes.label }}
          >
            {box.label}
          </Text>
        </Animated.View>
        {/* The body: white, outlined in the frame colour, the icon and the count. */}
        <View
          style={{
            position: 'absolute',
            top: B.header,
            left: 0,
            right: 0,
            height: B.body,
            borderRadius: B.radius,
            borderWidth: B.outline,
            borderColor: tone.frame,
            backgroundColor: endBoxes.body,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {/* `fill` only when wanted: passing `undefined` overrides the icon's own
              "none" and SVG paints the shape black. */}
          {box.filledIcon ? (
            <Icon size={20} color={tone.ink} strokeWidth={2.4} fill={tone.ink} />
          ) : (
            <Icon size={20} color={tone.ink} strokeWidth={2.4} />
          )}
          <Text
            numberOfLines={1}
            style={{ fontFamily: 'NunitoExtraBold', fontSize: valueSize, lineHeight: valueSize * 1.25, color: tone.ink, includeFontPadding: false }}
          >
            {text}
          </Text>
        </View>
      </Animated.View>
    </View>
  )
}

/** A four-point sparkle, in a 24-unit box. */
const STAR = 'M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z'

/** Six sparkles around the box, flying a little outward as they fade. */
function Sparkles({ burst, tone, width, height }: { burst: Animated.Value; tone: string; width: number; height: number }) {
  const rx = width * 0.62
  const ry = height * 0.62
  const marks = [
    { a: -100, s: 13 },
    { a: -40, s: 9 },
    { a: 20, s: 11 },
    { a: 85, s: 8 },
    { a: 150, s: 12 },
    { a: 210, s: 9 },
  ]
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
      {marks.map((m, i) => {
        const rad = (m.a * Math.PI) / 180
        const x = width / 2 + Math.cos(rad) * rx * 0.7 - m.s / 2
        const y = height / 2 + Math.sin(rad) * ry * 0.7 - m.s / 2
        const dx = Math.cos(rad) * rx * 0.35
        const dy = Math.sin(rad) * ry * 0.35
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              opacity: burst.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 0.8, 0] }),
              transform: [
                { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
                { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
                { scale: burst.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.2, 1, 0.6] }) },
              ],
            }}
          >
            <Svg width={m.s} height={m.s} viewBox="0 0 24 24">
              <Path d={STAR} fill={tone} />
            </Svg>
          </Animated.View>
        )
      })}
    </View>
  )
}
