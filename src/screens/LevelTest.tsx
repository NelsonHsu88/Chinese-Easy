import { useEffect, useRef, useState } from 'react'
import { View, Text, Image, ScrollView, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, router } from 'expo-router'
import { Heart, Layers, Target, Trophy } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { ReviewListening } from '../components/ReviewListening'
import { ReviewFillGap } from '../components/drills/ReviewFillGap'
import { DrillHeaderExtra } from '../components/drills/parts'
import { ReviewButton } from '../components/review/parts'
import { revColors as c } from '../components/review/tokens'
import { endImages } from '../components/sessionEnd/art'
import { endArt } from '../components/sessionEnd/tokens'
import { LessonCompletionCelebration } from '../components/celebration/LessonCompletionCelebration'
import { QuestionMotionProvider, useQuestionTransition } from '../components/motion/questionMotion'
import { isListeningPaused } from '../lib/mixedDrills'
import { buildLevelTest, levelTestOutcome, nextTestLevel, LEVEL_TEST_MAX_MISTAKES } from '../lib/levelTest'
import { thunkHaptic } from '../lib/haptics'
import type { VocabWord } from '../types'

/*
 * The level-up test (SS1025), opened from Progress: twenty questions on the
 * next HSK level in Mixed Drills' own screens, with three hearts — two
 * mistakes are allowed, the third ends it. Passing moves the learner up a
 * level. Nothing is graded into the SRS deck. Rules live in `lib/levelTest.ts`.
 */

function leave() {
  if (router.canGoBack()) router.back()
  else router.replace('/settings/progress')
}

export function LevelTest() {
  const { settings } = useApp()
  /* Fixed at mount, so passing (which raises the level) doesn't retarget the result screen. */
  const [target] = useState(() => nextTestLevel(settings.hskLevel))
  const [attempt, setAttempt] = useState(0)
  if (target == null) return <Redirect href="/settings/progress" />
  /* A retry is a fresh mount: new words, full hearts. */
  return <LevelTestRun key={attempt} level={target} onRetry={() => setAttempt((a) => a + 1)} />
}

function LevelTestRun({ level, onRetry }: { level: number; onRetry: () => void }) {
  const { settings, wordBank, getWord, updateSettings, listeningPausedUntil } = useApp()
  /* A new random sample each attempt; fixed for the attempt itself. */
  const [steps] = useState(() =>
    buildLevelTest({ wordBank, level, script: settings.script, listening: !isListeningPaused(listeningPausedUntil) }),
  )
  const [index, setIndex] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [result, setResult] = useState<'pass' | 'fail' | null>(null)
  const motion = useQuestionTransition()

  const total = steps.length
  const step = steps[index]

  /* Passing raises the level once. Only ever up, like the app's own level-up. */
  const promoted = useRef(false)
  useEffect(() => {
    if (result !== 'pass' || promoted.current) return
    promoted.current = true
    updateSettings({ hskLevel: Math.max(settings.hskLevel, level) })
  }, [result, level, settings.hskLevel, updateSettings])

  const answer = (correct: boolean) => {
    if (motion.busy.current) return
    const missed = mistakes + (correct ? 0 : 1)
    setMistakes(missed)
    const outcome = levelTestOutcome(missed, index + 1, total)
    motion.advance(() => {
      if (outcome === 'running') setIndex((i) => i + 1)
      else setResult(outcome)
    })
  }

  if (total === 0 || result === 'fail') {
    return (
      <QuestionMotionProvider motion={motion.motion}>
        <LevelTestFailed level={level} answered={index + 1} empty={total === 0} onRetry={onRetry} />
      </QuestionMotionProvider>
    )
  }

  if (result === 'pass') {
    return (
      <LessonCompletionCelebration
        title={`HSK ${level} unlocked!`}
        subtitle={`You passed the HSK ${level} test.`}
        stats={[
          { icon: Trophy, tone: 'xp', value: `HSK ${level}`, label: 'New level' },
          { icon: Target, tone: 'accuracy', value: `${total - mistakes}/${total}`, label: 'Correct' },
          { icon: Layers, tone: 'words', value: String(mistakes), label: mistakes === 1 ? 'Mistake' : 'Mistakes' },
        ]}
        onContinue={leave}
      />
    )
  }

  const word = getWord(step.kind === 'match' ? '' : step.wordId)
  if (!word || step.kind === 'match' || step.kind === 'flashcards') return null
  const options = step.optionIds.map((id) => getWord(id)).filter((w): w is VocabWord => !!w)
  const key = `${step.wordId}-${index}`
  const shared = {
    word,
    options,
    onAnswer: answer,
    /* "I don't know" is an answer here: a test has no queue to send it back to. */
    onSkip: () => answer(false),
    onClose: leave,
    step: index + 1,
    total,
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <QuestionMotionProvider motion={motion.motion}>
        <DrillHeaderExtra.Provider value={<Hearts left={LEVEL_TEST_MAX_MISTAKES + 1 - mistakes} />}>
          {step.kind === 'fillGap' ? <ReviewFillGap key={key} {...shared} /> : <ReviewListening key={key} {...shared} />}
        </DrillHeaderExtra.Provider>
      </QuestionMotionProvider>
    </View>
  )
}

/** Mistakes still allowed, as hearts beside the progress bar. */
function Hearts({ left }: { left: number }) {
  const all = LEVEL_TEST_MAX_MISTAKES + 1
  return (
    <View
      accessible
      accessibilityLabel={`${left} ${left === 1 ? 'heart' : 'hearts'} left`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 2 }}
    >
      {Array.from({ length: all }, (_, i) => {
        const full = i < left
        return <Heart key={i} size={19} color={full ? c.coral : c.neutralTrack} fill={full ? c.coral : c.neutralTrack} strokeWidth={2} />
      })}
    </View>
  )
}

function LevelTestFailed({
  level,
  answered,
  empty,
  onRetry,
}: {
  level: number
  answered: number
  empty: boolean
  onRetry: () => void
}) {
  const { width } = useWindowDimensions()
  const column = Math.min(width, 430)
  const art = column - 48
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }} bounces={false}>
        <View style={{ width: column, flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}>
          <Image
            source={endImages.emptyHero}
            style={{ width: art, height: art / endArt.emptyHero, alignSelf: 'center' }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <Text
            className="font-nunito-extrabold"
            accessibilityRole="header"
            style={{ fontSize: 30, lineHeight: 37, color: c.navy, textAlign: 'center', marginTop: 20 }}
          >
            {empty ? 'Test unavailable' : 'Not quite yet'}
          </Text>
          <Text
            className="font-nunito-semibold"
            style={{ fontSize: 16.5, lineHeight: 24, color: c.slate, textAlign: 'center', marginTop: 10 }}
          >
            {empty
              ? `There aren’t enough HSK ${level} words to build a test right now.`
              : `That was ${LEVEL_TEST_MAX_MISTAKES + 1} mistakes after ${answered} questions. Keep studying, and try the HSK ${level} test again whenever you’re ready — it’s new words every time.`}
          </Text>
          <View style={{ flexGrow: 1, minHeight: 28 }} />
          <View style={{ gap: 14 }}>
            {!empty && (
              <ReviewButton
                label="Try again"
                tone="primary"
                onPress={() => {
                  thunkHaptic()
                  onRetry()
                }}
              />
            )}
            <ReviewButton label="Back to Progress" tone="quiet" onPress={leave} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
