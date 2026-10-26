import { useEffect, useRef, useState, type ComponentProps, type ReactNode, type RefObject } from 'react'
import {
  View,
  Text,
  Animated,
  Easing,
  Platform,
  AccessibilityInfo,
  findNodeHandle,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native'
import type { TextInstance } from 'react-native'
import { router, usePathname } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useApp } from '../../context/AppContext'
import {
  SAVED_TOAST,
  TOUR_STEPS,
  WELCOME_COPY,
  hasTabBar,
  tourStepById,
  type TourStep,
  type TourStepId,
} from '../../lib/tour'
import { placeTooltip, type Bounds } from '../../lib/tourPlacement'
import { tabBarHeight } from '../../lib/tabBar'
import { successHaptic } from '../../lib/haptics'
import { Spotlight } from './Spotlight'
import { activateTarget } from './targets'
import { TourTooltip } from './TourTooltip'
import { TourToast, toastLifetime } from './TourToast'
import { useReduceMotion } from './useReduceMotion'
import { useSettledTarget } from './useSettledTarget'
import { tourCard, tourMotion, tourSpot } from './tokens'

/*
 * Shifu's guided tour, mounted once above the navigator in the root layout so
 * it survives the moves between screens.
 *
 * It has four faces, and only ever shows one:
 *
 * 1. **The welcome prompt** — a small, non-blocking card over the Dashboard,
 *    once it has settled, asking whether the learner wants to be shown around.
 * 2. **A step** — the screen dimmed, the target cut out of the dim, a tooltip
 *    beside it. Taps outside the cut-out are swallowed; inside it, on a step
 *    that wants the real control pressed, they reach the control.
 * 3. **The saved-word toast** — after a word is added, before the tour moves
 *    the learner on to Review.
 * 4. **"Continue the tour"** — a non-blocking card when the learner has
 *    wandered off the step's screen. The tour never drags anyone back.
 *
 * The steps are data in `lib/tour.ts`; placement is arithmetic in
 * `lib/tourPlacement.ts`; the pieces it draws are siblings in this folder.
 *
 * **It must never leave the app unusable.** Every face that blocks touches
 * carries a way out ("Skip tour"), a step whose target cannot be found falls
 * back to a plain card with a button, and nothing is dimmed until there is
 * something to show in the dim.
 */

const USE_NATIVE_DRIVER = Platform.OS !== 'web'

/** How long the learner has to be off a step's screen before the "continue" card appears. */
const WANDER_GRACE = 700

/** How much a placed tooltip's height must change before it is re-placed. See `PlacedTooltip`. */
const HEIGHT_TOLERANCE = 2

const SKIP_HINT = 'Ends the tour. You can replay it from Settings, General.'

export function TourOverlay() {
  const { tour, onboardingComplete, startTour, endTour, advanceTour } = useApp()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const { width: screenW, height: screenH } = useWindowDimensions()
  const reduceMotion = useReduceMotion()

  const step = tour.status === 'in_progress' ? tourStepById(tour.step) : null
  const onScreen = step !== null && pathname === step.screen

  const bounds: Bounds = {
    top: insets.top + 8,
    bottom: screenH - (hasTabBar(pathname) ? tabBarHeight(insets.bottom) : insets.bottom) - 10,
    width: screenW,
  }
  const boundsRef = useRef(bounds)
  boundsRef.current = bounds
  const cardWidth = Math.min(screenW - tourCard.margin * 2, tourCard.maxWidth)

  const pathRef = useRef(pathname)
  pathRef.current = pathname

  // --- 1. The welcome prompt ---------------------------------------------------

  const welcomeEligible = tour.status === 'not_started' && onboardingComplete && pathname === '/'
  const [welcomeReady, setWelcomeReady] = useState(false)
  useEffect(() => {
    if (!welcomeEligible) {
      setWelcomeReady(false)
      return
    }
    /* After the Dashboard's own entrance has landed, not on top of it. */
    const timer = setTimeout(() => setWelcomeReady(true), tourMotion.welcomeDelay)
    return () => clearTimeout(timer)
  }, [welcomeEligible])

  // --- 3. The saved-word toast -------------------------------------------------

  const [celebrating, setCelebrating] = useState(false)
  const prevStep = useRef<TourStepId | null>(tour.step)
  /* Set by the fallback "Next" on Save, which moves on without a word saved. */
  const skippedSave = useRef(false)

  useEffect(() => {
    const prev = prevStep.current
    prevStep.current = tour.step
    if (tour.step !== 'review' || (prev !== 'save' && prev !== 'new-words')) return
    if (skippedSave.current) {
      skippedSave.current = false
      return
    }
    successHaptic()
    setCelebrating(true)
    const timer = setTimeout(() => setCelebrating(false), toastLifetime)
    /* Whatever ends the hold early — the tour skipped, a reset — ends the toast
       too; a stranded `celebrating` would hide every later step. */
    return () => {
      clearTimeout(timer)
      setCelebrating(false)
    }
  }, [tour.step])

  // --- Going to each step's screen ---------------------------------------------

  /*
   * Once, as a step begins (or once the toast has finished) — deliberately not
   * keyed on `pathname`, so a learner who wanders off is not dragged back.
   */
  const lastNavigatedFor = useRef<TourStepId | null>(null)
  useEffect(() => {
    if (!step || celebrating) return
    if (lastNavigatedFor.current === step.id) return
    lastNavigatedFor.current = step.id
    if (pathRef.current !== step.screen) goToScreen(step)
  }, [step?.id, celebrating])
  useEffect(() => {
    if (tour.status !== 'in_progress') lastNavigatedFor.current = null
  }, [tour.status])

  /* "Try New Words" is a real navigation; arriving there by any route finishes the step. */
  useEffect(() => {
    if (step?.id === 'new-words' && pathname === '/new-words') advanceTour('new-words')
  }, [step?.id, pathname, advanceTour])

  // --- 4. Wandered off ----------------------------------------------------------

  const [wandered, setWandered] = useState(false)
  useEffect(() => {
    setWandered(false)
    if (!step || onScreen || celebrating) return
    const timer = setTimeout(() => setWandered(true), WANDER_GRACE)
    return () => clearTimeout(timer)
  }, [step?.id, onScreen, celebrating])

  // --- 2. Measuring the target -------------------------------------------------

  /*
   * Measured live for as long as the step is up — the Dashboard's cards rise
   * into place as it arrives, a screen can scroll, a font can load late — but
   * the card only appears once the target has stopped moving, so it never
   * lands beside something still sliding in. See `useSettledTarget`.
   */
  const { spot, missing, cardReady } = useSettledTarget({
    targetId: step?.targetId,
    stepKey: step?.id ?? null,
    active: step !== null && onScreen && !celebrating,
    boundsRef,
    timeout: tourMotion.targetTimeout,
    resetKey: pathname,
  })

  // --- Actions -----------------------------------------------------------------

  const skip = () => endTour('dismissed')

  const primaryFor = (s: TourStep, fallback: boolean): { label: string; onPress: () => void } | null => {
    switch (s.id) {
      case 'home':
        return { label: s.primaryLabel ?? 'Next', onPress: () => advanceTour('home') }
      case 'new-words':
        return { label: s.primaryLabel ?? 'Next', onPress: () => router.push('/new-words') }
      case 'save':
        /* "Add word" presses the real Add for the learner — the card flies off
           and the step finishes on the screen's own report, exactly as a tap. */
        if (!fallback)
          return {
            label: s.primaryLabel ?? 'Add word',
            onPress: () => {
              if (activateTarget('new-words-add')) return
              skippedSave.current = true
              advanceTour('save')
            },
          }
        return {
          label: 'Next',
          onPress: () => {
            skippedSave.current = true
            advanceTour('save')
          },
        }
      case 'review':
        return {
          label: s.primaryLabel ?? 'Got it',
          onPress: () => {
            successHaptic()
            endTour('completed')
          },
        }
    }
  }

  // --- Render ------------------------------------------------------------------

  if (pathname.startsWith('/onboarding')) return null

  const floatingBottom = screenH - bounds.bottom

  if (welcomeReady && tour.status === 'not_started') {
    return (
      <Layer>
        <Floating
          id="welcome"
          announce={`${WELCOME_COPY.title} ${WELCOME_COPY.body}`}
          bottom={floatingBottom}
          width={cardWidth}
          screenW={screenW}
          reduceMotion={reduceMotion}
        >
          {(titleRef) => (
            <TourTooltip
              ref={titleRef}
              title={WELCOME_COPY.title}
              body={WELCOME_COPY.body}
              shifu="welcome"
              large
              primaryLabel={WELCOME_COPY.accept}
              onPrimary={startTour}
              secondaryLabel={WELCOME_COPY.decline}
              secondaryHint="Closes this. You can start the tour later from Settings, General."
              onSecondary={skip}
              width={cardWidth}
            />
          )}
        </Floating>
      </Layer>
    )
  }

  if (!step) return null

  if (celebrating) {
    return (
      <Layer>
        <View
          pointerEvents="none"
          style={{ position: 'absolute', bottom: floatingBottom, left: (screenW - cardWidth) / 2 }}
        >
          <TourToast text={SAVED_TOAST} width={cardWidth} reduceMotion={reduceMotion} />
        </View>
      </Layer>
    )
  }

  const progress = { index: TOUR_STEPS.findIndex((s) => s.id === step.id), count: TOUR_STEPS.length }

  if (!onScreen) {
    if (!wandered) return null
    return (
      <Layer>
        <Floating
          id={`away-${step.id}`}
          announce={`Tour paused. ${step.title}.`}
          bottom={floatingBottom}
          width={cardWidth}
          screenW={screenW}
          reduceMotion={reduceMotion}
        >
          {(titleRef) => (
            <TourTooltip
              ref={titleRef}
              title={step.title}
              body="Want to pick up where we left off?"
              shifu="thinking"
              primaryLabel="Continue tour"
              onPrimary={() => goToScreen(step)}
              secondaryLabel="Skip tour"
              secondaryHint={SKIP_HINT}
              onSecondary={skip}
              progress={progress}
              width={cardWidth}
            />
          )}
        </Floating>
      </Layer>
    )
  }

  /* Nothing is dimmed until there is something to show in the dim. */
  if (!spot && !missing) return null

  const padded = spot
    ? {
        x: spot.rect.x - tourSpot.padding,
        y: spot.rect.y - tourSpot.padding,
        width: spot.rect.width + tourSpot.padding * 2,
        height: spot.rect.height + tourSpot.padding * 2,
      }
    : null
  const primary = primaryFor(step, missing)

  return (
    <Layer>
      <Spotlight
        rect={padded}
        radius={(spot?.radius ?? 0) + tourSpot.padding}
        holeOpen={step.completion !== 'nextButton'}
        reduceMotion={reduceMotion}
      />
      {(cardReady || (missing && !spot)) && (
      <PlacedTooltip
        key={step.id}
        target={padded}
        bounds={bounds}
        width={cardWidth}
        reduceMotion={reduceMotion}
        tooltip={{
          title: step.title,
          body: step.body,
          shifu: step.shifu,
          primaryLabel: primary?.label,
          onPrimary: primary?.onPress,
          secondaryLabel: 'Skip tour',
          secondaryHint: SKIP_HINT,
          onSecondary: skip,
          progress,
          width: cardWidth,
        }}
      />
      )}
    </Layer>
  )
}

/** The route a step lives on. Back to the Dashboard is a pop where there is one to pop. */
function goToScreen(step: TourStep) {
  if (step.screen === '/') {
    router.navigate('/')
    return
  }
  router.push(step.screen)
}

/** The full-screen layer. Touches pass through anything it does not draw. */
export function Layer({ children }: { children: ReactNode }) {
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {children}
    </View>
  )
}

type TitleRef = RefObject<TextInstance | null>

/**
 * A card's arrival — a short fade and an 8pt rise, or a fade alone under
 * Reduce Motion — plus handing screen-reader focus to its title.
 */
function useArrival(id: string, reduceMotion: boolean, ready: boolean, announce: string) {
  const enter = useRef(new Animated.Value(0)).current
  const titleRef = useRef<TextInstance>(null)

  useEffect(() => {
    if (!ready) return
    enter.setValue(0)
    const anim = Animated.timing(enter, {
      toValue: 1,
      duration: tourMotion.card,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    })
    anim.start()
    const settle = setTimeout(() => enter.setValue(1), tourMotion.card + 80)

    /* Announce, then move focus to the title — so a screen-reader user hears
       the card and is standing on it, not left on whatever was underneath. */
    if (Platform.OS !== 'web') {
      AccessibilityInfo.announceForAccessibility(announce)
      const node = titleRef.current ? findNodeHandle(titleRef.current) : null
      if (node) setTimeout(() => AccessibilityInfo.setAccessibilityFocus(node), 250)
    }

    return () => {
      anim.stop()
      clearTimeout(settle)
    }
  }, [id, ready])

  const style = {
    opacity: enter,
    transform: reduceMotion
      ? []
      : [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [tourMotion.rise, 0] }) }],
  }
  return { style, titleRef }
}

/** A card pinned above the tab bar, blocking nothing around it. */
function Floating({
  id,
  announce,
  bottom,
  width,
  screenW,
  reduceMotion,
  children,
}: {
  id: string
  bottom: number
  width: number
  screenW: number
  reduceMotion: boolean
  announce: string
  children: (titleRef: TitleRef) => ReactNode
}) {
  const { style, titleRef } = useArrival(id, reduceMotion, true, announce)
  return (
    <Animated.View
      accessibilityViewIsModal={false}
      style={[{ position: 'absolute', bottom, left: (screenW - width) / 2, width }, style]}
    >
      {children(titleRef)}
    </Animated.View>
  )
}

/** A step's tooltip, measured once and then placed beside its target. */
export function PlacedTooltip({
  target,
  bounds,
  width,
  reduceMotion,
  tooltip,
}: {
  target: { x: number; y: number; width: number; height: number } | null
  bounds: Bounds
  width: number
  reduceMotion: boolean
  tooltip: ComponentProps<typeof TourTooltip>
}) {
  /*
   * The height is only taken up when it changes by more than a couple of
   * points. A card placed *above* its target is positioned by its own height,
   * and Android snaps each edge of a view to a physical pixel separately — so
   * moving the card by a fraction of a pixel changes its measured height by a
   * pixel, which moves it again, which changes the height again. Accepting
   * every reading kept that loop going for as long as the step was up: the
   * New Words step's card (the first one placed above) trembled continuously.
   * A real change in height — a font arriving late, text wrapping — is far
   * larger than the threshold.
   */
  const [height, setHeight] = useState(0)
  const onLayout = (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height)
    if (height === 0 || Math.abs(h - height) > HEIGHT_TOLERANCE) setHeight(h)
  }

  const placed = placeTooltip({
    target,
    card: { width, height },
    bounds,
    gap: tourCard.targetGap,
    margin: tourCard.margin,
  })
  /* Whole points, so the card never lands between two pixels to begin with. */
  placed.x = Math.round(placed.x)
  placed.y = Math.round(placed.y)

  const { style, titleRef } = useArrival(
    tooltip.title,
    reduceMotion,
    height > 0,
    `${tooltip.title}. ${tooltip.body}`,
  )

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        { position: 'absolute', left: placed.x, top: placed.y, width },
        /* Invisible until measured, so it never flashes in the wrong place. */
        height > 0 ? style : { opacity: 0 },
      ]}
    >
      <TourTooltip ref={titleRef} {...tooltip} />
    </Animated.View>
  )
}
