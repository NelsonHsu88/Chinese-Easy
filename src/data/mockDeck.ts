import type { SrsCard } from '../types'
import { addDays, todayISO } from '../lib/date'
import { migrateDeck } from '../lib/srs'

const today = todayISO()

/*
 * A realistic starting deck for development: some cards due today, some due
 * later, some brand new.
 *
 * **Still authored in the v1 SM-2 shape and run through `migrateDeck`.** Writing
 * FSRS state by hand would mean inventing stability and difficulty numbers that
 * mean nothing, and this way the migration itself gets exercised every time
 * anyone develops against a populated deck — which is the one code path that is
 * otherwise only reached by users upgrading.
 */
const legacyDeck = [
  // Due today (already in the review cycle)
  { wordId: 'hsk1-01', stage: 'review', intervalDays: 4, easeFactor: 2.5, dueDate: today, reps: 3, lapses: 0, practiceQueue: 0, practiceTotal: 0, lastReviewed: addDays(today, -4) },
  { wordId: 'hsk1-03', stage: 'review', intervalDays: 2, easeFactor: 2.2, dueDate: today, reps: 5, lapses: 1, practiceQueue: 0, practiceTotal: 0, lastReviewed: addDays(today, -2) },
  { wordId: 'hsk1-05', stage: 'learning', intervalDays: 0, easeFactor: 2.1, dueDate: today, reps: 2, lapses: 1, practiceQueue: 0, practiceTotal: 0, lastReviewed: addDays(today, -1) },
  { wordId: 'hsk1-07', stage: 'review', intervalDays: 6, easeFactor: 2.6, dueDate: today, reps: 4, lapses: 0, practiceQueue: 0, practiceTotal: 0, lastReviewed: addDays(today, -6) },
  { wordId: 'hsk1-09', stage: 'review', intervalDays: 1, easeFactor: 1.9, dueDate: today, reps: 6, lapses: 2, practiceQueue: 0, practiceTotal: 0, lastReviewed: addDays(today, -1) },
  { wordId: 'hsk2-01', stage: 'review', intervalDays: 3, easeFactor: 2.4, dueDate: today, reps: 3, lapses: 0, practiceQueue: 0, practiceTotal: 0, lastReviewed: addDays(today, -3) },

  // Due later this week
  { wordId: 'hsk2-02', stage: 'review', intervalDays: 5, easeFactor: 2.5, dueDate: addDays(today, 2), reps: 3, lapses: 0, practiceQueue: 0, practiceTotal: 0, lastReviewed: addDays(today, -3) },
  { wordId: 'hsk2-04', stage: 'review', intervalDays: 7, easeFactor: 2.7, dueDate: addDays(today, 3), reps: 4, lapses: 0, practiceQueue: 0, practiceTotal: 0, lastReviewed: addDays(today, -4) },
  { wordId: 'hsk2-06', stage: 'review', intervalDays: 4, easeFactor: 2.3, dueDate: addDays(today, 5), reps: 2, lapses: 1, practiceQueue: 0, practiceTotal: 0, lastReviewed: addDays(today, -2) },
  { wordId: 'hsk2-08', stage: 'review', intervalDays: 10, easeFactor: 2.8, dueDate: addDays(today, 6), reps: 5, lapses: 0, practiceQueue: 0, practiceTotal: 0, lastReviewed: addDays(today, -4) },

  // Brand new, never reviewed
  { wordId: 'hsk3-01', stage: 'new', intervalDays: 0, easeFactor: 2.5, dueDate: today, reps: 0, lapses: 0, practiceQueue: 0, practiceTotal: 0 },
  { wordId: 'hsk3-03', stage: 'new', intervalDays: 0, easeFactor: 2.5, dueDate: today, reps: 0, lapses: 0, practiceQueue: 0, practiceTotal: 0 },
  { wordId: 'hsk3-05', stage: 'new', intervalDays: 0, easeFactor: 2.5, dueDate: today, reps: 0, lapses: 0, practiceQueue: 0, practiceTotal: 0 },
] as const

export const mockDeck: SrsCard[] = migrateDeck(legacyDeck.map((c) => ({ ...c })))
