import type { DailyProgress, ReviewLogEntry, SrsCard, VocabWord } from '../../types'
import { reviewEventId } from './mappers'
import type { OutboxIntent } from './outbox'

type CompletionKind = 'lesson' | 'challenge' | 'building'

/*
 * Working out what changed, so the outbox can be filled from one place.
 *
 * ── Why a diff rather than instrumenting every mutation ──────────────────────
 * The obvious approach is an `enqueue(...)` call beside each of the twenty-odd
 * places `AppContext` mutates account state. That is twenty chances to forget
 * one — and a forgotten call is invisible: the app works perfectly, and one
 * kind of progress silently never reaches the server. The bug would surface
 * months later as "my story progress doesn't sync", on somebody's second phone.
 *
 * Comparing snapshots instead means the queue is a function of the state, not
 * of anybody remembering. It costs one pass over the changed collections at the
 * moment a collection changes, which is a few hundred microseconds on a deck of
 * a few thousand, and it happens after the UI has already updated.
 */

export interface SyncSnapshot {
  deck: SrsCard[]
  reviewLog: ReviewLogEntry[]
  customWords: VocabWord[]
  dailyProgress: DailyProgress[]
  storyProgress: Record<string, number>
  completedLessonIds: string[]
  claimedChallengeIds: string[]
  unlockedBuildingIds: string[]
  xp: number
  streak: number
  onboardingComplete: boolean
  /** The account half of settings, already narrowed. */
  preferences: unknown
}

function byId<T>(items: T[], id: (item: T) => string): Map<string, string> {
  const map = new Map<string, string>()
  for (const item of items) map.set(id(item), JSON.stringify(item))
  return map
}

/** Ids whose serialised value differs, or which are new. Deletions are ignored. */
function changedIds(before: Map<string, string>, after: Map<string, string>): string[] {
  const out: string[] = []
  for (const [id, value] of after) {
    if (before.get(id) !== value) out.push(id)
  }
  return out
}

/**
 * The intents implied by moving from one snapshot to the next.
 *
 * **Additive only.** A card, word or completion that disappears produces
 * nothing: this app does not delete progress, so a disappearance means a
 * quarantine or an account switch, and neither is something to tell the server
 * about. A sync layer that can infer deletions from absence is one bad hydrate
 * away from clearing somebody's deck.
 */
export function changedIntents(before: SyncSnapshot, after: SyncSnapshot): OutboxIntent[] {
  const intents: OutboxIntent[] = []

  for (const wordId of changedIds(
    byId(before.deck, (c) => c.wordId),
    byId(after.deck, (c) => c.wordId),
  )) {
    intents.push({ kind: 'card', wordId })
  }

  const beforeReviews = new Set(before.reviewLog.map(reviewEventId))
  for (const entry of after.reviewLog) {
    const id = reviewEventId(entry)
    if (!beforeReviews.has(id)) intents.push({ kind: 'review', eventId: id })
  }

  for (const wordId of changedIds(
    byId(before.customWords, (w) => w.id),
    byId(after.customWords, (w) => w.id),
  )) {
    intents.push({ kind: 'customWord', wordId })
  }

  for (const date of changedIds(
    byId(before.dailyProgress, (d) => d.date),
    byId(after.dailyProgress, (d) => d.date),
  )) {
    intents.push({ kind: 'daily', date })
  }

  for (const [storyId, page] of Object.entries(after.storyProgress)) {
    if (before.storyProgress[storyId] !== page) intents.push({ kind: 'story', storyId })
  }

  const completions: [CompletionKind, string[], string[]][] = [
    ['lesson', before.completedLessonIds, after.completedLessonIds],
    ['challenge', before.claimedChallengeIds, after.claimedChallengeIds],
    ['building', before.unlockedBuildingIds, after.unlockedBuildingIds],
  ]
  for (const [completionKind, was, now] of completions) {
    const seen = new Set(was)
    for (const itemId of now) {
      if (!seen.has(itemId)) intents.push({ kind: 'completion', completionKind, itemId })
    }
  }

  if (
    before.xp !== after.xp ||
    before.streak !== after.streak ||
    before.onboardingComplete !== after.onboardingComplete
  ) {
    intents.push({ kind: 'state' })
  }

  if (JSON.stringify(before.preferences) !== JSON.stringify(after.preferences)) {
    intents.push({ kind: 'preferences' })
  }

  return intents
}
