import { useMemo, useState } from 'react'
import { View, Text, TextInput, useWindowDimensions } from 'react-native'
import { Search } from 'lucide-react-native'
import { DetailShell } from '../components/dictionary/DetailShell'
import { PressScale } from '../components/dictionary/PressScale'
import { ICON_GREEN, ICON_MUTED, ICON_STROKE } from '../components/dictionary/DictionaryControls'
import { DICT_BG, DICT_CARD_SHADOW } from '../components/dictionary/shadows'
import { useRevealedShadow } from '../components/shadowReveal'
import { RadicalDetailModal } from '../components/RadicalDetailModal'
import { RADICALS } from '../data/radicals'
import type { Radical } from '../types'

interface Group {
  strokeCount: number
  radicals: Radical[]
}

/** Tiles per row, and the fixed gap between them — see `Radicals` for how a tile's own width is derived from these. */
const GRID_COLUMNS = 3
const GRID_GAP = 10
/** Matches `DetailShell`'s own `ScrollView` padding. */
const SHELL_PADDING = 16
/** Same design cap every other full-screen layout in the app centres against. */
const CONTENT_MAX = 430

/**
 * One radical tile — a Kangxi reference glyph, always in the teaching table's
 * own traditional form regardless of `settings.script` (see `hanziFont`'s
 * comment on the Kangxi exception in CLAUDE.md: these come from a fixed
 * reference table, not a bank entry with two forms).
 *
 * `width` is a measured pixel value, not a Tailwind percentage — a dynamic
 * `w-[Npx]` class is invisible to NativeWind's static scan (see `hanziFont`'s
 * own comment on the same trap), and a percentage width can't account for the
 * fixed gap between columns, which is what left a short group's row (say, one
 * lone radical at 1 stroke) looking like a different, wider tile rather than
 * the same size sitting flush left.
 */
function RadicalTile({ radical, width, onPress }: { radical: Radical; width: number; onPress: () => void }) {
  const shadow = useRevealedShadow(DICT_CARD_SHADOW)
  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.96}
      style={[shadow, { width, borderRadius: 16, backgroundColor: DICT_BG.card }]}
      className="items-center justify-center gap-1 rounded-2xl border border-dict-border bg-dict-card py-3.5"
      accessibilityLabel={`${radical.character}, ${radical.pinyin}, ${radical.meaning}`}
    >
      <Text className="font-hanzi-tc-regular text-[26px] leading-[32px] text-dict-heading">{radical.character}</Text>
      <Text numberOfLines={1} className="font-dict-sans text-[11.5px] leading-[15px] text-dict-soft">
        {radical.pinyin}
      </Text>
    </PressScale>
  )
}

export function Radicals() {
  const [selected, setSelected] = useState<Radical | null>(null)
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)

  const { width: windowWidth } = useWindowDimensions()
  /* The same column the rest of the dictionary centres its content in, minus
     `DetailShell`'s own padding — derived rather than measured with
     `onLayout`, which doesn't fire for every view on this project's web
     target (see CLAUDE.md's note on `budgetForArea` and friends). */
  const contentWidth = Math.min(windowWidth, CONTENT_MAX) - SHELL_PADDING * 2
  const tileWidth = (contentWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS

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
    <DetailShell title="Radicals">
      <View>
        <Text className="font-dict-sans text-[14.5px] leading-[20px] text-dict-soft">
          The building blocks characters are made of — {RADICALS.length} of the most common ones. These aren't full
          words, so they won't be added to My Words.
        </Text>
      </View>

      <View
        className={`flex-row items-center rounded-[16px] border bg-dict-card px-4 ${
          focused ? 'border-dict-green/60' : 'border-dict-border'
        }`}
        style={{ height: 50, gap: 10 }}
      >
        <Search size={18} color={focused ? ICON_GREEN : ICON_MUTED} strokeWidth={ICON_STROKE} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search radicals, characters, pinyin"
          placeholderTextColor={ICON_MUTED}
          autoCorrect={false}
          autoCapitalize="none"
          keyboardType="ascii-capable"
          accessibilityLabel="Search radicals"
          className="flex-1 font-dict-sans text-[15px] text-dict-heading"
        />
      </View>

      {groups.length === 0 && (
        <Text className="py-12 text-center font-dict-sans text-[15px] text-dict-soft">
          No radicals match this search.
        </Text>
      )}

      {groups.map((group) => (
        <View key={group.strokeCount} className="gap-2.5">
          <Text className="font-dict-semibold text-[13px] leading-[17px] text-dict-soft">
            {group.strokeCount} stroke{group.strokeCount === 1 ? '' : 's'}
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: GRID_GAP }}>
            {group.radicals.map((r) => (
              <RadicalTile key={r.id} radical={r} width={tileWidth} onPress={() => setSelected(r)} />
            ))}
          </View>
        </View>
      ))}

      {selected && <RadicalDetailModal radical={selected} onClose={() => setSelected(null)} />}
    </DetailShell>
  )
}
