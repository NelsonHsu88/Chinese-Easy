import { Platform } from 'react-native'
import { nativeAds } from './nativeModule'
import { trackAd } from './adEvents'

/*
 * Consent, via Google's User Messaging Platform.
 *
 * UMP ships inside `react-native-google-mobile-ads`, so there is no extra
 * dependency — the iOS App Tracking Transparency prompt is the one exception
 * and comes from `expo-tracking-transparency`.
 *
 * ── The order is the whole thing ─────────────────────────────────────────────
 *
 *   requestInfoUpdate()                 what does this user's region require?
 *   loadAndShowConsentFormIfRequired()  the EEA/UK form, only where required
 *   ATT prompt (iOS)                    after UMP, per Google's guidance
 *   → caller then sets request config and initialises the SDK
 *
 * Two rules inside that:
 *
 *  - **Nothing may be requested before `canRequestAds` is true.** Not a banner,
 *    not a preload. That is the difference between a compliant integration and
 *    a fine.
 *  - **ATT comes after the UMP form, not before.** Google's own flow puts the
 *    tracking prompt second so the learner has seen the purpose explained
 *    before iOS asks the blunt version of the question. Reversing them measurably
 *    reduces opt-in and reads as an ambush.
 *
 * Everything fails soft. No network, no form, a thrown SDK call, a user who
 * dismisses everything — all resolve to "cannot request personalised ads",
 * which is a state the rest of the layer already handles.
 */

export interface ConsentState {
  /** Whether any ad may be requested at all. */
  canRequestAds: boolean
  /** Whether the ads requested may be personalised. */
  personalised: boolean
  /** True when a privacy-options entry must be offered in Settings. */
  privacyOptionsRequired: boolean
}

const DENIED: ConsentState = { canRequestAds: false, personalised: false, privacyOptionsRequired: false }

/**
 * Runs the consent flow and reports what it concluded.
 *
 * Safe to call when the SDK is absent — it answers `DENIED`, which is exactly
 * what Expo Go and the web build should get.
 */
export async function gatherConsent(): Promise<ConsentState> {
  const sdk = nativeAds()
  if (!sdk) return DENIED

  const { AdsConsent } = sdk

  try {
    const info = await AdsConsent.requestInfoUpdate()

    // Only shows anything where the learner's jurisdiction requires it; a
    // no-op elsewhere, which is why it is called unconditionally.
    if (info.isConsentFormAvailable) {
      await AdsConsent.loadAndShowConsentFormIfRequired()
    }

    await requestTrackingPermission()

    const settled = await AdsConsent.getConsentInfo()
    const choices = await AdsConsent.getUserChoices().catch(() => null)

    const state: ConsentState = {
      canRequestAds: settled.canRequestAds ?? false,
      // Absent an explicit signal, treat ads as non-personalised. Under-reporting
      // consent costs revenue; over-reporting it is a compliance failure, and
      // those are not symmetric mistakes.
      personalised: choices?.selectPersonalisedAds ?? false,
      privacyOptionsRequired: settled.privacyOptionsRequirementStatus === 'REQUIRED',
    }

    trackAd('ad_consent_resolved', {
      canRequestAds: state.canRequestAds,
      personalised: state.personalised,
      privacyOptionsRequired: state.privacyOptionsRequired,
    })
    return state
  } catch (error) {
    if (__DEV__) console.info('[ads] consent flow failed, ads disabled:', error)
    return DENIED
  }
}

/**
 * The iOS ATT prompt.
 *
 * Android and web have no equivalent and return immediately. A denial is not an
 * error — it means non-personalised ads, which is a perfectly good outcome.
 */
async function requestTrackingPermission(): Promise<void> {
  if (Platform.OS !== 'ios') return
  try {
    const { requestTrackingPermissionsAsync } = await import('expo-tracking-transparency')
    await requestTrackingPermissionsAsync()
  } catch {
    // Module absent (Expo Go on some SDKs) or the prompt was unavailable.
  }
}

/**
 * Reopens the privacy options form, for the Settings entry that some
 * jurisdictions require. Resolves false when there is nothing to show.
 */
export async function showPrivacyOptions(): Promise<boolean> {
  const sdk = nativeAds()
  if (!sdk) return false
  try {
    await sdk.AdsConsent.showPrivacyOptionsForm()
    return true
  } catch (error) {
    if (__DEV__) console.info('[ads] privacy options form failed:', error)
    return false
  }
}
