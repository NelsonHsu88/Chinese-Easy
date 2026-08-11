import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppSettings, DailyProgress, Grade, PlacementResult, SrsCard, VocabWord } from '../types'
import { hskFrequency, wordById as wordByIdInBank } from '../data/hskFrequency'
import { mockDeck } from '../data/mockDeck'
import { loadStored, saveStored } from '../lib/storage'
import { addDays, todayISO } from '../lib/date'
import { createNewCard, gradeCard as gradeCardSrs } from '../lib/srs'
import { xpForGrade, XP_PER_LESSON } from '../lib/townEconomy'
import { setDevClockOverride } from '../lib/devClock'

export const DEFAULT_SETTINGS: AppSettings = {
  username: 'Learner',
  email: '',
  script: 'traditional',
  phoneticScript: 'pinyin',
  reviewDirection: 'production',
  dailyReviewLimit: 30,
  dailyNewWordLimit: 5,
  wrongAnswerReps: 3,
  reviewOrder: 'due',
  reminderTime: '19:00',
  notificationsEnabled: false,
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

  /** My Town economy. */
  xp: number
  unlockedBuildingIds: string[]
  unlockBuilding: (buildingId: string, cost: number) => void

  /** Lessons progress. */
  completedLessonIds: string[]
  completeLesson: (lessonId: string) => void

  /** Words added from the Books reader that haven't been seen in My Words yet. */
  newlyAddedWordIds: string[]
  addWordFromBook: (wordId: string) => void
  clearNewWordFlags: () => void

  /** Dev-only frozen "now" override (Settings → Developer) — null means real time. */
  devClockOverride: string | null
  updateDevClockOverride: (iso: string | null) => void

  /** Daily/milestone challenges. */
  claimedChallengeIds: string[]
  claimChallenge: (challengeId: string, xpReward: number) => void

  /** Dictionary search history, most recent first, capped at RECENT_SEARCH_LIMIT. */
  recentSearchIds: string[]
  pushRecentSearch: (wordId: string) => void
  clearRecentSearches: () => void

  /**
   * Reading progress per story: story id → furthest page index reached (0-based).
   * Only ever moves forward, so paging back through a story you've finished
   * doesn't wind its percentage down on the library card.
   */
  storyProgress: Record<string, number>
  recordStoryPage: (storyId: string, pageIndex: number) => void
}

const RECENT_SEARCH_LIMIT = 8

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [deck, setDeck] = useState<SrsCard[]>(mockDeck)
  const [customWords, setCustomWords] = useState<VocabWord[]>([])
  const [dailyProgress, setDailyProgress] = useState<DailyProgress[]>([])
  const [streakState, setStreakState] = useState<StreakState>({ streak: 0, lastActiveDate: null })
  const [onboarding, setOnboarding] = useState<OnboardingState>({ complete: false })
  const [xp, setXp] = useState(0)
  const [unlockedBuildingIds, setUnlockedBuildingIds] = useState<string[]>([])
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([])
  const [newlyAddedWordIds, setNewlyAddedWordIds] = useState<string[]>([])
  const [devClockOverride, setDevClockOverrideState] = useState<string | null>(null)
  const [claimedChallengeIds, setClaimedChallengeIds] = useState<string[]>([])
  const [recentSearchIds, setRecentSearchIds] = useState<string[]>([])
  const [storyProgress, setStoryProgress] = useState<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      const [
        loadedSettings,
        loadedDeck,
        loadedCustomWords,
        loadedDailyProgress,
        loadedStreak,
        loadedOnboarding,
        loadedXp,
        loadedUnlockedBuildingIds,
        loadedCompletedLessonIds,
        loadedNewlyAddedWordIds,
        loadedDevClockOverride,
        loadedClaimedChallengeIds,
        loadedRecentSearchIds,
        loadedStoryProgress,
      ] = await Promise.all([
        loadStored('settings', DEFAULT_SETTINGS),
        loadStored('deck', mockDeck),
        loadStored('customWords', [] as VocabWord[]),
        loadStored('dailyProgress', [] as DailyProgress[]),
        loadStored('streak', { streak: 0, lastActiveDate: null } as StreakState),
        loadStored('onboarding', { complete: false } as OnboardingState),
        loadStored('xp', 0),
        loadStored('unlockedBuildingIds', [] as string[]),
        loadStored('completedLessonIds', [] as string[]),
        loadStored('newlyAddedWordIds', [] as string[]),
        loadStored('devClockOverride', null as string | null),
        loadStored('claimedChallengeIds', [] as string[]),
        loadStored('recentSearchIds', [] as string[]),
        loadStored('storyProgress', {} as Record<string, number>),
      ])
      if (cancelled) return
      setSettings({
        ...DEFAULT_SETTINGS,
        ...loadedSettings,
        // Traditional-only for now — overrides any simplified preference from earlier sessions.
        script: 'traditional',
      })
      // Drop cards whose word no longer exists. The bulk word bank was rebuilt
      // from CC-CEDICT with content-derived ids ("cc-学习") replacing the old
      // positional ones ("imp-1-0001"), so decks saved before that migration
      // carry dangling references — and a dangling *current* card would leave
      // Review rendering nothing with no way to advance.
      const knownIds = new Set([...hskFrequency.map((w) => w.id), ...loadedCustomWords.map((w) => w.id)])
      setDeck(loadedDeck.filter((card) => knownIds.has(card.wordId)))
      setCustomWords(loadedCustomWords)
      setDailyProgress(loadedDailyProgress)
      setStreakState(loadedStreak)
      setOnboarding(loadedOnboarding)
      setXp(loadedXp)
      setUnlockedBuildingIds(loadedUnlockedBuildingIds)
      setCompletedLessonIds(loadedCompletedLessonIds)
      setNewlyAddedWordIds(loadedNewlyAddedWordIds)
      setDevClockOverrideState(loadedDevClockOverride)
      setDevClockOverride(loadedDevClockOverride)
      setClaimedChallengeIds(loadedClaimedChallengeIds)
      setRecentSearchIds(loadedRecentSearchIds)
      setStoryProgress(loadedStoryProgress)
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
  const skipNextSave = useRef({
    settings: true,
    deck: true,
    customWords: true,
    dailyProgress: true,
    streak: true,
    onboarding: true,
    xp: true,
    unlockedBuildingIds: true,
    completedLessonIds: true,
    newlyAddedWordIds: true,
    devClockOverride: true,
    claimedChallengeIds: true,
    recentSearchIds: true,
    storyProgress: true,
  })

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
  useEffect(() => {
    if (skipNextSave.current.xp) { skipNextSave.current.xp = false; return }
    void saveStored('xp', xp)
  }, [xp])
  useEffect(() => {
    if (skipNextSave.current.unlockedBuildingIds) { skipNextSave.current.unlockedBuildingIds = false; return }
    void saveStored('unlockedBuildingIds', unlockedBuildingIds)
  }, [unlockedBuildingIds])
  useEffect(() => {
    if (skipNextSave.current.completedLessonIds) { skipNextSave.current.completedLessonIds = false; return }
    void saveStored('completedLessonIds', completedLessonIds)
  }, [completedLessonIds])
  useEffect(() => {
    if (skipNextSave.current.newlyAddedWordIds) { skipNextSave.current.newlyAddedWordIds = false; return }
    void saveStored('newlyAddedWordIds', newlyAddedWordIds)
  }, [newlyAddedWordIds])
  useEffect(() => {
    if (skipNextSave.current.devClockOverride) { skipNextSave.current.devClockOverride = false; return }
    void saveStored('devClockOverride', devClockOverride)
  }, [devClockOverride])
  useEffect(() => {
    if (skipNextSave.current.claimedChallengeIds) { skipNextSave.current.claimedChallengeIds = false; return }
    void saveStored('claimedChallengeIds', claimedChallengeIds)
  }, [claimedChallengeIds])
  useEffect(() => {
    if (skipNextSave.current.recentSearchIds) { skipNextSave.current.recentSearchIds = false; return }
    void saveStored('recentSearchIds', recentSearchIds)
  }, [recentSearchIds])
  useEffect(() => {
    if (skipNextSave.current.storyProgress) { skipNextSave.current.storyProgress = false; return }
    void saveStored('storyProgress', storyProgress)
  }, [storyProgress])

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
      setXp((prev) => prev + xpForGrade(grade))
    },
    [settings.wrongAnswerReps, bumpTodayActivity, registerActivity],
  )

  const unlockBuilding = useCallback(
    (buildingId: string, cost: number) => {
      if (unlockedBuildingIds.includes(buildingId) || xp < cost) return
      setXp((prev) => prev - cost)
      setUnlockedBuildingIds((prev) => [...prev, buildingId])
    },
    [xp, unlockedBuildingIds],
  )

  const completeLesson = useCallback((lessonId: string) => {
    setCompletedLessonIds((prev) => {
      if (prev.includes(lessonId)) return prev
      return [...prev, lessonId]
    })
    setXp((prev) => prev + XP_PER_LESSON)
  }, [])

  const addWordFromBook = useCallback(
    (wordId: string) => {
      addToReviewDeck(wordId)
      setNewlyAddedWordIds((prev) => (prev.includes(wordId) ? prev : [...prev, wordId]))
    },
    [addToReviewDeck],
  )

  const clearNewWordFlags = useCallback(() => {
    setNewlyAddedWordIds([])
  }, [])

  const updateDevClockOverride = useCallback((iso: string | null) => {
    setDevClockOverride(iso)
    setDevClockOverrideState(iso)
  }, [])

  const claimChallenge = useCallback(
    (challengeId: string, xpReward: number) => {
      if (claimedChallengeIds.includes(challengeId)) return
      setClaimedChallengeIds((prev) => [...prev, challengeId])
      setXp((prev) => prev + xpReward)
    },
    [claimedChallengeIds],
  )

  /** Moves a word to the front of the search history, de-duplicating and trimming the tail. */
  const pushRecentSearch = useCallback((wordId: string) => {
    setRecentSearchIds((prev) => [wordId, ...prev.filter((id) => id !== wordId)].slice(0, RECENT_SEARCH_LIMIT))
  }, [])

  const clearRecentSearches = useCallback(() => {
    setRecentSearchIds([])
  }, [])

  /** Records that a story page was reached. Monotonic — never rewinds a percentage. */
  const recordStoryPage = useCallback((storyId: string, pageIndex: number) => {
    setStoryProgress((prev) => {
      if ((prev[storyId] ?? -1) >= pageIndex) return prev
      return { ...prev, [storyId]: pageIndex }
    })
  }, [])

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
    xp,
    unlockedBuildingIds,
    unlockBuilding,
    completedLessonIds,
    completeLesson,
    newlyAddedWordIds,
    addWordFromBook,
    clearNewWordFlags,
    devClockOverride,
    updateDevClockOverride,
    claimedChallengeIds,
    claimChallenge,
    recentSearchIds,
    pushRecentSearch,
    clearRecentSearches,
    storyProgress,
    recordStoryPage,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
