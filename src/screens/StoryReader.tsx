import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, Animated, Easing, Platform, useWindowDimensions } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { ChevronLeft, ChevronDown, Check, Plus, Volume2, PenLine } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { storyById } from '../data/stories'
import { segmentText } from '../lib/textSegmentation'
import { displayExample, displayPinyin, displayWord, hanziFont } from '../lib/hanzi'
import { forScript } from '../lib/scriptConversion'
import { speak, speakWithProgress, stopSpeaking } from '../lib/speech'
import { clauseEnd, createRateEstimator, segmentSpans, skipTarget, predictedChar } from '../lib/narration'
import { paginateStory, budgetForArea } from '../lib/pagination'
import { playTapSound } from '../lib/sound'
import { tapHaptic, tickHaptic } from '../lib/haptics'
import { WritingPracticeModal } from '../components/WritingPracticeModal'
import { NarrationBar } from '../components/reading/NarrationBar'
import { shortGloss } from '../lib/definitions'
import { ReadingSentence } from '../components/dictionary/ReadingSentence'
import { BookCover } from '../components/book/BookCover'
import { PageFlip, type PageFlipHandle } from '../components/book/PageFlip'
import { BookBlock, EndPage, TextPage, TitlePage } from '../components/book/BookPages'
import { BOOK_CELL, BOOK_CONTENT_MAX, TRANSLATION_ALLOWANCE, bookColors as c, bookSize } from '../components/book/tokens'
import type { PhoneticScript, ScriptMode, VocabWord } from '../types'

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

/** Breathing room between the header and the top of the page. */
const PAGE_TOP_GAP = 8

/*
 * The Story Reader — a book, built to the Beta 2.1 reference
 * (`102 Book Redesign uI.png`).
 *
 * A story opens on its cover (`BookCover`). "Start Reading" swings the cover
 * open onto a title page, and from there the story is turned a page at a time:
 * swiped, with the page following the finger over the spine in perspective, or
 * by the arrows at the middle of the page (`PageFlip`). Every page is a sheet
 * of paper cut to fit — the pagination below is measured against the page, so
 * a page ends where its paper does instead of scrolling.
 *
 * Book page 0 is the title page; book page n is story screen n − 1; the page
 * after the last screen is the End page. Everything that thinks in story
 * screens (narration, progress) converts at the edges.
 */
export function StoryReader() {
  const { storyId } = useLocalSearchParams<{ storyId: string }>()
  const { wordBank, deck, addWordFromBook, settings, updateSettings, recordStoryPage, trackLearningEvent, storyProgress } = useApp()
  const story = storyById(storyId)

  /** The page the book is open at: 0 the title page, n story screen n − 1. */
  const [bookIndex, setBookIndex] = useState(0)
  const [coverShown, setCoverShown] = useState(true)
  const [practiceWordId, setPracticeWordId] = useState<string | null>(null)
  const flip = useRef<PageFlipHandle>(null)

  /*
   * The audiobook.
   *
   * `request` is the single source of truth for what should be speaking right
   * now: a story screen, the character to start from, and a token that makes
   * every request a fresh object even when the other two repeat — skipping back
   * onto the word you are already on still has to restart speech. One effect
   * below performs whatever the current request says and tears down whatever
   * the last one started, so pause, skip, page-turn and auto-advance don't each
   * need their own stop logic. `null` means silent.
   */
  const [request, setRequest] = useState<{ page: number; from: number; token: number } | null>(null)
  const [narrationOpen, setNarrationOpen] = useState(false)
  /** The header's 讀音 dropdown. */
  const [readingsOpen, setReadingsOpen] = useState(false)
  /** The character being spoken, or -1 for none. This is what the highlight follows. */
  const [spokenChar, setSpokenChar] = useState(-1)
  /** The same position, readable by the skip buttons without waiting for a render. */
  const spokenCharRef = useRef(-1)
  const tokenRef = useRef(0)
  /** Narration was asked for from the title page: start it once the first page has turned in. */
  const startOnTurnRef = useRef(false)
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
   * The page, and the story cut to fit it.
   *
   * Derived from the window and the safe-area insets rather than `onLayout`,
   * which does not fire reliably for this kind of view under react-native-web.
   * Everything between the window's edges and the paper is fixed chrome — the
   * header, the gaps round the page — so the page's size is known up front, and
   * the text area inside it is the paper less its margins and the room kept
   * back for the translation.
   */
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const column = Math.min(windowWidth, BOOK_CONTENT_MAX)
  const pageW = column - bookSize.spineGap - bookSize.edgeGap
  const pageH = Math.max(
    360,
    windowHeight - insets.top - insets.bottom - bookSize.header - PAGE_TOP_GAP - bookSize.footGap,
  )
  const budget = budgetForArea(
    pageW - bookSize.padX * 2,
    pageH - bookSize.padTop - bookSize.padBottom - TRANSLATION_ALLOWANCE,
    BOOK_CELL,
  )
  /* One sentence a page at least, and never more than fits: a book page cannot scroll. */
  const screens = useMemo(
    () => (story ? paginateStory(story.pages, budget, { minSentences: 1, maxChars: budget }) : []),
    [story, budget],
  )
  /** The title page, every story screen, and the End page. */
  const bookPages = screens.length + 2
  const endPage = screens.length + 1
  /** The story screen on view: -1 on the title page, `screens.length` on the End page. */
  const pageIndex = bookIndex - 1
  /** The screen narration works from — the last one, when the book is open at the End page. */
  const narrationPage = Math.min(Math.max(0, pageIndex), screens.length - 1)

  /*
   * Re-measuring (a rotation, a font-size change) can leave fewer pages than
   * before, stranding the reader past the end of the story.
   */
  useEffect(() => {
    if (screens.length > 0 && bookIndex > screens.length + 1) setBookIndex(screens.length + 1)
  }, [screens.length, bookIndex])

  /*
   * Reaching the last page finishes the story, for the reading achievements —
   * once per opening, so paging back and forth on the last page counts one
   * read, and reading the story again another day counts again.
   */
  const finishCounted = useRef(false)
  useEffect(() => {
    if (finishCounted.current || screens.length === 0 || bookIndex < screens.length || !story) return
    finishCounted.current = true
    trackLearningEvent({ type: 'STORY_FINISHED', storyId: story.id })
  }, [bookIndex, screens.length, story, trackLearningEvent])

  const page = pageIndex >= 0 ? screens[pageIndex] : undefined
  /*
   * The page on view, segmented the way `TextPage` draws it — the narration
   * controls need its word spans to skip by whole words. `segmentText` caches
   * its table, so doing this here as well as in the page costs little.
   */
  const segments = useMemo(
    () => (page ? segmentText(page.chinese, wordBank, settings.script) : []),
    [page, wordBank, settings.script],
  )
  const spans = useMemo(() => segmentSpans(segments), [segments])
  const sheetWord = sheetWordId ? wordBank.find((w) => w.id === sheetWordId) : undefined
  const practiceWord = practiceWordId ? wordBank.find((w) => w.id === practiceWordId) : undefined
  const alreadyAdded = sheetWord ? deck.some((card) => card.wordId === sheetWord.id) : false

  const deckWordIds = useMemo(() => new Set(deck.map((card) => card.wordId)), [deck])

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

  /*
   * Reaching a page is what counts as reading it. The *authored* page is
   * recorded, not the book page: pages are cut to fit the device, so a page
   * number means different text on a phone and a tablet, and persisting one
   * would make a resumed story jump between them.
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
     * canonical characters — safe because conversion preserves character count
     * (`buildWordBank.mjs` fails the build rather than emit an entry whose two
     * forms differ in length).
     */
    const text = forScript(canonical, settings.script)

    let cancelled = false
    // A new run means a new measuring window; the estimate itself carries over.
    rate.reset()

    /*
     * The highlight runs on the clock between whatever boundaries the voice
     * reports. Chrome fires none at all for its remote voices, and Android's
     * Mandarin engines typically fire one per *clause* — so stopping the clock
     * at the first real boundary, as this used to, left the line parked on the
     * first word of every clause while the voice read on. Each boundary
     * re-anchors the prediction; once a voice has proved it reports them, the
     * prediction is held inside the clause it is in, so the next boundary is
     * always a step forward rather than a correction back.
     */
    let sawBoundary = false
    let anchor = request.from
    let anchoredAt = Date.now()
    const startedAt = anchoredAt
    const moveTo = (at: number) => {
      if (at === spokenCharRef.current) return
      spokenCharRef.current = at
      setSpokenChar(at)
    }
    const ticker = setInterval(() => {
      if (cancelled) return
      const predicted = predictedChar(anchor, Date.now() - anchoredAt, rate.perSecond(), text.length)
      moveTo(sawBoundary ? Math.min(predicted, clauseEnd(text, anchor)) : predicted)
    }, 110)

    speakWithProgress(text.slice(request.from), {
      onBoundary: (offset) => {
        if (cancelled) return
        sawBoundary = true
        const at = request.from + offset
        anchor = at
        anchoredAt = Date.now()
        moveTo(at)
        rate.record(at)
      },
      onDone: () => {
        if (cancelled) return
        clearInterval(ticker)
        if (!sawBoundary) rate.observeRun(text.length - request.from, Date.now() - startedAt)
        if (request.page < screens.length - 1) {
          /*
           * Straight on into the next page — and turned like one, so the
           * audiobook reads as a book being read. The turn's own commit
           * (`handleTurn`) starts the next page's speech. Should a turn already
           * be under way (the learner mid-swipe), jump instead.
           */
          if (!flip.current?.turn('next')) {
            setBookIndex(request.page + 2)
            spokenCharRef.current = 0
            setSpokenChar(0)
            setRequest({ page: request.page + 1, from: 0, token: ++tokenRef.current })
          }
        } else {
          // The story is over: fall silent and turn to the End page.
          setRequest(null)
          setSpokenChar(-1)
          spokenCharRef.current = -1
          flip.current?.turn('next')
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

  const openWord = useCallback((word: VocabWord) => {
    playTapSound()
    tapHaptic()
    setSheetWordId(word.id)
  }, [])

  if (!story || screens.length === 0) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-6" style={{ backgroundColor: c.backdrop }}>
        <Text className="font-inter" style={{ color: c.inkFaint }}>
          Story not found.
        </Text>
      </SafeAreaView>
    )
  }

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/books'))

  /*
   * Where the narrator is in the story as a whole, for the scrubber. Speech has
   * no timeline, but the position in the text is known exactly and can be
   * restarted from anywhere — so the scrubber measures characters.
   */
  const storyChars = screens.reduce((sum, s) => sum + s.chinese.length, 0)
  const charsBefore = screens.slice(0, Math.max(0, pageIndex)).reduce((sum, s) => sum + s.chinese.length, 0)
  const narrationProgress = storyChars ? (charsBefore + Math.max(0, spokenChar)) / storyChars : 0
  /* The clock under the scrubber. Speech has no timeline, so both numbers are
     characters over the voice's measured speaking rate — the same estimate that
     drives the highlight and the ±5s buttons. */
  const charsPerSecond = rate.perSecond()
  const narrationTotal = storyChars / charsPerSecond

  /**
   * Moves the reading position to a story screen, restarting speech only if it
   * was already running. Skipping while paused moves the place without
   * breaking the silence — that's what a paused player does. A jump, not a
   * turn: the scrubber can cross half the book.
   */
  const seekTo = (targetPage: number, from: number) => {
    if (targetPage !== pageIndex) setBookIndex(targetPage + 1)
    spokenCharRef.current = from
    setSpokenChar(from)
    if (playing) setRequest({ page: targetPage, from, token: ++tokenRef.current })
  }

  /** Jumps to a fraction of the whole story, across pages. */
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

  /*
   * A page has finished turning — by hand, by arrow or by the narrator.
   * Narration follows the book: still playing, it starts on the page now open;
   * turned back to the title page, it stops, there being nothing there to read.
   */
  const handleTurn = (next: number) => {
    setBookIndex(next)
    const wantsAudio = playing || startOnTurnRef.current
    startOnTurnRef.current = false
    if (!wantsAudio) {
      spokenCharRef.current = -1
      setSpokenChar(-1)
      return
    }
    if (next < 1 || next === endPage) {
      setRequest(null)
      spokenCharRef.current = -1
      setSpokenChar(-1)
      return
    }
    spokenCharRef.current = 0
    setSpokenChar(0)
    setRequest({ page: next - 1, from: 0, token: ++tokenRef.current })
  }

  const startNarration = () => {
    setNarrationOpen(true)
    // From the End page there is nothing left to read: start the story again.
    if (bookIndex === endPage) {
      setBookIndex(1)
      spokenCharRef.current = 0
      setSpokenChar(0)
      setRequest({ page: 0, from: 0, token: ++tokenRef.current })
      return
    }
    // From the title page, turn to the first page and read from there.
    if (bookIndex === 0) {
      startOnTurnRef.current = true
      if (flip.current?.turn('next')) return
      startOnTurnRef.current = false
      setBookIndex(1)
    }
    spokenCharRef.current = 0
    setSpokenChar(0)
    setRequest({ page: narrationPage, from: 0, token: ++tokenRef.current })
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
      page: narrationPage,
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
    if (!page) return
    tickHaptic()
    const from = Math.max(0, spokenCharRef.current)
    const target = skipTarget(from, seconds, rate.perSecond(), spans, page.chinese.length)

    // The skip ran off the end of this page. Those seconds genuinely belong to
    // the next one, so follow them there rather than parking on the last word.
    if (target >= page.chinese.length) {
      if (pageIndex < screens.length - 1) seekTo(pageIndex + 1, 0)
      return
    }
    seekTo(pageIndex, target)
  }

  /*
   * Where "Continue Reading" opens the book: the first page of the furthest
   * authored page reached. A story never opened, or read only on its first
   * authored page, opens on the title page.
   */
  const furthest = storyProgress[story.id]
  const resumeAt = furthest ? screens.findIndex((s) => s.sourcePage === furthest) + 1 : 0

  const renderPage = (i: number) =>
    i === 0 ? (
      <TitlePage story={story} width={pageW} height={pageH} script={settings.script} />
    ) : i === endPage ? (
      <EndPage story={story} width={pageW} height={pageH} script={settings.script} onDone={leave} />
    ) : (
      <TextPage
        screen={screens[i - 1]}
        width={pageW}
        height={pageH}
        folio={`${i} / ${screens.length}`}
        wordBank={wordBank}
        deckWordIds={deckWordIds}
        script={settings.script}
        phonetic={settings.phoneticScript}
        spokenChar={i === bookIndex ? spokenChar : -1}
        onPressWord={openWord}
      />
    )

  return (
    // Clipped: the turn arrows straddle the page edge, and on a phone-width
    // window one pokes past the screen — which on web makes the page pan sideways.
    <View style={{ flex: 1, backgroundColor: c.backdrop, overflow: 'hidden' }}>
      {/* The cover is this screen's arrival, so the stack's own push slide stays out
          of it. And no swipe-back: on iOS a swipe in from the left edge would leave
          the book instead of turning back a page — the back arrow is the way out. */}
      <Stack.Screen options={{ animation: 'none', gestureEnabled: false }} />

      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, alignItems: 'center' }}>
        <View style={{ width: column, flex: 1 }}>
          {/* Header: back, the title, and the narrator. */}
          <View style={{ height: bookSize.header, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
            {/*
              Falls back to the library rather than relying on there being
              somewhere to go back to: a story is reachable by its own URL, and
              then nothing was pushed to pop.
            */}
            <Pressable onPress={leave} accessibilityRole="button" accessibilityLabel="Back to library" hitSlop={12}>
              <ChevronLeft size={26} color={c.ink} strokeWidth={2} />
            </Pressable>
            <Text
              numberOfLines={1}
              className={hanziFont(settings.script, 'semibold')}
              style={{ flex: 1, textAlign: 'center', fontSize: 17, color: c.ink, paddingHorizontal: 8 }}
            >
              {forScript(story.title, settings.script)}
            </Text>
            <Pressable
              onPress={startNarration}
              accessibilityRole="button"
              accessibilityLabel="Read this story aloud"
              hitSlop={10}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: c.narratorDisc,
                  borderWidth: 2,
                  borderColor: c.narratorRim,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#3A2A14',
                  shadowOffset: { width: 0, height: 2 },
                  shadowRadius: 4,
                  shadowOpacity: 0.22,
                  elevation: 3,
                }}
              >
                <Volume2 size={19} color="#FFFFFF" strokeWidth={2.2} />
              </View>
            </Pressable>
            {/*
              Readings, right where they show: hidden, zhuyin or pinyin. Hidden
              fades them without moving a character, so the learner can test
              themselves on the page and bring them back for a word. The same
              two settings as Settings → Learning preferences.
            */}
            <Pressable
              onPress={() => {
                tickHaptic()
                setReadingsOpen((o) => !o)
              }}
              accessibilityRole="button"
              accessibilityState={{ expanded: readingsOpen }}
              accessibilityLabel="Readings"
              hitSlop={8}
              style={{ marginLeft: 10 }}
            >
              <View
                style={{
                  height: 36,
                  paddingLeft: 14,
                  paddingRight: 10,
                  borderRadius: 18,
                  backgroundColor: c.readingsPill,
                  borderWidth: 1,
                  borderColor: c.readingsBorder,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Text
                  className={hanziFont(settings.script, 'semibold')}
                  style={{ fontSize: 15, color: c.ink, includeFontPadding: false }}
                >
                  {forScript('讀音', settings.script)}
                </Text>
                <ChevronDown size={16} color={c.ink} strokeWidth={2.4} style={{ marginLeft: 4 }} />
              </View>
            </Pressable>
          </View>

          {/* The open book. */}
          <View style={{ marginTop: PAGE_TOP_GAP, marginLeft: bookSize.spineGap, width: pageW, height: pageH }}>
            <BookBlock width={pageW} height={pageH} />
            <View
              style={{
                shadowColor: '#3A2A14',
                shadowOffset: { width: 0, height: 3 },
                shadowRadius: 8,
                shadowOpacity: 0.14,
                elevation: 3,
                borderRadius: bookSize.radius.outer,
              }}
            >
              <PageFlip
                ref={flip}
                index={bookIndex}
                count={bookPages}
                width={pageW}
                height={pageH}
                renderPage={renderPage}
                onTurn={handleTurn}
              />
            </View>
          </View>
        </View>
      </SafeAreaView>

      {readingsOpen && (
        <ReadingsMenu
          top={insets.top + bookSize.header - 4}
          right={(windowWidth - column) / 2 + 10}
          script={settings.script}
          value={settings.showReadings ? settings.phoneticScript : 'hidden'}
          onPick={(v) => {
            tickHaptic()
            setReadingsOpen(false)
            updateSettings(v === 'hidden' ? { showReadings: false } : { showReadings: true, phoneticScript: v })
          }}
          onDismiss={() => setReadingsOpen(false)}
        />
      )}

      {/* Before the word sheet in the tree, so the sheet rises over the transport
          rather than under it when a word is tapped mid-narration. */}
      <NarrationBar
        visible={narrationOpen}
        playing={playing}
        story={story}
        progress={narrationProgress}
        totalSeconds={narrationTotal}
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
            an Animated.View, so the outer one carries only plain styles and the
            transform, and the inner plain View keeps the Tailwind styling.
          */}
          <Animated.View
            onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
            style={[
              { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
              { transform: [{ translateY: sheetTranslateY }], opacity: sheetProgress },
            ]}
          >
            {/* A sheet of stationery rather than a modal: warm paper, one hairline
                at the fold, and a shadow that falls upward onto the page behind it. */}
            <View
              className="rounded-t-[30px] px-6 pb-8 pt-3 shadow-paper-sheet"
              style={{
                width: '100%',
                maxWidth: BOOK_CONTENT_MAX,
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
                never generated, so this block simply isn't there for words
                without an example, rather than showing an empty frame.
              */}
              {sheetWord.example && (
                <View
                  className="mt-4 rounded-[14px] px-4 pb-3 pt-2.5"
                  style={{ backgroundColor: '#faf6ec', borderWidth: 1, borderColor: 'rgba(215,203,183,0.5)' }}
                >
                  <View className="flex-row items-start gap-2">
                    <View className="flex-1">
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
                    style={{ backgroundColor: c.tealSoft }}
                  >
                    <Check size={18} color={c.teal} />
                    <Text className="font-inter-semibold text-[15px]" style={{ color: c.teal }}>
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
                    className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-full active:opacity-80"
                    style={{ backgroundColor: c.teal }}
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

      {coverShown && (
        <BookCover
          story={story}
          script={settings.script}
          resuming={resumeAt > 1}
          onBack={leave}
          onStart={() => setBookIndex(Math.max(0, Math.min(resumeAt, screens.length)))}
          onOpened={() => setCoverShown(false)}
        />
      )}
    </View>
  )
}

type ReadingsChoice = 'hidden' | PhoneticScript

const READINGS_OPTIONS: { value: ReadingsChoice; label: string; a11y: string }[] = [
  { value: 'hidden', label: '隱藏', a11y: 'Hide readings' },
  { value: 'zhuyin', label: '注音', a11y: 'Zhuyin' },
  { value: 'pinyin', label: '拼音', a11y: 'Pinyin' },
]

/**
 * The 讀音 dropdown (SS1012): a paper card hung under the pill, one radio row
 * per choice. Laid over the whole screen with a transparent backdrop, so a tap
 * anywhere else closes it rather than turning a page or opening a word.
 */
function ReadingsMenu({
  top,
  right,
  script,
  value,
  onPick,
  onDismiss,
}: {
  top: number
  right: number
  script: ScriptMode
  value: ReadingsChoice
  onPick: (v: ReadingsChoice) => void
  onDismiss: () => void
}) {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20, elevation: 20 }}>
      <Pressable style={{ flex: 1 }} onPress={onDismiss} accessibilityLabel="Close readings menu" />
      <View
        accessibilityRole="radiogroup"
        style={{
          position: 'absolute',
          top,
          right,
          width: 150,
          padding: 6,
          borderRadius: 14,
          backgroundColor: c.readingsPill,
          borderWidth: 1,
          borderColor: c.readingsBorder,
          shadowColor: '#3A2A14',
          shadowOffset: { width: 0, height: 6 },
          shadowRadius: 14,
          shadowOpacity: 0.16,
          elevation: 8,
        }}
      >
        {READINGS_OPTIONS.map((o) => {
          const picked = o.value === value
          return (
            <Pressable
              key={o.value}
              onPress={() => onPick(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: picked }}
              accessibilityLabel={o.a11y}
            >
              <View
                style={{
                  height: 44,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: picked ? c.readingsPicked : 'transparent',
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: picked ? 2 : 1.5,
                    borderColor: picked ? c.narratorDisc : c.readingsRing,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {picked && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.narratorDisc }} />}
                </View>
                <Text
                  className={hanziFont(script, 'medium')}
                  style={{ marginLeft: 12, fontSize: 15, color: c.ink, includeFontPadding: false }}
                >
                  {forScript(o.label, script)}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
