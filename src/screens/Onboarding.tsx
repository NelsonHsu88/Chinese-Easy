import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, useWindowDimensions } from 'react-native'
import { router } from 'expo-router'
import {
  Target,
  Briefcase,
  BookOpen,
  Flower2,
  Mail,
  Bell,
  BarChart3,
  Footprints,
  CalendarDays,
  Volume2,
  Star,
  Rocket,
  Check,
} from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import {
  OnbShell,
  OnbTopBar,
  OnbSkip,
  OnbScriptCard,
  OnbTitle,
  OnbBody,
  OnbButton,
  OnbTextButton,
  OnbCard,
  OnbChoiceCard,
  OnbDots,
  OnbTextField,
  Radio,
  SlideIn,
  OnbRise,
  OnbArtEnter,
  OnbPageTransition,
  ResultToast,
  DontKnowButton,
  toneColors,
  ONB_CONTENT_MAX,
  type OnbTone,
} from '../components/onboarding/parts'
import { GoogleMark } from '../components/onboarding/GoogleMark'
import { useAuth } from '../context/AuthContext'
import {
  ArtLayer,
  SakuraCorner,
  PagodaScene,
  MountainBase,
  Cloud,
} from '../components/onboarding/PageArt'
import { Shifu } from '../components/onboarding/Shifu'
import {
  onbColors as c,
  onbSpacing as s,
  onbType as t,
  onbRadius,
  onbMotion,
  onbVerdict,
  type VerdictKind,
} from '../components/onboarding/tokens'
import { newPlacementSeed, placementDistractorPool, samplePlacementItems } from '../data/placementTest'
import { buildPlacementQuestions } from '../lib/placementQuiz'
import { computeEstimatedHsk } from '../lib/placement'
import { displayWord, displayPinyin } from '../lib/hanzi'
import { speak } from '../lib/speech'
import { todayISO } from '../lib/date'
import { playPositiveChime, playRetryTone, playFanfare, playTapSound } from '../lib/sound'
import { tapHaptic, tickHaptic, successHaptic, carefulHaptic } from '../lib/haptics'
import type { LearningGoal, PlacementAnswer, ScriptMode } from '../types'

/*
 * The six-screen onboarding flow, built to the reference mockups.
 *
 * Its design system is `components/onboarding/tokens.ts`; its scenery is
 * `PageArt`; its controls are `parts.tsx`. What lives here is the flow itself
 * and each page's composition.
 *
 * Every page is the same three regions — top bar, flexible middle, stable
 * footer — so the primary button lands on the same line throughout and does not
 * walk up and down the screen as the learner advances. The middle region is the
 * only one that grows, which is what lets a 667pt phone and an 844pt one both
 * look deliberate rather than one of them looking padded.
 */

type Step = 'welcome' | 'script' | 'goal' | 'account' | 'profile' | 'notifications' | 'test' | 'ready'

/**
 * Page order, and the single source both indicators are derived from.
 *
 * Adding a page here moves every dot and pill with it, which is the point: the
 * script page was inserted after welcome and nothing else had to be renumbered
 * by hand.
 */
const STEP_ORDER: Step[] = ['welcome', 'script', 'goal', 'account', 'profile', 'notifications', 'test', 'ready']

/** Dot index per page, for the screens that show dots. */
const DOT_INDEX = Object.fromEntries(STEP_ORDER.map((step, i) => [step, i])) as Record<Step, number>

/** How many dots the pages that show them draw. */
const DOT_TOTAL = STEP_ORDER.length

/**
 * Which way the learner got to the profile step.
 *
 * Google has already supplied an address, so that path asks for a name and
 * nothing else; the email path has to ask for both. Same screen, same artwork —
 * only the field list differs.
 */
type AuthMode = 'google' | 'email'

const GOALS: { id: LearningGoal; title: string; body: string; icon: typeof Target; tone: OnbTone }[] = [
  {
    id: 'daily-life',
    title: 'Learn for daily life',
    body: 'Start conversations and understand the basics.',
    icon: Target,
    tone: 'green',
  },
  {
    id: 'travel',
    title: 'Travel with confidence',
    body: 'Navigate trips and connect with locals.',
    icon: Briefcase,
    tone: 'coral',
  },
  {
    id: 'exam',
    title: 'Study & exam prep',
    body: 'Prepare for HSK and academic goals.',
    icon: BookOpen,
    tone: 'blue',
  },
  {
    id: 'culture',
    title: 'Culture & interest',
    body: 'Explore Chinese language and culture.',
    icon: Flower2,
    tone: 'gold',
  },
]

const GOAL_LABEL: Record<LearningGoal, string> = {
  'daily-life': 'Daily Life',
  travel: 'Travel',
  exam: 'Exam Prep',
  culture: 'Culture',
}

const LEVEL_LABEL = ['Beginner', 'Beginner', 'Elementary', 'Intermediate', 'Upper intermediate', 'Advanced', 'Fluent']

export function Onboarding() {
  const { completeOnboarding, updateSettings, settings, onboardingComplete, startTour } = useApp()
  const { width, height } = useWindowDimensions()
  const columnWidth = Math.min(width, ONB_CONTENT_MAX)

  /*
   * Reaching this screen with onboarding already done means Settings sent the
   * learner back to retake the placement test. Everything before the test has
   * an answer already, so it is skipped rather than asked again.
   */
  /*
   * Frozen at mount, deliberately, rather than read live.
   *
   * `completeOnboarding` fires from an effect the moment the learner reaches the
   * final page, so `onboardingComplete` is already true by the time they press
   * the button on it. Reading it live therefore made every *first* run look like
   * a retake at exactly the moment it mattered — the finish handler took the
   * retake branch, and Shifu's tour never started for the one person it is for.
   */
  const [isRetake] = useState(onboardingComplete)
  const [step, setStep] = useState<Step>(() => (isRetake ? 'test' : 'welcome'))
  /*
   * The script choice, held locally until Continue commits it.
   *
   * Seeded from the persisted preference rather than defaulting blind, so
   * leaving onboarding and coming back shows the card that is actually stored —
   * and so the default is whatever `DEFAULT_SETTINGS.script` says rather than a
   * second opinion about it living here.
   */
  const [script, setScript] = useState<ScriptMode>(settings.script)
  const [history, setHistory] = useState<Step[]>([])
  /** Which way the next page should slide in from. */
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')

  const [goal, setGoal] = useState<LearningGoal>(settings.learningGoal)

  // --- Account ---------------------------------------------------------------

  const { signInWithGoogle } = useAuth()
  const [googleBusy, setGoogleBusy] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('email')
  /*
   * Seeded blank rather than from `settings.username`, whose default is the
   * literal string "Learner". Pre-filling the box with a placeholder name
   * invites the learner to press Continue and be called Learner forever.
   */
  const [nameInput, setNameInput] = useState('')
  const [emailInput, setEmailInput] = useState('')

  const trimmedName = nameInput.trim()
  // Deliberately loose. This is a local profile, not a verified address, and a
  // strict pattern here only ever rejects somebody's real email.
  const emailLooksValid = /^\S+@\S+\.\S+$/.test(emailInput.trim())
  const canSubmitProfile = trimmedName.length > 0 && (authMode === 'google' || emailLooksValid)

  /**
   * Takes the email route, dropping anything Google supplied on the way.
   *
   * Someone who picked a Google account, backed out, and chose email instead
   * has just declined that address — offering it back to them pre-filled in a
   * box labelled "Email" reads as the app not having listened. Values typed on
   * the email screen itself survive going back and forward, because the reset
   * only fires when the mode actually changes.
   */
  const startEmailSignUp = () => {
    if (authMode === 'google') {
      setNameInput('')
      setEmailInput('')
    }
    setAuthMode('email')
    goTo('profile')
  }

  /**
   * Real Google sign-in.
   *
   * This used to open a mock account sheet that listed a hardcoded address, so
   * every learner was shown the developer's own email as the account to sign in
   * with. Now nothing is suggested: Google's page decides whose account this
   * is, and the app only ever learns about the person who actually signed in.
   */
  const continueWithGoogle = async () => {
    if (googleBusy) return
    tapHaptic()
    setGoogleError(null)
    setGoogleBusy(true)
    const result = await signInWithGoogle()
    setGoogleBusy(false)

    /* Backing out is a decision, not a failure — say nothing and stay put. */
    if (result.cancelled) return
    if (result.error) {
      setGoogleError(result.error)
      return
    }

    setAuthMode('google')
    setEmailInput(result.account?.email ?? '')
    // Google gives a display name; it is an opening offer, not a decision, so
    // the next screen still shows it in an editable box.
    setNameInput(result.account?.name ?? '')
    goTo('profile')
  }

  const submitProfile = () => {
    updateSettings({ username: trimmedName, email: emailInput.trim() })
    playPositiveChime()
    goTo('notifications')
  }

  /*
   * The words this attempt asks about, drawn fresh.
   *
   * The seed is fixed for the life of the attempt, so stepping back to an
   * earlier question finds the same question with the same options — and so the
   * estimate at the end is computed against exactly the items the questions were
   * built from. A retake gets a new seed and therefore a different test, which
   * is the whole point: the old fixed eighteen were memorable after one sitting.
   */
  const [placementSeed] = useState(newPlacementSeed)
  const placementItems = useMemo(() => samplePlacementItems(placementSeed), [placementSeed])
  /* Wrong answers come from the curated words this attempt does *not* ask
     about, so no option is ever another question's answer. */
  const placementDistractors = useMemo(() => placementDistractorPool(placementItems), [placementItems])
  /*
   * Built against the chosen script, so a simplified learner is tested on the
   * characters they have just said they read. The words and the answers are the
   * same either way — only the forms on screen change.
   */
  const questions = useMemo(
    () => buildPlacementQuestions(placementItems, placementDistractors, settings.script),
    [placementItems, placementDistractors, settings.script],
  )
  const [questionIndex, setQuestionIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  /**
   * The verdict, once confirmed. `null` means the learner is still choosing —
   * which is the difference between "an option is highlighted" and "the answer
   * is in", and therefore what the footer button and the options' colours both
   * key off.
   */
  const [verdict, setVerdict] = useState<VerdictKind | null>(null)
  const [answers, setAnswers] = useState<PlacementAnswer[]>([])

  const estimatedHsk = useMemo(() => computeEstimatedHsk(placementItems, answers), [answers])

  useEffect(() => {
    if (step === 'ready') {
      completeOnboarding({ estimatedHsk, completedAt: todayISO() })
    }
  }, [step, estimatedHsk, completeOnboarding])

  const goTo = (next: Step) => {
    setDirection('forward')
    setHistory((h) => [...h, step])
    setStep(next)
  }

  const goBack = () => {
    if (history.length === 0) {
      // Retaking the test from Settings: the only way back is out.
      if (isRetake) router.replace('/settings')
      return
    }
    const prev = history[history.length - 1]
    setDirection('back')
    setHistory((h) => h.slice(0, -1))
    setStep(prev)
  }

  /** Skip lands on the test — the one step whose answer can't be guessed. */
  const skipToTest = () => goTo('test')

  /*
   * Out of onboarding and straight into Shifu's tour, which opens on the
   * Dashboard — its first stop, and the screen a learner lands on anyway.
   *
   * A retake is exempt. It comes from Settings and only redoes the placement
   * test; the learner has already been round the app once, and walking them
   * through it again would read as the app forgetting them.
   */
  const finish = () => {
    playFanfare()
    successHaptic()
    if (!isRetake) startTour()
    router.replace('/')
  }

  // --- Placement -------------------------------------------------------------

  const question = questions[questionIndex]

  /*
   * Listening questions play themselves on arrival. The learner should not have
   * to discover a button before the question has said anything, and a replay
   * control is right there for the second hearing.
   */
  useEffect(() => {
    if (step === 'test' && question?.kind === 'listening') speak(displayWord(question.word, settings.script))
  }, [step, question, settings.script])

  /** Choosing is not answering — it only arms the Confirm button. */
  const pick = (index: number) => {
    if (verdict) return
    tickHaptic()
    setPicked(index)
  }

  const confirm = () => {
    if (picked === null || verdict) return
    const right = picked === question.answerIndex
    setVerdict(right ? 'correct' : 'incorrect')
    if (right) {
      playPositiveChime()
      successHaptic()
    } else {
      playRetryTone()
      carefulHaptic()
    }
  }

  const dontKnow = () => {
    if (verdict) return
    setPicked(null)
    setVerdict('unsure')
    playTapSound()
    carefulHaptic()
  }

  const nextQuestion = () => {
    /*
     * The scorer still speaks in self-ratings, so a right answer is recorded as
     * "know" and everything else as "unknown". "I don't know" and a wrong guess
     * are worth the same to the estimate — neither is evidence the word is
     * known — but only one of them was honest, which is why they are told apart
     * in the toast and not here.
     */
    const rating: PlacementAnswer['rating'] = verdict === 'correct' ? 'know' : 'unknown'
    setAnswers((a) => [...a, { wordId: question.word.id, rating }])
    setPicked(null)
    setVerdict(null)

    if (questionIndex + 1 >= questions.length) {
      setStep('ready')
    } else {
      setQuestionIndex((i) => i + 1)
    }
  }

  const testBack = () => {
    if (questionIndex === 0) {
      goBack()
      return
    }
    setQuestionIndex((i) => i - 1)
    setAnswers((a) => a.slice(0, -1))
    setPicked(null)
    setVerdict(null)
  }

  // --- Pages -----------------------------------------------------------------

  /*
   * Each page is built here and handed to `OnbPageTransition`, which runs the
   * change in two halves: the page being left slides off the way the learner is
   * travelling and fades, and only once it has gone does the next one mount.
   *
   * That means the arriving page is responsible for its own entrance — hence
   * the `OnbRise` wrappers throughout, which bring its contents up from below
   * one after another, and `OnbArtEnter`, which drifts its scenery in from the
   * side behind them. A page with an un-wrapped element simply pops that
   * element into place after everything else has moved, which is exactly what
   * this replaced.
   *
   * The two halves are strictly sequential, so the placement test's effects
   * (which speak the word aloud) still fire once, on arrival, and never for a
   * page nobody is looking at.
   */
  const renderPage = () => {
  if (step === 'welcome') {
    return (
      <OnbShell
        art={
          <ArtLayer>
            {/*
              The hero scene, back to front: the panorama is lifted off the
              bottom edge so its ridges band *behind the mascot* rather than
              hiding behind the feature card, which is where the reference puts
              them. The pagoda sits on the right at the mascot's shoulder, and
              the branch enters from the left at roughly the subtitle's line.
              Both run off the edge and are clipped by the page.

              Each half enters from the side it belongs to — branch from the
              left, mountains and pagoda from the right — so the scene assembles
              outward from the middle instead of sliding in as one slab. The
              mountains and their pagoda travel together because they are one
              landscape; splitting them would have the pagoda arrive at a ridge
              that is still moving under it.
            */}
            <SlideIn from="right" fill delay={0}>
              <MountainBase width={columnWidth} bottom={height * 0.3} opacity={0.55} />
              <PagodaScene width={columnWidth * 0.62} top={height * 0.34} right={-40} />
            </SlideIn>
            {/*
              Anchored to a fixed offset, not a fraction of the screen height.
              Everything above the branch — top bar, logo, wordmark, subtitle —
              is fixed-height, so the header always ends at the same y whatever
              the phone; a proportional `top` was therefore *lower* on a tall
              screen and, on a short one, sat straight across the subtitle.
            */}
            <SlideIn from="left" fill delay={onbMotion.enterStagger}>
              <SakuraCorner side="left" width={columnWidth * 0.62} top={244} inset={-92} />
            </SlideIn>
          </ArtLayer>
        }
        top={<OnbTopBar right={<OnbSkip onPress={skipToTest} />} />}
        /*
         * No scrolling here. Everything is sized to fit the viewport, and the
         * mascot below absorbs the slack — a welcome screen you can nudge up
         * and down by a few pixels reads as broken rather than as scrollable.
         */
        scroll={false}
        footer={
          <SlideIn from="bottom" delay={onbMotion.enterStagger * 3}>
            <View style={{ gap: s.lg }}>
              <OnbButton label="Let's get started" onPress={() => goTo('script')} />
              <OnbDots index={DOT_INDEX.welcome!} total={DOT_TOTAL} />
            </View>
          </SlideIn>
        }
      >
        <View className="items-center" style={{ paddingTop: s.md }}>
          <AppMark />
          <Text
            className="text-center font-nunito-extrabold"
            style={{ ...t.wordmark, color: c.navy, marginTop: s.lg }}
          >
            Chinese Easy
          </Text>
          <OnbBody style={{ marginTop: s.sm }}>{'Learn Mandarin the natural,\nstress-free way.'}</OnbBody>
        </View>

        {/*
          The mascot overlaps the scenery, so it sits in the flex column (which
          renders above the art layer) while the mountains behind it do not.
          `fill` lets it shrink into whatever height is left over once the
          header, card and footer have taken theirs, which is what keeps the
          page on one screen across phone sizes without a scroll view.
        */}
        <SlideIn from="bottom" delay={onbMotion.enterStagger * 2} style={{ flex: 1, minHeight: 0 }}>
          <Shifu pose="wave" width={columnWidth * 0.5} fill />
        </SlideIn>

        <SlideIn from="bottom" delay={onbMotion.enterStagger * 3}>
          <OnbCard style={{ marginTop: s.md, paddingHorizontal: s.lg, paddingVertical: s.xs }}>
          <FeatureRow
            tone="green"
            glyph="字"
            title="Understand characters"
            body="Learn the building blocks of Chinese."
          />
          <RowRule />
          <FeatureRow
            tone="coral"
            icon={<Volume2 size={19} color="#ffffff" strokeWidth={2.4} />}
            title="Learn naturally"
            body="Real pronunciations and useful examples."
          />
          <RowRule />
          <FeatureRow
            tone="gold"
            icon={<Star size={19} color="#ffffff" strokeWidth={2.4} fill="#ffffff" />}
            title="Track your progress"
            body="Stay motivated and build real confidence."
          />
          </OnbCard>
        </SlideIn>
      </OnbShell>
    )
  }

  if (step === 'script') {
    return (
      <OnbShell
        art={
          <ArtLayer>
            {/*
              Sakura from the top-left, as drawn, and deliberately larger and
              further off the edge than the goal page's corner sprig: here it is
              the only decoration above the fold and it has the whole upper-left
              to itself. Bleeding past the 22pt content margin is what makes it
              read as a branch rather than as a sticker.
            */}
            <OnbArtEnter>
              <SakuraCorner side="left" width={columnWidth * 0.52} top={-24} inset={-64} />
            </OnbArtEnter>
            {/*
              The landscape the mascot stands in. Pinned to the bottom and wider
              than the column so the ridges run off both edges instead of
              stopping at a hard vertical line, with the pagoda on its own ridge
              to the right exactly as the reference has it.
            */}
            <OnbArtEnter delay={onbMotion.riseStagger}>
              <MountainBase width={columnWidth} bottom={0} opacity={0.66} />
              {/* On its own ridge to the right of the mascot, as drawn. Placed
                  from the bottom rather than the top so it stays with the range
                  it stands on when the viewport height changes. */}
              <PagodaScene width={columnWidth * 0.4} bottom={70} right={-18} />
            </OnbArtEnter>
          </ArtLayer>
        }
        top={
          <OnbRise distance={0}>
            <OnbTopBar onBack={goBack} right={<OnbSkip onPress={skipToTest} />} />
          </OnbRise>
        }
        /*
         * Button, then dots, with `s.lg` between them — the same three-part
         * footer every other page has, and it has to stay that way. The footer
         * is bottom-anchored, so anything extra in here pushes the primary
         * button *up* and this one page's Continue lands on a different line
         * from the other seven. The reassurance line that used to sit between
         * them is now in the content region below the cards, where it belongs
         * anyway: it is about the choice, not about the button.
         */
        footer={
          <OnbRise index={4}>
            <View style={{ gap: s.lg }}>
              <OnbButton
                label="Continue"
                onPress={() => {
                  /* Written to the one global preference, not an onboarding-only
                     copy — Settings → Learning preferences reads and writes the
                     same field, so the choice is already made when the learner
                     gets there. */
                  updateSettings({ script })
                  goTo('goal')
                }}
              />
              <OnbDots index={DOT_INDEX.script} total={DOT_TOTAL} />
            </View>
          </OnbRise>
        }
      >
        <OnbRise index={0}>
          <View style={{ paddingTop: s.md }}>
            <OnbTitle>Which characters?</OnbTitle>
            <OnbBody style={{ marginTop: s.sm }}>
              {'Both teach the same language —\nthey’re just written differently.'}
            </OnbBody>
          </View>
        </OnbRise>

        {/*
          Side by side, and sized by `flex: 1` inside a row rather than by a
          percentage width: a percentage resolves against the space the *parent*
          was offered on native, which in a content-sized column is not the width
          the column turns out to have.
        */}
        <OnbRise index={1}>
          <View className="flex-row" style={{ gap: s.md, marginTop: s.xl }}>
            <OnbScriptCard
              glyph="學"
              script="traditional"
              label="Traditional"
              body={'Taiwan, Hong Kong\nand Macau'}
              selected={script === 'traditional'}
              onPress={() => setScript('traditional')}
            />
            <OnbScriptCard
              glyph="学"
              script="simplified"
              label="Simplified"
              body={'Mainland China\nand Singapore'}
              selected={script === 'simplified'}
              onPress={() => setScript('simplified')}
            />
          </View>
        </OnbRise>

        {/*
          Said out loud because the choice looks more permanent than it is. A
          learner who thinks they are locking in a writing system for good will
          stall on it; one who knows it is reversible picks the one they have
          heard of and moves on.

          It sits under the cards rather than in the footer so the footer keeps
          the button-then-dots shape every other page has — see the note there.
        */}
        <OnbRise index={2}>
          <Text
            className="font-nunito-semibold"
            style={{ ...t.footnote, color: c.textMuted, textAlign: 'center', marginTop: s.md }}
          >
            You can change this any time in Settings.
          </Text>
        </OnbRise>

        {/*
          Shifu, in front of the range he is standing in.
          
          The flexed wrapper is outside `OnbRise`, not inside it: `OnbRise`
          renders an `Animated.View` sized to its content, so a `flex-1` child of
          it has no height to claim and the mascot collapses to nothing. This is
          the same shape the goal page uses for its card list, and it is what
          absorbs the page's spare height so a tall phone doesn't end in a band
          of bare cream under the cards.
          
          Left-aligned rather than centred, and allowed past the content margin,
          so he sits at the foot of the page the way the reference has him rather
          than standing in the middle of the range.
        */}
        <View className="flex-1 justify-end" style={{ minHeight: 0 }}>
          {/*
            `flex: 1` on the riser as well as its wrapper. `OnbRise` renders an
            `Animated.View` that is content-sized by default, and a `fill` mascot
            inside one has no slot to shrink into — which is the difference
            between him sizing himself to the space left over and being clipped
            in half by the footer on a short phone.
          */}
          <OnbRise index={3} style={{ flex: 1, minHeight: 0 }}>
            <Shifu pose="bow" width={columnWidth * 0.46} align="start" fill />
          </OnbRise>
        </View>
      </OnbShell>
    )
  }

  if (step === 'goal') {
    return (
      <OnbShell
        art={
          <ArtLayer>
            {/*
              Small and tucked hard into the corner. At the welcome screen's
              size the branch reached across the title, and a decoration that
              sits on top of the one line the page is asking a question with is
              not decoration any more.

              It drifts in from the right, the side the page itself arrived
              from, and takes longer over it than anything in front of it.
            */}
            <OnbArtEnter>
              <SakuraCorner side="right" width={columnWidth * 0.36} top={-14} inset={-18} />
            </OnbArtEnter>
            {/* Barely any travel — clouds want to appear, not to fly past. */}
            <OnbArtEnter delay={onbMotion.riseStagger * 2} distance={20}>
              <Cloud variant="a" width={62} top={150} left={10} />
              <Cloud variant="b" width={58} top={158} right={12} />
            </OnbArtEnter>
          </ArtLayer>
        }
        top={
          <OnbRise distance={0}>
            <OnbTopBar onBack={goBack} />
          </OnbRise>
        }
        footer={
          <OnbRise index={GOALS.length + 1}>
            <View style={{ gap: s.lg }}>
              <OnbButton
                label="Continue"
                onPress={() => {
                  updateSettings({ learningGoal: goal })
                  goTo('account')
                }}
              />
              <OnbDots index={DOT_INDEX.goal!} total={DOT_TOTAL} />
            </View>
          </OnbRise>
        }
      >
        <OnbRise index={0}>
          <View style={{ paddingTop: s.md }}>
            <OnbTitle>What's your goal?</OnbTitle>
            <OnbBody style={{ marginTop: s.sm }}>{'This helps us personalise your\nlearning experience.'}</OnbBody>
          </View>
        </OnbRise>

        {/*
          The four cards come up one after another rather than as a block. The
          stagger is what makes the list read as being dealt out, and it is
          also what stops the page arriving as a single slab the moment the
          previous one has left.
        */}
        <View className="flex-1 justify-center" style={{ gap: s.md, paddingVertical: s.xl }}>
          {GOALS.map((option, i) => {
            const Icon = option.icon
            return (
              <OnbRise key={option.id} index={i + 1}>
                <OnbChoiceCard
                  title={option.title}
                  body={option.body}
                  tone={option.tone}
                  selected={goal === option.id}
                  onPress={() => setGoal(option.id)}
                  icon={<Icon size={21} color={toneColors(option.tone).solid} strokeWidth={2.3} />}
                />
              </OnbRise>
            )
          })}
        </View>
      </OnbShell>
    )
  }

  if (step === 'account') {
    return (
      <OnbShell
        art={
          <ArtLayer>
            <OnbArtEnter>
              <SakuraCorner side="right" width={columnWidth * 0.44} top={-12} inset={-22} />
            </OnbArtEnter>
            <OnbArtEnter delay={onbMotion.riseStagger * 2} distance={20}>
              <Cloud variant="c" width={56} top={168} left={8} />
              <Cloud variant="a" width={52} top={180} right={16} />
            </OnbArtEnter>
            {/*
              The panorama rises rather than drifting sideways. It is pinned to
              the bottom edge, and a landscape entering from the side slides
              its own ridges past the page border.
            */}
            <SlideIn from="bottom" fill distance={onbMotion.artSlide} duration={onbMotion.art}>
              <MountainBase width={columnWidth} opacity={0.45} />
            </SlideIn>
          </ArtLayer>
        }
        top={
          <OnbRise distance={0}>
            <OnbTopBar onBack={goBack} />
          </OnbRise>
        }
      >
        {/*
          Header and buttons are centred in the middle region *as one group*
          rather than the header pinning to the top and the buttons centring
          under it. Split, the two drifted apart and left a band of empty cream
          between them; together they sit where the reference puts them, with
          the page's breathing room below, where the mountains are.
        */}
        <View className="flex-1 justify-center" style={{ paddingBottom: s.huge }}>
          <OnbRise index={0}>
            <View className="items-center">
              <AppMark />
              <View style={{ marginTop: s.xl }}>
                <OnbTitle>Create your account</OnbTitle>
              </View>
              <OnbBody style={{ marginTop: s.sm }}>
                {'Join thousands of learners and start\nyour Mandarin journey.'}
              </OnbBody>
            </View>
          </OnbRise>

          <View style={{ gap: s.md, paddingTop: s.xxxl }}>
          {/*
            Neither button collects a password. Google's hands off to Google's
            own page and comes back with a session; the email route leads to the
            profile step, which asks for a name and an address. This screen
            never sees a credential.

            **No account is ever suggested here.** This used to open a mock
            picker listing a hardcoded address, which meant every learner was
            shown the developer's own email as the account to sign in with.
            Whose account this is, is Google's answer to give, not ours.
          */}
          <OnbRise index={1}>
            <AuthButton
              label={googleBusy ? 'Opening Google…' : 'Continue with Google'}
              icon={<GoogleMark />}
              disabled={googleBusy}
              onPress={continueWithGoogle}
            />
            {googleError !== null && (
              <Text
                className="text-center font-nunito-semibold"
                style={{ ...t.body, color: onbVerdict.incorrect.text, marginTop: s.sm }}
              >
                {googleError}
              </Text>
            )}
          </OnbRise>
          <OnbRise index={2}>
            <AuthButton
              label="Sign up with Email"
              icon={
                <View
                  className="items-center justify-center"
                  style={{ width: 32, height: 26, borderRadius: 7, backgroundColor: c.green }}
                >
                  <Mail size={16} color="#ffffff" strokeWidth={2.4} />
                </View>
              }
              onPress={() => {
                tapHaptic()
                startEmailSignUp()
              }}
            />
          </OnbRise>

          <OnbRise index={3}>
            <View className="flex-row items-center" style={{ gap: s.md, marginTop: s.sm }}>
              <View style={{ flex: 1, height: 1, backgroundColor: c.hairline }} />
              <Text className="font-nunito-semibold" style={{ ...t.footnote, color: c.textMuted }}>
                or
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: c.hairline }} />
            </View>
          </OnbRise>

          <OnbRise index={4}>
            <View className="flex-row items-center justify-center" style={{ gap: 6, marginTop: s.xs }}>
              <Text className="font-nunito-semibold" style={{ fontSize: 14, color: c.textSecondary }}>
                Already have an account?
              </Text>
              {/*
                Also the profile step rather than a skip. There is no backend to
                log in against, and letting this one route past the name box is
                how a returning learner ends up greeted as "Learner" forever.
              */}
              <Pressable onPress={startEmailSignUp} accessibilityRole="button" hitSlop={10}>
                <Text className="font-nunito-bold" style={{ fontSize: 14, color: c.greenDark }}>
                  Log in
                </Text>
              </Pressable>
            </View>
          </OnbRise>
          </View>
        </View>
      </OnbShell>
    )
  }

  /*
   * The same screen as `account` — same artwork, same mark, same title, arrived
   * at through the same slide-and-rise transition — with the sign-in options
   * swapped for the details themselves. Keeping the page identical either side
   * of that swap is the point: it reads as the card turning over rather than as
   * a new screen replacing it.
   *
   * The field list is the only thing that differs by route. Google has already
   * supplied an address, so that path asks for a name alone and shows the
   * account it signed in with; the email path asks for both.
   */
  if (step === 'profile') {
    return (
      <OnbShell
        art={
          <ArtLayer>
            <OnbArtEnter>
              <SakuraCorner side="right" width={columnWidth * 0.44} top={-12} inset={-22} />
            </OnbArtEnter>
            <OnbArtEnter delay={onbMotion.riseStagger * 2} distance={20}>
              <Cloud variant="c" width={56} top={168} left={8} />
              <Cloud variant="a" width={52} top={180} right={16} />
            </OnbArtEnter>
            <SlideIn from="bottom" fill distance={onbMotion.artSlide} duration={onbMotion.art}>
              <MountainBase width={columnWidth} opacity={0.45} />
            </SlideIn>
          </ArtLayer>
        }
        top={
          <OnbRise distance={0}>
            <OnbTopBar onBack={goBack} />
          </OnbRise>
        }
        footer={
          <OnbRise index={4}>
            <View style={{ gap: s.lg }}>
              <OnbButton label="Continue" onPress={submitProfile} disabled={!canSubmitProfile} />
              <OnbDots index={DOT_INDEX.profile!} total={DOT_TOTAL} />
            </View>
          </OnbRise>
        }
      >
        <View className="flex-1 justify-center" style={{ paddingBottom: s.xxl }}>
          <OnbRise index={0}>
            <View className="items-center">
              <AppMark />
              <View style={{ marginTop: s.xl }}>
                <OnbTitle>Create your account</OnbTitle>
              </View>
              <OnbBody style={{ marginTop: s.sm }}>
                {authMode === 'google'
                  ? 'Almost there — what should we\ncall you?'
                  : 'Tell us your name and where\nto reach you.'}
              </OnbBody>
            </View>
          </OnbRise>

          <View style={{ gap: s.xl, paddingTop: s.xxxl }}>
            {authMode === 'google' && (
              <OnbRise index={1}>
                <SignedInRow email={emailInput} />
              </OnbRise>
            )}

            <OnbRise index={authMode === 'google' ? 2 : 1}>
              <OnbTextField
                label="Username"
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="What should we call you?"
                autoCapitalize="words"
                autoComplete="username"
                maxLength={24}
                hint="This is the name on your Dashboard."
              />
            </OnbRise>

            {authMode === 'email' && (
              <OnbRise index={2}>
                <OnbTextField
                  label="Email"
                  value={emailInput}
                  onChangeText={setEmailInput}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </OnbRise>
            )}
          </View>
        </View>
      </OnbShell>
    )
  }

  if (step === 'notifications') {
    return (
      <OnbShell
        art={
          <ArtLayer>
            <SlideIn from="bottom" fill distance={onbMotion.artSlide} duration={onbMotion.art}>
              <MountainBase width={columnWidth} opacity={0.5} />
            </SlideIn>
          </ArtLayer>
        }
        top={
          <OnbRise distance={0}>
            <OnbTopBar onBack={goBack} />
          </OnbRise>
        }
        footer={
          <OnbRise index={3}>
            <View style={{ gap: s.md }}>
              <OnbButton
                label="Turn on notifications"
                onPress={() => {
                  updateSettings({ notificationsEnabled: true })
                  playPositiveChime()
                  goTo('test')
                }}
              />
              <OnbTextButton
                label="Maybe later"
                onPress={() => {
                  updateSettings({ notificationsEnabled: false })
                  goTo('test')
                }}
              />
            </View>
          </OnbRise>
        }
      >
        <OnbRise index={0}>
          <View style={{ paddingTop: s.lg }}>
            <OnbTitle>Stay on track</OnbTitle>
            <OnbBody style={{ marginTop: s.sm }}>
              {'Daily reminders help you build\na habit and keep your streak going.'}
            </OnbBody>
          </View>
        </OnbRise>

        {/* The wrapper carries the flex, or the mascot loses the slack it absorbs. */}
        <OnbRise index={1} style={{ flex: 1 }}>
          <View className="flex-1 items-center justify-center" style={{ paddingVertical: s.lg }}>
            <Shifu pose="bow" width={columnWidth * 0.5} bell />
          </View>
        </OnbRise>

        <OnbRise index={2}>
        <OnbCard style={{ padding: s.lg }}>
          <View className="flex-row items-center" style={{ gap: s.md }}>
            <View
              className="items-center justify-center rounded-full"
              style={{ width: 42, height: 42, backgroundColor: c.greenSoft }}
            >
              <Bell size={20} color={c.green} strokeWidth={2.2} />
            </View>
            <View className="flex-1">
              <Text className="font-nunito-bold" style={{ ...t.cardTitle, color: c.navy }}>
                Daily reminders
              </Text>
              <Text
                className="font-nunito-semibold"
                style={{ ...t.cardBody, color: c.textSecondary, marginTop: 2 }}
              >
                Get a gentle nudge to practice and reach your daily goal.
              </Text>
            </View>
            {/* Reads as on because the primary button below is what turns it on. */}
            <View
              className="justify-center"
              style={{ width: 46, height: 27, borderRadius: 14, backgroundColor: c.green, paddingHorizontal: 3 }}
            >
              <View className="self-end rounded-full" style={{ width: 21, height: 21, backgroundColor: '#ffffff' }} />
            </View>
          </View>
        </OnbCard>
        </OnbRise>
      </OnbShell>
    )
  }

  if (step === 'test') {
    const settled = verdict !== null
    const listening = question.kind === 'listening'
    const cloze = question.kind === 'cloze'
    const isLastQuestion = questionIndex + 1 >= questions.length

    return (
      <OnbShell
        art={
          <ArtLayer>
            <SlideIn from="bottom" fill distance={onbMotion.artSlide} duration={onbMotion.art}>
              <MountainBase width={columnWidth} opacity={0.45} />
            </SlideIn>
          </ArtLayer>
        }
        top={
          <OnbRise distance={0}>
            <OnbTopBar onBack={testBack} />
          </OnbRise>
        }
        footer={
          /*
            The entrance plays once, when the test page arrives — `pageKey`
            stays `test` from question to question, so moving to the next word
            does not replay it. The toast inside has its own entrance for that.
          */
          <OnbRise index={2}>
          <View style={{ gap: s.md }}>
            {/*
              Keyed by question and verdict so the toast re-enters on every
              answer. Without the key it mounts once and then silently swaps its
              text on later questions, which loses the movement that draws the
              eye to it in the first place.
            */}
            {settled && (
              <ResultToast
                key={`${questionIndex}-${verdict}`}
                verdict={verdict}
                detail={
                  verdict === 'correct'
                    ? undefined
                    : `${displayWord(question.word, settings.script)} — ${question.options[question.answerIndex]}`
                }
              />
            )}
            <OnbButton
              label={settled ? (isLastQuestion ? 'See my level' : 'Next question') : 'Confirm'}
              onPress={settled ? nextQuestion : confirm}
              disabled={!settled && picked === null}
            />
            <Text className="text-center font-nunito-semibold" style={{ ...t.footnote, color: c.textMuted }}>
              Question {questionIndex + 1} of {questions.length}
            </Text>
          </View>
          </OnbRise>
        }
      >
        <OnbRise index={0}>
          <View style={{ paddingTop: s.sm }}>
            <View style={{ marginTop: s.lg }}>
              <OnbTitle>Placement test</OnbTitle>
            </View>
            <OnbBody style={{ marginTop: s.sm }}>{'This short test finds the right starting\npoint for you.'}</OnbBody>
          </View>
        </OnbRise>

        <View className="flex-1 justify-center" style={{ paddingVertical: s.xl }}>
          <OnbRise index={1}>
          <View
            style={{
              backgroundColor: c.page,
              borderColor: c.border,
              borderWidth: 1,
              borderRadius: onbRadius.cardLarge,
              paddingHorizontal: s.lg,
              paddingTop: s.xl,
              paddingBottom: s.lg,
            }}
          >
            <Text className="text-center font-nunito-bold" style={{ fontSize: 14.5, color: c.greenDark }}>
              {listening ? 'Which word did you hear?' : cloze ? 'Which word fits the gap?' : 'What does this mean?'}
            </Text>

            {listening ? (
              /*
               * No characters and no pinyin on the prompt — both would be a
               * transcript of the thing being tested. The only clue is the
               * audio, and the replay button is the whole prompt.
               */
              <View className="items-center" style={{ marginTop: s.lg, marginBottom: s.sm }}>
                <Pressable
                  onPress={() => {
                    playTapSound()
                    speak(displayWord(question.word, settings.script))
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Play the word again"
                  className="items-center justify-center rounded-full active:opacity-80"
                  style={{ width: 76, height: 76, backgroundColor: c.greenSoft, borderWidth: 2, borderColor: c.green }}
                >
                  <Volume2 size={32} color={c.greenDark} strokeWidth={2.2} />
                </Pressable>
                <Text
                  className="font-nunito-semibold"
                  style={{ ...t.footnote, color: c.textMuted, marginTop: s.sm }}
                >
                  Tap to hear it again
                </Text>
              </View>
            ) : cloze ? (
              /*
               * The sentence with the word cut out of it, and its translation
               * underneath as the clue. No pinyin: the reading would name the
               * missing word outright, which is the whole question. The sentence
               * comes from the bank's own examples and is never invented — see
               * `buildPlacementQuestions`.
               */
              <View style={{ marginTop: s.md }}>
                <Text
                  className="text-center font-hanzi-sans-bold"
                  style={{ fontSize: 26, lineHeight: 42, color: c.navy }}
                >
                  {question.sentence}
                </Text>
                {question.translation && (
                  <Text
                    className="text-center font-nunito-semibold"
                    style={{ ...t.body, color: c.textSecondary, marginTop: s.sm }}
                  >
                    {question.translation}
                  </Text>
                )}
              </View>
            ) : (
              <>
                <Text
                  className="text-center font-hanzi-sans-bold"
                  style={{ fontSize: 46, lineHeight: 60, color: c.navy, marginTop: s.md }}
                >
                  {displayWord(question.word, settings.script)}
                </Text>
                <Text
                  className="text-center font-nunito-semibold"
                  style={{ fontSize: 15, color: c.textSecondary, marginTop: 2 }}
                >
                  {displayPinyin(question.word, settings.phoneticScript)}
                </Text>
              </>
            )}

            <View style={{ gap: s.sm, marginTop: s.md }}>
              {question.options.map((option, index) => {
                const isAnswer = index === question.answerIndex
                const chosen = picked === index
                /*
                 * Colour only after Confirm. While choosing, a selected option
                 * is just selected — showing right/wrong on tap would make the
                 * Confirm button pointless and let the learner shop for the
                 * green one before committing.
                 */
                const showRight = settled && isAnswer
                const showWrong = settled && chosen && !isAnswer
                return (
                  <Pressable
                    key={option}
                    onPress={() => pick(index)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: chosen, disabled: settled }}
                    accessibilityLabel={option}
                    className="flex-row items-center active:opacity-90"
                    style={{
                      borderRadius: onbRadius.card,
                      borderWidth: 1.5,
                      borderColor: showRight
                        ? c.green
                        : showWrong
                          ? c.coral
                          : chosen
                            ? c.green
                            : c.border,
                      backgroundColor: showRight
                        ? c.greenSoft
                        : showWrong
                          ? c.coralSoft
                          : chosen
                            ? c.greenSoft
                            : c.card,
                      paddingHorizontal: s.md,
                      paddingVertical: listening ? s.sm : s.md,
                      gap: s.md,
                    }}
                  >
                    <Radio selected={chosen || showRight} size={20} />
                    <Text
                      className={listening ? 'flex-1 font-hanzi-sans-bold' : 'flex-1 font-nunito-semibold'}
                      style={{
                        fontSize: listening ? 22 : 14,
                        lineHeight: listening ? 32 : undefined,
                        color: c.navy,
                      }}
                      numberOfLines={2}
                    >
                      {option}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            {/*
              Kept inside the card and only before an answer is in. Once the
              verdict is showing there is nothing left to not know.
            */}
            {!settled && (
              <View style={{ marginTop: s.md }}>
                <DontKnowButton onPress={dontKnow} />
              </View>
            )}
          </View>
          </OnbRise>
        </View>
      </OnbShell>
    )
  }

  // --- Ready -----------------------------------------------------------------

  return (
    <OnbShell
      art={
        <ArtLayer>
          {/*
            Starts below the top bar, not at the very top edge. This is the one
            page with both a Skip control and a right-hand branch, and at the
            corner the blossoms sat directly behind the word.
          */}
          <OnbArtEnter>
            <SakuraCorner side="right" width={columnWidth * 0.38} top={40} inset={-16} />
          </OnbArtEnter>
          <OnbArtEnter delay={onbMotion.riseStagger * 2} distance={20}>
            <Cloud variant="a" width={54} top={150} left={10} />
            <Cloud variant="c" width={48} top={268} right={14} />
          </OnbArtEnter>
        </ArtLayer>
      }
      top={
        <OnbRise distance={0}>
          <OnbTopBar right={<OnbSkip onPress={finish} />} />
        </OnbRise>
      }
      footer={
        <OnbRise index={3}>
          <View style={{ gap: s.md }}>
            <OnbButton
              label="Start learning"
              icon={<Rocket size={18} color="#ffffff" strokeWidth={2.4} />}
              onPress={finish}
            />
            <Text className="text-center font-nunito-semibold" style={{ ...t.footnote, color: c.textMuted }}>
              {'You can change this anytime\nin settings.'}
            </Text>
          </View>
        </OnbRise>
      }
    >
      <OnbRise index={0} style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center" style={{ minHeight: 160, paddingTop: s.sm }}>
          <Shifu pose="thumb" width={columnWidth * 0.46} halo />
        </View>
      </OnbRise>

      <OnbRise index={1}>
        <View className="items-center" style={{ marginTop: s.lg }}>
          <OnbTitle>You're all set!</OnbTitle>
          <OnbBody style={{ marginTop: s.sm }}>{'We’ve created a learning plan\njust for you.'}</OnbBody>
        </View>
      </OnbRise>

      <OnbRise index={2}>
      <View
        style={{
          marginTop: s.xl,
          marginBottom: s.sm,
          backgroundColor: c.greenSoft,
          borderColor: '#DEEFE1',
          borderWidth: 1,
          borderRadius: onbRadius.cardLarge,
          paddingHorizontal: s.lg,
          paddingVertical: s.xs,
        }}
      >
        {/*
          The HSK number rides alongside the word, because only one of them is
          actionable. "Beginner" says how it feels; "HSK 2" is the thing the
          learner can look up, compare a word list against, and use to tell
          which vocabulary is meant to be inside their range and which isn't.
        */}
        <SummaryRow icon={<BarChart3 size={18} color={c.greenDark} strokeWidth={2.4} />} label="Your level">
          {`${LEVEL_LABEL[estimatedHsk] ?? 'Beginner'} · HSK ${estimatedHsk}`}
        </SummaryRow>
        <RowRule tint="#DEEFE1" />
        <SummaryRow icon={<Footprints size={18} color={c.greenDark} strokeWidth={2.4} />} label="Learning path">
          {GOAL_LABEL[goal]}
        </SummaryRow>
        <RowRule tint="#DEEFE1" />
        <SummaryRow icon={<CalendarDays size={18} color={c.greenDark} strokeWidth={2.4} />} label="Daily goal">
          {settings.dailyNewWordLimit} words
        </SummaryRow>
      </View>
      </OnbRise>
    </OnbShell>
  )
  }

  return (
    <>
      <OnbPageTransition pageKey={step} direction={direction}>
        {renderPage()}
      </OnbPageTransition>

      {/*
        Mounted outside the transition, not inside the account page. A Modal
        rendered within the page tree would be unmounted the moment the page
        slid away — which is the very transition choosing an account triggers,
        so the sheet would vanish mid-dismissal.
      */}
    </>
  )
}

// --- Page pieces ---------------------------------------------------------------

/** The app icon: rounded green tile, 中, with a sakura bloom on its corner. */
function AppMark() {
  return (
    <View>
      <View
        className="items-center justify-center"
        style={{ width: 66, height: 66, borderRadius: 19, backgroundColor: c.green }}
      >
        <Text className="font-hanzi-sans-bold text-white" style={{ fontSize: 33, lineHeight: 42 }}>
          中
        </Text>
      </View>
      <Bloom style={{ position: 'absolute', right: -7, bottom: -4 }} />
    </View>
  )
}

/** A five-petal sakura bloom, drawn rather than imported — it is 14pt wide. */
function Bloom({ style }: { style?: object }) {
  return (
    <View style={[{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }, style]}>
      {[0, 72, 144, 216, 288].map((angle) => (
        <View
          key={angle}
          style={{
            position: 'absolute',
            width: 9,
            height: 9,
            borderRadius: 4.5,
            backgroundColor: '#F6B8B0',
            transform: [{ rotate: `${angle}deg` }, { translateY: -5 }],
          }}
        />
      ))}
      <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#EE9A92' }} />
    </View>
  )
}

function RowRule({ tint = c.hairline }: { tint?: string }) {
  return <View style={{ height: 1, backgroundColor: tint }} />
}

function FeatureRow({
  tone,
  glyph,
  icon,
  title,
  body,
}: {
  tone: OnbTone
  glyph?: string
  icon?: React.ReactNode
  title: string
  body: string
}) {
  return (
    <View className="flex-row items-center" style={{ gap: s.md, paddingVertical: s.md }}>
      <View
        className="items-center justify-center rounded-full"
        style={{ width: 38, height: 38, backgroundColor: toneColors(tone).solid }}
      >
        {glyph ? (
          <Text className="font-hanzi-sans-bold text-white" style={{ fontSize: 18, lineHeight: 24 }}>
            {glyph}
          </Text>
        ) : (
          icon
        )}
      </View>
      <View className="flex-1">
        <Text className="font-nunito-bold" style={{ ...t.cardTitle, color: c.navy }}>
          {title}
        </Text>
        <Text className="font-nunito-semibold" style={{ ...t.cardBody, color: c.textSecondary, marginTop: 1 }}>
          {body}
        </Text>
      </View>
    </View>
  )
}

/**
 * Confirmation of which Google account the learner picked.
 *
 * Read-only on purpose. It is there to answer "signed in as who?" without
 * making the address look like another box to fill in — the one editable field
 * on that page is the name.
 */
function SignedInRow({ email }: { email: string }) {
  return (
    <View
      className="flex-row items-center"
      style={{
        borderRadius: onbRadius.card,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.greenSoft,
        paddingHorizontal: s.lg,
        paddingVertical: s.md,
        gap: s.md,
      }}
    >
      <GoogleMark />
      <View style={{ flex: 1 }}>
        <Text className="font-nunito-semibold" style={{ fontSize: 12, color: c.textSecondary }}>
          Signed in with Google
        </Text>
        <Text className="font-nunito-bold" style={{ fontSize: 14, color: c.navy }} numberOfLines={1}>
          {email}
        </Text>
      </View>
      <Check size={18} color={c.green} strokeWidth={3} />
    </View>
  )
}

function AuthButton({
  label,
  icon,
  onPress,
  disabled = false,
}: {
  label: string
  icon: React.ReactNode
  onPress: () => void
  /* Safe to pass here where it would not be on a card: this button is its own
     target with nothing pressable inside it, so the `pointer-events: none` that
     a disabled Pressable takes on under react-native-web has nothing to swallow. */
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      className="active:opacity-90"
      style={{ opacity: disabled ? 0.6 : 1 }}
    >
      <OnbCard style={{ height: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: s.xl, gap: s.md }}>
        {icon}
        <Text className="font-nunito-bold" style={{ fontSize: 15.5, color: c.navy }}>
          {label}
        </Text>
      </OnbCard>
    </Pressable>
  )
}

function SummaryRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <View className="flex-row items-center" style={{ gap: s.md, paddingVertical: s.md }}>
      <View style={{ width: 22, alignItems: 'center' }}>{icon}</View>
      <View className="flex-1">
        <Text className="font-nunito-semibold" style={{ fontSize: 12.5, color: c.greenDark }}>
          {label}
        </Text>
        <Text className="font-nunito-bold" style={{ fontSize: 15, color: c.navy, marginTop: 1 }}>
          {children}
        </Text>
      </View>
    </View>
  )
}
