import { TurboModuleRegistry } from 'react-native'
import type * as GoogleMobileAds from 'react-native-google-mobile-ads'

/*
 * `react-native-google-mobile-ads`, or null where it isn't linked.
 *
 * This is the same shape as `lib/speechRecognition.ts` and exists for the same
 * reason. The package registers native modules at import time, which **throws**
 * wherever those modules aren't in the binary — Expo Go, the react-native-web
 * build, and any Jest-style environment. A static import would therefore turn
 * "this build has no adverts" into "this build does not launch".
 *
 * Resolving it lazily instead makes an absent SDK just another quiet no: every
 * caller already handles null, because null is also what a premium learner, a
 * missing unit id and a failed load all produce. One code path, four causes.
 *
 * The practical consequence is worth stating plainly: **the app still runs in
 * Expo Go with this package installed.** Adverts are simply absent there, and
 * appear once you build a development client. That is what keeps the existing
 * tunnel workflow usable while the ad layer is being built.
 *
 * `import type` above is erased at compile time and never becomes a require, so
 * it costs nothing at runtime while still giving the whole layer real types.
 */

type AdsSdk = typeof GoogleMobileAds

/**
 * `undefined` means "not looked up yet"; `null` means "looked up, not there".
 * The negative answer is cached too — a native module that is missing cannot
 * appear later in the same process, and retrying the require on every banner
 * render would be a pointless throw per frame.
 */
let resolved: AdsSdk | null | undefined

/**
 * Whether a resolved module is actually a *working* SDK.
 *
 * ── Why this touches fields instead of just checking for them ────────────────
 * `require()` succeeding proves nothing here, and this is the trap that broke
 * Expo Go once already.
 *
 * The package's entry point is Babel's CommonJS output, where every export is a
 * lazy accessor:
 *
 *     Object.defineProperty(exports, 'InterstitialAd', {
 *       get: function () { return _InterstitialAd.InterstitialAd },
 *     })
 *
 * and Metro's inline-requires (on by default under `babel-preset-expo`) defers
 * `_InterstitialAd` itself to first use. So requiring the index runs no native
 * code at all — it is a bag of getters. The native lookup
 * (`TurboModuleRegistry.getEnforcing('RNGoogleMobileAdsModule')`, which
 * **throws** where the module is not in the binary) happens on the first
 * *property read*, which may be arbitrarily far away from the require that
 * caused it.
 *
 * That is why this function is called from inside the try below rather than
 * after it, and why it reads the fields rather than testing `in`: reading is
 * what fires the getter, and firing it here — once, somewhere we control — is
 * what turns "this build has no adverts" back into a quiet null instead of a
 * red screen on whichever screen happened to mount a banner first.
 *
 * The three chosen are also the three every caller in this folder reaches for,
 * and `InterstitialAd` in particular pulls the main native module in. On web
 * the Metro resolver hands back an *empty* module (see metro.config.js), which
 * is truthy and has none of them, so the same check covers that too.
 */
function isUsable(candidate: unknown): candidate is AdsSdk {
  if (!candidate || typeof candidate !== 'object') return false
  const sdk = candidate as Partial<AdsSdk>
  return Boolean(sdk.TestIds && sdk.InterstitialAd && sdk.AdsConsent)
}

/**
 * The name of the SDK's core native module, as registered by the native build.
 *
 * Probed rather than assumed. It is the first thing the package's own entry
 * point reaches for (`./MobileAds` → `NativeGoogleMobileAdsModule`), so if this
 * one is absent none of the others are there either — they all ship in the same
 * native library.
 */
const CORE_NATIVE_MODULE = 'RNGoogleMobileAdsModule'

/**
 * Whether the native side of the SDK is actually in this binary.
 *
 * ── Why a probe, and why a try/catch is not enough ───────────────────────────
 * This is the part that is genuinely counter-intuitive, and it cost a red error
 * screen in Expo Go to find.
 *
 * The package's entry point calls
 * `TurboModuleRegistry.getEnforcing('RNGoogleMobileAdsModule')` at module
 * scope, which throws where the module is not linked. The obvious defence is to
 * wrap the `require` in a try/catch — and it does not work, because in a
 * development build Metro does not let that exception reach us:
 *
 *     function guardedLoadModule(moduleId, module) {
 *       if (!inGuard && global.ErrorUtils) {
 *         inGuard = true
 *         let returnValue
 *         try { returnValue = loadModuleImplementation(moduleId, module) }
 *         catch (e) { global.ErrorUtils.reportFatalError(e) }   // ← swallowed
 *         inGuard = false
 *         return returnValue
 *       }
 *       return loadModuleImplementation(moduleId, module)
 *     }
 *                        — metro-runtime/src/polyfills/require.js
 *
 * A module whose factory throws is reported to LogBox as a **fatal error** and
 * `require()` simply returns `undefined`. Nothing is re-thrown, so `catch` never
 * runs. The `inGuard` flag is why this only bites some of the time: during the
 * initial bundle evaluation a guard is already open and exceptions propagate
 * normally, but `nativeAds()` is called from a render or an effect — after
 * evaluation, when `inGuard` is false — which is exactly when the guard
 * intercepts. The app kept working and ads stayed off, as designed; the learner
 * just also got a full-screen error about a module they will never have.
 *
 * So the require has to be *avoided*, not caught. `TurboModuleRegistry.get` is
 * the non-throwing sibling of `getEnforcing` — same lookup, returns `null`
 * instead of raising — which lets us ask the question the package asks, without
 * the answer being fatal.
 *
 * On web `TurboModuleRegistry` may not exist at all under react-native-web,
 * hence the optional access and the try around it.
 */
function nativeModuleRegistered(): boolean {
  try {
    return TurboModuleRegistry?.get?.(CORE_NATIVE_MODULE) != null
  } catch {
    return false
  }
}

export function nativeAds(): AdsSdk | null {
  if (resolved !== undefined) return resolved

  let usable: AdsSdk | null = null
  /* Ask before importing. A `require` of the package where the native module is
     missing is not recoverable — see `nativeModuleRegistered`. */
  if (nativeModuleRegistered()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const candidate: unknown = require('react-native-google-mobile-ads')
      // Inside the try on purpose — see the note on `isUsable`.
      if (isUsable(candidate)) usable = candidate
    } catch {
      usable = null
    }
  }

  resolved = usable
  if (!resolved && __DEV__) {
    console.info(
      '[ads] Google Mobile Ads native module not present — ads are disabled. ' +
        'This is expected in Expo Go and on web; build a development client to see them.',
    )
  }
  return resolved
}

/** Whether adverts are possible at all in this binary. */
export function adsSupported(): boolean {
  return nativeAds() !== null
}
