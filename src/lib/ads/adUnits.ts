import { Platform } from 'react-native'
import { nativeAds } from './nativeModule'

/*
 * Every AdMob unit id in the app, and the one rule that matters:
 *
 * **A development build can never serve a live advert.** Not "should not" —
 * `unitFor` returns Google's test id whenever `__DEV__` is true and never even
 * reads the production values, so there is no switch to flip by accident, no
 * env var to mis-set, and no code path from a dev build to real inventory.
 * Repeatedly testing against live ads is how an AdMob account gets suspended
 * for invalid traffic, and that is not a recoverable mistake.
 *
 * Production ids come from `EXPO_PUBLIC_ADMOB_*` (see .env.example), matching
 * how this project already carries its Supabase values. The `EXPO_PUBLIC_`
 * prefix inlines them into the shipped bundle, which is correct here — an ad
 * unit id is public by nature and identifies inventory rather than authorising
 * anything.
 *
 * The **App ids** are not here. They belong to the native SDK and live in
 * app.json's top-level `react-native-google-mobile-ads` block, which currently
 * holds Google's published sample App ids. Replace those at the same time as
 * the unit ids below.
 */

export type AdFormat = 'banner' | 'interstitial' | 'rewarded'

/**
 * Production unit ids, per platform.
 *
 * ── FILL THESE IN FROM YOUR ADMOB ACCOUNT ────────────────────────────────────
 * Six values, created under AdMob → Apps → (your app) → Ad units. Set them in
 * `.env`, never here — this file only names them.
 *
 *   EXPO_PUBLIC_ADMOB_ANDROID_BANNER
 *   EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL
 *   EXPO_PUBLIC_ADMOB_ANDROID_REWARDED
 *   EXPO_PUBLIC_ADMOB_IOS_BANNER
 *   EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL
 *   EXPO_PUBLIC_ADMOB_IOS_REWARDED
 *
 * Empty is a supported state: a placement with no id simply never renders, so a
 * release built before the ids exist shows no adverts rather than breaking.
 */
const PRODUCTION_UNITS: Record<'android' | 'ios', Record<AdFormat, string | undefined>> = {
  android: {
    banner: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER,
    interstitial: process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL,
    rewarded: process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED,
  },
  ios: {
    banner: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER,
    interstitial: process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL,
    rewarded: process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED,
  },
}

/**
 * The unit id to request, or null when there is nothing safe to request.
 *
 * Null is a normal answer, not an error: it is what a release with unset ids
 * returns, and every caller treats it as "no advert here".
 */
export function unitFor(format: AdFormat): string | null {
  const sdk = nativeAds()

  // Test ids come from the SDK itself rather than being copied in as literals,
  // so they cannot drift from whatever the installed version considers a test
  // unit. No SDK (Expo Go, web) means no adverts at all — see nativeModule.ts.
  if (!sdk) return null

  if (__DEV__) {
    const { TestIds } = sdk
    return format === 'banner' ? TestIds.BANNER : format === 'interstitial' ? TestIds.INTERSTITIAL : TestIds.REWARDED
  }

  const platform = Platform.OS === 'ios' ? 'ios' : 'android'
  const id = PRODUCTION_UNITS[platform][format]
  return id && id.length > 0 ? id : null
}

/**
 * Whether production ids have been configured for this platform.
 *
 * Used only for a development warning — it is deliberately not a gate, because
 * "no ids yet" and "ads disabled" must behave identically.
 */
export function hasProductionUnits(): boolean {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android'
  return Object.values(PRODUCTION_UNITS[platform]).some((id) => Boolean(id && id.length > 0))
}
