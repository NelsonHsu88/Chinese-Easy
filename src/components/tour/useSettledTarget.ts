import { useEffect, useRef, useState, type RefObject } from 'react'
import { scrollToReveal, type Bounds } from '../../lib/tourPlacement'
import type { TourTargetId } from '../../lib/tour'
import { measureTarget, scrollTargetBy, type MeasuredTarget } from './targets'
import { tourMotion } from './tokens'

/*
 * Where a step's target is — but only once it has **stopped moving**.
 *
 * Every screen the tour and the screen guides visit arrives on an animation:
 * the Dashboard's cards rise, Settings rises from below, a step may scroll its
 * screen to bring a target into view. Showing the card as soon as the target
 * could be measured put it beside a target still sliding into place, and the
 * two arrived at different speeds — the card landed, then the thing it pointed
 * at slid out from under it. So the target is measured on a short interval and
 * only reported once its rect has held still for `SETTLE_MS`; the card follows
 * a beat later (`cardReady`), once the spotlight has had time to morph onto
 * it. After that the spotlight keeps following the target as before.
 *
 * Until a step's target settles, the previous step's spotlight stays where it
 * was and no card is shown — nothing points at a place the target has not
 * reached yet. The exception is a step that has to scroll its screen: there the
 * spotlight is dropped for the scroll and comes back once the target is still.
 */

/** How long a target's rect must hold still to count as arrived. */
const SETTLE_MS = 200
/** Measuring interval while waiting for it to settle — fast, so settling is noticed promptly. */
const SETTLE_POLL = 80
/** How many times a step may scroll its screen to reveal the target. */
const MAX_SCROLLS = 2
/**
 * How long to leave a scroll alone before measuring again. A screen's scroll
 * offset is tracked from its `onScroll` events, and mid-scroll that offset is
 * stale — measuring then and asking for the "rest" of the scroll sent the page
 * to a different place than the first request, so it jerked down and back up
 * (the Dashboard's word card shook on a phone) and came to rest short, with the
 * card half under the tab bar. Waiting out the scroll makes every request
 * start from where the page really is.
 */
const SCROLL_WAIT = 450
/**
 * How far a settled target has to move before the spotlight and card follow it.
 * Android's `measureInWindow` rounds each edge to a physical pixel separately,
 * so a target that is not moving at all — especially one in a ScrollView that
 * has just stopped on a fractional offset — reads back up to a pixel or two
 * different from one measure to the next. Followed at the settling tolerance,
 * that flicker moved the spotlight and its card up and down by a point every
 * remeasure: the New Words step's card visibly trembled on a phone. A real move
 * (a card collapsing, a font loading late) is far larger than this.
 */
const FOLLOW_TOLERANCE = 3

export function sameTarget(a: MeasuredTarget, b: MeasuredTarget, tolerance = 0.75): boolean {
  const close = (p: number, q: number) => Math.abs(p - q) < tolerance
  return (
    close(a.rect.x, b.rect.x) &&
    close(a.rect.y, b.rect.y) &&
    close(a.rect.width, b.rect.width) &&
    close(a.rect.height, b.rect.height) &&
    a.radius === b.radius
  )
}

export function useSettledTarget({
  targetId,
  stepKey,
  active,
  boundsRef,
  timeout,
  resetKey,
}: {
  /** Undefined for a step with nothing to point at — reported missing at once. */
  targetId: TourTargetId | undefined
  /** Identifies the step; the card is gated afresh for each one. */
  stepKey: string | null
  /** False while the step should not be measured at all (another face is up). */
  active: boolean
  boundsRef: RefObject<Bounds>
  /** How long a target may stay unmeasurable before it is reported missing. */
  timeout: number
  /** A change here (a new screen) drops the spotlight: a rect from elsewhere means nothing. */
  resetKey: string
}) {
  const [spot, setSpot] = useState<MeasuredTarget | null>(null)
  const [missing, setMissing] = useState(false)
  const [cardFor, setCardFor] = useState<string | null>(null)

  useEffect(() => {
    setSpot(null)
    setCardFor(null)
  }, [resetKey])

  /* Whether a spotlight is already up, read from inside the polling loop. */
  const spotShown = useRef(false)
  spotShown.current = spot !== null

  const boundsSource = useRef(boundsRef)
  boundsSource.current = boundsRef

  useEffect(() => {
    setMissing(false)
    if (!active || stepKey === null) return
    if (!targetId) {
      setSpot(null)
      setMissing(true)
      return
    }

    let alive = true
    const started = Date.now()
    let scrolls = 0
    let last: MeasuredTarget | null = null
    let stableSince = 0
    let settled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let cardTimer: ReturnType<typeof setTimeout> | undefined

    const schedule = (delay = settled ? tourMotion.remeasure : SETTLE_POLL) => {
      if (alive) timer = setTimeout(() => void tick(), delay)
    }

    const tick = async () => {
      const measured = await measureTarget(targetId)
      if (!alive) return
      const now = Date.now()

      if (!measured) {
        last = null
        if (!settled && now - started > timeout) {
          /* The last step's spotlight would be pointing at the wrong thing. */
          setSpot(null)
          setMissing(true)
        }
        schedule()
        return
      }

      if (scrolls < MAX_SCROLLS) {
        const dy = scrollToReveal(measured.rect, boundsSource.current.current, 24)
        if (Math.abs(dy) > 2 && scrollTargetBy(targetId, dy)) {
          scrolls += 1
          /*
           * The scroll is itself a slide; wait it out like any other. The
           * spotlight goes dark for it rather than staying on the last target
           * while the page moves under it and then reshaping — it comes back,
           * placed rather than morphed, once the target has settled.
           */
          last = null
          settled = false
          clearTimeout(cardTimer)
          setSpot(null)
          setCardFor(null)
          schedule(SCROLL_WAIT)
          return
        }
      }

      if (!last || !sameTarget(last, measured, settled ? FOLLOW_TOLERANCE : 0.75)) {
        last = measured
        stableSince = now
      }

      if (!settled) {
        if (now - stableSince >= SETTLE_MS) {
          settled = true
          setMissing(false)
          /* The spotlight gets there first and the card follows: after the
             morph when it is moving from another target, after just the dim's
             fade when it is appearing from nothing. */
          const lead = spotShown.current ? tourMotion.morph : tourMotion.backdrop
          setSpot(measured)
          cardTimer = setTimeout(() => {
            if (alive) setCardFor(stepKey)
          }, lead)
        }
      } else {
        setSpot((prev) => (prev && sameTarget(prev, measured, FOLLOW_TOLERANCE) ? prev : measured))
      }
      schedule()
    }

    void tick()
    return () => {
      alive = false
      clearTimeout(timer)
      clearTimeout(cardTimer)
    }
  }, [targetId, stepKey, active, timeout])

  return { spot, missing, cardReady: spot !== null && cardFor === stepKey }
}
