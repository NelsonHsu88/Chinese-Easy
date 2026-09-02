import { useEffect, useRef, type ReactNode } from 'react'
import { View, Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native'
import { useApp } from '../../context/AppContext'
import { TOUR_STEPS, type TourHighlight } from '../../lib/tour'
import { dashColors as c } from '../dashboard/tokens'

/*
 * The ring Shifu puts around the thing he is talking about.
 *
 * A step that says "type water into the search box" has to say *which* search
 * box, and pointing with words alone asks the learner to go hunting on a screen
 * they have never seen. This draws a soft green ring around the real control and
 * breathes, so the instruction has somewhere to land.
 *
 * It is drawn *outside* the control rather than over it — `pointerEvents="none"`
 * and an absolute inset — because the whole point is that the learner presses
 * the actual button underneath.
 */

const USE_NATIVE_DRIVER = Platform.OS !== 'web'

/** Whether the tour is currently pointing at this control. */
export function useTourHighlight(target: TourHighlight): boolean {
  const { tourStep } = useApp()
  return tourStep !== null && TOUR_STEPS[tourStep]?.highlight === target
}

export function TourPulse({
  target,
  radius = 16,
  inset = 5,
  style,
  children,
}: {
  target: TourHighlight
  /** Corner radius of the ring. Match the control it is drawn around. */
  radius?: number
  /** How far outside the control the ring sits. */
  inset?: number
  /**
   * Layout for the wrapper. Needed wherever the wrapped control was itself
   * carrying the layout — a `flex: 1` button, for instance, whose parent is now
   * this view rather than the button.
   */
  style?: StyleProp<ViewStyle>
  children: ReactNode
}) {
  const active = useTourHighlight(target)
  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!active) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 850,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 850,
          easing: Easing.in(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [active, pulse])

  return (
    <View style={style}>
      {children}
      {active && (
        /*
         * No `setTimeout` backstop here, unlike every one-shot animation in the
         * app. A loop has no final value to be stranded short of, and the range
         * below starts at a perfectly visible 0.4 — so a browser that never
         * grants this a frame shows a steady ring instead of a pulsing one,
         * which still does the job.
         */
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: -inset,
            right: -inset,
            top: -inset,
            bottom: -inset,
            borderRadius: radius + inset,
            borderWidth: 2,
            borderColor: c.green,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
            transform: [
              { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.99, 1.03] }) },
            ],
          }}
        />
      )}
    </View>
  )
}
