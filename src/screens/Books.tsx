import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, ScrollView, Animated, Image, Platform, StyleSheet, useWindowDimensions } from 'react-native'
import type { ScrollViewInstance } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, Stack } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { ArrowRight, BookOpen, ChevronRight } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { STORIES } from '../data/stories'
import type { ScriptMode, Story, StoryCollection } from '../types'
import { hanziFont } from '../lib/hanzi'
import { forScript } from '../lib/scriptConversion'
import { playTapSound } from '../lib/sound'
import { tickHaptic } from '../lib/haptics'
import { useEntranceRun, useReveal } from '../components/dashboard/entrance'
import { FIRE_ICON } from '../components/dashboard/art'
import { PressableScale, LiftedFace } from '../components/dashboard/parts'
import { coverFor, prefetchStoryCovers } from '../components/reading/StoryArt'
import { STORY_COVERS } from '../components/reading/storyCovers'
import { formatCount, progressPercent } from '../components/reading/storyPresentation'
import { cornerColors as c, BOOK_CONTENT_MAX } from '../components/book/tokens'
import { AppBannerAd } from '../components/ads/AppBannerAd'
import { Asset } from 'expo-asset'
import { ShadowRevealProvider, ShadowSurface, useShadowReveal } from '../components/shadowReveal'
import { BackArrow } from '../components/BackArrow'

/*
 * The Reading Corner, built to `SS1026 Reading UI Redesign.png` (minus the
 * 你好 greeting, by request): a painted header, the book to pick up again,
 * three stories to explore, the shelf chips, and a sideways row of
 * recommendations for the chip picked. Every story wears its own cover.
 *
 * See all and More stories open every story on its shelf (`AllStories.tsx`).
 * Light-only, like the rest of the reading design.
 */

const USE_NATIVE_DRIVER = Platform.OS !== 'web'
const EDGE = 16
const GAP = 10

/** SS1026's own header painting — cloud, range, pagoda, sakura — cut by `processReadingCornerArt.mjs`. */
const SCENERY = require('../assets/images/library/corner-header.png')
const SCENERY_RATIO = 451 / 238
/** The share of its width, from the left, that the script feathers away to paper. */
const SCENERY_FEATHER = 150 / 451
/** Drops the painting so its empty sky sits behind the streak pill and the pagoda comes level with the title. */
const SCENERY_TOP = 18
/** A soft paper glow round the heading, so the painting's feathered edge never touches the letters' legibility. */
const TITLE_HALO = { textShadowColor: c.halo, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }
/** "Reading Corner" in Nunito ExtraBold measures about this many ems. */
const TITLE_EMS = 7.25
/** The book-entry screen's room, preloaded so opening a book can fade straight in (see BookCover). */
const BOOK_ROOM = require('../assets/images/library/book-room.jpg')

/**
 * SS1026's three chips. Five collections shelve the library; the chips group
 * them by what a story is about — daily life, China's customs and sayings,
 * and the tales and myths of mountain, moon and sea.
 */
const CHIPS: { id: 'everyday' | 'culture' | 'tales'; label: string; icon: number; collections: StoryCollection[] }[] = [
  { id: 'everyday', label: 'Everyday', icon: require('../assets/images/library/chip-everyday.png'), collections: ['everyday'] },
  { id: 'culture', label: 'Culture', icon: require('../assets/images/library/chip-culture.png'), collections: ['festival-legends', 'chengyu'] },
  { id: 'tales', label: 'Tales', icon: require('../assets/images/library/chip-nature.png'), collections: ['folk-tales', 'classical-myths'] },
]
type ChipId = (typeof CHIPS)[number]['id']
/** Icon sizes, from the chip-*.png renders (doubled from the mockup). */
const CHIP_ICON = { everyday: [28, 27], culture: [24, 30], tales: [43, 26] } as const

/** The arrival, staggered by section like the Dashboard's. */
const ENTER = { for: 560, rise: 22, step: 70 } as const
/** The recommendation row's cross-fade when a chip changes it. */
const ROW_FADE_MS = 240

const cardShadow = {
  shadowColor: c.shadow,
  shadowOffset: { width: 0, height: 3 },
  shadowRadius: 10,
  shadowOpacity: 0.06,
  elevation: 2,
} as const

/**
 * Stories in the order a learner at `level` should meet them: unfinished
 * before finished, nearest their level first, the easier of a pair first,
 * then the library's own order. Stable, so nothing reshuffles between visits.
 */
function rankForLevel(stories: Story[], level: number, progress: Record<string, number>): Story[] {
  const order = new Map(STORIES.map((s, i) => [s.id, i]))
  const done = (s: Story) => (progressPercent(s, progress[s.id]) >= 100 ? 1 : 0)
  return [...stories].sort(
    (a, b) =>
      done(a) - done(b) ||
      Math.abs(a.hskLevel - level) - Math.abs(b.hskLevel - level) ||
      a.hskLevel - b.hskLevel ||
      (a.difficulty === b.difficulty ? 0 : a.difficulty === 'easy' ? -1 : 1) ||
      (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  )
}

function openStory(story: Story) {
  if (story.pages.length === 0) return
  playTapSound()
  router.push(`/story/${story.id}`)
}

export function Books() {
  const { storyProgress, settings, streak } = useApp()
  const script = settings.script
  const level = Math.min(6, Math.max(1, settings.hskLevel || 1))
  const { width: winW } = useWindowDimensions()
  const column = Math.min(winW, BOOK_CONTENT_MAX)
  const inner = column - EDGE * 2

  useEffect(() => {
    Asset.loadAsync(BOOK_ROOM).catch(() => {})
    prefetchStoryCovers()
  }, [])

  const readable = useMemo(() => STORIES.filter((s) => s.pages.length > 0), [])

  /*
   * The book to pick up: the one last opened, unless it is finished — then the
   * next unfinished story at the learner's level. With everything read, the
   * last one opened again.
   */
  const current = useMemo(() => {
    const last = readable.find((s) => s.id === settings.lastStoryId)
    if (last && progressPercent(last, storyProgress[last.id]) < 100) return last
    const next = rankForLevel(readable, level, storyProgress)[0]
    if (next && progressPercent(next, storyProgress[next.id]) < 100) return next
    return last ?? next
  }, [readable, settings.lastStoryId, storyProgress, level])

  /* Three to explore, never the one above. Ranked once per visit's progress, so they stay put while browsing. */
  const explore = useMemo(() => {
    // Stories with their own painting lead: the feature card is mostly picture.
    const ranked = rankForLevel(readable.filter((s) => s.id !== current?.id), level, storyProgress)
    return [...ranked.filter((s) => STORY_COVERS[s.id]), ...ranked.filter((s) => !STORY_COVERS[s.id])].slice(0, 3)
  },
    [readable, current, level, storyProgress],
  )

  const [chip, setChip] = useState<ChipId>('everyday')
  const recommended = useMemo(() => {
    const collections = CHIPS.find((x) => x.id === chip)!.collections
    const shelf = rankForLevel(
      readable.filter((s) => collections.includes(s.collection) && s.id !== current?.id),
      level,
      storyProgress,
    )
    // Nothing already on screen above — unless that would leave the row nearly bare, then they go to its end.
    const shown = new Set(explore.map((s) => s.id))
    const fresh = shelf.filter((s) => !shown.has(s.id))
    return fresh.length >= 2 ? fresh : [...fresh, ...shelf.filter((s) => shown.has(s.id))]
  }, [readable, chip, current, explore, level, storyProgress])

  /* A new chip fades its row in from the start, rather than swapping cards under a half-scrolled row. */
  const rowFade = useRef(new Animated.Value(1)).current
  const rowRef = useRef<ScrollViewInstance>(null)
  const pickChip = (id: ChipId) => {
    if (id === chip) return
    tickHaptic()
    setChip(id)
    rowRef.current?.scrollTo({ x: 0, animated: false })
    rowFade.setValue(0)
    Animated.timing(rowFade, { toValue: 1, duration: ROW_FADE_MS, useNativeDriver: USE_NATIVE_DRIVER }).start()
  }
  // Backstop: off the native driver a hidden tab never runs the fade (CLAUDE.md, Animation).
  useEffect(() => {
    const t = setTimeout(() => rowFade.setValue(1), ROW_FADE_MS + 200)
    return () => clearTimeout(t)
  }, [chip, rowFade])

  const run = useEntranceRun()
  const reveal = (i: number) => ({ from: 'bottom' as const, at: i * ENTER.step, duration: ENTER.for, distance: ENTER.rise, run })
  const enterHeader = useReveal(reveal(0))
  const enterCurrent = useReveal(reveal(1))
  const enterExplore = useReveal(reveal(2))
  const enterShelf = useReveal(reveal(3))
  const shadowArrival = useShadowReveal({ at: 0, duration: ENTER.for + ENTER.step * 3, run })

  /*
   * The heading, sized to the column like SS1026's; the painting stays in the
   * corner beside it, never under it: its solid part starts where the title
   * ends (only its feathered edge may reach behind the last letters).
   */
  const titleFont = Math.min(38, column * 0.088)
  const titleEnd = EDGE + titleFont * TITLE_EMS
  const sceneryW = Math.max(130, Math.min(column * 0.47, (column - titleEnd + 6) / (1 - SCENERY_FEATHER)))
  const featureW = Math.round((inner - GAP) * 0.5)
  const smallW = inner - GAP - featureW
  const exploreH = Math.round(Math.max(290, Math.min(372, featureW * 1.5)))
  const smallH = (exploreH - GAP) / 2
  const recW = Math.round(Math.min(250, inner * 0.6))

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, alignItems: 'center', backgroundColor: c.page }}>
      {/* The page's own fade-up is the arrival; the stack's push slide would run underneath it at another speed. */}
      <Stack.Screen options={{ animation: 'none' }} />
      <ShadowRevealProvider value={shadowArrival}>
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: column }}>
            {/* Range, pagoda and sakura in the top-right corner. `pointerEvents` on the wrapper: an Image does not take it. */}
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: SCENERY_TOP, right: 0 }, enterHeader]}>
              <Image source={SCENERY} style={{ width: sceneryW, height: sceneryW / SCENERY_RATIO }} resizeMode="contain" />
            </Animated.View>

            <Animated.View style={enterHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: EDGE - 6, paddingRight: EDGE, paddingTop: 6, height: 50 }}>
                {/* Opened from Learn; with no stack to pop (a reload, a deep link) home is where it belongs. */}
                <BackArrow onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
                <StreakPill streak={streak} />
              </View>
              <View style={{ paddingHorizontal: EDGE, paddingTop: 10, paddingBottom: 20 }}>
                <Text
                  accessibilityRole="header"
                  numberOfLines={1}
                  style={{ fontFamily: 'NunitoExtraBold', fontSize: titleFont, lineHeight: Math.round(titleFont * 1.22), letterSpacing: -0.5, color: c.ink, ...TITLE_HALO }}
                >
                  Reading Corner
                </Text>
              </View>
            </Animated.View>

            {current && (
              <Animated.View style={[{ paddingHorizontal: EDGE }, enterCurrent]}>
                <ContinueCard story={current} percent={progressPercent(current, storyProgress[current.id])} width={inner} script={script} />
              </Animated.View>
            )}

            <Animated.View style={enterExplore}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: EDGE, marginTop: 26, marginBottom: 12 }}>
                <Text accessibilityRole="header" style={{ flex: 1, fontFamily: 'NunitoExtraBold', fontSize: 25, lineHeight: 31, letterSpacing: -0.4, color: c.ink }}>
                  Explore stories
                </Text>
                <PressableScale onPress={() => router.push('/stories')} scaleTo={0.96} accessibilityLabel="See all stories">
                  <LiftedFace height={40} fill={c.quietFace} border={c.quietBorder} shoulder={c.quietShoulder} shadow={false}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16 }}>
                      <Text style={{ fontFamily: 'NunitoBold', fontSize: 14.5, color: c.ink }}>See all</Text>
                      <ArrowRight size={16} color={c.ink} strokeWidth={2.2} />
                    </View>
                  </LiftedFace>
                </PressableScale>
              </View>

              {explore.length > 0 && (
                <View style={{ flexDirection: 'row', gap: GAP, paddingHorizontal: EDGE }}>
                  <FeatureCard story={explore[0]} percent={progressPercent(explore[0], storyProgress[explore[0].id])} width={featureW} height={exploreH} script={script} />
                  <View style={{ width: smallW, gap: GAP }}>
                    {explore.slice(1).map((s) => (
                      <StoryTile key={s.id} story={s} percent={progressPercent(s, storyProgress[s.id])} width={smallW} height={smallH} script={script} />
                    ))}
                  </View>
                </View>
              )}
            </Animated.View>

            <Animated.View style={enterShelf}>
              {/* The shelf chips, as raised pills: the picked one sits on a green shoulder. */}
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: EDGE, marginTop: 22 }}>
                {CHIPS.map((x) => (
                  <ShelfChip key={x.id} chip={x} selected={chip === x.id} onPress={() => pickChip(x.id)} compact={column < 380} />
                ))}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: EDGE, marginTop: 24, marginBottom: 10 }}>
                <Text accessibilityRole="header" style={{ fontFamily: 'NunitoExtraBold', fontSize: 20, lineHeight: 26, color: c.ink }}>
                  Recommended for you
                </Text>
                <PressableScale onPress={() => router.push('/stories')} scaleTo={0.96} haptic={false} hitSlop={8} accessibilityLabel="More stories">
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 }}>
                    <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: 14.5, color: c.inkSoft }}>More stories</Text>
                    <ArrowRight size={15} color={c.inkSoft} strokeWidth={2.2} />
                  </View>
                </PressableScale>
              </View>

              <Animated.View style={{ opacity: rowFade }}>
                {recommended.length === 0 ? (
                  <View style={{ marginHorizontal: EDGE, height: 120, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: c.cardBorder, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: 'NunitoSemiBoldItalic', fontSize: 14, color: c.inkFaint }}>No more stories on this shelf yet</Text>
                  </View>
                ) : (
                  <ScrollView
                    ref={rowRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={recW + GAP}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    contentContainerStyle={{ gap: GAP, paddingHorizontal: EDGE, paddingTop: 2, paddingBottom: 10 }}
                  >
                    {recommended.map((s) => (
                      <StoryTile key={s.id} story={s} percent={progressPercent(s, storyProgress[s.id])} width={recW} height={150} script={script} />
                    ))}
                  </ScrollView>
                )}
              </Animated.View>

              <View style={{ paddingHorizontal: EDGE, marginTop: 8 }}>
                <AppBannerAd placement="books" />
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </ShadowRevealProvider>
    </SafeAreaView>
  )
}

/** The streak, in the reference's white pill with its painted flame. */
function StreakPill({ streak }: { streak: number }) {
  return (
    <ShadowSurface
      shadow={cardShadow}
      accessible
      accessibilityLabel={`${streak} day streak`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 15, borderRadius: 19, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder }}
    >
      <Image source={FIRE_ICON} style={{ width: 18, height: 18 }} resizeMode="contain" />
      <Text style={{ fontFamily: 'NunitoExtraBold', fontSize: 16, color: c.ink }}>{streak}</Text>
      <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: 15, color: c.inkSoft }}>streak</Text>
    </ShadowSurface>
  )
}

/** A story's painting filling its (clipping) box, centred — whatever the box's shape. */
function Cover({ story }: { story: Story }) {
  /* Explicit size: without one, react-native-web sizes an Image to its file's own pixels and the painting shows zoomed in. */
  return (
    <Image
      source={coverFor(story)}
      fadeDuration={0}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      resizeMode="cover"
      accessibilityIgnoresInvertColors
    />
  )
}

/** Words, a progress bar and the percentage — the foot of every story card. */
function Meter({ story, percent, compact = false }: { story: Story; percent: number; compact?: boolean }) {
  const size = compact ? 12 : 13
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: compact ? 6 : 8 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <BookOpen size={size + 1} color={c.inkFaint} />
        <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: size, color: c.inkSoft }}>{formatCount(story.wordCount)} words</Text>
      </View>
      <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: c.track, overflow: 'hidden' }}>
        <View style={{ width: `${percent}%`, height: '100%', borderRadius: 3, backgroundColor: c.progress }} />
      </View>
      <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: size, color: c.ink, minWidth: compact ? 28 : 32, textAlign: 'right' }}>{percent}%</Text>
    </View>
  )
}

/** The hanzi title's size: as large as `max`, as small as fits `chars` glyphs (~1em each) in `room`. */
function titleSize(title: string, room: number, max: number, min: number) {
  return Math.max(min, Math.min(max, Math.floor(room / Math.max(1, [...title].length))))
}

/**
 * The book to pick up again: its painting on the left; beside it a badge, the
 * title, a line about it, its progress and the raised Continue. The whole card
 * opens the book too — Continue claims its own press (`PressableScale`).
 */
function ContinueCard({ story, percent, width, script }: { story: Story; percent: number; width: number; script: ScriptMode }) {
  const pad = 10
  const artW = Math.round((width - pad * 2) * 0.5)
  const textW = width - pad * 2 - artW - 14
  const title = forScript(story.title, script)
  const state = percent >= 100 ? 'again' : percent > 0 ? 'continue' : 'start'
  const badge = state === 'again' ? 'Finished' : state === 'continue' ? 'Continue reading' : 'Start reading'
  const action = state === 'again' ? 'Read again' : state === 'continue' ? 'Continue' : 'Start'
  const size = titleSize(title, textW - 22, 26, 18)
  return (
    <PressableScale onPress={() => openStory(story)} scaleTo={0.985} accessibilityRole="none" accessibilityLabel={`${badge}: ${story.titleEnglish}, ${percent}% read`}>
      <ShadowSurface
        shadow={cardShadow}
        style={{ flexDirection: 'row', gap: 14, padding: pad, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder }}
      >
        <View style={{ width: artW, minHeight: 196, borderRadius: 14, overflow: 'hidden' }}>
          <Cover story={story} />
        </View>
        <View style={{ flex: 1, paddingVertical: 4 }}>
          <View style={{ alignSelf: 'flex-start', backgroundColor: c.greenPale, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text style={{ fontFamily: 'NunitoBold', fontSize: 12.5, lineHeight: 17, color: c.greenDark }}>{badge}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Text numberOfLines={1} className={hanziFont(script, 'semibold')} style={{ flex: 1, fontSize: size, lineHeight: Math.round(size * 1.3), color: c.ink }}>
              {title}
            </Text>
            <ChevronRight size={20} color={c.inkFaint} />
          </View>
          {/* Titles only, by request: the English may take two lines now the summary is gone. */}
          <Text numberOfLines={2} style={{ fontFamily: 'NunitoBold', fontSize: 17, lineHeight: 22, color: c.ink }}>
            {story.titleEnglish}
          </Text>
          <View style={{ flex: 1, minHeight: 10 }} />
          <Meter story={story} percent={percent} compact={textW < 170} />
          <PressableScale onPress={() => openStory(story)} scaleTo={1} wrapperStyle={{ marginTop: 10 }} accessibilityLabel={`${action}: ${story.titleEnglish}`}>
            <LiftedFace height={44} fill={c.green} shoulder={c.greenShoulder}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontFamily: 'NunitoBold', fontSize: 17, color: '#FFFFFF', includeFontPadding: false }}>{action}</Text>
                <ChevronRight size={19} color="#FFFFFF" strokeWidth={2.6} />
              </View>
            </LiftedFace>
          </PressableScale>
        </View>
      </ShadowSurface>
    </PressableScale>
  )
}

/**
 * The tall story leading Explore: its painting fills the card, the titles sit
 * at its top in a wash of mist, and its progress runs along the foot.
 */
function FeatureCard({ story, percent, width, height, script }: { story: Story; percent: number; width: number; height: number; script: ScriptMode }) {
  const footH = 40
  const title = forScript(story.title, script)
  // Room beside the chevron disc in the top-right corner; a long title (up to eight characters) wraps to a second line rather than ending in "…".
  const room = width - 84
  const size = titleSize(title, room, 30, 20)
  const titleLines = size * [...title].length > room ? 2 : 1
  const titleLH = Math.round(size * 1.3)
  return (
    <PressableScale onPress={() => openStory(story)} scaleTo={0.985} accessibilityLabel={`${story.titleEnglish}, ${percent}% read`}>
      <ShadowSurface
        shadow={cardShadow}
        style={{ width, height, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder, overflow: 'hidden' }}
      >
        <View style={{ height: height - footH, overflow: 'hidden' }}>
          <Cover story={story} />
          <LinearGradient
            pointerEvents="none"
            colors={[c.mist, c.mist, c.mistClear]}
            locations={[0, 0.3, 0.52]}
            style={StyleSheet.absoluteFill}
          />
          <View style={{ position: 'absolute', top: 12, right: 12 }}>
            {/* Part of the card: it sinks with the card's press (`LiftedFace` follows the nearest PressableScale). */}
            <LiftedFace height={36} radius={18} fill={c.quietFace} border={c.quietBorder} shoulder={c.quietShoulder} shadow={false} style={{ width: 36 }}>
              <ChevronRight size={19} color={c.ink} strokeWidth={2.3} />
            </LiftedFace>
          </View>
          {/* The titles head the card, in mist over the top of the painting. */}
          <View style={{ position: 'absolute', left: 16, right: 14, top: 14 }}>
            {/* Only the hanzi line shares its row with the chevron disc; the English below it has the card's width. */}
            <Text numberOfLines={titleLines} className={hanziFont(script, 'semibold')} style={{ marginRight: 44, fontSize: size, lineHeight: titleLH, color: c.ink }}>
              {title}
            </Text>
            <Text numberOfLines={3} style={{ fontFamily: 'NunitoBold', fontSize: 17, lineHeight: 22, color: c.ink, marginTop: Math.max(2, 40 - titleLH * titleLines) }}>
              {story.titleEnglish}
            </Text>
          </View>
        </View>
        <View style={{ height: footH, justifyContent: 'center', paddingHorizontal: 12 }}>
          <Meter story={story} percent={percent} compact />
        </View>
      </ShadowSurface>
    </PressableScale>
  )
}

/**
 * A smaller story card: a painting at the left, the Chinese and English titles
 * beside, and the meter across the foot. Explore's right column and
 * the recommendation row both use it.
 */
function StoryTile({ story, percent, width, height, script }: { story: Story; percent: number; width: number; height: number; script: ScriptMode }) {
  const pad = 8
  const footH = 22
  const topH = height - pad * 2 - footH - 6
  const thumbW = Math.round(Math.min(width * 0.33, topH * 0.8))
  const textW = width - pad * 2 - thumbW - 10
  const title = forScript(story.title, script)
  const size = titleSize(title, textW - 24, 19, 14)
  const titleLines = size * [...title].length > textW - 24 ? 2 : 1
  const titleLH = Math.round(size * 1.3)
  // The English gets whatever height the title leaves (no summary on these cards, by request).
  const englishLines = Math.max(1, Math.min(4, Math.floor((topH - titleLines * titleLH - 2) / 18)))
  return (
    <PressableScale onPress={() => openStory(story)} scaleTo={0.97} accessibilityLabel={`${story.titleEnglish}, ${percent}% read`}>
      <ShadowSurface
        shadow={cardShadow}
        style={{ width, height, padding: pad, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder }}
      >
        <View style={{ height: topH, flexDirection: 'row', gap: 10 }}>
          <View style={{ width: thumbW, height: topH, borderRadius: 10, overflow: 'hidden' }}>
            <Cover story={story} />
          </View>
          <View style={{ flex: 1, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text numberOfLines={titleLines} className={hanziFont(script, 'semibold')} style={{ flex: 1, fontSize: size, lineHeight: titleLH, color: c.ink }}>
                {title}
              </Text>
              <ChevronRight size={16} color={c.inkFaint} style={{ marginTop: (titleLH - 16) / 2 }} />
            </View>
            <Text numberOfLines={englishLines} style={{ fontFamily: 'NunitoBold', fontSize: 13.5, lineHeight: 18, color: c.ink, marginTop: 2 }}>
              {story.titleEnglish}
            </Text>
          </View>
        </View>
        <View style={{ height: footH, justifyContent: 'flex-end', marginTop: 6 }}>
          <Meter story={story} percent={percent} compact />
        </View>
      </ShadowSurface>
    </PressableScale>
  )
}

/** A shelf chip: a raised pill with its painted icon. Selection is fill, rim, shoulder and text together. */
function ShelfChip({ chip, selected, onPress, compact }: { chip: (typeof CHIPS)[number]; selected: boolean; onPress: () => void; compact: boolean }) {
  const k = compact ? 0.82 : 1
  const [w, h] = CHIP_ICON[chip.id].map((v) => v * k)
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={1}
      haptic={false}
      wrapperStyle={{ flex: 1, minWidth: 0 }}
      accessibilityLabel={`${chip.label}${selected ? ', selected' : ''}`}
      accessibilityState={{ selected }}
    >
      <LiftedFace
        height={46}
        fill={selected ? c.greenPale : c.quietFace}
        border={selected ? c.green : c.quietBorder}
        shoulder={selected ? c.green : c.quietShoulder}
        shadow={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: compact ? 5 : 7, paddingHorizontal: 6 }}>
          <Image source={chip.icon} style={{ width: w, height: h }} resizeMode="contain" />
          <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: selected ? 'NunitoBold' : 'NunitoSemiBold', fontSize: compact ? 14 : 15, color: selected ? c.greenDark : c.ink }}>
            {chip.label}
          </Text>
        </View>
      </LiftedFace>
    </PressableScale>
  )
}
