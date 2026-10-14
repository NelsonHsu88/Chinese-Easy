import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { Animated, Easing, type StyleProp, type ViewProps, type ViewStyle } from 'react-native'

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
 * This runs a second, always-JS-driven value that starts with the surrounding
 * reveal, and lets a card's shadow ramp against *that* instead — genuinely
 * interpolated, frame by frame, rather than inheriting whatever cadence
 * Android happens to recompute elevation on. It runs on its own slower curve
 * (`SHADOW_EASING`, below), not the reveal's.
 */

const ShadowRevealContext = createContext<Animated.Value | null>(null)

/** Provided by an entrance wrapper (see `Dictionary.tsx`'s `FadeSection`,
    `dashboard/entrance.tsx`'s `Reveal`) so every card inside picks up the same
    shadow ramp without each one owning its own animation. */
export const ShadowRevealProvider = ShadowRevealContext.Provider

/*
 * Every shadow in the app arrives on this one curve, and deliberately *after*
 * its card. The card lands on its own timing; the shadow starts with it but
 * creeps in over `SHADOW_STRETCH` times as long, on a slow-in / slow-out
 * bezier, so it reads as the surface settling onto the page rather than being
 * switched on. Shared so a card on the Dashboard and one in Settings settle
 * identically — change the feel here, not per screen.
 */
export const SHADOW_EASING = Easing.bezier(0.65, 0, 0.35, 1)
const SHADOW_STRETCH = 2.5
const SHADOW_MIN_DURATION = 900

/** How long a shadow takes to arrive under a card that arrives in `duration`. */
export function shadowDuration(duration: number): number {
  return Math.max(SHADOW_MIN_DURATION, duration * SHADOW_STRETCH)
}

/**
 * A 0→1 value for a `ShadowRevealProvider`, starting with the reveal it sits
 * alongside (same delay, replayed on the same `run`) but ramping over
 * `shadowDuration(duration)` on `SHADOW_EASING`.
 */
export function useShadowReveal({
  at = 0,
  duration: cardDuration,
  run,
  /** True to skip the ramp and sit at full strength immediately — a screen's
      very first section has nothing to catch up to (see `Dictionary.tsx`). */
  settled = false,
}: {
  at?: number
  /** The duration of the card's own reveal; the shadow's is derived from it. */
  duration: number
  run: number
  settled?: boolean
}): Animated.Value {
  const duration = shadowDuration(cardDuration)
  const easing = SHADOW_EASING
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
 * A card surface whose shadow arrives with its entrance — the drop-in for a
 * `View` that spreads a fixed shadow token into its style.
 *
 * **Any raised surface inside an entrance that fades must be one of these (or
 * read `useRevealedShadow` itself).** On Android a parent's fading `opacity`
 * is not applied to its children's `elevation` shadows, so a card spreading a
 * fixed shadow inside a fade showed its full-strength shadow and outline
 * first, with the card fading in on top a moment later. Here `elevation`
 * starts at zero and settles in behind the card instead. Outside any entrance
 * (no `ShadowRevealProvider` above) it is simply the resting shadow.
 *
 * An `Animated.View`, so NativeWind's `className` does not apply — give it
 * plain `style`, and keep Tailwind-styled content one level in.
 */
export function ShadowSurface({
  shadow,
  style,
  children,
  ...rest
}: Omit<ViewProps, 'style'> & {
  shadow: { shadowOpacity: number; elevation: number } & ViewStyle
  style?: StyleProp<ViewStyle>
  children?: ReactNode
}) {
  const revealed = useRevealedShadow(shadow)
  return (
    <Animated.View {...rest} style={[style, revealed]}>
      {children}
    </Animated.View>
  )
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
  children,
}: {
  at?: number
  duration: number
  run: number
  children: ReactNode
}) {
  const progress = useShadowReveal({ at, duration, run })
  return <ShadowRevealProvider value={progress}>{children}</ShadowRevealProvider>
}
