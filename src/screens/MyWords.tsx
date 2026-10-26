import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { View, Text, Pressable, ScrollView, TextInput, Image, useWindowDimensions } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock3,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { displayWord, displayPinyin, foldPinyin, hanziFont } from '../lib/hanzi'
import { LiftedFace, PressableScale } from '../components/dashboard/parts'
import { FilterDrawer } from '../components/dictionary/FilterDrawer'
import { playTints, type PlayTint } from '../components/dashboard/tokens'
import { ReviewButton } from '../components/review/parts'
import { TIER_ORDER } from '../components/ProficiencyChip'
import { proficiencyFor, type Proficiency } from '../lib/proficiency'
import { isCardDue } from '../lib/srs'
import type { SrsCard, VocabWord } from '../types'
import { shortGloss } from '../lib/definitions'
import { FEATURES } from '../lib/features'
import { LOOKUP_HSK_LEVEL } from '../data/lookupWords'
import { playTapSound } from '../lib/sound'
import { tapHaptic, thunkHaptic, tickHaptic } from '../lib/haptics'
import {
  mwColors as c,
  mwHsk,
  mwHskOther,
  mwTiers,
  mwSpacing as sp,
  mwType as t,
  mwRadius,
  mwCard,
  MW_BAMBOO_RATIO,
  MW_BLOSSOM_RATIO,
  MW_CONTENT_MAX,
  mwRowTint,
} from '../components/myWords/tokens'
import { BackArrow } from '../components/BackArrow'
import { spacedReading } from '../components/SpacedReading'

/*
 * My Words, built to the Beta 2.1 reference (`SS928 Mywords Redesigned
 * Screen.png`) over `components/myWords/tokens.ts`: search, a chip row, a
 * Saved / Due today / Favorites panel, and plain white word cards.
 *
 * The chip row is All · Favorites · HSK — three, so none of them ever has to
 * truncate. HSK opens the filter panel beneath it, which holds everything
 * narrower: Due today, the HSK levels, and the learning stage (New / Still
 * learning / Proficient). The HSK chip lights whenever anything in the panel is
 * set, so a filter is never active without the row saying so.
 *
 * Each card carries its HSK level and its learning stage, plus "Favorite" when
 * starred. Favourites are `favoriteWordIds` in AppContext, starred from the New
 * Words card or the dictionary card.
 *
 * Tapping a card opens the word's dictionary card on the standalone
 * `/word/[wordId]` route, pushed over this screen — so Back returns here, not
 * to the Dictionary tab. That card is also where a word is removed.
 */

type IconType = ComponentType<{ size: number; color: string; strokeWidth?: number; fill?: string }>

const bambooArt = require('../assets/images/my-words/bamboo.png')
const blossomArt = require('../assets/images/my-words/blossom.png')

interface LearnedWord {
  word: VocabWord
  card: SrsCard
  level: Proficiency
  due: boolean
  favorite: boolean
}

type LevelFilter = 'all' | 'custom' | number

const LEVELS: LevelFilter[] = ['all', 1, 2, 3, 4, 5, 6]

/** Start Review's face, plus its shoulder. The list is padded clear of it. */
const FOOTER_BUTTON = 58

function hskLabel(word: VocabWord): string {
  if (word.custom) return 'Custom'
  if (word.hskLevel === LOOKUP_HSK_LEVEL) return 'Rare'
  return `HSK ${word.hskLevel}`
}

export function MyWords() {
  const { deck, getWord, settings, clearNewWordFlags, favoriteWordIds } = useApp()
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [dueOnly, setDueOnly] = useState(false)
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all')
  const [tierFilter, setTierFilter] = useState<Proficiency | 'all'>('all')
  const [panelOpen, setPanelOpen] = useState(false)
  const [query, setQuery] = useState('')

  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const column = Math.min(width, MW_CONTENT_MAX)
  const footerBottom = Math.max(sp.lg, insets.bottom + sp.sm)

  useEffect(() => {
    clearNewWordFlags()
  }, [clearNewWordFlags])

  const favorites = useMemo(() => new Set(favoriteWordIds), [favoriteWordIds])

  const learned = useMemo<LearnedWord[]>(() => {
    return deck
      .map((card) => {
        const word = getWord(card.wordId)
        if (!word) return null
        return {
          word,
          card,
          level: proficiencyFor(card),
          due: card.practiceQueue === 0 && isCardDue(card),
          favorite: favorites.has(word.id),
        }
      })
      .filter((x): x is LearnedWord => x !== null)
      .sort(
        (a, b) =>
          Number(!!a.word.custom) - Number(!!b.word.custom) ||
          a.word.hskLevel - b.word.hskLevel ||
          a.word.simplified.localeCompare(b.word.simplified),
      )
  }, [deck, getWord, favorites])

  const dueTotal = useMemo(() => learned.filter((x) => x.due).length, [learned])
  const favoriteTotal = useMemo(() => learned.filter((x) => x.favorite).length, [learned])
  const hasCustom = useMemo(() => learned.some((x) => x.word.custom), [learned])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const folded = foldPinyin(q).replace(/\s+/g, '')
    return learned.filter(({ word, due, favorite, level }) => {
      if (favoritesOnly && !favorite) return false
      if (dueOnly && !due) return false
      if (tierFilter !== 'all' && level !== tierFilter) return false
      if (levelFilter === 'custom' && !word.custom) return false
      if (typeof levelFilter === 'number' && (word.custom || word.hskLevel !== levelFilter)) return false
      if (!q) return true
      return (
        word.simplified.includes(q) ||
        word.traditional.includes(q) ||
        (folded.length > 0 && foldPinyin(word.pinyin).replace(/\s+/g, '').includes(folded)) ||
        word.definition.toLowerCase().includes(q)
      )
    })
  }, [learned, query, favoritesOnly, dueOnly, tierFilter, levelFilter])

  /** Anything set inside the panel — what lights the HSK chip. */
  const panelFilters = Number(dueOnly) + Number(levelFilter !== 'all') + Number(tierFilter !== 'all')
  const showingAll = !favoritesOnly && panelFilters === 0

  const levelLabel = (lvl: LevelFilter) => (lvl === 'all' ? 'All levels' : lvl === 'custom' ? 'Custom' : `HSK ${lvl}`)
  const hskChipLabel = typeof levelFilter === 'number' ? `HSK ${levelFilter}` : levelFilter === 'custom' ? 'Custom' : 'HSK'

  const clearAll = () => {
    setFavoritesOnly(false)
    setDueOnly(false)
    setLevelFilter('all')
    setTierFilter('all')
  }

  const openWord = (entry: LearnedWord) => {
    tapHaptic()
    router.push(`/word/${encodeURIComponent(entry.word.id)}`)
  }

  const bambooWidth = column * 0.46
  const blossomWidth = column * 0.26

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          paddingBottom: FOOTER_BUTTON + footerBottom + sp.xl,
        }}
      >
        <View style={{ width: column, flexGrow: 1, paddingHorizontal: sp.screen }}>
          {/* Behind the title, against the top right. `Image` takes no
              pointerEvents, so the wrapper carries it. */}
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0 }}>
            <Image
              source={bambooArt}
              resizeMode="contain"
              style={{ width: bambooWidth, height: bambooWidth / MW_BAMBOO_RATIO }}
            />
          </View>

          <View style={{ height: 44, justifyContent: 'center' }}>
            {/* Guarded: reached by deep link there is nothing to pop. */}
            <BackArrow
              onPress={() => (router.canGoBack() ? router.back() : router.navigate('/review-tab'))}
              style={{ marginLeft: -8, alignSelf: 'flex-start' }}
            />
          </View>

          <Text
            className="font-nunito-extrabold"
            accessibilityRole="header"
            style={{ ...t.title, color: c.navy, marginTop: -sp.xs }}
          >
            My Words
          </Text>
          <Text className="font-nunito-semibold" style={{ ...t.subtitle, color: c.slate, marginTop: 4, maxWidth: '64%' }}>
            Review and organize your saved vocabulary.
          </Text>

          <SearchField value={query} onChange={setQuery} />

          {/* All · Favorites · HSK. "All" clears every filter, the panel's included. */}
          <View className="flex-row" style={{ gap: sp.sm, marginTop: sp.md }}>
            <Chip
              label="All"
              active={showingAll}
              onPress={() => {
                clearAll()
                setPanelOpen(false)
              }}
            />
            <Chip
              label="Favorites"
              icon={Star}
              active={favoritesOnly}
              grow
              onPress={() => setFavoritesOnly((v) => !v)}
            />
            <Chip
              label={hskChipLabel}
              icon={SlidersHorizontal}
              trailing={panelOpen ? ChevronUp : ChevronDown}
              active={panelFilters > 0}
              badge={panelFilters > (typeof levelFilter === 'number' || levelFilter === 'custom' ? 1 : 0)}
              grow
              onPress={() => setPanelOpen((v) => !v)}
            />
          </View>

          {/* Unfolds and folds like the dictionary's filter panel (`FilterDrawer`). */}
          <FilterDrawer open={panelOpen}>
            <FilterPanel
              dueOnly={dueOnly}
              dueTotal={dueTotal}
              onToggleDue={() => setDueOnly((v) => !v)}
              levels={[...LEVELS, ...(hasCustom ? (['custom'] as LevelFilter[]) : [])]}
              level={levelFilter}
              levelLabel={levelLabel}
              onLevel={setLevelFilter}
              tier={tierFilter}
              onTier={setTierFilter}
              canClear={panelFilters > 0}
              onClear={() => {
                setDueOnly(false)
                setLevelFilter('all')
                setTierFilter('all')
              }}
              onDone={() => setPanelOpen(false)}
            />
          </FilterDrawer>

          <StatsPanel
            saved={learned.length}
            due={dueTotal}
            favorites={favoriteTotal}
            onSaved={clearAll}
            onDue={() => setDueOnly((v) => !v)}
            onFavorites={() => setFavoritesOnly((v) => !v)}
          />

          <View style={{ gap: sp.md, marginTop: sp.md }}>
            {learned.length === 0 && (
              <EmptyNote>
                No words saved yet — add some from{' '}
                {FEATURES.lessons ? 'New Words, Lessons, or Books' : 'New Words or Books'}.
              </EmptyNote>
            )}
            {learned.length > 0 && filtered.length === 0 && (
              <EmptyNote>
                {favoritesOnly && favoriteTotal === 0
                  ? 'No favorites yet — tap the star on a word to keep it here.'
                  : 'No words match this filter.'}
              </EmptyNote>
            )}
            {filtered.map((entry) => (
              <WordRow
                key={entry.word.id}
                entry={entry}
                hanzi={displayWord(entry.word, settings.script)}
                reading={displayPinyin(entry.word, settings.phoneticScript)}
                hanziClass={hanziFont(settings.script, 'semibold')}
                onPress={() => openWord(entry)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/*
        The foot: the blossom in the corner and Start Review, over a fade so the
        list slides under the button rather than being cut off by a hard edge.
      */}
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' }}
      >
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: FOOTER_BUTTON + footerBottom + 40 }}
        >
          <LinearGradient
            colors={[c.backgroundClear, c.background]}
            locations={[0, 0.5]}
            style={{ flex: 1 }}
          />
        </View>
        <View pointerEvents="box-none" style={{ width: column, paddingHorizontal: sp.screen, paddingBottom: footerBottom }}>
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, bottom: 0 }}>
            <Image
              source={blossomArt}
              resizeMode="contain"
              style={{ width: blossomWidth, height: blossomWidth / MW_BLOSSOM_RATIO }}
            />
          </View>
          <View style={{ marginLeft: column * 0.2 }}>
            <ReviewButton
              label="Start Review"
              tone="primary"
              onPress={() => {
                thunkHaptic()
                playTapSound()
                router.push('/review-session?mode=full')
              }}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View
      className="flex-row items-center"
      style={{
        marginTop: sp.xl,
        height: 52,
        borderRadius: mwRadius.pill,
        borderWidth: 1,
        borderColor: c.fieldBorder,
        backgroundColor: c.field,
        paddingLeft: sp.lg,
        paddingRight: sp.sm,
        gap: sp.md,
      }}
    >
      <Search size={21} color={c.slate} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search your words…"
        placeholderTextColor={c.placeholder}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel="Search your words"
        style={{ flex: 1, ...t.search, fontFamily: 'Nunito', color: c.navy, paddingVertical: 0 }}
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChange('')}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={10}
          style={{ padding: sp.xs }}
        >
          <X size={18} color={c.slate} strokeWidth={2} />
        </Pressable>
      )}
    </View>
  )
}

/**
 * A filter pill, raised like the dictionary's: `LiftedFace` on a shoulder,
 * sinking onto it and squashing a little on press, then springing back with
 * a small overshoot (`PressableScale`'s release spring). The active one is
 * the Dictionary's selected filter: pale green face, green rim and shoulder.
 * Plain style objects, no shadow classes.
 *
 * The label never truncates: the top row holds three chips precisely so each
 * has room for its whole word, and the panel's chips wrap onto a new line.
 */
function Chip({
  label,
  icon: Icon,
  trailing: Trailing,
  active,
  onPress,
  grow = false,
  small = false,
  badge = false,
}: {
  label: string
  icon?: IconType
  trailing?: IconType
  active: boolean
  onPress: () => void
  grow?: boolean
  small?: boolean
  /** A dot for "more is set in the panel than this label says". */
  badge?: boolean
}) {
  const ink = active ? c.chipOnInk : c.navy
  const iconInk = active ? c.chipOnInk : c.slate
  return (
    <PressableScale
      onPress={() => {
        tickHaptic()
        onPress()
      }}
      /* A deeper squash than a card's, so the release spring has something to bounce back from. */
      scaleTo={0.92}
      haptic={false}
      wrapperStyle={{ flexGrow: grow ? 1 : 0 }}
      accessibilityLabel={`${label}${active ? ', selected' : ''}`}
    >
      <LiftedFace
        height={small ? 36 : 44}
        fill={active ? c.chipOnFill : c.field}
        border={active ? c.chipOnRim : c.fieldBorder}
        shoulder={active ? c.chipOnRim : c.fieldShoulder}
        shadow={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: small ? sp.md : 18 }}>
          {Icon && <Icon size={small ? 15 : 17} color={iconInk} strokeWidth={2} />}
          <Text style={{ ...t.chip, fontFamily: active ? 'NunitoBold' : 'Nunito', fontSize: small ? 13.5 : t.chip.fontSize, color: ink }}>
            {label}
          </Text>
          {badge && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.chipOnRim }} />}
          {Trailing && <Trailing size={16} color={iconInk} strokeWidth={2} />}
        </View>
      </LiftedFace>
    </PressableScale>
  )
}

/**
 * Everything narrower than All / Favorites, opened from the HSK chip: Due
 * today, the HSK level, and the learning stage. The three combine — "HSK 2,
 * still learning, due" is one question.
 */
function FilterPanel({
  dueOnly,
  dueTotal,
  onToggleDue,
  levels,
  level,
  levelLabel,
  onLevel,
  tier,
  onTier,
  canClear,
  onClear,
  onDone,
}: {
  dueOnly: boolean
  dueTotal: number
  onToggleDue: () => void
  levels: LevelFilter[]
  level: LevelFilter
  levelLabel: (lvl: LevelFilter) => string
  onLevel: (lvl: LevelFilter) => void
  tier: Proficiency | 'all'
  onTier: (tier: Proficiency | 'all') => void
  canClear: boolean
  onClear: () => void
  onDone: () => void
}) {
  return (
    <View
      style={{
        marginTop: sp.sm,
        padding: sp.lg,
        gap: sp.lg,
        borderRadius: mwRadius.panel,
        borderWidth: 1,
        borderColor: c.fieldBorder,
        backgroundColor: c.sheet,
      }}
    >
      <PanelSection title="Review">
        <Chip
          small
          label={dueTotal > 0 ? `Due today · ${dueTotal}` : 'Due today'}
          icon={Clock3}
          active={dueOnly}
          onPress={onToggleDue}
        />
      </PanelSection>

      <PanelSection title="HSK level">
        {levels.map((lvl) => (
          <Chip key={String(lvl)} small label={levelLabel(lvl)} active={level === lvl} onPress={() => onLevel(lvl)} />
        ))}
      </PanelSection>

      <PanelSection title="Learning stage">
        <Chip small label="All stages" active={tier === 'all'} onPress={() => onTier('all')} />
        {TIER_ORDER.map((stage) => (
          <Chip key={stage} small label={mwTiers[stage].label} active={tier === stage} onPress={() => onTier(stage)} />
        ))}
      </PanelSection>

      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={() => {
            tickHaptic()
            onClear()
          }}
          disabled={!canClear}
          accessibilityRole="button"
          hitSlop={8}
          className="active:opacity-60"
        >
          <Text className="font-nunito-semibold" style={{ ...t.chip, color: canClear ? c.jade : c.placeholder }}>
            Clear filters
          </Text>
        </Pressable>
        <Chip small label="Done" active onPress={onDone} />
      </View>
    </View>
  )
}

function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: sp.sm }}>
      <Text className="font-nunito-bold" style={{ ...t.sheetHeading, color: c.sheetHeading, textTransform: 'uppercase' }}>
        {title}
      </Text>
      <View className="flex-row flex-wrap" style={{ gap: sp.sm }}>
        {children}
      </View>
    </View>
  )
}

/**
 * Saved words / Due today / Favorites — the reference's panel. Due and
 * Favorites toggle their filter; Saved words clears every filter.
 */
/** A stat tile's least height: its padding, the number's line and the label's. */
const STAT_TILE_MIN = 62

function StatsPanel({
  saved,
  due,
  favorites,
  onSaved,
  onDue,
  onFavorites,
}: {
  saved: number
  due: number
  favorites: number
  onSaved: () => void
  onDue: () => void
  onFavorites: () => void
}) {
  /* SS1017: three tiles, each in its own wash, rather than one panel. */
  const columns: { key: string; value: number; label: string; icon: ReactNode; tint: PlayTint; onPress: () => void }[] = [
    {
      key: 'saved',
      value: saved,
      label: 'Saved words',
      tint: playTints.jade,
      icon: <BookOpen size={18} color={playTints.jade.ink} strokeWidth={2.2} />,
      onPress: onSaved,
    },
    {
      key: 'due',
      value: due,
      label: 'Due today',
      tint: playTints.sky,
      icon: <Clock3 size={18} color={playTints.sky.ink} strokeWidth={2.2} />,
      onPress: onDue,
    },
    {
      key: 'favorites',
      value: favorites,
      label: 'Favorites',
      tint: playTints.honey,
      icon: <Star size={18} color={c.star} fill={c.star} strokeWidth={1.8} />,
      onPress: onFavorites,
    },
  ]

  return (
    /* Compact: the icon beside its number, the label under them — about half
       the height of an icon disc stacked over a large number. */
    /*
     * Sized by their contents, never stretched. The tiles used to be `flex-1`
     * inside a column with no height of its own; when the filter drawer folded
     * away and the page re-laid out, native layout could hand them less than
     * their contents and the labels squashed. `flexShrink: 0` keeps the row
     * from being squeezed by anything around it.
     */
    <View style={{ flexDirection: 'row', alignItems: 'stretch', marginTop: sp.md, gap: sp.sm, flexShrink: 0 }}>
      {columns.map((col) => (
        <View key={col.key} style={{ flex: 1, minWidth: 0 }}>
          <Pressable
            onPress={() => {
              tickHaptic()
              col.onPress()
            }}
            accessibilityRole="button"
            accessibilityLabel={`${col.value} ${col.label}`}
            className="items-center justify-center active:opacity-70"
            style={{
              flexGrow: 1,
              minHeight: STAT_TILE_MIN,
              paddingVertical: sp.sm,
              paddingHorizontal: sp.xs,
              borderRadius: mwRadius.card,
              backgroundColor: col.tint.fill,
              borderWidth: 1,
              borderColor: col.tint.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {col.icon}
              <Text style={{ ...t.statValue, fontFamily: 'NunitoExtraBold', color: c.navy }}>{col.value}</Text>
            </View>
            <Text numberOfLines={1} style={{ ...t.statLabel, fontFamily: 'Nunito', color: c.slate, marginTop: 1 }}>
              {col.label}
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  )
}

function Tag({ label, bg, ink, icon }: { label: string; bg: string; ink: string; icon?: ReactNode }) {
  return (
    <View
      className="flex-row items-center"
      style={{ height: 26, paddingHorizontal: 9, gap: 5, borderRadius: mwRadius.pill, backgroundColor: bg }}
    >
      {icon}
      <Text className="font-nunito-semibold" numberOfLines={1} style={{ ...t.tag, color: ink }}>
        {label}
      </Text>
    </View>
  )
}

/**
 * One saved word, as the reference draws it: the hanzi, its reading over its
 * gloss, then a column of tags — the HSK level, the learning stage beneath it
 * (in the slot the reference gives "Due today"), and "Favorite" when starred —
 * and a chevron.
 *
 * The hanzi is fitted to a fixed column rather than sized once: a four-character
 * idiom at the two-character size would push the gloss off the card. CJK glyphs
 * are full-width, so the column over the character count is a safe bound.
 */
function WordRow({
  entry,
  hanzi,
  reading,
  hanziClass,
  onPress,
}: {
  entry: LearnedWord
  hanzi: string
  reading: string
  hanziClass: string
  onPress: () => void
}) {
  const chars = Math.max(1, [...hanzi].length)
  const size = Math.min(mwCard.hanziMax, (mwCard.hanziWidth - 2) / chars)
  const gloss = shortGloss(entry.word)
  const hsk = entry.word.custom ? mwHskOther : (mwHsk[entry.word.hskLevel] ?? mwHskOther)
  const tier = mwTiers[entry.level]

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.985}
      haptic={false}
      accessibilityLabel={`${hanzi}, ${reading}, ${gloss}. ${tier.label}.${entry.favorite ? ' Favorite.' : ''}`}
    >
      <View
        className="flex-row items-center"
        style={{
          minHeight: mwCard.minHeight,
          borderRadius: mwRadius.card,
          borderWidth: 1,
          borderColor: mwRowTint[entry.level].border,
          backgroundColor: mwRowTint[entry.level].fill,
          overflow: 'hidden',
          paddingLeft: sp.lg,
          paddingRight: sp.sm,
          paddingVertical: sp.md,
          gap: 10,
        }}
      >
        <View style={{ width: mwCard.hanziWidth }}>
          <Text
            className={hanziClass}
            numberOfLines={1}
            style={{ fontSize: size, lineHeight: size * 1.3, color: c.navy }}
          >
            {hanzi}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text className="font-sans" numberOfLines={1} style={{ ...t.reading, color: c.navy }}>
            {spacedReading(reading, t.reading.fontSize)}
          </Text>
          <Text className="font-sans" numberOfLines={2} style={{ ...t.gloss, color: c.slate, marginTop: 2 }}>
            {gloss}
          </Text>
        </View>

        <View style={{ width: mwCard.tagWidth, alignItems: 'flex-start', gap: 6 }}>
          <Tag label={hskLabel(entry.word)} bg={hsk.bg} ink={hsk.ink} />
          <Tag label={tier.label} bg={tier.bg} ink={tier.ink} />
          {entry.favorite && (
            <Tag
              label="Favorite"
              bg={c.favorite}
              ink={c.favoriteInk}
              icon={<Star size={13} color={c.star} fill={c.star} strokeWidth={2} />}
            />
          )}
        </View>

        <ChevronRight size={22} color={c.slate} strokeWidth={1.8} />
      </View>
    </PressableScale>
  )
}

function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <Text className="font-sans" style={{ ...t.empty, color: c.slate, textAlign: 'center', paddingVertical: 40 }}>
      {children}
    </Text>
  )
}
