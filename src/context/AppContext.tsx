import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppSettings, DailyProgress, Grade, PlacementResult, SrsCard, VocabWord } from '../types'
import { hskFrequency, wordById as wordByIdInBank } from '../data/hskFrequency'
import { mockDeck } from '../data/mockDeck'
import { loadStored, saveStored } from '../lib/storage'
import { addDays, todayISO } from '../lib/date'
import { createNewCard, gradeCard as gradeCardSrs } from '../lib/srs'

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
  /** False until all persisted state has been read from AsyncStorage. */
  ready: boolean

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
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [deck, setDeck] = useState<SrsCard[]>(mockDeck)
  const [customWords, setCustomWords] = useState<VocabWord[]>([])
  const [dailyProgress, setDailyProgress] = useState<DailyProgress[]>([])
  const [streakState, setStreakState] = useState<StreakState>({ streak: 0, lastActiveDate: null })
  const [onboarding, setOnboarding] = useState<OnboardingState>({ complete: false })

  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      const [loadedSettings, loadedDeck, loadedCustomWords, loadedDailyProgress, loadedStreak, loadedOnboarding] =
        await Promise.all([
          loadStored('settings', DEFAULT_SETTINGS),
          loadStored('deck', mockDeck),
          loadStored('customWords', [] as VocabWord[]),
          loadStored('dailyProgress', [] as DailyProgress[]),
          loadStored('streak', { streak: 0, lastActiveDate: null } as StreakState),
          loadStored('onboarding', { complete: false } as OnboardingState),
        ])
      if (cancelled) return
      setSettings({
        ...DEFAULT_SETTINGS,
        ...loadedSettings,
        // Traditional-only for now — overrides any simplified preference from earlier sessions.
        script: 'traditional',
      })
      setDeck(loadedDeck)
      setCustomWords(loadedCustomWords)
      setDailyProgress(loadedDailyProgress)
      setStreakState(loadedStreak)
      setOnboarding(loadedOnboarding)
      setReady(true)
    }
    void hydrate()
    return () => {
      cancelled = true
    }
  }, [])

  // Skip persisting on the very first render of each piece of state — that
  // value is just a placeholder default until hydrate() above overwrites it,
  // and saving it would clobber whatever was already in AsyncStorage.
  const skipNextSave = useRef({ settings: true, deck: true, customWords: true, dailyProgress: true, streak: true, onboarding: true })

  useEffect(() => {
    if (skipNextSave.current.settings) { skipNextSave.current.settings = false; return }
    void saveStored('settings', settings)
  }, [settings])
  useEffect(() => {
    if (skipNextSave.current.deck) { skipNextSave.current.deck = false; return }
    void saveStored('deck', deck)
  }, [deck])
  useEffect(() => {
    if (skipNextSave.current.customWords) { skipNextSave.current.customWords = false; return }
    void saveStored('customWords', customWords)
  }, [customWords])
  useEffect(() => {
    if (skipNextSave.current.dailyProgress) { skipNextSave.current.dailyProgress = false; return }
    void saveStored('dailyProgress', dailyProgress)
  }, [dailyProgress])
  useEffect(() => {
    if (skipNextSave.current.streak) { skipNextSave.current.streak = false; return }
    void saveStored('streak', streakState)
  }, [streakState])
  useEffect(() => {
    if (skipNextSave.current.onboarding) { skipNextSave.current.onboarding = false; return }
    void saveStored('onboarding', onboarding)
  }, [onboarding])

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
    ready,
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
