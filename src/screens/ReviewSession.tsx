import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { X, Timer } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { previewReview } from '../lib/srs'
import { dueCardsFor, listeningCardsFor, mistakeCardsFor } from '../lib/selectors'
import { displayWord } from '../lib/hanzi'
import { HanziStage } from '../components/HanziStage'
import { Celebration } from '../components/Celebration'
import { ReviewFlashcard, directionFor } from '../components/ReviewFlashcard'
import { ReviewListening } from '../components/ReviewListening'
import { PronunciationCheck } from '../components/PronunciationCheck'
import { isSpeechRecognitionAvailable } from '../lib/speechRecognition'
import { playPositiveChime, playRetryTone } from '../lib/sound'
import { celebrateHaptic } from '../lib/haptics'
import type { Grade, SrsCard, VocabWord } from '../types'
import { useAds } from '../context/AdsContext'

/**
 * The sliding frame every phase of a session is rendered inside.
 *
 * Module-level rather than defined in the screen: a component declared during
 * render is a new type on every pass, which would unmount and remount the card
 * underneath it — losing the flashcard's revealed state and restarting the
 * stroke writer mid-session.
 *
 * The page colour sits on the outer, unmoving view so that nothing shows through
 * behind the screen while it's off to one side.
 */
function SessionStage({ style, children }: { style: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Animated.View style={[{ flex: 1 }, style]}>{children}</Animated.View>
    </View>
  )
}

/** How the session was launched — decides which pool it draws on and which phases it runs. */
export type ReviewMode = 'flashcards' | 'listening' | 'mistakes' | 'full' | 'quick'

const QUICK_SESSION_SECONDS = 5 * 60

/*
 * Leaving the speaking check.
 *
 * The card you just spoke slides off to the left and the next one comes in from
 * the right, so finishing a word reads as moving forward through a session
 * rather than the screen being replaced under you. Transform and opacity only,
 * so it can run on the native driver.
 */
const SLIDE_OUT_MS = 240
const SLIDE_IN_MS = 280
/** Grace before the backstop in `slideForward` force-finishes a stalled slide. */
const SLIDE_BACKSTOP_MS = 120
const USE_NATIVE_DRIVER = Platform.OS !== 'web'

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
  const [steps, setSteps] = useState<Step[]>(() => {
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
  /** Word waiting on a spoken answer before the session moves on, if any. */
  const [speaking, setSpeaking] = useState<string | null>(null)
  const [stats, setStats] = useState({ reviewed: 0, correct: 0 })
  const [finished, setFinished] = useState(steps.length === 0)
  const [celebrateKey, setCelebrateKey] = useState(0)

  /*
   * The one ad hook this screen has, and it is on the way *out* of the session
   * rather than anywhere inside it — no drill, card, or writing step can ever
   * be interrupted. See `finishSession` at the summary below.
   */
  const { noteNaturalBreak } = useAds()
  /**
   * Stops a second press while an interstitial is resolving. Without it an
   * impatient double-tap either fires the break twice or navigates out from
   * under an advert that is mid-present.
   */
  const leavingRef = useRef(false)
  const [secondsLeft, setSecondsLeft] = useState(mode === 'quick' ? QUICK_SESSION_SECONDS : null)

  /*
   * Whether to gate cards behind saying the word out loud. Read once at mount:
   * it can't change while the session runs, and a step that appeared halfway
   * through would be a rule change mid-drill. On a device with no recogniser
   * the step is skipped entirely rather than shown as a dead end.
   */
  const [speakingEnabled] = useState(isSpeechRecognitionAvailable)

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
  /* Identity of the card on screen. Index as well as word id, exactly like the
     mount key below: "I don't know" re-queues a word later in the same session,
     and keyed on the id alone the second showing would reuse the first's state. */
  const stepKey = step ? `${step.wordId}-${index}` : ''

  /*
   * The four scheduling outcomes for the card on screen.
   *
   * Computed once per card — from one `previewReview` call, against one instant
   * — and handed both to the flashcard for its button labels and back to
   * `gradeCard` on commit. FSRS seeds its interval fuzz from the review instant,
   * so working it out a second time when the button is pressed would quietly
   * disagree with what the learner was shown.
   */
  const preview = useMemo(() => {
    if (!step || step.kind !== 'flashcards') return null
    const card = deck.find((c) => c.wordId === step.wordId)
    return card ? previewReview(card, settings.wrongAnswerReps) : null
    // Keyed on the step rather than on `deck`: re-previewing because some other
    // card in the deck changed would re-roll the fuzz under the learner's hand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, settings.wrongAnswerReps])

  /*
   * When the current card appeared, for the response timer.
   *
   * A ref, not state: it is read once when a grade lands and must never cause a
   * render of its own. Analytics only — the explicit grade is what schedules the
   * card, and a slow "Good" is still a Good.
   */
  const shownAt = useRef(Date.now())
  useEffect(() => {
    shownAt.current = Date.now()
  }, [stepKey])

  const { width: screenWidth } = useWindowDimensions()
  /** -1 fully off to the left, 0 settled, 1 waiting off to the right. */
  const slide = useRef(new Animated.Value(0)).current

  const stageStyle = {
    transform: [
      {
        translateX: slide.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-screenWidth, 0, screenWidth],
        }),
      },
    ],
    // Fades out towards the edges so the two screens don't read as one long
    // filmstrip being dragged past.
    opacity: slide.interpolate({ inputRange: [-1, -0.6, 0, 0.6, 1], outputRange: [0, 0.5, 1, 0.5, 0] }),
  }

  const advance = () => {
    if (index + 1 >= total) setFinished(true)
    else setIndex((i) => i + 1)
  }

  /**
   * Finishes a written card by asking for it out loud, then advances.
   *
   * Reading and writing a character is not the same as being able to say it, so
   * the speaking step sits between the two — after the learner has committed to
   * an answer, before the next card. It never blocks the session: the check
   * screen carries its own way past.
   */
  const advanceThroughSpeaking = (wordId: string) => {
    if (speakingEnabled && getWord(wordId)) setSpeaking(wordId)
    else advance()
  }

  /*
   * Runs `commit` between the two halves of a horizontal slide: out to the left
   * with the old screen, then in from the right with whatever `commit` put
   * there. Committing at the turn means the incoming screen is never rendered
   * until it's off-stage, so the swap itself is invisible.
   */
  const slideForward = useCallback(
    (commit: () => void) => {
      /*
       * `commit` runs on a backstop as well as on the animation's callback, and
       * it is load-bearing rather than defensive.
       *
       * Without the native driver this runs on requestAnimationFrame, which a
       * browser stops dead for a background tab — and the *entire session
       * advance* lives inside the completion callback. With rAF stalled the
       * callback never fires, so the session simply stops: the card stays put,
       * the button appears dead, and nothing recovers it. Whichever of the two
       * arrives first commits and the other finds it already done.
       */
      let committed = false

      const settle = (finished: boolean) => {
        if (committed) return
        committed = true
        commit()
        // Jumped, not animated: this is the incoming screen's starting position,
        // off the right edge, and animating to it would slide the wrong way.
        slide.setValue(finished ? 1 : 0)
        Animated.timing(slide, {
          toValue: 0,
          duration: SLIDE_IN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }).start()
        // The arrival needs its own backstop, or a stalled tab leaves the
        // incoming card parked off the right edge instead of on screen.
        setTimeout(() => slide.setValue(0), SLIDE_IN_MS + SLIDE_BACKSTOP_MS)
      }

      Animated.timing(slide, {
        toValue: -1,
        duration: SLIDE_OUT_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start(({ finished }) => settle(finished))

      setTimeout(() => settle(false), SLIDE_OUT_MS + SLIDE_BACKSTOP_MS)
    },
    [slide],
  )

  const finishSpeaking = () => {
    slideForward(() => {
      setSpeaking(null)
      advance()
    })
  }

  const handleGrade = (grade: Grade) => {
    if (!step) return
    /* The preview the learner was actually looking at, and the elapsed time
       since the card appeared. The preview keeps the button's interval and the
       stored one identical; the duration is analytics only and never reaches
       the scheduler. */
    gradeCard(step.wordId, grade, preview ?? undefined, Date.now() - shownAt.current)
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
      advanceThroughSpeaking(step.wordId)
    }
  }

  const handleListeningAnswer = (correct: boolean) => {
    if (!step) return
    /* A listening miss reschedules the card but doesn't detour into the writing
       drill the way an "Again" on a flashcard does — wrong ear, not wrong hand.
       No preview: this drill never showed the learner four intervals to choose
       between, so there is no displayed number for the commit to have to match,
       and scheduling fresh at the moment of the answer is correct. */
    gradeCard(step.wordId, correct ? 'good' : 'again', undefined, Date.now() - shownAt.current)
    setStats((s) => ({ reviewed: s.reviewed + 1, correct: s.correct + (correct ? 1 : 0) }))
    if (correct) setCelebrateKey((k) => k + 1)
    advance()
  }

  /**
   * "I don't know" — the word goes to the back of the queue rather than being
   * graded.
   *
   * Not a grade of any kind, and that is the point: making the learner press
   * "Again" to get past a word they have honestly not learnt records a lapse
   * against a card they never really attempted, and teaches them to guess
   * instead of admitting it. The card's schedule is left exactly as it was.
   *
   * Appending a *copy of an existing step* does not violate the fixed-plan rule
   * above — the plan is fixed against the **deck**, so that grading cannot
   * reshuffle the queue underneath the learner. This re-queues something
   * already in it.
   *
   * Requeued at most once per word per session. Without that cap a learner who
   * keeps pressing it on the last remaining card would extend the session by
   * one card every time and never reach the end.
   */
  const skippedOnce = useRef(new Set<string>())

  const skipForNow = () => {
    if (!step) return
    const wordId = step.wordId

    if (skippedOnce.current.has(wordId)) {
      slideForward(advance)
      return
    }

    skippedOnce.current.add(wordId)
    const requeued = step
    slideForward(() => {
      setSteps((prev) => [...prev, requeued])
      setIndex((i) => i + 1)
    })
  }

  const handlePracticeNext = () => {
    if (!practice) return
    completePracticeRep(practice.wordId)
    if (practice.remaining - 1 <= 0) {
      setPractice(null)
      advanceThroughSpeaking(practice.wordId)
    } else {
      setPractice((p) => (p ? { ...p, remaining: p.remaining - 1 } : p))
    }
  }

  const accuracy = useMemo(() => (stats.reviewed === 0 ? 0 : Math.round((stats.correct / stats.reviewed) * 100)), [stats])

  if (finished) {
    const ranOutOfTime = mode === 'quick' && secondsLeft === 0 && index < total - 1

    /*
     * Leaving the summary — the app's one natural break for an interstitial.
     *
     * Three things about *when* this fires are deliberate:
     *
     * **On the way out, not on the way in.** The summary is the payoff: the
     * accuracy, the streak, the confetti. Covering that with an advert takes
     * the moment the session was for. By the time the learner presses this,
     * they have had it and are leaving anyway.
     *
     * **Only when something was actually reviewed.** "Nothing to review" is not
     * a completed session, and charging a learner an advert for opening an
     * empty queue would be the most annoying possible moment to pick.
     *
     * **The navigation is not conditional on the advert.** `noteNaturalBreak`
     * resolves quickly with no advert far more often than not, and whatever it
     * decides, the next line runs — the frequency caps in `adConfig` own that
     * decision, and this screen never learns the outcome.
     */
    const finishSession = () => {
      if (leavingRef.current) return
      leavingRef.current = true
      // Released after the exit is attempted rather than left latched: if the
      // navigation somehow does not happen, the button has to still work. When
      // it does happen this screen unmounts and the reset is moot.
      const leave = () => {
        closeSession()
        leavingRef.current = false
      }
      if (stats.reviewed === 0) {
        leave()
        return
      }
      void noteNaturalBreak('review-session-complete').finally(leave)
    }
    return (
      <SessionStage style={stageStyle}>
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

          <Pressable onPress={finishSession} className="mt-2 w-full max-w-xs items-center rounded-2xl bg-brand-500 px-6 py-4 shadow-card">
            <Text className="text-lg font-bold text-white">Back to Review</Text>
          </Pressable>
        </SafeAreaView>
      </SessionStage>
    )
  }

  if (!word || !step) return null

  // `advanceThroughSpeaking` only sets this for a word it could resolve, so the
  // lookup failing means the bank changed underneath — fall through to the card
  // rather than stranding the learner on an empty screen.
  const speakingWord = speaking ? getWord(speaking) : undefined

  if (speaking && speakingWord) {
    return (
      <SessionStage style={stageStyle}>
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
          <Celebration trigger={celebrateKey} />
          <SessionHeader
            onClose={() => closeSession()}
            step={index + 1}
            total={total}
            progress={(index + 1) / total}
            label="Speaking"
            secondsLeft={secondsLeft}
          />
          <PronunciationCheck
            key={speaking}
            word={speakingWord}
            onPass={finishSpeaking}
            onSkip={finishSpeaking}
          />
        </SafeAreaView>
      </SessionStage>
    )
  }

  if (practice) {
    const doneCount = practice.total - practice.remaining + 1
    return (
      <SessionStage style={stageStyle}>
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
      </SessionStage>
    )
  }

  return (
    <SessionStage style={stageStyle}>
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

        {/*
          `key` carries the index as well as the word: a skipped word comes back
          later in the same session, and keyed on the id alone the second
          showing would reuse the first one's mounted state — a flashcard still
          revealed, a listening question still answered.
        */}
        {step.kind === 'flashcards' ? (
          <ReviewFlashcard
            key={`${step.wordId}-${index}`}
            word={word}
            direction={directionFor(step.wordId, settings.reviewDirection)}
            preview={preview ?? undefined}
            onGrade={handleGrade}
            onSkip={skipForNow}
          />
        ) : (
          <ReviewListening
            key={`${step.wordId}-${index}`}
            word={word}
            options={step.optionIds.map((id) => getWord(id)).filter((w): w is VocabWord => !!w)}
            onAnswer={handleListeningAnswer}
            onSkip={skipForNow}
          />
        )}
      </SafeAreaView>
    </SessionStage>
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
