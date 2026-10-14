import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, Animated, Image, useWindowDimensions } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, Stack } from 'expo-router'
import { BookOpen, ChevronLeft, ChevronRight, Lock } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { STORIES } from '../data/stories'
import type { Story, StoryCollection } from '../types'
import { displayTitleReading, hanziFont } from '../lib/hanzi'
import { forScript } from '../lib/scriptConversion'
import { playTapSound } from '../lib/sound'
import { tapHaptic, tickHaptic } from '../lib/haptics'
import { useEntranceRun, useReveal } from '../components/dashboard/entrance'
import { FIRE_ICON } from '../components/dashboard/art'
import { StoryArt } from '../components/reading/StoryArt'
import { formatCount, levelBand, progressPercent } from '../components/reading/storyPresentation'
import { bookColors as c, BOOK_CONTENT_MAX, COVER_RATIO } from '../components/book/tokens'
import { AppBannerAd } from '../components/ads/AppBannerAd'
import { Asset } from 'expo-asset'
import { ShadowRevealProvider, ShadowSurface, useShadowReveal } from '../components/shadowReveal'
import { PAGE_TITLE } from '../components/pageHeader'

/*
 * The Reading Library, built to the Beta 2.1 reference
 * (`SS103 Redesigned Library Cover Art.png`, minus the Chinese line under the
 * title, by request): a painted header, one row of
 * outlined shelf chips, then the library as three shelves — Beginner,
 * Intermediate, Advanced — stacked so all three fit the screen at once. Each
 * shelf swipes sideways through its books, a card at a time, with the next one
 * peeking in from the right so it is plain there is more.
 *
 * Every book wears the same general cover (`StoryArt`); the title, reading and
 * English beside it are what tell them apart.
 *
 * Tapping a card opens the story on its cover (see StoryReader / BookCover).
 * Light-only, like the rest of the reading design.
 */

/** The shelves, short-labelled for the chip row. */
const SHELVES: { id: StoryCollection | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'everyday', label: 'Everyday' },
  { id: 'folk-tales', label: 'Folk Tales' },
  { id: 'chengyu', label: 'Chengyu' },
  { id: 'festival-legends', label: 'Festival' },
  { id: 'classical-myths', label: 'Myths' },
]

const BANDS = [
  { id: 'beginner', hsk: 1 },
  { id: 'intermediate', hsk: 3 },
  { id: 'advanced', hsk: 5 },
] as const

const EDGE = 18
/** How much of the next card shows at the right edge of a shelf. */
const PEEK = 34
const CARD_GAP = 12
const CARD_PAD = 10

/**
 * Everything above the shelves: top bar, title block, chip row. Estimated from
 * the styles below — re-measure if the header changes height, or the shelves
 * will over- or under-fill the screen.
 */
const TITLE_H = 58
const CHROME = 44 + TITLE_H + 66
/** A shelf's heading line, and the gap under its row of cards. */
const HEADING_H = 34
const ROW_GAP = 14
/** Card heights: below MIN the screen scrolls rather than squeezing; above MAX the cover would dwarf the text. */
const CARD_MIN = 108
const CARD_MAX = 168

/** The book-entry screen's room, preloaded here (see BookCover). */
const BOOK_ROOM = require('../assets/images/library/book-room.jpg')
/** The header painting, cropped from the reference by `processLibraryArt.mjs`. */
const SCENERY = require('../assets/images/library/header-scenery.png')
const SCENERY_RATIO = 351 / 245
/** Its share of the column — the same share of the mockup's width it was cut from. */
const SCENERY_SHARE = 351 / 941

/** The arrival: the page rises a little and fades up, replayed each focus. */
const ENTER = { at: 0, for: 640, rise: 28 } as const

const cardShadow = {
  shadowColor: '#3A2A14',
  shadowOffset: { width: 0, height: 3 },
  shadowRadius: 10,
  shadowOpacity: 0.06,
  elevation: 2,
} as const

export function Books() {
  const { storyProgress, settings, streak } = useApp()
  const script = settings.script
  const [shelf, setShelf] = useState<StoryCollection | 'all'>('all')
  const { width: winW, height: winH } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  /* Warm the book-entry room while the learner browses, so opening a book can fade straight in. */
  useEffect(() => {
    Asset.loadAsync(BOOK_ROOM).catch(() => {})
  }, [])

  const run = useEntranceRun()
  const enter = useReveal({ from: 'bottom', ...ENTER, duration: ENTER.for, distance: ENTER.rise, run })
  /* The cards' shadows settle in behind them (`ShadowSurface`) rather than
     showing at full strength before the fading page does, as on Android. */
  const shadowArrival = useShadowReveal({ at: ENTER.at, duration: ENTER.for, run })

  const column = Math.min(winW, BOOK_CONTENT_MAX)
  const cardW = column - EDGE * 2 - PEEK
  // Three shelves share whatever height the header leaves.
  const shelfH = (winH - insets.top - insets.bottom - CHROME - 8) / 3
  const cardH = Math.round(Math.max(CARD_MIN, Math.min(CARD_MAX, shelfH - HEADING_H - ROW_GAP)))

  // Shelves keep their fixed order and stay put when a chip empties one, so the
  // three rows never jump about.
  const shelves = useMemo(
    () =>
      BANDS.map((band) => ({
        band: band.id,
        label: levelBand(band.hsk),
        stories: STORIES.filter((s) => levelBand(s.hskLevel).id === band.id && (shelf === 'all' || s.collection === shelf)),
      })),
    [shelf],
  )

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, alignItems: 'center', backgroundColor: c.library }}>
      {/* The page's own fade-up is the arrival; the stack's push slide would run underneath it at another speed. */}
      <Stack.Screen options={{ animation: 'none' }} />

      <Animated.View style={[{ flex: 1, width: '100%', maxWidth: BOOK_CONTENT_MAX }, enter]} needsOffscreenAlphaCompositing>
      <ShadowRevealProvider value={shadowArrival}>
        {/* Range, pagoda and sakura in the top-right corner, as the reference paints them.
            `pointerEvents` on the wrapper: an Image does not take the prop. */}
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0 }}>
          <Image
            source={SCENERY}
            style={{ width: column * SCENERY_SHARE * 1.12, height: (column * SCENERY_SHARE * 1.12) / SCENERY_RATIO }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: EDGE - 4, paddingTop: 6, height: 44 }}>
          <Pressable
            // Opened from the Learn tab; when there is no stack to pop (a reload,
            // a deep link) the dashboard is where it belongs.
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
          >
            <ChevronLeft size={28} color={c.teal} strokeWidth={2} />
          </Pressable>
          <StreakPill streak={streak} />
        </View>

        <View style={{ height: TITLE_H, paddingHorizontal: EDGE, justifyContent: 'center' }}>
          {/* Sized to the column so "Library" clears the pagoda on a narrow phone. */}
          <Text accessibilityRole="header" style={{ fontFamily: 'LoraBold', ...PAGE_TITLE, fontSize: Math.min(PAGE_TITLE.fontSize, column * 0.085), color: c.ink }}>
            Reading Library
          </Text>
        </View>

        {/* Shelf chips. Pinned to their own height: a horizontal ScrollView beside
            the vertical one would otherwise be squeezed and crop them. */}
        <View style={{ height: 66, flexGrow: 0, flexShrink: 0 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ gap: 9, paddingHorizontal: EDGE, paddingVertical: 13, alignItems: 'center' }}
          >
            {SHELVES.map((s) => {
              const active = shelf === s.id
              return (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    if (active) return
                    tickHaptic()
                    setShelf(s.id)
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <View
                    style={{
                      height: 38,
                      paddingHorizontal: 19,
                      borderRadius: 19,
                      justifyContent: 'center',
                      backgroundColor: active ? c.teal : c.card,
                      borderWidth: 1,
                      borderColor: active ? c.teal : c.chipBorder,
                    }}
                  >
                    <Text style={{ fontFamily: active ? 'LoraBold' : 'Lora', fontSize: 15, color: active ? c.cream : c.ink }}>
                      {s.label}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </ScrollView>
        </View>

        {/* Fills the screen on any phone; only scrolls when even the smallest card would not fit three shelves. */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexGrow: 1, justifyContent: 'space-between' }}>
            {shelves.map((s) => (
              <View key={s.band} style={{ marginBottom: ROW_GAP }}>
                <View style={{ height: HEADING_H, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: EDGE }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                    {/* English leads: the learners can't read 初級 yet. The Chinese follows as a quiet caption. */}
                    <Text style={{ fontFamily: 'LoraBold', fontSize: 19, lineHeight: 26, color: c.ink }}>{s.label.en}</Text>
                    <Text className={hanziFont(script, 'regular')} style={{ fontSize: 14, color: c.inkFaint }}>
                      {forScript(`${s.label.zh}閱讀`, script)}
                    </Text>
                  </View>
                  {s.stories.length > 0 && (
                    <Text style={{ fontFamily: 'Lora', fontSize: 13.5, color: c.inkSoft }}>
                      {s.stories.length} {s.stories.length === 1 ? 'book' : 'books'}
                    </Text>
                  )}
                </View>

                {s.stories.length === 0 ? (
                  <View
                    style={{
                      height: cardH,
                      marginHorizontal: EDGE,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderStyle: 'dashed',
                      borderColor: c.chipBorder,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontFamily: 'LoraItalic', fontSize: 14, color: c.inkFaint }}>No {s.label.en.toLowerCase()} stories on this shelf yet</Text>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    // One card per swipe, landing flush with the left margin.
                    snapToInterval={cardW + CARD_GAP}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    contentContainerStyle={{ gap: CARD_GAP, paddingHorizontal: EDGE, paddingVertical: 4 }}
                    style={{ flexGrow: 0, marginVertical: -4 }}
                  >
                    {s.stories.map((story) => (
                      <StoryCard
                        key={story.id}
                        story={story}
                        width={cardW}
                        height={cardH}
                        percent={progressPercent(story, storyProgress[story.id])}
                      />
                    ))}
                  </ScrollView>
                )}
              </View>
            ))}
          </View>

          <View style={{ paddingHorizontal: EDGE }}>
            <AppBannerAd placement="books" />
          </View>
        </ScrollView>
      </ShadowRevealProvider>
      </Animated.View>
    </SafeAreaView>
  )
}

/** The streak, in the reference's white pill with its painted flame. */
function StreakPill({ streak }: { streak: number }) {
  return (
    <ShadowSurface shadow={cardShadow}
      accessible
      accessibilityLabel={`${streak} day streak`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 36,
        paddingHorizontal: 14,
        borderRadius: 18,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.chipBorder,
      }}
    >
      <Image source={FIRE_ICON} style={{ width: 17, height: 17 }} resizeMode="contain" />
      <Text style={{ fontFamily: 'LoraBold', fontSize: 15, color: c.ink }}>{streak}</Text>
      <Text style={{ fontFamily: 'Lora', fontSize: 14, color: c.inkSoft }}>Streak</Text>
    </ShadowSurface>
  )
}

/**
 * One story: the cover on the left, and beside it the title, its reading and
 * English, a line about it, and its length and progress at the foot.
 */
function StoryCard({ story, width, height, percent }: { story: Story; width: number; height: number; percent: number }) {
  const { script, phoneticScript } = useApp().settings
  const available = story.pages.length > 0
  const [pressed, setPressed] = useState(false)
  const coverH = height - CARD_PAD * 2
  // The blurb is what gives way on a short card: two lines, then one, then none.
  const blurbLines = height >= 150 ? 2 : height >= 122 ? 1 : 0

  return (
    <Pressable
      disabled={!available}
      onPress={() => {
        playTapSound()
        tapHaptic()
        router.push(`/story/${story.id}`)
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={`${story.titleEnglish}, HSK ${story.hskLevel}${available ? `, ${percent}% read` : ', coming soon'}`}
    >
      {/* The look lives on a View inside the Pressable — a style function on a
          Pressable is dropped on native (CLAUDE.md, Styling). */}
      <ShadowSurface shadow={cardShadow}
        style={{
          width,
          height,
          flexDirection: 'row',
          gap: 13,
          padding: CARD_PAD,
          borderRadius: 16,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.cardBorder,
          opacity: available ? (pressed ? 0.85 : 1) : 0.55,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        }}
      >
        <StoryArt story={story} width={coverH * COVER_RATIO} height={coverH} radius={9} />

        <View style={{ flex: 1, paddingTop: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Text numberOfLines={1} className={hanziFont(script, 'semibold')} style={{ flex: 1, fontSize: 18, lineHeight: 25, color: c.ink }}>
              {forScript(story.title, script)}
            </Text>
            {available ? (
              <ChevronRight size={18} color={c.inkFaint} style={{ marginTop: 3 }} />
            ) : (
              <Lock size={14} color={c.inkFaint} style={{ marginTop: 5 }} />
            )}
          </View>
          <Text numberOfLines={1} style={{ fontFamily: 'Lora', fontSize: 12.5, lineHeight: 17, color: c.inkFaint }}>
            {displayTitleReading(story.titlePinyin, phoneticScript)}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: 'Lora', fontSize: 14, lineHeight: 19, color: c.ink }}>
            {story.titleEnglish}
          </Text>
          {blurbLines > 0 && (
            <Text numberOfLines={blurbLines} style={{ fontFamily: 'Lora', fontSize: 12.5, lineHeight: 17, color: c.inkSoft, marginTop: 3 }}>
              {available ? story.description : 'Coming soon'}
            </Text>
          )}

          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <BookOpen size={13} color={c.inkFaint} />
              <Text style={{ fontFamily: 'Lora', fontSize: 12, color: c.inkFaint }}>{formatCount(story.wordCount)} words</Text>
            </View>
            <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: c.track, overflow: 'hidden' }}>
              <View style={{ width: `${percent}%`, height: '100%', borderRadius: 3, backgroundColor: c.teal }} />
            </View>
            <Text style={{ fontFamily: 'Lora', fontSize: 12, color: c.inkSoft, minWidth: 30, textAlign: 'right' }}>{percent}%</Text>
          </View>
        </View>
      </ShadowSurface>
    </Pressable>
  )
}
