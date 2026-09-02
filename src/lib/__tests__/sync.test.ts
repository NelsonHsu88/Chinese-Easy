import test from 'node:test'
import assert from 'node:assert/strict'
import type { DailyProgress, ReviewLogEntry, SrsCard, VocabWord } from '../../types'
import {
  cardToRow,
  reviewEventId,
  reviewToRow,
  rowToCard,
  rowToReview,
} from '../sync/mappers'
import {
  deriveStreak,
  mergeCards,
  mergeCompletions,
  mergeCustomWords,
  mergeDailyActivity,
  mergePlacement,
  mergePreferences,
  mergeReviewEvents,
  mergeStoryProgress,
  mergeXp,
} from '../sync/conflict'
import { mergeSnapshot, pullSnapshot, type LocalAccountState } from '../sync/pull'
import { EMPTY_SNAPSHOT, type RemoteSnapshot } from '../sync/types'

/*
 * Mappers and conflict rules.
 *
 * The round-trip suite is the important one: it is what stands between a cloud
 * migration and thousands of learners redoing reviews they had already earned.
 * Every fixture below is a shape the app can actually produce — a new card, a
 * card mid-learning-step due in minutes, a lapsed card, a v1 card that has not
 * been migrated, a card with no `last_review`.
 */

const USER = '11111111-1111-4111-8111-111111111111'

const NEW_CARD: SrsCard = {
  wordId: 'cc-學習',
  v: 2,
  due: '2026-08-18T09:00:00.000Z',
  stability: 0,
  difficulty: 0,
  elapsed_days: 0,
  scheduled_days: 0,
  learning_steps: 0,
  state: 'new',
  reps: 0,
  lapses: 0,
  recentLapses: 0,
  practiceQueue: 0,
  practiceTotal: 0,
}

const LEARNING_CARD: SrsCard = {
  wordId: 'cc-謝謝',
  v: 2,
  /* Minutes away, not days — the learning steps are 1m/10m, and an
     implementation that rounded to a date would silently move this. */
  due: '2026-08-18T09:10:30.500Z',
  stability: 0.4072,
  difficulty: 7.2841,
  elapsed_days: 0,
  scheduled_days: 0,
  learning_steps: 1,
  state: 'learning',
  last_review: '2026-08-18T09:09:30.500Z',
  reps: 1,
  lapses: 0,
  recentLapses: 0,
  practiceQueue: 0,
  practiceTotal: 0,
}

const REVIEW_CARD: SrsCard = {
  wordId: 'cc-圖書館',
  v: 2,
  due: '2026-11-02T14:23:11.007Z',
  stability: 76.51234567,
  difficulty: 4.9876543,
  elapsed_days: 31.5,
  scheduled_days: 76,
  learning_steps: 0,
  state: 'review',
  last_review: '2026-08-18T14:23:11.007Z',
  reps: 12,
  lapses: 3,
  recentLapses: 1,
  practiceQueue: 2,
  practiceTotal: 9,
}

const RELEARNING_CARD: SrsCard = {
  ...REVIEW_CARD,
  wordId: 'cc-經濟',
  state: 'relearning',
  lapses: 4,
  recentLapses: 2,
}

/** A v1 card that has not yet been through `migrateDeck`. */
const V1_CARD: SrsCard = {
  ...REVIEW_CARD,
  wordId: 'cc-舊',
  v: 1,
}

const FIXTURES = [NEW_CARD, LEARNING_CARD, REVIEW_CARD, RELEARNING_CARD, V1_CARD]

test('FSRS round-trip', async (t) => {
  await t.test('a card that goes out and comes back is the same card', () => {
    for (const card of FIXTURES) {
      const back = rowToCard(cardToRow(card, USER))
      assert.deepStrictEqual(back, card, `${card.wordId} changed in transit`)
    }
  })

  await t.test('due dates survive to the millisecond', () => {
    for (const card of FIXTURES) {
      const back = rowToCard(cardToRow(card, USER))
      assert.strictEqual(back.due, card.due)
      assert.strictEqual(Date.parse(back.due), Date.parse(card.due))
    }
  })

  await t.test('no scheduling field is rounded or re-derived', () => {
    const back = rowToCard(cardToRow(REVIEW_CARD, USER))
    assert.strictEqual(back.stability, 76.51234567)
    assert.strictEqual(back.difficulty, 4.9876543)
    assert.strictEqual(back.elapsed_days, 31.5)
    assert.strictEqual(back.scheduled_days, 76)
    assert.strictEqual(back.reps, 12)
    assert.strictEqual(back.lapses, 3)
    assert.strictEqual(back.state, 'review')
    assert.strictEqual(back.last_review, '2026-08-18T14:23:11.007Z')
  })

  await t.test('a card with no last_review does not gain the key', () => {
    const back = rowToCard(cardToRow(NEW_CARD, USER))
    assert.equal('last_review' in back, false)
  })

  await t.test('the schema version travels, so v1 stays v1', () => {
    assert.strictEqual(rowToCard(cardToRow(V1_CARD, USER)).v, 1)
    assert.strictEqual(rowToCard(cardToRow(REVIEW_CARD, USER)).v, 2)
  })

  await t.test('word due tomorrow is still due tomorrow after a round trip', () => {
    const before = REVIEW_CARD.due
    const after = rowToCard(cardToRow(REVIEW_CARD, USER)).due
    assert.strictEqual(after, before)
  })
})

test('review event identity', async (t) => {
  const entry: ReviewLogEntry = {
    wordId: 'cc-學習',
    grade: 'good',
    at: '2026-08-18T09:10:30.500Z',
    state: 'learning',
    scheduledDays: 4,
    durationMs: 3200,
  }

  await t.test('is stable for the same review', () => {
    assert.equal(reviewEventId(entry), reviewEventId({ ...entry }))
  })

  await t.test('is a syntactically valid uuid', () => {
    assert.match(reviewEventId(entry), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  await t.test('differs when the word, instant or grade differs', () => {
    const ids = new Set([
      reviewEventId(entry),
      reviewEventId({ ...entry, wordId: 'cc-謝謝' }),
      reviewEventId({ ...entry, at: '2026-08-18T09:10:30.501Z' }),
      reviewEventId({ ...entry, grade: 'easy' }),
    ])
    assert.equal(ids.size, 4)
  })

  await t.test('round-trips through a row', () => {
    assert.deepStrictEqual(rowToReview(reviewToRow(entry, USER)), entry)
  })
})

test('conflict rules', async (t) => {
  await t.test('cards: the most recently reviewed side wins', () => {
    const older: SrsCard = { ...REVIEW_CARD, last_review: '2026-08-18T14:00:00.000Z', reps: 12 }
    const newer: SrsCard = {
      ...REVIEW_CARD,
      last_review: '2026-08-18T14:05:00.000Z',
      reps: 13,
      due: '2027-01-01T00:00:00.000Z',
    }
    assert.deepStrictEqual(mergeCards([older], [newer]), [newer])
    assert.deepStrictEqual(mergeCards([newer], [older]), [newer], 'order changed the winner')
  })

  await t.test('cards: a tie falls to more repetitions', () => {
    const a: SrsCard = { ...REVIEW_CARD, reps: 12 }
    const b: SrsCard = { ...REVIEW_CARD, reps: 20 }
    assert.equal(mergeCards([a], [b])[0].reps, 20)
    assert.equal(mergeCards([b], [a])[0].reps, 20)
  })

  await t.test('cards: a card on only one side is kept', () => {
    const merged = mergeCards([REVIEW_CARD], [NEW_CARD])
    assert.equal(merged.length, 2)
  })

  await t.test('cards: an unreviewed card never beats a reviewed one', () => {
    const merged = mergeCards([{ ...REVIEW_CARD }], [{ ...REVIEW_CARD, last_review: undefined, reps: 0 }])
    assert.equal(merged[0].reps, 12)
  })

  await t.test('review events: union, and replaying is a no-op', () => {
    const a: ReviewLogEntry = {
      wordId: 'cc-一', grade: 'good', at: '2026-08-18T09:00:00.000Z',
      state: 'review', scheduledDays: 4, durationMs: 1000,
    }
    const b: ReviewLogEntry = { ...a, wordId: 'cc-二', at: '2026-08-18T09:01:00.000Z' }

    const once = mergeReviewEvents([a], [b])
    assert.equal(once.length, 2)
    assert.deepStrictEqual(mergeReviewEvents(once, [a, b]), once, 'a second merge duplicated events')
    assert.deepStrictEqual(mergeReviewEvents(once, once), once)
  })

  await t.test('review events: come back in chronological order', () => {
    const late: ReviewLogEntry = {
      wordId: 'cc-一', grade: 'good', at: '2026-08-18T10:00:00.000Z',
      state: 'review', scheduledDays: 4, durationMs: 1000,
    }
    const early: ReviewLogEntry = { ...late, wordId: 'cc-二', at: '2026-08-18T08:00:00.000Z' }
    assert.deepStrictEqual(mergeReviewEvents([late], [early]).map((e) => e.at), [
      '2026-08-18T08:00:00.000Z',
      '2026-08-18T10:00:00.000Z',
    ])
  })

  await t.test('completions: union, done beats not-done', () => {
    assert.deepStrictEqual(mergeCompletions(['a'], ['b', 'a']).sort(), ['a', 'b'])
    assert.deepStrictEqual(mergeCompletions([], []), [])
  })

  await t.test('story progress: the further page wins, per story', () => {
    const merged = mergeStoryProgress({ s1: 5, s2: 1 }, { s1: 2, s3: 9 })
    assert.deepStrictEqual(merged, { s1: 5, s2: 1, s3: 9 })
  })

  await t.test('daily activity: per-date maximum, never a sum', () => {
    const local: DailyProgress[] = [{ date: '2026-08-18', wordsLearned: 3, reviewsCompleted: 20 }]
    const remote: DailyProgress[] = [
      { date: '2026-08-18', wordsLearned: 1, reviewsCompleted: 35 },
      { date: '2026-08-17', wordsLearned: 2, reviewsCompleted: 10 },
    ]
    const merged = mergeDailyActivity(local, remote)
    assert.equal(merged.length, 2)
    const day = merged.find((d) => d.date === '2026-08-18')
    assert.equal(day?.wordsLearned, 3)
    assert.equal(day?.reviewsCompleted, 35, 'counters were summed')
  })

  await t.test('daily activity: merging twice changes nothing', () => {
    const local: DailyProgress[] = [{ date: '2026-08-18', wordsLearned: 3, reviewsCompleted: 20 }]
    const once = mergeDailyActivity(local, local)
    assert.deepStrictEqual(mergeDailyActivity(once, local), once)
  })

  await t.test('xp: never decreases, never double-counts', () => {
    assert.equal(mergeXp(100, 80, 90), 100)
    assert.equal(mergeXp(80, 100, 90), 100)
    assert.equal(mergeXp(80, 90, 250), 250, 'derivation should be able to raise the floor')
    /* The property that matters: no merge ever reduces a balance. */
    for (const [l, r, d] of [[0, 0, 0], [500, 10, 20], [10, 500, 20], [10, 20, 500]]) {
      assert.ok(mergeXp(l, r, d) >= l)
    }
  })

  await t.test('streak: derived from activity, not carried over', () => {
    const days: DailyProgress[] = [
      { date: '2026-08-16', wordsLearned: 0, reviewsCompleted: 5 },
      { date: '2026-08-17', wordsLearned: 0, reviewsCompleted: 5 },
      { date: '2026-08-18', wordsLearned: 0, reviewsCompleted: 5 },
    ]
    assert.equal(deriveStreak(days, '2026-08-18'), 3)
  })

  await t.test('streak: a gap ends it', () => {
    const days: DailyProgress[] = [
      { date: '2026-08-14', wordsLearned: 0, reviewsCompleted: 5 },
      { date: '2026-08-17', wordsLearned: 0, reviewsCompleted: 5 },
      { date: '2026-08-18', wordsLearned: 0, reviewsCompleted: 5 },
    ]
    assert.equal(deriveStreak(days, '2026-08-18'), 2)
  })

  await t.test('streak: today not yet studied is not a broken streak', () => {
    const days: DailyProgress[] = [
      { date: '2026-08-16', wordsLearned: 0, reviewsCompleted: 5 },
      { date: '2026-08-17', wordsLearned: 0, reviewsCompleted: 5 },
    ]
    assert.equal(deriveStreak(days, '2026-08-18'), 2)
  })

  await t.test('streak: a day with no work does not count', () => {
    const days: DailyProgress[] = [{ date: '2026-08-18', wordsLearned: 0, reviewsCompleted: 0 }]
    assert.equal(deriveStreak(days, '2026-08-18'), 0)
  })

  await t.test('preferences: newest wins, and a fresh device takes the remote copy', () => {
    const local = { script: 'traditional' } as never
    const remote = { script: 'simplified' } as never
    assert.equal(mergePreferences(local, remote, null, '2026-08-18T00:00:00.000Z'), remote)
    assert.equal(
      mergePreferences(local, remote, '2026-08-19T00:00:00.000Z', '2026-08-18T00:00:00.000Z'),
      local,
    )
    assert.equal(mergePreferences(local, null, null, null), local)
  })

  await t.test('custom words: a remote deletion is not resurrected', () => {
    const word: VocabWord = {
      id: 'custom-1', simplified: '词', traditional: '詞', pinyin: 'cí',
      definition: 'word', hskLevel: 0, category: 'daily', custom: true,
    }
    const kept = mergeCustomWords([word], [], new Set())
    assert.equal(kept.length, 1)
    const deleted = mergeCustomWords([word], [], new Set(['custom-1']))
    assert.equal(deleted.length, 0, 'a deleted word came back')
  })

  await t.test('placement: the earliest result stands', () => {
    const first = { estimatedHsk: 3, completedAt: '2026-01-01T00:00:00.000Z' }
    const second = { estimatedHsk: 5, completedAt: '2026-08-01T00:00:00.000Z' }
    assert.deepStrictEqual(mergePlacement(first, second), first)
    assert.deepStrictEqual(mergePlacement(second, first), first)
    assert.deepStrictEqual(mergePlacement(undefined, second), second)
  })
})

test('restore on a new device', async (t) => {
  const emptyLocal: LocalAccountState = {
    deck: [],
    reviewLog: [],
    customWords: [],
    dailyProgress: [],
    storyProgress: {},
    completedLessonIds: [],
    claimedChallengeIds: [],
    unlockedBuildingIds: [],
    xp: 0,
    streak: 0,
    settings: { script: 'traditional' } as never,
  }

  const snapshot: RemoteSnapshot = {
    ...EMPTY_SNAPSHOT,
    cards: [cardToRow(REVIEW_CARD, USER), cardToRow(LEARNING_CARD, USER)],
    reviewEvents: [
      reviewToRow(
        {
          wordId: 'cc-圖書館', grade: 'good', at: '2026-08-18T14:23:11.007Z',
          state: 'review', scheduledDays: 76, durationMs: 4100,
        },
        USER,
      ),
    ],
    storyProgress: [{ user_id: USER, story_id: 'the-moon-rabbit', page_index: 4 }],
    dailyActivity: [
      { user_id: USER, activity_date: '2026-08-17', words_learned: 2, reviews_completed: 12 },
      { user_id: USER, activity_date: '2026-08-18', words_learned: 1, reviews_completed: 30 },
    ],
    completions: [
      { user_id: USER, kind: 'lesson', item_id: 'the-basics-1', completed_at: '2026-08-01T00:00:00.000Z' },
      { user_id: USER, kind: 'challenge', item_id: 'daily-2026-08-18', completed_at: '2026-08-18T00:00:00.000Z' },
    ],
    state: {
      user_id: USER, xp: 4200, streak: 9, last_active_date: '2026-08-18',
      onboarding_complete: true, placement_hsk: 3, placement_completed_at: '2026-01-01T00:00:00.000Z',
    },
  }

  const restored = mergeSnapshot(emptyLocal, snapshot, { today: '2026-08-18' })

  await t.test('the deck comes back', () => {
    assert.equal(restored.deck.length, 2)
  })

  await t.test('the review schedule is unchanged', () => {
    const card = restored.deck.find((c) => c.wordId === 'cc-圖書館')
    assert.strictEqual(card?.due, REVIEW_CARD.due)
    assert.strictEqual(card?.stability, REVIEW_CARD.stability)
    assert.strictEqual(card?.difficulty, REVIEW_CARD.difficulty)
    assert.strictEqual(card?.reps, REVIEW_CARD.reps)
    assert.strictEqual(card?.lapses, REVIEW_CARD.lapses)
  })

  await t.test('XP, streak, stories and lessons come back', () => {
    assert.equal(restored.xp, 4200)
    assert.equal(restored.streak, 2, 'streak is derived from the two active days')
    assert.deepStrictEqual(restored.storyProgress, { 'the-moon-rabbit': 4 })
    assert.deepStrictEqual(restored.completedLessonIds, ['the-basics-1'])
    assert.deepStrictEqual(restored.claimedChallengeIds, ['daily-2026-08-18'])
  })

  await t.test('restoring twice is identical to restoring once', () => {
    const twice = mergeSnapshot(restored, snapshot, { today: '2026-08-18' })
    assert.deepStrictEqual(twice, restored)
  })

  await t.test('an offline session on this device is not overwritten', () => {
    const studiedOffline: LocalAccountState = {
      ...emptyLocal,
      deck: [{ ...REVIEW_CARD, last_review: '2026-08-19T08:00:00.000Z', reps: 13, due: '2027-03-01T00:00:00.000Z' }],
      xp: 4500,
    }
    const merged = mergeSnapshot(studiedOffline, snapshot, { today: '2026-08-19' })
    const card = merged.deck.find((c) => c.wordId === 'cc-圖書館')
    assert.strictEqual(card?.reps, 13, 'the local, more recent review was lost')
    assert.strictEqual(card?.due, '2027-03-01T00:00:00.000Z')
    assert.equal(merged.xp, 4500, 'XP went backwards')
  })

  await t.test('an empty account restores to an empty app, not a crash', () => {
    const nothing = mergeSnapshot(emptyLocal, EMPTY_SNAPSHOT, { today: '2026-08-18' })
    assert.deepStrictEqual(nothing.deck, [])
    assert.equal(nothing.xp, 0)
    assert.equal(nothing.streak, 0)
  })
})

test('pullSnapshot', async (t) => {
  /** A stub shaped like the slice of supabase-js `pull.ts` declares. */
  function stubClient(tables: Record<string, unknown[]>, failOn?: string) {
    return {
      from(table: string) {
        return {
          select() {
            return {
              eq() {
                if (table === failOn) return Promise.resolve({ data: null, error: { message: 'nope' } })
                return Promise.resolve({ data: tables[table] ?? [], error: null })
              },
            }
          },
        }
      },
    }
  }

  await t.test('reads every table and shapes one snapshot', async () => {
    const snapshot = await pullSnapshot(
      stubClient({
        srs_cards: [cardToRow(REVIEW_CARD, USER)],
        user_state: [{ user_id: USER, xp: 10, streak: 1 }],
      }),
      USER,
    )
    assert.equal(snapshot.cards.length, 1)
    assert.equal(snapshot.state?.xp, 10)
    assert.equal(snapshot.preferences, null)
    assert.deepStrictEqual(snapshot.completions, [])
  })

  await t.test('one failed table fails the whole pull', async () => {
    await assert.rejects(
      () => pullSnapshot(stubClient({}, 'srs_cards'), USER),
      /pull failed for srs_cards/,
    )
  })
})
