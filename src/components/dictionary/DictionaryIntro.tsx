import { View, Text, Image, Animated } from 'react-native'
import { dashArt } from '../dashboard/art'
import { dashShadow } from '../dashboard/tokens'
import { useReveal, useTypewriter } from '../dashboard/entrance'
import { dictEntrance } from './entrance'

/*
 * Shifu, saying what this screen is for.
 *
 * It replaces the ink-wash landscape and the standfirst that used to sit here.
 * That is a swap rather than an addition, and deliberately so — the brief was
 * that the dictionary felt cluttered, and answering "what is this screen"
 * with a picture *and* a subtitle *and* a heading was three things doing one
 * job. A line in a speech bubble does it once, and does it in the voice the
 * learner already knows from the Dashboard and onboarding.
 *
 * He arrives after the page does, and speaks after he has arrived — the same
 * order the Dashboard hero uses, because it is the order the scene reads in.
 * See `dictEntrance` for the score.
 *
 * Shown on the browsing state only. Once there are results on screen the
 * learner has plainly worked out what the dictionary does, and a mascot
 * explaining it over their search would be in the way.
 */

/** How much of the render to show. He is a full-length bow; this is head and hands. */
const SHIFU_WIDTH = 74
const SHIFU_VISIBLE = 82

const LINE = 'Search any word to hear how it sounds, see it used in a real sentence, and add it to your deck.'

export function DictionaryIntro({ run }: { run: number }) {
  const shifu = useReveal({
    from: 'bottom',
    at: dictEntrance.shifu.at,
    duration: dictEntrance.shifu.for,
    run,
    distance: dictEntrance.shifu.rise,
  })

  const bubble = useReveal({
    from: 'bottom',
    at: dictEntrance.bubble.at,
    duration: dictEntrance.bubble.for,
    run,
    distance: dictEntrance.bubble.rise,
    withScale: true,
  })

  /* A character count rather than a string, so the sentence keeps its own box
     while it fills — typing into a growing bubble would reflow the page under
     the learner's eye on every character. */
  const typed = useTypewriter(LINE.length, run, dictEntrance.typing)

  /*
   * 8pt of the padding under Shifu has gone to the gap below the search field,
   * which needed it more: this one only separates a greeting from a control,
   * where that one separates two surfaces whose shadows were landing on each
   * other. The search row rises by the same 8, so nothing above it moves.
   */
  return (
    <View className="flex-row items-center" style={{ gap: 10, paddingBottom: 6 }}>
      {/*
        Clipped at the hem rather than shipping a second cropped render — the
        same trick the Dashboard hero uses on the same asset. The height is the
        crop; the image is laid out at its full aspect and the overflow is cut.

        Plain styles on the animated view, with the clip and the image inside —
        NativeWind drops `className` on an `Animated.View`, and an animated
        `transform` replaces the whole array rather than merging into it.
      */}
      <Animated.View style={shifu}>
        <View style={{ width: SHIFU_WIDTH, height: SHIFU_VISIBLE, overflow: 'hidden' }}>
          <Image
            source={dashArt.shifu.source}
            style={{ width: SHIFU_WIDTH, height: SHIFU_WIDTH / dashArt.shifu.ratio }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>
      </Animated.View>

      <Animated.View style={[{ flex: 1 }, bubble]}>
        <View>
          {/*
            The bubble holds its full height from the moment it appears: the
            text is laid out invisibly underneath and the typed slice is drawn
            over it. Sizing to the typed text instead would grow the box line by
            line and shove the whole page down as Shifu spoke.
          */}
          {/*
            `dashShadow` rather than the `shadow-dict` class, and the difference
            is Android. NativeWind's `boxShadow` maps to the iOS `shadow*` props
            and has no `elevation`, which is the only thing Android draws a
            shadow from — so the bubble was flat there. This is the same shadow
            object the Dashboard's speech bubble uses, elevation included.
          */}
          <View className="rounded-dict bg-dict-card px-3.5 py-3" style={dashShadow}>
            <Text className="font-dict-sans text-[13.5px] leading-[19px]" style={{ opacity: 0 }}>
              {LINE}
            </Text>
            <Text
              className="absolute px-3.5 py-3 font-dict-sans text-[13.5px] leading-[19px] text-dict-body"
              style={{ left: 0, right: 0, top: 0 }}
            >
              {LINE.slice(0, typed)}
            </Text>
          </View>

          {/*
            The tail. A rotated square tucked under the bubble's left edge and
            painted the same colour, so it reads as part of the bubble rather than
            as a diamond next to one. It sits *behind* nothing and carries no
            shadow — the bubble's own shadow would otherwise draw a line across it.
          */}
          <View
            pointerEvents="none"
            className="absolute bg-dict-card"
            style={{
              left: -4,
              top: '50%',
              marginTop: -5,
              width: 10,
              height: 10,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      </Animated.View>
    </View>
  )
}
