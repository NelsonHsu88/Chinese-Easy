import type { PlacementAnswer, VocabWord } from '../types'

const RATING_SCORE: Record<PlacementAnswer['rating'], number> = {
  know: 2,
  recognize: 1,
  unknown: 0,
}

/**
 * Items are ordered by increasing HSK difficulty. We estimate the highest
 * level the learner has a solid grip on: the last level (walking up from 1)
 * whose average self-rating is still "at least recognized".
 */
export function computeEstimatedHsk(items: VocabWord[], answers: PlacementAnswer[]): number {
  const byLevel = new Map<number, { sum: number; count: number }>()

  for (const item of items) {
    const answer = answers.find((a) => a.wordId === item.id)
    const score = answer ? RATING_SCORE[answer.rating] : 0
    const bucket = byLevel.get(item.hskLevel) ?? { sum: 0, count: 0 }
    bucket.sum += score
    bucket.count += 1
    byLevel.set(item.hskLevel, bucket)
  }

  let estimated = 1
  for (let level = 1; level <= 6; level++) {
    const bucket = byLevel.get(level)
    if (!bucket) continue
    const avg = bucket.sum / bucket.count
    if (avg >= 1.0) {
      estimated = level
    } else {
      break
    }
  }
  return estimated
}
