import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, ScrollView, Image, Animated, Easing, Platform, useWindowDimensions } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { ChevronLeft, ChevronRight, Bookmark, Check, Plus, Volume2, PenLine } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { storyById } from '../data/stories'
import { segmentText } from '../lib/textSegmentation'
import { displayExample, displayPinyin, displayWord, hanziFont } from '../lib/hanzi'
import { forScript } from '../lib/scriptConversion'
import { readingForText } from '../lib/characterReading'
import { speak, speakWithProgress, stopSpeaking } from '../lib/speech'
import { createRateEstimator, segmentSpans, segmentAt, skipTarget, predictedChar } from '../lib/narration'
import { paginateStory, budgetForArea } from '../lib/pagination'
import { playTapSound } from '../lib/sound'
import { tapHaptic, thunkHaptic, tickHaptic } from '../lib/haptics'
import { WritingPracticeModal } from '../components/WritingPracticeModal'
import { NarrationBar } from '../components/reading/NarrationBar'
import { PageDecor } from '../components/reading/PageDecor'
import { ReadingShell } from '../components/reading/ReadingShell'
import { StoryArt } from '../components/reading/StoryArt'
import { shortGloss } from '../lib/definitions'
import { ReadingSentence } from '../components/dictionary/ReadingSentence'

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
 * Everything on a reading screen that isn't the words themselves, subtracted
 * from the measured reading area to leave the space the text actually gets:
 * the translation card (measured at 256 for a long translation), the page nav
 * (40) and the scroll padding (40).
 *
 * The card is the awkward part, because its height follows the length of the
 * translation, which follows the length of the Chinese on the screen — so this
 * is sized for a wordy one and will leave a little room spare on a terse one.
 * An estimate, and allowed to be: the page sits inside a ScrollView, so a
 * screen that underfills costs nothing and one that overfills still scrolls
 * rather than clipping.
 */
const CHROME_ALLOWANCE = 336

/** The story cover in the header, at the library's 2:3. */
const COVER_WIDTH = 56
const COVER_HEIGHT = 84

/**
 * The reading progress row and the title header, above the text. The base was
 * measured — the window is 1119 tall in the browser and the scrolling area 929
 * — and the cover and its margin are added on top, because putting the cover in
 * the header takes that space away from the text on every screen.
 */
const HEADER_ALLOWANCE = 190 + COVER_HEIGHT + 8

/** `px-4` on the word grid, both sides. */
const GRID_PADDING = 32

/** The reading design's content cap, matching `ReadingShell`. */
const CONTENT_WIDTH = 430

/*
 * The Story Reader.
 *
 * A book page, not a lesson screen: no card wrapping the reading area, cream
 * showing through everywhere, hanzi in a serif that is deliberately not the UI
 * sans, and the English translation set in Lora so it reads as prose rather than
 * app chrome. Light-only, for the same reason as the library.
 */

/**
 * Coral dots under a word the learner hasn't added yet — a hint, not an error.
 *
 * **`alignSelf: 'stretch'`, never `w-full`**, and that one word is the whole
 * difference between the page reading as a paragraph and as a column of words.
 * The word box around this is sized by its own contents, and Yoga resolves a
 * percentage width against the space its *parent* was offered — which in the
 * wrapping grid is the full width of the line. So `w-full` measured this rule
 * at the width of the screen, the box grew to hold it, and every word took a
 * row of its own. It only bit on the phone: react-native-web treats the same
 * percentage as `auto` while it is measuring a shrink-to-fit box, so the
 * browser laid the page out correctly throughout. `alignSelf` asks for the
 * width the box turns out to have instead of voting on what it should be.
 */
function DottedUnderline({ width }: { width: number }) {
  const count = Math.max(3, Math.floor(width / 6))
  return (
    <View className="mt-[2px] flex-row justify-between" style={{ height: 3, alignSelf: 'stretch' }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#f46757' }} />
      ))}
    </View>
  )
}

export function StoryReader() {
  const { storyId } = useLocalSearchParams<{ storyId: string }>()
  const { wordBank, deck, addWordFromBook, settings, recordStoryPage } = useApp()
  const story = storyById(storyId)

  const [pageIndex, setPageIndex] = useState(0)
  const [practiceWordId, setPracticeWordId] = useState<string | null>(null)

  /*
   * The audiobook.
   *
   * `request` is the single source of truth for what should be speaking right
   * now: a page, the character to start from, and a token that makes every
   * request a fresh object even when the other two repeat — skipping back onto
   * the word you are already on still has to restart speech. One effect below
   * performs whatever the current request says and tears down whatever the last
   * one started, so pause, skip, page-turn and auto-advance don't each need
   * their own stop logic. `null` means silent.
   */
  const [request, setRequest] = useState<{ page: number; from: number; token: number } | null>(null)
  const [narrationOpen, setNarrationOpen] = useState(false)
  /** The character being spoken, or -1 for none. This is what the green line follows. */
  const [spokenChar, setSpokenChar] = useState(-1)
  /** The same position, readable by the skip buttons without waiting for a render. */
  const spokenCharRef = useRef(-1)
  const tokenRef = useRef(0)
  const rate = useRef(createRateEstimator()).current
  const playing = request !== null

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

  /*
   * The reading area, measured once it lays out, and the screens that fit in it.
   *
   * The library is authored in long pages — a median of 291 characters, which
   * is several screens of this layout — so they are re-cut here to what the
   * device can actually show, and each screen carries the slice of the
   * translation that belongs to it. Page numbers therefore mean a screen, not
   * an authored page, and differ between a phone and a tablet.
   */
  /*
   * Derived from the window, not from `onLayout`.
   *
   * Measuring the reading area with `onLayout` is the obvious approach and it
   * does not work here: the callback never fires for this view under
   * react-native-web, so the budget stayed at its pre-measurement fallback and
   * every screen carried three rows of text in a container with room for seven.
   * The window's size and the safe-area insets are always known, and everything
   * between them and the text — the progress row, the title header, the
   * translation card, the nav — is fixed chrome, so the same number can be
   * reached without waiting to be told.
   */
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const budget = budgetForArea(
    Math.min(windowWidth, CONTENT_WIDTH) - GRID_PADDING,
    windowHeight - insets.top - insets.bottom - HEADER_ALLOWANCE - CHROME_ALLOWANCE,
  )
  const screens = useMemo(() => (story ? paginateStory(story.pages, budget) : []), [story, budget])

  /*
   * Re-measuring (a rotation, a font-size change) can leave fewer screens than
   * before, stranding the reader past the end of the story.
   */
  useEffect(() => {
    if (screens.length > 0 && pageIndex > screens.length - 1) setPageIndex(screens.length - 1)
  }, [screens.length, pageIndex])

  const page = screens[pageIndex]
  /*
   * Segmented against the canonical traditional prose, with each segment's
   * *display* form converted to the learner's script.
   *
   * The order matters. Matching first and converting second is what keeps every
   * word interactive: `seg.word` is resolved from the authored text, so a
   * simplified learner tapping 学校 gets the same entry as a traditional learner
   * tapping 學校, and `seg.text` stays canonical so the narration cursor and
   * `segmentSpans` keep measuring against the string the voice is actually
   * reading. Converting `page.chinese` up front would have segmented simplified
   * text and lost the match on every word whose forms differ.
   */
  const segments = useMemo(
    () => (page ? segmentText(page.chinese, wordBank, settings.script) : []),
    [page, wordBank, settings.script],
  )
  /* Character spans per segment — the join between what the voice reports (a
     character) and what the page draws on (a whole word). */
  const spans = useMemo(() => segmentSpans(segments), [segments])
  const spokenSegment = useMemo(() => segmentAt(spans, spokenChar), [spans, spokenChar])
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
  /*
   * The *authored* page is recorded, not the screen index. Screens are cut to
   * fit the device, so a screen number means different text on a phone and a
   * tablet — persisting one would make a resumed story jump around between
   * them, and would leave the library's progress bar reading against a total it
   * no longer matches.
   */
  useEffect(() => {
    const source = screens[pageIndex]?.sourcePage
    if (story && source !== undefined) recordStoryPage(story.id, source)
  }, [story, screens, pageIndex, recordStoryPage])

  /*
   * Speaks whatever the current request asks for, and silences it on the way out.
   *
   * The `cancelled` flag is not belt-and-braces. Web fires the underlying `end`
   * event for a *cancelled* utterance exactly as it does for a finished one, so
   * without it every pause and every skip would arrive as "the page finished"
   * and turn the page under the learner.
   */
  useEffect(() => {
    if (!request || !story) return
    const canonical = screens[request.page]?.chinese
    if (!canonical) return
    /*
     * Spoken in the learner's script, and every offset below still counts
     * canonical characters.
     *
     * That works — and is only safe at all — because conversion preserves
     * character count: `buildWordBank.mjs` fails the build rather than emit an
     * entry whose two forms differ in length, so `text[i]` is the same position
     * in both. `spans` are measured off the canonical segments and the engine's
     * boundary offsets index this string, so the two stay in step either way.
     *
     * Worth doing rather than always speaking traditional: `mandarinLocale`
     * ranks `zh-CN` first (it is the tag engines most reliably map to Mandarin),
     * and a zh-CN voice handed traditional-only characters is the case most
     * likely to mispronounce one or fall silent on it.
     */
    const text = forScript(canonical, settings.script)

    let cancelled = false
    // A new run means a new measuring window; the estimate itself carries over.
    rate.reset()

    /*
     * Not every voice reports where it has got to, so the line is driven from
     * the clock until one proves it will.
     *
     * Chrome fires no `boundary` events at all for its remote voices, and on a
     * machine whose best Mandarin voice is one of those the highlight simply
     * froze on the first word. A real boundary is better than a prediction, so
     * the first one to arrive takes over for good and the timer stops.
     */
    let sawBoundary = false
    const startedAt = Date.now()
    const moveTo = (at: number) => {
      spokenCharRef.current = at
      setSpokenChar(at)
    }
    const ticker = setInterval(() => {
      if (cancelled || sawBoundary) return
      moveTo(predictedChar(request.from, Date.now() - startedAt, rate.perSecond(), text.length))
    }, 110)

    speakWithProgress(text.slice(request.from), {
      onBoundary: (offset) => {
        if (cancelled) return
        sawBoundary = true
        clearInterval(ticker)
        const at = request.from + offset
        moveTo(at)
        rate.record(at)
      },
      onDone: () => {
        if (cancelled) return
        clearInterval(ticker)
        // A page read start to finish reveals the speaking rate even when
        // nothing reported progress along the way, so the next page can be
        // predicted properly rather than guessed at again.
        if (!sawBoundary) rate.observeRun(text.length - request.from, Date.now() - startedAt)
        if (request.page < screens.length - 1) {
          // Straight on into the next page: an audiobook that stopped at every
          // page break would need a tap every few sentences.
          setPageIndex(request.page + 1)
          spokenCharRef.current = 0
          setSpokenChar(0)
          setRequest({ page: request.page + 1, from: 0, token: ++tokenRef.current })
        } else {
          setRequest(null)
          setSpokenChar(-1)
          spokenCharRef.current = -1
        }
      },
    })

    return () => {
      cancelled = true
      clearInterval(ticker)
      stopSpeaking()
    }
    // `settings.script` is in here so switching script mid-page restarts speech
    // in the new script rather than carrying on in the old one.
  }, [request, story, screens, rate, settings.script])

  // Leaving the screen mid-sentence must not leave a voice talking over whatever
  // the learner opens next.
  useEffect(() => () => stopSpeaking(), [])

  if (!story || !page) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-6" style={{ backgroundColor: '#fdfbf5' }}>
        <Text className="font-inter" style={{ color: '#8a8a99' }}>
          Story not found.
        </Text>
      </SafeAreaView>
    )
  }

  const totalPages = screens.length
  // Against screens rather than authored pages, so the bar creeps forward with
  // each turn instead of jumping a third of the way at a time.
  const percent = Math.round(((pageIndex + 1) / totalPages) * 100)

  /*
   * Where the narrator is in the story as a whole, for the scrubber.
   *
   * Speech has no timeline, but the position in the text is known exactly and
   * can be restarted from anywhere — so the scrubber measures characters, which
   * is a real quantity, rather than pretending to measure seconds.
   */
  const storyChars = screens.reduce((sum, s) => sum + s.chinese.length, 0)
  const charsBefore = screens.slice(0, pageIndex).reduce((sum, s) => sum + s.chinese.length, 0)
  const narrationProgress = storyChars
    ? (charsBefore + Math.max(0, spokenChar)) / storyChars
    : 0

  /** Jumps to a fraction of the whole story, across screens. */
  const seekToFraction = (fraction: number) => {
    const target = Math.round(fraction * storyChars)
    let at = 0
    for (let i = 0; i < screens.length; i++) {
      const end = at + screens[i].chinese.length
      if (target < end || i === screens.length - 1) {
        seekTo(i, Math.max(0, Math.min(target - at, screens[i].chinese.length - 1)))
        return
      }
      at = end
    }
  }

  /**
   * Moves the reading position, restarting speech only if it was already
   * running. Skipping while paused should move the place without breaking the
   * silence — that's what a paused player does.
   */
  const seekTo = (targetPage: number, from: number) => {
    if (targetPage !== pageIndex) setPageIndex(targetPage)
    spokenCharRef.current = from
    setSpokenChar(from)
    if (playing) setRequest({ page: targetPage, from, token: ++tokenRef.current })
  }

  const startNarration = () => {
    setNarrationOpen(true)
    spokenCharRef.current = 0
    setSpokenChar(0)
    setRequest({ page: pageIndex, from: 0, token: ++tokenRef.current })
  }

  const toggleNarration = () => {
    tickHaptic()
    if (playing) {
      // Pause. `spokenCharRef` keeps the place, so resuming picks up the word
      // that was interrupted rather than the top of the page.
      setRequest(null)
      return
    }
    setRequest({
      page: pageIndex,
      from: Math.max(0, spokenCharRef.current),
      token: ++tokenRef.current,
    })
  }

  const closeNarration = () => {
    setNarrationOpen(false)
    setRequest(null)
    setSpokenChar(-1)
    spokenCharRef.current = -1
  }

  const skipNarration = (seconds: number) => {
    tickHaptic()
    const from = Math.max(0, spokenCharRef.current)
    const target = skipTarget(from, seconds, rate.perSecond(), spans, page.chinese.length)

    // The skip ran off the end of this page. Those seconds genuinely belong to
    // the next one, so follow them there rather than parking on the last word.
    if (target >= page.chinese.length) {
      if (pageIndex < totalPages - 1) seekTo(pageIndex + 1, 0)
      return
    }
    seekTo(pageIndex, target)
  }

  /** Page turns by hand. Narration follows the learner rather than fighting them. */
  const goToPage = (next: number) => {
    thunkHaptic()
    seekTo(next, 0)
    if (!playing) setSpokenChar(-1)
  }

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
        {/*
          Falls back to the library rather than relying on there being somewhere
          to go back to. A story is reachable by its own URL — a deep link, a
          reload, a shared address — and in those cases nothing was pushed to
          pop, so a bare `router.back()` is a button that silently does nothing.
          The shelf is where this story came from, so it is the right answer
          whether or not the stack agrees.
        */}
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/books'))}
          accessibilityRole="button"
          accessibilityLabel="Back to library"
          hitSlop={12}
        >
          <ChevronLeft size={26} color="#1a1a2e" strokeWidth={2} />
        </Pressable>
        <View className="flex-1 items-center px-2">
          {/*
            The cover, over the title it belongs to. It sits in the header
            rather than in the scrolling text, which is what lets it appear on
            every screen without being the reason any of them overflow — the
            height it takes is fixed and is accounted for in HEADER_ALLOWANCE,
            so the text budget below simply shrinks to make room for it.
          */}
          <View className="mb-2 rounded-[11px] shadow-paper-lifted">
            <StoryArt story={story} width={COVER_WIDTH} height={COVER_HEIGHT} radius={11} />
          </View>
          <Text
            className={`${hanziFont(settings.script, 'semibold')} text-[25px] leading-[32px]`}
            style={{ color: '#1a1a2e' }}
          >
            {forScript(story.title, settings.script)}
          </Text>
          <Text className="font-lora text-sm" style={{ color: '#55545d' }}>
            {story.titleEnglish}
          </Text>
        </View>
        {/*
          Listening lives in the header, next to the title, because it is a
          property of the whole story rather than of the page you happen to be
          on. It used to hang off the translation card at the foot of the page,
          which meant scrolling to the bottom to start an audiobook — and now
          that pages are cut to fit a screen, scrolling past the text to reach
          the play button would be the only scrolling left on the screen.
        */}
        <Pressable
          onPress={startNarration}
          accessibilityRole="button"
          accessibilityLabel="Read this story aloud"
          hitSlop={10}
          className="mr-2 items-center justify-center rounded-full active:opacity-80"
          style={{ width: 38, height: 38, backgroundColor: '#f46757' }}
        >
          <Volume2 size={19} color="#ffffff" />
        </Pressable>
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
          {/*
            No hero cover here any more.

            Every screen has to have the same amount of room for text, or the
            budget would depend on which screen you were looking at and the
            story would repaginate underneath you on every page turn. Showing
            the cover on the first screen alone therefore meant that screen —
            and only that screen — overflowed and had to be scrolled, which is
            the exact thing this pagination exists to stop. The cover still
            introduces the story on the library shelf, and now names the track
            in the player, so nothing is lost by letting the reading surface be
            uniformly reading.
          */}

          {/*
            Each segment is its own column so the reading sits directly under the
            word it belongs to, rather than as one pinyin run beneath the whole
            paragraph. Wrapping is handled by the flex row, not by Text, which is
            why this is a View of columns rather than nested <Text> runs.
          */}
          <View className="flex-row flex-wrap items-start justify-center px-4">
            {segments.map((seg, i) => {
              // A matched word's own pinyin knows which reading it takes; anything
              // else falls back to the per-character index, so a name or a rare
              // character in a story still gets a sound under it.
              const reading = seg.word
                ? displayPinyin(seg.word, settings.phoneticScript)
                : readingForText(seg.text, settings.phoneticScript)
              const unknown = !!seg.word && !deckWordIds.has(seg.word.id)
              const boxWidth = seg.display.length * 25
              const spoken = spokenSegment === i

              return (
                <Pressable
                  key={i}
                  disabled={!seg.word}
                  onPress={() => {
                    if (!seg.word) return
                    playTapSound()
                    tapHaptic()
                    setSheetWordId(seg.word.id)
                  }}
                  accessibilityRole={seg.word ? 'button' : undefined}
                  accessibilityLabel={seg.word ? `${seg.display}, ${reading}` : undefined}
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
                    <Text
                      className={`${hanziFont(settings.script, 'medium')} text-[23px] leading-[31px]`}
                      style={{ color: '#17171d' }}
                    >
                      {seg.display}
                    </Text>
                    {unknown && <DottedUnderline width={boxWidth} />}
                    {/*
                      The narrator's place in the text. Absolutely positioned, and
                      sitting just outside the box's bottom edge, for two reasons:
                      nothing reflows as it moves from word to word, and it never
                      collides with the coral "not in your deck yet" dots drawn
                      inside the box.
                    */}
                    {spoken && (
                      <View
                        style={{
                          position: 'absolute',
                          left: 4,
                          right: 4,
                          bottom: -4,
                          height: 3,
                          borderRadius: 2,
                          backgroundColor: '#45b887',
                        }}
                      />
                    )}
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

          </View>

          {totalPages > 1 && (
            <View className="mt-7 flex-row items-center justify-between px-5">
              <Pressable
                disabled={pageIndex === 0}
                onPress={() => goToPage(pageIndex - 1)}
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
                onPress={() => goToPage(pageIndex + 1)}
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

      {/* Before the word sheet in the tree, so the sheet rises over the transport
          rather than under it when a word is tapped mid-narration. */}
      <NarrationBar
        visible={narrationOpen}
        playing={playing}
        story={story}
        progress={narrationProgress}
        onTogglePlay={toggleNarration}
        onSkip={skipNarration}
        onSeek={seekToFraction}
        onClose={closeNarration}
      />

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

              <Text
                className={`${hanziFont(settings.script, 'medium')} text-[40px] leading-[52px]`}
                style={{ color: '#202027' }}
              >
                {displayWord(sheetWord, settings.script)}
              </Text>

              <View className="mt-1 flex-row items-center gap-2">
                <Text className="font-inter text-[15px]" style={{ color: '#66636a' }}>
                  {displayPinyin(sheetWord, settings.phoneticScript)}
                </Text>
                <Pressable
                  onPress={() => speak(displayWord(sheetWord, settings.script))}
                  accessibilityRole="button"
                  accessibilityLabel={`Play pronunciation of ${displayWord(sheetWord, settings.script)}`}
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
                    <View className="flex-1">
                      {/*
                        No `script` override: this sentence is word-bank data,
                        which carries both forms, so ReadingSentence's default
                        (the learner's preference) is exactly right. Only the
                        story's own authored prose needs converting, and that
                        happens in `segmentText` above.
                      */}
                      <ReadingSentence
                        text={displayExample(sheetWord, settings.script)}
                        term={displayWord(sheetWord, settings.script)}
                        tone="paper"
                        size="compact"
                      />
                    </View>
                    <Pressable
                      onPress={() => speak(displayExample(sheetWord, settings.script))}
                      accessibilityRole="button"
                      accessibilityLabel="Play example sentence"
                      hitSlop={10}
                      className="pt-1.5"
                    >
                      <Volume2 size={15} color="#96928e" />
                    </Pressable>
                  </View>
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
