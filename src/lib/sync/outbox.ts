/*
 * The durable queue of things this device still owes the server.
 *
 * ── Intents, not payloads ────────────────────────────────────────────────────
 * An entry names *what changed*, never what it changed to. Twelve gradings of
 * one card during a session collapse into a single `card:cc-學習`, and the push
 * reads that card's current value at the moment it sends. Storing payloads
 * instead would mean a queue that grows with activity rather than with the
 * number of distinct things touched, and — worse — replaying a stale payload
 * over a newer one.
 *
 * The exception proves the rule: a review event is immutable history, so its
 * intent names an id that will resolve to the same row forever.
 *
 * ── Idempotency ──────────────────────────────────────────────────────────────
 * Every entry key is a natural identity, so enqueueing the same change twice
 * leaves one entry, and pushing the same entry twice is an upsert of the same
 * row (or, for reviews, an insert that collides on the primary key and is
 * discarded). Draining is therefore safe to retry after a failure of unknown
 * outcome — which is the only kind of failure a mobile network produces.
 */

export type OutboxIntent =
  | { kind: 'card'; wordId: string }
  | { kind: 'review'; eventId: string }
  | { kind: 'customWord'; wordId: string }
  | { kind: 'story'; storyId: string }
  | { kind: 'daily'; date: string }
  | { kind: 'completion'; completionKind: 'lesson' | 'challenge' | 'building'; itemId: string }
  | { kind: 'preferences' }
  | { kind: 'state' }

export interface OutboxEntry {
  /** Natural identity. Two entries with this key are the same pending change. */
  key: string
  intent: OutboxIntent
  /** When it was first queued — used only to drop the oldest under pressure. */
  at: string
}

/**
 * A cap, so a device that has been offline for a month does not grow one
 * AsyncStorage value without limit.
 *
 * Generous on purpose: 5,000 entries is a great deal of studying, and the
 * failure mode of overflowing is worse than the cost of holding them.
 */
export const OUTBOX_LIMIT = 5000

export function intentKey(intent: OutboxIntent): string {
  switch (intent.kind) {
    case 'card':
      return `card:${intent.wordId}`
    case 'review':
      return `review:${intent.eventId}`
    case 'customWord':
      return `customWord:${intent.wordId}`
    case 'story':
      return `story:${intent.storyId}`
    case 'daily':
      return `daily:${intent.date}`
    case 'completion':
      return `completion:${intent.completionKind}:${intent.itemId}`
    case 'preferences':
      return 'preferences'
    case 'state':
      return 'state'
  }
}

/**
 * Folds new intents into the queue.
 *
 * Coalesces by key, keeping the *earliest* `at` so a card edited continuously
 * for an hour does not keep renewing its place at the back of the queue and
 * starve behind newer work.
 */
export function enqueue(queue: OutboxEntry[], intents: OutboxIntent[], now: string): OutboxEntry[] {
  const byKey = new Map<string, OutboxEntry>()
  for (const entry of queue) byKey.set(entry.key, entry)
  for (const intent of intents) {
    const key = intentKey(intent)
    const existing = byKey.get(key)
    byKey.set(key, { key, intent, at: existing?.at ?? now })
  }
  return trim([...byKey.values()])
}

/**
 * Enforces the cap, dropping the least damaging entries first.
 *
 * A **review is never dropped**: it is the only kind of entry that cannot be
 * reconstructed from current state. Everything else names a thing whose latest
 * value still exists locally, so losing the intent costs a delayed sync rather
 * than lost history — the next change to that thing re-queues it.
 */
export function trim(queue: OutboxEntry[]): OutboxEntry[] {
  if (queue.length <= OUTBOX_LIMIT) return queue
  const reviews = queue.filter((e) => e.intent.kind === 'review')
  const rest = queue.filter((e) => e.intent.kind !== 'review')
  const room = Math.max(0, OUTBOX_LIMIT - reviews.length)
  /* Oldest-first among the droppable, so the most recent activity survives. */
  const keptRest = [...rest].sort((a, b) => a.at.localeCompare(b.at)).slice(rest.length - room)
  return [...reviews, ...keptRest]
}

/** Removes drained entries by key. Unknown keys are ignored. */
export function remove(queue: OutboxEntry[], keys: readonly string[]): OutboxEntry[] {
  const drop = new Set(keys)
  return queue.filter((entry) => !drop.has(entry.key))
}

/** Entries in the order they should be sent — oldest first. */
export function pending(queue: OutboxEntry[]): OutboxEntry[] {
  return [...queue].sort((a, b) => a.at.localeCompare(b.at))
}
