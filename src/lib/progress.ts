import type { DailyProgress } from '../types'
import { lastNDays } from './date'

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
