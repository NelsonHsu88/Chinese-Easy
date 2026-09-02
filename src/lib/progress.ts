import type { DailyProgress } from '../types'
import { addDays, lastNDays, todayISO } from './date'

export interface HeatmapDay {
  date: string
  wordsLearned: number
  reviewsCompleted: number
  /** wordsLearned + reviewsCompleted — used to size/color the heatmap cell. */
  total: number
}

/** Builds the last N days of real activity from the user's own progress history (0 for any day with no activity). */
export function buildHeatmapFromProgress(dailyProgress: DailyProgress[], days: number): HeatmapDay[] {
  const byDate = new Map(dailyProgress.map((d) => [d.date, d]))
  return lastNDays(days).map((date) => {
    const entry = byDate.get(date)
    const wordsLearned = entry?.wordsLearned ?? 0
    const reviewsCompleted = entry?.reviewsCompleted ?? 0
    return { date, wordsLearned, reviewsCompleted, total: wordsLearned + reviewsCompleted }
  })
}

export interface WeekDay {
  date: string
  /** The single letter shown above the dot — M, T, W, T, F, S, S. */
  letter: string
  active: boolean
  isToday: boolean
  /** Later this week: drawn as an empty ring, never as a day that was missed. */
  isFuture: boolean
  /** Words learned that day, for the sparkline under the strip. */
  wordsLearned: number
}

const MONDAY_FIRST_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/**
 * The current Monday-to-Sunday week, for the Dashboard's activity strip.
 *
 * Deliberately a *calendar* week rather than the rolling `lastNDays(7)` the
 * heatmap uses. The strip is labelled M T W T F S S, and a rolling window would
 * print those letters against a row that starts on a different day each morning
 * — so Wednesday's dot would quietly move position overnight.
 *
 * Days later in the week are marked `isFuture` rather than simply inactive:
 * there is a real difference between a day you skipped and a day that has not
 * happened, and colouring Saturday as missed on a Tuesday is just untrue.
 */
export function currentWeekActivity(dailyProgress: DailyProgress[]): WeekDay[] {
  const byDate = new Map(dailyProgress.map((d) => [d.date, d]))
  const today = todayISO()

  const [y, m, d] = today.split('-').map(Number)
  // getDay() is Sunday-based; this rotates it so Monday is 0.
  const mondayOffset = (new Date(y, m - 1, d).getDay() + 6) % 7

  return MONDAY_FIRST_LETTERS.map((letter, i) => {
    const date = addDays(today, i - mondayOffset)
    const entry = byDate.get(date)
    return {
      date,
      letter,
      active: (entry?.wordsLearned ?? 0) + (entry?.reviewsCompleted ?? 0) > 0,
      isToday: date === today,
      isFuture: i > mondayOffset,
      wordsLearned: entry?.wordsLearned ?? 0,
    }
  })
}

export interface ActivitySummary {
  activeDays: number
  totalDays: number
  longestStreak: number
  totalWordsLearned: number
  totalReviewsCompleted: number
}

/** Derives simple summary stats from a heatmap window — active days, longest run, totals. */
export function summarizeActivity(days: HeatmapDay[]): ActivitySummary {
  let longestStreak = 0
  let current = 0
  let activeDays = 0
  let totalWordsLearned = 0
  let totalReviewsCompleted = 0

  for (const day of days) {
    if (day.total > 0) {
      activeDays++
      current++
      longestStreak = Math.max(longestStreak, current)
    } else {
      current = 0
    }
    totalWordsLearned += day.wordsLearned
    totalReviewsCompleted += day.reviewsCompleted
  }

  return { activeDays, totalDays: days.length, longestStreak, totalWordsLearned, totalReviewsCompleted }
}
