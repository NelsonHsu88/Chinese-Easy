import { View, Image } from 'react-native'

/*
 * The painted atmosphere behind the reading screens: an ink-wash range along the
 * bottom edge and a few ruyi clouds drifting above it.
 *
 * This layer sits *behind* the scrolling content and does not scroll with it, so
 * it reads as the page the cards are printed on rather than as items in the list.
 * Everything here is decoration — it never takes touches.
 *
 * The artwork is already painted pale cream on white, so it needs almost no
 * knocking back — the opacities below are slight trims, not the heavy fade a
 * full-strength illustration would want. Drop them much further and the pieces
 * stop reading as decoration at all.
 *
 * Placement matters more than opacity here: story cards are near-opaque and
 * cover the middle of the library, so the clouds sit in the open cream around
 * the header and chip row where they can actually be seen.
 */

const MOUNTAINS_WIDE = require('../../assets/images/decor/mountains-wide.png')
const CLOUD_CLUSTER = require('../../assets/images/decor/cloud-cluster.png')
const CLOUD_WISP = require('../../assets/images/decor/cloud-wisp.png')
const CLOUD_DRIFT = require('../../assets/images/decor/cloud-drift.png')

/** Native aspect ratios, so a width alone is enough to place any piece. */
const RATIO = {
  mountainsWide: 468 / 137,
  cloudCluster: 251 / 133,
  cloudWisp: 177 / 103,
  cloudDrift: 243 / 110,
}

interface Props {
  /** Clouds are for the library; the reader keeps just the range so they don't compete with the text. */
  clouds?: boolean
}

export function PageDecor({ clouds = false }: Props) {
  return (
    <View
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, pointerEvents: 'none', overflow: 'hidden' }}
    >
      {clouds && (
        <>
          {/* Behind the title, bled off the right edge so it reads as a passing
              cloud rather than a sticker centred in the corner. */}
          <Image
            source={CLOUD_CLUSTER}
            style={{ position: 'absolute', top: -6, right: -46, width: 210, height: 210 / RATIO.cloudCluster, opacity: 0.95 }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          {/* Drifting in behind the HSK chips from the left. */}
          <Image
            source={CLOUD_WISP}
            style={{ position: 'absolute', top: 64, left: -48, width: 168, height: 168 / RATIO.cloudWisp, opacity: 0.8 }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          {/* Low on the left, meeting the range so the two read as one scene. */}
          <Image
            source={CLOUD_DRIFT}
            style={{ position: 'absolute', bottom: 96, left: -52, width: 185, height: 185 / RATIO.cloudDrift, opacity: 0.75 }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </>
      )}

      <Image
        source={MOUNTAINS_WIDE}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', aspectRatio: RATIO.mountainsWide, opacity: 0.95 }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
    </View>
  )
}
