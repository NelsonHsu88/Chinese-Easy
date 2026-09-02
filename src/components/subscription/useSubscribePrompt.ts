import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { router, usePathname } from 'expo-router'
import { useApp } from '../../context/AppContext'

/*
 * The recurring ad-free offer.
 *
 * Every `PROMPT_INTERVAL` of *foreground* time the app raises the subscription
 * screen, and the learner closes it with the cross in the corner. That is the
 * behaviour that was asked for, so this implements it — but the conditions
 * below are not decoration, they are what keeps a repeating interruption from
 * doing real damage:
 *
 * - **Only while the app is in front.** The timer is cleared on background and
 *   restarted on return, so a phone left in a pocket does not queue up a stack
 *   of offers to fire the moment it is unlocked.
 * - **Never over onboarding**, and never before it is finished. A learner who
 *   has not yet seen the app cannot be asked to pay for part of it.
 * - **Never over itself.** If the screen is already open — raised by this, or
 *   opened deliberately from Settings — the timer does nothing and simply waits
 *   for the next tick.
 * - **Never once entitled.** The moment `isAdFree` is true this stops for good;
 *   an advert for something the learner has already bought is worse than an
 *   advert.
 * - **Never over a lesson or a review.** Interrupting somebody mid-answer costs
 *   them the answer, and the subscription removes ads — it does not gate
 *   learning, so it has no business standing in front of it.
 *
 * The clock restarts from the moment the screen is closed rather than running
 * underneath it, so closing an offer always buys the full interval of quiet.
 */

/** Five minutes of foreground time between offers. */
const PROMPT_INTERVAL = 5 * 60 * 1000

/**
 * Routes that must never be interrupted.
 *
 * Everything here is either the learner mid-task or a screen where an offer
 * would be actively harmful. Prefix matches, so `/lesson/3` is covered by
 * `/lesson`.
 */
const PROTECTED_ROUTES = [
  '/onboarding',
  '/review-session',
  '/lesson',
  '/story',
  '/subscribe',
]

/** How often the conditions are re-checked. The interval above is the real clock. */
const TICK = 15 * 1000

export function useSubscribePrompt(): void {
  const { ready, isAdFree, onboardingComplete } = useApp()
  const pathname = usePathname()

  /*
   * The route is read through a ref rather than a dependency, so navigating
   * neither restarts the countdown nor rebuilds the timer. A learner moving
   * between screens every couple of minutes would otherwise never reach the
   * interval at all.
   */
  const path = useRef(pathname)
  path.current = pathname

  /* When the last offer was shown. Time is measured against this rather than
     counted by the interval, so a tick the phone slept through costs nothing
     and cannot fire twice in a row on waking. */
  const lastShown = useRef(Date.now())

  useEffect(() => {
    if (!ready || isAdFree || !onboardingComplete) return

    let timer: ReturnType<typeof setInterval> | null = null

    const tick = () => {
      const onSubscribe = path.current === '/subscribe'
      /*
       * While the screen is open the clock is held at "now", which is what
       * makes closing it buy a full interval of quiet rather than however much
       * of one happened to be left.
       */
      if (onSubscribe) {
        lastShown.current = Date.now()
        return
      }
      const busy = PROTECTED_ROUTES.some(
        (route) => path.current === route || path.current.startsWith(`${route}/`),
      )
      if (busy) return
      if (Date.now() - lastShown.current < PROMPT_INTERVAL) return
      lastShown.current = Date.now()
      router.push('/subscribe?prompt=1')
    }

    const start = () => {
      if (!timer) timer = setInterval(tick, TICK)
    }
    const stop = () => {
      if (timer) clearInterval(timer)
      timer = null
    }

    start()
    /* Foreground time only. A phone in a pocket is not being interrupted, and
       the elapsed check above would otherwise fire the instant it woke. */
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        lastShown.current = Date.now()
        start()
      } else {
        stop()
      }
    })

    return () => {
      stop()
      subscription.remove()
    }
  }, [ready, isAdFree, onboardingComplete])
}
