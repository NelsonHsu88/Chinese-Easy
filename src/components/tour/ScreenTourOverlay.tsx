import { useEffect, useRef, useState } from 'react'
import { useWindowDimensions } from 'react-native'
import { usePathname } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useApp } from '../../context/AppContext'
import { hasTabBar } from '../../lib/tour'
import { screenTourFor } from '../../lib/screenTours'
import type { Bounds } from '../../lib/tourPlacement'
import { tabBarHeight } from '../../lib/tabBar'
import { successHaptic } from '../../lib/haptics'
import { Spotlight } from './Spotlight'
import { Layer, PlacedTooltip } from './TourOverlay'
import { useReduceMotion } from './useReduceMotion'
import { useSettledTarget } from './useSettledTarget'
import { tourCard, tourSpot } from './tokens'

/*
 * Shifu's screen guides: the first time the learner opens Learn, Dictionary or
 * Settings, a short spotlit walk round it. The script is `lib/screenTours.ts`;
 * this draws it with the guided tour's own `Spotlight` and tooltip, so the two
 * are one voice.
 *
 * Mounted beside `TourOverlay` in the root layout, and simpler than it: every
 * step is read and moved on with Next, so there is no waiting on actions, no
 * navigation and no "continue" card. Leaving the screen (a hardware back, a
 * pushed prompt) just hides the guide; it is not marked seen until it is
 * finished or skipped, so it is there again on the next visit.
 *
 * The spotlight is closed (`holeOpen` false), so a learner reads a step rather
 * than tapping through it into the screen — and Skip is on every card.
 */

/**
 * A beat before measuring starts, so a learner tapping straight through a tab
 * doesn't trigger its guide. Kept short: waiting for the screen's entrance to
 * land is `useSettledTarget`'s job, and it knows when that has happened.
 */
const ARRIVAL_DELAY = 150

/**
 * How long a step's target may take to appear before the step is passed over.
 * Shorter than the tour's fallback: these targets are mounted with the screen,
 * so one that has not shown up by now is not on it at all.
 */
const TARGET_TIMEOUT = 1200

const SKIP_HINT = 'Closes this guide. You can see it again from Settings, General.'

export function ScreenTourOverlay() {
  const { tour, onboardingComplete, seenScreenTours, markScreenTourSeen } = useApp()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const { width: screenW, height: screenH } = useWindowDimensions()
  const reduceMotion = useReduceMotion()

  const guide = screenTourFor(pathname)
  const eligible =
    guide !== null &&
    onboardingComplete &&
    /* Never over the guided tour; it owns the screen while it runs. */
    tour.status !== 'in_progress' &&
    !seenScreenTours.includes(guide.id)

  const bounds: Bounds = {
    top: insets.top + 8,
    bottom: screenH - (hasTabBar(pathname) ? tabBarHeight(insets.bottom) : insets.bottom) - 10,
    width: screenW,
  }
  const boundsRef = useRef(bounds)
  boundsRef.current = bounds
  const cardWidth = Math.min(screenW - tourCard.margin * 2, tourCard.maxWidth)

  const [index, setIndex] = useState(0)
  const [ready, setReady] = useState(false)

  /* Every arrival on a guided screen starts the guide from its first step. */
  useEffect(() => {
    setIndex(0)
    setReady(false)
    if (!eligible) return
    const timer = setTimeout(() => setReady(true), ARRIVAL_DELAY)
    return () => clearTimeout(timer)
  }, [guide?.id, eligible])

  const step = ready && eligible && guide ? (guide.steps[index] ?? null) : null
  const count = guide?.steps.length ?? 0

  const finish = () => {
    if (guide) markScreenTourSeen(guide.id)
  }
  const advance = () => {
    if (index + 1 >= count) finish()
    else setIndex(index + 1)
  }

  /* The card waits for the target to stop sliding — see `useSettledTarget`. */
  const { spot, missing, cardReady } = useSettledTarget({
    targetId: step?.targetId,
    stepKey: step && guide ? `${guide.id}-${index}` : null,
    active: step !== null,
    boundsRef,
    timeout: TARGET_TIMEOUT,
    resetKey: pathname,
  })

  /* Not on this screen right now — pass the step over rather than describe
     something the learner cannot see. */
  const advanceRef = useRef(advance)
  advanceRef.current = advance
  useEffect(() => {
    if (missing) advanceRef.current()
  }, [missing])

  /* Nothing is dimmed until there is something to show in the dim. */
  if (!step || !spot) return null

  const padded = {
    x: spot.rect.x - tourSpot.padding,
    y: spot.rect.y - tourSpot.padding,
    width: spot.rect.width + tourSpot.padding * 2,
    height: spot.rect.height + tourSpot.padding * 2,
  }
  const last = index + 1 >= count

  return (
    <Layer>
      <Spotlight
        rect={padded}
        radius={spot.radius + tourSpot.padding}
        holeOpen={false}
        reduceMotion={reduceMotion}
      />
      {cardReady && (
      <PlacedTooltip
        key={`${guide?.id}-${index}`}
        target={padded}
        bounds={bounds}
        width={cardWidth}
        reduceMotion={reduceMotion}
        tooltip={{
          title: step.title,
          body: step.body,
          shifu: step.shifu,
          primaryLabel: last ? 'Got it' : 'Next',
          onPrimary: () => {
            if (last) successHaptic()
            advance()
          },
          secondaryLabel: 'Skip',
          secondaryHint: SKIP_HINT,
          onSecondary: finish,
          progress: { index, count },
          width: cardWidth,
        }}
      />
      )}
    </Layer>
  )
}
