/*
 * Achievements — every definition, and the one function that measures them.
 *
 * An achievement names a single number from `AchievementStats` and a goal.
 * That is the whole model: there are no per-screen checks, no special cases,
 * no hidden conditions. Adding one is adding a row here; if it needs a number
 * the app does not yet count, that number is added to `AchievementStats` once
 * (built in `buildAchievementStats` in AppContext) and every achievement can
 * use it.
 *
 * Achievements are trophies, separate from XP: earning one grants nothing, and
 * displaying one on the profile (up to `MAX_PINNED`) is purely cosmetic.
 */

export type AchievementCategory =
  | 'vocabulary'
  | 'review'
  | 'writing'
  | 'listening'
  | 'reading'
  | 'streak'
  | 'challenges'

/**
 * Everything an achievement can measure, as lifetime totals.
 *
 * Several are derived from state the app already keeps rather than counted
 * afresh (saved words from the deck, reviews and characters from the daily
 * history, daily challenges from the claimed ids), so an existing learner's
 * past work counts from the first launch. The three the app never recorded —
 * finished review sessions, correct listening answers, finished stories — are
 * `ProgressionState.lifetime` counters, advanced through `trackLearningEvent`.
 */
export interface AchievementStats {
  wordsSaved: number
  reviews: number
  reviewSessions: number
  charactersWritten: number
  listeningAnswered: number
  listeningCorrect: number
  storiesFinished: number
  streak: number
  dailyChallengesCompleted: number
}

export type AchievementStat = keyof AchievementStats

export interface AchievementDefinition {
  id: string
  name: string
  description: string
  category: AchievementCategory
  stat: AchievementStat
  goal: number
}

export const MAX_PINNED = 3

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // Vocabulary
  { id: 'first_word', name: 'First Word', description: 'Save your first word.', category: 'vocabulary', stat: 'wordsSaved', goal: 1 },
  { id: 'word_collector', name: 'Word Collector', description: 'Save 25 words.', category: 'vocabulary', stat: 'wordsSaved', goal: 25 },
  { id: 'word_keeper', name: 'Word Keeper', description: 'Save 50 words.', category: 'vocabulary', stat: 'wordsSaved', goal: 50 },
  { id: 'vocabulary_builder', name: 'Vocabulary Builder', description: 'Save 100 words.', category: 'vocabulary', stat: 'wordsSaved', goal: 100 },
  { id: 'living_dictionary', name: 'Living Dictionary', description: 'Save 500 words.', category: 'vocabulary', stat: 'wordsSaved', goal: 500 },

  // Review
  { id: 'first_review', name: 'First Review', description: 'Complete your first review session.', category: 'review', stat: 'reviewSessions', goal: 1 },
  { id: 'getting_it_back', name: 'Getting It Back', description: 'Review 50 words.', category: 'review', stat: 'reviews', goal: 50 },
  { id: 'memory_builder', name: 'Memory Builder', description: 'Review 250 words.', category: 'review', stat: 'reviews', goal: 250 },
  { id: 'review_scholar', name: 'Review Scholar', description: 'Review 1,000 words.', category: 'review', stat: 'reviews', goal: 1000 },
  { id: 'memory_master', name: 'Memory Master', description: 'Review 5,000 words.', category: 'review', stat: 'reviews', goal: 5000 },

  // Writing
  { id: 'first_stroke', name: 'First Stroke', description: 'Complete your first handwriting practice.', category: 'writing', stat: 'charactersWritten', goal: 1 },
  { id: 'steady_hand', name: 'Steady Hand', description: 'Practice 25 Chinese characters.', category: 'writing', stat: 'charactersWritten', goal: 25 },
  { id: 'brush_apprentice', name: 'Brush Apprentice', description: 'Practice 100 characters.', category: 'writing', stat: 'charactersWritten', goal: 100 },
  { id: 'calligrapher', name: 'Calligrapher', description: 'Practice 500 characters.', category: 'writing', stat: 'charactersWritten', goal: 500 },
  { id: 'master_of_strokes', name: 'Master of Strokes', description: 'Practice 1,000 characters.', category: 'writing', stat: 'charactersWritten', goal: 1000 },

  // Listening
  { id: 'first_listen', name: 'First Listen', description: 'Complete your first listening exercise.', category: 'listening', stat: 'listeningAnswered', goal: 1 },
  { id: 'good_ear', name: 'Good Ear', description: 'Answer 25 listening questions correctly.', category: 'listening', stat: 'listeningCorrect', goal: 25 },
  { id: 'careful_listener', name: 'Careful Listener', description: 'Answer 100 listening questions correctly.', category: 'listening', stat: 'listeningCorrect', goal: 100 },
  { id: 'sharp_ear', name: 'Sharp Ear', description: 'Answer 500 listening questions correctly.', category: 'listening', stat: 'listeningCorrect', goal: 500 },
  { id: 'listening_master', name: 'Listening Master', description: 'Answer 1,000 listening questions correctly.', category: 'listening', stat: 'listeningCorrect', goal: 1000 },

  // Reading
  { id: 'first_page', name: 'First Page', description: 'Finish your first story.', category: 'reading', stat: 'storiesFinished', goal: 1 },
  { id: 'bookworm', name: 'Bookworm', description: 'Finish 5 stories.', category: 'reading', stat: 'storiesFinished', goal: 5 },
  { id: 'story_explorer', name: 'Story Explorer', description: 'Finish 20 stories.', category: 'reading', stat: 'storiesFinished', goal: 20 },
  { id: 'avid_reader', name: 'Avid Reader', description: 'Finish 50 stories.', category: 'reading', stat: 'storiesFinished', goal: 50 },
  { id: 'chinese_reader', name: 'Chinese Reader', description: 'Finish 100 stories.', category: 'reading', stat: 'storiesFinished', goal: 100 },

  // Habit
  { id: 'three_day_rhythm', name: 'Three-Day Rhythm', description: 'Maintain a 3-day streak.', category: 'streak', stat: 'streak', goal: 3 },
  { id: 'one_week_strong', name: 'One Week Strong', description: 'Maintain a 7-day streak.', category: 'streak', stat: 'streak', goal: 7 },
  { id: 'consistent_learner', name: 'Consistent Learner', description: 'Maintain a 30-day streak.', category: 'streak', stat: 'streak', goal: 30 },

  // Challenges
  { id: 'challenge_accepted', name: 'Challenge Accepted', description: 'Complete 25 daily challenges.', category: 'challenges', stat: 'dailyChallengesCompleted', goal: 25 },
  { id: 'challenge_champion', name: 'Challenge Champion', description: 'Complete 100 daily challenges.', category: 'challenges', stat: 'dailyChallengesCompleted', goal: 100 },
]

/**
 * A medal's metal, lowest to highest. Purely cosmetic — a tier grants nothing.
 */
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'mythic'

export const ACHIEVEMENT_TIERS: AchievementTier[] = ['bronze', 'silver', 'gold', 'diamond', 'mythic']

/**
 * An achievement's tier is its place in its own category: the first is
 * bronze, the fifth mythic. Each category is listed easiest goal first, so the
 * metal climbs with the effort. A category with fewer than five simply tops out
 * lower — Habit at gold, Challenges at silver — rather than skipping metals.
 */
export function achievementTier(def: AchievementDefinition): AchievementTier {
  const rank = ACHIEVEMENTS.filter((a) => a.category === def.category).findIndex((a) => a.id === def.id)
  return ACHIEVEMENT_TIERS[Math.min(Math.max(rank, 0), ACHIEVEMENT_TIERS.length - 1)]
}

export function achievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}

/** How far along an achievement is, capped at its goal. */
export function achievementProgress(def: AchievementDefinition, stats: AchievementStats): number {
  return Math.min(def.goal, Math.max(0, stats[def.stat]))
}

/** Ids of every achievement the stats now satisfy that is not already in `unlocked`. */
export function newlyEarnedAchievements(stats: AchievementStats, unlocked: Record<string, string>): string[] {
  return ACHIEVEMENTS.filter((def) => !unlocked[def.id] && stats[def.stat] >= def.goal).map((def) => def.id)
}

/**
 * Daily challenges completed, counted from the claimed ids: a daily claim id
 * is `<challenge id>-<yyyy-mm-dd>`. The whole-set bonus (`daily-all-…`) is a
 * reward, not a challenge, and is not counted.
 */
export function countDailyChallengeClaims(claimedIds: string[]): number {
  return claimedIds.filter((id) => /^daily-(?!all-).+-\d{4}-\d{2}-\d{2}$/.test(id)).length
}
