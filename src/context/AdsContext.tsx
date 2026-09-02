import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useApp } from './AppContext'
import {
  adsSupported,
  startAds,
  resetAds,
  scheduleInterstitialPreload,
  maybeShowInterstitial,
  disposeInterstitial,
  disposeRewarded,
  noteSessionComplete,
  type InterstitialTrigger,
} from '../lib/ads'

/*
 * One answer to "should this learner see an advert?", for the whole app.
 *
 * ── It has no premium state of its own ───────────────────────────────────────
 * `isAdFree` already exists in `AppContext` and is documented there as the
 * single source of truth, precisely so that two surfaces can never disagree
 * about whether somebody has paid. This provider *reads* it and derives from it;
 * it does not store, cache or mirror it. That is also what makes removing ads
 * on purchase free: `isAdFree` is React state, so the banners unmount on the
 * next render with no restart and no event plumbing.
 *
 * ── What a paying learner costs us ───────────────────────────────────────────
 * Nothing. When `isAdFree` is true the SDK is never initialised, no consent
 * form is raised, no interstitial is preloaded, no rewarded ad is fetched, and
 * `AppBannerAd` returns null before it touches the ad module. The ad layer is
 * not merely hidden for them, it never starts.
 */

interface AdsValue {
  /** The one gate. False for premium learners, unsupported builds, or refused consent. */
  shouldShowAds: boolean
  /** True once the SDK is initialised and a request may actually be made. */
  ready: boolean
  /** Whether adverts are possible in this binary at all (false in Expo Go / web). */
  supported: boolean
  /**
   * Tell the ad layer the learner has finished something.
   *
   * The only thing a screen may say. Whether an advert follows is decided by
   * the frequency caps in `adConfig`, never by the caller — so a screen cannot
   * become the place someone tunes ad pressure from.
   */
  noteNaturalBreak: (trigger: InterstitialTrigger) => Promise<void>
}

const AdsContext = createContext<AdsValue | null>(null)

export function AdsProvider({ children }: { children: ReactNode }) {
  const { isAdFree, ready: appReady } = useApp()
  const [ready, setReady] = useState(false)

  const supported = adsSupported()
  const shouldShowAds = !isAdFree && supported

  /*
   * Start the SDK once the app itself is up, and not before. Initialisation
   * runs a consent flow that can put a form on screen, and doing that over the
   * splash screen — or during onboarding — would be the first thing a new
   * learner ever saw of this app.
   */
  useEffect(() => {
    if (!appReady || !shouldShowAds) return
    let cancelled = false
    void startAds().then((runtime) => {
      if (!cancelled) setReady(runtime.ready)
    })
    return () => {
      cancelled = true
    }
  }, [appReady, shouldShowAds])

  /* Warm one interstitial, late, and only for learners who might see one. */
  useEffect(() => {
    if (!ready || !shouldShowAds) return
    return scheduleInterstitialPreload()
  }, [ready, shouldShowAds])

  /*
   * Becoming ad-free mid-session tears everything down. Without this a learner
   * who has just paid still has a preloaded interstitial waiting to appear at
   * their next natural break — which is the worst possible moment to discover
   * the purchase did not take.
   */
  useEffect(() => {
    if (!isAdFree) return
    disposeInterstitial()
    disposeRewarded()
    resetAds()
    setReady(false)
  }, [isAdFree])

  const noteNaturalBreak = useCallback(
    async (trigger: InterstitialTrigger) => {
      // Counted even when no advert follows: the caps are about sessions
      // completed, so a premium learner who later lapses is paced from a true
      // history rather than from zero.
      await noteSessionComplete()
      if (!shouldShowAds || !ready) return
      await maybeShowInterstitial(trigger)
    },
    [shouldShowAds, ready],
  )

  const value = useMemo<AdsValue>(
    () => ({ shouldShowAds, ready, supported, noteNaturalBreak }),
    [shouldShowAds, ready, supported, noteNaturalBreak],
  )

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>
}

/**
 * Ad state for a screen or component.
 *
 * Falls back to a fully-off value rather than throwing when no provider is
 * mounted, so a component rendered in isolation — a test, a storybook-style
 * harness — behaves like a premium learner instead of crashing.
 */
export function useAds(): AdsValue {
  const value = useContext(AdsContext)
  if (value) return value
  return {
    shouldShowAds: false,
    ready: false,
    supported: false,
    noteNaturalBreak: async () => {},
  }
}
