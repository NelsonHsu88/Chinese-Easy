import type { DailyProgress, ReviewLogEntry, SrsCard, VocabWord } from '../../types'
import { reviewEventId } from './mappers'
import type { AccountSettings } from './mappers'

/*
 * Merging two devices' versions of the same account.
 *
 * Pure functions, one rule per data type, because a single rule is wrong
 * somewhere for every choice of rule. "Remote always wins" throws away the
 * session you just did on the plane; "local always wins" throws away the one
 * you did on the tablet.
 *
 * Nothing here is called yet — Stage 5 pulls, it does not merge two live
 * devices. These exist now so the rules can be argued about and tested while
 * they are cheap to change.
 */

// ─── SRS cards ───────────────────────────────────────────────────────────────

/**
 * Newest `last_review` wins; a tie is broken by whichever card has seen more
 * repetitions.
 *
 * ── Why not `updated_at` ─────────────────────────────────────────────────────
 * Wall-clock arrival time says which device synced last, not which device knows
 * more about the card — and device clocks disagree, sometimes deliberately
 * (this app ships a developer clock override). `last_review` is a fact about
 * the learner's study, recorded at the moment it happened, and the card that
 * saw the most recent review is by definition the one carrying the correct
 * schedule.
 *
 * A card present on only one side is taken as-is: an absent card is not
 * evidence of a deletion, and this app has no way to delete one anyway.
 */
export function mergeCards(local: SrsCard[], remote: SrsCard[]): SrsCard[] {
  const merged = new Map<string, SrsCard>()
  for (const card of local) merged.set(card.wordId, card)
  for (const card of remote) {
    const mine = merged.get(card.wordId)
    merged.set(card.wordId, mine ? pickCard(mine, card) : card)
  }
  return [...merged.values()]
}

function pickCard(a: SrsCard, b: SrsCard): SrsCard {
  const aAt = a.last_review ? Date.parse(a.last_review) : Number.NEGATIVE_INFINITY
  const bAt = b.last_review ? Date.parse(b.last_review) : Number.NEGATIVE_INFINITY
  if (aAt !== bAt) return aAt > bAt ? a : b
  if (a.reps !== b.reps) return a.reps > b.reps ? a : b
  /* Genuinely indistinguishable — keep the local one so a merge that changes
     nothing does not churn the deck. */
  return a
}

// ─── Review history ──────────────────────────────────────────────────────────

/**
 * Union by derived id, newest last.
 *
 * Every entry is a fact that happened; none supersedes another. Because the id
 * comes from the content (`reviewEventId`), running the same merge twice is
 * indistinguishable from running it once — which is what stops a retried sync
 * inventing reviews the learner never did.
 */
export function mergeReviewEvents(
  local: ReviewLogEntry[],
  remote: ReviewLogEntry[],
): ReviewLogEntry[] {
  const byId = new Map<string, ReviewLogEntry>()
  for (const entry of [...local, ...remote]) byId.set(reviewEventId(entry), entry)
  return [...byId.values()].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
}

// ─── Monotonic progress ──────────────────────────────────────────────────────

/** Union of ids. Done beats not-done; un-completing is not a real operation. */
export function mergeCompletions(local: string[], remote: string[]): string[] {
  return [...new Set([...local, ...remote])]
}

/** Greater page index per story. Reading position only moves forward. */
export function mergeStoryProgress(
  local: Record<string, number>,
  remote: Record<string, number>,
): Record<string, number> {
  const merged: Record<string, number> = { ...local }
  for (const [storyId, page] of Object.entries(remote)) {
    merged[storyId] = Math.max(merged[storyId] ?? 0, page)
  }
  return merged
}

/**
 * Per-date, the higher of each counter.
 *
 * `max` under-counts a day studied on two devices; `sum` double-counts a day
 * synced twice. Under-counting a heatmap square is cosmetic, and idempotent —
 * double-counting is neither. The exact answer is a re-derivation from
 * `review_events`, which becomes available once the review log is uncapped.
 */
export function mergeDailyActivity(
  local: DailyProgress[],
  remote: DailyProgress[],
): DailyProgress[] {
  const byDate = new Map<string, DailyProgress>()
  for (const day of local) byDate.set(day.date, day)
  for (const day of remote) {
    const mine = byDate.get(day.date)
    byDate.set(
      day.date,
      mine
        ? {
            date: day.date,
            wordsLearned: Math.max(mine.wordsLearned, day.wordsLearned),
            reviewsCompleted: Math.max(mine.reviewsCompleted, day.reviewsCompleted),
          }
        : day,
    )
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

// ─── Counters ────────────────────────────────────────────────────────────────

/**
 * XP: the largest of the local total, the remote total, and the total derived
 * from the merged event history.
 *
 * ── The honest trade ─────────────────────────────────────────────────────────
 * Deriving from events is the correct rule and the one the architecture report
 * argues for, because a counter cannot be reconciled: two devices each earning
 * 40 XP can only merge to 40 or 80, and both are wrong. But the review log is
 * capped at 5,000 entries locally, so a long-standing learner's derived total
 * is an *underestimate* of what they actually earned.
 *
 * Taking the maximum of the three keeps the derivation as a floor without ever
 * reducing somebody's balance. It under-counts concurrent earning on two
 * devices, which is invisible; it never over-counts, which would be
 * exploitable, and it never regresses, which would be noticed immediately.
 *
 * This is a stopgap and is written down as one. The real fix is uncapping the
 * event history so the derivation is complete — one of the two stated blockers
 * before multi-device sync is enabled.
 */
export function mergeXp(local: number, remote: number, derived: number): number {
  return Math.max(local, remote, derived)
}

/**
 * Streak: recomputed from the merged activity, never taken from either side.
 *
 * A streak is a *consequence* of which days were studied, so merging the
 * consequence rather than the cause is how a learner ends up with a 30-day
 * streak and 3 days of activity to show for it.
 */
export function deriveStreak(days: DailyProgress[], today: string): number {
  const active = new Set(
    days.filter((d) => d.reviewsCompleted > 0 || d.wordsLearned > 0).map((d) => d.date),
  )
  if (active.size === 0) return 0

  /* Today not yet studied is not a broken streak — it is a day still in
     progress — so counting starts from yesterday in that case. */
  const cursor = new Date(`${today}T00:00:00.000Z`)
  if (!active.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1)

  let streak = 0
  for (;;) {
    const iso = cursor.toISOString().slice(0, 10)
    if (!active.has(iso)) break
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}

// ─── Last-write-wins data ────────────────────────────────────────────────────

/**
 * Preferences: newest `updated_at` wins, as a whole group.
 *
 * Genuinely last-write-wins data — there is no merging "prefers traditional"
 * with "prefers simplified". Grouped rather than per-field because the app
 * writes them as one blob and has no per-field timestamps to offer; a fresh
 * device passes `null` for its own timestamp so the remote copy wins, which is
 * exactly what restoring an account should do.
 */
export function mergePreferences(
  local: AccountSettings,
  remote: AccountSettings | null,
  localUpdatedAt: string | null,
  remoteUpdatedAt: string | null,
): AccountSettings {
  if (!remote) return local
  const localAt = localUpdatedAt ? Date.parse(localUpdatedAt) : Number.NEGATIVE_INFINITY
  const remoteAt = remoteUpdatedAt ? Date.parse(remoteUpdatedAt) : Number.NEGATIVE_INFINITY
  return remoteAt > localAt ? remote : local
}

/**
 * Custom words: newest wins, and a tombstone beats a live copy of the same age
 * or older.
 *
 * Without the tombstone rule a word deleted on one device is resurrected by the
 * other's stale copy on the next sync — the classic distributed-delete bug, and
 * a particularly annoying one when the thing coming back is a word the learner
 * decided they did not want.
 */
export function mergeCustomWords(
  local: VocabWord[],
  remote: VocabWord[],
  deletedRemotely: ReadonlySet<string> = new Set(),
): VocabWord[] {
  const byId = new Map<string, VocabWord>()
  for (const word of local) byId.set(word.id, word)
  for (const word of remote) if (!byId.has(word.id)) byId.set(word.id, word)
  for (const id of deletedRemotely) byId.delete(id)
  return [...byId.values()]
}

/**
 * Onboarding: the earliest completion wins.
 *
 * It records a one-time historical fact — when this learner was placed — not a
 * current value, so the earlier answer is the true one and a second device
 * re-running the test must not overwrite it.
 */
export function mergePlacement(
  local: { estimatedHsk: number; completedAt: string } | undefined,
  remote: { estimatedHsk: number; completedAt: string } | undefined,
): { estimatedHsk: number; completedAt: string } | undefined {
  if (!local) return remote
  if (!remote) return local
  return Date.parse(local.completedAt) <= Date.parse(remote.completedAt) ? local : remote
}
