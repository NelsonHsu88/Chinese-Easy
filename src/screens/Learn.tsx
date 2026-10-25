import { useEffect, useState } from 'react'
import { View, Text, Image, ScrollView, Animated, useWindowDimensions, type ImageSourcePropType } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { dashColors as c, DASH_CONTENT_MAX } from '../components/dashboard/tokens'
/* The card surface is Review's own, imported rather than copied, so the two
   tabs' cards can never drift apart: ivory, a hairline, the same corner, the
   same barely-there shadow, the same type. */
import { revColors, revEntrance, revRadius, revShadow, revType } from '../components/review/tokens'
import { RefHero, SHIFU_BUBBLE_REF_WIDTH, ShifuBubble, refScale, refY, shifuBubbleFontSize } from '../components/refScene'
import { CLOUDS_MANY } from '../components/AmbientClouds'
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
 * Basic redesign.png", restyled as the Review tab's sibling: every card is
 * Review's plain ivory card (`revColors.card`, hairline, `revRadius.large`),
 * and each card's own colour is only its painting and the soft chevron disc in
 * its hue (sage, blossom, sky). The reference's back arrow is left out — this
 * is tab content, with nothing behind it to go back to.
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

/* "SS1017 New APP DesIGN UI (4)", cut by `processAppDesignArt.mjs`. */
const ART = {
  hero: require('../assets/images/app/learn-hero.png'),
  foot: require('../assets/images/learn/foot.png'),
  newWords: require('../assets/images/app/learn-new-words.png'),
  books: require('../assets/images/app/learn-books.png'),
  basics: require('../assets/images/app/learn-basics.png'),
} as const
/** Each asset's own pixel size, as width / height. */
const HERO_RATIO = 783 / 518
const FOOT_RATIO = 995 / 150
/** The mockup's bubble: left edge, top, width (its pixels). */
const BUBBLE_REF = { left: 86, top: 392, width: SHIFU_BUBBLE_REF_WIDTH } as const
/** Where the mockup's first card starts (its pixels). */
const CARDS_TOP_REF = 646

/** Measured off the reference (995px wide, a 430pt column). */
const GUTTER = 22
const CARD_GAP = 12
const CARD_RADIUS = revRadius.large
/**
 * Share of the card the illustration takes. The mockup's is 45% (400 of 887),
 * but that leaves a 360pt phone's text column too narrow for "Chinese Basics"
 * on one line; 40% keeps the scene the dominant half and the copy at three lines.
 */
const ART_SHARE = '42%'
/** Review's chevron disc. */
const CHEVRON = 38
/**
 * Card type is designed for a 430pt column and scales down with it (to at
 * most 84%) rather than wrapping: at the designed size a 360pt phone wraps
 * every title and runs the descriptions past the card.
 */
const DESIGN_COLUMN = 430
const TYPE_SCALE_MIN = 0.84
/** The designed card, and the range it may grow or shrink to fill the screen. */
const CARD_COUNT = 3
const CARD_MIN = 100
const CARD_MAX = 148
/** Last resort before the page scrolls, reached only on a very short screen. */
const CARD_FLOOR = 84
/** Least space kept under the last card, above the tab bar. */
const COLUMN_BOTTOM = 12
/** Viewport heights below this drop the speech bubble. */
const COMPACT_BELOW = 640

/** The title and two-line subtitle's height at the top of the header, as laid out below. */
const TITLE_BLOCK = PAGE_TITLE_TOP + 10 + PAGE_TITLE.lineHeight + 4 + PAGE_SUBTITLE.lineHeight * 2
/** Least space between the subtitle and the bubble. */
const BUBBLE_MIN_GAP = 8

const SHIFU_LINE = "Every character opens a new world. Let's learn together!"

interface LearnCardDef {
  key: string
  /** Where Shifu's Learn guide points (`lib/screenTours.ts`). */
  tourId: TourTargetId
  title: string
  description: string
  art: ImageSourcePropType
  onPress: () => void
}

/**
 * One card: the scene on the left, feathered into the card; the title and
 * description; a grey chevron on the right.
 *
 * The whole card is the target — the chevron is decoration, not a second
 * button, so no `Pressable` nests inside `PressableScale`. `numberOfLines` is
 * never set on the description: it wraps rather than ending in an ellipsis.
 */
function LearnCard({
  title,
  description,
  art,
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
      <ShadowSurface shadow={revShadow}
        style={[{ flex: 1, flexDirection: 'row', alignItems: 'center' }, {
          borderRadius: CARD_RADIUS,
          backgroundColor: revColors.card,
          borderWidth: 1,
          borderColor: revColors.border,
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
          {/* `cover` crops the painting's own soft edge; this fades its right
              side into the ivory card, so it never ends in a hard cut. */}
          <LinearGradient
            pointerEvents="none"
            colors={[`${revColors.card}00`, revColors.card]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', top: 0, bottom: 0, right: -1, width: '40%' }}
          />
        </View>

        <View className="flex-1" style={{ paddingLeft: 8, paddingRight: 8 }}>
          {/* Sized so "Chinese Basics" fits one line at 360pt; never truncated. */}
          <Text
            className="font-nunito-extrabold"
            style={{ fontSize: 19.5 * scale, lineHeight: 24 * scale, letterSpacing: revType.cardTitle.letterSpacing, color: revColors.navy }}
          >
            {title}
          </Text>
          {/* Review's description: Nunito SemiBold in slate. */}
          <Text
            className="font-nunito-semibold"
            style={{
              marginTop: 3,
              fontSize: revType.cardBody.fontSize * scale,
              lineHeight: revType.cardBody.lineHeight * scale,
              color: revColors.slate,
            }}
          >
            {description}
          </Text>
        </View>

        <View
          className="items-center justify-center"
          style={{ width: chevron, height: chevron, marginRight: Math.round(20 * scale) }}
        >
          <ChevronRight size={Math.round(20 * scale)} color={revColors.slate} strokeWidth={2.4} />
        </View>
      </ShadowSurface>
    </PressableScale>
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
   * The hero is the mockup's whole landscape, laid across the column. The
   * header is as tall as the mockup's, so the first card starts where it does
   * there, and the bubble sits exactly on the patch the script masked out.
   */
  const k = refScale(columnWidth)
  const headerMin = refY(CARDS_TOP_REF, columnWidth)
  /*
   * The bubble follows the subtitle in flow, nudged down to where the mockup
   * has it. In flow, not absolute: the painting shrinks with the column but the
   * type doesn't, so on a 320pt phone an absolute bubble landed on the subtitle.
   */
  const bubble = {
    left: (BUBBLE_REF.left - 40) * k - GUTTER,
    gap: Math.max(BUBBLE_MIN_GAP, refY(BUBBLE_REF.top, columnWidth) - TITLE_BLOCK),
    width: BUBBLE_REF.width * k,
  }

  /* One calm arrival, replayed on every return to the tab, on Review's own
     beat (`revEntrance`): the page rises, the painting drifts in from the
     right, everything at once, with no card-by-card stagger. */
  const run = useEntranceRun()
  const page = useReveal({ from: 'bottom', at: revEntrance.at, duration: revEntrance.for, run, distance: revEntrance.slideY })
  const hero = useReveal({ from: 'right', at: revEntrance.at, duration: revEntrance.for, run, distance: revEntrance.slideX })
  /* The cards and the bubble are raised surfaces inside that fade: their
     shadows settle in behind them on this value (`ShadowSurface`) instead of
     showing at full strength before the cards do, as Android drew them. */
  const shadowArrival = useShadowReveal({ at: revEntrance.at, duration: revEntrance.for, run })

  /*
   * The cards are sized from two measurements (viewport and header), which
   * land a frame or two after mount. Shown before then, the cards drew at a
   * guessed height and snapped to the real one mid-arrival. So the column
   * waits, invisible, for them, with a short backstop, since `onLayout`
   * doesn't always fire on web (see Animation in CLAUDE.md).
   */
  const [measured, setMeasured] = useState(false)
  const sized = viewportHeight !== null && headerHeight !== null
  useEffect(() => {
    if (sized) setMeasured(true)
  }, [sized])
  useEffect(() => {
    const backstop = setTimeout(() => setMeasured(true), 250)
    return () => clearTimeout(backstop)
  }, [])

  const cards: LearnCardDef[] = [
    {
      key: 'new-words',
      tourId: 'learn-new-words',
      title: 'New Words',
      description: 'Learn useful Chinese words with clear examples and audio.',
      art: ART.newWords,
      onPress: () => router.push('/new-words'),
    },
    {
      key: 'books',
      tourId: 'learn-books',
      title: 'Books',
      description: 'Read Chinese stories, articles and classics to build your skills.',
      art: ART.books,
      onPress: () => router.push('/books'),
    },
    FEATURES.lessons
      ? {
          key: 'lessons',
          tourId: 'learn-third',
          title: 'Lessons Path',
          description: 'Follow a structured path from beginner to advanced.',
          art: ART.basics,
          onPress: () => router.push('/lessons'),
        }
      : {
          key: 'chinese-basics',
          tourId: 'learn-third',
          title: 'Chinese Basics',
          description: 'Start from zero and build a strong foundation.',
          art: ART.basics,
          onPress: () => router.push('/basics'),
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
        <View style={{ width: columnWidth, flexGrow: 1, paddingHorizontal: GUTTER, opacity: measured ? 1 : 0 }}>
          <View
            style={{ minHeight: compact ? undefined : headerMin }}
            onLayout={(e) => settle(setHeaderHeight)(e.nativeEvent.layout.height)}
          >
            <RefHero source={ART.hero} ratio={HERO_RATIO} column={columnWidth} left={-GUTTER} animatedStyle={hero} clouds={CLOUDS_MANY} />

            <Animated.View style={[{ paddingTop: compact ? 12 : PAGE_TITLE_TOP + 10, paddingBottom: compact ? 16 : 0 }, page]} needsOffscreenAlphaCompositing>
              {/* Lora Bold in navy, matching the Review, Challenges, My Words and Dictionary headings. */}
              <Text className="font-nunito-extrabold" accessibilityRole="header" style={{ ...PAGE_TITLE, color: c.navy }}>
                Learn
              </Text>
              <Text className="font-nunito-semibold" style={{ ...PAGE_SUBTITLE, marginTop: 4, color: c.textSecondary }}>
                Choose your path and{'\n'}make progress today.
              </Text>

            </Animated.View>
            {!compact && (
              <Animated.View style={[{ marginLeft: bubble.left, marginTop: bubble.gap, marginBottom: 8, alignSelf: 'flex-start' }, page]}>
                <ShifuBubble message={SHIFU_LINE} width={bubble.width} fontSize={shifuBubbleFontSize(columnWidth)} />
              </Animated.View>
            )}
          </View>

          <Animated.View style={[{ gap: CARD_GAP, paddingBottom: COLUMN_BOTTOM }, page]} needsOffscreenAlphaCompositing>
            {cards.map(({ key, tourId, ...card }) => (
              <TourTarget key={key} id={tourId} radius={CARD_RADIUS}>
                <LearnCard {...card} height={cardHeight} scale={typeScale} />
              </TourTarget>
            ))}
          </Animated.View>
        </View>
        </ShadowRevealProvider>
      </ScrollView>

    </SafeAreaView>
  )
}

