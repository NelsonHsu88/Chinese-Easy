import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Image, ScrollView, Pressable, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { Check, ChevronLeft, X } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { Reveal } from '../components/dashboard/entrance'
import { basicsColors as c, basicsSpacing as sp, basicsType as t, BASICS_CONTENT_MAX, BASICS_GUTTER } from '../components/basics/tokens'
import { BasicsButton, BasicsPill, BasicsProgressBar, BasicsRaised } from '../components/basics/parts'
import { PressableScale } from '../components/dashboard/parts'
import { AnswerSheet } from '../components/drills/parts'
import { QuestionContent, QuestionMotionProvider, useQuestionTransition } from '../components/motion/questionMotion'
import { Card, LessonTintContext, makeCtx, type Gate } from '../components/basics/lessonParts'
import { initialGate, StepView } from '../components/basics/steps'
import { AudioNotice, stopAudio, useStopAudioOnUnmount } from '../components/basics/audio'
import {
  groupById,
  lessonAfter,
  lessonById,
  lessonKey,
  objectivesFor,
  resumeStep,
  localizedSteps,
} from '../lib/basics'
import { lessonScore, suggestPractice } from '../lib/basicsEngine'
import { XP_PER_LESSON } from '../lib/townEconomy'
import { tickHaptic } from '../lib/haptics'
import { playPositiveChime, playTapSound } from '../lib/sound'
import type { BasicsCtx } from '../components/basics/lessonParts'
import type { BasicsLesson } from '../data/basics'

/*
 * The Chinese Basics lesson player: one step on screen at a time, a progress
 * bar, and one bottom button whose label and action the current step decides
 * (Continue, Check, Try again, Skip for now, Finish lesson). Content is
 * `data/basics/`; each step kind draws itself (`components/basics/steps/`).
 *
 * ── Progress ────────────────────────────────────────────────────────────────
 * The step is saved as the learner moves, so leaving and coming back reopens
 * the lesson where it was. Finishing records the checks' first-try results
 * and — the first time — completes the lesson and awards `XP_PER_LESSON`.
 * Nothing locks: the step-back arrow revisits, and every lesson can be
 * replayed.
 *
 * A question answered right raises the app's correct-answer sheet (the step's
 * explanation and Continue) — the same one New Words and the drills use — and
 * its Continue moves the lesson on. Steps change with the app's question
 * transition: the step drifts left and fades, the next rises into place.
 */

export function ChineseBasicsLesson() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>()
  const lesson = lessonById(lessonId ?? '')
  if (!lesson) return <Redirect href="/basics" />
  return <LessonPlayer key={lesson.id} lesson={lesson} />
}

function LessonPlayer({ lesson }: { lesson: BasicsLesson }) {
  const { settings, completedLessonIds, basicsProgress, saveBasicsStep, finishBasicsLesson } = useApp()
  const { width: windowWidth } = useWindowDimensions()
  const column = Math.min(windowWidth, BASICS_CONTENT_MAX)
  const phonetic = settings.phoneticScript
  const key = lessonKey(lesson, phonetic)
  const steps = useMemo(() => localizedSteps(lesson, settings.script, phonetic), [lesson, settings.script, phonetic])

  const [both, setBoth] = useState(false)
  const ctx: BasicsCtx = useMemo(() => makeCtx(settings.script, phonetic, both), [settings.script, phonetic, both])

  const [index, setIndex] = useState(() => resumeStep(basicsProgress, key, steps.length))
  const [gate, setGateState] = useState<Gate>(() => initialGate(steps[index]))
  const [finished, setFinished] = useState<{ firstTime: boolean; score: { correct: number; total: number } } | null>(null)
  /** First-try results of this run's checks, by step index. */
  const graded = useRef<Record<number, boolean>>({})
  const indexRef = useRef(index)
  indexRef.current = index

  useStopAudioOnUnmount()

  /* Remember where the learner is. */
  useEffect(() => {
    if (!finished) saveBasicsStep(key, index)
  }, [key, index, finished, saveBasicsStep])

  const setGate = useCallback((g: Gate) => setGateState(g), [])
  const onGraded = useCallback((right: boolean) => {
    const at = indexRef.current
    if (!(at in graded.current)) graded.current[at] = right
  }, [])

  const goTo = (next: number) => {
    stopAudio()
    setIndex(next)
    setGateState(initialGate(steps[next]))
  }

  /* Between steps: only the step itself moves (see `QuestionContent` below). */
  const questionMotion = useQuestionTransition()
  const moveTo = (next: number) => {
    stopAudio()
    questionMotion.advance(() => goTo(next))
  }

  const leave = () => {
    stopAudio()
    if (router.canGoBack()) router.back()
    else router.replace({ pathname: '/basics/[group]', params: { group: lesson.group } })
  }

  const isLast = index === steps.length - 1

  const primary = () => {
    // The step on screen is leaving; it mustn't take a second press.
    if (questionMotion.busy.current) return
    if (gate.onPress) {
      gate.onPress()
      return
    }
    playTapSound()
    if (!isLast) {
      moveTo(index + 1)
      return
    }
    stopAudio()
    const score = lessonScore(Object.values(graded.current))
    const firstTime = finishBasicsLesson(key, score)
    playPositiveChime()
    setFinished({ firstTime, score })
  }

  const restart = () => {
    graded.current = {}
    setFinished(null)
    goTo(0)
  }

  /* No group hue inside a lesson, by request: cards, rows and the progress bar
     stay white and jade, so the colour that's left is the feedback. */
  const tint = null

  if (finished) {
    const next = lessonAfter(lesson.id, [...completedLessonIds, key], phonetic)
    return (
      <LessonTintContext.Provider value={tint}>
      <SafeAreaView edges={['top', 'bottom']} className="flex-1" style={{ backgroundColor: c.background }}>
        <FinishCard
          column={column}
          lesson={lesson}
          ctx={ctx}
          xp={finished.firstTime ? XP_PER_LESSON : 0}
          score={finished.score}
          next={next}
          onNext={() => next && router.replace({ pathname: '/basics/lesson/[lessonId]', params: { lessonId: next.id } })}
          onAgain={restart}
          onDone={leave}
        />
      </SafeAreaView>
      </LessonTintContext.Provider>
    )
  }

  const step = steps[index]
  const label = !gate.onPress && isLast && gate.label === 'Continue' ? 'Finish lesson' : gate.label

  return (
    <LessonTintContext.Provider value={tint}>
    <QuestionMotionProvider motion={questionMotion.motion}>
    <SafeAreaView edges={['top', 'bottom']} className="flex-1" style={{ backgroundColor: c.background }}>
      {/* The Basics foot painting, out of flow behind everything, so a short
          step sits over scenery rather than an empty page. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Image source={LESSON_FOOT} resizeMode="contain" style={{ width: column, height: column / LESSON_FOOT_RATIO }} />
      </View>
      <View style={{ flex: 1, width: column, alignSelf: 'center', paddingHorizontal: BASICS_GUTTER }}>
        {/* Close, title, reading toggle. */}
        <View style={{ height: 50, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={leave} accessibilityRole="button" accessibilityLabel="Close lesson" hitSlop={12}>
            <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 }}>
              <X size={24} color={c.slate} strokeWidth={2.2} />
            </View>
          </Pressable>
          <Text
            className="font-nunito-extrabold"
            numberOfLines={1}
            accessibilityRole="header"
            style={{ ...t.headerTitle, flex: 1, color: c.navy, textAlign: 'center' }}
          >
            {ctx.text(lesson.title)}
          </Text>
          <PressableScale
            onPress={() => {
              tickHaptic()
              setBoth((b) => !b)
            }}
            scaleTo={1}
            haptic={false}
            // Padding on the wrapper widens the tap area to about 44pt without moving the pill.
            wrapperStyle={{ paddingVertical: sp.sm }}
            accessibilityLabel={`Show both pinyin and zhuyin, ${both ? 'on' : 'off'}`}
          >
            <BasicsRaised
              fill={both ? c.sageSoft : c.card}
              shoulder={both ? c.shoulder.sage : c.shoulder.quiet}
              border={both ? c.sage : c.border}
              borderWidth={1}
              radius={999}
              style={{ paddingHorizontal: 10, paddingVertical: 6 }}
            >
              <Text className="font-nunito-bold" style={{ ...t.pill, color: both ? c.sageDark : c.slate }}>
                Show both
              </Text>
            </BasicsRaised>
          </PressableScale>
        </View>

        {/* Step back, progress. */}
        <View style={{ height: 36, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable
            onPress={index > 0 ? () => moveTo(index - 1) : undefined}
            accessibilityRole="button"
            accessibilityLabel="Previous step"
            accessibilityState={{ disabled: index === 0 }}
            hitSlop={10}
          >
            <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', opacity: index === 0 ? 0.3 : 1 }}>
              <ChevronLeft size={22} color={c.jadeDark} strokeWidth={2.2} />
            </View>
          </Pressable>
          <BasicsProgressBar done={index + 1} total={steps.length} />
          <Text
            className="font-nunito-semibold"
            accessibilityLabel={`Step ${index + 1} of ${steps.length}`}
            style={{ ...t.meta, color: c.slate, minWidth: 40, textAlign: 'right' }}
          >
            {index + 1} / {steps.length}
          </Text>
        </View>

        <QuestionContent key={index} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: sp.md, paddingBottom: gate.correct !== undefined ? SHEET_ROOM : sp.xxl }}
          showsVerticalScrollIndicator={false}
        >
          {/* Which group this lesson belongs to, in the group's hue. */}
          <View
            style={{
              alignSelf: 'flex-start',
              marginBottom: sp.md,
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 999,
              backgroundColor: c.card,
              borderWidth: 1,
              borderColor: c.border,
            }}
          >
            <Text className="font-nunito-bold" style={{ ...t.pill, color: c.slate }}>
              {groupById(lesson.group)?.title ?? 'Chinese Basics'}
            </Text>
          </View>
          <StepView
            step={step}
            ctx={ctx}
            column={column}
            stepId={`${lesson.id}-${index}`}
            setGate={setGate}
            onGraded={onGraded}
          />
          <AudioNotice />
        </ScrollView>
        </QuestionContent>

        {/* The one action, always in the same place — held invisible under the
            answer sheet, so nothing shifts while it is up. */}
        <View
          style={{ paddingTop: sp.sm, paddingBottom: sp.md, opacity: gate.correct !== undefined ? 0 : 1 }}
          pointerEvents={gate.correct !== undefined ? 'none' : 'auto'}
          importantForAccessibility={gate.correct !== undefined ? 'no-hide-descendants' : 'auto'}
        >
          <BasicsButton
            label={label}
            onPress={primary}
            solid
            disabled={!gate.enabled}
            chevron={label === 'Continue'}
            stretch
          />
        </View>
      </View>

      {gate.correct !== undefined && (
        <AnswerSheet
          key={index}
          kind="correct"
          detail={
            gate.correct ? (
              <Text className="font-nunito-semibold" style={{ ...t.bodySmall, width: '100%', color: c.navy }}>
                {gate.correct}
              </Text>
            ) : undefined
          }
          continueLabel={isLast ? 'Finish lesson' : 'Continue'}
          onContinue={primary}
        />
      )}
    </SafeAreaView>
    </QuestionMotionProvider>
    </LessonTintContext.Provider>
  )
}

/** The Basics foot painting (941×98), shared with Chinese Basics' own screen. */
const LESSON_FOOT = require('../assets/images/basics/foot.png')
const LESSON_FOOT_RATIO = 941 / 98

/** Room under a step's content for the answer sheet, so the step can scroll clear of it. */
const SHEET_ROOM = 240

/* ── Finish ────────────────────────────────────────────────────────────── */

const SHIFU = require('../assets/images/basics/continue.png')
const SHIFU_RATIO = 466 / 455

function FinishCard({
  column,
  lesson,
  ctx,
  xp,
  score,
  next,
  onNext,
  onAgain,
  onDone,
}: {
  column: number
  lesson: BasicsLesson
  ctx: BasicsCtx
  xp: number
  score: { correct: number; total: number }
  next: BasicsLesson | null
  onNext: () => void
  onAgain: () => void
  onDone: () => void
}) {
  const artWidth = Math.min(column - 140, 200)
  const group = groupById(lesson.group)
  const objectives = objectivesFor(lesson, ctx.phonetic)
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: sp.xl }}>
      <View style={{ width: column, paddingHorizontal: BASICS_GUTTER }}>
        <Reveal from="bottom" at={0} duration={420} run={0} distance={22}>
          <Card style={{ alignItems: 'center', paddingTop: 0, paddingBottom: sp.xxl, overflow: 'hidden' }}>
            <Image source={SHIFU} resizeMode="contain" style={{ width: artWidth, height: artWidth / SHIFU_RATIO }} />
            <Text className="font-nunito-bold" style={{ ...t.eyebrow, marginTop: sp.xs, color: c.slate }}>
              LESSON COMPLETE
            </Text>
            <Text
              className="font-nunito-extrabold"
              accessibilityRole="header"
              style={{ ...t.stepTitle, marginTop: 6, color: c.navy, textAlign: 'center' }}
            >
              {ctx.text(lesson.title)}
            </Text>
            <View style={{ marginTop: sp.md, flexDirection: 'row', gap: sp.sm }}>
              <BasicsPill label={xp > 0 ? `+${xp} XP` : 'Practised again'} tone={xp > 0 ? 'coral' : 'sage'} />
              {score.total > 0 && <BasicsPill label={`${score.correct} / ${score.total} first try`} tone="quiet" />}
            </View>

            <View style={{ alignSelf: 'stretch', marginTop: sp.xl, gap: sp.md }}>
              <Text className="font-nunito-bold" style={{ ...t.eyebrow, color: c.sageDark }}>
                YOU CAN NOW
              </Text>
              {objectives.map((o, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: sp.md, alignItems: 'flex-start' }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, marginTop: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.sageSoft }}>
                    <Check size={13} color={c.sageDark} strokeWidth={2.8} />
                  </View>
                  <Text className="font-nunito-semibold" style={{ ...t.bodySmall, flex: 1, color: c.navy }}>
                    {ctx.text(o)}
                  </Text>
                </View>
              ))}
            </View>
            {suggestPractice(score) && (
              <Text className="font-nunito-semibold" style={{ ...t.bodySmall, marginTop: sp.lg, color: c.slate, textAlign: 'center' }}>
                A few of these were new to your ear. Running the lesson again usually helps them stick.
              </Text>
            )}
          </Card>
          <View style={{ marginTop: sp.xl, gap: sp.md }}>
            {next && <BasicsButton label={`Next: ${ctx.text(next.title)}`} onPress={onNext} solid stretch />}
            <BasicsButton label="Practice again" onPress={onAgain} chevron={false} stretch />
            <BasicsButton label={`Back to ${group?.title ?? 'Chinese Basics'}`} onPress={onDone} chevron={false} stretch />
          </View>
        </Reveal>
      </View>
    </ScrollView>
  )
}
