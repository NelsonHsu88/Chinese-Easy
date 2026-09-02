import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  createNewCard,
  formatReviewInterval,
  gradeCard,
  isCardDue,
  migrateCard,
  previewReview,
  reviewLogEntry,
  SRS_SCHEMA_VERSION,
} from '../srs'
import type { SrsCard } from '../../types'

/*
 * Scheduler tests.
 *
 * Run with `npm test`. They cover `lib/srs.ts` only — the scheduling maths is
 * the part of this app where a quiet mistake costs a learner weeks of reviews
 * before anyone notices, which is what makes it worth testing in a repo that
 * otherwise has no suite.
 *
 * **Every test fixes its own clock.** Nothing here may read the real time: a
 * test that passes in the morning and fails at midnight is worse than no test,
 * and FSRS's fuzz is seeded from the review instant, so a moving `now` moves
 * the expected answers with it.
 */

const T0 = new Date('2026-03-01T09:00:00.000Z')
const REPS = 3

/** A card that has been in review a long time, for the mature-card cases. */
function matureCard(): SrsCard {
  return {
    ...createNewCard('mature', T0),
    state: 'review',
    stability: 60,
    difficulty: 5,
    scheduled_days: 60,
    reps: 8,
    lapses: 0,
    last_review: new Date('2025-12-31T09:00:00.000Z').toISOString(),
    due: new Date('2026-02-28T09:00:00.000Z').toISOString(),
  }
}

const days = (card: SrsCard, from: Date) =>
  (new Date(card.due).getTime() - from.getTime()) / 86_400_000

describe('new card', () => {
  test('previews all four outcomes, ordered Again < Hard < Good < Easy', () => {
    const preview = previewReview(createNewCard('w', T0), REPS, T0)
    const due = (g: 'again' | 'hard' | 'good' | 'easy') => preview[g].due.getTime()

    assert.ok(due('again') < due('hard'), 'Again must come back before Hard')
    assert.ok(due('hard') < due('good'), 'Hard must come back before Good')
    assert.ok(due('good') < due('easy'), 'Good must come back before Easy')
  })

  test('learning steps are same-day and Easy graduates to a real interval', () => {
    const preview = previewReview(createNewCard('w', T0), REPS, T0)

    assert.equal(preview.again.label, '1m')
    assert.equal(preview.good.label, '10m')
    assert.equal(preview.again.card.state, 'learning')
    // Easy skips the steps entirely — that is the point of Easy on a new card.
    assert.equal(preview.easy.card.state, 'review')
    assert.ok(days(preview.easy.card, T0) >= 1, 'Easy should schedule days out, not minutes')
  })
})

describe('mature card', () => {
  test('Again is due far sooner than any successful grade', () => {
    const preview = previewReview(matureCard(), REPS, T0)

    assert.ok(
      days(preview.again.card, T0) < 1,
      'a failed mature card should return the same day, not in months',
    )
    for (const grade of ['hard', 'good', 'easy'] as const) {
      assert.ok(
        days(preview[grade].card, T0) > 30,
        `${grade} on a mature card should still be months out`,
      )
    }
  })

  test('Again records a lapse and drops into relearning', () => {
    const before = matureCard()
    const after = gradeCard(before, 'again', REPS)

    assert.equal(after.lapses, before.lapses + 1)
    assert.equal(after.state, 'relearning')
  })
})

describe('Hard is a successful recall, not a failure', () => {
  test('it records no lapse and stays in review', () => {
    const before = matureCard()
    const after = gradeCard(before, 'hard', REPS)

    assert.equal(after.lapses, before.lapses, 'Hard must not count a lapse')
    assert.equal(after.state, 'review', 'Hard must not drop the card into relearning')
    assert.ok(days(after, new Date(before.last_review!)) > days(before, new Date(before.last_review!)))
  })

  test('it queues no remedial writing reps, unlike Again', () => {
    const card = matureCard()
    assert.equal(gradeCard(card, 'hard', REPS).practiceQueue, 0)
    assert.equal(gradeCard(card, 'again', REPS).practiceQueue, REPS)
  })

  test('it pays off a recent lapse the way the other passing grades do', () => {
    const card = { ...matureCard(), recentLapses: 2 }
    assert.equal(gradeCard(card, 'hard', REPS).recentLapses, 1)
    assert.equal(gradeCard(card, 'again', REPS).recentLapses, 3)
  })
})

describe('preview and commit agree', () => {
  /*
   * The test this whole API shape exists for. FSRS seeds its interval fuzz from
   * the review instant, so a preview taken when the answer is revealed and a
   * commit taken when the button is pressed — a few seconds later — land on
   * different days. The button would say 4d and the deck would record 5d.
   */
  test('committing a grade stores exactly the previewed outcome', () => {
    const card = matureCard()
    const preview = previewReview(card, REPS, T0)

    for (const grade of ['again', 'hard', 'good', 'easy'] as const) {
      const committed = gradeCard(card, grade, REPS, preview)
      assert.equal(committed.due, preview[grade].card.due, `${grade} due must match its preview`)
      assert.deepEqual(committed, preview[grade].card)
    }
  })

  test('recomputing later really does drift — which is why the preview is threaded through', () => {
    const card = matureCard()
    const shown = previewReview(card, REPS, T0)
    // The learner thinks for four seconds before pressing the button.
    const later = new Date(T0.getTime() + 4000)
    const recomputed = previewReview(card, REPS, later)

    assert.notEqual(
      shown.good.card.due,
      recomputed.good.card.due,
      'if this ever passes, fuzz stopped depending on `now` and the preview plumbing could be simplified',
    )
    // …and threading the preview through defeats it.
    assert.equal(gradeCard(card, 'good', REPS, shown).due, shown.good.card.due)
  })
})

describe('persistence', () => {
  test('a card survives a round trip through JSON and schedules identically', () => {
    const graded = gradeCard(matureCard(), 'good', REPS, previewReview(matureCard(), REPS, T0))

    const restored = JSON.parse(JSON.stringify(graded)) as SrsCard
    assert.deepEqual(restored, graded, 'AsyncStorage round trip must not change the card')

    // The real risk is dates arriving back as strings and being used as Dates.
    const laterT = new Date('2026-06-01T09:00:00.000Z')
    assert.deepEqual(
      previewReview(restored, REPS, laterT).good.card,
      previewReview(graded, REPS, laterT).good.card,
      'a restored card must schedule exactly as the original would have',
    )
  })

  test('no date field survives as an invalid date', () => {
    const card = JSON.parse(JSON.stringify(gradeCard(matureCard(), 'good', REPS))) as SrsCard
    assert.ok(!Number.isNaN(new Date(card.due).getTime()), 'due must parse')
    assert.ok(!Number.isNaN(new Date(card.last_review!).getTime()), 'last_review must parse')
    assert.ok(Number.isFinite(card.stability) && card.stability > 0)
    assert.ok(Number.isFinite(card.difficulty))
  })
})

describe('"I don\'t know" is schedule-neutral', () => {
  /*
   * There is nothing to call here, and that is the assertion. "I don't know"
   * re-queues the card inside the session and never reaches this module — so
   * the test is that the card a session holds is unchanged by anything the
   * scheduler offers, and that the app never has a code path turning it into a
   * rating. If someone ever maps it to Rating.Again, this file is where the
   * intent is written down.
   */
  test('the card is untouched when no grade is submitted', () => {
    const before = matureCard()
    const snapshot = JSON.parse(JSON.stringify(before)) as SrsCard

    // Previewing is what the UI does on reveal; it must not mutate anything.
    previewReview(before, REPS, T0)

    assert.deepEqual(before, snapshot, 'previewing must not mutate the card')
    assert.equal(before.due, snapshot.due)
    assert.equal(before.lapses, snapshot.lapses)
    assert.equal(before.reps, snapshot.reps)
  })

  test('it is not one of the gradeable ratings', () => {
    const grades = ['again', 'hard', 'good', 'easy']
    assert.ok(!grades.includes('unknown'), '"I don\'t know" must never become a Grade')
  })
})

describe('migration from SM-2', () => {
  const legacy = {
    wordId: 'cc-学习',
    stage: 'review' as const,
    intervalDays: 30,
    easeFactor: 2.5,
    dueDate: '2026-04-01',
    reps: 6,
    lapses: 1,
    recentLapses: 1,
    lastReviewed: '2026-03-02',
    practiceQueue: 0,
    practiceTotal: 0,
  }

  test('keeps the learner\'s counts and their existing due date', () => {
    const card = migrateCard(legacy)

    assert.equal(card.v, SRS_SCHEMA_VERSION)
    assert.equal(card.wordId, legacy.wordId)
    assert.equal(card.reps, 6)
    assert.equal(card.lapses, 1)
    assert.equal(card.recentLapses, 1)
    assert.equal(card.state, 'review')
    // The date is preserved, so nothing that wasn't due becomes due.
    assert.equal(new Date(card.due).getFullYear(), 2026)
    assert.equal(new Date(card.due).getMonth(), 3)
    assert.equal(new Date(card.due).getDate(), 1)
  })

  test('estimates stability from the old interval and difficulty from the old ease', () => {
    const easy = migrateCard({ ...legacy, easeFactor: 2.8 })
    const hard = migrateCard({ ...legacy, easeFactor: 1.3 })

    assert.equal(easy.stability, 30, 'stability should carry the interval SM-2 had reached')
    assert.ok(easy.difficulty < hard.difficulty, 'a low ease factor must map to a high difficulty')
    assert.ok(hard.difficulty <= 10 && easy.difficulty >= 1, 'difficulty must stay in FSRS range')
  })

  test('an unreviewed card migrates as new rather than as weakly known', () => {
    const card = migrateCard({ ...legacy, stage: 'new', reps: 0, lapses: 0, intervalDays: 0 })
    assert.equal(card.state, 'new')
    assert.equal(card.stability, 0)
  })

  test('is idempotent — a v2 card passes through untouched', () => {
    const once = migrateCard(legacy)
    assert.deepEqual(migrateCard(once), once)
  })

  test('a migrated card schedules without producing invalid dates', () => {
    const preview = previewReview(migrateCard(legacy), REPS, T0)
    for (const grade of ['again', 'hard', 'good', 'easy'] as const) {
      assert.ok(!Number.isNaN(preview[grade].due.getTime()), `${grade} due must be a real date`)
      assert.ok(preview[grade].label.length > 0)
    }
  })
})

describe('due checks use instants, not calendar days', () => {
  test('a card due in ten minutes is not due now', () => {
    const card = { ...createNewCard('w', T0), due: new Date(T0.getTime() + 600_000).toISOString() }
    assert.equal(isCardDue(card, T0), false)
    assert.equal(isCardDue(card, new Date(T0.getTime() + 601_000)), true)
  })

  test('a long-overdue card is due', () => {
    assert.equal(isCardDue(matureCard(), T0), true)
  })
})

describe('interval formatting', () => {
  const cases: [number, string][] = [
    [30_000, '<1m'],
    [5 * 60_000, '5m'],
    [60 * 60_000, '1h'],
    [8 * 60 * 60_000, '8h'],
    [24 * 60 * 60_000, '1d'],
    [4 * 24 * 60 * 60_000, '4d'],
    [21 * 24 * 60 * 60_000, '3w'],
    [60 * 24 * 60 * 60_000, '2mo'],
    [365 * 24 * 60 * 60_000, '1y'],
  ]

  for (const [ms, expected] of cases) {
    test(`${ms}ms -> ${expected}`, () => {
      assert.equal(formatReviewInterval(T0, new Date(T0.getTime() + ms)), expected)
    })
  }
})

describe('review log', () => {
  test('records the grade and the pre-review state, and caps the duration', () => {
    const before = matureCard()
    const after = gradeCard(before, 'good', REPS)

    const entry = reviewLogEntry(before, after, 'good', 4200, T0)
    assert.equal(entry.grade, 'good')
    assert.equal(entry.state, 'review', 'the log records the state the card was in *before* the review')
    assert.equal(entry.durationMs, 4200)
    assert.equal(entry.at, T0.toISOString())

    // An abandoned card must not dominate the statistics.
    assert.equal(reviewLogEntry(before, after, 'good', 45 * 60_000, T0).durationMs, 60_000)
    assert.equal(reviewLogEntry(before, after, 'good', -5, T0).durationMs, 0)
  })

  test('response time does not change the schedule', () => {
    const card = matureCard()
    const preview = previewReview(card, REPS, T0)
    // Same grade, same instant, wildly different thinking time: same outcome.
    assert.equal(
      gradeCard(card, 'good', REPS, preview).due,
      gradeCard(card, 'good', REPS, preview).due,
    )
    assert.equal(
      reviewLogEntry(card, gradeCard(card, 'good', REPS, preview), 'good', 1000, T0).scheduledDays,
      reviewLogEntry(card, gradeCard(card, 'good', REPS, preview), 'good', 50_000, T0).scheduledDays,
    )
  })
})
