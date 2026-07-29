import { useMemo, useState, type ReactNode } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BookText, PenLine } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { displayWord, displayPinyin, displayExample } from '../lib/hanzi'
import { Modal } from '../components/Modal'
import { WritingPracticeModal } from '../components/WritingPracticeModal'
import { SpeakButton } from '../components/SpeakButton'
import { CATEGORY_META, CATEGORY_ORDER } from '../lib/categories'
import type { VocabWord, WordCategory } from '../types'

interface Group {
  label: string
  words: VocabWord[]
}

type LevelFilter = 'all' | number
type CategoryFilter = 'all' | WordCategory

export function Dictionary() {
  const { wordBank, settings } = useApp()
  const [selected, setSelected] = useState<VocabWord | null>(null)
  const [practiceWord, setPracticeWord] = useState<VocabWord | null>(null)
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')

  const filtered = useMemo(
    () =>
      wordBank.filter(
        (w) => (levelFilter === 'all' || w.hskLevel === levelFilter) && (categoryFilter === 'all' || w.category === categoryFilter),
      ),
    [wordBank, levelFilter, categoryFilter],
  )

  const groups = useMemo<Group[]>(() => {
    const byLevel = new Map<number | 'custom', VocabWord[]>()
    for (const word of filtered) {
      const key = word.custom ? 'custom' : word.hskLevel
      const list = byLevel.get(key) ?? []
      list.push(word)
      byLevel.set(key, list)
    }
    const levels = [...byLevel.keys()]
      .filter((k): k is number => k !== 'custom')
      .sort((a, b) => a - b)

    const ordered: Group[] = levels.map((level) => ({
      label: `HSK ${level}`,
      words: [...(byLevel.get(level) ?? [])].sort((a, b) => a.simplified.localeCompare(b.simplified)),
    }))
    const custom = byLevel.get('custom')
    if (custom && custom.length > 0) ordered.push({ label: 'Custom words', words: custom })
    return ordered
  }, [filtered])

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-4 pt-2">
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-medium text-slate-400 dark:text-slate-500">Chinese Easy</Text>
            <Text className="text-lg font-bold text-slate-900 dark:text-white">Dictionary</Text>
          </View>
          <View className="flex-row items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 dark:bg-brand-900/40">
            <BookText size={14} color="#137548" />
            <Text className="text-xs font-bold text-brand-700 dark:text-brand-300">{filtered.length} words</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
          <FilterChip active={levelFilter === 'all'} onPress={() => setLevelFilter('all')} label="All levels" />
          {[1, 2, 3, 4, 5, 6].map((lvl) => (
            <FilterChip key={lvl} active={levelFilter === lvl} onPress={() => setLevelFilter(lvl)} label={`HSK ${lvl}`} />
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
          <FilterChip active={categoryFilter === 'all'} onPress={() => setCategoryFilter('all')} label="All categories" />
          {CATEGORY_ORDER.map((cat) => {
            const meta = CATEGORY_META[cat]
            const Icon = meta.icon
            return (
              <FilterChip
                key={cat}
                active={categoryFilter === cat}
                onPress={() => setCategoryFilter(cat)}
                label={meta.label}
                icon={<Icon size={13} color={categoryFilter === cat ? 'white' : '#64748b'} />}
              />
            )
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ gap: 24, paddingHorizontal: 16, paddingBottom: 32 }}>
        {groups.length === 0 && <Text className="py-12 text-center text-sm text-slate-400">No words match these filters.</Text>}
        {groups.map((group) => (
          <View key={group.label}>
            <Text className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{group.label}</Text>
            <View className="flex-row flex-wrap gap-2.5">
              {group.words.map((word) => (
                <Pressable
                  key={word.id}
                  onPress={() => setSelected(word)}
                  className="w-[31.5%] items-center justify-center gap-1 rounded-2xl bg-white py-3.5 shadow-card dark:bg-slate-900"
                >
                  <Text className="font-hanzi text-2xl font-bold text-slate-900 dark:text-white">{displayWord(word, settings.script)}</Text>
                  <Text className="text-[11px] text-slate-400">{displayPinyin(word, settings.phoneticScript)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {selected && (
        <Modal title={displayWord(selected, settings.script)} onClose={() => setSelected(null)}>
          <View className="items-center gap-3">
            <View className="flex-row items-center gap-2">
              <Text className="font-hanzi text-6xl font-bold text-slate-900 dark:text-white">{displayWord(selected, settings.script)}</Text>
              <SpeakButton text={displayWord(selected, settings.script)} />
            </View>
            <Text className="text-lg font-medium text-slate-400">{displayPinyin(selected, settings.phoneticScript)}</Text>
            <Text className="text-xl font-semibold text-slate-900 dark:text-white">{selected.definition}</Text>

            {selected.example && displayExample(selected, settings.script) && (
              <View className="w-full border-t border-slate-100 pt-3 dark:border-slate-800">
                <Text className="font-hanzi text-base text-slate-700 dark:text-slate-300">{displayExample(selected, settings.script)}</Text>
                <Text className="text-sm text-slate-400">{selected.example.pinyin}</Text>
                <Text className="text-sm italic text-slate-400">{selected.example.translation}</Text>
              </View>
            )}

            <View className="flex-row flex-wrap items-center justify-center gap-2">
              <Text className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-400 dark:bg-slate-800">
                {selected.custom ? 'Custom word' : `HSK ${selected.hskLevel}`}
              </Text>
              <View className="flex-row items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 dark:bg-slate-800">
                {(() => {
                  const Icon = CATEGORY_META[selected.category].icon
                  return <Icon size={12} color="#94a3b8" />
                })()}
                <Text className="text-xs font-bold text-slate-400">{CATEGORY_META[selected.category].label}</Text>
              </View>
            </View>

            <Pressable
              onPress={() => setPracticeWord(selected)}
              className="mt-1 w-full flex-row items-center justify-center gap-2 rounded-2xl bg-brand-500 py-3.5 shadow-card"
            >
              <PenLine size={18} color="white" />
              <Text className="text-lg font-bold text-white">Practice Writing</Text>
            </Pressable>
          </View>
        </Modal>
      )}

      {practiceWord && <WritingPracticeModal word={practiceWord} onClose={() => setPracticeWord(null)} />}
    </SafeAreaView>
  )
}

function FilterChip({ active, onPress, label, icon }: { active: boolean; onPress: () => void; label: string; icon?: ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-1.5 rounded-full px-3.5 py-2 ${active ? 'bg-brand-500' : 'bg-white shadow-card dark:bg-slate-900'}`}
    >
      {icon}
      <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>{label}</Text>
    </Pressable>
  )
}
