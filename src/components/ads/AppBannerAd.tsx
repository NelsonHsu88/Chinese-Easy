import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text } from 'react-native'
import { useAds } from '../../context/AdsContext'
import { nativeAds } from '../../lib/ads/nativeModule'
import { unitFor } from '../../lib/ads/adUnits'
import { trackAd } from '../../lib/ads/adEvents'
import type { BannerPlacement } from '../../lib/ads/adConfig'
import { adShadow, adSlot, adTones, type AdTone } from './tokens'

/*
 * The only thing a screen needs to know about advertising.
 *
 *   <AppBannerAd placement="dashboard" />
 *
 * Everything else — premium state, consent, the SDK's absence in Expo Go, unit
 * ids, load failures, reserved height, listener cleanup — is decided in here.
 * A screen that wants a banner says where; it never says whether.
 *
 * ── The four states, and why each looks the way it does ──────────────────────
 *
 *  1. **Ads off** (premium, no SDK, consent refused, no unit id) — renders
 *     `null`. Not an empty box, not a placeholder: a learner who has paid, or a
 *     build that cannot show adverts at all, must see no trace of the system.
 *  2. **Loading** — reserves `adSlot.reservedHeight` so the arriving creative
 *     does not shove the page. This is the only state that holds space it might
 *     not use.
 *  3. **Loaded** — grows to the height the SDK reports, which for an anchored
 *     adaptive banner varies by device width.
 *  4. **Failed** — collapses to `null`. Offline, no inventory, a timeout: all
 *     the same, and none of them ever puts an error on a learner's screen.
 *
 * Collapsing on failure is one layout shift, and it is deliberate that this
 * component is only approved for the *bottom* of a scroll: nothing sits below
 * it to be moved, so the shift costs a few pixels of scroll extent and nothing
 * visible. Placing it mid-content would make that collapse a real jump, which
 * is why `BannerPlacement` is a closed union rather than a free string.
 */

type SlotState = 'loading' | 'loaded' | 'failed'

/**
 * Which visual language each placement sits in.
 *
 * Derived rather than passed, so a screen still only says *where* an advert
 * goes. Adding a placement means adding it here, which is the point — a new
 * slot cannot be dropped onto a screen without someone deciding which palette
 * it belongs to.
 */
const TONE_FOR: Record<BannerPlacement, AdTone> = {
  dashboard: 'ivory',
  dictionary: 'ivory',
  books: 'paper',
  challenges: 'challenges',
}

export function AppBannerAd({ placement }: { placement: BannerPlacement }) {
  const { shouldShowAds, ready } = useAds()
  const [state, setState] = useState<SlotState>('loading')
  // Explicitly `number`: `adSlot` is `as const`, so inference would pin this to
  // the literal 60 and reject the real height the SDK reports.
  const [height, setHeight] = useState<number>(adSlot.reservedHeight)

  /*
   * Guards a late callback from an unmounted slot. The SDK's listeners are not
   * React-aware, and a banner that resolves after the learner has navigated
   * away would otherwise set state on a dead component.
   */
  const live = useRef(true)
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
    }
  }, [])

  const onAdLoaded = useCallback(
    (dimensions: { width: number; height: number }) => {
      if (!live.current) return
      // Trust the reported height over the reservation — an adaptive banner is
      // sized to the device, and guessing would leave a sliver of dead space.
      if (dimensions?.height > 0) setHeight(dimensions.height)
      setState('loaded')
      trackAd('ad_banner_loaded', { placement, height: dimensions?.height })
    },
    [placement],
  )

  const onAdFailedToLoad = useCallback(
    (error: Error) => {
      if (!live.current) return
      setState('failed')
      // Development only — a learner must never be told an advert failed.
      trackAd('ad_banner_failed', { placement, message: String(error?.message ?? error) })
    },
    [placement],
  )

  const onAdImpression = useCallback(() => {
    trackAd('ad_banner_impression', { placement })
  }, [placement])

  const sdk = nativeAds()
  const unitId = unitFor('banner')

  // State 1. Checked before anything is created, so a premium learner never
  // constructs an ad view, and the SDK is never touched on their behalf.
  if (!shouldShowAds || !ready || !sdk || !unitId) return null
  // State 4.
  if (state === 'failed') return null

  const { BannerAd, BannerAdSize } = sdk
  const tone = adTones[TONE_FOR[placement]]

  return (
    <View
      style={{
        marginTop: adSlot.marginTop,
        borderRadius: adSlot.radius,
        backgroundColor: tone.surface,
        borderWidth: 1,
        borderColor: tone.border,
        padding: adSlot.padding,
        overflow: 'hidden',
        ...adShadow,
      }}
    >
      {/*
        Labelled, because an advert inside a card that looks like the app's own
        cards should say what it is. Small and muted — this is a disclosure, not
        a headline.
      */}
      <Text
        className="font-nunito-semibold"
        style={{
          fontSize: 10,
          lineHeight: adSlot.labelHeight,
          letterSpacing: 0.6,
          color: tone.label,
          textAlign: 'center',
        }}
      >
        AD
      </Text>

      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <BannerAd
          unitId={unitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          onAdLoaded={onAdLoaded}
          onAdFailedToLoad={onAdFailedToLoad}
          onAdImpression={onAdImpression}
        />
      </View>
    </View>
  )
}
