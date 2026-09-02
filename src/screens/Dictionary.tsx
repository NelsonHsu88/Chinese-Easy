import { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Animated,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import {
  Search,
  X,
  ChevronRight,
  History,
  Bookmark,
  Shapes,
  Layers,
  RotateCcw,
  Check,
  UtensilsCrossed,
  Plane,
  Users,
  Briefcase,
  FlaskConical,
  Sun,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { displayPinyin, displayWord, hanziFont } from '../lib/hanzi'
import { shortGloss } from '../lib/definitions'
import {
  SEARCH_FIELDS,
  buildDeckIndex,
  entryStateFor,
  isInDeck,
  searchWords,
  starterList,
  type DeckIndex,
  type SearchField,
} from '../lib/dictionary'
import { warmLookup } from '../data/lookupWords'
import { PressScale } from '../components/dictionary/PressScale'
import { TourPulse } from '../components/tour/TourPulse'
import { dashShadowLifted } from '../components/dashboard/tokens'
import { matchesWaterSearch } from '../lib/tour'
/* `HeaderScene` — the ink-wash landscape that used to sit behind the heading —
   is no longer drawn here: Shifu says what this screen is for instead. It stays
   exported for the corner wash beside it, which the two column cards still use. */
import { CornerWash } from '../components/dictionary/HeaderScene'
import { DictionaryIntro } from '../components/dictionary/DictionaryIntro'
import { dictEntrance } from '../components/dictionary/entrance'
import { useEntranceRun, useReveal } from '../components/dashboard/entrance'
import { useScrollToTopOnFocus } from '../components/useScrollToTopOnFocus'
import { EntryCard } from '../components/dictionary/EntryCard'
import {
  AddCircleButton,
  FilterChip,
  ICON_GREEN,
  ICON_GREEN_DARK,
  ICON_MUTED,
  ICON_STROKE,
} from '../components/dictionary/DictionaryControls'
import { UndoBar } from '../components/dictionary/UndoBar'
import { FlexGap } from '../components/FlexGap'
import { WritingPracticeModal } from '../components/WritingPracticeModal'
import { playPositiveChime } from '../lib/sound'
import { tapHaptic, tickHaptic, successHaptic, sequence } from '../lib/haptics'
import type { ScriptMode, VocabWord, WordCategory } from '../types'
import { AppBannerAd } from '../components/ads/AppBannerAd'

const HSK_LEVELS = [1, 2, 3, 4, 5, 6]

/**
 * The design viewport, matching `DASH_CONTENT_MAX` / `REV_CONTENT_MAX` /
 * `SET_CONTENT_MAX`. Wider windows centre the column rather than stretch it —
 * these are phone-sized objects, and a search field a foot across is not the
 * same design at a larger size.
 */
const DICT_CONTENT_MAX = 430

/** Any Han character — CJK Unified Ideographs plus Extension A. */
const HAS_HANZI = /[㐀-䶿一-鿿]/

/**
 * Category tiles.
 *
 * Short labels rather than `CATEGORY_META`'s full ones ("Food", not "Food &
 * Drink") — the tiles are small and the mockup's labels are single words.
 *
 * **Each icon is drawn in its own colour**, which is the one thing that makes
 * this row read as illustration rather than as six more controls. Every icon in
 * one slate grey on six different pastels looks like a settings list somebody
 * tinted; a green fork on mint and a blue aeroplane on pale blue read as a set
 * of pictures. The colours are picked to sit *on* their own tile rather than to
 * be six unrelated hues.
 *
 * This is the deliberate exception to the screen's icon rule (see
 * `DictionaryControls`): navigation and actions are one muted line-icon system,
 * learning categories are allowed colour.
 */
const CATEGORY_TILES: {
  category: WordCategory
  label: string
  icon: LucideIcon
  tile: string
  ink: string
}[] = [
  { category: 'food', label: 'Food', icon: UtensilsCrossed, tile: 'bg-dict-tile-green', ink: '#3F8F52' },
  { category: 'travel', label: 'Travel', icon: Plane, tile: 'bg-dict-tile-blue', ink: '#3F7BA8' },
  { category: 'people', label: 'Family', icon: Users, tile: 'bg-dict-tile-peach', ink: '#D07A45' },
  { category: 'work', label: 'School', icon: Briefcase, tile: 'bg-dict-tile-lilac', ink: '#6A5CA8' },
  { category: 'daily', label: 'Daily Life', icon: Sun, tile: 'bg-dict-tile-butter', ink: '#C08B24' },
  { category: 'science', label: 'Science', icon: FlaskConical, tile: 'bg-dict-tile-rose', ink: '#B05572' },
]

/**
 * Page heading — the title and standfirst shared by both states.
 *
 * The landscape only appears while browsing. On a search or a category list the
 * heading is a label on a set of results, and decoration beside it would be
 * competing with the thing the learner came to read.
 *
 * Both lines carry a `paddingRight` measured off the scene rather than a fixed
 * one, so the title can never run under the bonsai at any screen width — it
 * wraps instead, which is survivable where a collision is not. The subtitle is
 * given less clearance on purpose: the scene's left edge is faint mist by then,
 * and holding the whole line clear of it would break it over three lines.
 */
function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View className="pb-3.5 pt-1">
      <Text className="font-dict-extrabold text-[32px] leading-[38px] text-dict-heading">{title}</Text>
      <Text className="mt-0.5 font-dict-sans text-[15px] leading-[20px] text-dict-body">{subtitle}</Text>
    </View>
  )
}

/**
 * The heading and count row shared by the two narrow cards.
 *
 * Extracted because the two must match: they sit side by side, and the whole
 * point of the pair is that the learner reads across them. When only one of
 * them carried a See-all row, its list started a row lower than the other's
 * and nothing below lined up again.
 */
function ColumnCardHeader({
  title,
  count,
  onSeeAll,
  seeAllLabel,
}: {
  title: string
  count: number
  onSeeAll: () => void
  seeAllLabel: string
}) {
  return (
    <>
      <Text className="font-dict-bold text-[15px] leading-[20px] text-dict-heading">{title}</Text>
      <View className="mt-1 flex-row items-center justify-between">
        <PressScale
          onPress={() => {
            tickHaptic()
            onSeeAll()
          }}
          className="flex-row items-center gap-0.5"
          accessibilityLabel={seeAllLabel}
        >
          <Text className="font-dict-semibold text-[13px] text-dict-green">See all</Text>
          <ChevronRight size={14} color={ICON_GREEN} strokeWidth={ICON_STROKE} />
        </PressScale>
        <View className="rounded-full bg-dict-green-pale px-2 py-0.5">
          <Text className="font-dict-bold text-[11.5px] text-dict-green-dark">{count}</Text>
        </View>
      </View>
    </>
  )
}

/**
 * The action at the foot of a narrow card.
 *
 * One shape for both, which is the entire fix for the pair looking crooked:
 * "Review all" was a bare text link over a hairline rule while "Add all" was a
 * filled pill, so the two footers sat at different heights and neither the
 * baselines nor the card bottoms agreed.
 */
function ColumnCardAction({
  icon: Icon,
  label,
  onPress,
  disabled = false,
  accessibilityLabel,
}: {
  icon: LucideIcon
  label: string
  onPress: () => void
  disabled?: boolean
  accessibilityLabel: string
}) {
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      outerClassName="w-full"
      className="flex-row items-center justify-center gap-1.5 rounded-dict-sm bg-dict-green-pale px-2 py-2.5"
      accessibilityLabel={accessibilityLabel}
    >
      <Icon size={15} color={ICON_GREEN} strokeWidth={ICON_STROKE} />
      <Text numberOfLines={1} className="font-dict-bold text-[13px] text-dict-green-dark">
        {label}
      </Text>
    </PressScale>
  )
}

/**
 * @param pad Tailwind padding class. The default suits a full-width card; the
 *   two-column pair below run tighter — at half a phone's width a 20pt inset on
 *   both sides is most of the room a word row has to work in.
 *
 * `overflow-hidden` is load-bearing rather than defensive: the two narrow cards
 * carry an ink wash in the corner that is drawn larger than the space it sits
 * in, and the rounded corner is what turns that overhang into a wash bleeding
 * off the card instead of a rectangle of painting lying on top of one.
 */
function SectionCard({
  children,
  className = '',
  pad = 'p-4',
  style,
}: {
  children: React.ReactNode
  className?: string
  pad?: string
  /** Flex weight for the two-column pair. */
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View className={`overflow-hidden rounded-dict bg-dict-card shadow-dict ${pad} ${className}`} style={style}>
      {children}
    </View>
  )
}

/**
 * The square character tile — one of the page's visual motifs.
 *
 * Deep ink on a very pale ground, never pure black on white. `mint` marks a word
 * already in the deck; `paper` is the neutral ground the starter list uses for
 * words still on offer.
 */
function CharTile({ character, tone, script }: { character: string; tone: 'mint' | 'paper'; script: ScriptMode }) {
  return (
    <View
      className={`items-center justify-center rounded-dict-sm ${tone === 'mint' ? 'bg-dict-tile-green' : 'bg-dict-page'}`}
      style={{ width: 44, height: 44 }}
    >
      <Text className={`${hanziFont(script)} text-[25px] leading-[32px] text-dict-heading`}>{character}</Text>
    </View>
  )
}

/**
 * The reading and gloss beside a character tile.
 *
 * Both are held to one line. In a half-width column a two-line gloss pushes its
 * row taller than the rows around it, and the two lists stop lining up — which
 * is the whole reason for putting them side by side.
 */
function WordMeta({ reading, gloss }: { reading: string; gloss: string }) {
  return (
    <View className="flex-1">
      <Text numberOfLines={1} className="font-dict-semibold text-[14px] leading-[18px] text-dict-heading">
        {reading}
      </Text>
      <Text numberOfLines={1} className="font-dict-sans text-[12.5px] leading-[16px] text-dict-muted">
        {gloss}
      </Text>
    </View>
  )
}

export function Dictionary() {
  const {
    wordBank,
    settings,
    deck,
    addToReviewDeck,
    removeFromReviewDeck,
    recentSearchIds,
    pushRecentSearch,
    newlyAddedWordIds,
    getWord,
    reportTourAction,
  } = useApp()

  // `?q=` lets other screens open the dictionary already searching for something
  // — the character screen's "view all words containing 學" uses it.
  const params = useLocalSearchParams<{ q?: string }>()
  const [query, setQuery] = useState(params.q ?? '')
  const [field, setField] = useState<SearchField>('all')
  const [hskLevel, setHskLevel] = useState(settings.hskLevel || 1)
  const [category, setCategory] = useState<WordCategory | null>(null)
  /*
   * Shifu's tour asks the learner to look up "water" and waits for it. Watching
   * the query rather than the keystroke means any route to the same place counts
   * — typing it, pasting it, or arriving with `?q=` from another screen.
   */
  useEffect(() => {
    if (matchesWaterSearch(query)) reportTourAction('dictionary:search')
  }, [query, reportTourAction])

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

  const [showRecents, setShowRecents] = useState(false)
  const [showStarter, setShowStarter] = useState(false)
  /** The whole deck, newest first — "See all" on the Recently added column. */
  const [showAdded, setShowAdded] = useState(false)
  /** The HSK levels, which now live behind the filter button beside search. */
  const [levelPickerOpen, setLevelPickerOpen] = useState(false)
  const [allCategories, setAllCategories] = useState(false)
  const [practiceWord, setPracticeWord] = useState<VocabWord | null>(null)
  /** Word ids from the last bulk add, kept only while the undo bar is up. */
  const [lastBulkAdd, setLastBulkAdd] = useState<string[] | null>(null)

  const searching = query.trim().length > 0
  const browsing = !searching && category === null && !showRecents && !showStarter && !showAdded

  /*
   * The column. Capped at the design width and centred, like every other screen
   * in the app — this is a phone interface, and on a wide window it should read
   * as one rather than expanding to fill the glass.
   *
   * Derived rather than measured with `onLayout`, which does not fire for every
   * view on this project's web target — a column laid out at zero width is an
   * empty screen, not an obviously broken one.
   */
  const { width: windowWidth } = useWindowDimensions()
  const columnWidth = Math.min(windowWidth, DICT_CONTENT_MAX)

  /*
   * The entrance, replayed on every arrival — see `dictEntrance`. The page
   * comes up as one piece and Shifu follows out of it; his own beats are inside
   * `DictionaryIntro`, keyed off the same `run`.
   */
  const run = useEntranceRun()
  const page = useReveal({
    from: 'bottom',
    at: dictEntrance.page.at,
    duration: dictEntrance.page.for,
    run,
    distance: dictEntrance.page.rise,
  })

  /* Coming back to the dictionary means coming back to the search field, not to
     wherever the last visit left the shelves. */
  const scroll = useScrollToTopOnFocus()

  const recentWords = useMemo(
    () => recentSearchIds.map((id) => getWord(id)).filter((w): w is VocabWord => Boolean(w)),
    [recentSearchIds, getWord],
  )

  const starter = useMemo(() => starterList(wordBank, hskLevel), [wordBank, hskLevel])
  const starterPreview = starter.slice(0, 5)

  /** Deck membership as hash lookups — see `buildDeckIndex`. */
  const deckIndex = useMemo(() => buildDeckIndex(deck, newlyAddedWordIds), [deck, newlyAddedWordIds])

  /*
   * "Recently added" reads the tail of the deck. `addToReviewDeck` appends, and
   * cards carry no added-at timestamp, so array order is the only record of when
   * something arrived — reversed here so the newest sits on top. The card shows
   * the first three; "See all" shows the lot.
   */
  const addedNewestFirst = useMemo(
    () =>
      deck
        .slice()
        .reverse()
        .map((card) => getWord(card.wordId))
        .filter((w): w is VocabWord => Boolean(w)),
    [deck, getWord],
  )

  const recentlyAdded = addedNewestFirst.slice(0, 3)

  const results = useMemo(() => {
    if (searching) return searchWords(wordBank, query, field)
    if (category) {
      return wordBank.filter((w) => w.category === category && w.hskLevel === hskLevel).slice(0, 40)
    }
    if (showRecents) return recentWords
    if (showAdded) return addedNewestFirst
    // Reuses the memo above rather than filtering and sorting the 20k-entry bank
    // a second time for the same list.
    if (showStarter) return starter
    return []
  }, [
    searching,
    wordBank,
    query,
    field,
    category,
    hskLevel,
    showRecents,
    recentWords,
    showAdded,
    addedNewestFirst,
    showStarter,
    starter,
  ])

  /** Starter words not yet in the deck — what bulk add would actually add. */
  const pending = useMemo(() => starter.filter((w) => !isInDeck(w.id, deckIndex)), [starter, deckIndex])

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

  const pendingCount = pending.length

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-dict-page">
      <ScrollView
        ref={scroll}
        /*
         * `flexGrow: 1` so the column below can fill the height the tab
         * navigator gives this screen, rather than being laid out to its own
         * content height and leaving the remainder as bare paper. On a short
         * device there is no free space to hand out and the page simply scrolls,
         * which is the behaviour it already had.
         */
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/*
          The column, capped and centred — the same treatment the Dashboard,
          Settings and Review all use, and the thing this screen was missing.
          Uncapped it stretched to whatever width the browser happened to be,
          which is what made a phone screen read as a desktop dashboard: two
          "narrow" word columns 400pt wide each, a search field a foot across,
          and five category tiles marooned at one end of an empty row.
        */}
        {/* Plain styles on the animated view with the column in a plain View
            inside it — NativeWind drops `className` on an `Animated.View`, and
            an animated `transform` replaces the whole array rather than merging
            into it. */}
        <Animated.View style={[{ width: columnWidth, flexGrow: 1 }, page]}>
        <View style={{ flexGrow: 1, paddingHorizontal: 16 }}>
        {browsing ? (
          <>
            {/* Title only — the standfirst and the landscape are now Shifu's
                line below, which says the same thing once instead of three
                times. See `DictionaryIntro`. */}
            <View className="pb-3 pt-1">
              <Text className="font-dict-extrabold text-[32px] leading-[38px] text-dict-heading">
                Discover Words
              </Text>
            </View>
            <DictionaryIntro run={run} />
          </>
        ) : (
          <PageHeader title="Dictionary" subtitle="Look up words and add them to your deck." />
        )}

        {/* Search field, with the level filter beside it */}
        <View className="flex-row items-center" style={{ gap: 10 }}>
          {/* The ring goes round the field, not the level button beside it. */}
          <TourPulse target="dictionary-search" radius={20} style={{ flex: 1 }}>
          {/*
            The lift comes from `dashShadowLifted`, not from `shadow-dict`.
            NativeWind compiles a `shadow-*` class to the iOS shadow props alone,
            and Android draws shadows from `elevation` — which no Tailwind class
            sets — so the field was completely flat on Android however it looked
            in the simulator. The token objects carry both. Same fix the
            dictionary's speech bubble already needed.

            The *lifted* one rather than the plain `dashShadow`: this is the one
            control on the screen that is meant to sit above the paper, and at
            `elevation: 2` the difference was too fine to read on a phone.
          */}
          <View
            className="flex-row items-center gap-2.5 rounded-dict bg-dict-card px-4"
            style={{ height: 54, ...dashShadowLifted }}
          >
            <Search size={21} color={ICON_MUTED} strokeWidth={ICON_STROKE} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search words or pinyin"
              placeholderTextColor={ICON_MUTED}
              className="flex-1 text-[15.5px] text-dict-heading"
              /*
               * Hanzi typed into the field are set in the serif face, pinyin and
               * English in the UI sans — keyed on what was actually typed rather
               * than on the field being non-empty, so "pengyou" doesn't get
               * rendered in a Chinese serif.
               */
              style={{ fontFamily: HAS_HANZI.test(query) ? 'NotoSerifTC' : 'NunitoSans' }}
            />
            {query.length > 0 && (
              <Pressable
                onPress={() => {
                  tickHaptic()
                  setQuery('')
                }}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                className="h-7 w-7 items-center justify-center rounded-full bg-dict-muted/30"
              >
                <X size={15} color="#ffffff" strokeWidth={2.5} />
              </Pressable>
            )}
          </View>
          </TourPulse>

          {/*
            The HSK level, which used to be a scrolling row of six chips taking a
            whole band of the page to say one number. As a button it costs
            nothing until it is asked a question, and it carries the current
            level on its face so the answer is still visible at a glance.
          */}
          {browsing && (
            <PressScale
              onPress={() => {
                tickHaptic()
                setLevelPickerOpen((open) => !open)
              }}
              className={`items-center justify-center rounded-dict shadow-dict ${
                levelPickerOpen ? 'bg-dict-green' : 'bg-dict-card'
              }`}
              style={{ width: 54, height: 54 }}
              accessibilityLabel={`Filter by level, currently HSK ${hskLevel}`}
            >
              <SlidersHorizontal
                size={18}
                color={levelPickerOpen ? '#ffffff' : ICON_GREEN}
                strokeWidth={ICON_STROKE}
              />
              <Text
                className={`font-dict-bold text-[11px] leading-[14px] ${
                  levelPickerOpen ? 'text-white' : 'text-dict-green-dark'
                }`}
              >
                HSK {hskLevel}
              </Text>
            </PressScale>
          )}
        </View>

        {/*
          The levels themselves, only while the filter is open. Picking one
          closes the panel — the level is shown on the button afterwards, so
          leaving the row up would be showing the same answer twice.
        */}
        {browsing && levelPickerOpen && (
          <View className="mt-2.5 rounded-dict bg-dict-card p-3 shadow-dict">
            <Text className="mb-2.5 font-dict-semibold text-[12.5px] leading-[16px] text-dict-muted">
              Filter the lists below by level
            </Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {HSK_LEVELS.map((level) => (
                <FilterChip
                  key={level}
                  label={`HSK ${level}`}
                  selected={hskLevel === level}
                  onPress={() => {
                    setHskLevel(level)
                    setLevelPickerOpen(false)
                  }}
                />
              ))}
            </View>
          </View>
        )}

        {searching ? (
          <SearchResults
            results={results}
            field={field}
            onField={setField}
            settings={settings}
            deckIndex={deckIndex}
            onOpen={openWord}
            onAdd={addToReviewDeck}
            onPractice={setPracticeWord}
          />
        ) : category || showRecents || showStarter || showAdded ? (
          <BrowseResults
            title={
              category
                ? `${CATEGORY_TILES.find((t) => t.category === category)?.label} · HSK ${hskLevel}`
                : showStarter
                  ? `HSK ${hskLevel} starter list`
                  : showAdded
                    ? 'Recently added'
                    : 'Recent searches'
            }
            emptyTitle={
              category
                ? 'Nothing at this level'
                : showStarter
                  ? 'No starter words'
                  : showAdded
                    ? 'Nothing added yet'
                    : 'No recent searches'
            }
            emptyBody={
              category
                ? 'Try another HSK level for this category.'
                : showStarter
                  ? 'Try another HSK level.'
                  : showAdded
                    ? 'Words you add to your deck will show up here.'
                    : 'Words you look up will show up here.'
            }
            results={results}
            settings={settings}
            deckIndex={deckIndex}
            onBack={() => {
              setCategory(null)
              setShowRecents(false)
              setShowStarter(false)
              setShowAdded(false)
            }}
            onOpen={openWord}
            onAdd={addToReviewDeck}
            onPractice={setPracticeWord}
          />
        ) : (
          <>
            {/*
              Quick links sit directly under the search field: Recents, My Words
              and Radicals are destinations rather than results, so they belong
              with the search bar and above the level filter that scopes what is
              below it.
            */}
            {/*
              Room for the search field's shadow to land in, and then some.

              This has been raised twice. At 16 the quick links sat inside the
              shadow's own falloff — it offsets 4 down and blurs 12 — so the lift
              was drawn and then landed on, and the two surfaces read as one
              crowded block. 26 was still reported as the card cutting into the
              field. These are two separate objects doing separate jobs, one a
              control and one a set of destinations, so the separation should be
              unambiguous rather than tuned to the millimetre.
            */}
            <FlexGap min={40} max={48} grow={0.5} />
            <SectionCard pad="px-2 py-3" className="flex-row items-center">
              <QuickLink
                icon={History}
                label="Recents"
                detail={`${recentWords.length} word${recentWords.length === 1 ? '' : 's'}`}
                onPress={() => {
                  tapHaptic()
                  setShowRecents(true)
                }}
              />
              {/* Stretched rather than a fixed 36pt: the links are stacked now,
                  and a rule shorter than the thing it divides reads as a stray
                  mark rather than as a separator. */}
              <View className="w-px self-stretch bg-dict-line" />
              <QuickLink
                icon={Bookmark}
                label="My Words"
                detail={`${deck.length} word${deck.length === 1 ? '' : 's'}`}
                onPress={() => {
                  tapHaptic()
                  router.push('/my-words')
                }}
              />
              {/* Stretched rather than a fixed 36pt: the links are stacked now,
                  and a rule shorter than the thing it divides reads as a stray
                  mark rather than as a separator. */}
              <View className="w-px self-stretch bg-dict-line" />
              <QuickLink
                icon={Shapes}
                label="Radicals"
                detail="Browse"
                onPress={() => {
                  tapHaptic()
                  router.push('/radicals')
                }}
              />
            </SectionCard>

            <FlexGap min={14} max={20} grow={0.4} />

            {/* Browse by category */}
            <SectionCard>
              <View className="flex-row items-center justify-between">
                <Text className="font-dict-bold text-[18px] leading-[23px] text-dict-heading">Browse by category</Text>
                <Pressable
                  onPress={() => {
                    tickHaptic()
                    setAllCategories((v) => !v)
                  }}
                  accessibilityRole="button"
                  className="flex-row items-center gap-1"
                >
                  <Text className="font-dict-semibold text-[13.5px] text-dict-green">
                    {allCategories ? 'Show less' : 'See all'}
                  </Text>
                  <ChevronRight size={15} color={ICON_GREEN} strokeWidth={ICON_STROKE} />
                </Pressable>
              </View>

              {allCategories ? (
                <View className="mt-3 flex-row flex-wrap gap-2.5">
                  {CATEGORY_TILES.map((tile) => (
                    <CategoryTile
                      key={tile.category}
                      tile={tile}
                      grid
                      onPress={() => {
                        tickHaptic()
                        setCategory(tile.category)
                      }}
                    />
                  ))}
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  /* Bled to the card's own edge, for the reason the HSK row is —
                     the card clips it (`overflow-hidden`), so the last tile runs
                     under the rounded corner instead of stopping inside it. */
                  style={{ marginHorizontal: -16 }}
                  contentContainerStyle={{ gap: 10, paddingTop: 12, paddingHorizontal: 16 }}
                >
                  {CATEGORY_TILES.map((tile) => (
                    <CategoryTile
                      key={tile.category}
                      tile={tile}
                      onPress={() => {
                        tickHaptic()
                        setCategory(tile.category)
                      }}
                    />
                  ))}
                </ScrollView>
              )}
            </SectionCard>

            {/*
              Recently added and the starter list, side by side.

              Two columns rather than two stacked full-width cards: these are the
              two lists a learner compares — what they have just taken, and what
              is on offer — and side by side is what lets both be seen without
              scrolling. The starter column gets the larger share because it
              carries five rows to the other's three.

              Everything inside runs tighter than a full-width card would: at
              half a phone's width, a 20pt inset on both sides is most of the
              room a word row has to work in.

              This row is where the screen's spare height goes. `flexGrow: 1`
              with everything above it at a fixed size, so on a tall device the
              two cards extend toward the foot of the page instead of stopping
              halfway up it and leaving the rest as background. The rows inside
              them do not stretch — the slack collects in one bounded gap above
              each card's footer action, which is whitespace inside a card rather
              than whitespace under the entire interface.

              `flexShrink: 0` so a short device scrolls rather than compressing
              the cards to fit.
            */}
            <FlexGap min={16} max={26} grow={0.6} />
            <View className="flex-row" style={{ gap: 10, flexGrow: 1, flexShrink: 0 }}>
              <SectionCard pad="px-3.5 pb-3.5 pt-4" style={{ flex: 48 }}>
                <CornerWash art="sprig" width={64} />

                <ColumnCardHeader
                  title="Recently added"
                  count={deck.length}
                  onSeeAll={() => setShowAdded(true)}
                  seeAllLabel={`See all ${deck.length} added words`}
                />

                {recentlyAdded.length === 0 ? (
                  <Text className="mt-3 font-dict-sans text-[12.5px] leading-[17px] text-dict-muted">
                    Words you add will appear here.
                  </Text>
                ) : (
                  <View className="mt-2.5 gap-3">
                    {recentlyAdded.map((w) => (
                      <PressScale
                        key={w.id}
                        onPress={() => openWord(w)}
                        outerClassName="w-full"
                        className="flex-row items-center gap-2"
                        accessibilityLabel={`${displayWord(w, settings.script)}, ${shortGloss(w)}`}
                      >
                        <CharTile character={displayWord(w, settings.script).slice(0, 1)} tone="mint" script={settings.script} />
                        <WordMeta reading={displayPinyin(w, settings.phoneticScript)} gloss={shortGloss(w)} />
                        <View className="h-6 w-6 items-center justify-center rounded-full bg-dict-green">
                          <Check size={13} color="#ffffff" strokeWidth={3} />
                        </View>
                      </PressScale>
                    ))}
                  </View>
                )}

                {/* Holds the action at the foot of the card however tall it
                    gets. Uncapped on purpose: this is the last place the slack
                    can land, and inside a bounded card it reads as composition
                    rather than as the page having run out. */}
                <FlexGap min={14} />
                <ColumnCardAction
                  icon={RotateCcw}
                  label="Review all"
                  onPress={() => {
                    tapHaptic()
                    router.push('/review')
                  }}
                  accessibilityLabel="Review all words"
                />
              </SectionCard>

              <SectionCard pad="px-3.5 pb-3.5 pt-4" style={{ flex: 52 }}>
                <CornerWash art="range" width={86} />

                {/*
                  See-all and the count share one row under the title rather than
                  sitting beside it. Both describe the same list, and on a column
                  this narrow neither fits alongside a heading that already wraps.
                */}
                <ColumnCardHeader
                  title={`HSK ${hskLevel} starter list`}
                  count={starter.length}
                  onSeeAll={() => setShowStarter(true)}
                  seeAllLabel={`See all ${starter.length} starter words`}
                />

                <View className="mt-2.5 gap-3">
                  {starterPreview.map((w) => {
                    const added = isInDeck(w.id, deckIndex)
                    return (
                      <View key={w.id} className="flex-row items-center gap-2">
                        <PressScale onPress={() => openWord(w)} accessibilityLabel={`Open ${displayWord(w, settings.script)}`}>
                          <CharTile character={displayWord(w, settings.script).slice(0, 1)} tone="paper" script={settings.script} />
                        </PressScale>
                        <WordMeta reading={displayPinyin(w, settings.phoneticScript)} gloss={shortGloss(w)} />
                        <AddCircleButton added={added} onAdd={() => addToReviewDeck(w.id)} />
                      </View>
                    )
                  })}
                </View>

                {/*
                  "Add all to My Words" rather than "Bulk add (20)": the count is
                  already on the badge above, and the destination is the part
                  worth naming. It still adds only `pending`, so once the list is
                  in the deck it reports itself finished instead of offering to
                  add nothing.
                */}
                <FlexGap min={14} />
                <ColumnCardAction
                  icon={Layers}
                  label={pendingCount === 0 ? 'All added' : 'Add all to My Words'}
                  onPress={bulkAdd}
                  disabled={pendingCount === 0}
                  accessibilityLabel={`Add ${pendingCount} words to My Words`}
                />
              </SectionCard>
            </View>
          </>
        )}

        {/*
          Below the two-column word region, which is this screen's slack
          absorber — so the advert sits under a block that has already taken
          whatever spare height the device offered, rather than competing with
          it for that space. A `FlexGap` above it would hand the slot a share of
          the slack and then collapse it to nothing whenever the advert failed,
          which is the one place this screen's vertical rhythm would visibly
          lurch. A plain margin, carried by the slot itself, does not.
        */}
        <AppBannerAd placement="dictionary" />
        </View>
        </Animated.View>
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

function CategoryTile({
  tile,
  onPress,
  grid = false,
}: {
  tile: (typeof CATEGORY_TILES)[number]
  onPress: () => void
  /** Wrapped three-up grid rather than the horizontal strip. */
  grid?: boolean
}) {
  const Icon = tile.icon
  return (
    <PressScale
      onPress={onPress}
      outerClassName={grid ? 'w-[31%]' : ''}
      /*
       * 78pt wide, which puts four and a bit tiles on a 390pt screen — enough
       * that the row visibly continues past the edge and invites a swipe. At
       * the old 104 only two and a half fitted, and a strip that looks like it
       * holds three items is a strip nobody thinks to scroll.
       *
       * No height: the tile is its icon, its label and the padding around them.
       * It used to be a fixed 96, which was 39pt taller than its own contents —
       * a band of blank tile under every label and a card taller than it needed
       * to be. All six hold one line (`numberOfLines={1}`), so letting them size
       * themselves keeps the row level.
       */
      style={grid ? undefined : { width: 78 }}
      className={`items-center justify-center gap-2 rounded-dict-sm px-2 py-3 ${tile.tile}`}
      accessibilityLabel={`Browse ${tile.label}`}
    >
      <Icon size={32} color={tile.ink} strokeWidth={ICON_STROKE} />
      <Text numberOfLines={1} className="font-dict-semibold text-[13px] leading-[17px] text-dict-heading">
        {tile.label}
      </Text>
    </PressScale>
  )
}

/**
 * One of the three destinations under the search field.
 *
 * Stacked rather than laid out in a row, and that is the whole point: side by
 * side, a third of the column had to hold a 36pt circle, a chevron, and two
 * lines of text, which left about 50pt for the label. "My Words" needs 64 and
 * "Radicals" 53, so two of the three arrived as "My W…" and "Radic…" — and a
 * truncated destination is one nobody can be sure they are about to open. The
 * chevron went with the row: three tiles side by side already read as things
 * you can press, and it was costing width the label needed.
 */
function QuickLink({
  icon: Icon,
  label,
  detail,
  onPress,
}: {
  icon: LucideIcon
  label: string
  detail: string
  onPress: () => void
}) {
  return (
    <PressScale
      onPress={onPress}
      outerClassName="flex-1"
      className="items-center gap-1.5 px-1 py-0.5"
      accessibilityLabel={label}
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-dict-green-pale">
        <Icon size={17} color={ICON_GREEN} strokeWidth={ICON_STROKE} />
      </View>
      <View className="items-center">
        <Text numberOfLines={1} className="font-dict-bold text-[13.5px] leading-[17px] text-dict-heading">
          {label}
        </Text>
        <Text numberOfLines={1} className="font-inter text-[11.5px] leading-[15px] text-dict-muted">
          {detail}
        </Text>
      </View>
    </PressScale>
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
  emptyBody = 'Try a different spelling, or switch the filter above.',
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
        <Text className="text-center font-dict-sans text-[15px] leading-[21px] text-dict-muted">{emptyBody}</Text>
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

function SearchResults({
  field,
  onField,
  ...rest
}: ResultListProps & { field: SearchField; onField: (f: SearchField) => void }) {
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingVertical: 16, paddingRight: 8 }}
      >
        {SEARCH_FIELDS.map((f) => (
          <FilterChip key={f.value} label={f.label} selected={field === f.value} onPress={() => onField(f.value)} />
        ))}
      </ScrollView>

      <Text className="font-dict-bold text-[17px] leading-[22px] text-dict-heading">Results</Text>
      <ResultList {...rest} />
    </>
  )
}

/** A titled list with a way back out — used for both category and recents browsing. */
function BrowseResults({
  title,
  onBack,
  emptyTitle,
  emptyBody,
  ...rest
}: ResultListProps & { title: string; onBack: () => void; emptyTitle?: string; emptyBody?: string }) {
  return (
    <>
      <View className="flex-row items-center justify-between py-4">
        <Text className="flex-1 font-dict-bold text-[17px] leading-[22px] text-dict-heading">{title}</Text>
        {/*
          Pale green rather than the white-on-white chip this used to be: it sits
          on a white card, so a white fill with a grey icon read as decoration.
          Green is already how the dictionary marks something you can act on.
        */}
        <PressScale
          onPress={() => {
            tickHaptic()
            onBack()
          }}
          className="flex-row items-center gap-1.5 rounded-full border border-dict-green bg-dict-green-pale px-3.5 py-2"
          accessibilityLabel="Back to browse"
        >
          <X size={15} color={ICON_GREEN_DARK} strokeWidth={2.5} />
          <Text className="font-dict-bold text-[14px] text-dict-green-dark">Clear</Text>
        </PressScale>
      </View>
      <ResultList emptyTitle={emptyTitle} emptyBody={emptyBody} {...rest} />
    </>
  )
}
