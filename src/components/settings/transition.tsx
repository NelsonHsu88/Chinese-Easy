import { createContext, useCallback, useContext, useEffect, useRef } from 'react'
import { Animated, Easing, Platform } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { setTransition } from './tokens'

/*
 * The Settings ⇄ category transition.
 *
 * One screen's content eases down out of the way while the next eases up into
 * its place, both against a page background that never moves. Every screen in
 * this group arrives from *below* and leaves downwards — forward and back
 * alike — so the movement always reads as the page being re-laid rather than as
 * a direction of travel through a hierarchy. The curves are paired rather than
 * shared: the departing screen accelerates away (ease-in) and the arriving one
 * decelerates into place (ease-out), which is what makes two separate
 * animations read as one continuous movement instead of as a cut between them.
 *
 * React Native's own `Animated`, not Reanimated: Reanimated's update loop does
 * not drive on this project's web target, so an animated style there evaluates
 * once and never changes — an entering screen would simply sit off-page at
 * opacity 0 forever.
 */

const USE_NATIVE_DRIVER = Platform.OS !== 'web'

/** Accelerating away. The screen is being left, so it need not be followed. */
const DEPART = Easing.in(Easing.cubic)

/** Decelerating into place. The screen is arriving, so the eye has to land on it. */
const ARRIVE = Easing.out(Easing.cubic)

/**
 * Drives one screen's half of the transition.
 *
 * Returns the style to put on the content wrapper, and `leave` — which plays
 * the exit and *then* navigates. That ordering is the whole trick: pushing
 * first would mount the next screen on top of an animation nobody ever sees.
 */
export function useScreenTransition() {
  const travel = setTransition.rise

  /* 0 = resting; 1 = displaced below the page and transparent. */
  const displaced = useRef(new Animated.Value(1)).current

  /* Guards a second tap landing mid-exit, which would otherwise push twice. */
  const leaving = useRef(false)

  /*
   * Whether arrival has ever run. The rest state is "displaced", so that a
   * screen is never painted in place for a frame before jumping off it — but
   * that makes the focus effect load-bearing: if it did not fire, the screen
   * would stay invisible with nothing to recover it. This is the recovery.
   */
  const arrived = useRef(false)

  useEffect(() => {
    const rescue = setTimeout(() => {
      if (!arrived.current) displaced.setValue(0)
    }, setTransition.in + setTransition.backstop)
    return () => clearTimeout(rescue)
  }, [displaced])

  /*
   * Arrival runs on *focus*, not on mount, and the difference matters: a
   * category screen is pushed on top of Settings rather than replacing it, so
   * Settings stays mounted underneath with its content still parked off to the
   * left at opacity 0. Without this it would come back from a Back press
   * invisible.
   */
  useFocusEffect(
    useCallback(() => {
      leaving.current = false
      arrived.current = true
      displaced.setValue(1)

      const animation = Animated.timing(displaced, {
        toValue: 0,
        duration: setTransition.in,
        easing: ARRIVE,
        useNativeDriver: USE_NATIVE_DRIVER,
      })
      animation.start()

      const settle = setTimeout(() => displaced.setValue(0), setTransition.in + setTransition.backstop)

      return () => {
        animation.stop()
        clearTimeout(settle)
        /*
         * Parked below again on the way out, so the rest state stays the rest
         * state. Leaving through `leave` already ends here, but a tab press
         * does not go through `leave` at all — and a screen left settled paints
         * one frame of itself finished on the next visit before this effect
         * pulls it back to the start, which reads as the screen loading twice.
         * Safe to snap rather than animate: nothing that skips `leave` is a
         * transition anyone watches.
         */
        displaced.setValue(1)
      }
    }, [displaced]),
  )

  const leave = useCallback(
    (go: () => void) => {
      if (leaving.current) return
      leaving.current = true

      let settle: ReturnType<typeof setTimeout> | null = null

      /* Idempotent: whichever of the callback and the backstop gets here first
         navigates, and the other finds the flag already cleared. */
      const depart = () => {
        if (!leaving.current) return
        leaving.current = false
        if (settle) clearTimeout(settle)
        go()
      }

      const animation = Animated.timing(displaced, {
        toValue: 1,
        duration: setTransition.out,
        easing: DEPART,
        useNativeDriver: USE_NATIVE_DRIVER,
      })
      animation.start(({ finished }) => {
        if (finished) depart()
      })

      settle = setTimeout(depart, setTransition.out + setTransition.backstop)
    },
    [displaced],
  )

  /* Positive is down: the resting screen is at 0, and both the screen being
     left and the one not yet arrived sit `travel` points below it. */
  const translateY = displaced.interpolate({
    inputRange: [0, 1],
    outputRange: [0, travel],
  })

  /*
   * The fade is shaped rather than linear, and asymmetrically so.
   *
   * Leaving, it is held back — at 40% of the way out the content is still at
   * 0.85, so the movement leads and the screen visibly goes somewhere instead
   * of dissolving on the spot. Arriving, it runs ahead: readable by 60% of the
   * way in, with the last of the rise happening under text you can already
   * read. That asymmetry is most of why this feels like one surface settling
   * rather than two screens swapping.
   */
  const opacity = displaced.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 0.85, 0],
  })

  return { style: { opacity, transform: [{ translateY }] }, leave }
}

/**
 * `leave`, handed down to anything nested inside a screen shell.
 *
 * A category screen can itself lead somewhere — General has a Developer row —
 * and that link has to play the same exit as the row that opened General in the
 * first place. The shell owns the animation, so the link reaches it through
 * here rather than every screen threading a callback down by hand.
 *
 * The fallback navigates without animating rather than throwing, so a component
 * rendered outside a shell still works.
 */
const LeaveContext = createContext<((go: () => void) => void) | null>(null)

export const LeaveProvider = LeaveContext.Provider

export function useLeave(): (go: () => void) => void {
  const leave = useContext(LeaveContext)
  return leave ?? ((go: () => void) => go())
}
