import { useEffect, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { X } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { lessonById } from '../data/lessons'
import { speak } from '../lib/speech'
import { playPositiveChime, playRetryTone, playFanfare } from '../lib/sound'
import { celebrateHaptic, thunkHaptic } from '../lib/haptics'
import { Celebration } from '../components/Celebration'
import { SpeakButton } from '../components/SpeakButton'
import { XP_PER_LESSON } from '../lib/townEconomy'
import type { FillBlankExercise, MatchExercise, ScrambleExercise } from '../types'

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function MatchExerciseView({ exercise, onComplete }: { exercise: MatchExercise; onComplete: () => void }) {
  const [hanziTiles] = useState(() => shuffle(exercise.pairs.map((p, i) => ({ pairIndex: i, text: p.hanzi }))))
  const [englishTiles] = useState(() => shuffle(exercise.pairs.map((p, i) => ({ pairIndex: i, text: p.english }))))
  const [matched, setMatched] = useState<number[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [shake, setShake] = useState<number | null>(null)

  useEffect(() => {
    if (matched.length === exercise.pairs.length) {
      const t = setTimeout(onComplete, 450)
      return () => clearTimeout(t)
    }
  }, [matched, exercise.pairs.length, onComplete])

  const pickEnglish = (pairIndex: number) => {
    if (matched.includes(pairIndex) || selected === null) return
    if (selected === pairIndex) {
      playPositiveChime()
      // One pair of several, not the end of the exercise — the weight of
      // something landing, rather than the two-beat celebration that belongs to
      // finishing the whole thing.
      thunkHaptic()
      setMatched((m) => [...m, pairIndex])
      setSelected(null)
    } else {
      playRetryTone()
      setShake(pairIndex)
      setTimeout(() => setShake(null), 300)
      setSelected(null)
    }
  }

  return (
    <View className="flex-1 gap-4">
      <Text className="text-center text-base font-semibold text-slate-700 dark:text-slate-200">{exercise.prompt}</Text>
      <View className="flex-row gap-3">
        <View className="flex-1 gap-2">
          {hanziTiles.map((t) => (
            <Pressable
              key={t.pairIndex}
              disabled={matched.includes(t.pairIndex)}
              onPress={() => setSelected(t.pairIndex)}
              className={`items-center rounded-xl border-2 py-3 ${
                matched.includes(t.pairIndex)
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : selected === t.pairIndex
                    ? 'border-brand-500 bg-white dark:bg-slate-900'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
              }`}
            >
              <Text className="font-hanzi text-xl font-bold text-slate-900 dark:text-white">{t.text}</Text>
            </Pressable>
          ))}
        </View>
        <View className="flex-1 gap-2">
          {englishTiles.map((t) => (
            <Pressable
              key={t.pairIndex}
              disabled={matched.includes(t.pairIndex)}
              onPress={() => pickEnglish(t.pairIndex)}
              className={`items-center justify-center rounded-xl border-2 px-2 py-3 ${
                matched.includes(t.pairIndex)
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : shake === t.pairIndex
                    ? 'border-coral-500 bg-coral-50 dark:bg-coral-900/20'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
              }`}
            >
              <Text className="text-center text-xs font-semibold text-slate-700 dark:text-slate-200">{t.text}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  )
}

function ScrambleExerciseView({ exercise, onComplete }: { exercise: ScrambleExercise; onComplete: () => void }) {
  const [bank, setBank] = useState(() => shuffle(exercise.tokens.map((t, i) => ({ id: i, text: t }))))
  const [built, setBuilt] = useState<{ id: number; text: string }[]>([])
  const [checked, setChecked] = useState<'correct' | 'wrong' | null>(null)

  useEffect(() => {
    speak(exercise.chinese)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const moveToBuilt = (tile: { id: number; text: string }) => {
    if (checked === 'correct') return
    setBank((b) => b.filter((t) => t.id !== tile.id))
    setBuilt((b) => [...b, tile])
    setChecked(null)
  }
  const moveToBank = (tile: { id: number; text: string }) => {
    if (checked === 'correct') return
    setBuilt((b) => b.filter((t) => t.id !== tile.id))
    setBank((b) => [...b, tile])
    setChecked(null)
  }

  const handleCheck = () => {
    const isCorrect = built.map((t) => t.text).join('') === exercise.tokens.join('')
    if (isCorrect) {
      playPositiveChime()
      celebrateHaptic()
      setChecked('correct')
      setTimeout(onComplete, 900)
    } else {
      playRetryTone()
      setChecked('wrong')
    }
  }

  return (
    <View className="flex-1 gap-4">
      <View className="flex-row items-center justify-center gap-2">
        <Text className="text-base font-semibold text-slate-700 dark:text-slate-200">{exercise.instruction}</Text>
        <SpeakButton text={exercise.chinese} size={16} />
      </View>

      <View className="min-h-[64px] flex-row flex-wrap gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-3 dark:border-slate-700">
        {built.map((t) => (
          <Pressable key={t.id} onPress={() => moveToBank(t)} className="rounded-xl bg-brand-100 px-3 py-2 dark:bg-brand-900/40">
            <Text className="font-hanzi text-lg font-bold text-brand-700 dark:text-brand-300">{t.text}</Text>
          </Pressable>
        ))}
      </View>

      {checked === 'wrong' && <Text className="text-center text-sm font-semibold text-coral-500">Not quite — try again</Text>}
      {checked === 'correct' && (
        <View className="items-center gap-0.5">
          <Text className="text-sm text-slate-400">{exercise.pinyin}</Text>
          <Text className="text-sm italic text-slate-400">{exercise.english}</Text>
        </View>
      )}

      <View className="flex-row flex-wrap justify-center gap-2">
        {bank.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => moveToBuilt(t)}
            className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          >
            <Text className="font-hanzi text-lg font-bold text-slate-900 dark:text-white">{t.text}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        disabled={built.length !== exercise.tokens.length || checked === 'correct'}
        onPress={handleCheck}
        className={`mt-auto items-center rounded-2xl py-4 shadow-card ${
          built.length === exercise.tokens.length && checked !== 'correct' ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-800'
        }`}
      >
        <Text className={`text-lg font-bold ${built.length === exercise.tokens.length && checked !== 'correct' ? 'text-white' : 'text-slate-400'}`}>
          Check
        </Text>
      </Pressable>
    </View>
  )
}

function FillBlankExerciseView({ exercise, onComplete }: { exercise: FillBlankExercise; onComplete: () => void }) {
  const [answered, setAnswered] = useState<string | null>(null)
  const [wrongPick, setWrongPick] = useState<string | null>(null)

  const handlePick = (opt: string) => {
    if (answered) return
    if (opt === exercise.answer) {
      playPositiveChime()
      celebrateHaptic()
      setAnswered(opt)
      setTimeout(onComplete, 900)
    } else {
      playRetryTone()
      setWrongPick(opt)
      setTimeout(() => setWrongPick(null), 300)
    }
  }

  return (
    <View className="flex-1 gap-4">
      <View className="gap-3 rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
        {exercise.dialogue.map((d, i) => {
          const hasBlank = d.line.includes('___')
          const [before, after] = hasBlank ? d.line.split('___') : [d.line, '']
          return (
            <View key={i}>
              <Text className="text-xs font-semibold text-slate-400">{d.speaker}</Text>
              <Text className="font-hanzi text-lg text-slate-900 dark:text-white">
                {hasBlank ? (
                  <>
                    {before}
                    <Text className={answered ? 'font-bold text-brand-600 dark:text-brand-400' : 'text-slate-300 dark:text-slate-600'}>
                      {answered ?? '___'}
                    </Text>
                    {after}
                  </>
                ) : (
                  d.line
                )}
              </Text>
            </View>
          )
        })}
      </View>

      {answered && <Text className="text-center text-sm italic text-slate-400">{exercise.english}</Text>}

      <View className="flex-row flex-wrap justify-center gap-2">
        {exercise.options.map((opt) => (
          <Pressable
            key={opt}
            disabled={!!answered}
            onPress={() => handlePick(opt)}
            className={`rounded-xl border-2 px-4 py-3 ${
              answered === opt
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                : wrongPick === opt
                  ? 'border-coral-500 bg-coral-50 dark:bg-coral-900/20'
                  : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
            }`}
          >
            <Text className="font-hanzi text-lg font-bold text-slate-900 dark:text-white">{opt}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

export function LessonPlayer() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>()
  const { completeLesson } = useApp()
  const lesson = lessonById(lessonId)
  const [index, setIndex] = useState(0)
  const [celebrateKey, setCelebrateKey] = useState(0)
  const [done, setDone] = useState(false)

  if (!lesson) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-slate-50 px-6 dark:bg-slate-950">
        <Text className="text-slate-400">Lesson not found.</Text>
      </SafeAreaView>
    )
  }

  const total = lesson.exercises.length
  const exercise = lesson.exercises[index]

  const handleExerciseComplete = () => {
    if (index + 1 >= total) {
      completeLesson(lesson.id)
      celebrateHaptic()
      playFanfare()
      setCelebrateKey((k) => k + 1)
      setDone(true)
    } else {
      setIndex((i) => i + 1)
    }
  }

  if (done) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-6 bg-slate-50 px-6 dark:bg-slate-950">
        <Celebration trigger={celebrateKey} />
        <Text className="text-6xl">{'\u{1F389}'}</Text>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">Lesson complete!</Text>
        <Text className="text-center text-slate-500 dark:text-slate-400">+{XP_PER_LESSON} XP earned</Text>
        <Pressable
          onPress={() => router.replace('/lessons')}
          className="mt-2 w-full max-w-xs items-center rounded-2xl bg-brand-500 px-6 py-4 shadow-card"
        >
          <Text className="text-lg font-bold text-white">Back to Lessons</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-4 pt-4">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Close lesson"
            className="rounded-full bg-white p-2 shadow-card dark:bg-slate-900"
          >
            <X size={20} color="#64748b" />
          </Pressable>
          <View className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <View className="h-full rounded-full bg-brand-500" style={{ width: `${(index / total) * 100}%` }} />
          </View>
        </View>
        <Text className="mt-2 text-center text-xs font-medium text-slate-400">
          {lesson.title} — {index + 1} of {total}
        </Text>
      </View>

      <View className="flex-1 px-4 pb-6 pt-4">
        {exercise.type === 'match' && <MatchExerciseView key={index} exercise={exercise} onComplete={handleExerciseComplete} />}
        {exercise.type === 'scramble' && <ScrambleExerciseView key={index} exercise={exercise} onComplete={handleExerciseComplete} />}
        {exercise.type === 'fill-blank' && <FillBlankExerciseView key={index} exercise={exercise} onComplete={handleExerciseComplete} />}
      </View>
    </SafeAreaView>
  )
}
