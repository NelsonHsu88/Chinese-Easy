import { useEffect, useRef } from 'react'
import { View, Text, Image, Animated, Easing, Platform } from 'react-native'
import { Check } from 'lucide-react-native'
import { tourColors as c, tourShadow, tourType as t, tourMotion } from './tokens'
import { tourShifu } from './art'

/*
 * "Nice! It's in My Words." — the reference's `toast_success`, with the
 * celebrating Shifu peeking over its right end.
 *
 * It blocks nothing: it is drawn in a `box-none` layer and takes no touches.
 * It plays its whole life by itself — rises in, holds long enough to be read,
 * then fades slowly away — so the parent only has to keep it mounted for
 * `toastLifetime` and can unmount it on a timer without it ever vanishing
 * mid-sight. Shown by the tour after its Save step.
 */

const USE_NATIVE_DRIVER = Platform.OS !== 'web'

/** Mounted to fully gone. Unmount no sooner than this. */
export const toastLifetime = tourMotion.toastIn + tourMotion.toastHold + tourMotion.toastOut

export function TourToast({ text, width, reduceMotion }: { text: string; width: number; reduceMotion: boolean }) {
  /* 0 → 1 on the way in, 1 → 2 on the way out: one value, so the arrival and
     the departure are a single continuous arc rather than two animations
     handing over. */
  const phase = useRef(new Animated.Value(0)).current

  useEffect(() => {
    phase.setValue(0)
    const anim = Animated.sequence([
      Animated.timing(phase, {
        toValue: 1,
        duration: tourMotion.toastIn,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.delay(tourMotion.toastHold),
      Animated.timing(phase, {
        toValue: 2,
        duration: tourMotion.toastOut,
        /* Slow at both ends, so the fade neither snaps on nor cuts off. */
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ])
    anim.start()
    /* Hidden-tab backstops, as everywhere in this app: a stalled arrival is
       forced visible, a stalled departure forced gone. */
    const shown = setTimeout(() => phase.setValue(1), tourMotion.toastIn + 80)
    const gone = setTimeout(() => phase.setValue(2), toastLifetime + 80)
    return () => {
      anim.stop()
      clearTimeout(shown)
      clearTimeout(gone)
    }
  }, [phase])

  const opacity = phase.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] })
  /* Rises into place, then settles a little lower as it fades. */
  const translateY = phase.interpolate({ inputRange: [0, 1, 2], outputRange: [tourMotion.rise, 0, tourMotion.rise / 2] })

  const shifu = tourShifu.celebrate
  const shifuWidth = 58

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{
        width,
        opacity,
        transform: reduceMotion ? [] : [{ translateY }],
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 14,
          paddingLeft: 16,
          paddingRight: shifuWidth + 12,
          borderRadius: 18,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.edge,
          ...tourShadow,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: c.success,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={19} color={c.onCta} strokeWidth={3} />
        </View>
        <Text style={{ ...t.toast, color: c.navy, flexShrink: 1 }}>{text}</Text>
      </View>
      <Image
        source={shifu.source}
        resizeMode="contain"
        style={{ position: 'absolute', right: 6, bottom: 2, width: shifuWidth, height: shifuWidth / shifu.ratio }}
      />
    </Animated.View>
  )
}
