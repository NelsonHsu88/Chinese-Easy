/*
 * Ad telemetry, as a sink you can point somewhere later.
 *
 * This project has no analytics layer — no Firebase, Segment, Amplitude or
 * Sentry, and no `lib/analytics.ts` — and adding one to count ad impressions
 * would be several megabytes of native code to answer a question that a handful
 * of counters answers. So this is deliberately tiny: a typed event list, a
 * console sink in development, and a `setAdEventSink` seam for whenever a real
 * destination exists (Supabase is already a dependency and is the obvious one).
 *
 * It follows the same "register, don't import" shape as `lib/subscription.ts`:
 * nothing here reaches for a transport, so nothing here can fail.
 */

export type AdEventName =
  | 'ad_banner_loaded'
  | 'ad_banner_impression'
  | 'ad_banner_failed'
  | 'ad_interstitial_loaded'
  | 'ad_interstitial_impression'
  | 'ad_interstitial_dismissed'
  | 'ad_interstitial_failed'
  | 'ad_interstitial_suppressed'
  | 'ad_rewarded_loaded'
  | 'ad_rewarded_impression'
  | 'ad_rewarded_completed'
  | 'ad_rewarded_failed'
  | 'ad_consent_resolved'
  | 'ad_sdk_initialised'

export interface AdEvent {
  name: AdEventName
  /** Free-form detail — placement, trigger, error code, cap that refused. */
  detail?: Record<string, string | number | boolean | null | undefined>
  at: string
}

type AdEventSink = (event: AdEvent) => void

let sink: AdEventSink | null = null

/** Point ad telemetry at a real destination. Call once, at startup, if ever. */
export function setAdEventSink(next: AdEventSink | null): void {
  sink = next
}

/**
 * Record an ad event.
 *
 * Never throws and never awaits: this is called from ad SDK callbacks, and a
 * telemetry failure must not become an advert failure — let alone a crash on a
 * screen a learner is using.
 */
export function trackAd(name: AdEventName, detail?: AdEvent['detail']): void {
  const event: AdEvent = { name, detail, at: new Date().toISOString() }
  try {
    sink?.(event)
  } catch {
    // A broken sink is not the learner's problem.
  }
  if (__DEV__ && !sink) {
    const extra = detail ? ` ${JSON.stringify(detail)}` : ''
    console.info(`[ads] ${name}${extra}`)
  }
}
