import { Fragment } from 'react'
import { View, Text, Animated } from 'react-native'
import { BrushHighlight } from '../BrushHighlight'
import { CardArt } from './parts'
import { dashArt } from './art'
import { useReveal, useTypewriter } from './entrance'
import {
  dashColors as c,
  dashSpacing as s,
  dashType as t,
  dashShadow,
  dashHeights,
  dashEntrance as e,
} from './tokens'

/*
 * The greeting scene: one composition, not a stack of pictures.
 *
 * Everything decorative is absolutely positioned inside a single relative
 * container and is allowed to run off the screen edge, which is what makes the
 * branch read as a branch continuing past the phone rather than as a sticker
 * placed near the corner. Only the greeting and the speech bubble are in
 * normal flow — the artwork must cost no layout height, or the mountains push
 * the first action card down off the fold to make room for themselves.
 *
 * Back to front: sakura, then the pagoda range, then Shifu, then the bubble.
 * Shifu has to sit above the landscape and below the bubble, which is exactly
 * the order they are written in here — the two flow children render above the
 * whole art layer for free.
 *
 * Each piece also carries its slot in the entrance (see `dashEntrance`): the
 * scenery arrives from the right, the greeting from the left, Shifu up out of
 * the cards below, and the bubble last, with his line typed on after it.
 */

/**
 * How far Shifu's robe runs past the bottom of the hero before it is clipped.
 *
 * Tuned so the cut lands on the flare of the robe rather than across his shoes
 * — the reference shows him from the bun to about the hem, standing in the
 * mist, and a crop through the feet reads as a mistake instead of a horizon.
 *
 * It is also what makes his entrance work: the hero clips at this line, so
 * rising from below it means he genuinely emerges from the edge the cards are
 * arriving from rather than fading in on the spot.
 */
const SHIFU_BLEED = 38

export function DashboardHero({
  greetingLead,
  greetingTail,
  name,
  dueCount,
  fallbackMessage,
  width,
  run,
}: {
  greetingLead: string
  greetingTail: string
  name: string
  dueCount: number
  /** Used when there are no due words — the existing rotating Shifu line. */
  fallbackMessage: string
  /** The content column's width, so the artwork scales with it rather than with the window. */
  width: number
  /** Ticks on every focus; restarts the entrance. */
  run: number
}) {
  const shifuWidth = Math.min(118, width * 0.32)

  /*
   * The two mirrored pieces pass their `scaleX: -1` through the reveal rather
   * than leaving it in `style`, because an animated `transform` replaces the
   * whole array instead of merging with it — left in `style`, both would arrive
   * correctly and land un-mirrored.
   */
  const sakura = useReveal({
    from: 'right',
    at: e.scenery.at,
    duration: e.scenery.for,
    run,
    distance: e.slideX,
    extraTransform: [{ scaleX: -1 }],
  })

  const pagoda = useReveal({
    from: 'right',
    at: e.scenery.at,
    duration: e.scenery.for,
    run,
    distance: e.slideX,
    toOpacity: 0.92,
    extraTransform: [{ scaleX: -1 }],
  })

  const shifu = useReveal({
    from: 'bottom',
    at: e.shifu.at,
    duration: e.shifu.for,
    run,
    distance: e.shifuRise,
  })

  const greeting = useReveal({
    from: 'left',
    at: e.greeting.at,
    duration: e.greeting.for,
    run,
    distance: e.slideX,
  })

  return (
    <View style={{ minHeight: dashHeights.hero, overflow: 'hidden' }}>
      {/*
        The branch enters from the top-right corner with its trunk at the edge.
        The render grows left-to-right from a trunk at its bottom-left, so it is
        mirrored rather than shipped twice — `scaleX: -1` on a 200kB PNG is free
        and a second copy is not. Same trick as the onboarding pages.

        Sized and placed to clear the *longest* greeting, not the shortest.
        "Good Morning," leaves room the branch could happily fill; "Good
        Afternoon," does not, and a branch drawn across the one line the page
        opens with is no longer decoration. It is pushed far enough right that
        the blossoms begin past the end of the longer word.
      */}
      <CardArt
        source={dashArt.sakura.source}
        ratio={dashArt.sakura.ratio}
        width={width * 0.56}
        style={{ top: -10, right: -58 }}
        animatedStyle={sakura}
      />

      {/*
        The landscape is mirrored too, which puts the pagoda on its right-hand
        side where the reference has it, with the ridge line running back to the
        left behind Shifu. It arrives with the branch rather than after it: they
        are one scene, and staggering them would draw attention to the fact that
        they are two files.
      */}
      <CardArt
        source={dashArt.pagoda.source}
        ratio={dashArt.pagoda.ratio}
        width={width * 0.78}
        style={{ bottom: 2, right: -36 }}
        animatedStyle={pagoda}
      />

      {/*
        Shifu is drawn at his full height and allowed to run past the bottom of
        the hero, where `overflow: hidden` cuts him off at the knee. That is the
        crop the reference shows, and cropping by container rather than shipping
        a pre-cropped render keeps the one asset usable at any hero height.
      */}
      <CardArt
        source={dashArt.shifu.source}
        ratio={dashArt.shifu.ratio}
        width={shifuWidth}
        style={{ bottom: -SHIFU_BLEED, right: width * 0.17 }}
        animatedStyle={shifu}
      />

      <Animated.View style={[{ paddingTop: s.xs }, greeting]}>
        <View>
          <Text className="font-nunito-extrabold" style={{ ...t.greeting, color: c.navy }}>
            {greetingLead}
          </Text>
          <Text className="font-nunito-extrabold" style={{ ...t.greeting, color: c.navy }}>
            {greetingTail},
          </Text>
          {/*
            The marker swipe under the name, not a rounded rectangle — tapered
            ends, bowed edges and a second lighter pass, drawn as SVG so one shape
            stretches to whatever length the learner's name happens to be.
          */}
          <BrushHighlight color={c.gold} bleedX={13} bleedTop={9} bleedBottom={7} fleck={false}>
            <Text
              className="font-handwritten"
              style={{ ...t.handwritten, color: c.navy, paddingHorizontal: 5 }}
            >
              {name}!
            </Text>
          </BrushHighlight>
        </View>
      </Animated.View>

      <SpeechBubble dueCount={dueCount} fallbackMessage={fallbackMessage} width={width} run={run} />
    </View>
  )
}

// --- Shifu's line -------------------------------------------------------------

/** A run of the message that shares one weight. */
interface Span {
  text: string
  bold?: boolean
}

/**
 * The line as spans rather than as a string.
 *
 * The due-word count is its own bold run because the number is the entire point
 * of the sentence and a learner should be able to read it without reading the
 * line. Keeping that structure through the typing is why this is an array: a
 * plain string would have to either lose the emphasis while typing or pop it in
 * at the end, and the second is worse than the first.
 */
function messageSpans(dueCount: number, fallbackMessage: string): Span[] {
  if (dueCount > 0) {
    return [
      { text: 'You have ' },
      { text: String(dueCount), bold: true },
      { text: `${dueCount === 1 ? ' word' : ' words'} waiting — let’s review them!` },
    ]
  }
  return [{ text: fallbackMessage }]
}

/** The first `count` characters, with each span cut at its own boundary. */
function revealSpans(spans: Span[], count: number): Span[] {
  const shown: Span[] = []
  let left = count

  for (const span of spans) {
    if (left <= 0) break
    shown.push({ ...span, text: span.text.slice(0, left) })
    left -= span.text.length
  }

  return shown
}

function SpanRuns({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((span, i) => (
        <Fragment key={i}>
          {span.bold ? (
            <Text className="font-nunito-extrabold">{span.text}</Text>
          ) : (
            <Text>{span.text}</Text>
          )}
        </Fragment>
      ))}
    </>
  )
}

/**
 * Shifu's line, in a bubble to his left.
 *
 * The typing is drawn over a full-length copy of the same text held at zero
 * opacity. That copy is doing real work: without it the bubble would grow line
 * by line as the sentence arrived, and since the bubble is the last thing in
 * the hero's flow, every card underneath would be shunted down the page in
 * step with the typing. Reserving the final height first means only the letters
 * move.
 */
function SpeechBubble({
  dueCount,
  fallbackMessage,
  width,
  run,
}: {
  dueCount: number
  fallbackMessage: string
  width: number
  run: number
}) {
  const bubble = useReveal({
    from: 'bottom',
    at: e.bubble.at,
    duration: e.bubble.for,
    run,
    distance: 12,
    withScale: true,
  })

  const spans = messageSpans(dueCount, fallbackMessage)
  const full = spans.map((span) => span.text).join('')
  const typed = useTypewriter(full.length, run)

  const line = { ...t.bubble, color: c.navy } as const

  return (
    <Animated.View style={[{ marginTop: 18, width: Math.min(186, width * 0.5) }, bubble]}>
      <View>
        <View
          style={{
            backgroundColor: c.card,
            borderRadius: 18,
            paddingHorizontal: s.lg,
            paddingVertical: 14,
            ...dashShadow,
          }}
        >
          <Text className="font-nunito-bold" style={{ fontSize: 14.5, color: c.coral, marginBottom: 6 }}>
            Nǐ hǎo! 👋
          </Text>

          <View>
            {/* The sizer. Hidden from assistive tech, which reads the line below. */}
            <Text
              className="font-nunito-semibold"
              style={{ ...line, opacity: 0 }}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <SpanRuns spans={spans} />
            </Text>

            {/* `left`/`right` at 0 rather than a width, so this copy wraps at
                exactly the same points the sizer does. */}
            <Text
              className="font-nunito-semibold"
              style={{ ...line, position: 'absolute', left: 0, right: 0, top: 0 }}
              accessibilityLabel={full}
            >
              <SpanRuns spans={revealSpans(spans, typed)} />
            </Text>
          </View>
        </View>

        {/*
          The tail, pointing at Shifu. A rotated square rather than a triangle, so
          it inherits the bubble's own fill and reads as part of the same shape;
          it sits slightly inside the right edge to hide the seam.
        */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: -5,
            top: 44,
            width: 15,
            height: 15,
            backgroundColor: c.card,
            transform: [{ rotate: '45deg' }],
          }}
        />
      </View>
    </Animated.View>
  )
}
