import { useState } from 'react'
import { View, Text, Image, ScrollView, Animated, useWindowDimensions, type ImageSourcePropType } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { dashColors as c, dashShadow, dashShadowLifted, DASH_CONTENT_MAX } from '../components/dashboard/tokens'
import { PressableScale } from '../components/dashboard/parts'
import { useEntranceRun, useReveal } from '../components/dashboard/entrance'
import { FEATURES } from '../lib/features'
import { WritingGuideModal } from '../components/WritingGuideModal'

/**
 * The Learn tab: a header over three cards (New Words, Books, Writing Basics),
 * built to the Beta 2.1 reference "NEW Learn Screen.png".
 *
 * **All three cards fit one screen, and fill it.** The card column is `flex: 1`
 * and each card takes an equal share, so the cards end at the tab bar on any
 * phone rather than stopping short (a band of bare paper) or running past it
 * (a scroll). What made the page scroll before was the text column: squeezed
 * to ~107pt, a description wrapped to six lines and pushed its card taller than
 * its share. The proportions below are measured off the reference — a 393pt
 * phone rendered at 2.39× — which gives the text ~135pt, enough for three lines.
 *
 * The artwork is cropped out of that same reference by
 * `scripts/processLearnArt.mjs`, so the screen uses the signed-off art rather
 * than stand-ins. Colours are the Dashboard's `dashColors` — this sits behind
 * the same tab bar as the Dashboard, Settings and Review and has to read as the
 * same app.
 *
 * With `FEATURES.lessons` off, the third card is Writing Basics (the existing
 * four-page primer); flipping the flag brings the Lessons Path card back.
 */

const ART = {
  newWords: require('../assets/images/learn/new-words.jpg'),
  books: require('../assets/images/learn/books.jpg'),
  writingBasics: require('../assets/images/learn/writing-basics.jpg'),
  scenery: require('../assets/images/learn/header-scenery.png'),
} as const
/** header-scenery.png's own pixel size. */
const SCENERY_RATIO = 286 / 350

/** Measured off the reference, in points at a 393pt width. */
const GUTTER = 22
const CARD_GAP = 16
const CARD_RADIUS = 26
/** Share of the card the illustration takes; the text starts just past it. */
const ART_SHARE = '42%'
const CHEVRON = 40
/** Soft sage the reference uses for the dash above each title and the corner wave. */
const SAGE = '#DDEBDA'
/**
 * Below this a card stops shrinking and the page scrolls instead — only
 * reached on a very short phone or at a large accessibility text size.
 */
const CARD_MIN = 118
/** Space under the last card, above the tab bar. */
const COLUMN_BOTTOM = 16

interface LearnCardDef {
  key: string
  title: string
  description: string
  art: ImageSourcePropType
  onPress: () => void
}

/**
 * One card: a full-bleed scene on the left, feathered into the card; a short
 * sage dash, the title and the description; a round chevron on the right.
 *
 * The whole card is the target — the chevron is decoration, not a second
 * button, so no `Pressable` nests inside `PressableScale`. `numberOfLines` is
 * never set on the description: it wraps rather than ending in an ellipsis.
 */
function LearnCard({ title, description, art, onPress, height }: Omit<LearnCardDef, 'key'> & { height?: number }) {
  return (
    // `wrapperStyle` carries the size because `PressableScale`'s animated
    // wrapper is the real flex child — sizing `style` alone does nothing.
    <PressableScale
      onPress={onPress}
      accessibilityLabel={`${title}. ${description}`}
      wrapperStyle={height !== undefined ? { height } : { flex: 1, minHeight: CARD_MIN }}
      style={{ flex: 1 }}
    >
      <View
        className="flex-1 flex-row items-center"
        style={{
          borderRadius: CARD_RADIUS,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.border,
          overflow: 'hidden',
          ...dashShadowLifted,
        }}
      >
        {/* The sage wave along the bottom-right, clipped by the card's own corner. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 280,
            height: 120,
            borderRadius: 140,
            right: -70,
            bottom: -64,
            backgroundColor: SAGE,
            opacity: 0.55,
          }}
        />

        {/*
          Full-bleed on three sides, so it reads as part of the card rather than
          a picture placed on it. The gradient feathers its right edge into the
          card, as the reference does, instead of ending on a hard line.
        */}
        <View style={{ width: ART_SHARE, alignSelf: 'stretch' }}>
          <Image source={art} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,253,252,0)', c.card]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '32%' }}
          />
        </View>

        <View className="flex-1" style={{ paddingLeft: 12, paddingRight: 8 }}>
          <View style={{ width: 22, height: 5, borderRadius: 3, backgroundColor: SAGE, marginBottom: 8 }} />
          <Text className="font-nunito-extrabold" style={{ fontSize: 20, lineHeight: 25, color: c.greenDark }}>
            {title}
          </Text>
          <Text className="mt-1 font-nunito-semibold" style={{ fontSize: 13.5, lineHeight: 18.5, color: c.textSecondary }}>
            {description}
          </Text>
        </View>

        <View
          className="items-center justify-center rounded-full"
          style={{ width: CHEVRON, height: CHEVRON, marginRight: 12, backgroundColor: c.greenSoft, ...dashShadow }}
        >
          <ChevronRight size={20} color={c.greenDark} strokeWidth={2.4} />
        </View>
      </View>
    </PressableScale>
  )
}

export function Learn() {
  const [showGuide, setShowGuide] = useState(false)
  /*
   * Each card is an explicit third of the room under the header. A flex split
   * alone let a card whose copy wraps to more lines grow past its share, so
   * the three came out uneven; one computed height is equal by construction.
   *
   * Measured from the viewport and the header — never from the card column,
   * whose height the cards themselves can inflate. Neither input depends on
   * the cards, so the sum can't feed back into itself.
   */
  const [viewportHeight, setViewportHeight] = useState<number | null>(null)
  const [headerHeight, setHeaderHeight] = useState<number | null>(null)
  const cardHeight =
    viewportHeight !== null && headerHeight !== null
      ? Math.max(CARD_MIN, Math.floor((viewportHeight - headerHeight - COLUMN_BOTTOM - CARD_GAP * 2) / 3))
      : undefined
  const settle = (set: (fn: (prev: number | null) => number | null) => void) => (h: number) =>
    set((prev) => (prev !== null && Math.abs(prev - h) < 1 ? prev : h))
  const { width: windowWidth } = useWindowDimensions()
  const columnWidth = Math.min(windowWidth, DASH_CONTENT_MAX)
  /* 286/941 of the reference's width, bleeding off the top-right edge. */
  const sceneryWidth = columnWidth * 0.34

  /* One calm arrival, replayed on every return to the tab — the same engine
     the Dashboard uses, just a single piece rather than a staged score. */
  const run = useEntranceRun()
  const page = useReveal({ from: 'bottom', at: 0, duration: 420, run, distance: 22 })

  const cards: LearnCardDef[] = [
    {
      key: 'new-words',
      title: 'New Words',
      description: 'Learn useful Chinese words with clear examples and audio.',
      art: ART.newWords,
      onPress: () => router.push('/new-words'),
    },
    {
      key: 'books',
      title: 'Books',
      description: 'Read Chinese stories, articles and classics to build your skills.',
      art: ART.books,
      onPress: () => router.push('/books'),
    },
    FEATURES.lessons
      ? {
          key: 'lessons',
          title: 'Lessons Path',
          description: 'Follow a structured path from beginner to advanced.',
          art: ART.writingBasics,
          onPress: () => router.push('/lessons'),
        }
      : {
          key: 'writing-basics',
          title: 'Writing Basics',
          description: 'How Chinese characters are built, one stroke at a time.',
          art: ART.writingBasics,
          onPress: () => setShowGuide(true),
        },
  ]

  return (
    <SafeAreaView edges={['top']} className="flex-1" style={{ backgroundColor: c.background }}>
      {/*
        Out of flow and behind everything, so it costs the layout nothing and
        can run off the screen's edge as the reference's does.
      */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          right: Math.max(0, (windowWidth - columnWidth) / 2),
          width: sceneryWidth,
          height: sceneryWidth / SCENERY_RATIO,
        }}
      >
        <Image source={ART.scenery} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
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
        <Animated.View style={[{ width: columnWidth, flexGrow: 1 }, page]}>
          <View style={{ flexGrow: 1, paddingHorizontal: GUTTER }}>
            <View
              style={{ paddingTop: 22, paddingBottom: 26 }}
              onLayout={(e) => settle(setHeaderHeight)(e.nativeEvent.layout.height)}
            >
              <Text className="font-nunito-extrabold" style={{ fontSize: 44, lineHeight: 50, color: c.greenDark }}>
                Learn
              </Text>
              <Text className="mt-1 font-nunito-semibold" style={{ fontSize: 16, lineHeight: 22, color: c.textSecondary }}>
                Choose what you want to study today.
              </Text>
            </View>

            <View style={{ flex: 1, gap: CARD_GAP, paddingBottom: COLUMN_BOTTOM }}>
              {cards.map(({ key, ...card }) => (
                <LearnCard key={key} {...card} height={cardHeight} />
              ))}
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {showGuide && <WritingGuideModal onClose={() => setShowGuide(false)} />}
    </SafeAreaView>
  )
}
