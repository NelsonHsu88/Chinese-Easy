import { BookMarked, Sparkles, Flame, GraduationCap, Trophy, Zap, type LucideIcon } from 'lucide-react-native'
import type { ImageSourcePropType } from 'react-native'
import type { DailyProgress } from '../types'
import { todayISO } from './date'
import type { FeatureKey } from './features'

export type ChallengeCadence = 'daily' | 'milestone'

/**
 * The colour family a challenge's tile, progress bar and counter share. Giving
 * each row its own tone is what stops a list of near-identical progress cards
 * reading as a spreadsheet.
 */
export type ChallengeTone = 'coral' | 'mint' | 'amber' | 'ember' | 'sky' | 'violet'

export interface ToneColors {
  /** Tile wash and the pale end of the progress track. */
  soft: string
  /** Filled progress and the counter's current value. */
  strong: string
  /** Unfilled progress track. */
  track: string
}

export const CHALLENGE_TONES: Record<ChallengeTone, ToneColors> = {
  coral: { soft: '#fde4e1', strong: '#ef7a63', track: '#f6e6e1' },
  mint: { soft: '#d9f2e0', strong: '#58be7c', track: '#e6efe7' },
  amber: { soft: '#fbebcf', strong: '#f0b64a', track: '#f3ece0' },
  ember: { soft: '#fce3d4', strong: '#ef7440', track: '#f5e8e0' },
  sky: { soft: '#dfeff8', strong: '#6ea7cd', track: '#e6edf2' },
  violet: { soft: '#e8e4f6', strong: '#8b7bd8', track: '#ece9f2' },
}

/** Green regardless of tone once a challenge is done — completion reads the same everywhere. */
export const CHALLENGE_DONE: ToneColors = { soft: '#d9f2e0', strong: '#58be7c', track: '#e6efe7' }

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
  tone: ChallengeTone
  /**
   * Illustration for the challenge's tile. Where no artwork fits, `glyph` is
   * used instead and the tile paints a wash with that character on it — the
   * same fallback language the story covers use.
   */
  art?: ImageSourcePropType
  glyph?: string
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
    tone: 'coral',
    glyph: '學',
    route: '/review',
    progress: (ctx) => todayEntry(ctx.dailyProgress)?.reviewsCompleted ?? 0,
  },
  {
    id: 'daily-new-3',
    cadence: 'daily',
    title: 'Learn 3 new words',
    description: 'Add 3 new words today',
    xpReward: 10,
    target: 3,
    icon: Sparkles,
    tone: 'sky',
    glyph: '新',
    route: '/new-words',
    progress: (ctx) => todayEntry(ctx.dailyProgress)?.wordsLearned ?? 0,
  },
  {
    id: 'daily-streak-alive',
    cadence: 'daily',
    title: 'Keep your streak alive',
    description: 'One review, or one new word',
    xpReward: 5,
    target: 1,
    icon: Flame,
    tone: 'amber',
    art: require('../assets/images/icons/fire.png'),
    route: '/review',
    progress: (ctx) => {
      const e = todayEntry(ctx.dailyProgress)
      return e && (e.reviewsCompleted > 0 || e.wordsLearned > 0) ? 1 : 0
    },
  },
  {
    id: 'milestone-lessons-5',
    cadence: 'milestone',
    title: 'Finish 5 lessons',
    description: 'Finish any 5 lessons',
    xpReward: 30,
    target: 5,
    icon: GraduationCap,
    tone: 'mint',
    art: require('../assets/images/icons/cap.png'),
    route: '/lessons',
    requires: 'lessons',
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
    tone: 'ember',
    art: require('../assets/images/buildings/mountain-pagoda.png'),
    route: '/review',
    progress: (ctx) => ctx.streak,
  },
  {
    id: 'milestone-xp-200',
    cadence: 'milestone',
    title: 'Earn 200 XP',
    // Worded without naming its sources, so it stays true whether or not the
    // lesson path is switched on.
    description: 'Earn 200 XP as you learn',
    xpReward: 25,
    target: 200,
    icon: Trophy,
    tone: 'violet',
    art: require('../assets/images/buildings/grand-palace.png'),
    route: '/lessons',
    progress: (ctx) => ctx.xp,
  },
]

/** The id used for claim tracking — daily challenges get today's date baked in so they reset for free each day. */
export function challengeInstanceId(def: ChallengeDef): string {
  return def.cadence === 'daily' ? `${def.id}-${todayISO()}` : def.id
}
