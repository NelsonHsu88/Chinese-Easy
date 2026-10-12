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
import { prefetchStrokeData } from '../lib/hanziStrokeData'
import { dueCardsFor, listeningCardsFor, mistakeCardsFor } from '../lib/selectors'
import { Celebration } from '../components/Celebration'
import { ReviewFlashcard, directionFor } from '../components/ReviewFlashcard'
import { PracticeRep } from '../components/flashcard/PracticeRep'
import { ReviewListening } from '../components/ReviewListening'
import { ReviewFillGap } from '../components/drills/ReviewFillGap'
import { ReviewMatchPairs } from '../components/drills/ReviewMatchPairs'
import {
  buildMixedSteps,
  isListeningPaused,
  withoutListening,
  LISTENING_PAUSE_MINUTES,
  type DrillStep,
} from '../lib/mixedDrills'
import { DrillToast } from '../components/drills/parts'
import { SessionEnd } from '../components/sessionEnd/SessionEnd'
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

/**
 * How the session was launched — decides which pool it draws on and which phases it runs.
 *
 * `mixed` is Mixed Drills: listening, fill-the-gap and match-the-pairs over the
 * listening pool. It replaced the listening-only drill, and `?mode=listening`
 * is still accepted as an alias for it so an old link lands somewhere real.
 */
export type ReviewMode = 'flashcards' | 'mixed' | 'mistakes' | 'full' | 'quick'
const MODES: readonly ReviewMode[] = ['flashcards', 'mixed', 'mistakes', 'full', 'quick']

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
  mixed: 'Mixed Drills',
  mistakes: 'Mistakes',
  full: 'Review Session',
  quick: 'Quick Review',
}

/** One thing to do, in order. Question steps carry their own options so the distractors stay stable across re-renders. */
type Step = DrillStep

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
  else router.navigate('/review-tab')
}

/**
 * The session, with the "listening is off" toast laid over it.
 *
 * The toast lives out here rather than inside the session because every phase
 * of the session renders in a stage that slides off-screen between cards — and
 * the toast is raised at exactly such a moment, as the listening question is
 * swapped away. Out here it stays put while the card moves under it.
 */
export function ReviewSession() {
  const [toastKey, setToastKey] = useState(0)
  return (
    <View style={{ flex: 1 }}>
      <ReviewSessionBody onListeningPaused={() => setToastKey((k) => k + 1)} />
      {toastKey > 0 && (
        <DrillToast key={toastKey} message={`Listening will be turned off for ${LISTENING_PAUSE_MINUTES} minutes`} />
      )}
    </View>
  )
}

function ReviewSessionBody({ onListeningPaused }: { onListeningPaused: () => void }) {
  const {
    deck,
    wordBank,
    settings,
    getWord,
    gradeCard,
    completePracticeRep,
    trackLearningEvent,
    streak,
    matchHistory,
    noteWordsMatched,
    listeningPausedUntil,
    pauseListening,
  } = useApp()
  const params = useLocalSearchParams<{ mode?: string }>()
  const mode: ReviewMode =
    params.mode === 'listening' ? 'mixed' : MODES.includes(params.mode as ReviewMode) ? (params.mode as ReviewMode) : 'flashcards'

  // The plan is fixed at mount: grading a card mutates the deck, so recomputing
  // the queue from it mid-session would reshuffle the ground under the learner.
  const [steps, setSteps] = useState<Step[]>(() => {
    const deckWords = deck.map((c) => getWord(c.wordId)).filter((w): w is VocabWord => !!w)
    const toIds = (cards: SrsCard[]) => cards.map((c) => c.wordId).filter((id) => !!getWord(id))

    const flashcardIds =
      mode === 'mistakes' ? toIds(mistakeCardsFor(deck)) : mode === 'mixed' ? [] : toIds(dueCardsFor(deck, settings))
    /* Standalone Mixed Drills takes every due card, new ones included; Full and Quick
       skip brand-new cards in their drill half because their flashcards just showed them. */
    const drillIds =
      mode === 'mixed'
        ? toIds(dueCardsFor(deck, settings))
        : mode === 'full' || mode === 'quick'
          ? toIds(listeningCardsFor(deck, settings))
          : []

    const flashcardSteps: Step[] = flashcardIds.map((wordId) => ({ kind: 'flashcards', wordId }))
    /* Listening, fill-the-gap and match-the-pairs, interleaved — see lib/mixedDrills.ts. */
    const drillSteps = buildMixedSteps({
      dueWords: drillIds.map((id) => getWord(id)).filter((w): w is VocabWord => !!w),
      deckWords,
      wordBank,
      script: settings.script,
      matchedAt: matchHistory,
      // "Can't listen now" pressed in the last half hour: gaps and boards only.
      listening: !isListeningPaused(listeningPausedUntil),
    })

    return [...flashcardSteps, ...drillSteps]
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
  /* A match board is several words at once and has no single one. */
  const word = step && step.kind !== 'match' ? getWord(step.wordId) : undefined
  /* Identity of the card on screen. Index as well as word id, exactly like the
     mount key below: "I don't know" re-queues a word later in the same session,
     and keyed on the id alone the second showing would reuse the first's state. */
  const stepKey = step ? `${step.kind === 'match' ? 'match' : step.wordId}-${index}` : ''

  /* Warm the stroke data for the writing cards coming up, so each one's pad is
     ready to draw the moment it slides in rather than loading on arrival. Both
     scripts' forms: cheap, and it doesn't need to know the preference. */
  useEffect(() => {
    for (const upcoming of steps.slice(index, index + 3)) {
      if (upcoming.kind !== 'flashcards') continue
      const next = getWord(upcoming.wordId)
      if (next) prefetchStrokeData(next.traditional + next.simplified)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, steps])

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

  /* Whether the card on screen has never been reviewed, for its "New word" pill.
     Fixed per step like the preview, so grading doesn't flip the pill to
     "Due today" while the card is sliding away. */
  const cardIsNew = useMemo(
    () => (step && step.kind === 'flashcards' ? (deck.find((c) => c.wordId === step.wordId)?.reps ?? 0) === 0 : false),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stepKey],
  )

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
    if (!step || step.kind === 'match') return
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
    if (!step || step.kind === 'match') return
    /* A listening miss reschedules the card but doesn't detour into the writing
       drill the way an "Again" on a flashcard does — wrong ear, not wrong hand.
       No preview: this drill never showed the learner four intervals to choose
       between, so there is no displayed number for the commit to have to match,
       and scheduling fresh at the moment of the answer is correct. */
    gradeCard(step.wordId, correct ? 'good' : 'again', undefined, Date.now() - shownAt.current)
    trackLearningEvent({ type: 'LISTENING_ANSWERED', correct })
    setStats((s) => ({ reviewed: s.reviewed + 1, correct: s.correct + (correct ? 1 : 0) }))
    if (correct) setCelebrateKey((k) => k + 1)
    advance()
  }

  /* Graded exactly like a listening answer — a gap is recall of the same word
     in context — but it isn't listening, so it doesn't feed that counter. */
  const handleFillGapAnswer = (correct: boolean) => {
    if (!step || step.kind !== 'fillGap') return
    gradeCard(step.wordId, correct ? 'good' : 'again', undefined, Date.now() - shownAt.current)
    setStats((s) => ({ reviewed: s.reviewed + 1, correct: s.correct + (correct ? 1 : 0) }))
    if (correct) setCelebrateKey((k) => k + 1)
    advance()
  }

  /*
   * A finished board. Practice, not review: these words were drawn from the
   * whole deck rather than the due pool, so nothing is graded — grading a card
   * that wasn't due would pull its schedule forward for no reason. Each pair
   * counts toward the session's accuracy, right only if matched first time.
   */
  const handleMatchComplete = (firstTry: number, pairs: number) => {
    if (!step || step.kind !== 'match') return
    noteWordsMatched(step.wordIds)
    setStats((s) => ({ reviewed: s.reviewed + pairs, correct: s.correct + firstTry }))
    if (firstTry === pairs) setCelebrateKey((k) => k + 1)
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
    if (!step || step.kind === 'match') return
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

  /**
   * "Can't listen now" — listening goes off for half an hour, and every
   * listening question left in this session, the one on screen included,
   * becomes a Fill the Gap on the same word (see `withoutListening`). Nothing
   * is graded: the learner didn't attempt the word, they just couldn't hear it.
   */
  const cantListenNow = () => {
    if (!step || step.kind !== 'listening') return
    pauseListening(LISTENING_PAUSE_MINUTES)
    onListeningPaused()
    const deckWords = deck.map((c) => getWord(c.wordId)).filter((w): w is VocabWord => !!w)
    const next = withoutListening(steps, index, { getWord, deckWords, wordBank, script: settings.script })
    slideForward(() => {
      setSteps(next)
      if (index >= next.length) setFinished(true)
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

  /*
   * A finished session with at least one card graded counts once toward the
   * review achievements. An empty session ("Nothing to review") is not one.
   */
  const sessionCounted = useRef(false)
  useEffect(() => {
    if (!finished || sessionCounted.current || stats.reviewed === 0) return
    sessionCounted.current = true
    trackLearningEvent({ type: 'REVIEW_SESSION_COMPLETED' })
  }, [finished, stats.reviewed, trackLearningEvent])


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
    /* Built to the SS930 references — see components/sessionEnd/. */
    return (
      <SessionStage style={stageStyle}>
        {stats.reviewed === 0 ? (
          <SessionEnd kind="empty" mode={mode} onBack={finishSession} />
        ) : (
          <>
            <SessionEnd
              kind="done"
              mode={mode}
              onBack={finishSession}
              reviewed={stats.reviewed}
              correct={stats.correct}
              streak={streak}
              timedOut={ranOutOfTime}
            />
            <Celebration trigger={celebrateKey} />
          </>
        )}
      </SessionStage>
    )
  }

  if (step?.kind === 'match') {
    return (
      <SessionStage style={stageStyle}>
        <Celebration trigger={celebrateKey} />
        <ReviewMatchPairs
          key={stepKey}
          words={step.wordIds.map((id) => getWord(id)).filter((w): w is VocabWord => !!w)}
          onComplete={handleMatchComplete}
          onClose={() => closeSession()}
          step={index + 1}
          total={total}
          secondsLeft={secondsLeft}
        />
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
    /* In the flashcard's own design. Keyed per rep: each rep's auto-advance and
       writer state belong to that rep alone. */
    return (
      <SessionStage style={stageStyle}>
        <PracticeRep
          key={`${practice.wordId}-${practice.remaining}`}
          word={word}
          rep={doneCount}
          total={practice.total}
          secondsLeft={secondsLeft}
          onNext={handlePracticeNext}
          onClose={() => closeSession()}
        />
      </SessionStage>
    )
  }

  if (step.kind === 'fillGap') {
    return (
      <SessionStage style={stageStyle}>
        <Celebration trigger={celebrateKey} />
        <ReviewFillGap
          key={stepKey}
          word={word}
          options={step.optionIds.map((id) => getWord(id)).filter((w): w is VocabWord => !!w)}
          onAnswer={handleFillGapAnswer}
          onSkip={skipForNow}
          onClose={() => closeSession()}
          step={index + 1}
          total={total}
          secondsLeft={secondsLeft}
        />
      </SessionStage>
    )
  }

  /* The Mixed Drills kinds own their whole screen — their own header,
     progress and (for listening) Recent sheet, built to the SS930 and SS102
     references — so the generic session header stays out of their way. */
  if (step.kind === 'listening') {
    return (
      <SessionStage style={stageStyle}>
        <Celebration trigger={celebrateKey} />
        {/* `key` carries the index as well as the word — see below. */}
        <ReviewListening
          key={`${step.wordId}-${index}`}
          word={word}
          options={step.optionIds.map((id) => getWord(id)).filter((w): w is VocabWord => !!w)}
          onAnswer={handleListeningAnswer}
          onSkip={skipForNow}
          onCantListen={cantListenNow}
          onClose={() => closeSession()}
          step={index + 1}
          total={total}
          secondsLeft={secondsLeft}
        />
      </SessionStage>
    )
  }

  /* Like the Mixed Drills kinds, the flashcard owns its whole screen — header
     included — built to the SS 1011 reference. */
  return (
    <SessionStage style={stageStyle}>
      <Celebration trigger={celebrateKey} />
      {/*
        `key` carries the index as well as the word: a skipped word comes back
        later in the same session, and keyed on the id alone the second
        showing would reuse the first one's mounted state — a flashcard still
        revealed, a listening question still answered.
      */}
      <ReviewFlashcard
        key={`${step.wordId}-${index}`}
        word={word}
        direction={directionFor(step.wordId, settings.reviewDirection)}
        preview={preview ?? undefined}
        isNew={cardIsNew}
        onGrade={handleGrade}
        onSkip={skipForNow}
        onClose={() => closeSession()}
        step={index + 1}
        total={total}
        label={mode === 'full' || mode === 'quick' ? 'Flashcards' : MODE_TITLES[mode]}
        secondsLeft={secondsLeft}
      />
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
