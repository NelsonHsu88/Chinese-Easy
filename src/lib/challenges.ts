import { BookMarked, Sparkles, Flame, GraduationCap, Trophy, Zap, type LucideIcon } from 'lucide-react-native'
import type { DailyProgress } from '../types'
import { todayISO } from './date'

export type ChallengeCadence = 'daily' | 'milestone'

export interface ChallengeContext {
  dailyProgress: DailyProgress[]
  streak: number
  completedLessonCount: number
  xp: number
}

export interface ChallengeDef {
  id: string
  cadence: ChallengeCadence
  title: string
  description: string
  xpReward: number
  target: number
  icon: LucideIcon
  progress: (ctx: ChallengeContext) => number
}

function todayEntry(dailyProgress: DailyProgress[]) {
  const today = todayISO()
  return dailyProgress.find((d) => d.date === today)
}

/**
 * Daily challenges reset every day for free: their claim id is date-suffixed
 * (see challengeInstanceId), so yesterday's claimed id simply never matches
 * today's — no separate reset bookkeeping needed. Milestones use a plain,
 * permanent id and stay claimed forever once reached.
 */
export const CHALLENGE_DEFS: ChallengeDef[] = [
  {
    id: 'daily-review-5',
    cadence: 'daily',
    title: 'Review 5 words',
    description: 'Grade 5 review cards today',
    xpReward: 10,
    target: 5,
    icon: BookMarked,
    progress: (ctx) => todayEntry(ctx.dailyProgress)?.reviewsCompleted ?? 0,
  },
  {
    id: 'daily-new-3',
    cadence: 'daily',
    title: 'Learn 3 new words',
    description: 'Add 3 new words to your deck today',
    xpReward: 10,
    target: 3,
    icon: Sparkles,
    progress: (ctx) => todayEntry(ctx.dailyProgress)?.wordsLearned ?? 0,
  },
  {
    id: 'daily-streak-alive',
    cadence: 'daily',
    title: 'Keep your streak alive',
    description: 'Do at least one review or learn one new word today',
    xpReward: 5,
    target: 1,
    icon: Flame,
    progress: (ctx) => {
      const e = todayEntry(ctx.dailyProgress)
      return e && (e.reviewsCompleted > 0 || e.wordsLearned > 0) ? 1 : 0
    },
  },
  {
    id: 'milestone-lessons-5',
    cadence: 'milestone',
    title: 'Finish 5 lessons',
    description: 'Complete any 5 lessons across any units',
    xpReward: 30,
    target: 5,
    icon: GraduationCap,
    progress: (ctx) => ctx.completedLessonCount,
  },
  {
    id: 'milestone-streak-7',
    cadence: 'milestone',
    title: '7-day streak',
    description: 'Reach a 7-day streak',
    xpReward: 40,
    target: 7,
    icon: Zap,
    progress: (ctx) => ctx.streak,
  },
  {
    id: 'milestone-xp-200',
    cadence: 'milestone',
    title: 'Earn 200 XP',
    description: 'Rack up 200 XP total from reviews and lessons',
    xpReward: 25,
    target: 200,
    icon: Trophy,
    progress: (ctx) => ctx.xp,
  },
]

/** The id used for claim tracking — daily challenges get today's date baked in so they reset for free each day. */
export function challengeInstanceId(def: ChallengeDef): string {
  return def.cadence === 'daily' ? `${def.id}-${todayISO()}` : def.id
}
