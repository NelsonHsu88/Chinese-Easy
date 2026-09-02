import { nativeAds } from './nativeModule'
import { unitFor } from './adUnits'
import { canRequestAds } from './adManager'
import { trackAd } from './adEvents'

/*
 * Rewarded ads — the architecture, deliberately not yet wired into anything.
 *
 * Nothing in the app calls this today, and that is the point of building it
 * now: when a reward *is* offered, it drops into a manager that already exists
 * rather than causing the ad layer to be rewritten around it.
 *
 * ── Non-negotiables baked into the shape of this API ─────────────────────────
 *
 *  - **The learner asks; the app never offers unprompted.** `showRewarded` is
 *    only reachable from an explicit press. There is no preload-and-pounce path
 *    and no automatic trigger, because a rewarded ad the learner did not choose
 *    is just an interstitial with extra steps.
 *  - **Nothing core is ever behind one.** Suitable rewards are additive and
 *    optional: a small XP bonus, an extra challenge attempt. Vocabulary,
 *    reviews, stories, stroke practice and the dictionary are never gated —
 *    a learner who declines every advert must lose no learning whatsoever.
 *  - **The reward is granted on the SDK's earned callback**, never on the
 *    button press and never on dismissal, so a closed-early ad pays nothing.
 *
 * Preloading is on request rather than eager: a rewarded unit is worth fetching
 * only when a surface that offers one is actually on screen, which is what
 * `prepareRewarded` is for.
 */

export interface RewardEarned {
  type: string
  amount: number
}

type Rewarded = ReturnType<NonNullable<ReturnType<typeof nativeAds>>['RewardedAd']['createForAdRequest']>

let cached: Rewarded | null = null
let loading = false
let unsubscribe: (() => void) | null = null

function teardown(): void {
  unsubscribe?.()
  unsubscribe = null
  cached = null
  loading = false
}

/**
 * Warm a rewarded ad because a surface offering one is now visible.
 *
 * Call from a screen's focus effect, not at startup — see the note above.
 */
export function prepareRewarded(): void {
  const sdk = nativeAds()
  if (!sdk || loading || cached) return
  if (!canRequestAds()) return

  const unitId = unitFor('rewarded')
  if (!unitId) return

  loading = true
  const ad = sdk.RewardedAd.createForAdRequest(unitId)

  const offLoaded = ad.addAdEventListener(sdk.RewardedAdEventType.LOADED, () => {
    cached = ad
    loading = false
    trackAd('ad_rewarded_loaded')
  })
  const offError = ad.addAdEventListener(sdk.AdEventType.ERROR, (error: unknown) => {
    trackAd('ad_rewarded_failed', { message: String(error) })
    teardown()
  })

  unsubscribe = () => {
    offLoaded()
    offError()
  }

  try {
    ad.load()
  } catch (error) {
    if (__DEV__) console.info('[ads] rewarded load threw:', error)
    teardown()
  }
}

/** Whether an offer can honestly be shown to the learner right now. */
export function rewardedReady(): boolean {
  return cached !== null
}

/**
 * Show a rewarded ad the learner has explicitly asked for.
 *
 * Resolves with the reward when it is genuinely earned, or null for every other
 * outcome — not ready, failed, dismissed early. A null answer must leave the
 * learner exactly where they were, with nothing taken away.
 */
export async function showRewarded(): Promise<RewardEarned | null> {
  const sdk = nativeAds()
  if (!sdk || !cached) return null

  const ad = cached
  return new Promise<RewardEarned | null>((resolve) => {
    let settled = false
    const finish = (reward: RewardEarned | null) => {
      if (settled) return
      settled = true
      offEarned()
      offClosed()
      teardown()
      resolve(reward)
    }

    const offEarned = ad.addAdEventListener(sdk.RewardedAdEventType.EARNED_REWARD, (reward: RewardEarned) => {
      trackAd('ad_rewarded_completed', { type: reward?.type, amount: reward?.amount })
      finish(reward ?? null)
    })
    // Dismissal without the earned callback pays nothing, deliberately.
    const offClosed = ad.addAdEventListener(sdk.AdEventType.CLOSED, () => finish(null))

    try {
      trackAd('ad_rewarded_impression')
      void ad.show()
    } catch (error) {
      if (__DEV__) console.info('[ads] rewarded show failed:', error)
      finish(null)
    }
  })
}

/** Drop everything — used when a learner becomes ad-free mid-session. */
export function disposeRewarded(): void {
  teardown()
}
