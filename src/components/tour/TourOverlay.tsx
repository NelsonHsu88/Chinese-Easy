import { useEffect, useRef } from 'react'
import { View, Text, Pressable, Animated, Easing, Platform, useWindowDimensions } from 'react-native'
import { router, usePathname } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useApp } from '../../context/AppContext'
import { TOUR_STEPS, hasTabBar, isGated } from '../../lib/tour'
import { dashColors as c, dashShadow } from '../dashboard/tokens'
import { Shifu } from '../onboarding/Shifu'
import { useTourCardHosted } from './cardHost'
import { tapHaptic, tickHaptic } from '../../lib/haptics'

/*
 * Shifu, walking a new learner around the app.
 *
 * **It sits beside the app, not over it.** The whole layer is `box-none`, so
 * every screen underneath stays live and the learner does the things Shifu is
 * describing — types in the real search box, taps the real Stroke order button.
 * A modal tour would have to fake all of that, and a learner who has only ever
 * seen the fake version has not actually been shown anything.
 *
 * `TourOverlay` is mounted once, above the navigator in the root layout, which
 * is what lets it survive the moves between screens the script asks for.
 * `TourCard` is the visible part on its own, exported because a React Native
 * `Modal` draws above *everything* — including this layer — so any sheet that
 * the tour talks about has to host its own copy or Shifu vanishes exactly when
 * he is mid-sentence. The steps themselves are data in `lib/tour.ts`.
 */

const USE_NATIVE_DRIVER = Platform.OS !== 'web'

/** Matches the tab bar's own `70 + Math.max(insets.bottom, 12)` in (tabs)/_layout. */
const TAB_BAR_BODY = 70

/**
 * The bubble and the mascot, with no opinion about where they sit.
 *
 * Renders nothing when no tour is running, so a host can mount it
 * unconditionally.
 */
export function TourCard() {
  const { tourStep, advanceTour, endTour } = useApp()
  const { width } = useWindowDimensions()

  const step = tourStep === null ? null : TOUR_STEPS[tourStep]

  const enter = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (step === null) return
    enter.setValue(0)
    const animation = Animated.timing(enter, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    })
    animation.start()
    /*
     * The standing backstop for every non-native animation in this app: without
     * the native driver this runs on requestAnimationFrame, which a browser
     * stops dead for a hidden tab, and Shifu would be parked at opacity 0 with
     * the tour apparently frozen.
     */
    const settle = setTimeout(() => enter.setValue(1), 340)
    return () => {
      animation.stop()
      clearTimeout(settle)
    }
  }, [tourStep, step, enter])

  if (step === null) return null

  const bubbleWidth = Math.min(width - 28, 320)
  const isLast = tourStep === TOUR_STEPS.length - 1
  /*
   * A step waiting on the learner offers no way past itself. The instruction is
   * the only thing on screen that moves the tour, which is the whole point — a
   * Next button beside "type water into the search box" makes not typing it the
   * quicker option, and then the tour has taught nothing.
   */
  const gated = isGated(step)

  return (
    /*
      Plain styles on the animated view and the Tailwind classes on a plain view
      inside it — NativeWind drops `className` on an `Animated.View` entirely,
      taking the radius, padding and background with it.
    */
    <Animated.View
      style={{
        alignItems: 'flex-end',
        opacity: enter,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
      }}
    >
      <View
        style={{
          width: bubbleWidth,
          backgroundColor: c.card,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 18,
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 12,
          ...dashShadow,
        }}
      >
        <Text className="font-nunito-semibold" style={{ fontSize: 14.5, lineHeight: 21, color: c.navy }}>
          {step.body}
        </Text>

        <View className="flex-row items-center justify-between" style={{ marginTop: 14 }}>
          <Pressable
            onPress={() => {
              tickHaptic()
              endTour()
            }}
            accessibilityRole="button"
            hitSlop={10}
            className="active:opacity-60"
          >
            <Text className="font-nunito-bold" style={{ fontSize: 13, color: c.textMuted }}>
              {isLast ? 'Close' : 'Skip tour'}
            </Text>
          </Pressable>

          <View className="flex-row items-center" style={{ gap: 12 }}>
            <Text className="font-nunito-semibold" style={{ fontSize: 12, color: c.textMuted }}>
              {(tourStep ?? 0) + 1} of {TOUR_STEPS.length}
            </Text>
            {!gated && (
              <Pressable
                onPress={() => {
                  tapHaptic()
                  advanceTour()
                }}
                accessibilityRole="button"
                className="items-center justify-center active:opacity-90"
                style={{ backgroundColor: c.green, borderRadius: 14, paddingHorizontal: 16, height: 34 }}
              >
                <Text className="font-nunito-extrabold text-white" style={{ fontSize: 13.5 }}>
                  {step.cta ?? 'Next'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/*
        Shifu tucks under the bubble's right edge, overlapping it slightly so the
        two read as one object rather than a picture with a notice above it. He
        is decoration here, so he takes no touches — the bubble is the only thing
        on this layer anyone needs to hit.
      */}
      <View pointerEvents="none" style={{ marginTop: -10, marginRight: 6 }}>
        <Shifu pose="wave" width={104} />
      </View>
    </Animated.View>
  )
}

export function TourOverlay() {
  const { tourStep, advanceTour } = useApp()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const hostedElsewhere = useTourCardHosted()

  const step = tourStep === null ? null : TOUR_STEPS[tourStep]

  /*
   * Take the learner to the section this step is about — once, as the step
   * begins. Deliberately not keyed on `pathname`: re-running it whenever the
   * route changes would drag anyone who wandered off straight back, and this is
   * a tour, not a cage.
   */
  useEffect(() => {
    if (!step?.goTo) return
    const target = String(step.goTo)
    if (pathname === target || pathname.startsWith(`${target}/`)) return
    router.push(step.goTo)
    // `pathname` is read but deliberately not a dependency — see above.
  }, [tourStep, step])

  /** Steps that ask for a move forward themselves, so Shifu keeps up. */
  useEffect(() => {
    if (step?.advanceOn?.(pathname)) advanceTour()
  }, [pathname, step, advanceTour])

  /*
   * One nudge as a step that wants something arrives — a tap on the wrist to
   * send the eye looking for the ring, not a metronome. Repeating it while the
   * learner works out what to do would be nagging, and the pulse is already
   * doing the pointing. Lives here rather than in `TourCard` because this
   * component is mounted exactly once; the card is not.
   */
  useEffect(() => {
    if (step?.highlight) tickHaptic()
  }, [tourStep, step])

  /*
   * Onboarding runs its own flow and has its own mascot; two Shifus arguing on
   * one screen is nobody's idea of a warm welcome.
   *
   * The same goes for the sheet steps, and that one was a real defect: a `Modal`
   * draws above this layer, so the Learn sheet hosts its own copy of the card —
   * and this one carried on drawing underneath it. The modal is transparent
   * above its panel, so both were visible, the card rising with the sheet and
   * the previous one still sitting at the bottom of the page. Standing down on
   * the *claim* rather than on `step.inSheet` is deliberate: those two steps
   * have a Next button, and hiding on the step alone would leave a learner who
   * dismissed the sheet with no card anywhere and no way forward.
   */
  if (step === null || hostedElsewhere || pathname.startsWith('/onboarding')) return null

  const barInset = Math.max(insets.bottom, 12)
  const bottom = (hasTabBar(pathname) ? TAB_BAR_BODY + barInset : barInset) + 14

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <View pointerEvents="box-none" style={{ position: 'absolute', right: 14, left: 14, bottom }}>
        <TourCard />
      </View>
    </View>
  )
}
