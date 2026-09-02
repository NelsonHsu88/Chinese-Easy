import type {
  AppSettings,
  DailyProgress,
  ReviewLogEntry,
  SrsCard,
  VocabWord,
} from '../../types'
import type {
  CompletionRow,
  CustomWordRow,
  DailyActivityRow,
  ReviewEventRow,
  SrsCardRow,
  StoryProgressRow,
  UserPreferencesRow,
  UserStateRow,
} from './types'

/*
 * App types <-> database rows.
 *
 * Pure, and the only place either shape knows about the other.
 *
 * ── The rule these obey ──────────────────────────────────────────────────────
 * A card that goes out and comes back is the same card. No field is recomputed,
 * rounded, re-derived or defaulted on the way through; `due` in particular is
 * carried as the exact ISO string it already was, because `lib/srs.ts` is the
 * only module allowed to convert between a string and a Date and this is not
 * it. Nothing here imports `ts-fsrs`. Sync moves values; it never schedules.
 */

// ─── SRS cards ───────────────────────────────────────────────────────────────

export function cardToRow(card: SrsCard, userId: string): SrsCardRow {
  return {
    user_id: userId,
    word_id: card.wordId,
    schema_version: card.v ?? 1,
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    state: card.state,
    last_review: card.last_review ?? null,
    reps: card.reps,
    lapses: card.lapses,
    recent_lapses: card.recentLapses ?? 0,
    practice_queue: card.practiceQueue,
    practice_total: card.practiceTotal,
  }
}

export function rowToCard(row: SrsCardRow): SrsCard {
  const card: SrsCard = {
    wordId: row.word_id,
    v: row.schema_version,
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    learning_steps: row.learning_steps,
    state: row.state,
    reps: row.reps,
    lapses: row.lapses,
    recentLapses: row.recent_lapses,
    practiceQueue: row.practice_queue,
    practiceTotal: row.practice_total,
  }
  /* Set only when present. A card that never had a `last_review` must not come
     back carrying the key with a null in it — `migrateCard` and `createNewCard`
     both omit it, and the deck is compared against those shapes. */
  if (row.last_review !== null) card.last_review = row.last_review
  return card
}

// ─── Review events ───────────────────────────────────────────────────────────

/**
 * A stable id for a review, derived from the review itself.
 *
 * ── Why derived rather than stored ───────────────────────────────────────────
 * `review_events.id` is the primary key, and it exists so that replaying a sync
 * inserts the same row twice and the second one is discarded rather than
 * becoming a review that never happened. That needs an id which is identical on
 * every device and across every retry.
 *
 * `ReviewLogEntry` has no id field and adding one would mean migrating the
 * 5,000 entries already on people's phones. Deriving it from the content
 * instead costs nothing, works retroactively for every entry already written,
 * and makes idempotency a property of the data rather than of the code that
 * happens to be inserting it.
 *
 * The triple (word, instant, grade) is unique in practice: `at` carries
 * milliseconds, and one card cannot be graded twice in the same millisecond
 * with a human in between.
 */
export function reviewEventId(entry: ReviewLogEntry): string {
  const seed = `${entry.wordId}|${entry.at}|${entry.grade}`
  const hex = [0x811c9dc5, 0x01000193, 0x7fffffff, 0x9e3779b9]
    .map((salt) => fnv1a(seed, salt).toString(16).padStart(8, '0'))
    .join('')
  /* Shaped as a v4-looking UUID so the `uuid` column accepts it. The version
     and variant nibbles are cosmetic here — this is a hash, not a random id,
     and that is the point. */
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-')
}

function fnv1a(text: string, seed: number): number {
  let hash = seed >>> 0
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

export function reviewToRow(entry: ReviewLogEntry, userId: string): ReviewEventRow {
  return {
    id: reviewEventId(entry),
    user_id: userId,
    word_id: entry.wordId,
    grade: entry.grade,
    reviewed_at: entry.at,
    state_before: entry.state,
    scheduled_days: entry.scheduledDays,
    duration_ms: entry.durationMs,
  }
}

export function rowToReview(row: ReviewEventRow): ReviewLogEntry {
  return {
    wordId: row.word_id,
    grade: row.grade,
    at: row.reviewed_at,
    state: row.state_before,
    scheduledDays: row.scheduled_days,
    durationMs: row.duration_ms,
  }
}

// ─── Custom words ────────────────────────────────────────────────────────────

export function customWordToRow(word: VocabWord, userId: string): CustomWordRow {
  return {
    user_id: userId,
    word_id: word.id,
    simplified: word.simplified,
    traditional: word.traditional,
    pinyin: word.pinyin,
    definition: word.definition,
    hsk_level: word.hskLevel,
    category: word.category ?? null,
    example: word.example ?? null,
    deleted_at: null,
  }
}

export function rowToCustomWord(row: CustomWordRow): VocabWord {
  const word: VocabWord = {
    id: row.word_id,
    simplified: row.simplified,
    traditional: row.traditional,
    pinyin: row.pinyin,
    definition: row.definition,
    hskLevel: row.hsk_level,
    /* 'daily' is the catch-all this app actually has — `WordCategory` has no
       'other', and a cast to one would have compiled and then rendered a tile
       with no icon. */
    category: (row.category ?? 'daily') as VocabWord['category'],
    custom: true,
  }
  if (row.example) word.example = row.example as VocabWord['example']
  return word
}

// ─── Story progress, daily activity, completions ─────────────────────────────

export function storyProgressToRows(
  progress: Record<string, number>,
  userId: string,
): StoryProgressRow[] {
  return Object.entries(progress).map(([story_id, page_index]) => ({
    user_id: userId,
    story_id,
    page_index,
  }))
}

export function rowsToStoryProgress(rows: StoryProgressRow[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const row of rows) out[row.story_id] = row.page_index
  return out
}

export function dailyToRows(days: DailyProgress[], userId: string): DailyActivityRow[] {
  return days.map((day) => ({
    user_id: userId,
    activity_date: day.date,
    words_learned: day.wordsLearned,
    reviews_completed: day.reviewsCompleted,
  }))
}

export function rowsToDaily(rows: DailyActivityRow[]): DailyProgress[] {
  return rows.map((row) => ({
    date: row.activity_date,
    wordsLearned: row.words_learned,
    reviewsCompleted: row.reviews_completed,
  }))
}

export function completionsToRows(
  kind: CompletionRow['kind'],
  ids: string[],
  userId: string,
  completedAt: string,
): CompletionRow[] {
  return ids.map((item_id) => ({ user_id: userId, kind, item_id, completed_at: completedAt }))
}

export function rowsToCompletions(rows: CompletionRow[], kind: CompletionRow['kind']): string[] {
  return rows.filter((row) => row.kind === kind).map((row) => row.item_id)
}

// ─── Preferences and state ───────────────────────────────────────────────────

/**
 * The account half of `AppSettings`.
 *
 * `soundEnabled`, `hapticsEnabled` and `notificationsEnabled` are deliberately
 * absent — a tablet has no haptics, a phone may be on silent, and a
 * notification permission is granted per install. `email` is absent too: it
 * belongs to the session, and persisting a second copy is how two answers to
 * one question start disagreeing.
 */
export const ACCOUNT_SETTING_FIELDS = [
  'script',
  'phoneticScript',
  'reviewDirection',
  'reviewOrder',
  'dailyReviewLimit',
  'dailyNewWordLimit',
  'wrongAnswerReps',
  'hskLevel',
  'learningGoal',
  'reminderTime',
  'username',
] as const

export type AccountSettings = Pick<AppSettings, (typeof ACCOUNT_SETTING_FIELDS)[number]>

export function accountSettings(settings: AppSettings): AccountSettings {
  return {
    script: settings.script,
    phoneticScript: settings.phoneticScript,
    reviewDirection: settings.reviewDirection,
    reviewOrder: settings.reviewOrder,
    dailyReviewLimit: settings.dailyReviewLimit,
    dailyNewWordLimit: settings.dailyNewWordLimit,
    wrongAnswerReps: settings.wrongAnswerReps,
    hskLevel: settings.hskLevel,
    learningGoal: settings.learningGoal,
    reminderTime: settings.reminderTime,
    username: settings.username,
  }
}

export function preferencesToRow(settings: AppSettings, userId: string): UserPreferencesRow {
  return {
    user_id: userId,
    script: settings.script,
    phonetic_script: settings.phoneticScript,
    review_direction: settings.reviewDirection,
    review_order: settings.reviewOrder,
    daily_review_limit: settings.dailyReviewLimit,
    daily_new_word_limit: settings.dailyNewWordLimit,
    wrong_answer_reps: settings.wrongAnswerReps,
    hsk_level: settings.hskLevel,
    learning_goal: settings.learningGoal,
    reminder_time: settings.reminderTime,
    username: settings.username,
  }
}

export function rowToPreferences(row: UserPreferencesRow): AccountSettings {
  return {
    script: row.script as AppSettings['script'],
    phoneticScript: row.phonetic_script as AppSettings['phoneticScript'],
    reviewDirection: row.review_direction as AppSettings['reviewDirection'],
    reviewOrder: row.review_order as AppSettings['reviewOrder'],
    dailyReviewLimit: row.daily_review_limit,
    dailyNewWordLimit: row.daily_new_word_limit,
    wrongAnswerReps: row.wrong_answer_reps,
    hskLevel: row.hsk_level,
    learningGoal: row.learning_goal as AppSettings['learningGoal'],
    reminderTime: row.reminder_time,
    username: row.username ?? '',
  }
}

export interface AccountState {
  xp: number
  streak: number
  lastActiveDate: string | null
  onboardingComplete: boolean
  placementHsk: number | null
  placementCompletedAt: string | null
}

export function rowToState(row: UserStateRow): AccountState {
  return {
    xp: row.xp,
    streak: row.streak,
    lastActiveDate: row.last_active_date,
    onboardingComplete: row.onboarding_complete,
    placementHsk: row.placement_hsk,
    placementCompletedAt: row.placement_completed_at,
  }
}
