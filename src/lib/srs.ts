import { addDays, todayISO } from './date'
import type { Grade, SrsCard } from '../types'

const MIN_EASE = 1.3
const DEFAULT_EASE = 2.5

export function createNewCard(wordId: string, dueDate: string = todayISO()): SrsCard {
  return {
    wordId,
    stage: 'new',
    intervalDays: 0,
    easeFactor: DEFAULT_EASE,
    dueDate,
    reps: 0,
    lapses: 0,
    recentLapses: 0,
    practiceQueue: 0,
    practiceTotal: 0,
  }
}

/** Simplified SM-2 style scheduler. */
export function gradeCard(card: SrsCard, grade: Grade, wrongAnswerReps: number): SrsCard {
  const today = todayISO()

  if (grade === 'again') {
    const easeFactor = Math.max(MIN_EASE, card.easeFactor - 0.2)
    return {
      ...card,
      stage: 'learning',
      intervalDays: 0,
      easeFactor,
      lapses: card.lapses + 1,
      recentLapses: (card.recentLapses ?? 0) + 1,
      reps: card.reps + 1,
      dueDate: today,
      lastReviewed: today,
      practiceQueue: wrongAnswerReps,
      practiceTotal: wrongAnswerReps,
    }
  }

  let easeFactor = card.easeFactor
  let intervalDays: number

  if (grade === 'hard') {
    easeFactor = Math.max(MIN_EASE, easeFactor - 0.15)
    intervalDays = card.stage === 'new' ? 1 : Math.max(1, Math.round(card.intervalDays * 1.2))
  } else if (grade === 'good') {
    intervalDays =
      card.stage === 'new' ? 1 : card.stage === 'learning' ? 3 : Math.max(1, Math.round(card.intervalDays * easeFactor))
  } else {
    easeFactor += 0.15
    intervalDays = card.stage === 'new' ? 4 : Math.max(1, Math.round(card.intervalDays * easeFactor * 1.3))
  }

  return {
    ...card,
    stage: 'review',
    intervalDays,
    easeFactor,
    reps: card.reps + 1,
    // One correct review pays off one recent mistake.
    recentLapses: Math.max(0, (card.recentLapses ?? 0) - 1),
    dueDate: addDays(today, intervalDays),
    lastReviewed: today,
    practiceQueue: 0,
    practiceTotal: 0,
  }
}
