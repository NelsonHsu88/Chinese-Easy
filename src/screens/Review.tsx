import { useMemo, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { X, Eye, Check, RotateCw, Lightbulb } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { dueCardsFor } from '../lib/selectors'
import { displayWord, displayExample, displayPinyin } from '../lib/hanzi'
import { HanziStage } from '../components/HanziStage'
import { SpeakButton } from '../components/SpeakButton'
import { Celebration } from '../components/Celebration'
import { playPositiveChime, playRetryTone } from '../lib/sound'
import { celebrateHaptic } from '../lib/haptics'
import type { Grade } from '../types'

type Direction = 'recognition' | 'production'

function directionFor(wordId: string, setting: 'recognition' | 'production' | 'mixed'): Direction {
  if (setting !== 'mixed') return setting
  let h = 0
  for (const ch of wordId) h = (h * 31 + ch.charCodeAt(0)) % 2
  return h === 0 ? 'recognition' : 'production'
}

const GRADE_BUTTONS: { grade: Grade; label: string; className: string }[] = [
  { grade: 'again', label: 'Again', className: 'bg-red-500' },
  { grade: 'hard', label: 'Hard', className: 'bg-orange-500' },
  { grade: 'good', label: 'Good', className: 'bg-brand-500' },
  { grade: 'easy', label: 'Easy', className: 'bg-blue-500' },
]

interface PracticeState {
  wordId: string
  remaining: number
  total: number
}

export function Review() {
  const { deck, settings, getWord, gradeCard, completePracticeRep, streak } = useApp()

  const [sessionQueue] = useState(() => dueCardsFor(deck, settings).map((c) => c.wordId))
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [hintShown, setHintShown] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [practice, setPractice] = useState<PracticeState | null>(null)
  const [stats, setStats] = useState({ reviewed: 0, correct: 0 })
  const [finished, setFinished] = useState(sessionQueue.length === 0)
  const [celebrateKey, setCelebrateKey] = useState(0)

  const currentWordId = sessionQueue[index]
  const word = currentWordId ? getWord(currentWordId) : undefined
  const direction = currentWordId ? directionFor(currentWordId, settings.reviewDirection) : 'recognition'

  const total = sessionQueue.length

  const advance = () => {
    setRevealed(false)
    setHintShown(false)
    setAttempt(0)
    if (index + 1 >= total) {
      setFinished(true)
    } else {
      setIndex((i) => i + 1)
    }
  }

  const handleGrade = (grade: Grade) => {
    if (!currentWordId) return
    gradeCard(currentWordId, grade)
    setStats((s) => ({ reviewed: s.reviewed + 1, correct: s.correct + (grade === 'again' ? 0 : 1) }))

    if (grade === 'easy' || grade === 'good') {
      playPositiveChime()
      celebrateHaptic()
      setCelebrateKey((k) => k + 1)
    } else {
      playRetryTone()
    }

    if (grade === 'again') {
      setRevealed(false)
      setPractice({ wordId: currentWordId, remaining: settings.wrongAnswerReps, total: settings.wrongAnswerReps })
    } else {
      advance()
    }
  }

  const handlePracticeNext = () => {
    if (!practice) return
    completePracticeRep(practice.wordId)
    if (practice.remaining - 1 <= 0) {
      setPractice(null)
      advance()
    } else {
      setPractice((p) => (p ? { ...p, remaining: p.remaining - 1 } : p))
    }
  }

  const accuracy = useMemo(() => (stats.reviewed === 0 ? 0 : Math.round((stats.correct / stats.reviewed) * 100)), [stats])

  if (finished) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-6 bg-slate-50 px-6 dark:bg-slate-950">
        <Celebration trigger={celebrateKey} />
        <Text className="text-6xl">{stats.reviewed === 0 ? '\u{1F4ED}' : accuracy >= 80 ? '\u{1F389}' : '\u{1F44D}'}</Text>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">{stats.reviewed === 0 ? 'Nothing to review' : 'Session complete!'}</Text>
        <Text className="text-center text-slate-500 dark:text-slate-400">
          {stats.reviewed === 0 ? "You're all caught up. Check back later or add new words." : `You reviewed ${stats.reviewed} card${stats.reviewed === 1 ? '' : 's'}.`}
        </Text>

        {stats.reviewed > 0 && (
          <View className="w-full max-w-xs flex-row gap-3">
            <View className="flex-1 rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
              <Text className="text-xs font-medium uppercase text-slate-400">Accuracy</Text>
              <Text className="text-2xl font-bold text-brand-600 dark:text-brand-400">{accuracy}%</Text>
            </View>
            <View className="flex-1 rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
              <Text className="text-xs font-medium uppercase text-slate-400">Streak</Text>
              <Text className="text-2xl font-bold text-amber-500">{streak} days</Text>
            </View>
          </View>
        )}

        <Pressable onPress={() => router.push('/')} className="mt-2 w-full max-w-xs items-center rounded-2xl bg-brand-500 px-6 py-4 shadow-card">
          <Text className="text-lg font-bold text-white">Back to Dashboard</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  if (!word) return null

  if (practice) {
    const doneCount = practice.total - practice.remaining + 1
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
        <ReviewHeader onClose={() => router.push('/')} step={doneCount} total={practice.total} progress={doneCount / practice.total} tint="amber" />
        <View className="items-center justify-center gap-3 px-4 pb-4 pt-6">
          <Text className="font-hanzi text-3xl font-semibold text-slate-900 dark:text-white">{displayWord(word, settings.script)}</Text>
          <Text className="text-sm text-slate-400">Rewrite it to lock it in</Text>
        </View>
        <View
          style={{ minHeight: 200 }}
          className="relative mx-4 mb-4 flex-1 rounded-2xl border border-slate-200 bg-white/60 dark:border-slate-700 dark:bg-slate-900/40"
        >
          <HanziStage
            character={displayWord(word, settings.script)}
            mode="quiz"
            showOutline
            showGuides
            resetKey={practice.remaining}
          />
        </View>
        <View className="px-4 pb-6">
          <Pressable onPress={handlePracticeNext} className="w-full items-center rounded-2xl bg-amber-500 py-4 shadow-card">
            <Text className="text-lg font-bold text-white">{practice.remaining <= 1 ? 'Done' : 'Next rep'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Celebration trigger={celebrateKey} />
      <ReviewHeader onClose={() => router.push('/')} step={index + 1} total={total} progress={(index + 1) / total} />

      <View className="items-center gap-1 px-4 pb-2 pt-3">
        {direction === 'recognition' ? (
          <>
            <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">Recognize this</Text>
            <View className="flex-row items-center gap-2">
              <Text className="font-hanzi text-5xl font-bold text-slate-900 dark:text-white">{displayWord(word, settings.script)}</Text>
              <SpeakButton text={displayWord(word, settings.script)} />
            </View>
          </>
        ) : (
          <>
            <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">Write in Chinese</Text>
            <Text className="text-2xl font-bold text-slate-900 dark:text-white">{word.definition}</Text>
          </>
        )}
      </View>

      <View
        style={{ minHeight: 200 }}
        className="relative mx-4 mb-4 flex-1 rounded-2xl border border-slate-200 bg-white/60 dark:border-slate-700 dark:bg-slate-900/40"
      >
        <HanziStage
          character={displayWord(word, settings.script)}
          mode={revealed ? 'demo' : 'quiz'}
          showOutline={revealed || direction === 'recognition' || hintShown}
          showGuides
          resetKey={`${currentWordId}-${attempt}-${revealed}`}
        />
      </View>

      {revealed && (
        <View className="mx-4 mb-3 rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
          <View className="flex-row items-center gap-2">
            <Text className="font-hanzi text-3xl font-bold text-slate-900 dark:text-white">{displayWord(word, settings.script)}</Text>
            <Text className="text-sm font-medium text-slate-400">{displayPinyin(word, settings.phoneticScript)}</Text>
            <SpeakButton text={displayWord(word, settings.script)} size={16} />
          </View>
          <Text className="mt-1 text-base font-medium text-slate-700 dark:text-slate-300">{word.definition}</Text>
          {word.example && displayExample(word, settings.script) && (
            <View className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
              <Text className="font-hanzi text-sm text-slate-600 dark:text-slate-400">{displayExample(word, settings.script)}</Text>
              <Text className="text-xs text-slate-400">{word.example.pinyin}</Text>
              <Text className="text-xs italic text-slate-400">{word.example.translation}</Text>
            </View>
          )}
        </View>
      )}

      <View className="px-4 pb-6">
        {!revealed ? (
          <View className="gap-3">
            <Pressable
              onPress={() => setRevealed(true)}
              className="flex-row items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 shadow-card dark:bg-white"
            >
              <Eye size={20} color="white" />
              <Text className="text-lg font-bold text-white dark:text-slate-900">Show Answer</Text>
            </Pressable>
            <View className="flex-row items-center justify-between px-1">
              <Pressable
                onPress={() => setAttempt((a) => a + 1)}
                accessibilityLabel="Restart writing attempt"
                className="flex-row items-center gap-1.5"
              >
                <RotateCw size={16} color="#64748b" />
                <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">Reset</Text>
              </Pressable>
              {!hintShown && direction === 'production' && (
                <Pressable onPress={() => setHintShown(true)} className="flex-row items-center gap-1.5">
                  <Lightbulb size={16} color="#db9f2e" />
                  <Text className="text-sm font-semibold text-amber-600 dark:text-amber-400">Hint</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : (
          <View className="flex-row gap-2">
            {GRADE_BUTTONS.map(({ grade, label, className }) => (
              <Pressable key={grade} onPress={() => handleGrade(grade)} className={`flex-1 items-center gap-1 rounded-2xl py-3 shadow-card ${className}`}>
                {grade === 'easy' && <Check size={16} color="white" />}
                <Text className="text-sm font-bold text-white">{label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

function ReviewHeader({
  onClose,
  step,
  total,
  progress,
  tint = 'brand',
}: {
  onClose: () => void
  step: number
  total: number
  progress: number
  tint?: 'brand' | 'amber'
}) {
  const pct = Math.min(100, Math.max(0, progress * 100))
  return (
    <View className="px-4 pt-4">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={onClose} accessibilityLabel="Close review" className="rounded-full bg-white p-2 shadow-card dark:bg-slate-900">
          <X size={20} color="#64748b" />
        </Pressable>
        <View className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <View className={`h-full rounded-full ${tint === 'amber' ? 'bg-amber-500' : 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
        </View>
        <Text className="w-12 text-right text-xs font-semibold text-slate-400">
          {step} / {total}
        </Text>
      </View>
    </View>
  )
}
