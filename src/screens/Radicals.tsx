import { useMemo, useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft, PenSquare, Search } from 'lucide-react-native'
import { Modal } from '../components/Modal'
import { SpeakButton } from '../components/SpeakButton'
import { RADICALS } from '../data/radicals'
import type { Radical } from '../types'

interface Group {
  strokeCount: number
  radicals: Radical[]
}

export function Radicals() {
  const [selected, setSelected] = useState<Radical | null>(null)
  const [query, setQuery] = useState('')
  const [strokeFilter, setStrokeFilter] = useState<'all' | number>('all')

  const strokeCounts = useMemo(() => [...new Set(RADICALS.map((r) => r.strokeCount))].sort((a, b) => a - b), [])

  const groups = useMemo<Group[]>(() => {
    const q = query.trim().toLowerCase()
    const matches = RADICALS.filter((r) => {
      if (strokeFilter !== 'all' && r.strokeCount !== strokeFilter) return false
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
  }, [query, strokeFilter])

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="mb-2 flex-row items-center gap-3 px-4 pt-2">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="rounded-full bg-white p-2 shadow-card dark:bg-slate-900"
        >
          <ArrowLeft size={20} color="#64748b" />
        </Pressable>
        <View>
          <Text className="text-sm font-medium text-slate-400 dark:text-slate-500">Dictionary</Text>
          <Text className="text-lg font-bold text-slate-900 dark:text-white">Learn Radicals</Text>
        </View>
      </View>
      <Text className="px-4 pb-2 text-xs text-slate-400">
        The building blocks characters are made of — {RADICALS.length} of the most common ones. These aren't full words, so they won't be
        added to My Words.
      </Text>

      <View className="px-4">
        <View className="mb-3 flex-row items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 shadow-card dark:bg-slate-900">
          <Search size={16} color="#94a3b8" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search radicals, characters, pinyin..."
            placeholderTextColor="#94a3b8"
            className="flex-1 text-sm text-slate-900 dark:text-white"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
          <Pressable
            onPress={() => setStrokeFilter('all')}
            className={`rounded-full px-3.5 py-2 ${strokeFilter === 'all' ? 'bg-brand-500' : 'bg-white shadow-card dark:bg-slate-900'}`}
          >
            <Text className={`text-xs font-semibold ${strokeFilter === 'all' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
              All Strokes
            </Text>
          </Pressable>
          {strokeCounts.map((sc) => (
            <Pressable
              key={sc}
              onPress={() => setStrokeFilter(sc)}
              className={`rounded-full px-3.5 py-2 ${strokeFilter === sc ? 'bg-brand-500' : 'bg-white shadow-card dark:bg-slate-900'}`}
            >
              <Text className={`text-xs font-semibold ${strokeFilter === sc ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>{sc}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ gap: 24, paddingHorizontal: 16, paddingBottom: 32 }}>
        {groups.length === 0 && <Text className="py-12 text-center text-sm text-slate-400">No radicals match this search.</Text>}
        {groups.map((group) => (
          <View key={group.strokeCount}>
            <Text className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {group.strokeCount} stroke{group.strokeCount === 1 ? '' : 's'}
            </Text>
            <View className="flex-row flex-wrap gap-2.5">
              {group.radicals.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => setSelected(r)}
                  className="w-[31.5%] items-center justify-center gap-1 rounded-2xl bg-white py-3.5 shadow-card dark:bg-slate-900"
                >
                  <Text className="font-hanzi text-2xl font-bold text-slate-900 dark:text-white">{r.character}</Text>
                  <Text className="text-[11px] text-slate-400">{r.pinyin}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {selected && (
        <Modal title={selected.character} onClose={() => setSelected(null)}>
          <View className="items-center gap-3">
            <View className="flex-row items-center gap-2">
              <Text className="font-hanzi text-6xl font-bold text-slate-900 dark:text-white">{selected.character}</Text>
              <SpeakButton text={selected.character} />
            </View>
            <Text className="text-lg font-medium text-slate-400">{selected.pinyin}</Text>
            <Text className="text-xl font-semibold text-slate-900 dark:text-white">{selected.meaning}</Text>

            <View className="flex-row items-center gap-2 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
              <PenSquare size={14} color="#94a3b8" />
              <Text className="text-xs font-bold text-slate-400">
                {selected.strokeCount} stroke{selected.strokeCount === 1 ? '' : 's'}
              </Text>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  )
}
