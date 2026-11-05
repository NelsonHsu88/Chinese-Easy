import { useMemo, useState } from 'react'
import { View, Text, TextInput, Image, Pressable, ScrollView, Animated, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Search, X } from 'lucide-react-native'
import { BackArrow } from '../components/BackArrow'
import { PressableScale } from '../components/dashboard/parts'
import { useEntranceRun, useReveal } from '../components/dashboard/entrance'
import { RadicalDetailModal } from '../components/RadicalDetailModal'
import { RADICALS } from '../data/radicals'
import type { Radical } from '../types'
import {
  radColors as c,
  radSpacing as sp,
  radType as t,
  radRadius,
  strokeTint,
  RAD_BONSAI_RATIO,
  RAD_CONTENT_MAX,
  RAD_FOOT_RATIO,
} from '../components/radicals/tokens'

/*
 * Radicals, in the house style of My Words and Challenges: back arrow, big
 * title and subtitle over a corner painting (the bonsai the Dictionary's
 * Radicals tile wears, so this is visibly where that tile leads), a pill
 * search field, then the radicals grouped by stroke count on cream tiles.
 */

const bonsaiArt = require('../assets/images/dashboard/bonsai.png')
const footArt = require('../assets/images/new-words/foot-scenery.png')

interface Group {
  strokeCount: number
  radicals: Radical[]
}

/** Tiles per row, and the fixed gap between them. A tile's width is derived, not a percentage, so a short row's tiles stay the same size. */
const GRID_COLUMNS = 3
const GRID_GAP = 10

/** The page arriving: header, search, then the grid, one beat apart (the Books entrance). */
const ENTER = { for: 520, rise: 20, step: 80 } as const

function RadicalTile({ radical, width, onPress }: { radical: Radical; width: number; onPress: () => void }) {
  const tint = strokeTint(radical.strokeCount)
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.96}
      accessibilityLabel={`${radical.character}, ${radical.pinyin}, ${radical.meaning}`}
      wrapperStyle={{ width }}
    >
      <View
        style={{
          alignItems: 'center',
          paddingVertical: sp.md,
          paddingHorizontal: sp.sm,
          borderRadius: radRadius.tile,
          borderWidth: 1,
          borderColor: c.tileBorder,
          backgroundColor: c.tile,
        }}
      >
        {/* Kangxi reference glyphs: always the table's traditional form, whatever `settings.script`. */}
        <Text className="font-hanzi-tc-regular" style={{ ...t.hanzi, color: c.navy }}>
          {radical.character}
        </Text>
        <Text numberOfLines={1} style={{ ...t.pinyin, fontFamily: 'NunitoBold', color: tint.ink, marginTop: 2 }}>
          {radical.pinyin}
        </Text>
        <Text numberOfLines={1} style={{ ...t.meaning, fontFamily: 'Nunito', color: c.slate, marginTop: 1 }}>
          {radical.meaning}
        </Text>
      </View>
    </PressableScale>
  )
}

function SectionHeading({ strokeCount, count }: { strokeCount: number; count: number }) {
  const tint = strokeTint(strokeCount)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginBottom: sp.md }}>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tint.soft,
        }}
      >
        <Text style={{ ...t.count, fontFamily: 'NunitoExtraBold', color: tint.text }}>{strokeCount}</Text>
      </View>
      <Text accessibilityRole="header" style={{ ...t.section, fontFamily: 'NunitoExtraBold', color: c.navy }}>
        {strokeCount === 1 ? 'stroke' : 'strokes'}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: c.rule, marginHorizontal: sp.xs }} />
      <Text style={{ ...t.count, fontFamily: 'NunitoBold', color: c.muted }}>{count}</Text>
    </View>
  )
}

export function Radicals() {
  const [selected, setSelected] = useState<Radical | null>(null)
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)

  const { width: windowWidth } = useWindowDimensions()
  const column = Math.min(windowWidth, RAD_CONTENT_MAX)
  const tileWidth = (column - sp.screen * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS
  const bonsaiWidth = column * 0.4

  const run = useEntranceRun()
  const enter = (i: number) => ({ from: 'bottom' as const, at: i * ENTER.step, duration: ENTER.for, distance: ENTER.rise, run })
  const enterHeader = useReveal(enter(0))
  const enterSearch = useReveal(enter(1))
  const enterGrid = useReveal(enter(2))

  const groups = useMemo<Group[]>(() => {
    const q = query.trim().toLowerCase()
    const matches = RADICALS.filter((r) => {
      if (!q) return true
      return r.character.includes(q) || r.pinyin.toLowerCase().includes(q) || r.meaning.toLowerCase().includes(q)
    })
    const byStroke = new Map<number, Radical[]>()
    for (const r of matches) {
      const list = byStroke.get(r.strokeCount) ?? []
      list.push(r)
      byStroke.set(r.strokeCount, list)
    }
    return [...byStroke.keys()]
      .sort((a, b) => a - b)
      .map((strokeCount) => ({ strokeCount, radicals: byStroke.get(strokeCount) ?? [] }))
  }, [query])

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }}
      >
        <View style={{ width: column, flexGrow: 1, paddingHorizontal: sp.screen }}>
          <Animated.View style={enterHeader}>
            {/* Behind the title, against the top right. `Image` takes no pointerEvents, so the wrapper carries it. */}
            <View pointerEvents="none" style={{ position: 'absolute', top: 6, right: -sp.xs }}>
              <Image source={bonsaiArt} resizeMode="contain" style={{ width: bonsaiWidth, height: bonsaiWidth / RAD_BONSAI_RATIO }} />
            </View>

            <View style={{ height: 44, justifyContent: 'center' }}>
              <BackArrow
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/dictionary-tab'))}
                style={{ marginLeft: -8, alignSelf: 'flex-start' }}
              />
            </View>

            <Text accessibilityRole="header" style={{ ...t.title, fontFamily: 'NunitoExtraBold', color: c.navy, marginTop: -sp.xs }}>
              Radicals
            </Text>
            <Text style={{ ...t.subtitle, fontFamily: 'NunitoSemiBold', color: c.slate, marginTop: 4, maxWidth: '60%' }}>
              The building blocks of Chinese characters.
            </Text>
          </Animated.View>

          <Animated.View style={enterSearch}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: sp.xl,
                height: 52,
                borderRadius: radRadius.pill,
                borderWidth: 1,
                borderColor: focused ? c.fieldFocus : c.fieldBorder,
                backgroundColor: c.field,
                paddingLeft: sp.lg,
                paddingRight: sp.sm,
                gap: sp.md,
              }}
            >
              <Search size={21} color={c.slate} strokeWidth={2} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Search by character, pinyin or meaning"
                placeholderTextColor={c.placeholder}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                accessibilityLabel="Search radicals"
                style={{ flex: 1, ...t.search, fontFamily: 'Nunito', color: c.navy, paddingVertical: 0 }}
              />
              {query.length > 0 && (
                <Pressable
                  onPress={() => setQuery('')}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  hitSlop={10}
                  style={{ padding: sp.xs }}
                >
                  <X size={18} color={c.slate} strokeWidth={2} />
                </Pressable>
              )}
            </View>
          </Animated.View>

          <Animated.View style={[{ marginTop: sp.xxl }, enterGrid]}>
            {groups.length === 0 && (
              <Text style={{ ...t.note, fontFamily: 'Nunito', color: c.slate, textAlign: 'center', paddingVertical: 40 }}>
                No radicals match this search.
              </Text>
            )}

            {groups.map((group) => (
              <View key={group.strokeCount} style={{ marginBottom: sp.xxl }}>
                <SectionHeading strokeCount={group.strokeCount} count={group.radicals.length} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP }}>
                  {group.radicals.map((r) => (
                    <RadicalTile key={r.id} radical={r} width={tileWidth} onPress={() => setSelected(r)} />
                  ))}
                </View>
              </View>
            ))}

            {groups.length > 0 && (
              <Text style={{ ...t.note, fontFamily: 'Nunito', color: c.muted, textAlign: 'center', paddingHorizontal: sp.lg }}>
                {RADICALS.length} of the most common radicals. They aren't full words, so they aren't added to My Words.
              </Text>
            )}
          </Animated.View>
        </View>

        {/* The bamboo and mist along the foot, closing the list as New Words closes its page. */}
        <View pointerEvents="none" style={{ width: column, marginTop: sp.lg }}>
          <Image source={footArt} resizeMode="cover" style={{ width: column, height: column / RAD_FOOT_RATIO }} />
        </View>
      </ScrollView>

      {selected && <RadicalDetailModal radical={selected} onClose={() => setSelected(null)} />}
    </SafeAreaView>
  )
}
