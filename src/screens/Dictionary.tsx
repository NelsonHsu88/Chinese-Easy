import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { View, Text, TextInput, ScrollView, Pressable, Animated, Easing, Platform, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { ChevronLeft, Search, X, Layers } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { displayPinyin } from '../lib/hanzi'
import {
  buildDeckIndex,
  characterList,
  entryStateFor,
  isInDeck,
  searchWords,
  starterList,
  wordToDiscover,
  type DeckIndex,
  type SearchField,
} from '../lib/dictionary'
import { todayISO } from '../lib/date'
import { warmLookup } from '../data/lookupWords'
import { PressScale } from '../components/dictionary/PressScale'
import { dictEntrance } from '../components/dictionary/entrance'
import { useEntranceRun, useReveal } from '../components/dashboard/entrance'
import { useScrollToTopOnFocus } from '../components/useScrollToTopOnFocus'
import { ShadowRevealProvider, useShadowReveal } from '../components/shadowReveal'
import { EntryCard } from '../components/dictionary/EntryCard'
import {
  ExploreGrid,
  FilterPanel,
  FilterRow,
  HskLevelBar,
  RecentList,
  SectionHeading,
  WordToDiscover,
} from '../components/dictionary/Landing'
import { ICON_GREEN, ICON_GREEN_DARK, ICON_MUTED, ICON_STROKE } from '../components/dictionary/DictionaryControls'
import { DICT_BG, DICT_BUTTON_SHADOW } from '../components/dictionary/shadows'
import { UndoBar } from '../components/dictionary/UndoBar'
import { FlexGap } from '../components/FlexGap'
import { WritingPracticeModal } from '../components/WritingPracticeModal'
import { playPositiveChime } from '../lib/sound'
import { tapHaptic, tickHaptic, successHaptic, sequence } from '../lib/haptics'
import type { VocabWord } from '../types'
import { AppBannerAd } from '../components/ads/AppBannerAd'
import { TourScrollContext, TourTarget } from '../components/tour/targets'

/**
 * The design viewport, matching `DASH_CONTENT_MAX` / `REV_CONTENT_MAX` /
 * `SET_CONTENT_MAX`. Wider windows centre the column rather than stretch it —
 * these are phone-sized objects, and a search field a foot across is not the
 * same design at a larger size.
 */
const DICT_CONTENT_MAX = 430

/** The page's side margin. The Word to discover wash is sized off what's left. */
const GUTTER = 20

/** Any Han character — CJK Unified Ideographs plus Extension A. */
const HAS_HANZI = /[㐀-䶿一-鿿]/

/** Rows shown in the Recent group before "See all". */
const RECENT_PREVIEW = 2

/**
 * The shelves the landing opens onto. Each is a titled list with a way back;
 * none is a separate route, so the search field stays where it is above them.
 */
type Shelf = 'recents' | 'vocabulary' | 'characters'

/**
 * Fades its children in from 0 opacity when `animate` is true at mount, and
 * renders at full opacity immediately when it's false — never anything else.
 *
 * Deliberately *remounted* per section (`key={section}` at the call site)
 * rather than reusing one shared Animated.Value that gets reset in a layout
 * effect: a fresh Animated.Value can only ever hold the value it was
 * constructed with on its first render, so there is no frame in which a new
 * section could paint at full opacity before an effect catches up and hides
 * it again. See the comment above `shownSectionBefore` in `Dictionary`.
 *
 * Opacity only, no `translateY` — animating `transform` promotes the layer to
 * its own GPU compositing surface, and Chrome (and other browsers) render
 * text through a blurred, resampled texture for as long as that layer is in
 * motion. A plain opacity fade rasterises normally on every frame, so the
 * level pills, shelf title and word cards stay legible the whole way through
 * instead of reading as not-yet-loaded until the motion settles.
 */
/** Content's own fade — the "standard" Material curve. The shadow ramp below
    starts with it but runs on the app's slower shared shadow curve. */
const FADE_DURATION = 420
const FADE_EASING = Easing.bezier(0.4, 0, 0.2, 1)

function FadeSection({ animate, children }: { animate: boolean; children: ReactNode }) {
  const opacity = useRef(new Animated.Value(animate ? 0 : 1)).current
  useEffect(() => {
    if (!animate) return
    const animation = Animated.timing(opacity, {
      toValue: 1,
      // Slow and deliberate, on an explicit cubic bezier (the "standard"
      // Material curve) rather than one of the built-in named easings — eases
      // in gently, decelerates into rest, no sudden start or stop to catch
      // the eye.
      duration: FADE_DURATION,
      easing: FADE_EASING,
      useNativeDriver: Platform.OS !== 'web',
    })
    animation.start()
    // Backstop: without the native driver this runs on requestAnimationFrame,
    // which a backgrounded browser tab stalls, so this forces the resting
    // value once the animation should long since have finished.
    const settle = setTimeout(() => opacity.setValue(1), FADE_DURATION + 80)
    return () => {
      animation.stop()
      clearTimeout(settle)
    }
    // Runs once: this component is freshly mounted (via `key`) for every
    // section, so `animate` can never change under an existing instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /*
   * A card's `elevation`/`shadowOpacity` can't ride the native driver `opacity`
   * above does, so it gets a second, always-JS value, starting with the fade
   * and creeping in on the shared slow shadow curve (`shadowReveal.tsx`) —
   * every `EntryCard` and Landing card reads this through `useRevealedShadow`
   * instead of a fixed shadow constant, so the shadow visibly settles in under
   * the card rather than appearing already at full strength partway through.
   * `settled` mirrors `animate`: the first section a screen shows has nothing
   * to ramp up from either.
   */
  const shadowProgress = useShadowReveal({ duration: FADE_DURATION, run: 0, settled: !animate })

  return (
    /*
     * `needsOffscreenAlphaCompositing`: belt and braces alongside the shadow
     * ramp above — without it, Android fades every overlapping layer in this
     * subtree independently, which is most visible on a whole shelf of
     * `EntryCard`s fading in at once. iOS and web ignore the prop; it costs
     * nothing there.
     */
    <Animated.View style={{ opacity }} needsOffscreenAlphaCompositing>
      <ShadowRevealProvider value={shadowProgress}>{children}</ShadowRevealProvider>
    </Animated.View>
  )
}

export function Dictionary() {
  const {
    wordBank,
    settings,
    updateSettings,
    deck,
    addToReviewDeck,
    removeFromReviewDeck,
    recentSearchIds,
    pushRecentSearch,
    newlyAddedWordIds,
    getWord,
  } = useApp()

  // `?q=` lets other screens open the dictionary already searching for something
  // — the character screen's "view all words containing 學" uses it. `?reload=`
  // carries no meaning of its own — see the reset effect below.
  const params = useLocalSearchParams<{ q?: string; reload?: string }>()
  const [query, setQuery] = useState(params.q ?? '')
  const [focused, setFocused] = useState(false)
  /*
   * Defaults to English — most searches are someone translating a word they
   * already know. This is only the *default*: typing actual Hanzi always
   * falls back to matching every field regardless (see `results` below),
   * because someone typing Chinese characters plainly isn't searching for an
   * English gloss, and the field the learner explicitly picks in the filter
   * panel is never second-guessed.
   */
  const [field, setField] = useState<SearchField>('english')
  const [hskLevel, setHskLevel] = useState(settings.hskLevel || 1)
  /** "HSK n" rather than "All" in the filter row — scopes search results to one level. */
  const [levelOnly, setLevelOnly] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [shelf, setShelf] = useState<Shelf | null>(null)
  const [practiceWord, setPracticeWord] = useState<VocabWord | null>(null)
  /** Word ids from the last bulk add, kept only while the undo bar is up. */
  const [lastBulkAdd, setLastBulkAdd] = useState<string[] | null>(null)

  /*
   * Tapping the Dictionary tab while already sitting on this screen (see
   * `(tabs)/_layout.tsx`) bumps `?reload=` rather than navigating anywhere —
   * the route doesn't change, so nothing else would tell this screen a fresh
   * arrival was intended. `params.reload` starts `undefined` and only ever
   * becomes a string after that bump, so this never fires on mount.
   */
  const reloadedAt = params.reload
  useEffect(() => {
    if (reloadedAt === undefined) return
    setQuery('')
    setField('all')
    setLevelOnly(false)
    setPanelOpen(false)
    setShelf(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadedAt])

  /*
   * Build the tier-2 row index while the learner is still reading the page.
   *
   * It is a fixed ~100ms of string work the first time anything searches the
   * lookup tail. Paid here it is invisible; paid lazily it lands on whichever
   * keystroke first fails to fill the page from the learning bank, which is a
   * visible stall in the middle of typing a rare word — exactly the search this
   * feature exists to serve. Deferred a beat so it can't delay the first paint.
   */
  useEffect(() => {
    const timer = setTimeout(warmLookup, 0)
    return () => clearTimeout(timer)
  }, [])

  const searching = query.trim().length > 0
  const browsing = !searching && shelf === null

  /*
   * Which of the three sections below is showing — search results, a shelf, or
   * the landing itself. Opening the HSK Vocabulary/Characters tiles is meant to
   * feel like arriving on a new screen, not a value flipping in place, so this
   * is watched below and turned into a reveal each time it changes.
   */
  const section = searching ? 'search' : shelf ?? 'landing'

  /*
   * The column. Capped at the design width and centred, like every other screen
   * in the app. Derived rather than measured with `onLayout`, which does not
   * fire for every view on this project's web target.
   */
  const { width: windowWidth } = useWindowDimensions()
  const columnWidth = Math.min(windowWidth, DICT_CONTENT_MAX)

  /* The entrance, replayed on every arrival — the page rises as one piece. */
  const run = useEntranceRun()
  const page = useReveal({
    from: 'bottom',
    at: dictEntrance.page.at,
    duration: dictEntrance.page.for,
    run,
    distance: dictEntrance.page.rise,
  })

  /*
   * Whether `section` has ever changed before this render — false only for
   * the very first section the screen shows (where `page`'s own entrance is
   * the only motion needed), true for every section after that. Read once
   * per render into `animateSection` below and handed to `FadeSection` as an
   * `animate` prop it only ever consults at its own mount, because that
   * component is *remounted* — via `key={section}` below — for every section
   * rather than reusing one shared, mutable Animated.Value.
   *
   * That remount is the point. The previous approach kept one Animated.Value
   * alive across every section and reset it to 0 in a `useLayoutEffect` right
   * before replaying it up to 1 — which worked, but left a real seam: if
   * anything (a slow commit, a second state update landing in the same tick)
   * let the browser paint even one frame between the old section settling at
   * 1 and that reset reaching 0, the learner saw the *finished* new section
   * flash on screen before it snapped invisible and the fade "redid" itself
   * from scratch. A remounted section can't do that — React never has a
   * frame to paint where a freshly created Animated.Value holds any value
   * other than the one it was constructed with, so there is no seam for a
   * flash to land in.
   */
  const shownSectionBefore = useRef(false)
  const animateSection = shownSectionBefore.current
  useEffect(() => {
    shownSectionBefore.current = true
  }, [section])

  /* Coming back to the dictionary means coming back to the search field, not to
     wherever the last visit left the shelves. */
  const scroll = useScrollToTopOnFocus()

  /* Shifu's Dictionary guide points at the Explore grid and the word to
     discover, which start below the fold on a short phone — so it can ask for
     a scroll. The offset is tracked rather than read back, as on the Dashboard. */
  const scrollY = useRef(0)
  const tourScrollBy = useMemo(
    () => (dy: number) => scroll.current?.scrollTo({ y: Math.max(0, scrollY.current + dy), animated: true }),
    [scroll],
  )

  const recentWords = useMemo(
    () => recentSearchIds.map((id) => getWord(id)).filter((w): w is VocabWord => Boolean(w)),
    [recentSearchIds, getWord],
  )

  const vocabulary = useMemo(() => starterList(wordBank, hskLevel), [wordBank, hskLevel])
  const characters = useMemo(() => characterList(wordBank, hskLevel), [wordBank, hskLevel])

  /*
   * Keyed on the day string so a dictionary left open across midnight (or a
   * developer-clock jump) moves on, while every render within a day agrees.
   */
  const today = todayISO()
  const discover = useMemo(
    () => wordToDiscover(wordBank, settings.hskLevel || 1, today),
    [wordBank, settings.hskLevel, today],
  )

  /** Deck membership as hash lookups — see `buildDeckIndex`. */
  const deckIndex = useMemo(() => buildDeckIndex(deck, newlyAddedWordIds), [deck, newlyAddedWordIds])

  /*
   * "English" is only the default value of `field` — someone who actually
   * typed Hanzi is never searching for an English gloss, so that default
   * steps aside and every field is matched instead. An explicit choice from
   * the filter panel (`hanzi`, `pinyin`, or picking "All" back) is never
   * overridden here — only the untouched default is.
   */
  const effectiveField = field === 'english' && HAS_HANZI.test(query) ? 'all' : field

  const results = useMemo(() => {
    if (searching) {
      const found = searchWords(wordBank, query, effectiveField)
      return levelOnly ? found.filter((w) => w.hskLevel === hskLevel) : found
    }
    if (shelf === 'recents') return recentWords
    if (shelf === 'vocabulary') return vocabulary
    if (shelf === 'characters') return characters
    return []
  }, [searching, wordBank, query, effectiveField, levelOnly, hskLevel, shelf, recentWords, vocabulary, characters])

  /** Vocabulary-shelf words not yet in the deck — what bulk add would actually add. */
  const pending = useMemo(() => vocabulary.filter((w) => !isInDeck(w.id, deckIndex)), [vocabulary, deckIndex])

  const bulkAdd = () => {
    if (pending.length === 0) return
    sequence([
      { at: 0, fire: tapHaptic },
      { at: 90, fire: successHaptic },
    ])
    playPositiveChime()
    for (const w of pending) addToReviewDeck(w.id)
    // Only the words this tap actually added — undoing must not pull out cards
    // that were already in the deck beforehand.
    setLastBulkAdd(pending.map((w) => w.id))
  }

  const undoBulkAdd = () => {
    if (!lastBulkAdd) return
    // Light impact: something was taken away, so it shouldn't feel like a win.
    tapHaptic()
    removeFromReviewDeck(lastBulkAdd)
    setLastBulkAdd(null)
  }

  const openWord = (word: VocabWord) => {
    // Opening an entry counts as looking it up, which is what feeds Recents.
    tapHaptic()
    pushRecentSearch(word.id)
    router.push(`/dictionary-tab/word/${encodeURIComponent(word.id)}`)
  }

  const shelfTitle =
    shelf === 'recents' ? 'Recent' : shelf === 'vocabulary' ? `HSK ${hskLevel} vocabulary` : `HSK ${hskLevel} characters`

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-dict-page">
      <ScrollView
        ref={scroll}
        /*
         * `flexGrow: 1` so the column below can fill the height the tab
         * navigator gives this screen rather than stopping at its own content
         * height; on a short device there is no slack and the page scrolls.
         */
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y
        }}
        scrollEventThrottle={32}
      >
        <TourScrollContext.Provider value={tourScrollBy}>
        {/* Plain styles on the animated view with the column in a plain View
            inside it — NativeWind drops `className` on an `Animated.View`, and
            an animated `transform` replaces the whole array rather than merging
            into it. `needsOffscreenAlphaCompositing` for the same reason
            `FadeSection` carries it: this reveal fades in over every shadowed
            card on the page, and without it Android fades each card's
            `elevation` shadow and its fill as separate layers, on their own
            schedules. */}
        <Animated.View style={[{ width: columnWidth, flexGrow: 1 }, page]} needsOffscreenAlphaCompositing>
          <View style={{ flexGrow: 1, paddingHorizontal: GUTTER }}>
            {/*
              The heading is the title and the search field, and nothing else.
              The reference draws a brand block and an ink-wash landscape above
              it; both were left out on purpose, so the page opens on what it
              is for.
            */}
            <View className="pb-5 pt-4">
              <Text className="font-lora-bold text-[40px] leading-[48px] text-dict-heading">Dictionary</Text>
              <Text className="mt-1 font-dict-sans text-[16px] leading-[22px] text-dict-soft">
                Find meaning. Discover more.
              </Text>
            </View>

            {/*
              Search — the dominant control on the page. No shadow: a drawn warm
              edge carries it, and focus is marked by that edge turning jade.
              Only the border colour varies between the two states, so the class
              string never toggles anything NativeWind would have to re-parse.
            */}
            <TourTarget id="dictionary-search" radius={20}>
            <View
              className={`flex-row items-center rounded-[20px] border bg-dict-card pl-4 pr-2 ${
                focused ? 'border-dict-green/60' : 'border-dict-border'
              }`}
              style={{ height: 60, gap: 12 }}
            >
              <Search size={22} color={focused ? ICON_GREEN : ICON_MUTED} strokeWidth={ICON_STROKE} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Search Chinese, pinyin or English"
                placeholderTextColor={ICON_MUTED}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
                /*
                 * iOS remembers the last keyboard/input-method a field used and
                 * reopens it by default — on a device with a Chinese (Pinyin)
                 * keyboard installed, that means this field can pop up in Chinese
                 * input mode instead of a plain Latin one. `ascii-capable` pins it
                 * to a Latin keyboard; pinyin search still works fine typed on
                 * one, since pinyin *is* Latin letters, and the field still takes
                 * pasted or dictated Hanzi. No equivalent exists on Android, where
                 * the OS — not the app — owns IME selection.
                 */
                keyboardType="ascii-capable"
                accessibilityLabel="Search the dictionary"
                className="flex-1 text-[16px] text-dict-heading"
                /*
                 * Hanzi typed into the field are set in the serif face, pinyin
                 * and English in the UI sans — keyed on what was actually typed
                 * rather than on the field being non-empty, so "pengyou" doesn't
                 * get rendered in a Chinese serif.
                 */
                style={{ fontFamily: HAS_HANZI.test(query) ? 'NotoSerifTC' : 'NunitoSans', height: '100%' }}
              />
              {query.length > 0 && (
                <Pressable
                  onPress={() => {
                    tickHaptic()
                    setQuery('')
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  hitSlop={8}
                  className="h-11 w-11 items-center justify-center"
                >
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-dict-muted/30">
                    <X size={15} color="#ffffff" strokeWidth={2.5} />
                  </View>
                </Pressable>
              )}
            </View>
            </TourTarget>

            {/*
              Everything below the search field fades in together on every
              section change — landing to a shelf, a shelf back to landing,
              into search and out again — so opening HSK Vocabulary/Characters
              reads as arriving on a new screen rather than the content
              silently swapping underneath the header. The level pills and
              filter panel used to sit outside this wrapper and so switched
              instantly while the section below them was still fading in,
              which read as some of the page having already loaded and the
              rest not yet — see `FadeSection` above.
            */}
            <FadeSection key={section} animate={animateSection}>
            <View className="mt-3.5">
              {shelf === 'vocabulary' || shelf === 'characters' ? (
                <HskLevelBar
                  level={hskLevel}
                  panelOpen={panelOpen}
                  refined={field !== 'all'}
                  onLevel={setHskLevel}
                  onPanel={() => setPanelOpen((open) => !open)}
                />
              ) : (
                <TourTarget id="dictionary-filters" radius={22}>
                <FilterRow
                  levelOnly={levelOnly}
                  hskLevel={hskLevel}
                  script={settings.script}
                  panelOpen={panelOpen}
                  refined={field !== 'all'}
                  onScope={setLevelOnly}
                  onScript={() =>
                    updateSettings({ script: settings.script === 'traditional' ? 'simplified' : 'traditional' })
                  }
                  onPanel={() => setPanelOpen((open) => !open)}
                />
                </TourTarget>
              )}
            </View>

            {/*
              Level and search field live behind the round button. Picking a
              level also switches the row to it — choosing HSK 4 and then still
              searching every level would be the panel ignoring its own answer.
            */}
            {panelOpen && (
              <FilterPanel
                hskLevel={hskLevel}
                field={field}
                onLevel={(level) => {
                  setHskLevel(level)
                  setLevelOnly(true)
                }}
                onField={setField}
              />
            )}

            {searching ? (
              <>
                <Text className="mb-1 mt-7 font-lora-bold text-[21px] leading-[28px] text-dict-heading">Results</Text>
                <ResultList
                  results={results}
                  emptyBody={
                    levelOnly
                      ? `Nothing at HSK ${hskLevel}. Tap All to search every level.`
                      : 'Try a different spelling, or change what to search in.'
                  }
                  settings={settings}
                  deckIndex={deckIndex}
                  onOpen={openWord}
                  onAdd={addToReviewDeck}
                  onPractice={setPracticeWord}
                />
              </>
            ) : shelf ? (
              <BrowseResults
                title={shelfTitle}
                emptyTitle={shelf === 'recents' ? 'No recent searches' : 'Nothing at this level'}
                emptyBody={shelf === 'recents' ? 'Words you look up will show up here.' : 'Try another HSK level.'}
                action={
                  shelf === 'vocabulary' ? (
                    <PressScale
                      onPress={bulkAdd}
                      disabled={pending.length === 0}
                      className="flex-row items-center justify-center gap-1.5 rounded-full border border-dict-green/30 bg-dict-green-pale px-4"
                      style={[{ height: 44 }, DICT_BUTTON_SHADOW, { borderRadius: 999, backgroundColor: DICT_BG.greenPale }]}
                      accessibilityLabel={`Add ${pending.length} words to My Words`}
                    >
                      <Layers size={16} color={ICON_GREEN} strokeWidth={ICON_STROKE} />
                      <Text className="font-dict-bold text-[14px] text-dict-green-dark">
                        {pending.length === 0 ? 'All in your deck' : `Add all ${pending.length} to My Words`}
                      </Text>
                    </PressScale>
                  ) : null
                }
                results={results}
                settings={settings}
                deckIndex={deckIndex}
                onBack={() => setShelf(null)}
                onOpen={openWord}
                onAdd={addToReviewDeck}
                onPractice={setPracticeWord}
              />
            ) : (
              <>
                {/* Explore opens the landing, then Word to discover; Recent closes it. */}
                <FlexGap min={30} max={40} />
                <SectionHeading title="Explore" />
                <TourTarget id="dictionary-explore" radius={18}>
                  <ExploreGrid
                    script={settings.script}
                    onVocabulary={() => setShelf('vocabulary')}
                    onCharacters={() => setShelf('characters')}
                    onRadicals={() => router.push('/radicals')}
                    onMyWords={() => router.push('/my-words')}
                  />
                </TourTarget>

                {discover && (
                  <>
                    <FlexGap min={30} max={40} />
                    <TourTarget id="dictionary-discover" radius={20}>
                      <WordToDiscover
                        word={discover}
                        settings={settings}
                        added={isInDeck(discover.id, deckIndex)}
                        width={columnWidth - GUTTER * 2}
                        onOpen={() => openWord(discover)}
                        onAdd={() => addToReviewDeck(discover.id)}
                      />
                    </TourTarget>
                  </>
                )}

                <FlexGap min={30} max={40} />
                <SectionHeading
                  title="Recent"
                  onSeeAll={recentWords.length > RECENT_PREVIEW ? () => setShelf('recents') : undefined}
                />
                <RecentList words={recentWords.slice(0, RECENT_PREVIEW)} settings={settings} onOpen={openWord} />
              </>
            )}
            </FadeSection>

            {/* Below everything, carried by its own margin — see AppBannerAd. */}
            <AppBannerAd placement="dictionary" />
          </View>
        </Animated.View>
        </TourScrollContext.Provider>
      </ScrollView>

      {lastBulkAdd && lastBulkAdd.length > 0 && (
        <UndoBar
          message={`Added ${lastBulkAdd.length} word${lastBulkAdd.length === 1 ? '' : 's'} to your deck`}
          onUndo={undoBulkAdd}
          onDismiss={() => setLastBulkAdd(null)}
        />
      )}

      {practiceWord && <WritingPracticeModal word={practiceWord} onClose={() => setPracticeWord(null)} />}
    </SafeAreaView>
  )
}

/** Shared props for the two result lists. */
interface ResultListProps {
  results: VocabWord[]
  settings: ReturnType<typeof useApp>['settings']
  deckIndex: DeckIndex
  onOpen: (word: VocabWord) => void
  onAdd: (wordId: string) => void
  onPractice: (word: VocabWord) => void
}

function ResultList({
  results,
  emptyTitle = 'No matches',
  emptyBody = 'Try a different spelling, or change what to search in.',
  settings,
  deckIndex,
  onOpen,
  onAdd,
  onPractice,
}: ResultListProps & { emptyTitle?: string; emptyBody?: string }) {
  if (results.length === 0) {
    return (
      <View className="mt-10 items-center gap-2 px-6">
        <Text className="font-dict-bold text-[17px] text-dict-heading">{emptyTitle}</Text>
        <Text className="text-center font-dict-sans text-[15px] leading-[21px] text-dict-soft">{emptyBody}</Text>
      </View>
    )
  }

  return (
    <View className="mt-3 gap-3">
      {results.map((word, i) => (
        <EntryCard
          key={word.id}
          word={word}
          pinyin={displayPinyin(word, settings.phoneticScript)}
          script={settings.script}
          state={entryStateFor(word.id, deckIndex)}
          expanded={i === 0}
          onOpen={() => onOpen(word)}
          onAdd={() => onAdd(word.id)}
          onPractice={() => onPractice(word)}
        />
      ))}
    </View>
  )
}

/** A titled shelf with a way back out — Recent, HSK vocabulary, characters. */
function BrowseResults({
  title,
  onBack,
  emptyTitle,
  emptyBody,
  action,
  ...rest
}: ResultListProps & {
  title: string
  onBack: () => void
  emptyTitle?: string
  emptyBody?: string
  /** An optional control under the heading — bulk add, on the vocabulary shelf. */
  action?: React.ReactNode
}) {
  return (
    <>
      <View className="flex-row items-center justify-between pb-3 pt-7">
        <Text className="flex-1 font-lora-bold text-[21px] leading-[28px] text-dict-heading">{title}</Text>
        <PressScale
          onPress={() => {
            tickHaptic()
            onBack()
          }}
          className="flex-row items-center gap-1.5 rounded-full border border-dict-border bg-dict-card pl-3 pr-4"
          style={[{ height: 44 }, DICT_BUTTON_SHADOW, { borderRadius: 999, backgroundColor: DICT_BG.card }]}
          accessibilityLabel="Back to the dictionary home"
        >
          <ChevronLeft size={19} color={ICON_GREEN_DARK} strokeWidth={2.5} />
          <Text className="font-dict-bold text-[14px] text-dict-green-dark">Back</Text>
        </PressScale>
      </View>
      {action}
      <ResultList emptyTitle={emptyTitle} emptyBody={emptyBody} {...rest} />
    </>
  )
}
