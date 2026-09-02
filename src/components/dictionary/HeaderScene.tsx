import { View, Image } from 'react-native'

/*
 * The little ink-wash landscape in the top-right of Discover Words.
 *
 * Three layers, painted back to front: a pale sun, a distant range, and the
 * bonsai on its rock. It is the one piece of decoration on the screen and the
 * thing that stops the dictionary reading as a list of controls.
 */

const ART = {
  /** The same distant range the reading screens use, at a fraction of the size. */
  mountains: { source: require('../../assets/images/decor/mountains-small.png'), ratio: 325 / 132 },
  bonsai: { source: require('../../assets/images/dashboard/bonsai.png'), ratio: 290 / 197 },
  sprig: { source: require('../../assets/images/onboarding/sakura-sprig.png'), ratio: 320 / 151 },
} as const

/**
 * A wash in the bottom-right corner of a card.
 *
 * Faint enough to read as paper texture rather than as a picture — the point is
 * that it should be noticed on the first look at the screen and invisible on
 * every look after that, when the learner is reading the words.
 *
 * It sits in the corner *below* the card's content and behind its footer action,
 * whose label is centred, so it never has text over it. `pointerEvents="none"`
 * throughout: a decoration must never swallow a tap meant for the row it sits
 * behind.
 */
export function CornerWash({ art, width }: { art: 'sprig' | 'range'; width: number }) {
  const piece = art === 'sprig' ? ART.sprig : ART.mountains

  return (
    <View pointerEvents="none" style={{ position: 'absolute', right: 0, bottom: 0 }}>
      <Image
        source={piece.source}
        style={{ width, height: width / piece.ratio, opacity: 0.34 }}
        resizeMode="contain"
      />
    </View>
  )
}

/**
 * @param width How much room the scene may occupy. The caller sizes it against
 *   the column so it scales with the screen rather than with the window.
 *
 * The whole layer is `pointerEvents="none"` and absolutely positioned: it must
 * cost no layout height, or the search field below it walks down the page to
 * make room for a painting, and it must never swallow a tap.
 *
 * Heights are derived from each source ratio rather than left to the image.
 * React Native does not size an `Image` from its intrinsic dimensions the way a
 * browser does — a width with no height lays out at zero and the art vanishes.
 */
export function HeaderScene({ width }: { width: number }) {
  const rangeWidth = width * 0.62
  const bonsaiWidth = width * 0.46

  return (
    <View pointerEvents="none" style={{ position: 'absolute', right: -10, top: -4 }}>
      <View style={{ width, height: 96 }}>
        {/*
          The sun. Drawn rather than shipped, because it is a flat disc — a PNG
          of one would be a request for four bytes of information. Pale enough
          that the range in front of it still reads as the darker shape.
        */}
        <View
          style={{
            position: 'absolute',
            right: width * 0.3,
            top: 2,
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: '#E9A08C',
            opacity: 0.5,
          }}
        />

        <Image
          source={ART.mountains.source}
          style={{
            position: 'absolute',
            left: 0,
            top: 20,
            width: rangeWidth,
            height: rangeWidth / ART.mountains.ratio,
            opacity: 0.45,
          }}
          resizeMode="contain"
        />

        {/*
          The bonsai is the anchor — the one shape in the scene that is meant to
          be recognised — so it is the least faded of the three and sits furthest
          forward, overlapping the range's right end.
        */}
        <Image
          source={ART.bonsai.source}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: bonsaiWidth,
            height: bonsaiWidth / ART.bonsai.ratio,
            opacity: 0.9,
          }}
          resizeMode="contain"
        />
      </View>
    </View>
  )
}
