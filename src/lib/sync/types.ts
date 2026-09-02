import type { Grade, SrsState } from '../../types'

/*
 * The wire shapes — one interface per table in supabase/migrations/0001_schema.sql.
 *
 * Column names are snake_case because that is what Postgres returns, and they
 * are *not* renamed on the way through. `src/types.ts` already spells the FSRS
 * fields snake_case (`elapsed_days`, `last_review`) because `ts-fsrs` does, so
 * for the fields that matter most the app type and the row type agree
 * character for character. Where they differ (`wordId` / `word_id`) the mapper
 * is the only place that knows.
 *
 * Nothing here is fetched yet. See `pull.ts` for the read path, which is behind
 * `FEATURES.cloudSync`.
 */

export interface SrsCardRow {
  user_id: string
  word_id: string
  schema_version: number
  due: string
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  state: SrsState
  last_review: string | null
  reps: number
  lapses: number
  recent_lapses: number
  practice_queue: number
  practice_total: number
  updated_at?: string
}

export interface ReviewEventRow {
  id: string
  user_id: string
  word_id: string
  grade: Grade
  reviewed_at: string
  state_before: SrsState
  scheduled_days: number
  duration_ms: number
}

export interface CustomWordRow {
  user_id: string
  word_id: string
  simplified: string
  traditional: string
  pinyin: string
  definition: string
  hsk_level: number
  category: string | null
  example: unknown | null
  deleted_at: string | null
  updated_at?: string
}

export interface StoryProgressRow {
  user_id: string
  story_id: string
  page_index: number
  updated_at?: string
}

export interface DailyActivityRow {
  user_id: string
  activity_date: string
  words_learned: number
  reviews_completed: number
  updated_at?: string
}

export interface CompletionRow {
  user_id: string
  kind: 'lesson' | 'challenge' | 'building'
  item_id: string
  completed_at: string
}

export interface UserStateRow {
  user_id: string
  xp: number
  streak: number
  last_active_date: string | null
  onboarding_complete: boolean
  placement_hsk: number | null
  placement_completed_at: string | null
  updated_at?: string
}

export interface UserPreferencesRow {
  user_id: string
  script: string
  phonetic_script: string
  review_direction: string
  review_order: string
  daily_review_limit: number
  daily_new_word_limit: number
  wrong_answer_reps: number
  hsk_level: number
  learning_goal: string
  reminder_time: string
  username: string | null
  updated_at?: string
}

/** Everything one learner's account holds remotely, as read in one pull. */
export interface RemoteSnapshot {
  cards: SrsCardRow[]
  reviewEvents: ReviewEventRow[]
  customWords: CustomWordRow[]
  storyProgress: StoryProgressRow[]
  dailyActivity: DailyActivityRow[]
  completions: CompletionRow[]
  state: UserStateRow | null
  preferences: UserPreferencesRow | null
}

export const EMPTY_SNAPSHOT: RemoteSnapshot = {
  cards: [],
  reviewEvents: [],
  customWords: [],
  storyProgress: [],
  dailyActivity: [],
  completions: [],
  state: null,
  preferences: null,
}
