import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeIn } from 'react-native-reanimated'
import { router } from 'expo-router'
import { ChevronLeft, Plus, SkipForward, BookPlus, PenLine, History, RotateCcw, Check, X } from 'lucide-react-native'
import { useApp, type NewWordSeen } from '../context/AppContext'
import { newWordsPool } from '../lib/selectors'
import { displayWord, displayExample, displayPinyin, hanziFont } from '../lib/hanzi'
import { ReadingSentence } from '../components/dictionary/ReadingSentence'
import { AddCustomWordModal } from '../components/AddCustomWordModal'
import { WritingPracticeModal } from '../components/WritingPracticeModal'
import { SpeakButton } from '../components/SpeakButton'
import { shortGloss } from '../lib/definitions'
import type { PhoneticScript, ScriptMode, VocabWord } from '../types'

export function NewWords() {
  const {
    wordBank,
    deck,
    settings,
    addToReviewDeck,
    wordsLearnedToday,
    newWordHistory,
    skipNewWord,
    noteNewWordAdded,
    unskipNewWord,
    getWord,
  } = useApp()
  const [flipped, setFlipped] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPractice, setShowPractice] = useState(false)
  const [showRecent, setShowRecent] = useState(false)

  /*
   * Skips come from persisted state, not from local `useState`.
   *
   * They used to live in a `Set` in this component, so a skip lasted exactly as
   * long as the screen stayed mounted: leaving New Words and coming back put the
   * skipped word straight back at the front of the queue, every time. Skipping a
   * word is a decision about that word — the learner is saying they don't want
   * to learn it — so it belongs with the rest of the learner's state and has to
   * outlive the screen.
   */
  const skipped = useMemo(
    () => new Set(newWordHistory.filter((entry) => entry.outcome === 'skipped').map((entry) => entry.wordId)),
    [newWordHistory],
  )

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
        <View className="mb-4 flex-row items-center gap-1">
          {/* Same back control the Lessons path and Review hub use — New Words is
              pushed over the tabs, so this is the way out. */}
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityRole="button"
            accessibilityLabel="Back"
            className="-ml-1 p-1"
          >
            <ChevronLeft size={28} color="#1e293b" strokeWidth={2.5} />
          </Pressable>
          {/* Just the screen's name. The app's own name above it was a
              breadcrumb to nowhere — there is only one app, and the learner is
              already inside it. */}
          <View className="flex-1">
            <Text className="text-lg font-bold text-slate-900 dark:text-white">New Words</Text>
          </View>
          <Pressable
            onPress={() => setShowRecent(true)}
            accessibilityRole="button"
            accessibilityLabel={`Recent words, ${newWordHistory.length} seen`}
            className="mr-2 flex-row items-center gap-1.5 rounded-full border border-slate-300 px-3.5 py-2 dark:border-slate-700"
          >
            <History size={16} color="#64748b" />
            <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">Recent</Text>
          </Pressable>
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
              {/*
                Reanimated's Animated.View isn't registered with NativeWind, so a
                `className` on it is silently dropped — which is what left the card
                unstyled and its contents piled in the top-left corner. Keep it as a
                bare animation wrapper and put the layout on a plain View inside.
              */}
              <Animated.View key={`${current.id}-${flipped}`} entering={FadeIn.duration(180)} style={{ flex: 1 }}>
                <View
                  className="flex-1 items-center justify-center gap-3 rounded-3xl bg-white p-8 shadow-card dark:bg-slate-900"
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
                    <Text className="text-2xl font-bold text-slate-900 dark:text-white">{shortGloss(current)}</Text>
                    {current.example && displayExample(current, settings.script) && (
                      <View className="mt-3 items-center border-t border-slate-100 pt-3 dark:border-slate-800">
                        <ReadingSentence text={displayExample(current, settings.script)} term={displayWord(current, settings.script)} tone="card" size="compact" />
                        <Text className="text-sm italic text-slate-400">{current.example.translation}</Text>
                      </View>
                    )}
                    <Text className="mt-4 text-xs text-slate-300 dark:text-slate-600">tap to flip back</Text>
                  </>
                )}
                </View>
              </Animated.View>
            </Pressable>

            <View className="mt-4 gap-2 pb-6">
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => skipNewWord(current.id)}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-slate-300 py-4 dark:border-slate-700"
                >
                  <SkipForward size={18} color="#64748b" />
                  <Text className="font-semibold text-slate-500 dark:text-slate-400">Skip</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    addToReviewDeck(current.id)
                    noteNewWordAdded(current.id)
                  }}
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

      {showRecent && (
        <RecentWordsSheet
          history={newWordHistory}
          getWord={getWord}
          script={settings.script}
          phoneticScript={settings.phoneticScript}
          onUnskip={unskipNewWord}
          onClose={() => setShowRecent(false)}
        />
      )}
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

/**
 * The words this screen has already shown, newest first.
 *
 * Its job is to make a skip reversible. Skipping is meant to be cheap — the
 * learner is saying "not this one, move on" — and a cheap decision needs a way
 * back, or it stops being cheap. Added words are listed too, because "what have
 * I just been through?" is the same question whichever button was pressed.
 */
function RecentWordsSheet({
  history,
  getWord,
  script,
  phoneticScript,
  onUnskip,
  onClose,
}: {
  history: NewWordSeen[]
  getWord: (id: string) => VocabWord | undefined
  script: ScriptMode
  phoneticScript: PhoneticScript
  onUnskip: (wordId: string) => void
  onClose: () => void
}) {
  /* Newest first — the history is stored oldest-first so that trimming it drops
     the oldest, which is the opposite of how it should be read. */
  const rows = useMemo(
    () =>
      [...history]
        .reverse()
        .map((entry) => ({ entry, word: getWord(entry.wordId) }))
        .filter((row): row is { entry: NewWordSeen; word: VocabWord } => Boolean(row.word)),
    [history, getWord],
  )

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        {/* Stops a tap inside the sheet from closing it — the backdrop is the
            dismiss target, and without this every row press dismisses too. */}
        <Pressable onPress={() => {}} className="max-h-[80%] rounded-t-3xl bg-white dark:bg-slate-900">
          <View className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <View>
              <Text className="text-lg font-bold text-slate-900 dark:text-white">Recent words</Text>
              <Text className="text-xs text-slate-400">Cards you've skipped or added</Text>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} className="p-1">
              <X size={22} color="#64748b" />
            </Pressable>
          </View>

          {rows.length === 0 ? (
            <View className="items-center gap-2 px-6 py-12">
              <Text className="text-center text-sm text-slate-400">
                Nothing yet. Words you skip or add will show up here so you can go back to them.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
              {rows.map(({ entry, word }) => (
                <View
                  key={entry.wordId}
                  className="flex-row items-center gap-3 border-b border-slate-50 px-5 py-3 dark:border-slate-800/60"
                >
                  <View className="flex-1">
                    <View className="flex-row items-baseline gap-2">
                      <Text className={`${hanziFont(script)} text-[24px] leading-[32px] text-slate-900 dark:text-white`}>
                        {displayWord(word, script)}
                      </Text>
                      <Text className="text-sm text-slate-400">{displayPinyin(word, phoneticScript)}</Text>
                    </View>
                    <Text numberOfLines={1} className="text-sm text-slate-500 dark:text-slate-400">
                      {shortGloss(word)}
                    </Text>
                  </View>

                  {entry.outcome === 'added' ? (
                    <View className="flex-row items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1.5 dark:bg-brand-900/40">
                      <Check size={14} color="#16a34a" />
                      <Text className="text-xs font-bold text-brand-700 dark:text-brand-300">Added</Text>
                    </View>
                  ) : (
                    /* The only action here. An added word is already in the deck
                       and has its own home in My Words; a skipped one is the case
                       with nowhere else to go. */
                    <Pressable
                      onPress={() => onUnskip(entry.wordId)}
                      accessibilityRole="button"
                      accessibilityLabel={`Put ${displayWord(word, script)} back in the queue`}
                      className="flex-row items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 dark:border-slate-700"
                    >
                      <RotateCcw size={14} color="#64748b" />
                      <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">Unskip</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}
