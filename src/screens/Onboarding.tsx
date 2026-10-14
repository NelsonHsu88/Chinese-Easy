import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, Platform } from 'react-native'
import { router } from 'expo-router'
import {
  Sprout,
  Luggage,
  GraduationCap,
  Flower2,
  Mail,
  Bell,
  ChartColumn,
  Footprints,
  CalendarDays,
  Volume2,
  Star,
  Rocket,
  Check,
  ArrowRight,
  ChevronRight,
  Settings as SettingsIcon,
  User,
  Lock,
  Sunrise,
  Sun,
  Moon,
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
  DontKnowButton,
  toneColors,
  type OnbTone,
} from '../components/onboarding/parts'
import { GoogleMark } from '../components/onboarding/GoogleMark'
import { AppleSignInButton } from '../components/auth/AppleSignInButton'
import { useCaptcha } from '../components/auth/Captcha'
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../lib/passwordRules'
import { useAuth } from '../context/AuthContext'
import { ArtLayer } from '../components/onboarding/PageArt'
import { CornerBranch, PageFoot, HeroArt, useClearance } from '../components/onboarding/RedesignArt'
import { emailError as emailProblem, fieldForServerError, logInErrors, signUpErrors, type AuthField, type FieldErrors } from '../lib/authForm'
import {
  onbColors as c,
  onbSpacing as s,
  onbType as t,
  onbRadius,
  onbMotion,
  onbVerdict,
  onbShadow,
  type VerdictKind,
} from '../components/onboarding/tokens'
import { newPlacementSeed, placementDistractorPool, samplePlacementItems } from '../data/placementTest'
import { buildPlacementQuestions } from '../lib/placementQuiz'
import { computeEstimatedHsk } from '../lib/placement'
import { displayWord, displayPinyin, defaultPhoneticFor, hanziFont } from '../lib/hanzi'
import { speak } from '../lib/speech'
import { todayISO } from '../lib/date'
import { playCorrectSound, playPositiveChime, playRetryTone, playFanfare, playTapSound } from '../lib/sound'
import { shortGloss } from '../lib/definitions'
import { tapHaptic, tickHaptic, successHaptic, carefulHaptic, correctHaptic } from '../lib/haptics'
import { AnswerSheet } from '../components/drills/parts'
import { listenColors } from '../components/listening/tokens'
import type { LearningGoal, PlacementAnswer, ScriptMode } from '../types'
import { ShadowSurface } from '../components/shadowReveal'

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
 *
 * Built to the Beta 2.1 references "Onboarding New UI Redesign" 1–7 (and 4.1
 * for the email route). Their watercolour — Shifu's four scenes, each page's
 * branch and foot — is cropped out of the references themselves (see
 * `RedesignArt`), which replaced the stand-in mascot assembled from props. The
 * placement test is the exception: by request it keeps its original card,
 * title and sizes, and only its scenery changed.
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
 * Google or Apple ('provider') has already signed in and supplied an address,
 * so that path asks for a name and nothing else; email sign-up asks for a name,
 * an address and a password; log-in asks for the address and password alone,
 * since the account already knows the name. Same screen, same artwork — only
 * the field list differs.
 */
type AuthMode = 'provider' | 'email' | 'login'

const GOALS: { id: LearningGoal; title: string; body: string; icon: typeof Sprout; tone: OnbTone }[] = [
  {
    id: 'daily-life',
    title: 'Learn for daily life',
    body: 'Start conversations and understand the basics.',
    icon: Sprout,
    tone: 'green',
  },
  {
    id: 'travel',
    title: 'Travel with confidence',
    body: 'Navigate trips and connect with locals.',
    icon: Luggage,
    tone: 'coral',
  },
  {
    id: 'exam',
    title: 'Study & exam prep',
    body: 'Prepare for HSK and academic goals.',
    icon: GraduationCap,
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

/**
 * The three reminder times the reminders page offers, as the reference draws
 * them. They write the same `settings.reminderTime` (24-hour `HH:MM`) that
 * Settings → Reminders edits with a full time picker, so any other time is
 * still one screen away.
 */
type ReminderSlot = 'morning' | 'afternoon' | 'evening'
const REMINDER_SLOTS: { id: ReminderSlot; label: string; time: string; display: string }[] = [
  { id: 'morning', label: 'Morning', time: '09:00', display: '9:00 AM' },
  { id: 'afternoon', label: 'Afternoon', time: '12:00', display: '12:00 PM' },
  { id: 'evening', label: 'Evening', time: '20:00', display: '8:00 PM' },
]

export function Onboarding() {
  const { completeOnboarding, updateSettings, settings, onboardingComplete, offerTour } = useApp()

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

  const { signInWithGoogle, signInWithApple, signUpWithEmail, signInWithEmail, sendPasswordReset } = useAuth()
  const [googleBusy, setGoogleBusy] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('email')
  const viaProvider = authMode === 'provider'
  /* Two widgets, one per page: the page transition mounts both pages at once,
     and one Turnstile token can't serve two forms. Inert until a site key is set. */
  const captcha = useCaptcha()
  const appleCaptcha = useCaptcha()
  /** Set after "Forgot password?" — the address a reset link was sent to. */
  const [resetSentTo, setResetSentTo] = useState<string | null>(null)
  const [passwordInput, setPasswordInput] = useState('')
  const [confirmInput, setConfirmInput] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  /** Set once sign-up succeeded but Supabase is waiting on the emailed link. */
  const [confirmSentTo, setConfirmSentTo] = useState<string | null>(null)
  /*
   * Seeded blank rather than from `settings.username`, whose default is the
   * literal string "Learner". Pre-filling the box with a placeholder name
   * invites the learner to press Continue and be called Learner forever.
   */
  const [nameInput, setNameInput] = useState('')
  const [emailInput, setEmailInput] = useState('')

  const trimmedName = nameInput.trim()
  const emailLooksValid = emailProblem(emailInput) === undefined
  const passwordLongEnough = passwordInput.length >= MIN_PASSWORD_LENGTH

  /*
   * The form's inline errors, the way sign-up forms generally do it: the button
   * opens up once every box has something in it, and pressing it checks them
   * all, drawing each problem in red under its own box. Before that, a box is
   * only judged once the learner leaves it with something typed — never while
   * they're still typing, and never for being empty when they haven't got to
   * it yet. A shown error then follows the value live, so it disappears the
   * moment it's fixed.
   */
  const formErrors: FieldErrors =
    authMode === 'login'
      ? logInErrors({ email: emailInput, password: passwordInput })
      : signUpErrors({ name: nameInput, email: emailInput, password: passwordInput, confirm: confirmInput })
  const [judged, setJudged] = useState<ReadonlySet<AuthField>>(() => new Set())
  /** An error the server put on one field ("already an account with that email"); cleared when that field is edited. */
  const [serverFieldError, setServerFieldError] = useState<{ field: AuthField; message: string } | null>(null)
  const judge = (field: AuthField, value: string) => {
    if (value.length > 0 && !judged.has(field)) setJudged(new Set(judged).add(field))
  }
  const fieldError = (field: AuthField) =>
    serverFieldError?.field === field ? serverFieldError.message : judged.has(field) ? formErrors[field] : undefined
  const edit = (field: AuthField, set: (value: string) => void) => (value: string) => {
    set(value)
    if (serverFieldError?.field === field) setServerFieldError(null)
  }

  const formFilled =
    authMode === 'login'
      ? emailInput.trim().length > 0 && passwordInput.length > 0
      : trimmedName.length > 0 && emailInput.trim().length > 0 && passwordInput.length > 0 && confirmInput.length > 0
  const canSubmitProfile =
    confirmSentTo !== null ||
    (!emailBusy && (viaProvider ? trimmedName.length > 0 : captcha.ready && formFilled))

  /* Where each sign-in page's form ends, so its painting can start below it. */
  const accountClearance = useClearance()
  const profileClearance = useClearance()

  /**
   * Takes an email route — sign-up or log-in — dropping anything Google
   * supplied on the way.
   *
   * Someone who picked a Google account, backed out, and chose email instead
   * has just declined that address — offering it back to them pre-filled in a
   * box labelled "Email" reads as the app not having listened. Values typed on
   * the email screen itself survive going back and forward, because the reset
   * only fires when the mode actually changes. Passwords never carry across a
   * mode change.
   */
  const startEmail = (mode: 'email' | 'login') => {
    if (viaProvider) {
      setNameInput('')
      setEmailInput('')
    }
    if (authMode !== mode) {
      setPasswordInput('')
      setConfirmInput('')
    }
    setEmailError(null)
    setJudged(new Set())
    setServerFieldError(null)
    setResetSentTo(null)
    setAuthMode(mode)
    goTo('profile')
  }

  /** Signed in by Google or Apple: same next step either way. */
  const providerSignedIn = (account: { email: string; name: string } | undefined) => {
    setAuthMode('provider')
    setEmailInput(account?.email ?? '')
    // The provider's display name is an opening offer, not a decision, so the
    // next screen still shows it in an editable box.
    setNameInput(account?.name ?? '')
    goTo('profile')
  }

  const continueWithApple = async () => {
    if (googleBusy) return
    tapHaptic()
    setGoogleError(null)
    setGoogleBusy(true)
    const result = await signInWithApple(appleCaptcha.token)
    appleCaptcha.reset()
    setGoogleBusy(false)
    if (result.cancelled) return
    if (result.error) {
      setGoogleError(result.error)
      return
    }
    providerSignedIn(result.account)
  }

  const forgotPassword = async () => {
    if (emailBusy) return
    if (!emailLooksValid) {
      setEmailError('Enter your email address above, then tap “Forgot password?” again.')
      return
    }
    if (!captcha.ready) {
      setEmailError('Please complete the security check first.')
      return
    }
    setEmailError(null)
    setEmailBusy(true)
    const result = await sendPasswordReset(emailInput, captcha.token)
    captcha.reset()
    setEmailBusy(false)
    if (result.error) {
      setEmailError(result.error)
      return
    }
    setResetSentTo(emailInput.trim())
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

    providerSignedIn(result.account)
  }

  /*
   * The reminders page's choices, committed only by its buttons. Seeded from
   * what is stored, so returning to the page shows the real setting; a stored
   * time that is none of the three (set in Settings) leaves Morning picked,
   * as the reference does, rather than silently rewriting it until the learner
   * presses the button.
   */
  const [remindersOn, setRemindersOn] = useState(true)
  const [reminderSlot, setReminderSlot] = useState<ReminderSlot>(
    () => REMINDER_SLOTS.find((slot) => slot.time === settings.reminderTime)?.id ?? 'morning',
  )

  const finishProfile = (username: string) => {
    updateSettings({ username, email: emailInput.trim() })
    playPositiveChime()
    goTo('notifications')
  }

  const submitProfile = async () => {
    // Google or Apple has already signed in, and a sent confirmation has nothing left to do.
    if (viaProvider || confirmSentTo !== null) {
      finishProfile(trimmedName || settings.username)
      return
    }
    if (emailBusy) return
    const fields = Object.keys(formErrors) as AuthField[]
    if (fields.length > 0) {
      setJudged(new Set(fields))
      setEmailError(null)
      carefulHaptic()
      return
    }
    setEmailError(null)
    setServerFieldError(null)
    setEmailBusy(true)
    const result =
      authMode === 'login'
        ? await signInWithEmail(emailInput, passwordInput, captcha.token)
        : await signUpWithEmail(emailInput, passwordInput, trimmedName, captcha.token)
    // Turnstile tokens are single-use, pass or fail.
    captcha.reset()
    setEmailBusy(false)

    if (result.error) {
      const field = fieldForServerError(result.error)
      if (field) setServerFieldError({ field, message: result.error })
      else setEmailError(result.error)
      carefulHaptic()
      return
    }
    setPasswordInput('')
    setConfirmInput('')
    if (result.needsEmailConfirmation) {
      // The app works signed out, so onboarding carries on; the session arrives
      // when the link is opened. Saying so beats a spinner that never ends.
      updateSettings({ username: trimmedName, email: emailInput.trim() })
      setConfirmSentTo(emailInput.trim())
      return
    }
    finishProfile(authMode === 'login' ? result.account?.name || settings.username : trimmedName)
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
   * Out of onboarding and onto the Dashboard, where Shifu offers the tour once
   * the page has settled — offered, not started: the learner can say no.
   *
   * A retake is exempt. It comes from Settings and only redoes the placement
   * test; the learner has already been round the app once, and walking them
   * through it again would read as the app forgetting them.
   */
  const finish = () => {
    playFanfare()
    successHaptic()
    if (!isRetake) offerTour()
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
      playCorrectSound()
      correctHaptic()
    } else {
      playRetryTone()
      carefulHaptic()
    }
  }

  const dontKnow = () => {
    if (verdict) return
    setPicked(null)
    setVerdict('unsure')
    tickHaptic()
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
            {/* The branch enters from the side it grows from. */}
            <SlideIn from="left" fill delay={onbMotion.enterStagger}>
              <CornerBranch piece="welcome-branch" side="left" />
            </SlideIn>
          </ArtLayer>
        }
        /*
         * No scrolling here. Everything is sized to fit the viewport, and the
         * hero scene absorbs the slack — a welcome screen you can nudge up and
         * down by a few pixels reads as broken rather than as scrollable.
         *
         * No Skip either: the reference has none, and the page's one button
         * already moves on.
         */
        scroll={false}
        footer={
          <SlideIn from="bottom" delay={onbMotion.enterStagger * 3}>
            <View style={{ gap: s.lg }}>
              <OnbButton
                label="Let's get started"
                icon={<ArrowRight size={20} color="#ffffff" strokeWidth={2.4} />}
                onPress={() => goTo('script')}
              />
              <OnbDots index={DOT_INDEX.welcome!} total={DOT_TOTAL} />
            </View>
          </SlideIn>
        }
      >
        <SlideIn from="bottom" delay={0}>
          <View className="items-center" style={{ paddingTop: s.xxxl }}>
            {/* The room the app mark used to take, kept by request: the title
                sat right where it was, and the page is balanced around it. */}
            <View style={{ height: WELCOME_MARK_ROOM + s.lg }} />
            <OnbTitle hero>Chinese Easy</OnbTitle>
            <OnbBody style={{ marginTop: s.sm }}>{'Learn Mandarin the natural,\nstress-free way.'}</OnbBody>
          </View>
        </SlideIn>

        {/*
          Shifu at his writing desk, in the garden. The scene is the page's
          slack: it takes whatever the header, card and footer leave, so the
          page stays on one screen on every phone without a scroll view.
        */}
        <SlideIn from="bottom" delay={onbMotion.enterStagger * 2} style={{ flex: 1, minHeight: 0 }}>
          <HeroArt piece="welcome-hero" />
        </SlideIn>

        <SlideIn from="bottom" delay={onbMotion.enterStagger * 3}>
          <OnbCard radius={onbRadius.panel} style={{ paddingHorizontal: s.lg, paddingVertical: s.xs, marginBottom: s.xs }}>
            <FeatureRow
              tone="green"
              glyph="字"
              title="Understand characters"
              body="Learn the building blocks of Chinese."
            />
            <RowRule />
            <FeatureRow
              tone="coral"
              icon={<Volume2 size={18} color="#ffffff" strokeWidth={2.4} />}
              title="Learn naturally"
              body="Real pronunciations and useful examples."
            />
            <RowRule />
            <FeatureRow
              tone="gold"
              icon={<Star size={17} color="#ffffff" strokeWidth={2.4} fill="#ffffff" />}
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
            <OnbArtEnter>
              <CornerBranch piece="script-branch" side="left" />
            </OnbArtEnter>
          </ArtLayer>
        }
        top={
          <OnbRise distance={0}>
            <OnbTopBar onBack={goBack} right={<OnbSkip onPress={skipToTest} />} />
          </OnbRise>
        }
        /*
         * Button, then dots — the same footer every other page has, so this
         * page's Continue lands on the same line as theirs. The reassurance line
         * sits under the cards instead, where it belongs: it is about the
         * choice, not about the button.
         */
        footer={
          <OnbRise index={4}>
            <View style={{ gap: s.lg }}>
              <OnbButton
                label="Continue"
                icon={<ArrowRight size={20} color="#ffffff" strokeWidth={2.4} />}
                onPress={() => {
                  /* Written to the one global preference, not an onboarding-only
                     copy — Settings → Learning preferences reads and writes the
                     same field, so the choice is already made when the learner
                     gets there. */
                  updateSettings({ script, phoneticScript: defaultPhoneticFor(script) })
                  goTo('goal')
                }}
              />
              <OnbDots index={DOT_INDEX.script} total={DOT_TOTAL} />
            </View>
          </OnbRise>
        }
      >
        <OnbRise index={0}>
          <View style={{ paddingTop: s.lg }}>
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
          <View className="flex-row" style={{ gap: s.md, marginTop: s.xxl }}>
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
          stall on it; one who knows it is reversible picks one and moves on.
        */}
        <OnbRise index={2}>
          <View className="flex-row items-center justify-center" style={{ gap: s.sm, marginTop: s.lg }}>
            <SettingsIcon size={16} color={c.textMuted} strokeWidth={2.2} />
            <Text className="font-nunito-semibold" style={{ ...t.footnote, color: c.textMuted }}>
              You can change this any time in Settings.
            </Text>
          </View>
        </OnbRise>

        {/*
          Shifu writing at his desk by the lake. The flexed wrapper is outside
          `OnbRise` as well as on it: `OnbRise` renders a content-sized
          `Animated.View`, and a flexing child of one has no height to claim.
        */}
        <View className="flex-1" style={{ minHeight: 0, marginTop: s.md }}>
          <OnbRise index={3} style={{ flex: 1, minHeight: 0 }}>
            <HeroArt piece="script-hero" />
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
            <OnbArtEnter>
              <CornerBranch piece="goal-branch" side="right" />
            </OnbArtEnter>
            {/*
              The lake and pagodas rise rather than drifting sideways: the foot
              is pinned to the bottom edge, and a landscape entering from the
              side slides its own shoreline past the page border.
            */}
            <SlideIn from="bottom" fill distance={onbMotion.artSlide} duration={onbMotion.art}>
              <PageFoot piece="goal-foot" />
            </SlideIn>
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
                icon={<ArrowRight size={20} color="#ffffff" strokeWidth={2.4} />}
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
          <View style={{ paddingTop: s.xl }}>
            <OnbTitle>What's your goal?</OnbTitle>
            <OnbBody style={{ marginTop: s.sm }}>{'This helps us personalise your\nlearning experience.'}</OnbBody>
          </View>
        </OnbRise>

        {/*
          The four cards come up one after another rather than as a block — the
          stagger is what makes the list read as being dealt out. The column is
          inset a little past the page margin, as drawn, so the landscape shows
          either side of the cards.
        */}
        <View className="flex-1" style={{ gap: s.md, paddingTop: s.xxl, paddingBottom: s.xl, paddingHorizontal: s.sm }}>
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
                  icon={<Icon size={26} color={toneColors(option.tone).solid} strokeWidth={2.2} />}
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
              <CornerBranch piece="account-branch" side="right" />
            </OnbArtEnter>
            <SlideIn from="bottom" fill distance={onbMotion.artSlide} duration={onbMotion.art}>
              <PageFoot piece="account-foot" clearBelow={accountClearance.bottom} />
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
          Header and options sit together in the upper part of the page, with
          the lake and pagoda taking the room below — the reference's balance.
          The bottom padding is that room: it keeps the options clear of the
          painting on a tall phone, and the page scrolls on a short one.
        */}
        <View className="flex-1 justify-center" style={{ paddingBottom: s.huge * 3 }}>
          <OnbRise index={0}>
            <View className="items-center">
              <OnbTitle>Create your account</OnbTitle>
              <OnbBody style={{ marginTop: s.sm }}>
                {'Join thousands of learners and start\nyour Mandarin journey.'}
              </OnbBody>
            </View>
          </OnbRise>

          <View
            ref={accountClearance.ref}
            onLayout={accountClearance.onLayout}
            style={{ gap: s.md, paddingTop: s.xxl, paddingHorizontal: s.sm }}
          >
            {/*
              Google's hands off to Google's own page and comes back with a
              session; the email route leads to the details step, which asks for
              a name, an address and a password and creates a Supabase account.

              **No account is ever suggested here.** This used to open a mock
              picker listing a hardcoded address, which meant every learner was
              shown the developer's own email as the account to sign in with.
              Whose account this is, is Google's answer to give, not ours.

              Apple sits first on iOS (and nowhere else): App Review requires
              it beside Google, and it's the one-tap option on an iPhone.
            */}
            <OnbRise index={1}>
              {Platform.OS === 'ios' && (
                <View style={{ marginBottom: s.md }}>
                  <AppleSignInButton onPress={() => void continueWithApple()} disabled={googleBusy || !appleCaptcha.ready} />
                  {appleCaptcha.widget}
                </View>
              )}
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
              <View className="flex-row items-center" style={{ gap: s.md, marginVertical: s.xs, paddingHorizontal: s.lg }}>
                <View style={{ flex: 1, height: 1, backgroundColor: c.hairline }} />
                <Text className="font-nunito-semibold" style={{ ...t.footnote, color: c.textMuted }}>
                  or
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: c.hairline }} />
              </View>
            </OnbRise>

            {/*
              Drawn like a field, as the reference has it, but it is a button:
              the address itself is asked for on the next page, beside the name.
            */}
            <OnbRise index={3}>
              <AuthButton
                label="Email address"
                muted
                icon={<Mail size={22} color={c.textSecondary} strokeWidth={1.9} />}
                onPress={() => {
                  tapHaptic()
                  startEmail('email')
                }}
              />
            </OnbRise>

            <OnbRise index={4}>
              <View className="flex-row items-center justify-center" style={{ gap: 6, marginTop: s.lg }}>
                <Text className="font-nunito-semibold" style={{ fontSize: 14.5, color: c.textSecondary }}>
                  Already have an account?
                </Text>
                {/*
                  Real log-in: address and password. The name comes back from
                  the account (stored at sign-up), so a returning learner isn't
                  greeted as "Learner".
                */}
                <Pressable onPress={() => startEmail('login')} accessibilityRole="button" hitSlop={10}>
                  <Text className="font-lora-bold" style={{ fontSize: 15.5, color: c.greenDark }}>
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
   * The details step, reached from either sign-in option: the reference's
   * "A few details". The field list is the only thing that differs by route.
   * Google has already supplied an address, so that path asks for a name alone
   * and shows the account it signed in with; the email path asks for both.
   */
  if (step === 'profile') {
    return (
      <OnbShell
        art={
          <ArtLayer>
            <OnbArtEnter>
              <CornerBranch piece="profile-branch" side="right" />
            </OnbArtEnter>
            <SlideIn from="bottom" fill distance={onbMotion.artSlide} duration={onbMotion.art}>
              <PageFoot piece="profile-foot" clearBelow={confirmSentTo === null ? profileClearance.bottom : null} />
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
              <OnbButton
                label={
                  emailBusy
                    ? authMode === 'login' ? 'Logging in…' : 'Creating account…'
                    : confirmSentTo !== null
                      ? 'Continue'
                      : authMode === 'login'
                        ? 'Log in'
                        : authMode === 'email' ? 'Create account' : 'Continue'
                }
                icon={<ArrowRight size={20} color="#ffffff" strokeWidth={2.4} />}
                onPress={() => void submitProfile()}
                disabled={!canSubmitProfile}
              />
              <OnbDots index={DOT_INDEX.profile!} total={DOT_TOTAL} />
            </View>
          </OnbRise>
        }
      >
        <View className="flex-1" style={{ paddingTop: s.xl, paddingBottom: s.huge * 2 }}>
          <OnbRise index={0}>
            <View className="items-center">
              <OnbTitle>
                {confirmSentTo !== null ? 'Check your inbox' : authMode === 'login' ? 'Welcome back' : 'A few details'}
              </OnbTitle>
              <OnbBody style={{ marginTop: s.sm }}>
                {confirmSentTo !== null
                  ? `We sent a link to ${confirmSentTo}.\nOpen it to finish creating your account —\nyou can keep going in the meantime.`
                  : viaProvider
                    ? 'Almost there — what should we\ncall you?'
                    : authMode === 'login'
                      ? 'Log in with your email\nand password.'
                      : 'Tell us your name and choose\na password for your account.'}
              </OnbBody>
            </View>
          </OnbRise>

          {confirmSentTo === null && (
            <View
              ref={profileClearance.ref}
              onLayout={profileClearance.onLayout}
              style={{ gap: s.xl, paddingTop: s.xxl, paddingHorizontal: s.sm }}
            >
              {viaProvider && (
                <OnbRise index={1}>
                  <SignedInRow email={emailInput} />
                </OnbRise>
              )}

              {authMode !== 'login' && (
                <OnbRise index={viaProvider ? 2 : 1}>
                  <OnbTextField
                    label="What should we call you?"
                    value={nameInput}
                    onChangeText={edit('name', setNameInput)}
                    onBlur={() => judge('name', nameInput)}
                    error={fieldError('name')}
                    placeholder="Your name"
                    autoCapitalize="words"
                    autoComplete="username"
                    maxLength={24}
                    icon={<User size={22} color={c.textSecondary} strokeWidth={1.9} />}
                  />
                </OnbRise>
              )}

              {!viaProvider && (
                <OnbRise index={2}>
                  <OnbTextField
                    label="Email"
                    value={emailInput}
                    onChangeText={edit('email', setEmailInput)}
                    onBlur={() => judge('email', emailInput)}
                    error={fieldError('email')}
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    icon={<Mail size={22} color={c.textSecondary} strokeWidth={1.9} />}
                  />
                </OnbRise>
              )}

              {!viaProvider && (
                <OnbRise index={3}>
                  <OnbTextField
                    label="Password"
                    value={passwordInput}
                    onChangeText={edit('password', setPasswordInput)}
                    onBlur={() => judge('password', passwordInput)}
                    error={fieldError('password')}
                    placeholder={authMode === 'login' ? 'Your password' : `At least ${MIN_PASSWORD_LENGTH} characters`}
                    autoCapitalize="none"
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    maxLength={MAX_PASSWORD_LENGTH}
                    secure
                    hint={
                      authMode === 'email' && passwordInput.length > 0 && !passwordLongEnough
                        ? `${MIN_PASSWORD_LENGTH - passwordInput.length} more character${MIN_PASSWORD_LENGTH - passwordInput.length === 1 ? '' : 's'} to go`
                        : undefined
                    }
                    icon={<Lock size={22} color={c.textSecondary} strokeWidth={1.9} />}
                  />
                </OnbRise>
              )}

              {authMode === 'email' && (
                <OnbRise index={3}>
                  <OnbTextField
                    label="Confirm password"
                    value={confirmInput}
                    onChangeText={edit('confirm', setConfirmInput)}
                    onBlur={() => judge('confirm', confirmInput)}
                    error={fieldError('confirm')}
                    placeholder="Type it again"
                    autoCapitalize="none"
                    autoComplete="new-password"
                    maxLength={MAX_PASSWORD_LENGTH}
                    secure
                    icon={<Lock size={22} color={c.textSecondary} strokeWidth={1.9} />}
                  />
                </OnbRise>
              )}

              {authMode === 'login' && (
                <OnbRise index={4}>
                  {resetSentTo !== null ? (
                    <Text className="text-center font-nunito-semibold" style={{ ...t.body, color: c.textSecondary }}>
                      {`If ${resetSentTo} has an account, a reset link is on its way. Open it on this device.`}
                    </Text>
                  ) : (
                    <View className="items-center">
                      <OnbTextButton label="Forgot password?" onPress={() => void forgotPassword()} />
                    </View>
                  )}
                </OnbRise>
              )}

              {!viaProvider && captcha.widget}

              {emailError !== null && (
                <Text
                  className="text-center font-nunito-semibold"
                  style={{ ...t.body, color: onbVerdict.incorrect.text }}
                >
                  {emailError}
                </Text>
              )}
            </View>
          )}
        </View>
      </OnbShell>
    )
  }

  if (step === 'notifications') {
    const slot = REMINDER_SLOTS.find((option) => option.id === reminderSlot) ?? REMINDER_SLOTS[0]
    return (
      <OnbShell
        art={
          <ArtLayer>
            <OnbArtEnter>
              <CornerBranch piece="reminders-branch" side="right" />
            </OnbArtEnter>
            <SlideIn from="bottom" fill distance={onbMotion.artSlide} duration={onbMotion.art}>
              {/* The footer's padding, "Maybe later" under the button, and half
                  the button: where the button's centre sits above the safe area. */}
              <PageFoot piece="reminders-foot" buttonCenter={s.md + 20 + s.md + 51 / 2} />
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
            <View style={{ gap: s.md }}>
              {/*
                With the switch off, the primary action is plainly "Continue" —
                a button saying "Turn on notifications" under a switch that says
                off would be the page contradicting itself.
              */}
              <OnbButton
                label={remindersOn ? 'Turn on notifications' : 'Continue'}
                icon={<ArrowRight size={20} color="#ffffff" strokeWidth={2.4} />}
                onPress={() => {
                  if (remindersOn) {
                    updateSettings({ notificationsEnabled: true, reminderTime: slot.time })
                    playPositiveChime()
                  } else {
                    updateSettings({ notificationsEnabled: false })
                  }
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

        {/* Shifu reading by the lake — the page's slack. The wrapper carries
            the flex, or the scene loses the room it absorbs. */}
        <View className="flex-1" style={{ minHeight: 0 }}>
          <OnbRise index={1} style={{ flex: 1, minHeight: 0 }}>
            <HeroArt piece="reminders-hero" />
          </OnbRise>
        </View>

        <OnbRise index={2}>
          <OnbCard radius={onbRadius.panel} style={{ padding: s.lg }}>
            <View className="flex-row items-center" style={{ gap: s.md }}>
              <View
                className="items-center justify-center rounded-full"
                style={{ width: 46, height: 46, backgroundColor: c.greenSoft }}
              >
                <Bell size={21} color={c.green} strokeWidth={2.1} />
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
              <Toggle
                value={remindersOn}
                label="Daily reminders"
                onChange={(next) => {
                  tickHaptic()
                  setRemindersOn(next)
                }}
              />
            </View>
          </OnbCard>
        </OnbRise>

        <OnbRise index={3}>
          <View className="flex-row" style={{ gap: s.sm, marginTop: s.md, marginBottom: s.xs, opacity: remindersOn ? 1 : 0.45 }}>
            {REMINDER_SLOTS.map((option) => (
              <TimeChip
                key={option.id}
                slot={option.id}
                label={option.label}
                time={option.display}
                selected={reminderSlot === option.id}
                disabled={!remindersOn}
                onPress={() => {
                  if (reminderSlot !== option.id) tickHaptic()
                  setReminderSlot(option.id)
                }}
              />
            ))}
          </View>
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
        /*
          The redesign changed this page's scenery and nothing else, by request:
          the card, its type and its spacing are exactly as they were, and the
          title keeps its original face (`classic`).
        */
        art={
          <ArtLayer>
            <OnbArtEnter>
              <CornerBranch piece="test-branch" side="right" />
            </OnbArtEnter>
            <SlideIn from="bottom" fill distance={onbMotion.artSlide} duration={onbMotion.art}>
              <PageFoot piece="test-foot" />
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
              <OnbTitle classic>Placement test</OnbTitle>
            </View>
            <OnbBody classic style={{ marginTop: s.sm }}>
              {'This short test finds the right starting\npoint for you.'}
            </OnbBody>
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
                    style={{ ...t.bodyClassic, color: c.textSecondary, marginTop: s.sm }}
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
          <SlideIn from="bottom" fill distance={onbMotion.artSlide} duration={onbMotion.art}>
            <PageFoot piece="ready-foot" />
          </SlideIn>
        </ArtLayer>
      }
      /* No Skip: the reference has none, and Start learning does the same. */
      footer={
        <OnbRise index={3}>
          <View style={{ gap: s.md }}>
            <OnbButton
              label="Start learning"
              icon={<Rocket size={19} color="#ffffff" strokeWidth={2.3} />}
              onPress={finish}
            />
            <Text className="text-center font-nunito-semibold" style={{ ...t.footnote, color: c.textMuted }}>
              {'You can change this anytime\nin settings.'}
            </Text>
          </View>
        </OnbRise>
      }
    >
      {/*
        Shifu with his hands together under the sun and the blossom, confetti
        round him — the whole top of the reference. It is the page's slack, so
        a short phone gives up sky before anything else moves.
      */}
      <View className="flex-1" style={{ minHeight: 0 }}>
        <OnbRise index={0} style={{ flex: 1, minHeight: 0 }}>
          <HeroArt piece="ready-hero" />
        </OnbRise>
      </View>

      <OnbRise index={1}>
        <View className="items-center" style={{ marginTop: s.sm }}>
          <OnbTitle>You're all set!</OnbTitle>
          <OnbBody style={{ marginTop: s.sm }}>{'We’ve created a personalised\nlearning plan just for you.'}</OnbBody>
        </View>
      </OnbRise>

      <OnbRise index={2}>
        <OnbCard
          radius={onbRadius.panel}
          style={{ marginTop: s.xl, marginBottom: s.sm, marginHorizontal: s.sm, paddingHorizontal: s.lg, paddingVertical: s.xs }}
        >
          {/*
            The HSK number rides alongside the word, because only one of them is
            actionable. "Beginner" says how it feels; "HSK 2" is the thing the
            learner can look up and compare a word list against.
          */}
          <SummaryRow tone="green" icon={<ChartColumn size={20} color={c.greenDark} strokeWidth={2.5} />} label="Your level">
            {`${LEVEL_LABEL[estimatedHsk] ?? 'Beginner'} · HSK ${estimatedHsk}`}
          </SummaryRow>
          <RowRule />
          <SummaryRow tone="coral" icon={<Footprints size={20} color={c.coral} strokeWidth={2.4} />} label="Learning path">
            {GOAL_LABEL[goal]}
          </SummaryRow>
          <RowRule />
          <SummaryRow tone="gold" icon={<CalendarDays size={20} color={c.gold} strokeWidth={2.4} />} label="Daily goal">
            {settings.dailyNewWordLimit} words per day
          </SummaryRow>
        </OnbCard>
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
        A confirmed placement answer rises as the review drills' answer sheet —
        same clouds, confetti and sounds, so the test feels like the app it
        places you into. Outside the transition so it lies over the whole
        screen, footer included, and keyed per answer so each one rises afresh.
      */}
      {step === 'test' && verdict && question ? (
        <AnswerSheet
          key={`${questionIndex}-${verdict}`}
          kind={verdict}
          onContinue={nextQuestion}
          continueLabel={questionIndex + 1 >= questions.length ? 'See my level' : 'Continue'}
          detail={
            <Text numberOfLines={2} style={{ fontFamily: 'NunitoSemiBold', fontSize: 15, lineHeight: 20, color: listenColors.slate }}>
              <Text className={hanziFont(settings.script, 'medium')} style={{ fontSize: 18, color: listenColors.ink }}>
                {displayWord(question.word, settings.script)}
              </Text>
              {'  '}— {shortGloss(question.word)}
            </Text>
          }
        />
      ) : null}

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

/** The height of the app mark the welcome page once opened on; its room is kept. */
const WELCOME_MARK_ROOM = 70

function RowRule({ tint = c.hairline }: { tint?: string }) {
  return <View style={{ height: 1, backgroundColor: tint }} />
}

/** A tinted disc inside a paler ring — the redesign's icon badge. */
function RingIcon({ tone, size = 50, solid = false, children }: { tone: OnbTone; size?: number; solid?: boolean; children: React.ReactNode }) {
  const colors = toneColors(tone)
  const inner = Math.round(size * 0.72)
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: colors.soft }}
    >
      {solid ? (
        <View
          className="items-center justify-center rounded-full"
          style={{ width: inner, height: inner, backgroundColor: colors.solid }}
        >
          {children}
        </View>
      ) : (
        children
      )}
    </View>
  )
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
    <View className="flex-row items-center" style={{ gap: s.lg, paddingVertical: s.md }}>
      <RingIcon tone={tone} solid>
        {glyph ? (
          <Text className="font-hanzi-sans-bold text-white" style={{ fontSize: 18, lineHeight: 24 }}>
            {glyph}
          </Text>
        ) : (
          icon
        )}
      </RingIcon>
      <View className="flex-1">
        <Text className="font-nunito-bold" style={{ ...t.cardTitle, color: c.navy }}>
          {title}
        </Text>
        <Text className="font-nunito-semibold" style={{ ...t.cardBody, color: c.textSecondary, marginTop: 2 }}>
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
        borderRadius: onbRadius.cardLarge,
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
        <Text className="font-nunito-semibold" style={{ fontSize: 12.5, color: c.textSecondary }}>
          Signed in with Google
        </Text>
        <Text className="font-nunito-bold" style={{ fontSize: 14.5, color: c.navy }} numberOfLines={1}>
          {email}
        </Text>
      </View>
      <Check size={18} color={c.green} strokeWidth={3} />
    </View>
  )
}

/** A sign-in option: icon, serif label, chevron, on a white pill-cornered card. */
function AuthButton({
  label,
  icon,
  onPress,
  disabled = false,
  muted = false,
}: {
  label: string
  icon: React.ReactNode
  onPress: () => void
  /* Safe to pass here where it would not be on a card: this button is its own
     target with nothing pressable inside it, so the `pointer-events: none` that
     a disabled Pressable takes on under react-native-web has nothing to swallow. */
  disabled?: boolean
  /** The email row, drawn in the quieter ink of a field's placeholder. */
  muted?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={muted ? `Continue with ${label.toLowerCase()}` : label}
      accessibilityState={{ disabled }}
      className="active:opacity-90"
      style={{ opacity: disabled ? 0.6 : 1 }}
    >
      <OnbCard
        radius={24}
        style={{ height: 54, flexDirection: 'row', alignItems: 'center', paddingLeft: s.xl, paddingRight: s.lg, gap: s.lg }}
      >
        <View style={{ width: 26, alignItems: 'center' }}>{icon}</View>
        <Text
          className="flex-1 font-lora-bold"
          style={{ fontSize: 16.5, color: muted ? c.textSecondary : c.navy }}
          numberOfLines={1}
        >
          {label}
        </Text>
        <ChevronRight size={20} color={c.textSecondary} strokeWidth={2.2} />
      </OnbCard>
    </Pressable>
  )
}

/**
 * The on/off switch on the reminders card.
 *
 * Drawn rather than the platform `Switch`, whose track and thumb colours are
 * set differently on each platform and never quite land on this palette.
 */
function Toggle({ value, label, onChange }: { value: boolean; label: string; onChange: (next: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={8}
    >
      <View
        className="justify-center"
        style={{
          width: 52,
          height: 30,
          borderRadius: 15,
          backgroundColor: value ? c.green : c.dotInactive,
          paddingHorizontal: 3,
        }}
      >
        <ShadowSurface shadow={onbShadow}
          style={[{ borderRadius: 9999 }, {
            width: 24,
            height: 24,
            backgroundColor: '#ffffff',
            alignSelf: value ? 'flex-end' : 'flex-start',
          }]}
        />
      </View>
    </Pressable>
  )
}

const SLOT_ICON: Record<ReminderSlot, { icon: typeof Sun; color: string }> = {
  morning: { icon: Sunrise, color: c.green },
  afternoon: { icon: Sun, color: c.gold },
  evening: { icon: Moon, color: c.blue },
}

/** One of the three reminder times, with a tick badge on the chosen one. */
function TimeChip({
  slot,
  label,
  time,
  selected,
  disabled,
  onPress,
}: {
  slot: ReminderSlot
  label: string
  time: string
  selected: boolean
  disabled: boolean
  onPress: () => void
}) {
  const { icon: Icon, color } = SLOT_ICON[slot]
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="radio"
      accessibilityLabel={`${label}, ${time}`}
      accessibilityState={{ selected, disabled }}
      className="active:opacity-90"
      style={{ flex: 1 }}
    >
      <ShadowSurface shadow={onbShadow}
        style={[{ alignItems: 'center' }, {
          borderRadius: onbRadius.cardLarge,
          borderWidth: 1.5,
          borderColor: selected ? c.green : c.border,
          backgroundColor: selected ? c.greenSoft : c.card,
          paddingVertical: s.md,
        }]}
      >
        <Icon size={24} color={color} strokeWidth={2.1} />
        <Text className="font-nunito-bold" style={{ fontSize: 14.5, color: c.navy, marginTop: 6 }}>
          {label}
        </Text>
        <Text className="font-nunito-semibold" style={{ fontSize: 13.5, color: c.textSecondary, marginTop: 1 }}>
          {time}
        </Text>
        {selected && (
          <View
            className="items-center justify-center rounded-full"
            style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, backgroundColor: c.green }}
          >
            <Check size={12} color="#ffffff" strokeWidth={3.2} />
          </View>
        )}
      </ShadowSurface>
    </Pressable>
  )
}

function SummaryRow({
  tone,
  icon,
  label,
  children,
}: {
  tone: OnbTone
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <View className="flex-row items-center" style={{ gap: s.lg, paddingVertical: s.md }}>
      <RingIcon tone={tone} size={48}>
        {icon}
      </RingIcon>
      <View className="flex-1">
        <Text className="font-nunito-semibold" style={{ fontSize: 13.5, color: c.greenDark }}>
          {label}
        </Text>
        <Text className="font-nunito-bold" style={{ fontSize: 16.5, color: c.navy, marginTop: 2 }}>
          {children}
        </Text>
      </View>
    </View>
  )
}
