import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft, PenLine } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { displayWord, displayPinyin, displayExample } from '../lib/hanzi'
import { Modal } from '../components/Modal'
import { WritingPracticeModal } from '../components/WritingPracticeModal'
import { SpeakButton } from '../components/SpeakButton'
import { PROFICIENCY_META, ProficiencyChip, TIER_ORDER } from '../components/ProficiencyChip'
import { CATEGORY_META } from '../lib/categories'
import {
  DEMOTE_LAPSES,
  PROFICIENT_REPS,
  proficiencyFor,
  proficiencyProgress,
  proficiencyTotals,
  type Proficiency,
} from '../lib/proficiency'
import type { SrsCard, VocabWord } from '../types'
import { shortGloss } from '../lib/definitions'

interface LearnedWord {
  word: VocabWord
  card: SrsCard
  level: Proficiency
}

interface Group {
  label: string
  words: LearnedWord[]
}

type LevelFilter = 'all' | number

export function MyWords() {
  const { deck, getWord, settings, clearNewWordFlags } = useApp()
  const [selected, setSelected] = useState<LearnedWord | null>(null)
  const [practiceWord, setPracticeWord] = useState<VocabWord | null>(null)
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all')
  const [tierFilter, setTierFilter] = useState<Proficiency | 'all'>('all')

  useEffect(() => {
    clearNewWordFlags()
  }, [clearNewWordFlags])

  const learned = useMemo<LearnedWord[]>(() => {
    return deck
      .map((card) => {
        const word = getWord(card.wordId)
        if (!word) return null
        return { word, card, level: proficiencyFor(card) }
      })
      .filter((x): x is LearnedWord => x !== null)
  }, [deck, getWord])

  const filtered = useMemo(
    () =>
      learned.filter(
        (x) =>
          (levelFilter === 'all' || x.word.hskLevel === levelFilter) &&
          (tierFilter === 'all' || x.level === tierFilter),
      ),
    [learned, levelFilter, tierFilter],
  )

  const totals = useMemo(() => proficiencyTotals(learned.map((x) => x.card)), [learned])

  const groups = useMemo<Group[]>(() => {
    const byLevel = new Map<number | 'custom', LearnedWord[]>()
    for (const entry of filtered) {
      const key = entry.word.custom ? 'custom' : entry.word.hskLevel
      const list = byLevel.get(key) ?? []
      list.push(entry)
      byLevel.set(key, list)
    }
    const levels = [...byLevel.keys()].filter((k): k is number => k !== 'custom').sort((a, b) => a - b)
    const ordered: Group[] = levels.map((level) => ({
      label: `HSK ${level}`,
      words: [...(byLevel.get(level) ?? [])].sort((a, b) => a.word.simplified.localeCompare(b.word.simplified)),
    }))
    const custom = byLevel.get('custom')
    if (custom && custom.length > 0) ordered.push({ label: 'Custom words', words: custom })
    return ordered
  }, [filtered])

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-4 pt-2">
        <View className="mb-4 flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            className="rounded-full bg-white p-2 shadow-card dark:bg-slate-900"
          >
            <ArrowLeft size={20} color="#64748b" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-sm font-medium text-slate-400 dark:text-slate-500">Chinese Easy</Text>
            <Text className="text-lg font-bold text-slate-900 dark:text-white">My Words</Text>
          </View>
          <Text className="text-xs font-bold text-slate-400">{learned.length} words</Text>
        </View>

        {/* The three tiers, doubling as filters. Tap one to see only those words. */}
        <View className="mb-3 flex-row gap-2">
          {TIER_ORDER.map((tier) => {
            const meta = PROFICIENCY_META[tier]
            const Icon = meta.icon
            const active = tierFilter === tier
            return (
              <Pressable
                key={tier}
                onPress={() => setTierFilter((prev) => (prev === tier ? 'all' : tier))}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${totals[tier]} ${meta.label}`}
                className={`flex-1 items-center gap-0.5 rounded-2xl py-2.5 ${meta.chip} ${active ? 'border-2 border-slate-900/20 dark:border-white/30' : ''}`}
              >
                <Icon size={15} color={meta.iconColor} />
                <Text className={`text-[19px] font-extrabold leading-[23px] ${meta.text}`}>{totals[tier]}</Text>
                <Text className={`text-[11px] font-bold ${meta.text}`}>{meta.label}</Text>
              </Pressable>
            )
          })}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
          <FilterChip active={levelFilter === 'all'} onPress={() => setLevelFilter('all')} label="All levels" />
          {[1, 2, 3, 4, 5, 6].map((lvl) => (
            <FilterChip key={lvl} active={levelFilter === lvl} onPress={() => setLevelFilter(lvl)} label={`HSK ${lvl}`} />
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ gap: 24, paddingHorizontal: 16, paddingBottom: 32 }}>
        {learned.length === 0 && (
          <Text className="py-12 text-center text-sm text-slate-400">
            No words learned yet — add some from New Words, Lessons, or Books.
          </Text>
        )}
        {learned.length > 0 && groups.length === 0 && (
          <Text className="py-12 text-center text-sm text-slate-400">No words match this filter.</Text>
        )}
        {groups.map((group) => (
          <View key={group.label}>
            <Text className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{group.label}</Text>
            <View className="gap-2.5">
              {group.words.map((entry) => (
                <Pressable
                  key={entry.word.id}
                  onPress={() => setSelected(entry)}
                  className="flex-row items-center gap-3 rounded-2xl bg-white p-3.5 shadow-card dark:bg-slate-900"
                >
                  <Text className="font-hanzi text-2xl font-bold text-slate-900 dark:text-white">
                    {displayWord(entry.word, settings.script)}
                  </Text>
                  <View className="flex-1">
                    <Text className="text-xs text-slate-400">{displayPinyin(entry.word, settings.phoneticScript)}</Text>
                    <Text numberOfLines={1} className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      {shortGloss(entry.word)}
                    </Text>
                  </View>
                  <ProficiencyChip level={entry.level} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {selected && (
        <Modal title={displayWord(selected.word, settings.script)} onClose={() => setSelected(null)}>
          <View className="items-center gap-3">
            <View className="flex-row items-center gap-2">
              <Text className="font-hanzi text-6xl font-bold text-slate-900 dark:text-white">
                {displayWord(selected.word, settings.script)}
              </Text>
              <SpeakButton text={displayWord(selected.word, settings.script)} />
            </View>
            <Text className="text-lg font-medium text-slate-400">{displayPinyin(selected.word, settings.phoneticScript)}</Text>
            <Text className="text-xl font-semibold text-slate-900 dark:text-white">{shortGloss(selected.word)}</Text>

            {selected.word.example && displayExample(selected.word, settings.script) && (
              <View className="w-full border-t border-slate-100 pt-3 dark:border-slate-800">
                <Text className="font-hanzi text-base text-slate-700 dark:text-slate-300">
                  {displayExample(selected.word, settings.script)}
                </Text>
                <Text className="text-sm text-slate-400">{selected.word.example.pinyin}</Text>
                <Text className="text-sm italic text-slate-400">{selected.word.example.translation}</Text>
              </View>
            )}

            <View className="flex-row flex-wrap items-center justify-center gap-2">
              <Text className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-400 dark:bg-slate-800">
                {selected.word.custom ? 'Custom word' : `HSK ${selected.word.hskLevel}`}
              </Text>
              <View className="flex-row items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 dark:bg-slate-800">
                {(() => {
                  const Icon = CATEGORY_META[selected.word.category].icon
                  return <Icon size={12} color="#94a3b8" />
                })()}
                <Text className="text-xs font-bold text-slate-400">{CATEGORY_META[selected.word.category].label}</Text>
              </View>
              <ProficiencyChip level={selected.level} compact />
            </View>

            <ProficiencyDetail entry={selected} />

            <Pressable
              onPress={() => setPracticeWord(selected.word)}
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

/**
 * Explains a word's tier in the detail sheet: how many correct reviews it has
 * banked, and what it would take to move up — or what dropped it back down.
 */
function ProficiencyDetail({ entry }: { entry: LearnedWord }) {
  const { card, level } = entry
  const meta = PROFICIENCY_META[level]
  const successful = Math.max(0, card.reps - card.lapses)
  const recentLapses = card.recentLapses ?? 0
  const pct = Math.round(proficiencyProgress(card) * 100)

  const note =
    level === 'proficient'
      ? `Answered right ${successful} times. Missing it ${DEMOTE_LAPSES} times recently would move it back to still learning.`
      : successful < PROFICIENT_REPS
        ? `${successful} of ${PROFICIENT_REPS} correct reviews. ${PROFICIENT_REPS - successful} more to reach proficient.`
        : `Missed ${recentLapses} times recently, which moved it back down. Get it right again to restore it.`

  return (
    <View className="w-full rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
      <View className="mb-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <View className={`h-full rounded-full ${meta.bar}`} style={{ width: `${pct}%` }} />
      </View>
      <Text className="text-[13px] leading-[18px] text-slate-600 dark:text-slate-300">{note}</Text>
    </View>
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
