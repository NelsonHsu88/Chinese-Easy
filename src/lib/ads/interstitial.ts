import { nativeAds } from './nativeModule'
import { unitFor } from './adUnits'
import { canRequestAds, startAds } from './adManager'
import { INTERSTITIAL_TRIGGERS, TIMING, type InterstitialTrigger } from './adConfig'
import { mayShowInterstitial, noteInterstitialShown, noteSuppressed } from './frequency'
import { trackAd } from './adEvents'
import { devNow } from '../devClock'

/*
 * Interstitials, behind one gate.
 *
 * A screen's entire involvement is `maybeShowInterstitial('review-session-complete')`
 * at a point where the learner has finished something. It cannot force an
 * advert, cannot know the caps, and does not await anything that would delay
 * what it does next — the call resolves to a boolean nobody is required to use.
 *
 * ── Rules encoded here ───────────────────────────────────────────────────────
 *
 *  - **Never blocks.** If nothing is cached, the answer is "no advert", not
 *    "wait while I fetch one". A learner at a completion screen staring at a
 *    spinner is worse than a missed impression.
 *  - **Never shows a stale ad.** Google expires cached interstitials after about
 *    an hour; showing one past that is a wasted impression and a black screen.
 *  - **Preloads late and once.** Nothing is fetched at startup — the first
 *    preload happens `interstitialPreloadDelayMs` after the app is interactive,
 *    and only for learners who might actually see one.
 */

type Interstitial = ReturnType<NonNullable<ReturnType<typeof nativeAds>>['InterstitialAd']['createForAdRequest']>

let cached: Interstitial | null = null
let loadedAt: number | null = null
let loading = false
let unsubscribe: (() => void) | null = null

function isStale(): boolean {
  if (loadedAt === null) return true
  return devNow().getTime() - loadedAt > TIMING.interstitialStaleAfterMs
}

function teardown(): void {
  unsubscribe?.()
  unsubscribe = null
  cached = null
  loadedAt = null
}

/**
 * Fetch one into the cache if there is room for it.
 *
 * Safe and cheap to call repeatedly — it returns immediately when an ad is
 * already cached, already loading, or cannot be requested at all.
 */
export function preloadInterstitial(): void {
  const sdk = nativeAds()
  if (!sdk || loading || (cached && !isStale())) return
  if (!canRequestAds()) return

  const unitId = unitFor('interstitial')
  if (!unitId) return

  if (isStale()) teardown()

  loading = true
  const ad = sdk.InterstitialAd.createForAdRequest(unitId)

  const offLoaded = ad.addAdEventListener(sdk.AdEventType.LOADED, () => {
    cached = ad
    loadedAt = devNow().getTime()
    loading = false
    trackAd('ad_interstitial_loaded')
  })
  const offError = ad.addAdEventListener(sdk.AdEventType.ERROR, (error: unknown) => {
    loading = false
    teardown()
    trackAd('ad_interstitial_failed', { message: String(error) })
  })
  const offClosed = ad.addAdEventListener(sdk.AdEventType.CLOSED, () => {
    trackAd('ad_interstitial_dismissed')
    // An interstitial is single-use: drop it and warm the next one, so the
    // following natural break isn't the one that has to wait for a fetch.
    teardown()
    preloadInterstitial()
  })

  unsubscribe = () => {
    offLoaded()
    offError()
    offClosed()
  }

  try {
    ad.load()
  } catch (error) {
    loading = false
    teardown()
    if (__DEV__) console.info('[ads] interstitial load threw:', error)
  }
}

/** Warm the cache a while after the app settles. Called once, by the provider. */
export function scheduleInterstitialPreload(): () => void {
  const timer = setTimeout(() => {
    void startAds().then((runtime) => {
      if (runtime.ready) preloadInterstitial()
    })
  }, TIMING.interstitialPreloadDelayMs)
  return () => clearTimeout(timer)
}

/**
 * Show an interstitial if — and only if — every cap allows it and one is ready.
 *
 * Resolves `false` far more often than `true`, by design. Callers should treat
 * the result as information, never as something to branch their navigation on.
 */
export async function maybeShowInterstitial(trigger: InterstitialTrigger): Promise<boolean> {
  if (!INTERSTITIAL_TRIGGERS[trigger]?.enabled) return false

  const sdk = nativeAds()
  if (!sdk) return false

  const verdict = await mayShowInterstitial()
  if (!verdict.allowed) {
    if (verdict.reason) noteSuppressed(verdict.reason, trigger)
    // Still worth warming one for next time.
    preloadInterstitial()
    return false
  }

  if (!cached || isStale()) {
    // Nothing ready: skip rather than stall, and prepare for the next break.
    preloadInterstitial()
    return false
  }

  try {
    await cached.show()
    await noteInterstitialShown()
    trackAd('ad_interstitial_impression', { trigger })
    return true
  } catch (error) {
    if (__DEV__) console.info('[ads] interstitial show failed:', error)
    teardown()
    return false
  }
}

/** Drop everything — used when a learner becomes ad-free mid-session. */
export function disposeInterstitial(): void {
  teardown()
  loading = false
}
