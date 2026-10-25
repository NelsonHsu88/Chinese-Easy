import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Easing, Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import { SlidersHorizontal } from 'lucide-react-native'
import { ICON_GREEN_DARK } from './DictionaryControls'
import { DICT_BG } from './shadows'
import { DASH_LIFT, PressableScale, usePressProgress } from '../dashboard/parts'
import { useReduceMotion } from '../tour/useReduceMotion'
import { tickHaptic } from '../../lib/haptics'

/*
 * The filter panel's accordion, and the round button that drives it.
 *
 * Two values per drawer. `height` (JS driver: it's layout) unfolds the box,
 * so everything below moves with ordinary flow. `reveal` (native where it can
 * be) fades and lifts the contents. They run on different curves each way:
 * opening, the contents arrive a beat after the box starts to grow; closing,
 * they fade out first and the box follows. Reversing mid-way stops both where
 * they are and runs on from there, for the remaining distance only.
 */

const OPEN_MS = 280
const CLOSE_MS = 220
const OPEN_EASING = Easing.out(Easing.cubic)
const CLOSE_EASING = Easing.inOut(Easing.cubic)
/** How far the contents rise as they appear. */
const RISE = 6
/** Contents trail the box this long on the way in. */
const REVEAL_DELAY = 40
const REVEAL_CLOSE_MS = 130
/** Past an animation's end, when the backstop forces its final frame. */
const BACKSTOP_MS = 80

/*
 * `overflow: hidden` would also clip the panel card's own shadow
 * (`DICT_CARD_SHADOW`: 4 down, 10 blur). So the clipping box reaches this far
 * past the card on the sides and below, and negative margins hand the space
 * straight back — the layout is the same as without it.
 */
const SHADOW_PAD_X = 12
const SHADOW_PAD_BOTTOM = 18

const nativeDriver = Platform.OS !== 'web'

type Phase = 'open' | 'closed' | 'moving'

export function FilterDrawer({ open, children }: { open: boolean; children: ReactNode }) {
  const reduceMotion = useReduceMotion()
  const height = useRef(new Animated.Value(open ? 1 : 0)).current
  const reveal = useRef(new Animated.Value(open ? 1 : 0)).current
  /** The contents' natural height, from their own layout. 0 = not measured yet. */
  const [measured, setMeasured] = useState(0)
  /** At rest open, the box is content-sized, so nothing can ever clip. */
  const [phase, setPhase] = useState<Phase>(open ? 'open' : 'closed')
  const prevOpen = useRef(open)
  const run = useRef(0)
  const backstop = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (prevOpen.current === open) return
    prevOpen.current = open

    const token = ++run.current
    const to = open ? 1 : 0
    if (backstop.current) clearTimeout(backstop.current)
    const finish = () => {
      if (run.current !== token) return
      height.setValue(to)
      reveal.setValue(to)
      setPhase(open ? 'open' : 'closed')
    }

    let from = to === 1 ? 0 : 1
    height.stopAnimation((value) => {
      from = value
    })
    reveal.stopAnimation()

    // No height to animate towards yet, or no motion wanted: just be there.
    if (reduceMotion || measured === 0) {
      finish()
      return
    }

    const span = Math.min(1, Math.abs(to - from))
    const boxMs = Math.max(1, Math.round((open ? OPEN_MS : CLOSE_MS) * span))
    const revealMs = Math.max(1, Math.round((open ? OPEN_MS - REVEAL_DELAY : REVEAL_CLOSE_MS) * span))
    const revealDelay = open ? Math.round(REVEAL_DELAY * span) : 0

    setPhase('moving')
    Animated.parallel([
      Animated.timing(height, {
        toValue: to,
        duration: boxMs,
        easing: open ? OPEN_EASING : CLOSE_EASING,
        useNativeDriver: false,
      }),
      Animated.timing(reveal, {
        toValue: to,
        duration: revealMs,
        delay: revealDelay,
        easing: open ? OPEN_EASING : Easing.in(Easing.quad),
        useNativeDriver: nativeDriver,
      }),
    ]).start(({ finished }) => {
      if (finished) finish()
    })
    // rAF stalls in a hidden browser tab; this lands the final frame anyway.
    backstop.current = setTimeout(finish, Math.max(boxMs, revealDelay + revealMs) + BACKSTOP_MS)
  }, [open, reduceMotion, measured, height, reveal])

  useEffect(
    () => () => {
      if (backstop.current) clearTimeout(backstop.current)
    },
    [],
  )

  const onLayout = (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height)
    if (h > 0 && h !== measured) setMeasured(h)
  }

  const resting = phase === 'open'
  const closed = phase === 'closed' && !open

  return (
    <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      accessibilityElementsHidden={closed}
      importantForAccessibility={closed ? 'no-hide-descendants' : 'auto'}
      aria-hidden={closed}
      style={[
        { overflow: 'hidden', marginHorizontal: -SHADOW_PAD_X, paddingHorizontal: SHADOW_PAD_X },
        resting
          ? { paddingBottom: SHADOW_PAD_BOTTOM, marginBottom: -SHADOW_PAD_BOTTOM }
          : {
              height: height.interpolate({ inputRange: [0, 1], outputRange: [0, measured + SHADOW_PAD_BOTTOM] }),
              marginBottom: height.interpolate({ inputRange: [0, 1], outputRange: [0, -SHADOW_PAD_BOTTOM] }),
            },
      ]}
    >
      {/* Absolute while animating, so it lays out at full height inside a box
          that isn't — which is also what lets it be measured while closed. */}
      <View
        onLayout={onLayout}
        style={resting ? undefined : { position: 'absolute', top: 0, left: SHADOW_PAD_X, right: SHADOW_PAD_X }}
      >
        <Animated.View
          style={{
            opacity: reveal,
            transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [RISE, 0] }) }],
          }}
        >
          {children}
        </Animated.View>
      </View>
    </Animated.View>
  )
}

/** Mirrors `border-dict-border` / `border-dict-green/40` in tailwind.config.js. */
const BORDER_IDLE = '#E8E5DE'
const BORDER_ACTIVE = 'rgba(74,165,75,0.4)'
const ICON_IDLE = '#18263A'

/**
 * The round sliders button, raised like every button: its face stands on a
 * shoulder and sinks onto it when pressed (`PressableScale` + the press
 * progress, the way `LiftedFace` does), springing back on release. Its jade
 * fill, border, shoulder and icon ink ease in and out with the drawer; opening
 * also gives the icon a small 0.96 → 1 settle. It stands `DASH_LIFT` taller
 * than `size`, like the pills beside it.
 */
export function FilterButton({
  open,
  refined,
  size,
  onPress,
}: {
  open: boolean
  /** Something inside the panel differs from its default — marked with a dot. */
  refined: boolean
  size: number
  onPress: () => void
}) {
  const reduceMotion = useReduceMotion()
  const active = useRef(new Animated.Value(open ? 1 : 0)).current // JS: colours
  const pop = useRef(new Animated.Value(1)).current // native: transform only
  const prevOpen = useRef(open)

  useEffect(() => {
    if (prevOpen.current === open) return
    prevOpen.current = open
    const to = open ? 1 : 0
    if (reduceMotion) {
      active.setValue(to)
      pop.setValue(1)
      return
    }
    const duration = open ? OPEN_MS : CLOSE_MS
    const animations = [
      Animated.timing(active, {
        toValue: to,
        duration,
        easing: open ? OPEN_EASING : CLOSE_EASING,
        useNativeDriver: false,
      }),
    ]
    if (open) {
      pop.setValue(0.96)
      animations.push(
        Animated.timing(pop, { toValue: 1, duration: 220, easing: OPEN_EASING, useNativeDriver: nativeDriver }),
      )
    }
    const animation = Animated.parallel(animations)
    animation.start()
    const settle = setTimeout(() => {
      active.setValue(to)
      pop.setValue(1)
    }, duration + BACKSTOP_MS)
    return () => {
      animation.stop()
      clearTimeout(settle)
    }
  }, [open, reduceMotion, active, pop])

  return (
    <PressableScale
      onPress={() => {
        tickHaptic()
        onPress()
      }}
      scaleTo={0.92}
      haptic={false}
      accessibilityLabel={open ? 'Close filters' : 'More filters'}
    >
      <FilterFace size={size} active={active} pop={pop} refined={refined} />
    </PressableScale>
  )
}

/** The filter button's face and shoulder. A child of the `PressableScale`, so it can read the press. */
function FilterFace({
  size,
  active,
  pop,
  refined,
}: {
  size: number
  active: Animated.Value
  pop: Animated.Value
  refined: boolean
}) {
  const resting = useRef(new Animated.Value(0)).current
  const press = usePressProgress() ?? resting
  const sink = press.interpolate({ inputRange: [0, 1], outputRange: [0, DASH_LIFT] })
  const radius = size / 2

  return (
    <View style={{ width: size, height: size + DASH_LIFT }}>
      {/* The shoulder: warm grey at rest, green while the panel is open. Colour only (JS). */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: DASH_LIFT,
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: active.interpolate({ inputRange: [0, 1], outputRange: [DICT_BG.pillShoulder, DICT_BG.green] }),
        }}
      />
      {/* The face: transform only on this view (the press can run on the native driver). */}
      <Animated.View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: sink }] }}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radius,
              borderWidth: 1.5,
              borderColor: active.interpolate({ inputRange: [0, 1], outputRange: [BORDER_IDLE, BORDER_ACTIVE] }),
              backgroundColor: active.interpolate({ inputRange: [0, 1], outputRange: [DICT_BG.card, DICT_BG.greenPale] }),
            },
          ]}
        />
        <Animated.View style={{ transform: [{ scale: pop }] }}>
          <Animated.View style={{ opacity: active.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
            <SlidersHorizontal size={19} color={ICON_IDLE} strokeWidth={1.8} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: active }]}>
            <SlidersHorizontal size={19} color={ICON_GREEN_DARK} strokeWidth={1.8} />
          </Animated.View>
        </Animated.View>
        {refined && (
          <View
            pointerEvents="none"
            className="absolute rounded-full bg-dict-green"
            style={{ top: 10, right: 10, width: 7, height: 7 }}
          />
        )}
      </Animated.View>
    </View>
  )
}
