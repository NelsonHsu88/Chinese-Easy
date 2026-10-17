import { useState, type ReactNode } from 'react'
import { View, Text, Image, ScrollView, Animated, useWindowDimensions, type ImageSourcePropType } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { dashColors as c, dashShadow, DASH_CONTENT_MAX, playTints, type PlayTint } from '../components/dashboard/tokens'
import { WritingGuideModal } from '../components/WritingGuideModal'
import { PressableScale } from '../components/dashboard/parts'
import { useEntranceRun, useReveal } from '../components/dashboard/entrance'
import { FEATURES } from '../lib/features'
import { TourTarget } from '../components/tour/targets'
import type { TourTargetId } from '../lib/tour'
import { ShadowRevealProvider, ShadowSurface, useShadowReveal } from '../components/shadowReveal'
import { PAGE_SUBTITLE, PAGE_TITLE, PAGE_TITLE_TOP } from '../components/pageHeader'

/**
 * The Learn tab: a header with Shifu and his line, over four cards (New Words,
 * Books, Chinese Basics, Writing Guide), built to "SS1017 Learn and Chinese
 * Basic redesign.png" — each card in its own `playTints` wash (jade, blossom,
 * sky, honey) with a chevron disc in the same hue. The reference's back arrow is left out — this is tab
 * content, with nothing behind it to go back to.
 *
 * **The whole page fits one screen and never scrolls.** Each card is an
 * explicit third of whatever the viewport leaves under the header (measured,
 * not estimated), clamped to `CARD_MIN`…`CARD_MAX`, with room kept underneath
 * for the foot painting. On a short screen the foot gives up its room first,
 * then the cards shrink to `CARD_FLOOR`, and below `COMPACT_BELOW` the speech
 * bubble is dropped — decoration goes before anything the learner taps. The
 * ScrollView stays only as a last resort at a large accessibility text size.
 *
 * The hero and foot are cropped by `scripts/processLearnArt.mjs` and keyed
 * against `dashColors.background`. The card scenes are the `tinted/` copies
 * (`scripts/processTintedArt.mjs`), whose paper takes each card's wash.
 *
 * With `FEATURES.lessons` off, the third card is Chinese Basics (the beginner
 * course at `/basics`, which also holds the old writing primer); flipping the
 * flag brings the Lessons Path card back.
 */

const ART = {
  hero: require('../assets/images/learn/hero.png'),
  foot: require('../assets/images/learn/foot.png'),
  newWords: require('../assets/images/tinted/learn-new-words.png'),
  books: require('../assets/images/tinted/learn-books.png'),
  writingBasics: require('../assets/images/tinted/learn-writing-basics.png'),
  characters: require('../assets/images/tinted/basics-characters.png'),
  writingGuide: require('../assets/images/tinted/learn-writing-basics.png'),
} as const
/** Each asset's own pixel size, as width / height. */
const HERO_RATIO = 467 / 559
const FOOT_RATIO = 995 / 150
/** Hero width as a share of the column: 467 of the mockup's 995. */
const HERO_SHARE = 467 / 995

/** Measured off the reference (995px wide, a 430pt column). */
const GUTTER = 22
const CARD_GAP = 12
const CARD_RADIUS = 24
/**
 * Share of the card the illustration takes. The mockup's is 45% (400 of 887),
 * but that leaves a 360pt phone's text column too narrow for "Chinese Basics"
 * on one line; 40% keeps the scene the dominant half and the copy at three lines.
 */
const ART_SHARE = '40%'
const CHEVRON = 38
/**
 * Card type is designed for a 430pt column and scales down with it (to at
 * most 84%) rather than wrapping: at the designed size a 360pt phone wraps
 * every title and runs the descriptions past the card.
 */
const DESIGN_COLUMN = 430
const TYPE_SCALE_MIN = 0.84
/** How far the bubble may run behind the painting's feathered left edge. */
const BUBBLE_OVERLAP = 12

/** The designed card, and the range it may grow or shrink to fill the screen. */
const CARD_COUNT = 4
const CARD_MIN = 98
const CARD_MAX = 132
/** Last resort before the page scrolls, reached only on a very short screen. */
const CARD_FLOOR = 84
/** Least space kept under the last card, above the tab bar. */
const COLUMN_BOTTOM = 12
/** Viewport heights below this drop the speech bubble. */
const COMPACT_BELOW = 640

const SHIFU_LINE = "Every character opens a new world. Let's learn together!"

interface LearnCardDef {
  key: string
  /** Where Shifu's Learn guide points (`lib/screenTours.ts`). */
  tourId: TourTargetId
  title: string
  description: string
  art: ImageSourcePropType
  tint: PlayTint
  onPress: () => void
}

/**
 * One card: the scene on the left, feathered into the card; the title and
 * description; a soft round chevron on the right.
 *
 * The whole card is the target — the chevron is decoration, not a second
 * button, so no `Pressable` nests inside `PressableScale`. `numberOfLines` is
 * never set on the description: it wraps rather than ending in an ellipsis.
 */
function LearnCard({
  title,
  description,
  art,
  tint,
  onPress,
  height,
  scale,
}: Omit<LearnCardDef, 'key' | 'tourId'> & { height?: number; scale: number }) {
  const chevron = Math.round(CHEVRON * scale)
  return (
    // `wrapperStyle` carries the size because `PressableScale`'s animated
    // wrapper is the real flex child — sizing `style` alone does nothing.
    <PressableScale
      onPress={onPress}
      accessibilityLabel={`${title}. ${description}`}
      wrapperStyle={{ height: height ?? CARD_MIN }}
      style={{ flex: 1 }}
    >
      <ShadowSurface shadow={dashShadow}
        style={[{ flex: 1, flexDirection: 'row', alignItems: 'center' }, {
          borderRadius: CARD_RADIUS,
          backgroundColor: tint.fill,
          borderWidth: 1,
          borderColor: tint.border,
          overflow: 'hidden',
        }]}
      >
        {/*
          A sized box with the Image filling it — react-native-web does not
          apply `cover` to an absolutely stretched Image. The gradient feathers
          the right edge into the card in case `cover` crops the painting's own
          feather off.
        */}
        <View style={{ width: ART_SHARE, alignSelf: 'stretch' }}>
          <Image source={art} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
          <LinearGradient
            pointerEvents="none"
            colors={[`${tint.fill}00`, tint.fill]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '22%' }}
          />
        </View>

        <View className="flex-1" style={{ paddingLeft: 10, paddingRight: 6 }}>
          <Text
            className="font-lora-bold"
            style={{ fontSize: 19.5 * scale, lineHeight: 24 * scale, letterSpacing: -0.2, color: c.navy }}
          >
            {title}
          </Text>
          <Text
            className="font-lora"
            style={{ marginTop: 3, fontSize: 13 * scale, lineHeight: 17.5 * scale, color: c.textSecondary }}
          >
            {description}
          </Text>
        </View>

        <View
          className="items-center justify-center rounded-full"
          style={{ width: chevron, height: chevron, marginRight: Math.round(14 * scale), backgroundColor: tint.soft }}
        >
          <ChevronRight size={Math.round(20 * scale)} color={tint.ink} strokeWidth={2.4} />
        </View>
      </ShadowSurface>
    </PressableScale>
  )
}

/**
 * Shifu's line, the same soft editorial bubble as the Review hub's: a warm
 * fill, a drawn hairline, a faint shadow and a small tail pointing at him.
 */
function SpeechBubble({ message }: { message: string }) {
  return (
    <View>
      <ShadowSurface shadow={dashShadow}
        style={{
          backgroundColor: c.card,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: c.border,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <Text className="font-lora" style={{ fontSize: 14, lineHeight: 19.5, color: c.navy }}>
          {message}
        </Text>
      </ShadowSurface>
      {/* Drawn after the body so it covers the body's border where the two meet. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: -6,
          top: 24,
          width: 12,
          height: 12,
          backgroundColor: c.card,
          borderTopWidth: 1,
          borderRightWidth: 1,
          borderColor: c.border,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  )
}

export function Learn() {
  /*
   * Measured from the viewport and the header — never from the card column,
   * whose height the cards themselves set. Neither input depends on the cards,
   * so the sum can't feed back into itself.
   */
  const [viewportHeight, setViewportHeight] = useState<number | null>(null)
  const [headerHeight, setHeaderHeight] = useState<number | null>(null)
  const settle = (set: (fn: (prev: number | null) => number | null) => void) => (h: number) =>
    set((prev) => (prev !== null && Math.abs(prev - h) < 1 ? prev : h))

  const { width: windowWidth } = useWindowDimensions()
  const columnWidth = Math.min(windowWidth, DASH_CONTENT_MAX)
  const footHeight = columnWidth / FOOT_RATIO
  const typeScale = Math.max(TYPE_SCALE_MIN, Math.min(1, columnWidth / DESIGN_COLUMN))
  /*
   * Decided from the viewport alone: deciding it from the header would flip it
   * back the moment dropping the bubble made the header fit.
   */
  const compact = viewportHeight !== null && viewportHeight < COMPACT_BELOW

  let cardHeight: number | undefined
  if (viewportHeight !== null && headerHeight !== null) {
    const room = viewportHeight - headerHeight - CARD_GAP * (CARD_COUNT - 1)
    /* Enough under the cards for the foot's pagoda and treeline to show. */
    const roomy = (room - footHeight * 0.6) / CARD_COUNT
    cardHeight = Math.floor(
      roomy >= CARD_MIN
        ? Math.min(roomy, CARD_MAX)
        : Math.max(CARD_FLOOR, Math.min(CARD_MIN, (room - COLUMN_BOTTOM) / CARD_COUNT)),
    )
  }

  /*
   * The painting is anchored to the header's bottom right, so Shifu's robe
   * meets the first card wherever the text above wraps. Its height is capped by
   * the header's so a compact header shrinks him rather than pushing his head
   * up under the status bar.
   */
  const heroHeight = Math.min((columnWidth * HERO_SHARE) / HERO_RATIO, (headerHeight ?? Infinity) + 24)
  const heroWidth = heroHeight * HERO_RATIO
  /* In the padded column's coordinates: the painting's right edge is the column's. */
  const heroLeft = columnWidth - GUTTER - heroWidth
  const bubbleMax = heroLeft + BUBBLE_OVERLAP

  /* One calm arrival, replayed on every return to the tab — the page rises,
     the painting drifts in from the right, both at once as on Review. */
  const run = useEntranceRun()
  const page = useReveal({ from: 'bottom', at: 0, duration: 420, run, distance: 22 })
  const hero = useReveal({ from: 'right', at: 0, duration: 520, run, distance: 28 })
  /* The cards and the bubble are raised surfaces inside that fade: their
     shadows settle in behind them on this value (`ShadowSurface`) instead of
     showing at full strength before the cards do, as Android drew them. */
  const shadowArrival = useShadowReveal({ at: 0, duration: 420, run })
  const [showGuide, setShowGuide] = useState(false)

  const cards: LearnCardDef[] = [
    {
      key: 'new-words',
      tourId: 'learn-new-words',
      title: 'New Words',
      description: 'Learn useful Chinese words with clear examples and audio.',
      art: ART.newWords,
      tint: playTints.jade,
      onPress: () => router.push('/new-words'),
    },
    {
      key: 'books',
      tourId: 'learn-books',
      title: 'Books',
      description: 'Read Chinese stories, articles and classics to build your skills.',
      art: ART.books,
      tint: playTints.blossom,
      onPress: () => router.push('/books'),
    },
    FEATURES.lessons
      ? {
          key: 'lessons',
          tourId: 'learn-third',
          title: 'Lessons Path',
          description: 'Follow a structured path from beginner to advanced.',
          art: ART.writingBasics,
          tint: playTints.sky,
          onPress: () => router.push('/lessons'),
        }
      : {
          key: 'chinese-basics',
          tourId: 'learn-third',
          title: 'Chinese Basics',
          description: 'Start from zero and build a strong foundation.',
          art: ART.characters,
          tint: playTints.sky,
          onPress: () => router.push('/basics'),
        },
    {
      key: 'writing-guide',
      tourId: 'learn-writing',
      title: 'Writing Guide',
      description: 'Learn strokes, stroke order and practise your handwriting.',
      art: ART.writingGuide,
      tint: playTints.honey,
      onPress: () => setShowGuide(true),
    },
  ]

  return (
    <SafeAreaView edges={['top']} className="flex-1" style={{ backgroundColor: c.background }}>
      {/*
        The foot painting, out of flow and behind everything, so it costs the
        layout nothing: it shows in the room kept under the last card and runs
        behind the cards' corners on a short screen.
      */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 0,
          left: Math.max(0, (windowWidth - columnWidth) / 2),
          width: columnWidth,
          height: footHeight,
        }}
      >
        <Image source={ART.foot} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
        /* iOS bounces a vertical ScrollView even when its content fits, which
           makes a page that fits feel like one that scrolls. */
        alwaysBounceVertical={false}
        overScrollMode="never"
        /* The ScrollView's own frame is the visible viewport, whatever its content does. */
        onLayout={(e) => settle(setViewportHeight)(e.nativeEvent.layout.height)}
      >
        <ShadowRevealProvider value={shadowArrival}>
        <View style={{ width: columnWidth, flexGrow: 1, paddingHorizontal: GUTTER }}>
          <View onLayout={(e) => settle(setHeaderHeight)(e.nativeEvent.layout.height)}>
            <Animated.View
              pointerEvents="none"
              style={[{ position: 'absolute', right: -GUTTER, bottom: 0 }, hero]}
            >
              <Image source={ART.hero} resizeMode="contain" style={{ width: heroWidth, height: heroHeight }} />
            </Animated.View>

            <Animated.View style={[{ paddingTop: compact ? 12 : PAGE_TITLE_TOP, paddingBottom: compact ? 16 : 18 }, page]} needsOffscreenAlphaCompositing>
              {/* Lora Bold in navy, matching the Review, Challenges, My Words and Dictionary headings. */}
              <Text className="font-lora-bold" accessibilityRole="header" style={{ ...PAGE_TITLE, color: c.navy }}>
                Learn
              </Text>
              <Text className="font-lora" style={{ ...PAGE_SUBTITLE, marginTop: 4, color: c.textSecondary }}>
                Choose what you want{'\n'}to study today.
              </Text>

              {!compact && (
                <View style={{ marginTop: 16, maxWidth: bubbleMax, alignSelf: 'flex-start' }}>
                  <SpeechBubble message={SHIFU_LINE} />
                </View>
              )}
            </Animated.View>
          </View>

          <Animated.View style={[{ gap: CARD_GAP, paddingBottom: COLUMN_BOTTOM }, page]} needsOffscreenAlphaCompositing>
            {cards.map(({ key, tourId, ...card }, i) => (
              <CardArrival key={key} index={i} run={run}>
                <TourTarget id={tourId} radius={CARD_RADIUS}>
                  <LearnCard {...card} height={cardHeight} scale={typeScale} />
                </TourTarget>
              </CardArrival>
            ))}
          </Animated.View>
        </View>
        </ShadowRevealProvider>
      </ScrollView>

      {showGuide && <WritingGuideModal onClose={() => setShowGuide(false)} />}
    </SafeAreaView>
  )
}

/** Each card follows the page up a beat after the one above it. */
function CardArrival({ index, run, children }: { index: number; run: number; children: ReactNode }) {
  const style = useReveal({ from: 'bottom', at: 90 + index * 70, duration: 380, run, distance: 16 })
  return <Animated.View style={style}>{children}</Animated.View>
}
