import { Fragment, useState } from 'react'
import { View, Text, Animated, type LayoutChangeEvent } from 'react-native'
import { BrushHighlight } from '../BrushHighlight'
import { CardArt, StreakPill } from './parts'
import { homeArt, FIRE_ICON, HERO_SHIFU } from './art'
import { useReveal, useTypewriter } from './entrance'
import { revealedShadow, useShadowReveal } from '../shadowReveal'
import {
  dashColors,
  dashShadow,
  dashEntrance as e,
  homeColors as c,
  homeType as t,
  homeLayout as l,
  HOME_REF_WIDTH,
} from './tokens'

/*
 * The greeting scene, built to "SS1012 Home Page Redesign UI 2".
 *
 * Shifu, the sun, the range, the pagoda and the blossom branch are one painting cut
 * from the mockup (`homeArt.hero`), placed at the mockup's own offsets scaled
 * to the column — so the scene sits where the reference painted it at any
 * width. Only the greeting and the bubble are in flow; the painting costs no
 * layout height beyond the hero's own, which is the painting's foot.
 *
 * The bubble is drawn over the painting's left edge, where the script masked
 * the reference's own bubble out, and its tail points at Shifu's mouth: the
 * painting is lowered until his mouth is level with the bubble's middle.
 *
 * Behind it all lies a backdrop (`homeArt.heroBackdrop`), the word card's range
 * mirrored, so the misty scenery runs the hero's whole width and the greeting
 * sits in the landscape rather than beside it.
 */
export function HomeHero({
  greetingLead,
  greetingTail,
  name,
  dueCount,
  fallbackMessage,
  columnWidth,
  streak,
  onStreakPress,
  run,
}: {
  greetingLead: string
  greetingTail: string
  name: string
  dueCount: number
  /** Used when there are no due words — the rotating Shifu line. */
  fallbackMessage: string
  /** The full column, margins included: the painting runs to its right edge. */
  columnWidth: number
  streak: number
  onStreakPress: () => void
  /** Ticks on every focus; restarts the entrance. */
  run: number
}) {
  const k = columnWidth / HOME_REF_WIDTH
  const art = homeArt.hero.box
  const backdrop = homeArt.heroBackdrop.box

  /*
   * Where the bubble's middle sits, measured once laid out. Until then, an
   * estimate from the greeting's fixed type (and the bubble at three lines),
   * which is also what stands if `onLayout` never fires on web.
   */
  const [bubbleMid, setBubbleMid] = useState<number | null>(null)
  const estimatedMid = HERO_TOP + t.greeting.lineHeight * 2 + 4 + t.name.lineHeight + BUBBLE_GAP + 34
  const mid = bubbleMid ?? estimatedMid
  const onBubbleLayout = (event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout
    const next = Math.round(y + height / 2)
    if (next !== bubbleMid) setBubbleMid(next)
  }

  /* Lowered (never raised past the mockup's spot) until Shifu's mouth meets the bubble. */
  const artTop = Math.max(art.y * k, mid - HERO_SHIFU.mouthY * k)
  const artLeft = columnWidth - art.w * k
  /* The bubble runs up to just short of Shifu's face, so its tail nearly touches his cheek. */
  const bubbleWidth = Math.max(150, artLeft + HERO_SHIFU.faceX * k - (l.screen + l.heroInset) - 12)

  /* The backdrop spans the column and rests on the hero's foot, under the painting. */
  const backdropWidth = columnWidth * 1.05

  const scene = useReveal({ from: 'bottom', at: e.scenery.at, duration: e.shifu.for, run, distance: 18 })
  const greeting = useReveal({ from: 'left', at: e.greeting.at, duration: e.greeting.for, run, distance: e.slideX })
  const pill = useReveal({ from: 'right', at: e.greeting.at, duration: e.greeting.for, run, distance: e.slideX })

  return (
    <View style={{ minHeight: artTop + art.h * k, overflow: 'hidden' }}>
      {/* Faded, so the greeting over it still reads as ink on paper. */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: BACKDROP_OPACITY }}>
        <CardArt
          source={homeArt.heroBackdrop.source}
          ratio={backdrop.w / backdrop.h}
          width={backdropWidth}
          style={{ bottom: 0, left: -columnWidth * 0.08 }}
          animatedStyle={scene}
        />
      </View>

      <CardArt
        source={homeArt.hero.source}
        ratio={art.w / art.h}
        width={art.w * k}
        style={{ top: artTop, right: 0 }}
        animatedStyle={scene}
      />

      <Animated.View style={[{ position: 'absolute', top: 10, right: l.screen }, pill]}>
        <StreakPill streak={streak} icon={FIRE_ICON} onPress={onStreakPress} />
      </Animated.View>

      <View style={{ paddingLeft: l.screen + l.heroInset, paddingTop: HERO_TOP, paddingBottom: 16 }}>
        <Animated.View style={greeting}>
          <Text className="font-lora-bold" style={{ ...t.greeting, color: c.ink }}>
            {greetingLead}
          </Text>
          <Text className="font-lora-bold" style={{ ...t.greeting, color: c.ink }}>
            {greetingTail},
          </Text>
          <View style={{ marginTop: 4 }}>
            <BrushHighlight color={dashColors.gold} bleedX={12} bleedTop={10} bleedBottom={7} fleck={false}>
              <Text className="font-handwritten" style={{ ...t.name, color: c.ink, paddingHorizontal: 4 }}>
                {name}!
              </Text>
            </BrushHighlight>
          </View>
        </Animated.View>

        <SpeechBubble
          dueCount={dueCount}
          fallbackMessage={fallbackMessage}
          width={bubbleWidth}
          run={run}
          onLayout={onBubbleLayout}
        />
      </View>
    </View>
  )
}

/** Above the greeting's first line. */
const HERO_TOP = 30
/** Between the name and the bubble. */
const BUBBLE_GAP = 16
/** The backdrop is scenery, not subject: present, but well behind Shifu and the type. */
const BACKDROP_OPACITY = 0.55

// --- Shifu's line -------------------------------------------------------------

/** A run of the message that shares one weight. */
interface Span {
  text: string
  bold?: boolean
}

/** The due count is its own bold run: the number is the point of the sentence. */
function messageSpans(dueCount: number, fallbackMessage: string): Span[] {
  if (dueCount > 0) {
    return [
      { text: 'You have ' },
      { text: String(dueCount), bold: true },
      { text: `${dueCount === 1 ? ' word' : ' words'} ready to review!` },
    ]
  }
  return [{ text: fallbackMessage }]
}

/**
 * The whole message, with everything past the first `typed` characters drawn
 * transparent. Every character is laid out from the first frame, so a word
 * being typed never starts on one line and jumps to the next.
 */
function TypedRuns({ spans, typed }: { spans: Span[]; typed: number }) {
  let start = 0
  return (
    <>
      {spans.map((span, i) => {
        const cut = Math.max(0, Math.min(span.text.length, typed - start))
        start += span.text.length
        const shown = span.text.slice(0, cut)
        const hidden = span.text.slice(cut)
        const font = span.bold ? 'font-lora-bold' : 'font-lora'
        const ink = span.bold ? c.ink : undefined
        return (
          <Fragment key={i}>
            {shown ? (
              <Text className={font} style={ink ? { color: ink } : undefined}>
                {shown}
              </Text>
            ) : null}
            {hidden ? (
              <Text className={font} style={{ color: 'transparent' }}>
                {hidden}
              </Text>
            ) : null}
          </Fragment>
        )
      })}
    </>
  )
}

/** How far the tail's square is inset into the bubble, so only its point shows. */
const TAIL = 13

/**
 * Shifu's line, typed on.
 *
 * It used to type a growing copy over a hidden full-length one. The two wrapped
 * differently — a half-typed word fits on a line its whole self doesn't — so
 * words jumped between lines as they appeared, and the bold count could sit a
 * hair off the line beside it. Now it is one paragraph whose untyped tail is
 * transparent: laid out once, final height from the start, nothing moves.
 */
function SpeechBubble({
  dueCount,
  fallbackMessage,
  width,
  run,
  onLayout,
}: {
  dueCount: number
  fallbackMessage: string
  width: number
  run: number
  onLayout: (event: LayoutChangeEvent) => void
}) {
  const bubble = useReveal({ from: 'bottom', at: e.bubble.at, duration: e.bubble.for, run, distance: 12, withScale: true })
  const shadowProgress = useShadowReveal({ at: e.bubble.at, duration: e.bubble.for, run })

  const spans = messageSpans(dueCount, fallbackMessage)
  const full = spans.map((span) => span.text).join('')
  const typed = useTypewriter(full.length, run)
  const line = { ...t.bubble, color: c.subtle } as const

  return (
    <Animated.View style={[{ marginTop: BUBBLE_GAP, width }, bubble]} needsOffscreenAlphaCompositing onLayout={onLayout}>
      <Animated.View
        style={{
          backgroundColor: c.white,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: c.bubbleBorder,
          paddingHorizontal: 15,
          paddingVertical: 12,
          ...revealedShadow(dashShadow, shadowProgress),
        }}
      >
        <Text className="font-lora" style={line} accessibilityLabel={full}>
          <TypedRuns spans={spans} typed={typed} />
        </Text>

        {/*
          The tail: a square turned 45°, bordered on the two sides that face
          out, so its point carries the bubble's hairline round to Shifu.
        */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: -TAIL / 2 - 1,
            top: '50%',
            marginTop: -TAIL / 2,
            width: TAIL,
            height: TAIL,
            backgroundColor: c.white,
            borderTopWidth: 1,
            borderRightWidth: 1,
            borderColor: c.bubbleBorder,
            transform: [{ rotate: '45deg' }],
          }}
        />
      </Animated.View>
    </Animated.View>
  )
}
