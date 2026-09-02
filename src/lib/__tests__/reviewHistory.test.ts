import test from 'node:test'
import assert from 'node:assert/strict'
import { createMemoryStore } from '../keyValueStore'
import { reviewArchiveChunkKey, scopedKey, type StorageScope } from '../storageKeys'
import { reviewEventId } from '../sync/mappers'
import {
  CHUNK_SIZE,
  EMPTY_LEDGER,
  RECENT_WINDOW,
  derivedReviewXp,
  loadReviewHistory,
  persistReviewHistory,
  planSeal,
  readAllReviewEvents,
  readLedger,
  readWindow,
  rebuildReviewHistory,
  totalReviewCount,
  type ReviewLedger,
  type ReviewWindow,
} from '../reviewHistory'
import type { Grade, ReviewLogEntry } from '../../types'

/*
 * The review history, past the 5,000-entry cap that used to delete it.
 *
 * Every test here is about one property: a learner may study for years, and
 * nothing they did may quietly cease to exist — because once sync is on, an
 * event that vanished locally is an XP total that disagrees between devices and
 * a push queue that never drains.
 *
 * The clock is fixed in every test. Entry timestamps are derived from the
 * event's index, which also makes `reviewEventId` deterministic — the id is a
 * hash of word, time and grade, and two events sharing all three would collapse
 * into one and quietly change the counts these tests assert.
 */

const SCOPE: StorageScope = { kind: 'user', userId: '11111111-2222-3333-4444-555555555555' }
const OTHER: StorageScope = { kind: 'guest', installationId: 'install-abc' }

/** The app's real table, inlined so a change to the economy fails loudly here. */
const xpFor = (grade: Grade): number => (grade === 'again' ? 0 : grade === 'hard' ? 5 : 10)

const GRADES: Grade[] = ['again', 'hard', 'good', 'easy']

/** XP for one cycle of the four grades: 0 + 5 + 10 + 10. */
const XP_PER_CYCLE = 25

function entry(index: number): ReviewLogEntry {
  return {
    wordId: `cc-word-${index}`,
    grade: GRADES[index % GRADES.length],
    at: new Date(Date.UTC(2026, 0, 1) + index * 60_000).toISOString(),
    state: 'review',
    scheduledDays: 1,
    durationMs: 3_000,
  }
}

function entries(count: number): ReviewLogEntry[] {
  return Array.from({ length: count }, (_, i) => entry(i))
}

function expectedXp(count: number): number {
  const whole = Math.floor(count / GRADES.length) * XP_PER_CYCLE
  let rest = 0
  for (let i = count - (count % GRADES.length); i < count; i += 1) rest += xpFor(entry(i).grade)
  return whole + rest
}

/**
 * Studying `total` reviews, persisting every `batch` of them.
 *
 * This is exactly what `AppContext` does: append to the in-memory window, let
 * the save effect seal whatever overflowed, and carry the returned window
 * forward as the new in-memory array.
 */
async function study(
  store: ReturnType<typeof createMemoryStore>,
  total: number,
  batch = 250,
): Promise<{ window: ReviewWindow; ledger: ReviewLedger }> {
  let live: ReviewLogEntry[] = []
  let ledger = EMPTY_LEDGER
  let window: ReviewWindow = { v: 2, startSeq: 0, entries: [] }

  for (let i = 0; i < total; i += 1) {
    live = [...live, entry(i)]
    if (live.length % batch === 0 || i === total - 1) {
      const result = await persistReviewHistory(store, SCOPE, { v: 2, startSeq: window.startSeq, entries: live }, ledger, xpFor)
      window = result.window
      ledger = result.ledger
      live = window.entries
    }
  }
  return { window, ledger }
}

// ─── Past the old cap ────────────────────────────────────────────────────────

test('a learner past 5,000 reviews', async (t) => {
  const store = createMemoryStore()
  const TOTAL = 12_000
  const { window, ledger } = await study(store, TOTAL)

  await t.test('keeps every single event', async () => {
    const all = await readAllReviewEvents(store, SCOPE, window, ledger)
    assert.equal(all.length, TOTAL)
  })

  await t.test('keeps them in order, with nothing duplicated', async () => {
    const all = await readAllReviewEvents(store, SCOPE, window, ledger)
    assert.deepEqual(
      all.map((e) => e.wordId),
      entries(TOTAL).map((e) => e.wordId),
    )
    assert.equal(new Set(all.map(reviewEventId)).size, TOTAL)
  })

  await t.test('derives exactly the right XP', () => {
    assert.equal(derivedReviewXp(window, ledger, xpFor), expectedXp(TOTAL))
  })

  await t.test('counts every review, sealed and not', () => {
    assert.equal(totalReviewCount(window, ledger), TOTAL)
  })

  await t.test('holds only the recent window in memory', () => {
    assert.ok(window.entries.length >= RECENT_WINDOW)
    assert.ok(window.entries.length < RECENT_WINDOW + CHUNK_SIZE)
  })

  await t.test('startup reads the window and the ledger, and no chunk', async () => {
    /* The guarantee behind "does not load tens of thousands of events at
       startup": every archive chunk is removed from the store, and the load
       still returns a correct ledger and window. If load touched a chunk, the
       XP below would fall to the window's own contribution. */
    const stripped = createMemoryStore(store.snapshot())
    for (let i = 0; i < ledger.chunks; i += 1) {
      await stripped.remove(reviewArchiveChunkKey(SCOPE, i))
    }
    const loaded = await loadReviewHistory(stripped, SCOPE)
    assert.equal(loaded.ledger.sealed, ledger.sealed)
    assert.equal(derivedReviewXp(loaded.window, loaded.ledger, xpFor), expectedXp(TOTAL))
  })
})

test('sealing does not disturb sync state', async (t) => {
  const store = createMemoryStore()
  const TOTAL = 8_000
  const { window, ledger } = await study(store, TOTAL)

  await t.test('every event id is still reachable for push', async () => {
    const all = await readAllReviewEvents(store, SCOPE, window, ledger)
    const reachable = new Set(all.map(reviewEventId))
    for (const e of entries(TOTAL)) assert.ok(reachable.has(reviewEventId(e)))
  })

  await t.test('persisting again queues nothing new and changes no total', async () => {
    /* The old cap re-queued truncated events on every pull because they kept
       reappearing as additions. A seal must be a no-op the second time. */
    const again = await persistReviewHistory(store, SCOPE, window, ledger, xpFor)
    assert.deepEqual(again.ledger, ledger)
    assert.deepEqual(again.window.entries, window.entries)
    assert.equal(derivedReviewXp(again.window, again.ledger, xpFor), expectedXp(TOTAL))
  })
})

// ─── Crash safety ────────────────────────────────────────────────────────────

test('a crash mid-seal never moves the XP total', async (t) => {
  const TOTAL = RECENT_WINDOW + CHUNK_SIZE + 40
  const live = entries(TOTAL)
  const plan = planSeal({ v: 2, startSeq: 0, entries: live }, EMPTY_LEDGER, xpFor)
  assert.equal(plan.chunks.length, 1, 'the fixture must actually seal something')

  await t.test('after the chunk, before the ledger', async () => {
    const store = createMemoryStore()
    /* Chunk written; ledger and window are still the pre-seal ones. */
    for (const chunk of plan.chunks) {
      await store.set(reviewArchiveChunkKey(SCOPE, chunk.index), JSON.stringify(chunk.entries))
    }
    await store.set(
      scopedKey(SCOPE, 'reviewLog'),
      JSON.stringify({ v: 2, startSeq: 0, entries: live }),
    )

    const loaded = await loadReviewHistory(store, SCOPE)
    assert.equal(derivedReviewXp(loaded.window, loaded.ledger, xpFor), expectedXp(TOTAL))
    assert.equal(totalReviewCount(loaded.window, loaded.ledger), TOTAL)
  })

  await t.test('after the ledger, before the window', async () => {
    const store = createMemoryStore()
    for (const chunk of plan.chunks) {
      await store.set(reviewArchiveChunkKey(SCOPE, chunk.index), JSON.stringify(chunk.entries))
    }
    await store.set(scopedKey(SCOPE, 'reviewArchive'), JSON.stringify(plan.ledger))
    /* The window write never landed, so it still holds entries the ledger has
       now counted. Sequence numbers, not containers, decide who owns them. */
    await store.set(
      scopedKey(SCOPE, 'reviewLog'),
      JSON.stringify({ v: 2, startSeq: 0, entries: live }),
    )

    const loaded = await loadReviewHistory(store, SCOPE)
    assert.equal(derivedReviewXp(loaded.window, loaded.ledger, xpFor), expectedXp(TOTAL))
    assert.equal(totalReviewCount(loaded.window, loaded.ledger), TOTAL)
  })

  await t.test('and the next persist recovers cleanly either way', async () => {
    const store = createMemoryStore()
    for (const chunk of plan.chunks) {
      await store.set(reviewArchiveChunkKey(SCOPE, chunk.index), JSON.stringify(chunk.entries))
    }
    await store.set(scopedKey(SCOPE, 'reviewArchive'), JSON.stringify(plan.ledger))
    await store.set(
      scopedKey(SCOPE, 'reviewLog'),
      JSON.stringify({ v: 2, startSeq: 0, entries: live }),
    )

    const loaded = await loadReviewHistory(store, SCOPE)
    const fixed = await persistReviewHistory(
      store,
      SCOPE,
      loaded.window,
      loaded.ledger,
      xpFor,
    )
    assert.equal(derivedReviewXp(fixed.window, fixed.ledger, xpFor), expectedXp(TOTAL))
    const all = await readAllReviewEvents(store, SCOPE, fixed.window, fixed.ledger)
    assert.equal(all.length, TOTAL)
  })
})

// ─── Upgrading an existing install ───────────────────────────────────────────

test('the pre-archive shape upgrades without losing anything', async (t) => {
  await t.test('a bare array becomes a window starting at zero', () => {
    const legacy = entries(4_800)
    const window = readWindow(legacy)
    assert.equal(window.startSeq, 0)
    assert.equal(window.entries.length, 4_800)
    assert.equal(derivedReviewXp(window, EMPTY_LEDGER, xpFor), expectedXp(4_800))
  })

  await t.test('an install already at the old 5,000 cap keeps all 5,000', async () => {
    const store = createMemoryStore({
      [scopedKey(SCOPE, 'reviewLog')]: JSON.stringify(entries(5_000)),
    })
    const loaded = await loadReviewHistory(store, SCOPE)
    assert.equal(loaded.ledger, EMPTY_LEDGER)

    const persisted = await persistReviewHistory(
      store,
      SCOPE,
      loaded.window,
      loaded.ledger,
      xpFor,
    )
    const all = await readAllReviewEvents(store, SCOPE, persisted.window, persisted.ledger)
    assert.equal(all.length, 5_000)
    assert.equal(derivedReviewXp(persisted.window, persisted.ledger, xpFor), expectedXp(5_000))
  })

  await t.test('a missing or corrupt ledger reads as "nothing sealed"', () => {
    assert.deepEqual(readLedger(null), EMPTY_LEDGER)
    assert.deepEqual(readLedger('not an object'), EMPTY_LEDGER)
    assert.deepEqual(readLedger({ sealed: 'many' }), EMPTY_LEDGER)
  })
})

// ─── Rebuild, for the restore path ───────────────────────────────────────────

test('rebuilding from a merged history', async (t) => {
  await t.test('rewrites the archive rather than doubling it', async () => {
    const store = createMemoryStore()
    const first = await study(store, 6_000)

    /* A pull hands back everything this device had plus older events from
       another one. Appending would put the overlap in two tiers at once. */
    const merged = entries(6_500)
    const rebuilt = await rebuildReviewHistory(store, SCOPE, merged, first.ledger, xpFor)

    const all = await readAllReviewEvents(store, SCOPE, rebuilt.window, rebuilt.ledger)
    assert.equal(all.length, 6_500)
    assert.equal(new Set(all.map(reviewEventId)).size, 6_500)
    assert.equal(derivedReviewXp(rebuilt.window, rebuilt.ledger, xpFor), expectedXp(6_500))
  })

  await t.test('clears chunks a shorter history no longer reaches', async () => {
    const store = createMemoryStore()
    const first = await study(store, 9_000)
    assert.ok(first.ledger.chunks > 2)

    const rebuilt = await rebuildReviewHistory(store, SCOPE, entries(3_100), first.ledger, xpFor)
    for (let i = rebuilt.ledger.chunks; i < first.ledger.chunks; i += 1) {
      assert.equal(await store.get(reviewArchiveChunkKey(SCOPE, i)), null)
    }
    const all = await readAllReviewEvents(store, SCOPE, rebuilt.window, rebuilt.ledger)
    assert.equal(all.length, 3_100)
  })
})

// ─── Scoping ─────────────────────────────────────────────────────────────────

test('history belongs to one account', async (t) => {
  await t.test('another scope sees none of it', async () => {
    const store = createMemoryStore()
    await study(store, 7_000)
    const loaded = await loadReviewHistory(store, OTHER)
    assert.equal(loaded.window.entries.length, 0)
    assert.equal(loaded.ledger.sealed, 0)
  })

  await t.test('no scope reads nothing and writes nothing', async () => {
    const store = createMemoryStore()
    const result = await persistReviewHistory(store, null, { v: 2, startSeq: 0, entries: entries(9_000) }, EMPTY_LEDGER, xpFor)
    assert.deepEqual(store.snapshot(), {})
    /* The plan is still returned, so the caller's in-memory state stays
       coherent — it simply has not been written anywhere yet. */
    assert.ok(result.window.entries.length > 0)
  })
})
