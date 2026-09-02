/*
 * The ad layer's public surface.
 *
 * Screens should not reach past this file, and in practice should not reach it
 * at all — a placement is `<AppBannerAd placement="dashboard" />` and a natural
 * break is `useAds().noteNaturalBreak('review-session-complete')`. Everything
 * below is for those two things and for the provider that wires them up.
 */

export { adsSupported } from './nativeModule'
export { startAds, adRuntime, canRequestAds, resetAds, type AdRuntime } from './adManager'
export { gatherConsent, showPrivacyOptions, type ConsentState } from './consent'
export { unitFor, hasProductionUnits, type AdFormat } from './adUnits'
export {
  maybeShowInterstitial,
  preloadInterstitial,
  scheduleInterstitialPreload,
  disposeInterstitial,
} from './interstitial'
export { prepareRewarded, rewardedReady, showRewarded, disposeRewarded, type RewardEarned } from './rewarded'
export { noteSessionComplete, resetFrequency } from './frequency'
export { trackAd, setAdEventSink, type AdEvent, type AdEventName } from './adEvents'
export {
  FREQUENCY,
  TIMING,
  AUDIENCE,
  INTERSTITIAL_TRIGGERS,
  adPolicy,
  type BannerPlacement,
  type InterstitialTrigger,
} from './adConfig'
