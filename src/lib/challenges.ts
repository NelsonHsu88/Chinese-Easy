import type { DailyProgress } from '../types'
import { addDays, todayISO } from './date'
import { FEATURES, type FeatureKey } from './features'

/**
 * Which shelf a challenge sits on. `milestone` is what the screen labels
 * "Special": the value keeps its old name because it is baked into nothing but
 * this file, while the claim ids below are persisted and must not change.
 */
export type ChallengeCadence = 'daily' | 'weekly' | 'milestone'

/**
 * The painting on the left of a challenge's card. Each is cropped from the
 * reference by `scripts/processChallengesArt.mjs`, except `streak`, which is
 * the app's own flame on a peach disc.
 */
export type ChallengeScene = 'words' | 'writing' | 'listening' | 'review' | 'gift' | 'streak'

export interface ChallengeContext {
  dailyProgress: DailyProgress[]
  streak: number
  completedLessonCount: number
  xp: number
  /** The learner's own daily limits, which cap the targets that count them. */
  dailyNewWordLimit: number
  dailyReviewLimit: number
}

export interface ChallengeDef {
  id: string
  cadence: ChallengeCadence
  title: string
  /** One line on the card. Keep it short — it is truncated, not wrapped. */
  description: (target: number) => string
  xpReward: number
  /**
   * A function where the target follows a setting. A challenge asking for more
   * new words than the learner has chosen to take in a day is one they are
   * being told to fail, so those targets are capped by the limit.
   */
  target: number | ((ctx: ChallengeContext) => number)
  scene: ChallengeScene
  /**
   * Where to send someone who taps the challenge — the screen they'd have to be
   * on to make progress on it. `description` says what to do; this is the way
   * there, so a challenge is never a demand with no door next to it.
   */
  route: string
  /**
   * Only offered while this feature is switched on (see src/lib/features.ts).
   * For goals that can't be worked on at all when their screen is hidden — as
   * opposed to ones that merely *link* there, which fall back via `safeRoute`.
   */
  requires?: FeatureKey
  progress: (ctx: ChallengeContext) => number
}

function todayEntry(dailyProgress: DailyProgress[]) {
  const today = todayISO()
  return dailyProgress.find((d) => d.date === today)
}

/** The Monday that starts the current calendar week, as yyyy-mm-dd. */
export function weekStartISO(): string {
  const today = todayISO()
  const [y, m, d] = today.split('-').map(Number)
  // getDay() is Sunday-based; this rotates it so Monday is 0.
  const offset = (new Date(y, m - 1, d).getDay() + 6) % 7
  return addDays(today, -offset)
}

/** This week's entries, Monday to today — the same week the streak strip draws. */
function thisWeek(dailyProgress: DailyProgress[]) {
  const start = weekStartISO()
  const today = todayISO()
  return dailyProgress.filter((d) => d.date >= start && d.date <= today)
}

function weekSum(ctx: ChallengeContext, field: keyof Omit<DailyProgress, 'date'>) {
  return thisWeek(ctx.dailyProgress).reduce((sum, d) => sum + (d[field] ?? 0), 0)
}

/**
 * Daily challenges reset every day for free: their claim id is date-suffixed
 * (see challengeInstanceId), so yesterday's claimed id simply never matches
 * today's — no separate reset bookkeeping needed. Weekly ones do the same with
 * the week's Monday. Milestones use a plain, permanent id and stay claimed
 * forever once reached.
 */
export const CHALLENGE_DEFS: ChallengeDef[] = [
  {
    id: 'daily-new-words',
    cadence: 'daily',
    title: 'Learn New Words',
    description: (n) => `Learn ${n} new ${n === 1 ? 'word' : 'words'} today.`,
    xpReward: 10,
    target: (ctx) => Math.max(1, Math.min(10, ctx.dailyNewWordLimit)),
    scene: 'words',
    route: '/new-words',
    progress: (ctx) => todayEntry(ctx.dailyProgress)?.wordsLearned ?? 0,
  },
  {
    id: 'daily-writing',
    cadence: 'daily',
    title: 'Writing Practice',
    description: (n) => `Practice writing ${n} characters.`,
    xpReward: 10,
    target: 5,
    scene: 'writing',
    // Flashcards are where the writing is: every card is a stroke-order quiz.
    route: '/review-session?mode=flashcards',
    progress: (ctx) => todayEntry(ctx.dailyProgress)?.charactersWritten ?? 0,
  },
  {
    id: 'daily-listening',
    cadence: 'daily',
    title: 'Listening Practice',
    description: (n) => `Complete ${n} listening questions.`,
    xpReward: 10,
    target: 5,
    scene: 'listening',
    route: '/review-session?mode=mixed',
    progress: (ctx) => todayEntry(ctx.dailyProgress)?.listeningAnswered ?? 0,
  },
  {
    id: 'daily-review',
    cadence: 'daily',
    title: 'Review Words',
    description: (n) => `Review ${n} words.`,
    xpReward: 10,
    target: (ctx) => Math.max(1, Math.min(20, ctx.dailyReviewLimit)),
    scene: 'review',
    route: '/review-tab',
    progress: (ctx) => todayEntry(ctx.dailyProgress)?.reviewsCompleted ?? 0,
  },

  {
    id: 'weekly-new-words',
    cadence: 'weekly',
    title: 'Grow Your Vocabulary',
    description: (n) => `Learn ${n} new words this week.`,
    xpReward: 25,
    target: (ctx) => Math.max(1, ctx.dailyNewWordLimit * 4),
    scene: 'words',
    route: '/new-words',
    progress: (ctx) => weekSum(ctx, 'wordsLearned'),
  },
  {
    id: 'weekly-writing',
    cadence: 'weekly',
    title: 'Daily Brushwork',
    description: (n) => `Write ${n} characters this week.`,
    xpReward: 25,
    target: 30,
    scene: 'writing',
    route: '/review-session?mode=flashcards',
    progress: (ctx) => weekSum(ctx, 'charactersWritten'),
  },
  {
    id: 'weekly-listening',
    cadence: 'weekly',
    title: 'Keen Ear',
    description: (n) => `Answer ${n} listening questions this week.`,
    xpReward: 25,
    target: 30,
    scene: 'listening',
    route: '/review-session?mode=mixed',
    progress: (ctx) => weekSum(ctx, 'listeningAnswered'),
  },
  {
    id: 'weekly-active-days',
    cadence: 'weekly',
    title: 'Show Up',
    description: (n) => `Study on ${n} days this week.`,
    xpReward: 25,
    target: 5,
    scene: 'streak',
    route: '/review-tab',
    progress: (ctx) =>
      thisWeek(ctx.dailyProgress).filter((d) => d.wordsLearned > 0 || d.reviewsCompleted > 0).length,
  },

  {
    id: 'milestone-lessons-5',
    cadence: 'milestone',
    title: 'Finish 5 Lessons',
    description: () => 'Finish any 5 lessons.',
    xpReward: 30,
    target: 5,
    scene: 'words',
    route: '/lessons',
    requires: 'lessons',
    progress: (ctx) => ctx.completedLessonCount,
  },
  {
    id: 'milestone-streak-7',
    cadence: 'milestone',
    title: '7-Day Streak',
    description: () => 'Study seven days in a row.',
    xpReward: 40,
    target: 7,
    scene: 'streak',
    route: '/review-tab',
    progress: (ctx) => ctx.streak,
  },
  {
    id: 'milestone-xp-200',
    cadence: 'milestone',
    title: 'Earn 200 XP',
    // Worded without naming its sources, so it stays true whether or not the
    // lesson path is switched on.
    description: () => 'Earn 200 XP as you learn.',
    xpReward: 25,
    target: 200,
    scene: 'gift',
    route: '/lessons',
    progress: (ctx) => ctx.xp,
  },
]

/** The period suffix a claim id carries, so a repeating challenge resets for free. */
function periodSuffix(cadence: ChallengeCadence): string {
  if (cadence === 'daily') return `-${todayISO()}`
  if (cadence === 'weekly') return `-w${weekStartISO()}`
  return ''
}

/** The id used for claim tracking — daily and weekly ones carry their period so they reset. */
export function challengeInstanceId(def: Pick<ChallengeDef, 'id' | 'cadence'>): string {
  return `${def.id}${periodSuffix(def.cadence)}`
}

export function challengeTarget(def: ChallengeDef, ctx: ChallengeContext): number {
  return typeof def.target === 'function' ? def.target(ctx) : def.target
}

/** The challenges actually on offer — a goal whose whole feature is hidden can't be worked on. */
export function offeredChallenges(cadence?: ChallengeCadence): ChallengeDef[] {
  return CHALLENGE_DEFS.filter(
    (d) => (!cadence || d.cadence === cadence) && (!d.requires || FEATURES[d.requires]),
  )
}

/**
 * The bonus for finishing a whole period's set: the reference's "Complete all
 * daily challenges". Only the repeating shelves have one — milestones are a
 * collection rather than a set, and there is no "all" to finish.
 *
 * It becomes claimable when every challenge in the set is *complete*, not
 * claimed: making the learner collect each reward first before this one lights
 * up would be a chore standing between them and something they already earned.
 */
export interface CompletionReward {
  id: string
  cadence: 'daily' | 'weekly'
  title: string
  description: string
  xpReward: number
}

export const COMPLETION_REWARDS: Record<'daily' | 'weekly', CompletionReward> = {
  daily: {
    id: 'daily-all',
    cadence: 'daily',
    title: 'Complete all daily challenges',
    description: 'Earn a special reward and keep your streak!',
    xpReward: 50,
  },
  weekly: {
    id: 'weekly-all',
    cadence: 'weekly',
    title: 'Complete all weekly challenges',
    description: 'A bigger reward for a whole week of work.',
    xpReward: 100,
  },
}

export function isChallengeComplete(def: ChallengeDef, ctx: ChallengeContext): boolean {
  return def.progress(ctx) >= challengeTarget(def, ctx)
}

export function isCompletionRewardEarned(cadence: 'daily' | 'weekly', ctx: ChallengeContext): boolean {
  const set = offeredChallenges(cadence)
  return set.length > 0 && set.every((def) => isChallengeComplete(def, ctx))
}

/** Everything waiting to be collected, rewards included — the Dashboard's badge count. */
export function claimableCount(ctx: ChallengeContext, claimedIds: string[]): number {
  const claimed = new Set(claimedIds)
  const challenges = offeredChallenges().filter(
    (def) => !claimed.has(challengeInstanceId(def)) && isChallengeComplete(def, ctx),
  ).length
  const rewards = (['daily', 'weekly'] as const).filter(
    (cadence) =>
      !claimed.has(challengeInstanceId(COMPLETION_REWARDS[cadence])) && isCompletionRewardEarned(cadence, ctx),
  ).length
  return challenges + rewards
}
