import { View, Image } from 'react-native'

/*
 * The watercolour in the corner of "Word to discover" — the one piece of
 * illustration on the Dictionary landing.
 *
 * Everything else on that screen is functional, and it is deliberately so: one
 * expressive moment reads as care, one per card reads as a pastel dashboard.
 * The heading used to carry an ink-wash landscape as well and no longer does.
 */

const ART = {
  /** The same distant range the reading screens use, at a fraction of the size. */
  range: { source: require('../../assets/images/decor/mountains-small.png'), ratio: 325 / 132 },
  sprig: { source: require('../../assets/images/onboarding/sakura-sprig.png'), ratio: 320 / 151 },
} as const

/**
 * @param width The card's width. Both pieces are sized against it, so the
 *   corner scales with the column rather than with the window.
 *
 * Absolutely positioned and `pointerEvents="none"` throughout: it must cost no
 * layout height and never swallow a tap on the example sentence it sits beside.
 * The card clips it (`overflow: hidden`), which is what turns the overhang into
 * a wash bleeding off the corner rather than a sticker lying on top of it.
 *
 * Heights come from each source's ratio — React Native lays out an `Image`
 * with a width and no height at zero, and the art silently vanishes.
 */
export function DiscoverWash({ width }: { width: number }) {
  const rangeWidth = width * 0.62
  const sprigWidth = Math.min(132, width * 0.36)

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 }}>
      <Image
        source={ART.range.source}
        style={{
          position: 'absolute',
          right: -18,
          bottom: -10,
          width: rangeWidth,
          height: rangeWidth / ART.range.ratio,
          opacity: 0.55,
        }}
        resizeMode="contain"
      />
      {/*
        The sprig grows left to right from its stem, so it is mirrored to enter
        from the right-hand edge, tipped up so it reaches into the card rather
        than lying along its floor.
      */}
      <Image
        source={ART.sprig.source}
        style={{
          position: 'absolute',
          right: -22,
          bottom: -6,
          width: sprigWidth,
          height: sprigWidth / ART.sprig.ratio,
          opacity: 0.85,
          transform: [{ rotate: '-24deg' }, { scaleX: -1 }],
        }}
        resizeMode="contain"
      />
    </View>
  )
}
