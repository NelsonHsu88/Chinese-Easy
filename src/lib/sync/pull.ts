import type { DailyProgress, ReviewLogEntry, SrsCard, VocabWord } from '../../types'
import {
  mergeCards,
  mergeCompletions,
  mergeCustomWords,
  mergeDailyActivity,
  mergePreferences,
  mergeReviewEvents,
  mergeStoryProgress,
  mergeXp,
  deriveStreak,
} from './conflict'
import {
  rowToCard,
  rowToCustomWord,
  rowToPreferences,
  rowToReview,
  rowToState,
  rowsToCompletions,
  rowsToDaily,
  rowsToStoryProgress,
  type AccountSettings,
} from './mappers'
import { EMPTY_SNAPSHOT, type RemoteSnapshot } from './types'

/*
 * Reading an account's progress back from Supabase.
 *
 * **Read-only.** This module has no insert, update or delete in it, and that is
 * the whole point of the stage it belongs to: a new device can be restored, and
 * nothing a learner does can yet reach the server or overwrite what another
 * device put there. Push comes later, with an outbox behind it.
 *
 * Gated by `FEATURES.cloudSync`, which is off.
 */

/**
 * The slice of supabase-js this needs.
 *
 * Declared structurally rather than importing `SupabaseClient` so the merge and
 * pull logic can be tested against a stub in plain Node — and so this module
 * does not drag the Supabase SDK into the bundle graph of anything that merely
 * wants the types.
 */
export interface SyncReadClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): PromiseLike<{ data: unknown[] | null; error: unknown }>
    }
  }
}

async function readTable<T>(
  client: SyncReadClient,
  table: string,
  userId: string,
  column = 'user_id',
): Promise<T[]> {
  const { data, error } = await client.from(table).select('*').eq(column, userId)
  if (error) throw new Error(`pull failed for ${table}`)
  return (data ?? []) as T[]
}

/**
 * Every row this account owns, in one pass.
 *
 * Tables are read in parallel; one failure fails the whole pull, because a
 * half-restored account (cards but no schedule state, say) is worse than a
 * clearly failed one that can be retried.
 */
export async function pullSnapshot(
  client: SyncReadClient,
  userId: string,
): Promise<RemoteSnapshot> {
  const [cards, reviewEvents, customWords, storyProgress, dailyActivity, completions, state, prefs] =
    await Promise.all([
      readTable<RemoteSnapshot['cards'][number]>(client, 'srs_cards', userId),
      readTable<RemoteSnapshot['reviewEvents'][number]>(client, 'review_events', userId),
      readTable<RemoteSnapshot['customWords'][number]>(client, 'custom_words', userId),
      readTable<RemoteSnapshot['storyProgress'][number]>(client, 'story_progress', userId),
      readTable<RemoteSnapshot['dailyActivity'][number]>(client, 'daily_activity', userId),
      readTable<RemoteSnapshot['completions'][number]>(client, 'completions', userId),
      readTable<NonNullable<RemoteSnapshot['state']>>(client, 'user_state', userId),
      readTable<NonNullable<RemoteSnapshot['preferences']>>(client, 'user_preferences', userId),
    ])

  return {
    cards,
    reviewEvents,
    customWords,
    storyProgress,
    dailyActivity,
    completions,
    state: state[0] ?? null,
    preferences: prefs[0] ?? null,
  }
}

/** The account-owned state the app holds in memory, as one value. */
export interface LocalAccountState {
  deck: SrsCard[]
  reviewLog: ReviewLogEntry[]
  customWords: VocabWord[]
  dailyProgress: DailyProgress[]
  storyProgress: Record<string, number>
  completedLessonIds: string[]
  claimedChallengeIds: string[]
  unlockedBuildingIds: string[]
  xp: number
  streak: number
  settings: AccountSettings
}

/**
 * Folds a pulled snapshot into whatever this device already had.
 *
 * Pure, and deliberately not "replace local with remote": the same function has
 * to be right for a brand-new phone (local empty, remote wins everything) and
 * for a phone that has been studying offline (both sides real). Each field goes
 * through the rule for its own data type — see `conflict.ts`.
 *
 * `derivedXp` is supplied by the caller rather than computed here, because the
 * XP-per-grade table lives in `townEconomy.ts` and pulling it in would make
 * this module depend on the economy in order to read a database.
 */
export function mergeSnapshot(
  local: LocalAccountState,
  snapshot: RemoteSnapshot,
  options: { today: string; derivedXp?: number; localSettingsUpdatedAt?: string | null },
): LocalAccountState {
  const remoteCards = snapshot.cards.map(rowToCard)
  const remoteReviews = snapshot.reviewEvents.map(rowToReview)
  const remoteDaily = rowsToDaily(snapshot.dailyActivity)

  const deletedRemotely = new Set(
    snapshot.customWords.filter((row) => row.deleted_at !== null).map((row) => row.word_id),
  )
  const remoteCustom = snapshot.customWords
    .filter((row) => row.deleted_at === null)
    .map(rowToCustomWord)

  const dailyProgress = mergeDailyActivity(local.dailyProgress, remoteDaily)
  const remoteState = snapshot.state ? rowToState(snapshot.state) : null

  return {
    deck: mergeCards(local.deck, remoteCards),
    reviewLog: mergeReviewEvents(local.reviewLog, remoteReviews),
    customWords: mergeCustomWords(local.customWords, remoteCustom, deletedRemotely),
    dailyProgress,
    storyProgress: mergeStoryProgress(
      local.storyProgress,
      rowsToStoryProgress(snapshot.storyProgress),
    ),
    completedLessonIds: mergeCompletions(
      local.completedLessonIds,
      rowsToCompletions(snapshot.completions, 'lesson'),
    ),
    claimedChallengeIds: mergeCompletions(
      local.claimedChallengeIds,
      rowsToCompletions(snapshot.completions, 'challenge'),
    ),
    unlockedBuildingIds: mergeCompletions(
      local.unlockedBuildingIds,
      rowsToCompletions(snapshot.completions, 'building'),
    ),
    xp: mergeXp(local.xp, remoteState?.xp ?? 0, options.derivedXp ?? 0),
    /* Recomputed from the merged activity rather than taken from either side —
       a streak is a consequence of which days were studied. */
    streak: deriveStreak(dailyProgress, options.today),
    settings: mergePreferences(
      local.settings,
      snapshot.preferences ? rowToPreferences(snapshot.preferences) : null,
      options.localSettingsUpdatedAt ?? null,
      snapshot.preferences?.updated_at ?? null,
    ),
  }
}

export { EMPTY_SNAPSHOT }
