import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { X, Timer } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { dueCardsFor, listeningCardsFor, mistakeCardsFor } from '../lib/selectors'
import { displayWord } from '../lib/hanzi'
import { HanziStage } from '../components/HanziStage'
import { Celebration } from '../components/Celebration'
import { ReviewFlashcard, directionFor } from '../components/ReviewFlashcard'
import { ReviewListening } from '../components/ReviewListening'
import { playPositiveChime, playRetryTone } from '../lib/sound'
import { celebrateHaptic } from '../lib/haptics'
import type { Grade, SrsCard, VocabWord } from '../types'

/** How the session was launched — decides which pool it draws on and which phases it runs. */
export type ReviewMode = 'flashcards' | 'listening' | 'mistakes' | 'full' | 'quick'

const QUICK_SESSION_SECONDS = 5 * 60

const MODE_TITLES: Record<ReviewMode, string> = {
  flashcards: 'Flashcards',
  listening: 'Listening',
  mistakes: 'Mistakes',
  full: 'Review Session',
  quick: 'Quick Review',
}

/** One thing to do, in order. Listening steps carry their own options so the distractors stay stable across re-renders. */
type Step =
  | { kind: 'flashcards'; wordId: string }
  | { kind: 'listening'; wordId: string; optionIds: string[] }

interface PracticeState {
  wordId: string
  remaining: number
  total: number
}

/**
 * Leaves the session for the Review hub. Goes back rather than pushing, so
 * closing and reopening drills doesn't stack duplicate hub entries behind you —
 * with a push fallback for the case where the session was deep-linked into
 * directly and there's no history to pop.
 */
function closeSession() {
  if (router.canGoBack()) router.back()
  else router.replace('/review')
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Three wrong answers for a listening question. Drawn from the rest of the
 * learner's own deck first — words they're studying make far better distractors
 * than random dictionary entries — and topped up from the word bank at a similar
 * HSK level only if the deck is too small.
 */
function distractorsFor(answer: VocabWord, deckWords: VocabWord[], wordBank: VocabWord[]): VocabWord[] {
  const pool = deckWords.filter((w) => w.id !== answer.id)
  const picked = shuffle(pool).slice(0, 3)
  if (picked.length === 3) return picked

  const takenIds = new Set([answer.id, ...picked.map((w) => w.id)])
  const filler = shuffle(wordBank.filter((w) => !takenIds.has(w.id) && Math.abs(w.hskLevel - answer.hskLevel) <= 1))
  return [...picked, ...filler.slice(0, 3 - picked.length)]
}

export function ReviewSession() {
  const { deck, wordBank, settings, getWord, gradeCard, completePracticeRep, streak } = useApp()
  const params = useLocalSearchParams<{ mode?: string }>()
  const mode: ReviewMode = (['flashcards', 'listening', 'mistakes', 'full', 'quick'] as const).includes(
    params.mode as ReviewMode,
  )
    ? (params.mode as ReviewMode)
    : 'flashcards'

  // The plan is fixed at mount: grading a card mutates the deck, so recomputing
  // the queue from it mid-session would reshuffle the ground under the learner.
  const [steps] = useState<Step[]>(() => {
    const deckWords = deck.map((c) => getWord(c.wordId)).filter((w): w is VocabWord => !!w)
    const toIds = (cards: SrsCard[]) => cards.map((c) => c.wordId).filter((id) => !!getWord(id))

    const flashcardIds =
      mode === 'mistakes' ? toIds(mistakeCardsFor(deck)) : mode === 'listening' ? [] : toIds(dueCardsFor(deck, settings))
    const listeningIds =
      mode === 'listening' || mode === 'full' || mode === 'quick' ? toIds(listeningCardsFor(deck, settings)) : []

    const flashcardSteps: Step[] = flashcardIds.map((wordId) => ({ kind: 'flashcards', wordId }))
    const listeningSteps: Step[] = listeningIds.flatMap((wordId) => {
      const answer = getWord(wordId)
      if (!answer) return []
      const options = distractorsFor(answer, deckWords, wordBank)
      // Fewer than three distractors means no real multiple choice — skip rather
      // than show a question the learner can answer by elimination.
      if (options.length < 3) return []
      return [{ kind: 'listening', wordId, optionIds: shuffle([answer, ...options]).map((w) => w.id) }]
    })

    return [...flashcardSteps, ...listeningSteps]
  })

  const [index, setIndex] = useState(0)
  const [practice, setPractice] = useState<PracticeState | null>(null)
  const [stats, setStats] = useState({ reviewed: 0, correct: 0 })
  const [finished, setFinished] = useState(steps.length === 0)
  const [celebrateKey, setCelebrateKey] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(mode === 'quick' ? QUICK_SESSION_SECONDS : null)

  // Quick review is time-boxed: it ends when the clock does, wherever the learner is.
  useEffect(() => {
    if (mode !== 'quick' || finished) return
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null) return prev
        if (prev <= 1) {
          setFinished(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [mode, finished])

  const total = steps.length
  const step = steps[index]
  const word = step ? getWord(step.wordId) : undefined

  const advance = () => {
    if (index + 1 >= total) setFinished(true)
    else setIndex((i) => i + 1)
  }

  const handleGrade = (grade: Grade) => {
    if (!step) return
    gradeCard(step.wordId, grade)
    setStats((s) => ({ reviewed: s.reviewed + 1, correct: s.correct + (grade === 'again' ? 0 : 1) }))

    if (grade === 'easy' || grade === 'good') {
      playPositiveChime()
      celebrateHaptic()
      setCelebrateKey((k) => k + 1)
    } else {
      playRetryTone()
    }

    if (grade === 'again') {
      setPractice({ wordId: step.wordId, remaining: settings.wrongAnswerReps, total: settings.wrongAnswerReps })
    } else {
      advance()
    }
  }

  const handleListeningAnswer = (correct: boolean) => {
    if (!step) return
    // A listening miss reschedules the card but doesn't detour into the writing
    // drill the way an "Again" on a flashcard does — wrong ear, not wrong hand.
    gradeCard(step.wordId, correct ? 'good' : 'again')
    setStats((s) => ({ reviewed: s.reviewed + 1, correct: s.correct + (correct ? 1 : 0) }))
    if (correct) setCelebrateKey((k) => k + 1)
    advance()
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
    const ranOutOfTime = mode === 'quick' && secondsLeft === 0 && index < total - 1
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-6 bg-slate-50 px-6 dark:bg-slate-950">
        <Celebration trigger={celebrateKey} />
        <Text className="text-6xl">{stats.reviewed === 0 ? '\u{1F4ED}' : accuracy >= 80 ? '\u{1F389}' : '\u{1F44D}'}</Text>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">
          {stats.reviewed === 0 ? 'Nothing to review' : ranOutOfTime ? "Time's up!" : 'Session complete!'}
        </Text>
        <Text className="text-center text-slate-500 dark:text-slate-400">
          {stats.reviewed === 0
            ? mode === 'mistakes'
              ? "No repeated mistakes to drill — nothing you've missed twice."
              : mode === 'listening'
                ? 'No studied words are due for listening practice right now.'
                : "You're all caught up. Check back later or add new words."
            : `You reviewed ${stats.reviewed} card${stats.reviewed === 1 ? '' : 's'}.`}
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

        <Pressable onPress={() => closeSession()} className="mt-2 w-full max-w-xs items-center rounded-2xl bg-brand-500 px-6 py-4 shadow-card">
          <Text className="text-lg font-bold text-white">Back to Review</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  if (!word || !step) return null

  if (practice) {
    const doneCount = practice.total - practice.remaining + 1
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
        <SessionHeader
          onClose={() => closeSession()}
          step={doneCount}
          total={practice.total}
          progress={doneCount / practice.total}
          tint="amber"
          unit="rep"
        />
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
      <SessionHeader
        onClose={() => closeSession()}
        step={index + 1}
        total={total}
        progress={(index + 1) / total}
        label={mode === 'full' || mode === 'quick' ? (step.kind === 'listening' ? 'Listening' : 'Flashcards') : MODE_TITLES[mode]}
        secondsLeft={secondsLeft}
      />

      {step.kind === 'flashcards' ? (
        <ReviewFlashcard
          key={step.wordId}
          word={word}
          direction={directionFor(step.wordId, settings.reviewDirection)}
          onGrade={handleGrade}
        />
      ) : (
        <ReviewListening
          key={step.wordId}
          word={word}
          options={step.optionIds.map((id) => getWord(id)).filter((w): w is VocabWord => !!w)}
          onAnswer={handleListeningAnswer}
        />
      )}
    </SafeAreaView>
  )
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function SessionHeader({
  onClose,
  step,
  total,
  progress,
  tint = 'brand',
  unit = 'card',
  label,
  secondsLeft,
}: {
  onClose: () => void
  step: number
  total: number
  progress: number
  tint?: 'brand' | 'amber'
  unit?: 'card' | 'rep'
  label?: string
  secondsLeft?: number | null
}) {
  const pct = Math.min(100, Math.max(0, progress * 100))
  // `step` is the card being worked on, not one already finished, so what's
  // still ahead after this one is total - step.
  const left = Math.max(0, total - step)
  return (
    <View className="px-4 pt-4">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={onClose} accessibilityLabel="Close review" className="rounded-full bg-white p-2 shadow-card dark:bg-slate-900">
          <X size={20} color="#64748b" />
        </Pressable>
        <View className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <View className={`h-full rounded-full ${tint === 'amber' ? 'bg-amber-500' : 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
        </View>
        <View
          className="flex-row items-baseline justify-end"
          accessibilityLabel={`${unit === 'rep' ? 'Rep' : 'Card'} ${step} of ${total}`}
        >
          <Text className={`text-[18px] font-extrabold ${tint === 'amber' ? 'text-amber-600' : 'text-brand-600'}`}>{step}</Text>
          <Text className="text-[13px] font-bold text-slate-400"> / {total}</Text>
        </View>
      </View>
      <View className="mt-1 flex-row items-center justify-between">
        {label ? <Text className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{label}</Text> : <View />}
        <View className="flex-row items-center gap-2">
          {secondsLeft != null && (
            <View className="flex-row items-center gap-1">
              <Timer size={12} color={secondsLeft <= 30 ? '#f04747' : '#94a3b8'} />
              <Text className={`text-[11px] font-extrabold ${secondsLeft <= 30 ? 'text-coral-600' : 'text-slate-400'}`}>
                {formatClock(secondsLeft)}
              </Text>
            </View>
          )}
          <Text className="text-[11px] font-semibold text-slate-400">
            {left === 0 ? `last ${unit}` : `${left} ${unit}${left === 1 ? '' : 's'} left`}
          </Text>
        </View>
      </View>
    </View>
  )
}
