import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, ScrollView, Image, Animated, Easing, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { ChevronLeft, ChevronRight, Bookmark, Check, Plus, Volume2, PenLine } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { storyById } from '../data/stories'
import { segmentText } from '../lib/textSegmentation'
import { displayPinyin } from '../lib/hanzi'
import { speak } from '../lib/speech'
import { playTapSound } from '../lib/sound'
import { WritingPracticeModal } from '../components/WritingPracticeModal'
import { PageDecor } from '../components/reading/PageDecor'
import { ReadingShell } from '../components/reading/ReadingShell'
import { StoryArt } from '../components/reading/StoryArt'
import { shortGloss } from '../lib/definitions'

/** Ink-wash range that watermarks the right edge of the translation card. */
const TRANSLATION_ART = require('../assets/images/decor/mountains-small.png')

/*
 * Sheet motion. Rising is a spring — damped hard enough not to wobble, but with
 * just enough life that the sheet feels picked up rather than teleported.
 * Dismissal is a plain ease-in curve: a spring on the way out reads as the sheet
 * being yanked, and there's nothing to settle onto once it's gone.
 *
 * This uses React Native's own Animated rather than Reanimated, which the rest
 * of the app pulls in: Reanimated's update loop doesn't drive on this project's
 * web target, so an animated style there evaluates once and then never changes —
 * the sheet would sit permanently off-screen at opacity 0.
 */
const SHEET_RISE = { damping: 22, stiffness: 210, mass: 0.85 } as const
const SHEET_FALL = { duration: 210, easing: Easing.in(Easing.cubic) } as const

/** Transform and opacity can run off the UI thread natively; web has no such thread. */
const USE_NATIVE_DRIVER = Platform.OS !== 'web'

/*
 * The Story Reader.
 *
 * A book page, not a lesson screen: no card wrapping the reading area, cream
 * showing through everywhere, hanzi in a serif that is deliberately not the UI
 * sans, and the English translation set in Lora so it reads as prose rather than
 * app chrome. Light-only, for the same reason as the library.
 */

/** Coral dots under a word the learner hasn't added yet — a hint, not an error. */
function DottedUnderline({ width }: { width: number }) {
  const count = Math.max(3, Math.floor(width / 6))
  return (
    <View className="mt-[2px] w-full flex-row justify-between" style={{ height: 3 }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#f46757' }} />
      ))}
    </View>
  )
}

export function StoryReader() {
  const { storyId } = useLocalSearchParams<{ storyId: string }>()
  const { wordBank, deck, addWordFromBook, settings, storyProgress, recordStoryPage } = useApp()
  const story = storyById(storyId)

  const [pageIndex, setPageIndex] = useState(0)
  const [practiceWordId, setPracticeWordId] = useState<string | null>(null)

  /*
   * The word the sheet is showing. It stays set through the dismissal animation
   * — clearing it on tap would unmount the sheet mid-slide — and is only nulled
   * once the closing animation reports finished.
   */
  const [sheetWordId, setSheetWordId] = useState<string | null>(null)
  /** 0 = fully dismissed, 1 = fully raised. */
  const sheetProgress = useRef(new Animated.Value(0)).current
  /** Measured on layout so the sheet starts exactly its own height off-screen. */
  const [sheetHeight, setSheetHeight] = useState(420)

  const page = story?.pages[pageIndex]
  const segments = useMemo(() => (page ? segmentText(page.chinese, wordBank) : []), [page, wordBank])
  const sheetWord = sheetWordId ? wordBank.find((w) => w.id === sheetWordId) : undefined
  const practiceWord = practiceWordId ? wordBank.find((w) => w.id === practiceWordId) : undefined
  const alreadyAdded = sheetWord ? deck.some((c) => c.wordId === sheetWord.id) : false

  const deckWordIds = useMemo(() => new Set(deck.map((c) => c.wordId)), [deck])

  // Runs after the sheet has been laid out and measured, so the rise starts from
  // the right offset rather than from the placeholder height.
  useEffect(() => {
    if (!sheetWordId) return
    Animated.spring(sheetProgress, {
      toValue: 1,
      ...SHEET_RISE,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start()
  }, [sheetWordId, sheetProgress])

  const closeSheet = useCallback(() => {
    Animated.timing(sheetProgress, {
      toValue: 0,
      ...SHEET_FALL,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(({ finished }) => {
      if (finished) setSheetWordId(null)
    })
  }, [sheetProgress])

  const sheetTranslateY = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [sheetHeight, 0],
  })

  // Reaching a page is what counts as reading it, so progress is recorded on
  // arrival rather than on leaving — closing the story mid-page still counts.
  useEffect(() => {
    if (story) recordStoryPage(story.id, pageIndex)
  }, [story, pageIndex, recordStoryPage])

  if (!story || !page) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-6" style={{ backgroundColor: '#fdfbf5' }}>
        <Text className="font-inter" style={{ color: '#8a8a99' }}>
          Story not found.
        </Text>
      </SafeAreaView>
    )
  }

  const totalPages = story.pages.length
  const furthest = Math.max(storyProgress[story.id] ?? 0, pageIndex)
  const percent = Math.round(((furthest + 1) / totalPages) * 100)

  return (
    <ReadingShell>
      {/* Reading progress. Thin on purpose — a thick bar turns a book back into an app. */}
      <View className="mt-5 flex-row items-center gap-2.5 px-5">
        <View className="h-1 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: '#eee8df' }}>
          <View className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: '#f46757' }} />
        </View>
        <Text className="font-inter-medium text-[13px]" style={{ color: '#292936' }}>
          {percent}%
        </Text>
      </View>

      <View className="flex-row items-center px-5 pb-1 pt-3">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
          <ChevronLeft size={26} color="#1a1a2e" strokeWidth={2} />
        </Pressable>
        <View className="flex-1 items-center px-2">
          <Text className="font-hanzi-tc-semibold text-[25px] leading-[32px]" style={{ color: '#1a1a2e' }}>
            {story.title}
          </Text>
          <Text className="font-lora text-sm" style={{ color: '#55545d' }}>
            {story.titleEnglish}
          </Text>
        </View>
        {/* Placeholder affordance from the reference — bookmarking isn't a feature
            of the app yet, so this is intentionally inert and not announced. */}
        <Bookmark size={24} color="#c9c2b4" strokeWidth={1.8} />
      </View>

      <View className="flex-1">
        {/* No clouds here — the reading text is already a dense field of small
            marks, and drifting shapes behind it fight the hanzi for attention. */}
        <PageDecor />

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/*
            With real artwork the hero is the book's cover, shown at its native
            2:3 and lifted off the page. Without it, the painted fallback reads
            better as a soft near-circular wash than as an empty rectangle — a
            hard-edged placeholder would look like a failed image load.
          */}
          <View className="items-center pb-3 pt-4">
            {story.art ? (
              <View className="rounded-[16px] shadow-paper-lifted">
                <StoryArt story={story} width={132} height={198} radius={16} />
              </View>
            ) : (
              <StoryArt story={story} width={148} height={148} radius={62} />
            )}
          </View>

          {/*
            Each segment is its own column so the reading sits directly under the
            word it belongs to, rather than as one pinyin run beneath the whole
            paragraph. Wrapping is handled by the flex row, not by Text, which is
            why this is a View of columns rather than nested <Text> runs.
          */}
          <View className="flex-row flex-wrap items-start justify-center px-4">
            {segments.map((seg, i) => {
              const reading = seg.word ? displayPinyin(seg.word, settings.phoneticScript) : ''
              const unknown = !!seg.word && !deckWordIds.has(seg.word.id)
              const boxWidth = seg.text.length * 25

              return (
                <Pressable
                  key={i}
                  disabled={!seg.word}
                  onPress={() => {
                    if (!seg.word) return
                    playTapSound()
                    setSheetWordId(seg.word.id)
                  }}
                  accessibilityRole={seg.word ? 'button' : undefined}
                  accessibilityLabel={seg.word ? `${seg.text}, ${reading}` : undefined}
                  className="mx-[1px] mb-[9px] mt-[3px] items-center"
                >
                  <View
                    className="items-center rounded-[10px] px-[9px] pb-1 pt-[7px]"
                    style={
                      seg.word
                        ? {
                            borderWidth: 1,
                            borderColor: 'rgba(205,194,177,0.36)',
                            backgroundColor: 'rgba(255,255,255,0.32)',
                          }
                        : undefined
                    }
                  >
                    <Text className="font-hanzi-tc text-[23px] leading-[31px]" style={{ color: '#17171d' }}>
                      {seg.text}
                    </Text>
                    {unknown && <DottedUnderline width={boxWidth} />}
                  </View>
                  {reading ? (
                    <Text className="mt-1 font-inter text-[9.5px]" style={{ color: '#96928e' }}>
                      {reading}
                    </Text>
                  ) : null}
                </Pressable>
              )
            })}
          </View>

          {/* Translation. Always visible — hiding it behind a toggle made the page
              feel like an exercise; the reference treats it as part of the story. */}
          <View className="mx-[22px] mb-3 mt-[26px]">
            <View
              className="overflow-hidden rounded-[17px] px-[18px] pb-5 pt-[18px]"
              style={{
                backgroundColor: 'rgba(255,253,248,0.86)',
                borderWidth: 1,
                borderColor: 'rgba(215,203,183,0.45)',
              }}
            >
              {/*
                Ink-wash range washing in from the right edge, behind the prose.
                Bled off the edge and clipped by the card's own radius so it reads
                as printed into the paper rather than placed on top of it. Sits
                first in the tree so the text paints over it.

                No page pinyin above the translation: every word in the passage
                already carries its own reading, so a second romanised copy of the
                whole paragraph was pure duplication.
              */}
              <Image
                source={TRANSLATION_ART}
                style={{
                  position: 'absolute',
                  right: -22,
                  top: '30%',
                  width: 190,
                  height: 190 / (325 / 132),
                  opacity: 0.7,
                }}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
              <Text className="font-lora text-[15.5px]" style={{ color: '#303038', lineHeight: 27 }}>
                {page.translation}
              </Text>
            </View>

            <Pressable
              onPress={() => speak(page.chinese)}
              accessibilityRole="button"
              accessibilityLabel="Read this page aloud"
              className="absolute -bottom-4 right-3 items-center justify-center rounded-full active:opacity-80"
              style={{
                width: 54,
                height: 54,
                backgroundColor: '#f46757',
                borderWidth: 3,
                borderColor: '#fffdf8',
              }}
            >
              <Volume2 size={24} color="#ffffff" />
            </Pressable>
          </View>

          {totalPages > 1 && (
            <View className="mt-7 flex-row items-center justify-between px-5">
              <Pressable
                disabled={pageIndex === 0}
                onPress={() => setPageIndex((p) => p - 1)}
                accessibilityRole="button"
                className="h-10 flex-row items-center gap-1 rounded-full px-4"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  borderWidth: 1,
                  borderColor: '#e4ded4',
                  opacity: pageIndex === 0 ? 0.35 : 1,
                }}
              >
                <ChevronLeft size={17} color="#292936" />
                <Text className="font-inter-semibold text-[13px]" style={{ color: '#292936' }}>
                  Previous
                </Text>
              </Pressable>

              <Text className="font-inter text-[12px]" style={{ color: '#8a8a99' }}>
                {pageIndex + 1} / {totalPages}
              </Text>

              <Pressable
                disabled={pageIndex === totalPages - 1}
                onPress={() => setPageIndex((p) => p + 1)}
                accessibilityRole="button"
                className="h-10 flex-row items-center gap-1 rounded-full px-4"
                style={{
                  backgroundColor: pageIndex === totalPages - 1 ? 'rgba(255,255,255,0.7)' : '#d9f2e0',
                  borderWidth: 1,
                  borderColor: pageIndex === totalPages - 1 ? '#e4ded4' : 'transparent',
                  opacity: pageIndex === totalPages - 1 ? 0.35 : 1,
                }}
              >
                <Text
                  className="font-inter-semibold text-[13px]"
                  style={{ color: pageIndex === totalPages - 1 ? '#292936' : '#246847' }}
                >
                  Next
                </Text>
                <ChevronRight size={17} color={pageIndex === totalPages - 1 ? '#292936' : '#246847'} />
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>

      {sheetWord && (
        <>
          <Animated.View
            style={[
              { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(38,30,20,0.18)' },
              { opacity: sheetProgress },
            ]}
          >
            <Pressable
              onPress={closeSheet}
              accessibilityRole="button"
              accessibilityLabel="Close word details"
              style={{ flex: 1 }}
            />
          </Animated.View>
          {/*
            Two nested views on purpose. NativeWind doesn't process `className` on
            Reanimated's Animated.View, so the outer one carries only plain styles
            and the transform, and the inner plain View keeps the Tailwind
            styling. Collapsing these back into one animated view silently drops
            the radius, padding and paper background.
          */}
          <Animated.View
            onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
            style={[
              { position: 'absolute', left: 0, right: 0, bottom: 0 },
              { transform: [{ translateY: sheetTranslateY }], opacity: sheetProgress },
            ]}
          >
            {/* A sheet of stationery rather than a modal: warm paper, one hairline
                at the fold, and a shadow that falls upward onto the page behind it. */}
            <View
              className="rounded-t-[30px] px-6 pb-8 pt-3 shadow-paper-sheet"
              style={{
                backgroundColor: '#fffdf8',
                borderTopWidth: 1,
                borderColor: 'rgba(212,201,181,0.55)',
              }}
            >
              <View className="mb-4 h-[5px] w-[38px] self-center rounded-full" style={{ backgroundColor: '#ddd8cf' }} />

              <Text className="font-hanzi-tc text-[40px] leading-[52px]" style={{ color: '#202027' }}>
                {sheetWord.traditional}
              </Text>

              <View className="mt-1 flex-row items-center gap-2">
                <Text className="font-inter text-[15px]" style={{ color: '#66636a' }}>
                  {displayPinyin(sheetWord, settings.phoneticScript)}
                </Text>
                <Pressable
                  onPress={() => speak(sheetWord.traditional)}
                  accessibilityRole="button"
                  accessibilityLabel={`Play pronunciation of ${sheetWord.traditional}`}
                  hitSlop={10}
                >
                  <Volume2 size={17} color="#66636a" />
                </Pressable>
              </View>

              <Text className="mt-2 font-lora text-[15px]" style={{ color: '#303038', lineHeight: 23 }}>
                {shortGloss(sheetWord)}
              </Text>

              {/*
                The word in use. Sentences come from the bundled corpus and are
                never generated, and only about eight thousand of the imported
                entries carry one — so this block simply isn't there for words
                without an example, rather than showing an empty frame.
              */}
              {sheetWord.example && (
                <View
                  className="mt-4 rounded-[14px] px-4 pb-3 pt-2.5"
                  style={{ backgroundColor: '#faf6ec', borderWidth: 1, borderColor: 'rgba(215,203,183,0.5)' }}
                >
                  <View className="flex-row items-start gap-2">
                    <Text className="flex-1 font-hanzi-tc text-[17px]" style={{ color: '#1f1f27', lineHeight: 27 }}>
                      {sheetWord.example.traditional}
                    </Text>
                    <Pressable
                      onPress={() => speak(sheetWord.example!.traditional)}
                      accessibilityRole="button"
                      accessibilityLabel="Play example sentence"
                      hitSlop={10}
                      className="pt-1.5"
                    >
                      <Volume2 size={15} color="#96928e" />
                    </Pressable>
                  </View>
                  {/* Bulk-imported sentences carry no pinyin; curated ones do. */}
                  {sheetWord.example.pinyin ? (
                    <Text className="mt-0.5 font-inter text-[11px]" style={{ color: '#96928e' }}>
                      {sheetWord.example.pinyin}
                    </Text>
                  ) : null}
                  <Text className="mt-1 font-lora text-[13.5px]" style={{ color: '#4a4952', lineHeight: 20 }}>
                    {sheetWord.example.translation}
                  </Text>
                </View>
              )}

              <View className="mt-6 flex-row gap-3">
                <Pressable
                  onPress={() => {
                    const id = sheetWord.id
                    closeSheet()
                    setPracticeWordId(id)
                  }}
                  accessibilityRole="button"
                  className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-full shadow-glow-paper active:opacity-80"
                  style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7e1d7' }}
                >
                  <PenLine size={18} color="#292936" />
                  <Text className="font-inter-semibold text-[15px]" style={{ color: '#292936' }}>
                    Practice writing
                  </Text>
                </Pressable>

                {alreadyAdded ? (
                  <View
                    className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-full"
                    style={{ backgroundColor: '#d9f2e0' }}
                  >
                    <Check size={18} color="#246847" />
                    <Text className="font-inter-semibold text-[15px]" style={{ color: '#246847' }}>
                      In My Words
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => {
                      addWordFromBook(sheetWord.id)
                      closeSheet()
                    }}
                    accessibilityRole="button"
                    className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-full shadow-glow-jade active:opacity-80"
                    style={{ backgroundColor: '#45b887' }}
                  >
                    <Plus size={18} color="#ffffff" />
                    <Text className="font-inter-semibold text-[15px]" style={{ color: '#ffffff' }}>
                      Add to My Words
                    </Text>
                  </Pressable>
                  )}
              </View>
            </View>
          </Animated.View>
        </>
      )}

      {practiceWord && <WritingPracticeModal word={practiceWord} onClose={() => setPracticeWordId(null)} />}
    </ReadingShell>
  )
}
