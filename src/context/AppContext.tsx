import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AppSettings, DailyProgress, Grade, PlacementResult, SrsCard, VocabWord } from '../types'
import { hskFrequency, wordById as wordByIdInBank } from '../data/hskFrequency'
import { mockDeck } from '../data/mockDeck'
import { loadStored, saveStored } from '../lib/storage'
import { addDays, todayISO } from '../lib/date'
import { createNewCard, gradeCard as gradeCardSrs } from '../lib/srs'

// Earlier builds seeded fake weekly/streak history into localStorage so the
// Dashboard had something to show before real usage. That mock data is now
// gone from the code, but anyone who already opened the app still has it
// sitting in their browser's storage. This runs once (at module load, before
// any state is read) to clear just those two keys so real users don't keep
// seeing leftover fake numbers.
const DATA_VERSION = '4-review-activity-tracking'
function migrateStaleMockData() {
  if (typeof window === 'undefined') return
  const versionKey = 'chinese-easy:dataVersion'
  if (window.localStorage.getItem(versionKey) === DATA_VERSION) return

  window.localStorage.removeItem('chinese-easy:dailyProgress')
  window.localStorage.removeItem('chinese-easy:streak')

  // Review now defaults to production (English prompt, write from memory) —
  // carry that forward for anyone whose stored settings still have the old default.
  try {
    const rawSettings = window.localStorage.getItem('chinese-easy:settings')
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings)
      if (parsed.reviewDirection === 'recognition') {
        parsed.reviewDirection = 'production'
        window.localStorage.setItem('chinese-easy:settings', JSON.stringify(parsed))
      }
    }
  } catch {
    // malformed stored settings — leave as-is, normal load/merge logic will handle it
  }

  window.localStorage.setItem(versionKey, DATA_VERSION)
}
migrateStaleMockData()

export const DEFAULT_SETTINGS: AppSettings = {
  username: 'Learner',
  script: 'traditional',
  phoneticScript: 'pinyin',
  reviewDirection: 'production',
  dailyReviewLimit: 30,
  dailyNewWordLimit: 10,
  wrongAnswerReps: 3,
  reviewOrder: 'due',
  reminderTime: '19:00',
  hskLevel: 1,
}

interface OnboardingState {
  complete: boolean
  result?: PlacementResult
}

interface StreakState {
  streak: number
  lastActiveDate: string | null
}

export interface CustomWordInput {
  simplified: string
  traditional: string
  pinyin: string
  definition: string
  exampleSimplified?: string
  exampleTraditional?: string
  examplePinyin?: string
  exampleTranslation?: string
}

interface AppContextValue {
  settings: AppSettings
  updateSettings: (partial: Partial<AppSettings>) => void

  deck: SrsCard[]
  wordBank: VocabWord[]
  getWord: (id: string) => VocabWord | undefined

  dailyProgress: DailyProgress[]
  wordsLearnedToday: number
  streak: number

  addToReviewDeck: (wordId: string) => void
  addCustomWord: (input: CustomWordInput) => void
  gradeCard: (wordId: string, grade: Grade) => void
  completePracticeRep: (wordId: string) => void

  onboardingComplete: boolean
  placementResult?: PlacementResult
  completeOnboarding: (result: PlacementResult) => void
  retakePlacementTest: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...loadStored('settings', DEFAULT_SETTINGS),
    // Traditional-only for now — overrides any simplified preference from earlier sessions.
    script: 'traditional',
  }))
  const [deck, setDeck] = useState<SrsCard[]>(() => loadStored('deck', mockDeck))
  const [customWords, setCustomWords] = useState<VocabWord[]>(() => loadStored('customWords', [] as VocabWord[]))
  // Real activity only — no seeded mock history. Numbers on the Dashboard
  // grow only from what the user actually does.
  const [dailyProgress, setDailyProgress] = useState<DailyProgress[]>(() =>
    loadStored('dailyProgress', [] as DailyProgress[]),
  )
  const [streakState, setStreakState] = useState<StreakState>(() =>
    loadStored('streak', { streak: 0, lastActiveDate: null } as StreakState),
  )
  const [onboarding, setOnboarding] = useState<OnboardingState>(() =>
    loadStored('onboarding', { complete: false } as OnboardingState),
  )

  useEffect(() => saveStored('settings', settings), [settings])
  useEffect(() => saveStored('deck', deck), [deck])
  useEffect(() => saveStored('customWords', customWords), [customWords])
  useEffect(() => saveStored('dailyProgress', dailyProgress), [dailyProgress])
  useEffect(() => saveStored('streak', streakState), [streakState])
  useEffect(() => saveStored('onboarding', onboarding), [onboarding])

  useEffect(() => {
    const root = document.documentElement
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => root.classList.toggle('dark', mql.matches)
    apply()
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [])

  const wordBank = useMemo(() => [...hskFrequency, ...customWords], [customWords])

  const getWord = useCallback(
    (id: string) => wordByIdInBank(id) ?? customWords.find((w) => w.id === id),
    [customWords],
  )

  const registerActivity = useCallback(() => {
    setStreakState((prev) => {
      const today = todayISO()
      if (prev.lastActiveDate === today) return prev
      const yesterday = addDays(today, -1)
      const newStreak = prev.lastActiveDate === yesterday ? prev.streak + 1 : 1
      return { streak: newStreak, lastActiveDate: today }
    })
  }, [])

  const bumpTodayActivity = useCallback((field: 'wordsLearned' | 'reviewsCompleted', amount: number) => {
    setDailyProgress((prev) => {
      const today = todayISO()
      const idx = prev.findIndex((d) => d.date === today)
      if (idx === -1) {
        return [...prev, { date: today, wordsLearned: 0, reviewsCompleted: 0, [field]: amount }]
      }
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: copy[idx][field] + amount }
      return copy
    })
  }, [])

  const bumpDailyProgress = useCallback((count: number) => bumpTodayActivity('wordsLearned', count), [bumpTodayActivity])

  const addToReviewDeck = useCallback(
    (wordId: string) => {
      setDeck((prev) => {
        if (prev.some((c) => c.wordId === wordId)) return prev
        return [...prev, createNewCard(wordId)]
      })
      bumpDailyProgress(1)
      registerActivity()
    },
    [bumpDailyProgress, registerActivity],
  )

  const addCustomWord = useCallback(
    (input: CustomWordInput) => {
      const id = `custom-${Date.now()}-${Math.round(Math.random() * 1000)}`
      const word: VocabWord = {
        id,
        simplified: input.simplified,
        traditional: input.traditional || input.simplified,
        pinyin: input.pinyin,
        definition: input.definition,
        hskLevel: settings.hskLevel,
        category: 'daily',
        custom: true,
        example: {
          simplified: input.exampleSimplified ?? '',
          traditional: input.exampleTraditional ?? input.exampleSimplified ?? '',
          pinyin: input.examplePinyin ?? '',
          translation: input.exampleTranslation ?? '',
        },
      }
      setCustomWords((prev) => [...prev, word])
      setDeck((prev) => [...prev, createNewCard(id)])
      bumpDailyProgress(1)
      registerActivity()
    },
    [settings.hskLevel, bumpDailyProgress, registerActivity],
  )

  const gradeCard = useCallback(
    (wordId: string, grade: Grade) => {
      setDeck((prev) =>
        prev.map((c) => (c.wordId === wordId ? gradeCardSrs(c, grade, settings.wrongAnswerReps) : c)),
      )
      bumpTodayActivity('reviewsCompleted', 1)
      registerActivity()
    },
    [settings.wrongAnswerReps, bumpTodayActivity, registerActivity],
  )

  const completePracticeRep = useCallback((wordId: string) => {
    setDeck((prev) =>
      prev.map((c) => (c.wordId === wordId ? { ...c, practiceQueue: Math.max(0, c.practiceQueue - 1) } : c)),
    )
  }, [])

  const completeOnboarding = useCallback((result: PlacementResult) => {
    setOnboarding({ complete: true, result })
    setSettings((prev) => ({ ...prev, hskLevel: result.estimatedHsk }))
  }, [])

  const retakePlacementTest = useCallback(() => {
    setOnboarding((prev) => ({ ...prev, complete: false }))
  }, [])

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }))
  }, [])

  const wordsLearnedToday = useMemo(() => {
    const today = todayISO()
    return dailyProgress.find((d) => d.date === today)?.wordsLearned ?? 0
  }, [dailyProgress])

  const value: AppContextValue = {
    settings,
    updateSettings,
    deck,
    wordBank,
    getWord,
    dailyProgress,
    wordsLearnedToday,
    streak: streakState.streak,
    addToReviewDeck,
    addCustomWord,
    gradeCard,
    completePracticeRep,
    onboardingComplete: onboarding.complete,
    placementResult: onboarding.result,
    completeOnboarding,
    retakePlacementTest,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
