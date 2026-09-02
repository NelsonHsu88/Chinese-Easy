import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Easing, Platform, View, type StyleProp, type ViewStyle } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { dashEntrance } from './tokens'

/*
 * The Dashboard's entrance animation.
 *
 * The score lives in `dashEntrance`; this is the machinery that plays it. Each
 * element gets one value running 1 → 0, where 1 is "displaced and transparent"
 * and 0 is "in place" — one direction of travel per element, all sharing a
 * single ease-out curve so six separate animations read as one scene arriving.
 *
 * React Native's own `Animated`, not Reanimated: Reanimated's update loop does
 * not drive on this project's web target, where an animated style evaluates once
 * and then never changes — every piece of this would sit permanently off-screen
 * at opacity 0.
 */

const USE_NATIVE_DRIVER = Platform.OS !== 'web'

/** One curve for the whole scene. Decelerating, so everything lands rather than stops. */
const ARRIVE = Easing.out(Easing.cubic)

/** The way out. Accelerating — the scene is being left, not shown. */
const DEPART = Easing.in(Easing.cubic)

/**
 * A counter that ticks on every focus.
 *
 * The entrance replays each time the learner comes to the Dashboard — from
 * another tab, from a pushed screen, or on launch — rather than only on mount,
 * which is what the tab staying mounted underneath would otherwise limit it to.
 * Every animation below keys off this, so one number restarts the whole score.
 */
export function useEntranceRun(): number {
  const [run, setRun] = useState(0)

  /*
   * The *first* focus is skipped, and that is not an optimisation.
   *
   * Mounting already starts the score — every `useReveal` begins displaced and
   * animates on its own mount effect. The focus that immediately follows was
   * then ticking `run`, which restarted the whole thing a beat later: a screen
   * would fade a third of the way in, snap back to the start, and fade in
   * again. On the Dashboard the staged delays hid it; on a screen that arrives
   * on one beat, like Books or Challenges, it is the whole animation playing
   * twice and it is very visible.
   *
   * Every focus after the first is a genuine return and does tick.
   */
  const mounted = useRef(false)

  useFocusEffect(
    useCallback(() => {
      if (!mounted.current) {
        mounted.current = true
        return
      }
      setRun((n) => n + 1)
    }, []),
  )

  return run
}

export type RevealFrom = 'left' | 'right' | 'bottom'

/**
 * One element's arrival.
 *
 * Returns an animated style. `extraTransform` is appended *after* the entrance's
 * own translate, and it is not optional decoration — the sakura and the pagoda
 * are mirrored with `scaleX: -1`, and an animated `transform` replaces the whole
 * array rather than merging into it. Composing here is what stops the entrance
 * silently un-mirroring both of them. The order matters too: translate first, so
 * it is measured in unflipped space and a positive offset still means "to the
 * right".
 */
export function useReveal({
  from,
  at,
  duration,
  run,
  distance,
  toOpacity = 1,
  withScale = false,
  extraTransform = [],
}: {
  from: RevealFrom
  /** Milliseconds from the start of the run. */
  at: number
  duration: number
  run: number
  distance: number
  /** Resting opacity. The pagoda settles at 0.92, not 1. */
  toOpacity?: number
  /** A slight swell on arrival. The speech bubble only. */
  withScale?: boolean
  extraTransform?: ViewStyle['transform']
}) {
  /* 1 = displaced and transparent, 0 = settled. */
  const displaced = useRef(new Animated.Value(1)).current

  /* The exit in flight, if the learner has just left. See the focus effect below. */
  const leaving = useRef<{
    exit: Animated.CompositeAnimation
    parked: ReturnType<typeof setTimeout>
  } | null>(null)

  const cancelExit = useCallback(() => {
    if (!leaving.current) return
    leaving.current.exit.stop()
    clearTimeout(leaving.current.parked)
    leaving.current = null
  }, [])

  useEffect(() => {
    /* An exit still running would otherwise drag this straight back out. */
    cancelExit()
    displaced.setValue(1)

    const animation = Animated.timing(displaced, {
      toValue: 0,
      duration,
      delay: at,
      easing: ARRIVE,
      useNativeDriver: USE_NATIVE_DRIVER,
    })
    animation.start()

    const settle = setTimeout(
      () => displaced.setValue(0),
      at + duration + dashEntrance.backstop,
    )

    return () => {
      animation.stop()
      clearTimeout(settle)
    }
  }, [displaced, at, duration, run, cancelExit])

  /*
   * Leaving parks the element back where it started.
   *
   * This is what makes the replay a replay. `useEntranceRun` ticks in a focus
   * *effect*, which React runs after the frame has already been painted — so a
   * screen left settled shows one frame of itself finished before the entrance
   * pulls it back to the start, which is exactly the "it loads, then loads
   * again" a returning learner sees. Parked on the way out, the first frame of
   * every visit is the first frame of the entrance.
   *
   * Animated rather than snapped: a pushed screen slides over this one, so the
   * Dashboard is still visible underneath for the length of that transition,
   * and a scene that dissolves on the spot there reads as a glitch where one
   * that disassembles reads as depth. The backstop is the usual one — without
   * the native driver this runs on requestAnimationFrame, which a browser stops
   * dead for a hidden tab, and a half-parked element would come back mid-air.
   */
  useFocusEffect(
    useCallback(
      () => () => {
        const exit = Animated.timing(displaced, {
          toValue: 1,
          duration: dashEntrance.leave,
          easing: DEPART,
          useNativeDriver: USE_NATIVE_DRIVER,
        })
        exit.start()

        const parked = setTimeout(
          () => displaced.setValue(1),
          dashEntrance.leave + dashEntrance.backstop,
        )

        leaving.current = { exit, parked }
      },
      [displaced],
    ),
  )

  /* The exit outlives the focus effect that started it, so its timer is cleared
     here rather than there — a screen unmounted mid-exit would otherwise leak. */
  useEffect(() => cancelExit, [cancelExit])

  const offset = displaced.interpolate({
    inputRange: [0, 1],
    outputRange: [0, from === 'left' ? -distance : distance],
  })

  const opacity = displaced.interpolate({
    inputRange: [0, 1],
    outputRange: [toOpacity, 0],
  })

  const transform: NonNullable<ViewStyle['transform']> = [
    from === 'bottom' ? { translateY: offset } : { translateX: offset },
    ...(withScale
      ? [{ scale: displaced.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) }]
      : []),
    ...((extraTransform ?? []) as never[]),
  ] as never

  return { opacity, transform }
}

/**
 * A reveal around something in normal flow.
 *
 * Plain styles on the `Animated.View` with the children in a plain `View`
 * inside it — NativeWind drops `className` on an animated view entirely, so
 * anything Tailwind-styled has to sit one level in.
 */
export function Reveal({
  from,
  at,
  duration,
  run,
  distance,
  withScale,
  style,
  children,
}: {
  from: RevealFrom
  at: number
  duration: number
  run: number
  distance: number
  withScale?: boolean
  style?: StyleProp<ViewStyle>
  children: ReactNode
}) {
  const reveal = useReveal({ from, at, duration, run, distance, withScale })

  return (
    <Animated.View style={[style, reveal]}>
      <View>{children}</View>
    </Animated.View>
  )
}

/**
 * How much of Shifu's line has been spoken.
 *
 * Returns a character count that climbs from 0 to `total`. A count rather than a
 * string, so the caller can slice its own rich text — the due-word number is a
 * bold span inside the sentence, and typing a plain string would either lose the
 * emphasis or make it pop in at the end.
 *
 * The backstop matters more here than anywhere else in the scene: a browser
 * clamps timers in a background tab to about one a second, so a sixty-character
 * line left to its interval would take a full minute. Coming back to a sentence
 * still being typed out reads as the app having hung.
 */
export function useTypewriter(
  total: number,
  run: number,
  /**
   * When it starts and how fast it types. Defaults to the Dashboard's, which is
   * the pace Shifu speaks at there; the dictionary passes its own, because its
   * line is twice as long and at the Dashboard's pace the learner finishes
   * reading it long before he finishes saying it.
   */
  timing: { at: number; perChar: number } = dashEntrance.typing,
): number {
  const [count, setCount] = useState(0)
  const { at, perChar } = timing

  useEffect(() => {
    setCount(0)
    if (total <= 0) return

    let ticker: ReturnType<typeof setInterval> | null = null

    const begin = setTimeout(() => {
      let typed = 0
      ticker = setInterval(() => {
        typed += 1
        setCount(typed)
        if (typed >= total && ticker) {
          clearInterval(ticker)
          ticker = null
        }
      }, perChar)
    }, at)

    const settle = setTimeout(() => setCount(total), at + total * perChar + dashEntrance.backstop)

    return () => {
      clearTimeout(begin)
      clearTimeout(settle)
      if (ticker) clearInterval(ticker)
    }
  }, [total, run, at, perChar])

  /* Unspoken again on the way out, for the same reason every reveal parks
     itself: coming back to the finished sentence and watching it retype is the
     screen admitting it had already loaded. */
  useFocusEffect(useCallback(() => () => setCount(0), []))

  return count
}
