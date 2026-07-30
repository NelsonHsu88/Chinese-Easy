import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeIn } from 'react-native-reanimated'
import { Plus, SkipForward, BookPlus, PenLine } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { newWordsPool } from '../lib/selectors'
import { displayWord, displayExample, displayPinyin } from '../lib/hanzi'
import { AddCustomWordModal } from '../components/AddCustomWordModal'
import { WritingPracticeModal } from '../components/WritingPracticeModal'
import { SpeakButton } from '../components/SpeakButton'

export function NewWords() {
  const { wordBank, deck, settings, addToReviewDeck, wordsLearnedToday } = useApp()
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [flipped, setFlipped] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPractice, setShowPractice] = useState(false)

  const pool = useMemo(() => newWordsPool(wordBank, deck, settings), [wordBank, deck, settings])
  const available = useMemo(() => pool.filter((w) => !skipped.has(w.id)), [pool, skipped])
  const current = available[0]

  useEffect(() => {
    setFlipped(false)
  }, [current?.id])

  const limitReached = wordsLearnedToday >= settings.dailyNewWordLimit

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50 dark:bg-slate-950">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16, paddingTop: 8 }}>
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-medium text-slate-400 dark:text-slate-500">Chinese Easy</Text>
            <Text className="text-lg font-bold text-slate-900 dark:text-white">New Words</Text>
          </View>
          <Pressable
            onPress={() => setShowAddModal(true)}
            className="flex-row items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-2 dark:bg-white"
          >
            <Plus size={16} color="white" />
            <Text className="text-sm font-semibold text-white dark:text-slate-900">Custom</Text>
          </Pressable>
        </View>

        <View className="mb-3 flex-row items-center justify-between rounded-xl bg-white px-3.5 py-2.5 shadow-card dark:bg-slate-900">
          <Text className="text-sm text-slate-500 dark:text-slate-400">
            New today: <Text className="font-bold text-slate-800 dark:text-slate-200">{wordsLearnedToday}</Text> / {settings.dailyNewWordLimit}
          </Text>
          <Text className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            HSK {settings.hskLevel}
          </Text>
        </View>

        {!current ? (
          <EmptyState limitReached={limitReached} onAddCustom={() => setShowAddModal(true)} />
        ) : (
          <View className="flex-1">
            {limitReached && (
              <View className="mb-3 rounded-xl bg-amber-100 px-3.5 py-2.5 dark:bg-amber-900/30">
                <Text className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Daily new word limit reached. Adjust it in Settings to keep going.
                </Text>
              </View>
            )}

            <Pressable onPress={() => setFlipped((f) => !f)} className="min-h-[340px] flex-1">
              <Animated.View
                key={`${current.id}-${flipped}`}
                entering={FadeIn.duration(180)}
                className="flex-1 items-center justify-center gap-3 rounded-3xl bg-white p-8 dark:bg-slate-900"
                style={{ elevation: 2 }}
              >
                {!flipped ? (
                  <>
                    <Text className="font-hanzi text-7xl font-bold text-slate-900 dark:text-white">{displayWord(current, settings.script)}</Text>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-xl font-medium text-slate-400">{displayPinyin(current, settings.phoneticScript)}</Text>
                      <SpeakButton text={displayWord(current, settings.script)} />
                    </View>
                    <Text className="mt-4 text-xs text-slate-300 dark:text-slate-600">tap to flip</Text>
                  </>
                ) : (
                  <>
                    <Text className="text-2xl font-bold text-slate-900 dark:text-white">{current.definition}</Text>
                    {current.example && displayExample(current, settings.script) && (
                      <View className="mt-3 items-center border-t border-slate-100 pt-3 dark:border-slate-800">
                        <Text className="font-hanzi text-lg text-slate-700 dark:text-slate-300">{displayExample(current, settings.script)}</Text>
                        <Text className="text-sm text-slate-400">{current.example.pinyin}</Text>
                        <Text className="text-sm italic text-slate-400">{current.example.translation}</Text>
                      </View>
                    )}
                    <Text className="mt-4 text-xs text-slate-300 dark:text-slate-600">tap to flip back</Text>
                  </>
                )}
              </Animated.View>
            </Pressable>

            <View className="mt-4 gap-2 pb-6">
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setSkipped((prev) => new Set(prev).add(current.id))}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-slate-300 py-4 dark:border-slate-700"
                >
                  <SkipForward size={18} color="#64748b" />
                  <Text className="font-semibold text-slate-500 dark:text-slate-400">Skip</Text>
                </Pressable>
                <Pressable
                  onPress={() => addToReviewDeck(current.id)}
                  disabled={limitReached}
                  className={`flex-[2] flex-row items-center justify-center gap-2 rounded-2xl bg-brand-500 py-4 shadow-card ${limitReached ? 'opacity-40' : ''}`}
                >
                  <BookPlus size={20} color="white" />
                  <Text className="text-lg font-bold text-white">Add to Review Deck</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => setShowPractice(true)}
                className="w-full flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-brand-300 py-3.5 dark:border-brand-800"
              >
                <PenLine size={18} color="#16a34a" />
                <Text className="font-semibold text-brand-600 dark:text-brand-400">Practice writing this word</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {showAddModal && <AddCustomWordModal onClose={() => setShowAddModal(false)} />}
      {showPractice && current && <WritingPracticeModal word={current} onClose={() => setShowPractice(false)} />}
    </SafeAreaView>
  )
}

function EmptyState({ limitReached, onAddCustom }: { limitReached: boolean; onAddCustom: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-3">
      <Text className="text-5xl">{'\u{1F38A}'}</Text>
      <Text className="text-lg font-bold text-slate-900 dark:text-white">{limitReached ? "You've hit today's limit" : "You've cleared this level!"}</Text>
      <Text className="max-w-xs text-center text-sm text-slate-400">
        {limitReached
          ? 'Come back tomorrow, or raise your daily new word limit in Settings.'
          : 'Add a custom word, or check Settings to raise your HSK level.'}
      </Text>
      <Pressable onPress={onAddCustom} className="mt-2 rounded-2xl bg-brand-500 px-5 py-3 shadow-card">
        <Text className="font-semibold text-white">Add Custom Word</Text>
      </Pressable>
    </View>
  )
}
