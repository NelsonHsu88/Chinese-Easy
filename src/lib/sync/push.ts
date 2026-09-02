import {
  cardToRow,
  completionsToRows,
  customWordToRow,
  dailyToRows,
  preferencesToRow,
  reviewEventId,
  reviewToRow,
  storyProgressToRows,
} from './mappers'
import { pending, remove, type OutboxEntry } from './outbox'
import type { LocalAccountState } from './pull'
import type { AppSettings, DailyProgress, ReviewLogEntry, SrsCard, VocabWord } from '../../types'

/*
 * Sending the outbox to Supabase.
 *
 * Gated by `FEATURES.cloudSync`, which is off. Nothing here runs today.
 *
 * ── The shape of a safe push ─────────────────────────────────────────────────
 * Each entry resolves to a row built from *current* local state, then goes up
 * as an upsert keyed on the same natural identity the outbox used. Two
 * properties follow, and both matter more than throughput:
 *
 *  - **Retrying is free.** A request that timed out may or may not have landed;
 *    sending it again produces the same row either way.
 *  - **Only what succeeded is forgotten.** Entries are removed from the queue
 *    per batch, after the server has acknowledged that batch. A failure leaves
 *    them queued, so the work survives the app being killed.
 *
 * There is deliberately **no delete** in this module. Nothing the app does
 * removes a card, and a sync layer that can delete rows is one bug away from
 * removing somebody's deck.
 */

export interface SyncWriteClient {
  from(table: string): {
    upsert(
      rows: unknown[],
      options?: { onConflict?: string; ignoreDuplicates?: boolean },
    ): PromiseLike<{ error: unknown }>
  }
}

/** Everything a push needs to resolve intents into rows. */
export interface PushSource extends LocalAccountState {
  fullSettings: AppSettings
  onboardingComplete: boolean
  placement?: { estimatedHsk: number; completedAt: string }
  lastActiveDate: string | null
}

export interface PushResult {
  /** Entries acknowledged by the server, now safe to forget. */
  drained: string[]
  /** Tables that failed. Their entries stay queued. */
  failed: string[]
}

/** How many rows go up in one request. */
export const PUSH_BATCH = 200

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * Drains the queue, one table at a time.
 *
 * Tables are independent: a failure writing story progress does not hold up the
 * deck, and the entries for the failed table simply stay queued. Grouping by
 * table is also what keeps this to a handful of requests rather than one per
 * card.
 */
export async function pushOutbox(
  client: SyncWriteClient,
  userId: string,
  queue: OutboxEntry[],
  source: PushSource,
  now: string,
): Promise<PushResult> {
  const entries = pending(queue)
  const drained: string[] = []
  const failed: string[] = []

  const cardsById = new Map(source.deck.map((card) => [card.wordId, card]))
  const reviewsById = new Map(source.reviewLog.map((entry) => [reviewEventId(entry), entry]))
  const customById = new Map(source.customWords.map((word) => [word.id, word]))
  const dailyByDate = new Map(source.dailyProgress.map((day) => [day.date, day]))

  async function send(
    table: string,
    rows: unknown[],
    keys: string[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ) {
    if (rows.length === 0) return
    for (const batch of chunk(rows, PUSH_BATCH)) {
      const { error } = await client.from(table).upsert(batch, options)
      if (error) {
        failed.push(table)
        return
      }
    }
    drained.push(...keys)
  }

  // --- cards ------------------------------------------------------------------
  const cardEntries = entries.filter((e) => e.intent.kind === 'card')
  const cardRows: unknown[] = []
  const cardKeys: string[] = []
  for (const entry of cardEntries) {
    const card = entry.intent.kind === 'card' ? cardsById.get(entry.intent.wordId) : undefined
    /* A queued card that is no longer in the deck has been quarantined (its
       word id stopped resolving). Drop the intent rather than the card: there is
       nothing to send, and leaving it queued would retry forever. */
    if (!card) {
      drained.push(entry.key)
      continue
    }
    cardRows.push(cardToRow(card, userId))
    cardKeys.push(entry.key)
  }
  await send('srs_cards', cardRows, cardKeys, { onConflict: 'user_id,word_id' })

  // --- review events ----------------------------------------------------------
  const reviewEntries = entries.filter((e) => e.intent.kind === 'review')
  const reviewRows: unknown[] = []
  const reviewKeys: string[] = []
  for (const entry of reviewEntries) {
    const found = entry.intent.kind === 'review' ? reviewsById.get(entry.intent.eventId) : undefined
    if (!found) {
      /* Aged out of the local log's 5,000-entry cap before it could be sent.
         The row it would have written is history nobody can reconstruct, but
         retrying cannot conjure it back either. */
      drained.push(entry.key)
      continue
    }
    reviewRows.push(reviewToRow(found, userId))
    reviewKeys.push(entry.key)
  }
  /* `ignoreDuplicates` is the idempotency: a replayed event is already there. */
  await send('review_events', reviewRows, reviewKeys, {
    onConflict: 'id',
    ignoreDuplicates: true,
  })

  // --- custom words -----------------------------------------------------------
  const customEntries = entries.filter((e) => e.intent.kind === 'customWord')
  const customRows: unknown[] = []
  const customKeys: string[] = []
  for (const entry of customEntries) {
    const word = entry.intent.kind === 'customWord' ? customById.get(entry.intent.wordId) : undefined
    if (!word) {
      drained.push(entry.key)
      continue
    }
    customRows.push(customWordToRow(word, userId))
    customKeys.push(entry.key)
  }
  await send('custom_words', customRows, customKeys, { onConflict: 'user_id,word_id' })

  // --- story progress ---------------------------------------------------------
  const storyEntries = entries.filter((e) => e.intent.kind === 'story')
  const storyRows = storyProgressToRows(
    Object.fromEntries(
      storyEntries
        .map((e) => (e.intent.kind === 'story' ? e.intent.storyId : ''))
        .filter((id) => id in source.storyProgress)
        .map((id) => [id, source.storyProgress[id]]),
    ),
    userId,
  )
  await send('story_progress', storyRows, storyEntries.map((e) => e.key), {
    onConflict: 'user_id,story_id',
  })

  // --- daily activity ---------------------------------------------------------
  const dailyEntries = entries.filter((e) => e.intent.kind === 'daily')
  const dailyDays: DailyProgress[] = []
  for (const entry of dailyEntries) {
    const day = entry.intent.kind === 'daily' ? dailyByDate.get(entry.intent.date) : undefined
    if (day) dailyDays.push(day)
  }
  await send('daily_activity', dailyToRows(dailyDays, userId), dailyEntries.map((e) => e.key), {
    onConflict: 'user_id,activity_date',
  })

  // --- completions ------------------------------------------------------------
  const completionEntries = entries.filter((e) => e.intent.kind === 'completion')
  const completionRows = completionEntries.flatMap((entry) =>
    entry.intent.kind === 'completion'
      ? completionsToRows(entry.intent.completionKind, [entry.intent.itemId], userId, now)
      : [],
  )
  await send('completions', completionRows, completionEntries.map((e) => e.key), {
    onConflict: 'user_id,kind,item_id',
    ignoreDuplicates: true,
  })

  // --- preferences ------------------------------------------------------------
  const prefEntries = entries.filter((e) => e.intent.kind === 'preferences')
  if (prefEntries.length > 0) {
    await send('user_preferences', [preferencesToRow(source.fullSettings, userId)],
      prefEntries.map((e) => e.key), { onConflict: 'user_id' })
  }

  // --- account state ----------------------------------------------------------
  const stateEntries = entries.filter((e) => e.intent.kind === 'state')
  if (stateEntries.length > 0) {
    await send(
      'user_state',
      [
        {
          user_id: userId,
          xp: source.xp,
          streak: source.streak,
          last_active_date: source.lastActiveDate,
          onboarding_complete: source.onboardingComplete,
          placement_hsk: source.placement?.estimatedHsk ?? null,
          placement_completed_at: source.placement?.completedAt ?? null,
        },
      ],
      stateEntries.map((e) => e.key),
      { onConflict: 'user_id' },
    )
  }

  return { drained, failed: [...new Set(failed)] }
}

/** The queue that remains after a push. */
export function afterPush(queue: OutboxEntry[], result: PushResult): OutboxEntry[] {
  return remove(queue, result.drained)
}

/** Convenience for the callers that build a full push source. */
export type { SrsCard, ReviewLogEntry, VocabWord }
