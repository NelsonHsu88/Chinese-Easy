import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type {
  AppSettings,
  DailyProgress,
  Grade,
  PlacementResult,
  ReviewLogEntry,
  SrsCard,
  VocabWord,
} from '../types'
import { hskFrequency, wordById as wordByIdInBank } from '../data/hskFrequency'
import { deviceStore, getActiveScope, loadStored, purgeDeletedAccounts, saveStored, setActiveScope } from '../lib/storage'
import { scopeId } from '../lib/storageKeys'
import { installationId, resolveScope } from '../lib/storageScope'
import {
  adoptGuestProgressExplicitly,
  dismissGuestRecovery,
  findRecoverableGuestProgress,
  maybeAdoptGuestProgress,
  migrateLegacyKeys,
  type RecoverableProgress,
} from '../lib/storageMigration'
import {
  INITIAL_TOUR,
  nextTourStep,
  normalizeTour,
  tourAfterAction,
  type TourAction,
  type TourState,
  type TourStepId,
} from '../lib/tour'
import { normalizeSeenScreenTours, type ScreenTourId } from '../lib/screenTours'
import { ladderHaptic, setHapticsEnabled } from '../lib/haptics'
import { addDays, todayISO } from '../lib/date'
import {
  createNewCard,
  gradeCard as gradeCardSrs,
  migrateDeck,
  reviewLogEntry,
  type ReviewPreview,
} from '../lib/srs'
import { xpForGrade, XP_PER_LESSON } from '../lib/townEconomy'
import { devNow, setDevClockOverride } from '../lib/devClock'
import { setSoundEnabled } from '../lib/sound'
import {
  cachedEntitlementIsUsable,
  currentEntitlement,
  hasStore,
  identifyUser,
  type Entitlement,
} from '../lib/subscription'
import { useAuth } from './AuthContext'
import { FEATURES } from '../lib/features'
import { getLevelFromXp } from '../lib/progression/levels'
import { countDailyChallengeClaims, type AchievementStats } from '../lib/progression/achievements'
import type { ProfileRewardId } from '../lib/progression/profileRewards'
import type { GardenItemId, GardenSlotId } from '../lib/progression/gardenItems'
import {
  DEFAULT_PROGRESSION,
  evaluateAchievements,
  normaliseProgression,
  pinAchievement as pinAchievementIn,
  placeGardenItem as placeGardenItemIn,
  reachLevel,
  removeGardenItem as removeGardenItemIn,
  replacePinnedAchievement as replacePinnedIn,
  setRewardEquipped,
  unlocksBetween,
  unpinAchievement as unpinAchievementIn,
  type LevelUnlocks,
  type PinResult,
  type ProgressionState,
} from '../lib/progression/state'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { mergeSnapshot, pullSnapshot, type LocalAccountState, type SyncReadClient } from '../lib/sync/pull'
import { accountSettings, rowToReview } from '../lib/sync/mappers'
import { changedIntents, type SyncSnapshot } from '../lib/sync/changes'
import { enqueue, type OutboxEntry } from '../lib/sync/outbox'
import { mergeReviewEvents } from '../lib/sync/conflict'
import {
  EMPTY_LEDGER,
  loadReviewHistory,
  persistReviewHistory,
  readAllReviewEvents,
  rebuildReviewHistory,
  type ReviewLedger,
} from '../lib/reviewHistory'

export const DEFAULT_SETTINGS: AppSettings = {
  username: 'Learner',
  email: '',
  script: 'traditional',
  /* Matches `defaultPhoneticFor('traditional')`. Existing installs keep their
     stored value — the settings blob hydrates over these defaults. */
  phoneticScript: 'zhuyin',
  reviewDirection: 'production',
  dailyReviewLimit: 30,
  dailyNewWordLimit: 5,
  wrongAnswerReps: 3,
  reviewOrder: 'due',
  reminderTime: '19:00',
  notificationsEnabled: false,
  hskLevel: 1,
  learningGoal: 'daily-life',
  soundEnabled: true,
  hapticsEnabled: true,
  showReadings: true,
}

/**
 * One New Words card the learner has already been shown.
 *
 * `outcome` is what they did with it, which is what the Recent sheet reports
 * back: a skipped word can be reconsidered, an added one is already in the deck.
 */
/**
 * Where a grant of XP came from. Carried for the record and for any future
 * analytics; nothing branches on it today.
 */
export type XpSource =
  | { type: 'review'; wordId: string }
  | { type: 'lesson'; lessonId: string }
  | { type: 'challenge'; challengeId: string }

/**
 * The learning events the progression system counts that the app did not
 * already keep a record of. Saved words, reviews and claimed challenges are
 * *not* here: they are read straight from the deck, the daily history and the
 * claimed ids, so they need no second bookkeeping that could drift from the
 * first.
 */
export type LearningEvent =
  | { type: 'WRITING_COMPLETED'; characters: number }
  | { type: 'LISTENING_ANSWERED'; correct: boolean }
  | { type: 'REVIEW_SESSION_COMPLETED' }
  | { type: 'STORY_FINISHED'; storyId: string }

/** Something to celebrate, queued for `ProgressionCelebration` in the root layout. */
export type Celebration =
  | { id: string; kind: 'level'; level: number; unlocks: LevelUnlocks }
  | { id: string; kind: 'achievement'; achievementId: string }

/** The per-day counters `bumpTodayActivity` can advance. */
type ActivityField = 'wordsLearned' | 'reviewsCompleted' | 'charactersWritten' | 'listeningAnswered'

export interface NewWordSeen {
  wordId: string
  outcome: 'skipped' | 'added'
  at: string
}

/** One word heard in the listening drill, for its Recent sheet. */
export interface WordListened {
  wordId: string
  /** "unsure" is "I don't know" — the answer was shown, nothing was guessed. */
  outcome: 'correct' | 'incorrect' | 'unsure'
  at: string
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
  /**
   * Takes words back out of the deck. Exists to undo an add the learner didn't
   * mean — chiefly the dictionary's bulk add, where one tap can drop twenty
   * cards in at once. Review history for those words goes with them, which is
   * the point: an undo that left the cards half-scheduled wouldn't be an undo.
   */
  removeFromReviewDeck: (wordIds: string[]) => void
  addCustomWord: (input: CustomWordInput) => void
  /**
   * Commits a review grade.
   *
   * `preview` is the four-way outcome the learner was shown, and passing it is
   * what makes the interval on the button the interval that gets stored —
   * FSRS's fuzz is seeded from the review instant, so recomputing a few seconds
   * later disagrees. `durationMs` is analytics only and never touches the
   * schedule. See lib/srs.ts.
   */
  gradeCard: (wordId: string, grade: Grade, preview?: ReviewPreview, durationMs?: number) => void
  /** Every graded review, newest last. Never includes "I don't know". */
  reviewLog: ReviewLogEntry[]

  /**
   * New Words cards already shown, newest last — skipped or added.
   *
   * Persisted, so a skip survives leaving the screen and the queue carries on
   * where it left off instead of rewinding to the word that was just dismissed.
   */
  newWordHistory: NewWordSeen[]
  /** Records a skip. The word drops out of the New Words queue until unskipped. */
  skipNewWord: (wordId: string) => void
  /** Records that a New Words card was added to the deck, for the Recent sheet. */
  noteNewWordAdded: (wordId: string) => void
  /** Puts a skipped word back in the queue, from the Recent sheet. */
  unskipNewWord: (wordId: string) => void
  clearNewWordHistory: () => void
  /**
   * Words heard in the listening drill, newest last, one entry per word (a
   * repeat replaces the earlier one). Persisted so the drill's Recent sheet
   * lists what was listened to across sessions, not just this one.
   */
  listeningHistory: WordListened[]
  noteWordListened: (wordId: string, outcome: WordListened['outcome']) => void
  clearListeningHistory: () => void
  /**
   * When each word was last on a Match the Pairs board (ISO), by word id.
   * Persisted so the boards rotate through the whole deck across sessions
   * rather than drawing the same five words every time — see
   * `pickMatchWords` in lib/mixedDrills.ts.
   */
  matchHistory: Record<string, string>
  noteWordsMatched: (wordIds: string[]) => void
  /**
   * Starred words, by id. Independent of the deck: a word can be starred on a
   * New Words card before it is added, and keeps its star if it is removed and
   * added again.
   */
  favoriteWordIds: string[]
  toggleFavorite: (wordId: string) => void
  completePracticeRep: (wordId: string) => void

  /*
   * ── Progression ──────────────────────────────────────────────────────────
   * XP, levels, profile rewards, achievements and the garden. The rules live
   * in `lib/progression/`; this is only the stored state and the calls that
   * change it.
   */
  progression: ProgressionState
  /** Lifetime totals every achievement is measured against. */
  achievementStats: AchievementStats
  /**
   * The single way XP is earned. Returns what the grant unlocked (empty when it
   * crossed no reward level); the celebration itself is queued automatically.
   */
  awardXp: (amount: number, source: XpSource) => LevelUnlocks
  /**
   * Developer only (Settings → General → Advanced). Sets the XP total outright,
   * which is also how a level is set — the level is derived from XP. Lowering it
   * winds `levelReached` back too, so climbing again replays the level-up.
   */
  devSetXp: (total: number) => void
  /** Report a learning event the progression system counts. */
  trackLearningEvent: (event: LearningEvent) => void
  equipProfileReward: (id: ProfileRewardId, equipped: boolean) => void
  pinAchievement: (id: string) => PinResult
  unpinAchievement: (id: string) => void
  replacePinnedAchievement: (outgoing: string, incoming: string) => void
  /** False when every slot is taken and no `slot` was named — ask which to replace. */
  placeGardenItem: (item: GardenItemId, slot?: GardenSlotId) => boolean
  removeGardenItem: (item: GardenItemId) => void
  celebrations: Celebration[]
  dismissCelebration: (id: string) => void

  onboardingComplete: boolean
  placementResult?: PlacementResult
  completeOnboarding: (result: PlacementResult) => void
  retakePlacementTest: () => void
  /**
   * Developer: wipe everything back to a fresh install — empty deck, no
   * progress, onboarding and the tour both unseen. Destructive by design.
   */
  resetToFirstRun: () => void

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

  /**
   * Shifu's guided tour: whether it has been offered, taken, finished or turned
   * down, and which step is up while it runs. Persisted per device. A tour
   * interrupted by the app closing is offered again rather than resumed — see
   * `normalizeTour` in lib/tour.ts.
   */
  tour: TourState
  /**
   * Until when the learner has said they can't listen (ISO), or null. While it
   * is in the future, Mixed Drills plans no listening questions — see
   * `isListeningPaused` in lib/mixedDrills.ts. Device-owned: it describes where
   * this phone is right now, not the learner's progress.
   */
  listeningPausedUntil: string | null
  pauseListening: (minutes: number) => void
  /** Arms the small "Want me to show you around?" prompt (end of onboarding). */
  offerTour: () => void
  /** Starts the tour at its first step — "Show me", or a replay from Settings. */
  startTour: () => void
  /** Moves on from `from`. A no-op unless `from` is the step that is up. */
  advanceTour: (from: TourStepId) => void
  /** Ends the tour. `dismissed` means it is never offered again unasked. */
  endTour: (outcome: 'completed' | 'dismissed') => void
  /**
   * Told by a screen that the learner just did something. Moves the tour on only
   * when the current step was waiting for exactly that, so screens can report
   * freely without knowing anything about where the tour has got to.
   */
  reportTourAction: (action: TourAction) => void
  /**
   * The per-tab guides (Learn, Dictionary, Settings) this device has already
   * shown — seen through or skipped. See `lib/screenTours.ts`.
   */
  seenScreenTours: ScreenTourId[]
  markScreenTourSeen: (id: ScreenTourId) => void
  /** Shows every screen guide again on the next visit to its tab. */
  replayScreenTours: () => void

  /**
   * The ad-free subscription, and **the app's only source of truth for it**.
   *
   * Nothing else may keep its own `isPremium` flag: an entitlement that two
   * screens disagree about is a learner who has paid on one screen and not on
   * another. Anything that needs to know asks `isAdFree` here.
   */
  subscription: Entitlement | null
  /**
   * Progress sitting in this device's guest namespace that the signed-in
   * account could take, or null. Offered, never applied automatically — see
   * `findRecoverableGuestProgress`.
   */
  recoverableProgress: RecoverableProgress | null
  adoptRecoverableProgress: () => Promise<void>
  dismissRecoverableProgress: () => Promise<void>
  isAdFree: boolean
  /** Records a confirmed purchase or restore. Never called from a button press alone. */
  applyEntitlement: (entitlement: Entitlement) => void
  /** Development only — drops a simulated entitlement so the state can be re-tested. */
  clearEntitlement: () => void
}

const RECENT_SEARCH_LIMIT = 8

/*
 * Graded reviews are no longer capped.
 *
 * There used to be a `REVIEW_LOG_LIMIT = 5000` here, applied as
 * `.slice(-5000)` on every graded card. It was the right instinct about the
 * wrong thing: the cost being controlled was one AsyncStorage value being
 * re-serialised on a hot path, and the price paid was the oldest reviews
 * silently ceasing to exist — which, once sync is on, means derived XP is
 * wrong and truncated events are re-queued for push for ever.
 *
 * `lib/reviewHistory.ts` keeps the same write cost without the deletion:
 * `reviewLog` below is now the recent *window*, older events are sealed into
 * immutable archive chunks, and `reviewLedger` carries what those chunks add
 * up to. Nothing is ever dropped.
 */

/** How many New Words cards to remember having shown. */
const NEW_WORD_HISTORY_LIMIT = 60

/** How many listened words the listening drill's Recent sheet remembers. */
const LISTENING_HISTORY_LIMIT = 100

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  /*
   * The signed-in identity, read here only so a change of account can drop the
   * cached entitlement — see the effect further down. `AuthProvider` wraps this
   * one in the root layout, so the hook is always available.
   */
  const { ready: authReady, userId, email } = useAuth()
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  /*
   * A new learner's deck is empty, not seeded.
   *
   * It used to start as `mockDeck`, which meant somebody who had just finished
   * onboarding was greeted by a Review screen with cards due for words they had
   * never seen and had not chosen. The deck is meant to be a record of what the
   * learner picked up; handing them somebody else's is the wrong first
   * impression of what the app is for. The fixture still exists in
   * `data/mockDeck.ts` for anyone who wants a populated deck to develop against.
   */
  const [deck, setDeck] = useState<SrsCard[]>([])
  const [reviewLog, setReviewLog] = useState<ReviewLogEntry[]>([])
  /*
   * What the sealed review archive adds up to.
   *
   * A ref rather than state: nothing renders from it, and it must be readable
   * by the save effect at the instant that effect runs rather than one render
   * later. `reviewLog` above is now the *window* — the most recent events —
   * and this is how the rest of the history is accounted for without loading
   * it. See `lib/reviewHistory.ts`.
   */
  const reviewLedger = useRef<ReviewLedger>(EMPTY_LEDGER)
  /*
   * The sequence number of `reviewLog[0]`.
   *
   * Kept beside the ledger rather than derived from it, because the two are
   * *allowed* to disagree: a crash between the ledger write and the window
   * write leaves a window still holding entries the ledger has already sealed.
   * Assuming `startSeq === ledger.sealed` counts those twice, which is a
   * learner's XP silently inflating after a crash.
   */
  const reviewWindowStart = useRef(0)
  /*
   * Which New Words cards the learner has already been shown, newest last.
   *
   * Persisted, and that is the whole point: this used to be component-local
   * state in NewWords.tsx, so skipping a word only lasted as long as the screen
   * stayed mounted. Leaving and coming back put the skipped word straight back
   * on top, which reads as the app not having listened. A skip is a decision
   * about a word, so it belongs with the rest of the learner's state.
   */
  const [newWordHistory, setNewWordHistory] = useState<NewWordSeen[]>([])
  const [listeningHistory, setListeningHistory] = useState<WordListened[]>([])
  const [matchHistory, setMatchHistory] = useState<Record<string, string>>({})
  const [customWords, setCustomWords] = useState<VocabWord[]>([])
  const [dailyProgress, setDailyProgress] = useState<DailyProgress[]>([])
  const [streakState, setStreakState] = useState<StreakState>({ streak: 0, lastActiveDate: null })
  const [onboarding, setOnboarding] = useState<OnboardingState>({ complete: false })
  const [xp, setXp] = useState(0)
  const [unlockedBuildingIds, setUnlockedBuildingIds] = useState<string[]>([])
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([])
  const [newlyAddedWordIds, setNewlyAddedWordIds] = useState<string[]>([])
  const [favoriteWordIds, setFavoriteWordIds] = useState<string[]>([])
  const [progression, setProgression] = useState<ProgressionState>(DEFAULT_PROGRESSION)
  /* Not persisted: a celebration nobody saw before closing the app is not
     owed on the next launch — the reward itself is already theirs. */
  const [celebrations, setCelebrations] = useState<Celebration[]>([])
  const [devClockOverride, setDevClockOverrideState] = useState<string | null>(null)
  const [claimedChallengeIds, setClaimedChallengeIds] = useState<string[]>([])
  const [recentSearchIds, setRecentSearchIds] = useState<string[]>([])
  const [storyProgress, setStoryProgress] = useState<Record<string, number>>({})
  const [tour, setTour] = useState<TourState>(INITIAL_TOUR)
  const [seenScreenTours, setSeenScreenTours] = useState<ScreenTourId[]>([])
  const [listeningPausedUntil, setListeningPausedUntil] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<Entitlement | null>(null)
  /**
   * Cards whose word the bank no longer resolves, held rather than destroyed.
   *
   * ── Why this is not a filter any more ────────────────────────────────────
   * The deck used to be filtered on hydrate and the unresolved cards simply
   * vanished, which was survivable while the loss stopped at one handset. Word
   * ids have already changed once (positional `imp-1-0001` -> content-derived
   * `cc-學習`), and the next rebuild that moves one would, with sync enabled,
   * replicate that deletion to every device the learner owns — permanently, and
   * with no way back.
   *
   * Quarantined cards keep every FSRS field untouched and are re-admitted
   * automatically the moment their word resolves again, so a bank fix restores
   * the schedule instead of the learner re-earning it.
   */
  const [quarantinedCards, setQuarantinedCards] = useState<SrsCard[]>([])
  const [recoverableProgress, setRecoverableProgress] = useState<RecoverableProgress | null>(null)
  /* Bumped to force the scope effect to run again after an explicit adoption. */
  const [scopeEpoch, setScopeEpoch] = useState(0)

  /*
   * Persistence is suspended while the active account is changing.
   *
   * Between resetting in-memory state and finishing the load for the arriving
   * learner, every one of the save effects below would otherwise fire and write
   * *defaults* into that learner's namespace — destroying the very data being
   * loaded. This gate is what makes the switch safe; the per-key
   * `skipNextSave` flags below remain, re-armed on each hydrate, so an
   * unreadable value is never written back over the real one.
   */
  const writeGate = useRef(false)
  /** The scope currently loaded into memory, as `scopeId`. Null before the first. */
  const hydratedScope = useRef<string | null>(null)

  useEffect(() => {
    /* Nothing loads until auth has resolved. Before that the app does not know
       whose deck to read, and reading somebody's is the defect being fixed. */
    if (!authReady) return
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
        loadedTour,
        loadedScreenTours,
        loadedListeningPausedUntil,
        loadedSubscription,
        loadedReviewHistory,
        loadedNewWordHistory,
        loadedListeningHistory,
        loadedMatchHistory,
        loadedQuarantined,
        loadedFavoriteWordIds,
        loadedProgression,
      ] = await Promise.all([
        loadStored('settings', DEFAULT_SETTINGS),
        loadStored('deck', [] as SrsCard[]),
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
        /* `undefined` rather than null as the fallback: a stored null means
           the old fourteen-step tour ended, and has to be told apart from a
           key that was never written. See `normalizeTour`. */
        loadStored<unknown>('tourStep', undefined),
        loadStored<unknown>('screenTours', []),
        loadStored('listeningPausedUntil', null as string | null),
        loadStored('subscription', null as Entitlement | null),
        loadReviewHistory(deviceStore, getActiveScope()),
        loadStored('newWordHistory', [] as NewWordSeen[]),
        loadStored('listeningHistory', [] as WordListened[]),
        loadStored('matchHistory', {} as Record<string, string>),
        loadStored('quarantinedCards', [] as SrsCard[]),
        loadStored('favoriteWordIds', [] as string[]),
        loadStored('progression', DEFAULT_PROGRESSION as unknown),
      ])
      if (cancelled) return
      // `script` is a real preference again — it used to be forced to
      // 'traditional' here regardless of what was persisted, because the bundled
      // stroke data covered traditional forms only. Both scripts are bundled now.
      setSettings({ ...DEFAULT_SETTINGS, ...loadedSettings })
      // Drop cards whose word no longer exists. The bulk word bank was rebuilt
      // from CC-CEDICT with content-derived ids ("cc-学习") replacing the old
      // positional ones ("imp-1-0001"), so decks saved before that migration
      // carry dangling references — and a dangling *current* card would leave
      // Review rendering nothing with no way to advance.
      // `wordById` rather than a set of hskFrequency ids, so a card added from
      // the tier-2 lookup tail (id `lk-…`, not in the learning bank) resolves
      // and survives instead of being dropped as dangling on every launch.
      /*
       * ...and migrate SM-2 cards to FSRS on the way in.
       *
       * `migrateDeck` is a no-op for a deck already at v2, so this runs on every
       * hydrate and converts exactly once. It is deliberately conservative: due
       * dates are preserved, so nothing that was not already due becomes due,
       * and no review history is invented. See `migrateCard` in lib/srs.ts.
       */
      const customIds = new Set(loadedCustomWords.map((w) => w.id))
      const resolves = (wordId: string) =>
        customIds.has(wordId) || Boolean(wordByIdInBank(wordId))

      /* Previously quarantined cards are reconsidered first — a bank rebuild
         that restores an id should hand the learner their schedule back. The
         deck's own copy wins a duplicate, being the one in active use. */
      const pool = new Map<string, SrsCard>()
      for (const card of loadedQuarantined) pool.set(card.wordId, card)
      for (const card of loadedDeck) pool.set(card.wordId, card)

      const active: SrsCard[] = []
      const held: SrsCard[] = []
      for (const card of pool.values()) (resolves(card.wordId) ? active : held).push(card)

      setDeck(migrateDeck(active))
      setQuarantinedCards(held)
      reviewLedger.current = loadedReviewHistory.ledger
      reviewWindowStart.current = loadedReviewHistory.window.startSeq
      setReviewLog(loadedReviewHistory.window.entries)
      setNewWordHistory(loadedNewWordHistory)
      setListeningHistory(loadedListeningHistory)
      setMatchHistory(loadedMatchHistory)
      setFavoriteWordIds(loadedFavoriteWordIds)
      setProgression(normaliseProgression(loadedProgression))
      setCelebrations([])
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
      setListeningPausedUntil(loadedListeningPausedUntil)
      setTour(normalizeTour(loadedTour))
      setSeenScreenTours(normalizeSeenScreenTours(loadedScreenTours))
      /*
       * The stored entitlement gets the app through the first moment of a cold
       * launch — a real subscriber must not be shown a paywall while the store
       * is still being asked, least of all offline. It is *provisional* and
       * nothing more; `cachedEntitlementIsUsable` refuses it outright in a
       * production build that has no store able to validate it.
       *
       * ── The bug this replaced ────────────────────────────────────────────
       * This used to read `if (fromStore) setSubscription(fromStore)`, which
       * only ever let the store *grant*. A `null` — expired, cancelled,
       * refunded, revoked — left the stored value in place, so premium was
       * permanent once written and the comment claiming cancellation "has to
       * stop being honoured" was not true of the code beneath it. Combined with
       * an unvalidated cache, anything that could write that storage key had
       * premium for life.
       *
       * Now the store's answer is authoritative in **both** directions, and the
       * `hasStore()` guard is what keeps that honest: with no store registered,
       * `currentEntitlement()` returns null meaning "nobody asked", not "not
       * subscribed", and acting on it would wipe the simulated entitlement the
       * development build runs on.
       */
      setSubscription(cachedEntitlementIsUsable(loadedSubscription) ? loadedSubscription : null)
      void currentEntitlement().then((fromStore) => {
        if (cancelled) return
        if (hasStore()) setSubscription(fromStore)
        else if (!__DEV__) setSubscription(null)
      })
      setReady(true)
    }
    /*
     * Entering a scope, in an order that is load-bearing:
     *
     *   suspend writes -> migrate/adopt -> point storage at the new scope
     *   -> clear the previous learner from memory -> re-arm guards -> load
     *
     * Any other order either persists one account's defaults into another's
     * namespace, or leaves the outgoing account's deck on screen under the
     * incoming account's session.
     */
    async function enterScope() {
      const scope = await resolveScope(deviceStore, userId)
      if (cancelled) return
      /* Same learner as the one already loaded: nothing to do, and crucially no
         reason to disturb the write gate. */
      if (scopeId(scope) === hydratedScope.current) return

      const first = hydratedScope.current === null
      writeGate.current = false
      /* A switch briefly holds the splash rather than flashing the arriving
         account through onboarding: `onboarding.complete` is false for the
         moment between the reset and the load, and the root layout redirects on
         exactly that. */
      if (!first) setReady(false)

      await migrateLegacyKeys(deviceStore, scope)
      if (cancelled) return
      if (scope.kind === 'user') {
        await maybeAdoptGuestProgress(deviceStore, scope.userId, email)
        if (cancelled) return
      }

      setActiveScope(scope)
      /* Storage now points away from any account deleted a moment ago, so its
         on-device copy can be erased without a save racing it back. */
      void purgeDeletedAccounts()
      /* The store learns who is signed in at the same instant storage does, so
         an entitlement and a deck can never describe two different people. */
      await identifyUser(scope.kind === 'user' ? scope.userId : null)
      if (cancelled) return
      if (!first) resetAccountState()
      rearmFirstSaveGuards()

      await hydrate()
      if (cancelled) return
      hydratedScope.current = scopeId(scope)
      writeGate.current = true

      /* Restoring an account from Supabase. Off by default, read-only when on. */
      if (!cancelled) await restoreFromCloud(scope)
      if (cancelled) return

      /* Nothing is moved here — this only asks whether there is something to
         offer, so the UI can put the choice in front of the learner. */
      if (scope.kind === 'user') {
        const stranded = await findRecoverableGuestProgress(
          deviceStore,
          scope,
          await installationId(deviceStore),
        )
        if (!cancelled) setRecoverableProgress(stranded)
      } else {
        setRecoverableProgress(null)
      }
    }

    void enterScope()
    return () => {
      cancelled = true
    }
  }, [authReady, userId, email, scopeEpoch])

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
    tourStep: true,
    screenTours: true,
    listeningPausedUntil: true,
    subscription: true,
    reviewLog: true,
    newWordHistory: true,
    listeningHistory: true,
    matchHistory: true,
    quarantinedCards: true,
    favoriteWordIds: true,
    progression: true,
  })

  /**
   * Pulls this account's rows and folds them into what is already here.
   *
   * ── Read-only, and off ───────────────────────────────────────────────────
   * Gated on `FEATURES.cloudSync`, which is false, so none of this runs today.
   * Even when it is switched on it only reads. An outbox *is* filled (see the
   * effect below) and `lib/sync/push.ts` can drain one, but **nothing in the
   * app calls `pushOutbox`** — so today the queue accumulates and is never
   * sent, and nothing a learner does here can reach the server or overwrite
   * what another device put there. That asymmetry is deliberate for this
   * stage: a restore that is wrong costs a reload, a push that is wrong costs
   * a deck. Wiring the drain is the next piece of sync work, not an oversight.
   *
   * Local values are re-read from storage rather than from React state because
   * the `setState` calls in `hydrate` have not been applied yet at this point;
   * reading state here would merge against the *previous* account's values.
   *
   * A failure is silent and total: local state stands exactly as hydrated. A
   * learner on a plane sees their own deck, not an error.
   */
  const restoreFromCloud = async (scope: ReturnType<typeof getActiveScope>) => {
    if (!FEATURES.cloudSync) return
    if (!scope || scope.kind !== 'user' || !isSupabaseConfigured) return
    try {
      const snapshot = await pullSnapshot(
        getSupabase() as unknown as SyncReadClient,
        scope.userId,
      )
      const storedSettings = await loadStored('settings', DEFAULT_SETTINGS)
      /* The *whole* history, archive included — not the window. A merge that
         saw only the recent window would treat everything older as absent on
         this device and hand it back as new, and the rebuild below would then
         write an archive missing its own oldest events. Reading every chunk is
         affordable here precisely because this runs once, at sign-in. */
      const storedHistory = await loadReviewHistory(deviceStore, scope)
      const localReviewLog = await readAllReviewEvents(deviceStore, scope, storedHistory.window, storedHistory.ledger)
      const local: LocalAccountState = {
        deck: await loadStored('deck', [] as SrsCard[]),
        reviewLog: localReviewLog,
        customWords: await loadStored('customWords', [] as VocabWord[]),
        dailyProgress: await loadStored('dailyProgress', [] as DailyProgress[]),
        storyProgress: await loadStored('storyProgress', {} as Record<string, number>),
        completedLessonIds: await loadStored('completedLessonIds', [] as string[]),
        claimedChallengeIds: await loadStored('claimedChallengeIds', [] as string[]),
        unlockedBuildingIds: await loadStored('unlockedBuildingIds', [] as string[]),
        xp: await loadStored('xp', 0),
        streak: (await loadStored('streak', { streak: 0, lastActiveDate: null } as StreakState)).streak,
        settings: accountSettings({ ...DEFAULT_SETTINGS, ...storedSettings }),
      }

      /* `derivedXp` is what makes `review_events` the authority over a bare
         counter rather than a third opinion. The history is merged once here,
         up front, so the XP can be derived from it — every event from both
         sides, deduplicated by event id, which is the one number that cannot be
         inflated by a device having counted the same review twice.
         `mergeReviewEvents` is idempotent, so mergeSnapshot doing it again
         internally costs a pass and changes nothing. */
      const mergedReviewLog = mergeReviewEvents(
        local.reviewLog,
        snapshot.reviewEvents.map(rowToReview),
      )
      const derivedXp = mergedReviewLog.reduce((sum, entry) => sum + xpForGrade(entry.grade), 0)

      const merged = mergeSnapshot(local, snapshot, { today: todayISO(), derivedXp })

      /* Through `migrateDeck` like every other path into the deck, so a v1 card
         arriving from another device is converted here rather than reaching the
         scheduler as SM-2. */
      setDeck(migrateDeck(merged.deck))
      /* The merged history can contain events older than anything this device
         had sealed, so the archive is rewritten rather than appended to —
         otherwise the same event would exist in both tiers and be counted
         twice. See `rebuildReviewHistory`. */
      const rebuilt = await rebuildReviewHistory(
        deviceStore,
        scope,
        merged.reviewLog,
        storedHistory.ledger,
        xpForGrade,
      )
      reviewLedger.current = rebuilt.ledger
      reviewWindowStart.current = rebuilt.window.startSeq
      skipNextSave.current.reviewLog = true
      setReviewLog(rebuilt.window.entries)
      setCustomWords(merged.customWords)
      setDailyProgress(merged.dailyProgress)
      setStoryProgress(merged.storyProgress)
      setCompletedLessonIds(merged.completedLessonIds)
      setClaimedChallengeIds(merged.claimedChallengeIds)
      setUnlockedBuildingIds(merged.unlockedBuildingIds)
      setXp(merged.xp)
      setStreakState((prev) => ({ ...prev, streak: merged.streak }))
      setSettings((prev) => ({ ...prev, ...merged.settings }))
    } catch {
      /* Offline, RLS refusal, a table not yet created — all the same answer:
         keep what this device already had. */
    }
  }

  /*
   * Filling the outbox.
   *
   * One effect, watching the account state, rather than an `enqueue` beside
   * each of the twenty-odd mutations — see `lib/sync/changes.ts` for why. It
   * runs after the UI has already updated, so nothing a learner does waits on
   * it, and it is a no-op while `FEATURES.cloudSync` is off.
   *
   * The first run after a scope change only *seeds* the baseline: the state
   * that has just been hydrated came from storage, not from the learner, and
   * queueing all of it would push a freshly restored account straight back at
   * the server.
   */
  const syncBaseline = useRef<SyncSnapshot | null>(null)
  useEffect(() => {
    if (!FEATURES.cloudSync) return
    if (!writeGate.current) return

    const snapshot: SyncSnapshot = {
      deck,
      reviewLog,
      customWords,
      dailyProgress,
      storyProgress,
      completedLessonIds,
      claimedChallengeIds,
      unlockedBuildingIds,
      xp,
      streak: streakState.streak,
      onboardingComplete: onboarding.complete,
      preferences: accountSettings(settings),
    }

    const previous = syncBaseline.current
    syncBaseline.current = snapshot
    if (!previous) return

    const intents = changedIntents(previous, snapshot)
    if (intents.length === 0) return

    void (async () => {
      const queue = await loadStored('syncOutbox', [] as OutboxEntry[])
      await saveStored('syncOutbox', enqueue(queue, intents, new Date().toISOString()))
    })()
  }, [
    deck,
    reviewLog,
    customWords,
    dailyProgress,
    storyProgress,
    completedLessonIds,
    claimedChallengeIds,
    unlockedBuildingIds,
    xp,
    streakState,
    onboarding,
    settings,
  ])

  /** Re-arms the per-key first-save guards, so a new scope loads exactly as a cold start does. */
  const rearmFirstSaveGuards = () => {
    for (const key of Object.keys(skipNextSave.current) as (keyof typeof skipNextSave.current)[]) {
      skipNextSave.current[key] = true
    }
  }

  /**
   * Clears the outgoing learner from memory on an account switch.
   *
   * Account-owned state only: `tour`, `devClockOverride` and
   * `recentSearchIds` describe this handset rather than this person, are stored
   * unscoped, and would only flicker if reset and immediately re-read.
   */
  const resetAccountState = () => {
    /* Dropped so the arriving account's first snapshot seeds a fresh baseline
       rather than being diffed against the departing account's state. */
    syncBaseline.current = null
    setSettings(DEFAULT_SETTINGS)
    setDeck([])
    setQuarantinedCards([])
    setReviewLog([])
    reviewLedger.current = EMPTY_LEDGER
    reviewWindowStart.current = 0
    setNewWordHistory([])
    setListeningHistory([])
    setMatchHistory({})
    setFavoriteWordIds([])
    setProgression(DEFAULT_PROGRESSION)
    setCelebrations([])
    setCustomWords([])
    setDailyProgress([])
    setStreakState({ streak: 0, lastActiveDate: null })
    setOnboarding({ complete: false })
    setXp(0)
    setUnlockedBuildingIds([])
    setCompletedLessonIds([])
    setNewlyAddedWordIds([])
    setClaimedChallengeIds([])
    setStoryProgress({})
    setSubscription(null)
  }

  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.settings) { skipNextSave.current.settings = false; return }
    void saveStored('settings', settings)
  }, [settings])

  /*
   * Push the two feedback switches down into their bridges. Deliberately *not*
   * guarded by `skipNextSave` the way the persistence effects are: those skip
   * the first render to avoid clobbering storage with a placeholder, whereas
   * this needs to run on it, or the app would play sound at the default until
   * the learner happened to change something else.
   */
  useEffect(() => {
    setSoundEnabled(settings.soundEnabled)
    setHapticsEnabled(settings.hapticsEnabled)
  }, [settings.soundEnabled, settings.hapticsEnabled])
  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.deck) { skipNextSave.current.deck = false; return }
    void saveStored('deck', deck)
  }, [deck])
  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.quarantinedCards) { skipNextSave.current.quarantinedCards = false; return }
    void saveStored('quarantinedCards', quarantinedCards)
  }, [quarantinedCards])

  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.reviewLog) { skipNextSave.current.reviewLog = false; return }
    /*
     * Persisting seals whatever has overflowed the window into an archive
     * chunk, so this is where a lifetime of history is kept bounded *in memory*
     * without any of it being deleted. The returned window is set back into
     * state — one extra render on the rare grade that crosses a chunk boundary,
     * none on any other, and the two stay in step so the next seal starts from
     * the right sequence number.
     */
    void persistReviewHistory(
      deviceStore,
      getActiveScope(),
      { v: 2, startSeq: reviewWindowStart.current, entries: reviewLog },
      reviewLedger.current,
      xpForGrade,
    ).then(({ window, ledger }) => {
      reviewLedger.current = ledger
      reviewWindowStart.current = window.startSeq
      if (window.entries.length !== reviewLog.length) {
        skipNextSave.current.reviewLog = true
        setReviewLog(window.entries)
      }
    })
  }, [reviewLog])
  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.favoriteWordIds) { skipNextSave.current.favoriteWordIds = false; return }
    void saveStored('favoriteWordIds', favoriteWordIds)
  }, [favoriteWordIds])

  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.progression) { skipNextSave.current.progression = false; return }
    void saveStored('progression', progression)
  }, [progression])
  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.newWordHistory) { skipNextSave.current.newWordHistory = false; return }
    void saveStored('newWordHistory', newWordHistory)
  }, [newWordHistory])
  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.listeningHistory) { skipNextSave.current.listeningHistory = false; return }
    void saveStored('listeningHistory', listeningHistory)
  }, [listeningHistory])
  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.matchHistory) { skipNextSave.current.matchHistory = false; return }
    void saveStored('matchHistory', matchHistory)
  }, [matchHistory])
  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.customWords) { skipNextSave.current.customWords = false; return }
    void saveStored('customWords', customWords)
  }, [customWords])
  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.dailyProgress) { skipNextSave.current.dailyProgress = false; return }
    void saveStored('dailyProgress', dailyProgress)
  }, [dailyProgress])
  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.streak) { skipNextSave.current.streak = false; return }
    void saveStored('streak', streakState)
  }, [streakState])

  /*
   * The ascending ladder when the streak ticks over.
   *
   * Watched here rather than fired from registerActivity, because that increment
   * happens inside a setState updater — updaters must stay pure, and React can
   * call them twice. `previousStreak` starts unset so hydrating a saved streak on
   * launch doesn't celebrate a day that was already earned.
   */
  const previousStreak = useRef<number | null>(null)
  useEffect(() => {
    const before = previousStreak.current
    previousStreak.current = streakState.streak
    if (before !== null && streakState.streak > before) ladderHaptic()
  }, [streakState.streak])
  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.onboarding) { skipNextSave.current.onboarding = false; return }
    void saveStored('onboarding', onboarding)
  }, [onboarding])
  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.xp) { skipNextSave.current.xp = false; return }
    void saveStored('xp', xp)
  }, [xp])
  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.unlockedBuildingIds) { skipNextSave.current.unlockedBuildingIds = false; return }
    void saveStored('unlockedBuildingIds', unlockedBuildingIds)
  }, [unlockedBuildingIds])
  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.completedLessonIds) { skipNextSave.current.completedLessonIds = false; return }
    void saveStored('completedLessonIds', completedLessonIds)
  }, [completedLessonIds])
  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.newlyAddedWordIds) { skipNextSave.current.newlyAddedWordIds = false; return }
    void saveStored('newlyAddedWordIds', newlyAddedWordIds)
  }, [newlyAddedWordIds])
  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.devClockOverride) { skipNextSave.current.devClockOverride = false; return }
    void saveStored('devClockOverride', devClockOverride)
  }, [devClockOverride])
  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.claimedChallengeIds) { skipNextSave.current.claimedChallengeIds = false; return }
    void saveStored('claimedChallengeIds', claimedChallengeIds)
  }, [claimedChallengeIds])
  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.recentSearchIds) { skipNextSave.current.recentSearchIds = false; return }
    void saveStored('recentSearchIds', recentSearchIds)
  }, [recentSearchIds])
  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.storyProgress) { skipNextSave.current.storyProgress = false; return }
    void saveStored('storyProgress', storyProgress)
  }, [storyProgress])
  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.tourStep) { skipNextSave.current.tourStep = false; return }
    void saveStored('tourStep', tour)
  }, [tour])
  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.screenTours) { skipNextSave.current.screenTours = false; return }
    void saveStored('screenTours', seenScreenTours)
  }, [seenScreenTours])
  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.listeningPausedUntil) { skipNextSave.current.listeningPausedUntil = false; return }
    void saveStored('listeningPausedUntil', listeningPausedUntil)
  }, [listeningPausedUntil])
  useEffect(() => {
    if (!writeGate.current) return
    if (skipNextSave.current.subscription) { skipNextSave.current.subscription = false; return }
    void saveStored('subscription', subscription)
  }, [subscription])

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

  const bumpTodayActivity = useCallback((field: ActivityField, amount: number) => {
    setDailyProgress((prev) => {
      const today = todayISO()
      const idx = prev.findIndex((d) => d.date === today)
      if (idx === -1) {
        return [...prev, { date: today, wordsLearned: 0, reviewsCompleted: 0, [field]: amount }]
      }
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: (copy[idx][field] ?? 0) + amount }
      return copy
    })
  }, [])

  const bumpDailyProgress = useCallback((count: number) => bumpTodayActivity('wordsLearned', count), [bumpTodayActivity])

  /*
   * The progression system's event intake — the one place a learning event is
   * counted. Writing and listening advance the day's history (which the daily
   * and weekly challenges read) as well as the lifetime totals; the rest are
   * lifetime-only. Deliberately not `registerActivity`: each of these happens
   * inside a review, a practice sheet or a story whose own actions already keep
   * the streak.
   */
  const trackLearningEvent = useCallback(
    (event: LearningEvent) => {
      const lifetime = (field: keyof ProgressionState['lifetime']) =>
        setProgression((prev) => ({ ...prev, lifetime: { ...prev.lifetime, [field]: prev.lifetime[field] + 1 } }))
      switch (event.type) {
        case 'WRITING_COMPLETED':
          if (event.characters > 0) bumpTodayActivity('charactersWritten', event.characters)
          break
        case 'LISTENING_ANSWERED':
          bumpTodayActivity('listeningAnswered', 1)
          if (event.correct) lifetime('listeningCorrect')
          break
        case 'REVIEW_SESSION_COMPLETED':
          lifetime('reviewSessions')
          break
        case 'STORY_FINISHED':
          lifetime('storiesFinished')
          break
      }
    },
    [bumpTodayActivity],
  )

  /*
   * XP. A ref mirrors it so `awardXp` can say synchronously what a grant
   * unlocked, without waiting for a render.
   */
  const xpRef = useRef(xp)
  xpRef.current = xp
  const awardXp = useCallback((amount: number, _source: XpSource): LevelUnlocks => {
    if (amount <= 0) return { rewards: [], gardenItems: [] }
    const before = getLevelFromXp(xpRef.current)
    xpRef.current += amount
    setXp((prev) => prev + amount)
    return unlocksBetween(before, getLevelFromXp(xpRef.current))
  }, [])

  const devSetXp = useCallback((total: number) => {
    const next = Math.max(0, Math.round(total))
    const nextLevel = getLevelFromXp(next)
    xpRef.current = next
    setXp(next)
    /* Unlocks already granted are kept — `reachLevel` never takes one back —
       but the high-water mark follows the level down, or raising XP again
       would cross no line and the level-up could never be re-tested. */
    setProgression((prev) =>
      prev.levelReached !== null && prev.levelReached > nextLevel ? { ...prev, levelReached: nextLevel } : prev,
    )
  }, [])

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

  const removeFromReviewDeck = useCallback((wordIds: string[]) => {
    if (wordIds.length === 0) return
    const drop = new Set(wordIds)
    setDeck((prev) => prev.filter((c) => !drop.has(c.wordId)))
    // Also clear any "new word" badges for them, or the Dictionary tab would go
    // on advertising words that are no longer in the deck.
    setNewlyAddedWordIds((prev) => prev.filter((id) => !drop.has(id)))
    /*
     * Daily progress is deliberately left alone. It's a record of what the
     * learner did today, not a running total of deck size — rewinding it would
     * let someone farm and undo their way around the daily counters, and it
     * would also wrongly claw back progress from words added earlier in the day.
     */
  }, [])

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
    (wordId: string, grade: Grade, preview?: ReviewPreview, durationMs = 0) => {
      setDeck((prev) =>
        prev.map((card) => {
          if (card.wordId !== wordId) return card
          const graded = gradeCardSrs(card, grade, settings.wrongAnswerReps, preview)
          /* Logged from inside the deck update so the entry is built against the
             card as it actually was, rather than against a copy read earlier that
             a concurrent update could already have replaced. */
          setReviewLog((log) => [...log, reviewLogEntry(card, graded, grade, durationMs)])
          return graded
        }),
      )
      bumpTodayActivity('reviewsCompleted', 1)
      registerActivity()
      awardXp(xpForGrade(grade), { type: 'review', wordId })
    },
    [settings.wrongAnswerReps, bumpTodayActivity, registerActivity, awardXp],
  )

  const unlockBuilding = useCallback(
    (buildingId: string, cost: number) => {
      /* XP is permanent progress and is never spent: a building's cost is the
         XP a learner must have *reached*, like a level. (My Town is switched
         off; this keeps it coherent for when it returns.) */
      if (unlockedBuildingIds.includes(buildingId) || xp < cost) return
      setUnlockedBuildingIds((prev) => [...prev, buildingId])
    },
    [xp, unlockedBuildingIds],
  )

  const completeLesson = useCallback((lessonId: string) => {
    setCompletedLessonIds((prev) => {
      if (prev.includes(lessonId)) return prev
      return [...prev, lessonId]
    })
    awardXp(XP_PER_LESSON, { type: 'lesson', lessonId })
  }, [awardXp])

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

  /** Records a shown New Words card, replacing any earlier entry for that word. */
  const recordNewWordSeen = useCallback((wordId: string, outcome: NewWordSeen['outcome']) => {
    setNewWordHistory((prev) =>
      [...prev.filter((entry) => entry.wordId !== wordId), { wordId, outcome, at: devNow().toISOString() }].slice(
        -NEW_WORD_HISTORY_LIMIT,
      ),
    )
  }, [])

  const skipNewWord = useCallback(
    (wordId: string) => recordNewWordSeen(wordId, 'skipped'),
    [recordNewWordSeen],
  )

  const noteNewWordAdded = useCallback(
    (wordId: string) => recordNewWordSeen(wordId, 'added'),
    [recordNewWordSeen],
  )

  /** Drops a word out of the history entirely, which puts it back in the queue. */
  const unskipNewWord = useCallback((wordId: string) => {
    setNewWordHistory((prev) => prev.filter((entry) => entry.wordId !== wordId))
  }, [])

  const clearNewWordHistory = useCallback(() => setNewWordHistory([]), [])

  const noteWordListened = useCallback((wordId: string, outcome: WordListened['outcome']) => {
    setListeningHistory((prev) =>
      [...prev.filter((entry) => entry.wordId !== wordId), { wordId, outcome, at: devNow().toISOString() }].slice(
        -LISTENING_HISTORY_LIMIT,
      ),
    )
  }, [])

  const clearListeningHistory = useCallback(() => setListeningHistory([]), [])

  /* Stamps a board's words, and drops entries for words no longer in the deck
     on the way, so the record stays the size of the deck rather than growing
     for the life of the install. */
  const noteWordsMatched = useCallback(
    (wordIds: string[]) => {
      const inDeck = new Set(deck.map((c) => c.wordId))
      const at = devNow().toISOString()
      setMatchHistory((prev) => {
        const next: Record<string, string> = {}
        for (const [id, when] of Object.entries(prev)) if (inDeck.has(id)) next[id] = when
        for (const id of wordIds) next[id] = at
        return next
      })
    },
    [deck],
  )

  const toggleFavorite = useCallback((wordId: string) => {
    setFavoriteWordIds((prev) => (prev.includes(wordId) ? prev.filter((id) => id !== wordId) : [...prev, wordId]))
  }, [])

  const updateDevClockOverride = useCallback((iso: string | null) => {
    setDevClockOverride(iso)
    setDevClockOverrideState(iso)
  }, [])

  const claimChallenge = useCallback(
    (challengeId: string, xpReward: number) => {
      if (claimedChallengeIds.includes(challengeId)) return
      setClaimedChallengeIds((prev) => [...prev, challengeId])
      awardXp(xpReward, { type: 'challenge', challengeId })
    },
    [claimedChallengeIds, awardXp],
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

  const offerTour = useCallback(() => setTour(INITIAL_TOUR), [])
  const startTour = useCallback(() => setTour({ status: 'in_progress', step: 'home' }), [])

  /* Real time, not `devNow()`: this is a wall-clock promise to the learner
     ("for 30 minutes"), and a frozen developer clock would make it never end. */
  const pauseListening = useCallback((minutes: number) => {
    setListeningPausedUntil(new Date(Date.now() + minutes * 60_000).toISOString())
  }, [])

  /*
   * Advancing names the step it is leaving, so a late or doubled call — a
   * backstop timer and an animation callback both arriving, a screen reporting
   * twice — moves the tour once and not twice.
   */
  const advanceTour = useCallback((from: TourStepId) => {
    setTour((prev) => {
      if (prev.status !== 'in_progress' || prev.step !== from) return prev
      const next = nextTourStep(from)
      return next ? { status: 'in_progress', step: next } : { status: 'completed', step: null }
    })
  }, [])

  const endTour = useCallback((outcome: 'completed' | 'dismissed') => {
    setTour({ status: outcome, step: null })
  }, [])

  const reportTourAction = useCallback((action: TourAction) => {
    setTour((prev) => tourAfterAction(prev, action))
  }, [])

  const markScreenTourSeen = useCallback((id: ScreenTourId) => {
    setSeenScreenTours((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  const replayScreenTours = useCallback(() => setSeenScreenTours([]), [])

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

  /**
   * Wipes the install back to how it looks the very first time it is opened.
   *
   * This **is** a factory reset, and it is destructive on purpose: it exists so
   * the first-run experience — onboarding, the empty deck, Shifu's tour — can be
   * tested for real rather than approximated. Half a reset is worse than none,
   * because the thing you are checking is precisely what a new learner sees, and
   * a leftover streak or a deck with yesterday's words in it means you are not
   * looking at that. It lives behind Settings → Developer for the same reason.
   *
   * `devClockOverride` is the one thing kept. It is a testing instrument that
   * lives on the same screen as the button, not learner state, and resetting the
   * clock out from under whoever just set it would be fighting them.
   */
  const resetToFirstRun = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    setDeck([])
    setReviewLog([])
    reviewLedger.current = EMPTY_LEDGER
    reviewWindowStart.current = 0
    setNewWordHistory([])
    setListeningHistory([])
    setMatchHistory({})
    setFavoriteWordIds([])
    setProgression(DEFAULT_PROGRESSION)
    setCelebrations([])
    setCustomWords([])
    setDailyProgress([])
    setStreakState({ streak: 0, lastActiveDate: null })
    setOnboarding({ complete: false })
    setXp(0)
    setUnlockedBuildingIds([])
    setCompletedLessonIds([])
    setNewlyAddedWordIds([])
    setClaimedChallengeIds([])
    setRecentSearchIds([])
    setStoryProgress({})
    /*
     * Back to "not offered yet", not running: the prompt only appears once
     * onboarding is complete, so nothing draws over the welcome screen the
     * learner is about to be sent back to.
     */
    setTour(INITIAL_TOUR)
    setSeenScreenTours([])
    /*
     * A *simulated* entitlement is development state and goes with the rest of
     * it. A real one is not the app's to revoke — it lives with the store and
     * the account that paid for it, and the launch check will hand it straight
     * back anyway, so wiping it here would only mean a fresh install spent one
     * session showing ads to somebody who had paid not to see them.
     */
    setSubscription((prev) => (prev?.source === 'simulated' ? null : prev))
  }, [])

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }))
  }, [])

  /*
   * The account-switch leak is now closed by the storage scope itself.
   *
   * `subscription` is an account key, so it is stored under
   * `chinese-easy:<userId>:subscription` and a change of identity re-enters the
   * scope above: memory is cleared, the arriving learner's own cached
   * entitlement is loaded, and the store is re-asked as part of that hydrate.
   *
   * This replaces an effect that watched `userId` and dropped the cache by
   * hand. That effect was correct about the danger and could only ever treat
   * the symptom, because every key was global: it cleared the entitlement while
   * leaving the deck, the streak and the XP of the previous account in place.
   */

  /** Takes the offered guest progress, then reloads the account from storage. */
  const adoptRecoverableProgress = useCallback(async () => {
    const scope = getActiveScope()
    if (!scope || scope.kind !== 'user') return
    const result = await adoptGuestProgressExplicitly(
      deviceStore,
      scope,
      await installationId(deviceStore),
    )
    setRecoverableProgress(null)
    if (result.status !== 'adopted') return
    /* Force the scope effect to run again so the adopted values are loaded
       through the same path as any other hydrate, rather than being pushed into
       state by hand from two places. */
    hydratedScope.current = null
    setScopeEpoch((n) => n + 1)
  }, [])

  const dismissRecoverableProgress = useCallback(async () => {
    const scope = getActiveScope()
    if (scope?.kind === 'user') await dismissGuestRecovery(deviceStore, scope.userId)
    setRecoverableProgress(null)
  }, [])

  const applyEntitlement = useCallback((entitlement: Entitlement) => {
    setSubscription(entitlement)
  }, [])

  const clearEntitlement = useCallback(() => {
    setSubscription(null)
  }, [])

  // --- Progression ----------------------------------------------------------

  /*
   * Lifetime totals, derived wherever the app already keeps the history — so
   * a learner's past work counts from the first launch of this version — and
   * read from `progression.lifetime` for the three things it never recorded.
   */
  const achievementStats = useMemo<AchievementStats>(() => {
    let reviews = 0
    let charactersWritten = 0
    let listeningAnswered = 0
    for (const day of dailyProgress) {
      reviews += day.reviewsCompleted
      charactersWritten += day.charactersWritten ?? 0
      listeningAnswered += day.listeningAnswered ?? 0
    }
    return {
      wordsSaved: deck.length,
      reviews,
      reviewSessions: progression.lifetime.reviewSessions,
      charactersWritten,
      listeningAnswered,
      listeningCorrect: progression.lifetime.listeningCorrect,
      storiesFinished: progression.lifetime.storiesFinished,
      streak: streakState.streak,
      dailyChallengesCompleted: countDailyChallengeClaims(claimedChallengeIds),
    }
  }, [deck.length, dailyProgress, progression.lifetime, streakState.streak, claimedChallengeIds])

  const level = getLevelFromXp(xp)

  /*
   * The one place unlocks are granted and celebrations queued. It runs after
   * every change to XP or to the stats, compares against what has already been
   * handled, and does nothing when nothing crossed a line — so it is safe
   * however often it fires, and a grant that arrived by any route (a claim, a
   * review, a sync) is handled the same way.
   *
   * The first run for a profile seeds silently: see `ProgressionState.levelReached`.
   */
  useEffect(() => {
    if (!ready) return
    const silent = progression.levelReached === null
    const levelChange = reachLevel(progression, level)
    const achievementChange = evaluateAchievements(levelChange.state, achievementStats, devNow().toISOString(), {
      silent,
    })
    if (achievementChange.state === progression) return
    setProgression(achievementChange.state)
    const queued: Celebration[] = []
    if (levelChange.celebrate) {
      queued.push({
        id: `level-${levelChange.celebrate.to}`,
        kind: 'level',
        level: levelChange.celebrate.to,
        unlocks: levelChange.celebrate.unlocks,
      })
    }
    for (const achievementId of achievementChange.earned) {
      queued.push({ id: `achievement-${achievementId}`, kind: 'achievement', achievementId })
    }
    if (queued.length > 0) setCelebrations((prev) => [...prev, ...queued])
  }, [ready, level, achievementStats, progression])

  const dismissCelebration = useCallback((id: string) => {
    setCelebrations((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const equipProfileReward = useCallback((id: ProfileRewardId, equipped: boolean) => {
    setProgression((prev) => setRewardEquipped(prev, id, equipped))
  }, [])

  const pinAchievement = useCallback(
    (id: string): PinResult => {
      const { state, result } = pinAchievementIn(progression, id)
      if (result === 'pinned') setProgression(state)
      return result
    },
    [progression],
  )

  const unpinAchievement = useCallback((id: string) => {
    setProgression((prev) => unpinAchievementIn(prev, id))
  }, [])

  const replacePinnedAchievement = useCallback((outgoing: string, incoming: string) => {
    setProgression((prev) => replacePinnedIn(prev, outgoing, incoming))
  }, [])

  const placeGardenItem = useCallback(
    (item: GardenItemId, slot?: GardenSlotId): boolean => {
      const next = placeGardenItemIn(progression, item, slot)
      if (!next) return false
      setProgression(next)
      return true
    },
    [progression],
  )

  const removeGardenItem = useCallback((item: GardenItemId) => {
    setProgression((prev) => removeGardenItemIn(prev, item))
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
    removeFromReviewDeck,
    addCustomWord,
    gradeCard,
    completePracticeRep,
    progression,
    achievementStats,
    awardXp,
    devSetXp,
    trackLearningEvent,
    equipProfileReward,
    pinAchievement,
    unpinAchievement,
    replacePinnedAchievement,
    placeGardenItem,
    removeGardenItem,
    celebrations,
    dismissCelebration,
    onboardingComplete: onboarding.complete,
    placementResult: onboarding.result,
    completeOnboarding,
    retakePlacementTest,
    resetToFirstRun,
    xp,
    unlockedBuildingIds,
    unlockBuilding,
    completedLessonIds,
    completeLesson,
    newlyAddedWordIds,
    addWordFromBook,
    clearNewWordFlags,
    reviewLog,
    newWordHistory,
    skipNewWord,
    noteNewWordAdded,
    unskipNewWord,
    clearNewWordHistory,
    listeningHistory,
    noteWordListened,
    clearListeningHistory,
    matchHistory,
    noteWordsMatched,
    favoriteWordIds,
    toggleFavorite,
    devClockOverride,
    updateDevClockOverride,
    claimedChallengeIds,
    claimChallenge,
    recentSearchIds,
    pushRecentSearch,
    clearRecentSearches,
    storyProgress,
    recordStoryPage,
    tour,
    listeningPausedUntil,
    pauseListening,
    offerTour,
    startTour,
    advanceTour,
    endTour,
    reportTourAction,
    seenScreenTours,
    markScreenTourSeen,
    replayScreenTours,
    subscription,
    recoverableProgress,
    adoptRecoverableProgress,
    dismissRecoverableProgress,
    isAdFree: subscription !== null,
    applyEntitlement,
    clearEntitlement,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
