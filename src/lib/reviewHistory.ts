import type { Grade, ReviewLogEntry } from '../types'
import type { KeyValueStore } from './keyValueStore'
import { reviewArchiveChunkKey, scopedKey, type StorageScope } from './storageKeys'

/*
 * Every graded review, kept for ever, without holding them all in memory.
 *
 * ── What this replaces, and why ──────────────────────────────────────────────
 * `reviewLog` used to be one array under one AsyncStorage key, capped at 5,000
 * entries with `.slice(-5000)` on every graded card. The cap existed for a real
 * reason — that key is re-serialised in full on every grade and re-parsed at
 * every launch, so uncapped it becomes a multi-megabyte blob on a hot path —
 * but it is wrong for sync in three specific ways:
 *
 *  1. It was applied inconsistently. Grading capped; `restoreFromCloud` set the
 *     merged log with no cap at all, so the log silently exceeded 5,000 on pull
 *     and was chopped back by the next graded card.
 *  2. That chop made old events look new again. `changedIntents` diffs the log
 *     by event id, so an entry truncated away and later restored by a pull
 *     appears as an addition and is re-queued for push — for ever.
 *  3. Derived XP undercounted. `mergeXp(local, remote, derived)` exists to make
 *     `review_events` the authority over a bare counter; derived from a
 *     truncated log it is not an authority at all.
 *
 * ── The shape ────────────────────────────────────────────────────────────────
 * Two tiers and a ledger:
 *
 *   window   `reviewLog`             the most recent RECENT_WINDOW events, in
 *                                    memory and in React state, exactly the
 *                                    array every existing consumer already gets
 *   chunks   `reviewArchive:0000…`   sealed blocks of CHUNK_SIZE events,
 *                                    written once and never rewritten
 *   ledger   `reviewArchive`         how many events are sealed, and the XP and
 *                                    counts they carry
 *
 * Sealing is what keeps writes cheap: an archive chunk is immutable, so the
 * per-grade cost stays proportional to the window rather than to a lifetime of
 * study, and startup parses the window and the ledger and nothing else.
 *
 * ── Sequence numbers, and why they are not decoration ────────────────────────
 * AsyncStorage has no transaction. A seal is three writes (chunk, ledger,
 * window) and the app can die between any two of them. Deciding whether an
 * event has been counted by *which container it sits in* is therefore unsafe in
 * both directions — one crash point double-counts its XP, the other loses it.
 *
 * So membership is decided by position instead. Every event has an implicit
 * sequence number: `window.startSeq + index`. `ledger.sealed` is the count of
 * events sealed, which is also the sequence number of the first unsealed one.
 * XP is `ledger.xp` plus the window entries at or past `ledger.sealed`, and
 * that expression is correct whether or not the window still holds copies of
 * events the ledger has already counted.
 *
 * With the write order below — chunk, then ledger, then window — both crash
 * points are safe:
 *
 *   after chunk, before ledger   ledger unchanged, window unchanged; the events
 *                                are still counted in the window, and the next
 *                                seal rewrites an identical chunk
 *   after ledger, before window  window still holds sealed entries, but their
 *                                sequence numbers are below `ledger.sealed` so
 *                                the slice skips them
 *
 * ── What this module deliberately does not know ──────────────────────────────
 * The XP-per-grade table. `xpFor` is injected, for the same reason `pull.ts`
 * takes `derivedXp` from its caller: reading a history should not require
 * depending on the economy.
 */

/** How many recent events stay in memory and in React state. */
export const RECENT_WINDOW = 2_000

/** How many events go into one sealed archive chunk. */
export const CHUNK_SIZE = 1_000

/** The in-memory tail of the history, and where it starts in the sequence. */
export interface ReviewWindow {
  v: 2
  /** Sequence number of `entries[0]`. */
  startSeq: number
  entries: ReviewLogEntry[]
}

/** What the sealed chunks add up to, so nothing has to read them to know. */
export interface ReviewLedger {
  v: 1
  /** Events sealed into chunks — also the sequence number of the first unsealed event. */
  sealed: number
  /** Chunks written. Always `sealed / CHUNK_SIZE`. */
  chunks: number
  /** XP earned by the sealed events. */
  xp: number
  /** Sealed events per grade, for anything that wants the shape of a history it has not read. */
  grades: Record<Grade, number>
}

export const EMPTY_WINDOW: ReviewWindow = { v: 2, startSeq: 0, entries: [] }

export const EMPTY_LEDGER: ReviewLedger = {
  v: 1,
  sealed: 0,
  chunks: 0,
  xp: 0,
  grades: { again: 0, hard: 0, good: 0, easy: 0 },
}

export type XpForGrade = (grade: Grade) => number

// ─── Pure policy ─────────────────────────────────────────────────────────────

/**
 * A stored value read back as a window.
 *
 * Accepts the pre-v2 shape — a bare `ReviewLogEntry[]` — because that is what
 * every existing install has under this key. It becomes a window starting at
 * sequence 0 with nothing sealed, which is exactly true of it: no archive
 * exists yet, so every entry it holds is unsealed and is counted from the
 * window. **No history is dropped and no XP moves** on that upgrade.
 */
export function readWindow(raw: unknown): ReviewWindow {
  if (Array.isArray(raw)) return { v: 2, startSeq: 0, entries: raw as ReviewLogEntry[] }
  if (raw && typeof raw === 'object') {
    const candidate = raw as Partial<ReviewWindow>
    if (Array.isArray(candidate.entries)) {
      return {
        v: 2,
        startSeq: Number.isFinite(candidate.startSeq) ? (candidate.startSeq as number) : 0,
        entries: candidate.entries,
      }
    }
  }
  return EMPTY_WINDOW
}

/** A stored value read back as a ledger, defaulting to "nothing sealed". */
export function readLedger(raw: unknown): ReviewLedger {
  if (!raw || typeof raw !== 'object') return EMPTY_LEDGER
  const candidate = raw as Partial<ReviewLedger>
  if (!Number.isFinite(candidate.sealed) || !Number.isFinite(candidate.chunks)) return EMPTY_LEDGER
  return {
    v: 1,
    sealed: candidate.sealed as number,
    chunks: candidate.chunks as number,
    xp: Number.isFinite(candidate.xp) ? (candidate.xp as number) : 0,
    grades: { ...EMPTY_LEDGER.grades, ...(candidate.grades ?? {}) },
  }
}

/** The window entries the ledger has *not* already counted. */
export function unsealedEntries(window: ReviewWindow, ledger: ReviewLedger): ReviewLogEntry[] {
  const from = Math.max(0, Math.min(ledger.sealed - window.startSeq, window.entries.length))
  return window.entries.slice(from)
}

/**
 * Total XP earned from reviews across the whole history, sealed and not.
 *
 * O(window), and exact regardless of how much has been archived — which is the
 * property that makes `mergeXp`'s `derived` argument an authority again.
 */
export function derivedReviewXp(
  window: ReviewWindow,
  ledger: ReviewLedger,
  xpFor: XpForGrade,
): number {
  let xp = ledger.xp
  for (const entry of unsealedEntries(window, ledger)) xp += xpFor(entry.grade)
  return xp
}

/** Total graded reviews ever recorded. */
export function totalReviewCount(window: ReviewWindow, ledger: ReviewLedger): number {
  return ledger.sealed + unsealedEntries(window, ledger).length
}

export interface SealPlan {
  /** Chunks to write, oldest first. Empty when nothing needs sealing. */
  chunks: { index: number; entries: ReviewLogEntry[] }[]
  ledger: ReviewLedger
  window: ReviewWindow
}

/**
 * What to write to bring a window back within `RECENT_WINDOW`.
 *
 * Pure, so the decision is testable without a store. Only whole chunks are
 * sealed: a partial chunk would have to be rewritten when it filled, and an
 * archive whose newest block is mutable is one power cut away from a hole.
 */
export function planSeal(window: ReviewWindow, ledger: ReviewLedger, xpFor: XpForGrade): SealPlan {
  const pending = unsealedEntries(window, ledger)
  const overflow = pending.length - RECENT_WINDOW
  const sealCount = overflow >= CHUNK_SIZE ? Math.floor(overflow / CHUNK_SIZE) * CHUNK_SIZE : 0

  if (sealCount === 0) {
    /* Still normalise the window: after a restore it may carry entries the
       ledger has already counted, and leaving them in place would mean paying
       for them in every future slice. */
    return {
      chunks: [],
      ledger,
      window:
        pending.length === window.entries.length
          ? window
          : { v: 2, startSeq: ledger.sealed, entries: pending },
    }
  }

  const chunks: SealPlan['chunks'] = []
  const grades: Record<Grade, number> = { ...ledger.grades }
  let xp = ledger.xp

  for (let offset = 0; offset < sealCount; offset += CHUNK_SIZE) {
    const entries = pending.slice(offset, offset + CHUNK_SIZE)
    for (const entry of entries) {
      xp += xpFor(entry.grade)
      grades[entry.grade] += 1
    }
    chunks.push({ index: (ledger.sealed + offset) / CHUNK_SIZE, entries })
  }

  const sealed = ledger.sealed + sealCount
  return {
    chunks,
    ledger: { v: 1, sealed, chunks: sealed / CHUNK_SIZE, xp, grades },
    window: { v: 2, startSeq: sealed, entries: pending.slice(sealCount) },
  }
}

/**
 * A whole history rebuilt from scratch, as chunks plus a window plus a ledger.
 *
 * Used by the restore path: a pull merges remote events into local ones, and
 * the result can contain events older than anything this device had sealed.
 * Appending that to an existing archive would duplicate entries across the two
 * tiers, so the archive is rewritten instead. It is a sign-in-time operation,
 * which is the only reason walking the whole history here is acceptable.
 */
export function planRebuild(entries: ReviewLogEntry[], xpFor: XpForGrade): SealPlan {
  return planSeal({ v: 2, startSeq: 0, entries }, EMPTY_LEDGER, xpFor)
}

// ─── Storage ─────────────────────────────────────────────────────────────────

/*
 * Written against `KeyValueStore` and an explicit scope rather than against
 * `storage.ts`'s ambient one, for the same reason `storageMigration.ts` is:
 * this is code that decides what happens to a learner's history, and the
 * difference between believing it survives a crash and knowing is being able to
 * run every path in plain Node.
 *
 * A null scope is the honest "we do not yet know whose history this is" state
 * that `loadStored` already has, and produces the same answer: read nothing,
 * write nothing.
 */

const LEDGER_KEY = 'reviewArchive' as const
const WINDOW_KEY = 'reviewLog' as const

async function readJson(store: KeyValueStore, key: string): Promise<unknown> {
  try {
    const raw = await store.get(key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

/** The window and the ledger — everything startup needs, and no chunk at all. */
export async function loadReviewHistory(
  store: KeyValueStore,
  scope: StorageScope | null,
): Promise<{ window: ReviewWindow; ledger: ReviewLedger }> {
  if (!scope) return { window: EMPTY_WINDOW, ledger: EMPTY_LEDGER }
  const [rawWindow, rawLedger] = await Promise.all([
    readJson(store, scopedKey(scope, WINDOW_KEY)),
    readJson(store, scopedKey(scope, LEDGER_KEY)),
  ])
  return { window: readWindow(rawWindow), ledger: readLedger(rawLedger) }
}

/**
 * Applies a plan, in the one order that survives a crash between any two writes.
 *
 * Chunks first (content before the claim that it exists), then the ledger, then
 * the trimmed window. See the note at the top of this file for what each crash
 * point leaves behind and why both are safe.
 */
async function commit(
  store: KeyValueStore,
  scope: StorageScope,
  plan: SealPlan,
): Promise<void> {
  for (const chunk of plan.chunks) {
    await store.set(reviewArchiveChunkKey(scope, chunk.index), JSON.stringify(chunk.entries))
  }
  if (plan.chunks.length > 0) {
    await store.set(scopedKey(scope, LEDGER_KEY), JSON.stringify(plan.ledger))
  }
  await store.set(scopedKey(scope, WINDOW_KEY), JSON.stringify(plan.window))
}

/**
 * Persists the current log, sealing whatever has overflowed the window.
 *
 * Returns the window to keep in memory. The caller sets state from it, which is
 * one extra render on the rare grade that crosses a chunk boundary and none on
 * any other.
 */
export async function persistReviewHistory(
  store: KeyValueStore,
  scope: StorageScope | null,
  window: ReviewWindow,
  ledger: ReviewLedger,
  xpFor: XpForGrade,
): Promise<{ window: ReviewWindow; ledger: ReviewLedger }> {
  /* Takes the whole window, `startSeq` included, and never assumes it equals
     `ledger.sealed`. Those two disagree after a crash between the ledger write
     and the window write — the exact case the write order exists to survive —
     and assuming they match there counts the sealed entries a second time. */
  const plan = planSeal(window, ledger, xpFor)
  if (scope) await commit(store, scope, plan)
  return { window: plan.window, ledger: plan.ledger }
}

/**
 * Rewrites the whole archive from one merged history. See `planRebuild`.
 *
 * Chunks the new history no longer reaches are cleared, so a rebuild that
 * shrinks the archive cannot leave an orphan block that a later, longer history
 * would read back as its own.
 */
export async function rebuildReviewHistory(
  store: KeyValueStore,
  scope: StorageScope | null,
  entries: ReviewLogEntry[],
  previous: ReviewLedger,
  xpFor: XpForGrade,
): Promise<{ window: ReviewWindow; ledger: ReviewLedger }> {
  const plan = planRebuild(entries, xpFor)
  if (!scope) return { window: plan.window, ledger: plan.ledger }

  for (const chunk of plan.chunks) {
    await store.set(reviewArchiveChunkKey(scope, chunk.index), JSON.stringify(chunk.entries))
  }
  await store.set(scopedKey(scope, LEDGER_KEY), JSON.stringify(plan.ledger))
  await store.set(scopedKey(scope, WINDOW_KEY), JSON.stringify(plan.window))

  for (let index = plan.ledger.chunks; index < previous.chunks; index += 1) {
    await store.remove(reviewArchiveChunkKey(scope, index))
  }
  return { window: plan.window, ledger: plan.ledger }
}

/**
 * Every event ever recorded, sealed and unsealed, oldest first.
 *
 * Deliberately not called at startup — this is for the paths that genuinely
 * need the whole history: merging a pull, backfilling a push, and any future
 * FSRS parameter optimisation.
 */
export async function readAllReviewEvents(
  store: KeyValueStore,
  scope: StorageScope | null,
  window: ReviewWindow,
  ledger: ReviewLedger,
): Promise<ReviewLogEntry[]> {
  const all: ReviewLogEntry[] = []
  if (scope) {
    for (let index = 0; index < ledger.chunks; index += 1) {
      const parsed = await readJson(store, reviewArchiveChunkKey(scope, index))
      if (Array.isArray(parsed)) all.push(...(parsed as ReviewLogEntry[]))
    }
  }
  all.push(...unsealedEntries(window, ledger))
  return all
}
