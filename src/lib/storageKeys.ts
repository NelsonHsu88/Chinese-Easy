/*
 * Which persisted values belong to a *person* and which belong to a *handset* —
 * and how each one's storage key is spelled.
 *
 * This file is pure: no AsyncStorage, no React, no module state. That is
 * deliberate, because the classification below is the single most consequential
 * table in the persistence layer and it has to be testable on its own.
 *
 * ── The defect this exists to fix ────────────────────────────────────────────
 * Every key used to be written as `chinese-easy:<key>` with a constant prefix,
 * so two accounts on one handset shared one namespace. Signing out of A and
 * into B left B looking at A's deck, streak, XP and story history. Account data
 * is now scoped by the signed-in user's id (or, signed out, by a random
 * per-installation id), while device data deliberately stays where it was.
 *
 * ── Adding a key ─────────────────────────────────────────────────────────────
 * Add it to `ACCOUNT_KEYS` or `DEVICE_KEYS`. There is no third option and no
 * default: `classifyKey` throws on an unknown key, so a new persisted value
 * cannot reach a release without someone deciding who owns it. Getting that
 * wrong in the *device* direction leaks one learner's work into another's
 * account; getting it wrong in the *account* direction is merely annoying (a
 * tour replays, an ad cap resets). The asymmetry is why the default is a throw
 * rather than a guess.
 */

/** Every key the app persists. The union is the registry — there are no others. */
export type StorageKey =
  // --- account-owned
  | 'settings'
  | 'deck'
  | 'reviewLog'
  | 'reviewArchive'
  | 'customWords'
  | 'dailyProgress'
  | 'streak'
  | 'xp'
  | 'onboarding'
  | 'storyProgress'
  | 'completedLessonIds'
  | 'claimedChallengeIds'
  | 'unlockedBuildingIds'
  | 'newWordHistory'
  | 'newlyAddedWordIds'
  | 'subscription'
  | 'quarantinedCards'
  // --- account-owned machinery (not progress; see ACCOUNT_MACHINERY_KEYS)
  | 'syncOutbox'
  | 'syncCursor'
  // --- device-owned
  | 'tourStep'
  | 'adFrequency'
  | 'devClockOverride'
  | 'recentSearchIds'

/**
 * Data that follows the learner to another phone.
 *
 * Two entries here are worth explaining because they are not obvious:
 *
 * - **`subscription`** is a *cache* of RevenueCat's answer and is never
 *   uploaded anywhere. It is account-scoped all the same, because it is a
 *   statement about one person's entitlement and must not be readable under
 *   another account's session.
 * - **`newlyAddedWordIds`** looks like UI state — it drives the badge dot on
 *   the Dictionary tab — but it holds word ids drawn from a specific learner's
 *   deck. Left on the device it would show one account a badge for words
 *   another account added, so it travels with the deck it describes.
 */
export const ACCOUNT_KEYS: ReadonlySet<StorageKey> = new Set<StorageKey>([
  'settings',
  'deck',
  'reviewLog',
  'reviewArchive',
  'customWords',
  'dailyProgress',
  'streak',
  'xp',
  'onboarding',
  'storyProgress',
  'completedLessonIds',
  'claimedChallengeIds',
  'unlockedBuildingIds',
  'newWordHistory',
  'newlyAddedWordIds',
  'subscription',
  'quarantinedCards',
  'syncOutbox',
  'syncCursor',
])

/**
 * Account keys that are plumbing rather than the learner's work.
 *
 * Scoped per account like everything else — an outbox belongs to whoever queued
 * it — but excluded from `accountKeys()`, which is what migration, guest
 * adoption and `hasAccountData` iterate. Two reasons that matters: a pending
 * outbox is not evidence that an account "has progress" (it would block guest
 * adoption into a genuinely new account), and copying one device's queue into
 * another namespace during migration would replay somebody else's writes.
 */
export const ACCOUNT_MACHINERY_KEYS: ReadonlySet<StorageKey> = new Set<StorageKey>([
  'syncOutbox',
  'syncCursor',
])

/**
 * Data that describes this installation rather than this person.
 *
 * - `tourStep` teaches this app's UI on this screen; a new phone deserves the tour.
 * - `adFrequency` counts impressions shown *here*, and is per-install by design.
 * - `devClockOverride` is a debug affordance that must never follow anyone.
 * - `recentSearchIds` is dictionary history: small, mildly useful across
 *   devices, and also a browsing trail. Kept local by product decision.
 */
export const DEVICE_KEYS: ReadonlySet<StorageKey> = new Set<StorageKey>([
  'tourStep',
  'adFrequency',
  'devClockOverride',
  'recentSearchIds',
])

/** Who owns a key. Throws rather than guessing — see the note at the top. */
export function classifyKey(key: StorageKey): 'account' | 'device' {
  if (ACCOUNT_KEYS.has(key)) return 'account'
  if (DEVICE_KEYS.has(key)) return 'device'
  throw new Error(
    `[storage] "${key}" is not classified. Add it to ACCOUNT_KEYS or DEVICE_KEYS ` +
      'in lib/storageKeys.ts — a persisted value must have an owner.',
  )
}

/**
 * Whose data is being read or written.
 *
 * A signed-out learner is not "no scope": they are a guest with a real,
 * stable namespace of their own, so their progress survives being signed out
 * and cannot be seen by whoever signs in next.
 */
export type StorageScope =
  | { kind: 'user'; userId: string }
  | { kind: 'guest'; installationId: string }

export const PREFIX = 'chinese-easy:'

/** A short, stable string identifying a scope — for logs and migration markers. */
export function scopeId(scope: StorageScope): string {
  return scope.kind === 'user' ? `user:${scope.userId}` : `guest:${scope.installationId}`
}

export function sameScope(a: StorageScope | null, b: StorageScope | null): boolean {
  if (a === null || b === null) return a === b
  return scopeId(a) === scopeId(b)
}

/**
 * The pre-scoping key, still used verbatim by every device key.
 *
 * Device data was never the problem, so it does not move. Leaving it in place
 * means an upgrade does not reset anybody's ad frequency caps or make them sit
 * through the tour again — and it keeps the migration's job down to exactly the
 * account keys, which is the smallest change that fixes the defect.
 */
export function legacyKey(key: StorageKey): string {
  return PREFIX + key
}

/**
 * The full AsyncStorage key for a value in a scope.
 *
 *     account + user   ->  chinese-easy:<userId>:deck
 *     account + guest  ->  chinese-easy:guest:<installationId>:deck
 *     device           ->  chinese-easy:tourStep
 *
 * A user id is a Supabase UUID, which can never be the literal string "guest",
 * so the two account forms cannot collide. A device key has one fewer segment
 * than either, so it cannot collide with them either.
 */
export function scopedKey(scope: StorageScope, key: StorageKey): string {
  if (classifyKey(key) === 'device') return legacyKey(key)
  return scope.kind === 'user'
    ? `${PREFIX}${scope.userId}:${key}`
    : `${PREFIX}guest:${scope.installationId}:${key}`
}

/**
 * Every account key that holds the learner's actual work.
 *
 * Machinery is excluded — see `ACCOUNT_MACHINERY_KEYS`. This is what migration,
 * guest adoption and `hasAccountData` iterate, so anything added here is
 * something that gets copied when an account is adopted.
 */
export function accountKeys(): StorageKey[] {
  return [...ACCOUNT_KEYS].filter((key) => !ACCOUNT_MACHINERY_KEYS.has(key))
}

/**
 * The key for one sealed block of review history.
 *
 *     chinese-easy:<userId>:reviewArchive:0007
 *
 * The archive is the one value the app stores across a *variable* number of
 * keys, so its spelling lives here with all the others rather than being
 * concatenated inside `reviewHistory.ts` — the whole point of this file is that
 * no namespace is ever assembled by hand somewhere else.
 *
 * Zero-padded to four digits so the keys sort lexicographically in the order
 * they were written, which is what makes an AsyncStorage dump readable and a
 * prefix scan return chunks oldest-first.
 */
export function reviewArchiveChunkKey(scope: StorageScope, index: number): string {
  return `${scopedKey(scope, 'reviewArchive')}:${String(index).padStart(4, '0')}`
}
