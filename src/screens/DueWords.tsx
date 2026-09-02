import { useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { BlurView } from 'expo-blur'
import { ArrowLeft, Play } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { allDueCardsFor } from '../lib/selectors'
import { displayWord, displayPinyin, displayExample } from '../lib/hanzi'
import { ReadingSentence } from '../components/dictionary/ReadingSentence'
import { Modal } from '../components/Modal'
import { SpeakButton } from '../components/SpeakButton'
import { CATEGORY_META } from '../lib/categories'
import type { VocabWord } from '../types'
import { shortGloss } from '../lib/definitions'

/** FSRS card states, as a learner-facing word. Relearning is a lapsed card working its way back. */
const STAGE_LABEL: Record<string, string> = {
  new: 'New',
  learning: 'Learning',
  review: 'Review',
  relearning: 'Relearning',
}

export function DueWords() {
  const { deck, settings, getWord } = useApp()
  const [selected, setSelected] = useState<VocabWord | null>(null)

  const dueCards = useMemo(() => allDueCardsFor(deck, settings), [deck, settings])

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="mb-4 flex-row items-center gap-3 px-4 pt-2">
        <Pressable
          onPress={() => router.push('/')}
          accessibilityRole="button"
          accessibilityLabel="Back to Dashboard"
          className="rounded-full bg-white p-2 shadow-card dark:bg-slate-900"
        >
          <ArrowLeft size={20} color="#64748b" />
        </Pressable>
        <View>
          <Text className="text-lg font-bold text-slate-900 dark:text-white">Due for Review</Text>
          <Text className="text-xs text-slate-400">
            {dueCards.length} word{dueCards.length === 1 ? '' : 's'}
          </Text>
        </View>
      </View>

      {dueCards.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-2">
          <Text className="text-5xl">{'\u{1F4ED}'}</Text>
          <Text className="text-slate-400">Nothing due right now.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 100 }}>
          {dueCards.map((card) => {
            const word = getWord(card.wordId)
            if (!word) return null
            return (
              <Pressable
                key={card.wordId}
                onPress={() => setSelected(word)}
                className="flex-row items-center gap-3 rounded-2xl bg-white p-3.5 shadow-card dark:bg-slate-900"
              >
                <Text className="w-16 font-hanzi text-2xl font-bold text-slate-900 dark:text-white">{displayWord(word, settings.script)}</Text>
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {displayPinyin(word, settings.phoneticScript)}
                  </Text>
                  <Text numberOfLines={1} className="text-sm text-slate-400">
                    {shortGloss(word)}
                  </Text>
                </View>
                <Text className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400 dark:bg-slate-800">
                  {STAGE_LABEL[card.state] ?? card.state}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      )}

      {dueCards.length > 0 && (
        <BlurView
          intensity={80}
          tint="light"
          className="absolute inset-x-0 bottom-0 border-t border-slate-200 p-4 dark:border-slate-800"
        >
          <Pressable
            onPress={() => router.push('/review')}
            className="w-full flex-row items-center justify-center gap-2 rounded-2xl bg-coral-500 py-4 shadow-card"
          >
            <Play size={20} color="white" />
            <Text className="text-lg font-bold text-white">Start Review</Text>
          </Pressable>
        </BlurView>
      )}

      {selected && (
        <Modal title={displayWord(selected, settings.script)} onClose={() => setSelected(null)}>
          <View className="items-center gap-3">
            <View className="flex-row items-center gap-2">
              <Text className="font-hanzi text-6xl font-bold text-slate-900 dark:text-white">{displayWord(selected, settings.script)}</Text>
              <SpeakButton text={displayWord(selected, settings.script)} />
            </View>
            <Text className="text-lg font-medium text-slate-400">{displayPinyin(selected, settings.phoneticScript)}</Text>
            <Text className="text-xl font-semibold text-slate-900 dark:text-white">{shortGloss(selected)}</Text>
            {selected.example && displayExample(selected, settings.script) && (
              <View className="w-full border-t border-slate-100 pt-3 dark:border-slate-800">
                <ReadingSentence text={displayExample(selected, settings.script)} term={displayWord(selected, settings.script)} tone="card" size="compact" />
                <Text className="text-sm italic text-slate-400">{selected.example.translation}</Text>
              </View>
            )}
            <View className="flex-row flex-wrap items-center justify-center gap-2">
              <Text className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-400 dark:bg-slate-800">
                {selected.custom ? 'Custom word' : `HSK ${selected.hskLevel}`}
              </Text>
              <Text className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-400 dark:bg-slate-800">
                {CATEGORY_META[selected.category].label}
              </Text>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  )
}
