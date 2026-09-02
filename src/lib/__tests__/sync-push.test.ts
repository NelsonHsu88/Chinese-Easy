import test from 'node:test'
import assert from 'node:assert/strict'
import type { DailyProgress, ReviewLogEntry, SrsCard } from '../../types'
import { OUTBOX_LIMIT, enqueue, intentKey, pending, remove, trim, type OutboxEntry } from '../sync/outbox'
import { afterPush, pushOutbox, type PushSource, type SyncWriteClient } from '../sync/push'
import { reviewEventId } from '../sync/mappers'
import { mergeCards, mergeDailyActivity, mergeReviewEvents, mergeStoryProgress } from '../sync/conflict'
import { changedIntents, type SyncSnapshot } from '../sync/changes'

/*
 * Outbox, push, and two-device convergence.
 *
 * The push tests use a recording stub for the client. The convergence tests are
 * property tests: two devices that merge the same pair of states must agree,
 * whichever order they do it in, and merging again must change nothing. Those
 * two properties together are what stop a pair of phones oscillating forever,
 * each "fixing" what the other did.
 */

const USER = '11111111-1111-4111-8111-111111111111'
const NOW = '2026-08-18T12:00:00.000Z'

function card(wordId: string, over: Partial<SrsCard> = {}): SrsCard {
  return {
    wordId,
    v: 2,
    due: '2026-11-02T14:23:11.007Z',
    stability: 76.5,
    difficulty: 4.9,
    elapsed_days: 31.5,
    scheduled_days: 76,
    learning_steps: 0,
    state: 'review',
    last_review: '2026-08-18T14:23:11.007Z',
    reps: 12,
    lapses: 3,
    recentLapses: 1,
    practiceQueue: 0,
    practiceTotal: 0,
    ...over,
  }
}

function review(wordId: string, at: string): ReviewLogEntry {
  return { wordId, grade: 'good', at, state: 'review', scheduledDays: 4, durationMs: 1000 }
}

function source(over: Partial<PushSource> = {}): PushSource {
  return {
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
    settings: {} as never,
    fullSettings: {} as never,
    onboardingComplete: true,
    lastActiveDate: '2026-08-18',
    ...over,
  }
}

/** Records every upsert, and can be told to fail specific tables. */
function stubClient(failTables: string[] = []) {
  const calls: { table: string; rows: unknown[]; options?: unknown }[] = []
  const client: SyncWriteClient = {
    from(table: string) {
      return {
        upsert(rows: unknown[], options?: unknown) {
          calls.push({ table, rows, options })
          return Promise.resolve({
            error: failTables.includes(table) ? { message: 'offline' } : null,
          })
        },
      }
    },
  }
  return { client, calls }
}

test('outbox', async (t) => {
  await t.test('coalesces repeated changes to one thing', () => {
    let queue: OutboxEntry[] = []
    for (let i = 0; i < 12; i += 1) {
      queue = enqueue(queue, [{ kind: 'card', wordId: 'cc-學習' }], NOW)
    }
    assert.equal(queue.length, 1)
    assert.equal(queue[0].key, 'card:cc-學習')
  })

  await t.test('keeps distinct things distinct', () => {
    const queue = enqueue(
      [],
      [
        { kind: 'card', wordId: 'a' },
        { kind: 'card', wordId: 'b' },
        { kind: 'review', eventId: 'r1' },
        { kind: 'preferences' },
        { kind: 'state' },
      ],
      NOW,
    )
    assert.equal(queue.length, 5)
  })

  await t.test('coalescing keeps the earliest queue time, so nothing starves', () => {
    let queue = enqueue([], [{ kind: 'card', wordId: 'a' }], '2026-08-18T10:00:00.000Z')
    queue = enqueue(queue, [{ kind: 'card', wordId: 'a' }], '2026-08-18T11:00:00.000Z')
    assert.equal(queue[0].at, '2026-08-18T10:00:00.000Z')
  })

  await t.test('every intent kind has a distinct key', () => {
    const keys = new Set(
      [
        { kind: 'card', wordId: 'x' },
        { kind: 'review', eventId: 'x' },
        { kind: 'customWord', wordId: 'x' },
        { kind: 'story', storyId: 'x' },
        { kind: 'daily', date: 'x' },
        { kind: 'completion', completionKind: 'lesson', itemId: 'x' },
        { kind: 'completion', completionKind: 'challenge', itemId: 'x' },
        { kind: 'preferences' },
        { kind: 'state' },
      ].map((i) => intentKey(i as never)),
    )
    assert.equal(keys.size, 9)
  })

  await t.test('under pressure it drops rebuildable work, never a review', () => {
    const reviews: OutboxEntry[] = Array.from({ length: 10 }, (_, i) => ({
      key: `review:r${i}`,
      intent: { kind: 'review', eventId: `r${i}` },
      at: NOW,
    }))
    const cards: OutboxEntry[] = Array.from({ length: OUTBOX_LIMIT + 50 }, (_, i) => ({
      key: `card:c${i}`,
      intent: { kind: 'card', wordId: `c${i}` },
      at: `2026-08-18T00:00:${String(i % 60).padStart(2, '0')}.000Z`,
    }))
    const trimmed = trim([...reviews, ...cards])
    assert.equal(trimmed.length, OUTBOX_LIMIT)
    assert.equal(trimmed.filter((e) => e.intent.kind === 'review').length, 10)
  })

  await t.test('drained entries are removed, unknown keys ignored', () => {
    const queue = enqueue([], [{ kind: 'card', wordId: 'a' }, { kind: 'card', wordId: 'b' }], NOW)
    assert.equal(remove(queue, ['card:a', 'card:nope']).length, 1)
  })

  await t.test('sends oldest first', () => {
    const queue: OutboxEntry[] = [
      { key: 'b', intent: { kind: 'state' }, at: '2026-08-18T11:00:00.000Z' },
      { key: 'a', intent: { kind: 'preferences' }, at: '2026-08-18T10:00:00.000Z' },
    ]
    assert.deepStrictEqual(pending(queue).map((e) => e.key), ['a', 'b'])
  })
})

test('push', async (t) => {
  await t.test('sends a queued card and forgets it', async () => {
    const { client, calls } = stubClient()
    const queue = enqueue([], [{ kind: 'card', wordId: 'cc-學習' }], NOW)
    const result = await pushOutbox(client, USER, queue, source({ deck: [card('cc-學習')] }), NOW)

    assert.deepStrictEqual(result.failed, [])
    assert.deepStrictEqual(result.drained, ['card:cc-學習'])
    assert.equal(calls[0].table, 'srs_cards')
    assert.equal((calls[0].rows[0] as { word_id: string }).word_id, 'cc-學習')
    assert.deepStrictEqual(afterPush(queue, result), [])
  })

  await t.test('never issues a delete', async () => {
    const { client, calls } = stubClient()
    const queue = enqueue(
      [],
      [{ kind: 'card', wordId: 'a' }, { kind: 'review', eventId: 'x' }, { kind: 'state' }],
      NOW,
    )
    await pushOutbox(client, USER, queue, source({ deck: [card('a')] }), NOW)
    /* The stub only implements `upsert`; a delete would have thrown. */
    assert.ok(calls.every((c) => typeof c.rows !== 'undefined'))
  })

  await t.test('review events go up with duplicates ignored', async () => {
    const entry = review('cc-一', '2026-08-18T09:00:00.000Z')
    const { client, calls } = stubClient()
    const queue = enqueue([], [{ kind: 'review', eventId: reviewEventId(entry) }], NOW)
    await pushOutbox(client, USER, queue, source({ reviewLog: [entry] }), NOW)

    const call = calls.find((c) => c.table === 'review_events')
    assert.ok(call)
    assert.deepStrictEqual(call.options, { onConflict: 'id', ignoreDuplicates: true })
  })

  await t.test('pushing the same queue twice sends identical rows', async () => {
    const entry = review('cc-一', '2026-08-18T09:00:00.000Z')
    const src = source({ deck: [card('a')], reviewLog: [entry] })
    const queue = enqueue(
      [],
      [{ kind: 'card', wordId: 'a' }, { kind: 'review', eventId: reviewEventId(entry) }],
      NOW,
    )
    const first = stubClient()
    const second = stubClient()
    await pushOutbox(first.client, USER, queue, src, NOW)
    await pushOutbox(second.client, USER, queue, src, NOW)
    assert.deepStrictEqual(first.calls, second.calls)
  })

  await t.test('a failed table keeps its entries queued, others still drain', async () => {
    const { client } = stubClient(['srs_cards'])
    const queue = enqueue(
      [],
      [{ kind: 'card', wordId: 'a' }, { kind: 'story', storyId: 's1' }],
      NOW,
    )
    const result = await pushOutbox(
      client,
      USER,
      queue,
      source({ deck: [card('a')], storyProgress: { s1: 3 } }),
      NOW,
    )
    assert.deepStrictEqual(result.failed, ['srs_cards'])
    const left = afterPush(queue, result)
    assert.deepStrictEqual(left.map((e) => e.key), ['card:a'], 'the failed card was forgotten')
  })

  await t.test('an offline session survives being killed and drains later', async () => {
    /* Offline: everything fails, nothing is forgotten. */
    const offline = stubClient(['srs_cards', 'review_events', 'user_state'])
    const entry = review('cc-一', '2026-08-18T09:00:00.000Z')
    const src = source({ deck: [card('a')], reviewLog: [entry], xp: 120 })
    let queue = enqueue(
      [],
      [
        { kind: 'card', wordId: 'a' },
        { kind: 'review', eventId: reviewEventId(entry) },
        { kind: 'state' },
      ],
      NOW,
    )
    const failedResult = await pushOutbox(offline.client, USER, queue, src, NOW)
    queue = afterPush(queue, failedResult)
    assert.equal(queue.length, 3, 'work was lost while offline')

    /* Back online: the same queue drains completely. */
    const online = stubClient()
    const ok = await pushOutbox(online.client, USER, queue, src, NOW)
    queue = afterPush(queue, ok)
    assert.deepStrictEqual(queue, [], 'queue did not drain on reconnect')
    assert.deepStrictEqual(ok.failed, [])
  })

  await t.test('a quarantined card drops its intent rather than retrying forever', async () => {
    const { client } = stubClient()
    const queue = enqueue([], [{ kind: 'card', wordId: 'gone' }], NOW)
    const result = await pushOutbox(client, USER, queue, source({ deck: [] }), NOW)
    assert.deepStrictEqual(result.drained, ['card:gone'])
    assert.deepStrictEqual(afterPush(queue, result), [])
  })

  await t.test('an empty queue sends nothing at all', async () => {
    const { client, calls } = stubClient()
    const result = await pushOutbox(client, USER, [], source(), NOW)
    assert.equal(calls.length, 0)
    assert.deepStrictEqual(result.drained, [])
  })
})

test('two-device convergence', async (t) => {
  const deviceA = [card('cc-一', { last_review: '2026-08-18T14:00:00.000Z', reps: 12 })]
  const deviceB = [
    card('cc-一', { last_review: '2026-08-18T14:05:00.000Z', reps: 13, due: '2027-01-01T00:00:00.000Z' }),
    card('cc-二'),
  ]

  await t.test('cards: both devices reach the same deck, whichever merges first', () => {
    const onA = mergeCards(deviceA, deviceB)
    const onB = mergeCards(deviceB, deviceA)
    const key = (cards: SrsCard[]) =>
      [...cards].sort((x, y) => x.wordId.localeCompare(y.wordId)).map((c) => `${c.wordId}:${c.reps}:${c.due}`)
    assert.deepStrictEqual(key(onA), key(onB))
  })

  await t.test('cards: merging again changes nothing', () => {
    const once = mergeCards(deviceA, deviceB)
    assert.deepStrictEqual(mergeCards(once, deviceB), once)
    assert.deepStrictEqual(mergeCards(once, once), once)
  })

  await t.test('reviews: conflicting sessions union, and never duplicate', () => {
    const a = [review('cc-一', '2026-08-18T14:00:00.000Z')]
    const b = [review('cc-一', '2026-08-18T14:05:00.000Z')]
    const onA = mergeReviewEvents(a, b)
    const onB = mergeReviewEvents(b, a)
    assert.deepStrictEqual(onA, onB)
    assert.equal(onA.length, 2)
    /* The same sync running twice — the case a retry produces. */
    assert.deepStrictEqual(mergeReviewEvents(onA, b), onA)
    assert.deepStrictEqual(mergeReviewEvents(onA, onB), onA)
  })

  await t.test('story progress converges on the further page', () => {
    const a = { s1: 7, s2: 1 }
    const b = { s1: 3, s3: 2 }
    assert.deepStrictEqual(mergeStoryProgress(a, b), mergeStoryProgress(b, a))
    assert.equal(mergeStoryProgress(a, b).s1, 7)
  })

  await t.test('daily activity converges and never inflates on replay', () => {
    const a: DailyProgress[] = [{ date: '2026-08-18', wordsLearned: 3, reviewsCompleted: 20 }]
    const b: DailyProgress[] = [{ date: '2026-08-18', wordsLearned: 1, reviewsCompleted: 35 }]
    const onA = mergeDailyActivity(a, b)
    const onB = mergeDailyActivity(b, a)
    assert.deepStrictEqual(onA, onB)
    assert.deepStrictEqual(mergeDailyActivity(onA, b), onA)
    assert.equal(onA[0].reviewsCompleted, 35)
  })

  await t.test('a three-way merge lands in the same place in any order', () => {
    const c = [card('cc-三', { last_review: '2026-08-18T15:00:00.000Z' })]
    const key = (cards: SrsCard[]) =>
      [...cards].sort((x, y) => x.wordId.localeCompare(y.wordId)).map((k) => `${k.wordId}:${k.reps}`)
    assert.deepStrictEqual(
      key(mergeCards(mergeCards(deviceA, deviceB), c)),
      key(mergeCards(deviceA, mergeCards(deviceB, c))),
    )
  })
})

test('change detection', async (t) => {
  const base: SyncSnapshot = {
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
    onboardingComplete: false,
    preferences: { script: 'traditional' },
  }

  await t.test('an unchanged snapshot queues nothing', () => {
    assert.deepStrictEqual(changedIntents(base, { ...base }), [])
  })

  await t.test('a graded card queues exactly that card', () => {
    const after = { ...base, deck: [card('cc-一')] }
    assert.deepStrictEqual(changedIntents(base, after), [{ kind: 'card', wordId: 'cc-一' }])
  })

  await t.test('an unchanged card in a changed deck is not re-queued', () => {
    const before = { ...base, deck: [card('cc-一'), card('cc-二')] }
    const after = { ...before, deck: [card('cc-一'), card('cc-二', { reps: 99 })] }
    assert.deepStrictEqual(changedIntents(before, after), [{ kind: 'card', wordId: 'cc-二' }])
  })

  await t.test('a new review queues one event', () => {
    const entry = review('cc-一', '2026-08-18T09:00:00.000Z')
    const intents = changedIntents(base, { ...base, reviewLog: [entry] })
    assert.deepStrictEqual(intents, [{ kind: 'review', eventId: reviewEventId(entry) }])
  })

  await t.test('a disappearing card queues nothing — deletions are never inferred', () => {
    const before = { ...base, deck: [card('cc-一')] }
    assert.deepStrictEqual(changedIntents(before, base), [])
  })

  await t.test('XP, streak and onboarding collapse to one state intent', () => {
    const after = { ...base, xp: 40, streak: 2, onboardingComplete: true }
    assert.deepStrictEqual(changedIntents(base, after), [{ kind: 'state' }])
  })

  await t.test('a changed preference queues preferences', () => {
    const after = { ...base, preferences: { script: 'simplified' } }
    assert.deepStrictEqual(changedIntents(base, after), [{ kind: 'preferences' }])
  })

  await t.test('a claimed challenge queues one completion', () => {
    const after = { ...base, claimedChallengeIds: ['daily-2026-08-18'] }
    assert.deepStrictEqual(changedIntents(base, after), [
      { kind: 'completion', completionKind: 'challenge', itemId: 'daily-2026-08-18' },
    ])
  })

  await t.test('a full session queues each thing once', () => {
    const entry = review('cc-一', '2026-08-18T09:00:00.000Z')
    const after: SyncSnapshot = {
      ...base,
      deck: [card('cc-一', { reps: 13 })],
      reviewLog: [entry],
      dailyProgress: [{ date: '2026-08-18', wordsLearned: 0, reviewsCompleted: 1 }],
      xp: 10,
    }
    let queue: OutboxEntry[] = []
    queue = enqueue(queue, changedIntents(base, after), NOW)
    assert.deepStrictEqual(
      queue.map((e) => e.key).sort(),
      ['card:cc-一', 'daily:2026-08-18', `review:${reviewEventId(entry)}`, 'state'].sort(),
    )
  })
})
