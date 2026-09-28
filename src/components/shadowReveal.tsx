import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { Animated, Easing } from 'react-native'

/*
 * A card's shadow, ramping in rather than snapping on mid-reveal.
 *
 * Every shadow token in this app (`DICT_CARD_SHADOW`, `dashShadow`, ...) is a
 * fixed `shadowOpacity`/`elevation` pair — right for a card at rest, wrong for
 * one still arriving. Neither property can ride the native driver, so it can't
 * simply interpolate off the same value an entrance's opacity/transform
 * already animates on the UI thread: Android draws `elevation` from a view's
 * own outline on its own schedule, independent of that native-driven value,
 * which is what made a card's shadow appear to snap on abruptly partway
 * through an otherwise-smooth fade instead of growing in with it.
 *
 * This runs a second, always-JS-driven value on the same timing and curve as
 * the surrounding reveal, and lets a card's shadow ramp against *that* instead
 * — genuinely interpolated, frame by frame, rather than inheriting whatever
 * cadence Android happens to recompute elevation on.
 */

const ShadowRevealContext = createContext<Animated.Value | null>(null)

/** Provided by an entrance wrapper (see `Dictionary.tsx`'s `FadeSection`,
    `dashboard/entrance.tsx`'s `Reveal`) so every card inside picks up the same
    shadow ramp without each one owning its own animation. */
export const ShadowRevealProvider = ShadowRevealContext.Provider

/** The "standard" curve this app's entrances already fade content on. */
const DEFAULT_EASING = Easing.bezier(0.4, 0, 0.2, 1)

/**
 * A 0→1 value for a `ShadowRevealProvider`, timed exactly like the reveal it
 * sits alongside: same delay, same duration, replayed on the same `run`.
 */
export function useShadowReveal({
  at = 0,
  duration,
  run,
  easing = DEFAULT_EASING,
  /** True to skip the ramp and sit at full strength immediately — a screen's
      very first section has nothing to catch up to (see `Dictionary.tsx`). */
  settled = false,
}: {
  at?: number
  duration: number
  run: number
  easing?: (value: number) => number
  settled?: boolean
}): Animated.Value {
  const progress = useRef(new Animated.Value(settled ? 1 : 0)).current

  useEffect(() => {
    if (settled) return
    progress.setValue(0)
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay: at,
      easing,
      useNativeDriver: false, // elevation/shadowOpacity can't ride the native driver
    })
    animation.start()
    // Backstop, matching every other one-shot animation in the app: without
    // the native driver this runs on requestAnimationFrame, which a
    // backgrounded tab stalls, so this forces the resting value once the
    // animation should long since have finished.
    const settle = setTimeout(() => progress.setValue(1), at + duration + 80)
    return () => {
      animation.stop()
      clearTimeout(settle)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, settled])

  return progress
}

type Revealed<T> = T & {
  shadowOpacity: number | Animated.AnimatedInterpolation<number>
  elevation: number | Animated.AnimatedInterpolation<number>
}

/** `shadow`, interpolated against `progress` from nothing up to its own resting values. */
export function revealedShadow<T extends { shadowOpacity: number; elevation: number }>(
  shadow: T,
  progress: Animated.Value | Animated.AnimatedInterpolation<number>,
): Revealed<T> {
  return {
    ...shadow,
    shadowOpacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, shadow.shadowOpacity] }),
    elevation: progress.interpolate({ inputRange: [0, 1], outputRange: [0, shadow.elevation] }),
  }
}

/**
 * A card's shadow, ramping in with the nearest `ShadowRevealProvider` — or at
 * full, resting strength immediately if there is none above it, which is the
 * ordinary case for a card shown outside any entrance.
 */
export function useRevealedShadow<T extends { shadowOpacity: number; elevation: number }>(shadow: T): Revealed<T> | T {
  const progress = useContext(ShadowRevealContext)
  return progress ? revealedShadow(shadow, progress) : shadow
}

/**
 * Runs its own shadow-reveal value on `at`/`duration`/`run` and provides it to
 * everything inside — for a piece that arrives on its own stagger rather than
 * with the rest of a shared section (the Dashboard's speech bubble, which has
 * no `ShadowRevealProvider` above it because it isn't wrapped in `Reveal`).
 */
export function ShadowReveal({
  at,
  duration,
  run,
  easing,
  children,
}: {
  at?: number
  duration: number
  run: number
  easing?: (value: number) => number
  children: ReactNode
}) {
  const progress = useShadowReveal({ at, duration, run, easing })
  return <ShadowRevealProvider value={progress}>{children}</ShadowRevealProvider>
}
