import { Animated, View, Text, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import {
  Check,
  ChevronRight,
  Layers,
  Plus,
  SlidersHorizontal,
  Sparkle,
  Sprout,
  Volume2,
  type LucideIcon,
} from 'lucide-react-native'
import { PressScale } from './PressScale'
import { ReadingSentence } from './ReadingSentence'
import { DiscoverWash } from './DiscoverWash'
import { FilterChip, ICON_GREEN_DARK, ICON_MUTED, ICON_STROKE } from './DictionaryControls'
import { DICT_BG, DICT_BUTTON_SHADOW, DICT_CARD_SHADOW } from './shadows'
import { useRevealedShadow } from '../shadowReveal'
import { displayExample, displayPinyin, displayWord, hanziFont } from '../../lib/hanzi'
import { shortGloss } from '../../lib/definitions'
import { ZHUYIN_SYLLABLE_GAP } from '../../lib/zhuyin'
import { SEARCH_FIELDS, type SearchField } from '../../lib/dictionary'
import { speak } from '../../lib/speech'
import { playPositiveChime } from '../../lib/sound'
import { sequence, successHaptic, tapHaptic, tickHaptic } from '../../lib/haptics'
import type { AppSettings, ScriptMode, VocabWord } from '../../types'

/*
 * The Dictionary landing — the pieces under the search field while nothing is
 * being searched.
 *
 * Built to the Beta 2.1 reference ("Redesigned UI Dictionary") with its brand
 * block and header landscape deliberately left out: the page opens on the word
 * "Dictionary" and the search field, and nothing competes with them.
 *
 * The rule the whole screen follows is one expressive moment, the rest content.
 * That moment is the watercolour corner of Word to discover. Everything else is
 * warm paper, a drawn hairline edge and ink — no shadows, no pastel tiles, and
 * colour on an Explore card lives only in its glyph.
 */

/*
 * The Explore glyphs' inks. Muted on purpose — each is the only colour on its
 * card, so it has to read as a brush mark on paper rather than as a badge.
 * Lucide and Text both take colour as a value, which is why these are hex here
 * rather than Tailwind classes; they are used nowhere else.
 */
const EXPLORE_INK = {
  jade: '#5E9A6A',
  gold: '#B89A5E',
  lavender: '#9486C4',
  coral: '#E08A7E',
} as const

/** Filter row height. Every pill and the round settings button share it. */
const PILL_HEIGHT = 44

// --- Filter row ---------------------------------------------------------------

/**
 * One soft pill in the filter row.
 *
 * Selection is carried by the fill *and* the border *and* the text colour, not
 * by one of them — colour alone is not enough to say which pill is on.
 *
 * The class strings vary by colour only. A `shadow-*` utility toggled on one
 * side of a conditional crashes the screen on native (see Styling in
 * CLAUDE.md), so there is none here at all.
 */
function Pill({
  label,
  selected = false,
  onPress,
  flex,
  accessibilityLabel,
}: {
  label: string
  selected?: boolean
  onPress: () => void
  flex: number
  accessibilityLabel?: string
}) {
  /*
   * The share of the row sits on a plain wrapper, not on `PressScale`'s
   * `style`: that lands on the animated view *inside* the Pressable, which is
   * content-sized, so a `flex` there shares out nothing and every pill shrinks
   * to its label.
   */
  return (
    <View style={{ flex, minWidth: 0 }}>
    <PressScale
      onPress={() => {
        tickHaptic()
        onPress()
      }}
      style={{ height: PILL_HEIGHT }}
      className={`items-center justify-center rounded-full border px-3 ${
        selected ? 'border-dict-green/40 bg-dict-green-pale' : 'border-dict-border bg-dict-card'
      }`}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Text
        numberOfLines={1}
        className={`text-[14.5px] leading-[19px] ${
          selected ? 'font-dict-bold text-dict-green-dark' : 'font-dict-semibold text-dict-heading'
        }`}
      >
        {label}
      </Text>
    </PressScale>
    </View>
  )
}

/**
 * All · HSK n · script · settings.
 *
 * "All" and "HSK n" are one choice between two scopes — every level, or just
 * this one — and it scopes search results. The script pill is not a filter but
 * the learner's own `settings.script`, the same field Settings owns, so it
 * reads as a value ("Traditional") and flips on tap. The round button opens the
 * rest: which level, and what to search in.
 */
export function FilterRow({
  levelOnly,
  hskLevel,
  script,
  panelOpen,
  refined,
  onScope,
  onScript,
  onPanel,
}: {
  levelOnly: boolean
  hskLevel: number
  script: ScriptMode
  panelOpen: boolean
  /** Something inside the panel differs from its default — marked with a dot. */
  refined: boolean
  onScope: (levelOnly: boolean) => void
  onScript: () => void
  onPanel: () => void
}) {
  return (
    <View className="flex-row items-center" style={{ gap: 10 }}>
      <Pill label="All" flex={0.8} selected={!levelOnly} onPress={() => onScope(false)} accessibilityLabel="All levels" />
      <Pill label={`HSK ${hskLevel}`} flex={1.05} selected={levelOnly} onPress={() => onScope(true)} />
      <Pill
        label={script === 'traditional' ? 'Traditional' : 'Simplified'}
        flex={1.3}
        onPress={onScript}
        accessibilityLabel={`Characters: ${script}. Tap to switch.`}
      />
      <PressScale
        onPress={() => {
          tickHaptic()
          onPanel()
        }}
        style={{ width: PILL_HEIGHT, height: PILL_HEIGHT }}
        className={`items-center justify-center rounded-full border ${
          panelOpen ? 'border-dict-green/40 bg-dict-green-pale' : 'border-dict-border bg-dict-card'
        }`}
        accessibilityLabel={panelOpen ? 'Close filters' : 'More filters'}
      >
        <SlidersHorizontal size={19} color={panelOpen ? ICON_GREEN_DARK : '#18263A'} strokeWidth={1.8} />
        {refined && (
          <View
            className="absolute rounded-full bg-dict-green"
            style={{ top: 9, right: 9, width: 7, height: 7 }}
          />
        )}
      </PressScale>
    </View>
  )
}

/**
 * How wide the right edge-fade mask is on the HSK level scroller, and how far
 * left of the true edge it starts. Wide enough to sit over real pill content
 * rather than blank reserved padding — the row carries no padding of its own
 * to hold a pill clear of it, so the last pill can (and should) run a little
 * past the visible edge, same as it would on any ordinary scrollable row.
 */
const HSK_FADE_WIDTH = 40

/**
 * The control row for the HSK Vocabulary / Characters shelves: the level
 * pills in place of the All/HSK-n/script pills, which have no meaning once
 * the shelf is already scoped to one exact level rather than being a search.
 *
 * No card behind it — plain pills straight on the page, the same way the
 * landing's own `FilterRow` sits, so this reads as the same screen rather
 * than a boxed-off control panel.
 *
 * The row scrolls horizontally rather than wrapping — six pills at a
 * comfortable tap size don't all fit a phone width, so sliding left/right is
 * how the rest come into reach, the same gesture the Radicals screen's own
 * stroke-count row uses. A pill mid-scroll is cut off square at the trailing
 * edge, which reads as clipped rather than as "more to slide to" — a thin
 * gradient the colour of the page, fading to transparent, sits over that
 * edge instead, so a partly-visible pill dissolves into the page rather than
 * stopping on a hard line. There is no matching fade (or inset) on the
 * *leading* edge: HSK 1 is always first, there is never anything to its
 * left to hint at, and giving it one anyway pushed the whole row in from the
 * gutter far enough to read as off-centre against the search field and
 * everything else on the page, which all start flush at the edge. The round
 * filter button stays put outside the scroller — it still opens the same
 * panel, and the panel's own level chips and search-in chips remain a valid
 * way in too.
 */
export function HskLevelBar({
  level,
  panelOpen,
  refined,
  onLevel,
  onPanel,
}: {
  level: number
  panelOpen: boolean
  refined: boolean
  onLevel: (level: number) => void
  onPanel: () => void
}) {
  return (
    <View className="flex-row items-center" style={{ gap: 10 }}>
      <View style={{ flex: 1 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <FilterChip key={n} label={`HSK ${n}`} selected={level === n} onPress={() => onLevel(n)} />
          ))}
        </ScrollView>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(253,251,245,0)', '#FDFBF5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: HSK_FADE_WIDTH }}
        />
      </View>

      <PressScale
        onPress={() => {
          tickHaptic()
          onPanel()
        }}
        style={[
          { width: PILL_HEIGHT, height: PILL_HEIGHT },
          DICT_BUTTON_SHADOW,
          { borderRadius: PILL_HEIGHT / 2, backgroundColor: panelOpen ? DICT_BG.greenPale : DICT_BG.card },
        ]}
        className={`items-center justify-center rounded-full border ${
          panelOpen ? 'border-dict-green/40 bg-dict-green-pale' : 'border-dict-border bg-dict-card'
        }`}
        accessibilityLabel={panelOpen ? 'Close filters' : 'More filters'}
      >
        <SlidersHorizontal size={19} color={panelOpen ? ICON_GREEN_DARK : '#18263A'} strokeWidth={1.8} />
        {refined && (
          <View className="absolute rounded-full bg-dict-green" style={{ top: 9, right: 9, width: 7, height: 7 }} />
        )}
      </PressScale>
    </View>
  )
}

/** The panel behind the round button: level, then what to search in. */
export function FilterPanel({
  hskLevel,
  field,
  onLevel,
  onField,
}: {
  hskLevel: number
  field: SearchField
  onLevel: (level: number) => void
  onField: (field: SearchField) => void
}) {
  const shadow = useRevealedShadow(DICT_CARD_SHADOW)

  return (
    // Split in two, like `RecentList`/`WordToDiscover` below: the shadow has
    // to sit on an `Animated.View` to ride `useRevealedShadow`'s interpolated
    // values, and NativeWind drops `className` entirely on an `Animated.View`
    // — so the fill, border and padding stay on a plain `View` inside it.
    <Animated.View style={[shadow, { marginTop: 12, borderRadius: 18, backgroundColor: DICT_BG.card }]}>
      <View className="rounded-[18px] border border-dict-border bg-dict-card p-4">
        <Text className="mb-2.5 font-dict-semibold text-[13px] leading-[17px] text-dict-soft">Level</Text>
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {[1, 2, 3, 4, 5, 6].map((level) => (
            <FilterChip key={level} label={`HSK ${level}`} selected={hskLevel === level} onPress={() => onLevel(level)} />
          ))}
        </View>
        <Text className="mb-2.5 mt-4 font-dict-semibold text-[13px] leading-[17px] text-dict-soft">Search in</Text>
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {SEARCH_FIELDS.map((f) => (
            <FilterChip key={f.value} label={f.label} selected={field === f.value} onPress={() => onField(f.value)} />
          ))}
        </View>
      </View>
    </Animated.View>
  )
}

// --- Section heading ------------------------------------------------------------

/** "Recent", "Explore" — the editorial serif, with an optional See-all. */
export function SectionHeading({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View className="mb-3 flex-row items-end justify-between">
      <Text className="font-lora-bold text-[23px] leading-[30px] text-dict-heading">{title}</Text>
      {onSeeAll && (
        <PressScale
          onPress={() => {
            tickHaptic()
            onSeeAll()
          }}
          /* Padded out to a 44pt target around a small label. */
          className="flex-row items-center gap-1 py-2.5 pl-3"
          accessibilityLabel={`See all ${title.toLowerCase()} words`}
        >
          <Text className="font-dict-semibold text-[14.5px] leading-[19px] text-dict-body">See all</Text>
          <ChevronRight size={17} color="#42526B" strokeWidth={ICON_STROKE} />
        </PressScale>
      )}
    </View>
  )
}

// --- Recent ---------------------------------------------------------------------

/**
 * Recent look-ups as one grouped surface, three rows, hairlines between.
 *
 * Three columns — hanzi, reading, gloss — so the eye can run straight down any
 * one of them. The hanzi column is a fixed width rather than a share: a share
 * moves the reading column whenever the window does, and the whole point is
 * that the readings line up.
 */
export function RecentList({
  words,
  settings,
  onOpen,
}: {
  words: VocabWord[]
  settings: AppSettings
  onOpen: (word: VocabWord) => void
}) {
  return (
    // Wrapped a layer out: `overflow-hidden` below (needed to clip the row
    // hairlines to the rounded corners) also clips a shadow drawn on the same
    // view, so the shadow lives on this outer, unclipped one instead — with
    // the same fill as the inner view's `className`, so the shadow has an
    // opaque, correctly-rounded shape to follow rather than falling back to
    // its own square bounding box. `Animated.View` rather than `View`, so it
    // can carry `useRevealedShadow`'s interpolated values.
    <Animated.View style={[useRevealedShadow(DICT_CARD_SHADOW), { borderRadius: 18, backgroundColor: DICT_BG.card }]}>
      <View className="overflow-hidden rounded-[18px] border border-dict-border bg-dict-card">
        {words.length === 0 ? (
          <View className="justify-center px-5" style={{ minHeight: 74 }}>
            <Text className="font-dict-sans text-[14.5px] leading-[20px] text-dict-soft">
              Words you look up will appear here.
            </Text>
          </View>
        ) : (
          words.map((word, i) => {
            const hanzi = displayWord(word, settings.script)
            const count = [...hanzi].length
            // A four-character idiom at the two-character size would run into
            // the reading column; it steps down instead of truncating.
            const size = count <= 2 ? 27 : count === 3 ? 23 : 19
            return (
              <View key={word.id}>
                {i > 0 && <View className="mx-4 h-px bg-dict-border" />}
                <PressScale
                  onPress={() => onOpen(word)}
                  scaleTo={0.985}
                  className="flex-row items-center px-5"
                  style={{ minHeight: 74 }}
                  accessibilityLabel={`${hanzi}, ${displayPinyin(word, settings.phoneticScript)}, ${shortGloss(word)}`}
                >
                  <Text
                    numberOfLines={1}
                    className={`${hanziFont(settings.script, 'medium')} text-dict-heading`}
                    style={{ width: 104, fontSize: size, lineHeight: size + 10 }}
                  >
                    {hanzi}
                  </Text>
                  <Text numberOfLines={1} className="flex-1 pr-2 font-dict-sans text-[15px] leading-[20px] text-dict-soft">
                    {displayPinyin(word, settings.phoneticScript)}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="pr-2 font-dict-sans text-[15px] leading-[20px] text-dict-soft"
                    style={{ flex: 1.25 }}
                  >
                    {shortGloss(word)}
                  </Text>
                  <ChevronRight size={18} color={ICON_MUTED} strokeWidth={ICON_STROKE} />
                </PressScale>
              </View>
            )
          })
        )}
      </View>
    </Animated.View>
  )
}

// --- Explore --------------------------------------------------------------------

type ExploreMark = { kind: 'glyph'; traditional: string; simplified: string } | { kind: 'icon'; icon: LucideIcon }

function ExploreTile({
  mark,
  ink,
  title,
  subtitle,
  script,
  onPress,
}: {
  mark: ExploreMark
  ink: string
  title: string
  subtitle: string
  script: ScriptMode
  onPress: () => void
}) {
  const shadow = useRevealedShadow(DICT_CARD_SHADOW)

  return (
    <PressScale
      onPress={() => {
        tapHaptic()
        onPress()
      }}
      outerClassName="flex-1"
      scaleTo={0.97}
      style={[shadow, { borderRadius: 18, backgroundColor: DICT_BG.card }]}
      className="rounded-[18px] border border-dict-border bg-dict-card px-4 pb-4 pt-3.5"
      accessibilityLabel={`${title}. ${subtitle}`}
    >
      <View className="flex-row items-center justify-between" style={{ height: 60 }}>
        {mark.kind === 'glyph' ? (
          <Text className={hanziFont(script, 'semibold')} style={{ fontSize: 48, lineHeight: 60, color: ink }}>
            {script === 'simplified' ? mark.simplified : mark.traditional}
          </Text>
        ) : (
          <mark.icon size={46} color={ink} strokeWidth={1.6} />
        )}
        <ChevronRight size={18} color={ICON_MUTED} strokeWidth={ICON_STROKE} />
      </View>
      <Text numberOfLines={1} className="mt-2 font-dict-bold text-[16px] leading-[21px] text-dict-heading">
        {title}
      </Text>
      {/* Two lines allowed: at 390pt a tile's text column is ~140pt, which
          "Meaning in every stroke" does not fit on one. The pair in a row
          stretch to the same height, so a wrap never leaves them uneven. */}
      <Text numberOfLines={2} className="mt-0.5 font-dict-sans text-[13.5px] leading-[18px] text-dict-soft">
        {subtitle}
      </Text>
    </PressScale>
  )
}

export function ExploreGrid({
  script,
  onVocabulary,
  onCharacters,
  onRadicals,
  onMyWords,
}: {
  script: ScriptMode
  onVocabulary: () => void
  onCharacters: () => void
  onRadicals: () => void
  onMyWords: () => void
}) {
  return (
    <View style={{ gap: 12 }}>
      <View className="flex-row" style={{ gap: 12 }}>
        <ExploreTile
          mark={{ kind: 'glyph', traditional: '詞', simplified: '词' }}
          ink={EXPLORE_INK.jade}
          title="HSK Vocabulary"
          subtitle="Build your word power"
          script={script}
          onPress={onVocabulary}
        />
        <ExploreTile
          mark={{ kind: 'glyph', traditional: '字', simplified: '字' }}
          ink={EXPLORE_INK.gold}
          title="Characters"
          subtitle="Meaning in every stroke"
          script={script}
          onPress={onCharacters}
        />
      </View>
      <View className="flex-row" style={{ gap: 12 }}>
        <ExploreTile
          mark={{ kind: 'icon', icon: Sprout }}
          ink={EXPLORE_INK.lavender}
          title="Radicals"
          subtitle="The building blocks of Chinese"
          script={script}
          onPress={onRadicals}
        />
        <ExploreTile
          mark={{ kind: 'icon', icon: Layers }}
          ink={EXPLORE_INK.coral}
          title="My Words"
          subtitle="Everything you've added"
          script={script}
          onPress={onMyWords}
        />
      </View>
    </View>
  )
}

// --- Word to discover -------------------------------------------------------------

/**
 * One word a day, with its example sentence — the page's one editorial card
 * and the only thing on it with illustration.
 *
 * The word block and the two round actions are separate targets rather than
 * one pressable card with buttons inside it: a Pressable nested in a Pressable
 * double-fires on web, and "add" must never also open the entry.
 *
 * The example goes through `ReadingSentence`, like every sentence in the app —
 * readings per word, in the learner's own phonetic script, never the corpus's
 * `example.pinyin` line.
 */
export function WordToDiscover({
  word,
  settings,
  added,
  width,
  onOpen,
  onAdd,
}: {
  word: VocabWord
  settings: AppSettings
  added: boolean
  /** The card's width, for sizing its watercolour. */
  width: number
  onOpen: () => void
  onAdd: () => void
}) {
  const hanzi = displayWord(word, settings.script)
  const example = displayExample(word, settings.script)
  const reading = displayPinyin(word, settings.phoneticScript)

  /*
   * Zhuyin sits under each character rather than in the text column beside the
   * word. That column is only ~90pt wide once the word and the two round
   * buttons have their share, and bopomofo is full-width: a two-syllable
   * reading like ㄒㄩㄝˊ ㄒㄧㄠˋ runs ~130pt at the column's type size, so it was
   * cut off after a syllable. Under a 44pt character, one syllable (at most
   * three symbols and a tone mark) fits at 11.5pt — and the line heights are
   * chosen so the word block is exactly as tall as the pinyin layout's text
   * column, so switching systems never changes the card's size.
   */
  const zhuyin = settings.phoneticScript === 'zhuyin'
  const characters = Array.from(hanzi)
  const syllables = reading.split(ZHUYIN_SYLLABLE_GAP)
  const zhuyinPerCharacter = zhuyin && syllables.length === characters.length
  const hanziClass = `${hanziFont(settings.script, 'medium')} text-dict-heading`

  return (
    // `overflow-hidden` below clips the watercolour wash to the card's rounded
    // corners — and would clip a shadow drawn on the same view too, so the
    // shadow lives on this outer, unclipped wrapper instead, filled the same
    // as the inner view so the shadow has a shape to follow. `Animated.View`
    // rather than `View`, so it can carry `useRevealedShadow`'s interpolated
    // values.
    <Animated.View style={[useRevealedShadow(DICT_CARD_SHADOW), { borderRadius: 20, backgroundColor: DICT_BG.card }]}>
      <View className="overflow-hidden rounded-[20px] border border-dict-border bg-dict-card px-5 pb-5 pt-4">
        <DiscoverWash width={width} />

        <View className="flex-row items-center gap-2">
          <Sparkle size={16} color="#C9A23F" fill="#C9A23F" strokeWidth={1.5} />
          <Text className="font-dict-semibold text-[14.5px] leading-[19px] text-dict-gold">Word to discover</Text>
        </View>

        <View className="mt-3 flex-row items-center" style={{ gap: 12 }}>
          <PressScale
            onPress={() => {
              tapHaptic()
              onOpen()
            }}
            outerClassName="flex-1"
            scaleTo={0.98}
            className="flex-row items-center"
            accessibilityLabel={`Open ${hanzi}`}
          >
            {zhuyin ? (
              <View className="flex-row items-start" style={{ gap: 2 }}>
                {(zhuyinPerCharacter ? characters : [hanzi]).map((glyph, i) => (
                  <View key={i} className="items-center">
                    <Text className={hanziClass} style={{ fontSize: 44, lineHeight: 47 }}>
                      {glyph}
                    </Text>
                    <Text
                      className="font-dict-semibold text-dict-green-dark"
                      style={{ fontSize: 11.5, lineHeight: 14 }}
                    >
                      {zhuyinPerCharacter ? syllables[i] : reading}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className={hanziClass} style={{ fontSize: 44, lineHeight: 56 }}>
                {hanzi}
              </Text>
            )}
            <View className="ml-4 flex-1">
              {!zhuyin && (
                <Text numberOfLines={1} className="mb-0.5 font-dict-semibold text-[16px] leading-[21px] text-dict-heading">
                  {reading}
                </Text>
              )}
              <Text numberOfLines={2} className="font-dict-sans text-[14.5px] leading-[19px] text-dict-soft">
                {shortGloss(word)}
              </Text>
            </View>
          </PressScale>

          <PressScale
            onPress={() => {
              tapHaptic()
              speak(hanzi)
            }}
            style={[{ width: 46, height: 46 }, DICT_BUTTON_SHADOW, { borderRadius: 23, backgroundColor: DICT_BG.greenPale }]}
            className="items-center justify-center rounded-full border border-dict-green/30 bg-dict-green-pale"
            accessibilityLabel={`Play pronunciation of ${hanzi}`}
          >
            <Volume2 size={20} color={ICON_GREEN_DARK} strokeWidth={ICON_STROKE} />
          </PressScale>

          {added ? (
            <View
              style={{ width: 46, height: 46 }}
              className="items-center justify-center rounded-full border border-dict-border bg-dict-card"
              accessibilityLabel="Already in your deck"
            >
              <Check size={20} color={ICON_GREEN_DARK} strokeWidth={ICON_STROKE} />
            </View>
          ) : (
            <PressScale
              onPress={() => {
                // Adding a word is the dictionary's one audible moment.
                sequence([
                  { at: 0, fire: tapHaptic },
                  { at: 90, fire: successHaptic },
                ])
                playPositiveChime()
                onAdd()
              }}
              style={[{ width: 46, height: 46 }, DICT_BUTTON_SHADOW, { borderRadius: 23, backgroundColor: DICT_BG.card }]}
              className="items-center justify-center rounded-full border border-dict-border bg-dict-card"
              accessibilityLabel={`Add ${hanzi} to your deck`}
            >
              <Plus size={20} color="#42526B" strokeWidth={ICON_STROKE} />
            </PressScale>
          )}
        </View>

        {example ? (
          <>
            {/* Stops short of the corner, where the sprig comes in. */}
            <View className="my-4 h-px bg-dict-border" style={{ marginRight: 72 }} />
            {/* Held clear of the watercolour: the sentence must never sit on it. */}
            <View className="flex-row items-start" style={{ gap: 12, paddingRight: 76 }}>
              <View className="mt-1 rounded-full bg-dict-green-pale px-2.5 py-1">
                <Text className="font-dict-semibold text-[12px] leading-[15px] text-dict-green-dark">Example</Text>
              </View>
              <View className="flex-1">
                <ReadingSentence text={example} term={hanzi} size="compact" />
                <Text className="mt-1 font-dict-sans text-[13.5px] leading-[18px] text-dict-soft">
                  {word.example?.translation}
                </Text>
              </View>
            </View>
          </>
        ) : null}
      </View>
    </Animated.View>
  )
}
