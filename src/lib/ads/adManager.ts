import { nativeAds } from './nativeModule'
import { AUDIENCE, assertConfigured } from './adConfig'
import { gatherConsent, type ConsentState } from './consent'
import { hasProductionUnits } from './adUnits'
import { trackAd } from './adEvents'

/*
 * Bringing the ad SDK up, once, in the right order.
 *
 *   consent → request configuration → initialise → ads may load
 *
 * The middle step is the one with a trap in it: `setRequestConfiguration` must
 * land **before** `initialize()`, because the audience tags (child-directed,
 * under age of consent, content rating) are read when the SDK starts. Setting
 * them afterwards leaves the first requests of the session untagged, which is
 * exactly the case those tags exist to protect.
 *
 * Initialisation is lazy and idempotent. It is not called at startup: a cold
 * launch is when the learner is least patient and least likely to be about to
 * finish a session, so the first thing that actually wants an advert triggers
 * it. A premium learner never triggers it at all — see `AdsContext`.
 */

export interface AdRuntime {
  ready: boolean
  consent: ConsentState
}

const IDLE: AdRuntime = {
  ready: false,
  consent: { canRequestAds: false, personalised: false, privacyOptionsRequired: false },
}

let runtime: AdRuntime = IDLE
/** The in-flight start, so concurrent callers share one initialisation. */
let starting: Promise<AdRuntime> | null = null

function childDirectedFlag(): boolean | null {
  switch (AUDIENCE.childDirectedTreatment) {
    case 'child-directed':
      return true
    case 'not-child-directed':
      return false
    default:
      return null
  }
}

function underAgeFlag(): boolean | null {
  switch (AUDIENCE.underAgeOfConsent) {
    case 'under-age':
      return true
    case 'of-age':
      return false
    default:
      return null
  }
}

/**
 * Ensure the SDK is up, running the consent flow first.
 *
 * Resolves to a runtime whose `ready` is false whenever adverts are impossible
 * — no native module, consent refused, initialisation failed. Callers treat all
 * of those the same way, which is why none of them throws.
 */
export function startAds(): Promise<AdRuntime> {
  if (runtime.ready) return Promise.resolve(runtime)
  if (starting) return starting

  starting = (async (): Promise<AdRuntime> => {
    const sdk = nativeAds()
    if (!sdk) return IDLE

    assertConfigured()
    if (__DEV__ && !hasProductionUnits()) {
      console.info('[ads] no production unit ids set — release builds would show no ads. See adUnits.ts.')
    }

    const consent = await gatherConsent()
    if (!consent.canRequestAds) {
      runtime = { ready: false, consent }
      return runtime
    }

    try {
      const mobileAds = sdk.default

      /*
       * Before initialize(), deliberately — see the note at the top.
       *
       * The rating is mapped through the SDK's own `MaxAdContentRating` enum
       * rather than passed as a bare string: the enum's values happen to be
       * "G"/"PG"/"T"/"MA" today, and a cast would keep compiling if that ever
       * stopped being true while silently sending an unrecognised rating.
       *
       * `undefined` for the two age flags is meaningfully different from
       * `false` — it leaves them unset, which is what 'unspecified' means.
       */
      const { MaxAdContentRating } = sdk
      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating[AUDIENCE.maxAdContentRating],
        tagForChildDirectedTreatment: childDirectedFlag() ?? undefined,
        tagForUnderAgeOfConsent: underAgeFlag() ?? undefined,
      })

      await mobileAds().initialize()

      runtime = { ready: true, consent }
      trackAd('ad_sdk_initialised', { personalised: consent.personalised })
      return runtime
    } catch (error) {
      if (__DEV__) console.info('[ads] SDK initialisation failed, ads disabled:', error)
      runtime = { ready: false, consent }
      return runtime
    }
  })()

  // Clear the latch either way, so a failed start can be retried later in the
  // session rather than pinning the app to its first bad answer (a learner who
  // was offline at launch may not be offline at the end of their session).
  starting.finally(() => {
    starting = null
  })

  return starting
}

/** The current runtime without triggering a start. */
export function adRuntime(): AdRuntime {
  return runtime
}

/** Whether a request may be made right now. */
export function canRequestAds(): boolean {
  return runtime.ready && runtime.consent.canRequestAds
}

/**
 * Forget everything and allow a fresh start.
 *
 * Used when an entitlement is dropped in development (`clearEntitlement`), so
 * the ad layer can come back without relaunching.
 */
export function resetAds(): void {
  runtime = IDLE
  starting = null
}
