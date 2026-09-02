import type { KeyValueStore } from './keyValueStore'
import {
  PREFIX,
  accountKeys,
  legacyKey,
  reviewArchiveChunkKey,
  scopeId,
  scopedKey,
  type StorageKey,
  type StorageScope,
} from './storageKeys'
import {
  clearGuestAdoptionIntent,
  readGuestAdoptionIntent,
} from './storageScope'

/*
 * Moving existing progress into a namespace, without ever losing it.
 *
 * Two operations live here and they share one rule: **nothing is deleted, and
 * nothing already present at the destination is overwritten.** Every path
 * either copies into empty space or declines. A learner who ends up with two
 * copies of their deck has lost nothing; a learner who ends up with none has
 * lost months.
 *
 * Both are written against `KeyValueStore` rather than AsyncStorage so they can
 * be tested exhaustively in plain Node — which, for the only code in the app
 * that can destroy a deck, is the difference between believing it works and
 * knowing.
 */

/** Device-level marker. Its presence means the legacy sweep has run, once, ever. */
const MIGRATION_MARKER_KEY = `${PREFIX}legacyMigration`
const MIGRATION_VERSION = 1

export interface MigrationMarker {
  version: number
  /** The scope that took ownership, or null when there was nothing to take. */
  adoptedBy: string | null
  reason: 'migrated' | 'nothing-to-migrate' | 'target-not-empty'
  at: string
  keys: StorageKey[]
}

export type MigrationOutcome =
  | { status: 'already-done'; marker: MigrationMarker }
  | { status: 'nothing-to-migrate' }
  | { status: 'target-not-empty' }
  | { status: 'migrated'; keys: StorageKey[] }
  | { status: 'failed'; reason: string }

/** Whether a scope holds any account data at all. */
export async function hasAccountData(
  store: KeyValueStore,
  scope: StorageScope,
): Promise<boolean> {
  for (const key of accountKeys()) {
    if ((await store.get(scopedKey(scope, key))) !== null) return true
  }
  return false
}

/**
 * Copies a set of account keys from one place to another, then proves it.
 *
 * Verification is a raw string comparison of what was written against what
 * reads back, which is stronger than trusting `set` to have resolved. Returns
 * the keys copied, or throws with the first key that failed to verify — the
 * caller then declines to mark anything complete, and the source is still
 * exactly where it was.
 */
async function copyVerified(
  store: KeyValueStore,
  from: (key: StorageKey) => string,
  to: (key: StorageKey) => string,
): Promise<StorageKey[]> {
  const copied: StorageKey[] = []
  for (const key of accountKeys()) {
    const value = await store.get(from(key))
    if (value === null) continue
    await store.set(to(key), value)
    const readBack = await store.get(to(key))
    if (readBack !== value) {
      throw new Error(`verification failed for "${key}"`)
    }
    copied.push(key)
  }
  return copied
}

/**
 * Copies the sealed review-history chunks alongside the account keys.
 *
 * The archive is the one value stored across a variable number of keys, so
 * `accountKeys()` — a fixed list — cannot reach it. `copyVerified` moves the
 * ledger at `reviewArchive`; this moves the blocks the ledger counts.
 *
 * **Driven by the ledger already copied to the destination**, not by a scan.
 * A scan would depend on the store being enumerable (`KeyValueStore` is
 * deliberately three methods and is not), and the ledger is the authority on
 * how many chunks exist anyway — a block past `chunks` is not part of the
 * history, so failing to copy one loses nothing.
 *
 * Verified the same way as everything else here, and equally non-destructive:
 * the source chunks stay exactly where they are.
 */
async function copyArchiveChunks(
  store: KeyValueStore,
  fromScope: StorageScope,
  toScope: StorageScope,
): Promise<number> {
  const raw = await store.get(scopedKey(toScope, 'reviewArchive'))
  if (raw === null) return 0

  let chunks = 0
  try {
    const parsed = JSON.parse(raw) as { chunks?: unknown }
    chunks = Number.isFinite(parsed.chunks) ? (parsed.chunks as number) : 0
  } catch {
    /* An unreadable ledger means an archive nothing can account for. Copying
       blocks it cannot vouch for would be guessing; the window still carries
       the recent history and no source data is touched. */
    return 0
  }

  for (let index = 0; index < chunks; index += 1) {
    const value = await store.get(reviewArchiveChunkKey(fromScope, index))
    if (value === null) continue
    await store.set(reviewArchiveChunkKey(toScope, index), value)
    if ((await store.get(reviewArchiveChunkKey(toScope, index))) !== value) {
      throw new Error(`verification failed for "reviewArchive:${index}"`)
    }
  }
  return chunks
}

/**
 * The one-time sweep of pre-scoping keys into the active scope.
 *
 * ── Idempotency ──────────────────────────────────────────────────────────────
 * Guarded by a marker, and *also* idempotent without one: every account value
 * is a whole-value copy rather than an accumulation, so running the sweep twice
 * writes the same bytes twice. XP cannot double, the deck cannot gain entries,
 * and no FSRS field is recomputed — this code never parses a deck, it moves an
 * opaque string.
 *
 * ── The legacy keys are not deleted ──────────────────────────────────────────
 * Not on success, not ever, by this function. They are the only copy until the
 * destination is verified, and keeping them afterwards costs a few hundred
 * kilobytes against the possibility of needing to recover. A later release can
 * remove them deliberately, once real installs have been seen to be fine.
 */
export async function migrateLegacyKeys(
  store: KeyValueStore,
  scope: StorageScope,
): Promise<MigrationOutcome> {
  const existingMarker = await readMarker(store)
  if (existingMarker) return { status: 'already-done', marker: existingMarker }

  const present: StorageKey[] = []
  for (const key of accountKeys()) {
    if ((await store.get(legacyKey(key))) !== null) present.push(key)
  }

  if (present.length === 0) {
    await writeMarker(store, { adoptedBy: null, reason: 'nothing-to-migrate', keys: [] })
    return { status: 'nothing-to-migrate' }
  }

  /* Refuse rather than merge. Scoped data already existing here means somebody
     has been using this namespace, and legacy data is not evidence about who. */
  if (await hasAccountData(store, scope)) {
    await writeMarker(store, { adoptedBy: null, reason: 'target-not-empty', keys: [] })
    return { status: 'target-not-empty' }
  }

  try {
    const copied = await copyVerified(store, legacyKey, (key) => scopedKey(scope, key))
    await writeMarker(store, { adoptedBy: scopeId(scope), reason: 'migrated', keys: copied })
    return { status: 'migrated', keys: copied }
  } catch (error) {
    /* No marker is written, so the next launch tries again — and the legacy
       keys are untouched, so there is something to try again with. */
    return { status: 'failed', reason: error instanceof Error ? error.message : 'unknown' }
  }
}

async function readMarker(store: KeyValueStore): Promise<MigrationMarker | null> {
  const raw = await store.get(MIGRATION_MARKER_KEY)
  if (!raw) return null
  try {
    const marker = JSON.parse(raw) as MigrationMarker
    return marker?.version === MIGRATION_VERSION ? marker : null
  } catch {
    return null
  }
}

async function writeMarker(
  store: KeyValueStore,
  fields: Omit<MigrationMarker, 'version' | 'at'>,
): Promise<void> {
  const marker: MigrationMarker = {
    version: MIGRATION_VERSION,
    at: new Date().toISOString(),
    ...fields,
  }
  await store.set(MIGRATION_MARKER_KEY, JSON.stringify(marker))
}

export type AdoptionOutcome =
  | { status: 'no-intent' }
  | { status: 'not-this-account' }
  | { status: 'target-not-empty' }
  | { status: 'nothing-to-adopt' }
  | { status: 'adopted'; keys: StorageKey[] }
  | { status: 'failed'; reason: string }

/**
 * Moves guest progress into a newly created account, when that is provably safe.
 *
 * ── The case this must not get wrong ─────────────────────────────────────────
 *     guest has progress
 *       -> a friend signs into their own existing account on this phone
 *       -> the friend must NOT receive the guest's vocabulary
 *
 * Three conditions all have to hold, and any one of them failing declines:
 *
 *  1. **An adoption intent exists**, written only by account *creation* on this
 *     installation. Signing in never writes one.
 *  2. **The intent's email matches the session's.** Creation and first sign-in
 *     are separate events when email confirmation is on, so the two halves are
 *     tied together by address rather than by adjacency in time.
 *  3. **The destination holds no account data.** Belt and braces on top of the
 *     first two.
 *
 * The guest namespace is never deleted, so declining costs nothing and a wrong
 * decision here is recoverable.
 */
export async function maybeAdoptGuestProgress(
  store: KeyValueStore,
  userId: string,
  email: string | null,
  now: number = Date.now(),
): Promise<AdoptionOutcome> {
  const intent = await readGuestAdoptionIntent(store, now)
  if (!intent) return { status: 'no-intent' }

  const sessionEmail = (email ?? '').trim().toLowerCase()
  if (!sessionEmail || sessionEmail !== intent.email) return { status: 'not-this-account' }

  const guestScope: StorageScope = { kind: 'guest', installationId: intent.installationId }
  const userScope: StorageScope = { kind: 'user', userId }

  if (await hasAccountData(store, userScope)) {
    /* The intent is spent either way: this account is established, so it is not
       the new one the intent was written for. */
    await clearGuestAdoptionIntent(store)
    return { status: 'target-not-empty' }
  }

  if (!(await hasAccountData(store, guestScope))) {
    await clearGuestAdoptionIntent(store)
    return { status: 'nothing-to-adopt' }
  }

  try {
    const copied = await copyVerified(
      store,
      (key) => scopedKey(guestScope, key),
      (key) => scopedKey(userScope, key),
    )
    await copyArchiveChunks(store, guestScope, userScope)
    await clearGuestAdoptionIntent(store)
    return { status: 'adopted', keys: copied }
  } catch (error) {
    /* Intent left in place so a transient failure can retry next launch. */
    return { status: 'failed', reason: error instanceof Error ? error.message : 'unknown' }
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Recovering progress stranded in the guest namespace
 *
 * The scoping change created one honest way to lose sight of your work.
 * Upgrading to a scoped build while *signed out* puts pre-existing progress in
 * the guest namespace, which is correct — it is not attributable to any
 * account. Signing in afterwards then opens an empty app. Nothing is lost, but
 * it is only visible signed out, which nobody would guess.
 *
 * Automatic adoption is not available here: an empty local namespace does not
 * prove a new account, and a friend signing into their own established account
 * would inherit the owner's vocabulary. So this is *offered* rather than
 * performed. An offer a stranger declines costs nothing; an automatic merge a
 * stranger cannot decline is the exact failure this system exists to prevent.
 * ──────────────────────────────────────────────────────────────────────────── */

const RECOVERY_DISMISSED_KEY = `${PREFIX}guestRecoveryDismissed`

/** Enough of the stranded progress to describe it honestly in a prompt. */
export interface RecoverableProgress {
  installationId: string
  deckCount: number
  xp: number
  streak: number
}

function countOf(raw: string | null): number {
  if (!raw) return 0
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}

function numberOf(raw: string | null, field?: string): number {
  if (!raw) return 0
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed === 'number') return parsed
    if (field && parsed && typeof parsed === 'object') {
      const value = (parsed as Record<string, unknown>)[field]
      return typeof value === 'number' ? value : 0
    }
    return 0
  } catch {
    return 0
  }
}

async function dismissedFor(store: KeyValueStore): Promise<string[]> {
  const raw = await store.get(RECOVERY_DISMISSED_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

/** Records that this account does not want the offer again. */
export async function dismissGuestRecovery(
  store: KeyValueStore,
  userId: string,
): Promise<void> {
  const dismissed = await dismissedFor(store)
  if (dismissed.includes(userId)) return
  await store.set(RECOVERY_DISMISSED_KEY, JSON.stringify([...dismissed, userId]))
}

/**
 * Stranded guest progress worth offering to the signed-in account, or null.
 *
 * Four conditions, all required:
 *  - the account is signed in and holds no local data of its own
 *  - this installation's guest namespace holds some
 *  - that progress is *meaningful* (a card or some XP — not an empty shell
 *    created by merely opening the app once)
 *  - this account has not already declined
 */
export async function findRecoverableGuestProgress(
  store: KeyValueStore,
  userScope: StorageScope,
  guestInstallationId: string,
): Promise<RecoverableProgress | null> {
  if (userScope.kind !== 'user') return null
  if ((await dismissedFor(store)).includes(userScope.userId)) return null
  if (await hasAccountData(store, userScope)) return null

  const guestScope: StorageScope = { kind: 'guest', installationId: guestInstallationId }
  const deckCount = countOf(await store.get(scopedKey(guestScope, 'deck')))
  const xp = numberOf(await store.get(scopedKey(guestScope, 'xp')))
  const streak = numberOf(await store.get(scopedKey(guestScope, 'streak')), 'streak')

  if (deckCount === 0 && xp === 0) return null
  return { installationId: guestInstallationId, deckCount, xp, streak }
}

/**
 * Performs the offered recovery, after the learner has said yes.
 *
 * Deliberately re-checks that the destination is empty rather than trusting the
 * caller: the offer and the acceptance are separated by however long the
 * learner took to read it, and a sync or a second device could have filled the
 * account in between. Same verified copy as everything else here, and the guest
 * namespace is left untouched.
 */
export async function adoptGuestProgressExplicitly(
  store: KeyValueStore,
  userScope: StorageScope,
  guestInstallationId: string,
): Promise<AdoptionOutcome> {
  if (userScope.kind !== 'user') return { status: 'not-this-account' }
  if (await hasAccountData(store, userScope)) return { status: 'target-not-empty' }

  const guestScope: StorageScope = { kind: 'guest', installationId: guestInstallationId }
  if (!(await hasAccountData(store, guestScope))) return { status: 'nothing-to-adopt' }

  try {
    const copied = await copyVerified(
      store,
      (key) => scopedKey(guestScope, key),
      (key) => scopedKey(userScope, key),
    )
    await copyArchiveChunks(store, guestScope, userScope)
    await dismissGuestRecovery(store, userScope.userId)
    return { status: 'adopted', keys: copied }
  } catch (error) {
    return { status: 'failed', reason: error instanceof Error ? error.message : 'unknown' }
  }
}
