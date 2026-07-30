import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import {
  ThumbsUp,
  Eye,
  HelpCircle,
  GraduationCap,
  Sparkles,
  BookOpen,
  Compass,
  Bell,
  BellOff,
  type LucideIcon,
} from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import {
  OnboardingHeader,
  MascotPrompt,
  ShifuAvatar,
  DuoButton,
  ChoiceRow,
  ChoiceCard,
  LevelBars,
  OnboardingInput,
  PermissionSheet,
} from '../components/OnboardingKit'
import { placementItems } from '../data/placementTest'
import { computeEstimatedHsk } from '../lib/placement'
import { displayWord } from '../lib/hanzi'
import { todayISO } from '../lib/date'
import { playPositiveChime } from '../lib/sound'
import type { PlacementAnswer } from '../types'

const RED = '#ff6b6b'

type Step =
  | 'welcome'
  | 'login'
  | 'level'
  | 'goal'
  | 'notifications'
  | 'name'
  | 'email'
  | 'starting-point'
  | 'test'
  | 'result'

const PROGRESS: Partial<Record<Step, number>> = {
  level: 1 / 6,
  goal: 2 / 6,
  notifications: 3 / 6,
  name: 4 / 6,
  email: 5 / 6,
  'starting-point': 6 / 6,
}

const LEVEL_OPTIONS = [
  { level: 0, label: "I'm new to Chinese" },
  { level: 1, label: 'I know some common words' },
  { level: 2, label: 'I can have basic conversations' },
  { level: 3, label: 'I can discuss most topics in detail' },
]

const GOAL_OPTIONS = [
  { words: 3, tag: 'Casual' },
  { words: 5, tag: 'Regular' },
  { words: 8, tag: 'Serious' },
  { words: 15, tag: 'Intense' },
]

const RATING_OPTIONS: { rating: PlacementAnswer['rating']; label: string; icon: LucideIcon; className: string }[] = [
  { rating: 'know', label: 'I know this', icon: ThumbsUp, className: 'bg-brand-500' },
  { rating: 'recognize', label: 'I recognize it', icon: Eye, className: 'bg-amber-500' },
  { rating: 'unknown', label: "I don't know this", icon: HelpCircle, className: 'bg-slate-400' },
]

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/

export function Onboarding() {
  const { completeOnboarding, updateSettings, settings, onboardingComplete } = useApp()

  const isRetake = onboardingComplete
  const [step, setStep] = useState<Step>(() => (isRetake ? 'starting-point' : 'welcome'))
  const [history, setHistory] = useState<Step[]>([])

  const [selfLevel, setSelfLevel] = useState(1)
  const [dailyGoal, setDailyGoal] = useState(settings.dailyNewWordLimit || 5)
  const [notifPromptVisible, setNotifPromptVisible] = useState(false)
  const [notifDecided, setNotifDecided] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [startingPoint, setStartingPoint] = useState<'scratch' | 'test'>('test')

  const [testIndex, setTestIndex] = useState(0)
  const [answers, setAnswers] = useState<PlacementAnswer[]>([])

  const estimatedHsk = useMemo(() => computeEstimatedHsk(placementItems, answers), [answers])

  useEffect(() => {
    if (step === 'result') {
      completeOnboarding({ estimatedHsk, completedAt: todayISO() })
    }
  }, [step, estimatedHsk, completeOnboarding])

  const goTo = (next: Step) => {
    setHistory((h) => [...h, step])
    setStep(next)
  }

  const goBack = () => {
    if (history.length === 0) {
      if (isRetake) router.replace('/settings')
      return
    }
    const prev = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    setStep(prev)
  }

  const handleAllowNotifications = () => {
    updateSettings({ notificationsEnabled: true })
    setNotifPromptVisible(false)
    setNotifDecided(true)
  }

  const handleDenyNotifications = () => {
    updateSettings({ notificationsEnabled: false })
    setNotifPromptVisible(false)
    setNotifDecided(true)
  }

  const handleSubmitEmail = () => {
    updateSettings({ email: email.trim(), username: `${firstName.trim()} ${lastName.trim()}`.trim() })
    goTo('starting-point')
  }

  const handleStartingPointContinue = () => {
    if (startingPoint === 'scratch') {
      completeOnboarding({ estimatedHsk: 1, completedAt: todayISO() })
      router.replace('/')
    } else {
      setTestIndex(0)
      setAnswers([])
      goTo('test')
    }
  }

  const currentItem = placementItems[testIndex]

  const handleRate = (rating: PlacementAnswer['rating']) => {
    const nextAnswers = [...answers, { wordId: currentItem.id, rating }]
    setAnswers(nextAnswers)
    if (testIndex + 1 >= placementItems.length) {
      setStep('result')
    } else {
      setTestIndex((i) => i + 1)
    }
  }

  const handleTestBack = () => {
    if (testIndex === 0) {
      goBack()
    } else {
      setTestIndex((i) => i - 1)
      setAnswers((a) => a.slice(0, -1))
    }
  }

  const showCancelLink = isRetake && (step === 'starting-point' || step === 'test')

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
        <View className="mx-auto w-full max-w-md flex-1 px-6 pt-4">
          {step === 'welcome' && (
            <View className="flex-1 items-center justify-between py-10">
              <View />
              <View className="items-center gap-5">
                <ShifuAvatar size={128} />
                <View className="items-center gap-1.5">
                  <Text className="text-3xl font-extrabold" style={{ color: RED }}>
                    Chinese Easy
                  </Text>
                  <Text className="text-base text-slate-400">Learn Chinese. Free. Forever.</Text>
                </View>
              </View>
              <View className="w-full gap-3">
                <DuoButton label="Get Started" onPress={() => goTo('level')} />
                <DuoButton label="I Already Have an Account" variant="outline" onPress={() => goTo('login')} />
              </View>
            </View>
          )}

          {step === 'login' && (
            <>
              <OnboardingHeader progress={0.15} onBack={goBack} />
              <View className="flex-1">
                <Text className="mb-6 text-2xl font-extrabold text-slate-900 dark:text-white">Welcome back</Text>
                <View className="gap-3">
                  <OnboardingInput
                    placeholder="Email"
                    value={loginEmail}
                    onChangeText={setLoginEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <OnboardingInput placeholder="Password" value={loginPassword} onChangeText={setLoginPassword} secureTextEntry />
                </View>
              </View>
              <View className="gap-3 pb-4">
                <DuoButton
                  label="Log In"
                  disabled={!loginEmail.trim() || !loginPassword.trim()}
                  onPress={() => {
                    completeOnboarding({ estimatedHsk: 1, completedAt: todayISO() })
                    router.replace('/')
                  }}
                />
              </View>
            </>
          )}

          {step === 'level' && (
            <>
              <OnboardingHeader progress={PROGRESS.level!} onBack={goBack} />
              <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                <MascotPrompt message="How much Chinese do you already know?" />
                <View className="gap-2.5">
                  {LEVEL_OPTIONS.map((opt) => (
                    <ChoiceRow
                      key={opt.level}
                      label={opt.label}
                      selected={selfLevel === opt.level}
                      onPress={() => setSelfLevel(opt.level)}
                      leading={<LevelBars level={opt.level} />}
                    />
                  ))}
                </View>
              </ScrollView>
              <View className="gap-3 pb-4 pt-3">
                <DuoButton label="Continue" onPress={() => goTo('goal')} />
              </View>
            </>
          )}

          {step === 'goal' && (
            <>
              <OnboardingHeader progress={PROGRESS.goal!} onBack={goBack} />
              <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
                <MascotPrompt message="What's your daily learning goal?" />
                <View className="gap-2.5">
                  {GOAL_OPTIONS.map((opt) => (
                    <ChoiceRow
                      key={opt.words}
                      label={`${opt.words} words / day`}
                      selected={dailyGoal === opt.words}
                      onPress={() => setDailyGoal(opt.words)}
                      trailing={<Text className="mr-1 text-xs font-semibold text-slate-400">{opt.tag}</Text>}
                    />
                  ))}
                </View>
              </ScrollView>
              <View className="gap-3 pb-4 pt-3">
                <DuoButton
                  label="I'm Committed"
                  onPress={() => {
                    playPositiveChime()
                    updateSettings({ dailyNewWordLimit: dailyGoal })
                    goTo('notifications')
                  }}
                />
              </View>
            </>
          )}

          {step === 'notifications' && (
            <>
              <OnboardingHeader progress={PROGRESS.notifications!} onBack={goBack} />
              <View className="flex-1">
                <MascotPrompt message="I'll remind you to practice so it becomes a habit!" />
                <View className="flex-1 items-center justify-center">
                  {notifDecided && (
                    <View className="items-center gap-3">
                      {settings.notificationsEnabled ? <Bell size={40} color={RED} /> : <BellOff size={40} color="#94a3b8" />}
                      <Text className="max-w-[220px] text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {settings.notificationsEnabled
                          ? "You're all set — we'll nudge you if you miss a day."
                          : 'No worries — you can turn these on anytime in Settings.'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View className="gap-3 pb-4">
                {notifDecided ? (
                  <DuoButton label="Continue" onPress={() => goTo('name')} />
                ) : (
                  <DuoButton
                    label="Turn on Notifications"
                    icon={<Bell size={18} color="#fff" />}
                    onPress={() => setNotifPromptVisible(true)}
                  />
                )}
              </View>
              <PermissionSheet visible={notifPromptVisible} onAllow={handleAllowNotifications} onDeny={handleDenyNotifications} />
            </>
          )}

          {step === 'name' && (
            <>
              <OnboardingHeader progress={PROGRESS.name!} onBack={goBack} />
              <View className="flex-1">
                <Text className="mb-6 text-2xl font-extrabold text-slate-900 dark:text-white">What's your name?</Text>
                <View className="gap-3">
                  <OnboardingInput placeholder="First name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
                  <OnboardingInput placeholder="Last name" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
                </View>
              </View>
              <View className="gap-3 pb-4">
                <DuoButton label="Next" disabled={!firstName.trim() || !lastName.trim()} onPress={() => goTo('email')} />
                <View className="flex-row items-center gap-3 py-1">
                  <View className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                  <Text className="text-xs font-semibold text-slate-400">OR</Text>
                  <View className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                </View>
                <DuoButton label="Continue with Google" variant="outline" onPress={() => goTo('starting-point')} />
              </View>
            </>
          )}

          {step === 'email' && (
            <>
              <OnboardingHeader progress={PROGRESS.email!} onBack={goBack} />
              <View className="flex-1">
                <Text className="mb-6 text-2xl font-extrabold text-slate-900 dark:text-white">
                  What's your email, {firstName.trim()}?
                </Text>
                <OnboardingInput
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              <View className="gap-3 pb-4">
                <DuoButton label="Next" disabled={!EMAIL_PATTERN.test(email.trim())} onPress={handleSubmitEmail} />
              </View>
            </>
          )}

          {step === 'starting-point' && (
            <>
              <OnboardingHeader progress={PROGRESS['starting-point']!} onBack={goBack} />
              <View className="flex-1">
                <MascotPrompt message="Where would you like to start?" />
                <View className="gap-3">
                  <ChoiceCard
                    title="Start from scratch"
                    subtitle="Begin at HSK 1 with the basics"
                    icon={<BookOpen size={28} color={startingPoint === 'scratch' ? '#fff' : '#64748b'} />}
                    selected={startingPoint === 'scratch'}
                    onPress={() => setStartingPoint('scratch')}
                  />
                  <ChoiceCard
                    title="Find my level"
                    subtitle="Take a quick placement test so we start you at the right level"
                    icon={<Compass size={28} color={startingPoint === 'test' ? '#fff' : '#64748b'} />}
                    selected={startingPoint === 'test'}
                    recommended
                    onPress={() => setStartingPoint('test')}
                  />
                </View>
              </View>
              <View className="gap-3 pb-4">
                <DuoButton label="Continue" onPress={handleStartingPointContinue} />
              </View>
            </>
          )}

          {step === 'test' && currentItem && (
            <>
              <OnboardingHeader progress={testIndex / placementItems.length} onBack={handleTestBack} />
              <View className="flex-1 items-center justify-center gap-2">
                <Text className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                  HSK {currentItem.hskLevel}
                </Text>
                <Text className="font-hanzi text-7xl font-bold text-slate-900 dark:text-white">
                  {displayWord(currentItem, 'traditional')}
                </Text>
              </View>
              <View className="gap-2.5 pb-4">
                {RATING_OPTIONS.map(({ rating, label, icon: Icon, className }) => (
                  <Pressable
                    key={rating}
                    onPress={() => handleRate(rating)}
                    className={`flex-row items-center justify-center gap-2 rounded-2xl py-4 shadow-card ${className}`}
                  >
                    <Icon size={18} color="white" />
                    <Text className="text-base font-bold text-white">{label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {step === 'result' && (
            <View className="flex-1 items-center justify-center gap-6">
              <View className="h-24 w-24 items-center justify-center rounded-full bg-coral-500 shadow-card">
                <GraduationCap size={40} color="#fff" />
              </View>
              <View className="items-center">
                <Text className="text-sm font-medium text-slate-400">Your estimated level</Text>
                <Text className="text-6xl font-extrabold" style={{ color: RED }}>
                  HSK {estimatedHsk}
                </Text>
              </View>
              <Text className="max-w-xs text-center text-sm text-slate-500 dark:text-slate-400">
                We'll start you off with words around this level and adjust as you go. You can retake this test anytime from
                Settings.
              </Text>
              <View className="w-full max-w-xs">
                <DuoButton label="Start Learning" icon={<Sparkles size={18} color="#fff" />} onPress={() => router.replace('/')} />
              </View>
            </View>
          )}

          {showCancelLink && (
            <Pressable onPress={() => router.replace('/settings')} className="mb-2 items-center">
              <Text className="text-center text-sm font-medium text-slate-400">Cancel and return to app</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}
