import AsyncStorage from '@react-native-async-storage/async-storage'
import type { KeyValueStore } from './keyValueStore'
import {
  classifyKey,
  legacyKey,
  PREFIX,
  sameScope,
  scopedKey,
  type StorageKey,
  type StorageScope,
} from './storageKeys'

/*
 * Reading and writing persisted values, in the scope of whoever is signed in.
 *
 * The public shape is unchanged — `loadStored(key, fallback)` and
 * `saveStored(key, value)` — but the key each one resolves to now depends on
 * the active scope. See `lib/storageKeys.ts` for the classification that
 * decides whether a given key is scoped at all.
 *
 * ── Why the scope is module state rather than a parameter ────────────────────
 * The alternative is threading a scope through every call site, which in
 * practice means every screen learning about account identity in order to save
 * a setting. That is exactly how a namespace ends up hand-concatenated in
 * thirty files and wrong in one of them. There is one active scope at a time
 * because there is one signed-in learner at a time.
 *
 * ── Reading before a scope is set ────────────────────────────────────────────
 * Account reads before `setActiveScope` return the fallback and account writes
 * are dropped. That is not an error case to guard against, it is the honest
 * answer: until auth has resolved, the app does not yet know whose deck to
 * load, and loading *somebody's* would be the bug this whole change removes.
 * Device keys need no scope and work throughout.
 */

let activeScope: StorageScope | null = null

/** The store the rest of the persistence layer is built on. */
export const deviceStore: KeyValueStore = {
  async get(key) {
    return AsyncStorage.getItem(key)
  },
  async set(key, value) {
    await AsyncStorage.setItem(key, value)
  },
  async remove(key) {
    await AsyncStorage.removeItem(key)
  },
}

/*
 * Accounts whose local copy is to be erased: an account that was deleted on
 * the server. Erasing waits until AppContext has moved storage off that
 * account (`purgeDeletedAccounts`), because until then its save effects are
 * still pointed at the namespace and would write it straight back.
 */
const pendingPurge = new Set<string>()

/** Marks a deleted account's on-device progress for erasure. */
export function markAccountForPurge(userId: string): void {
  pendingPurge.add(userId)
}

/**
 * Erases every key under each marked account's namespace —
 * `chinese-easy:<userId>:…`, review archive chunks included. Skips the account
 * storage is currently pointed at, which keeps a purge from ever racing a
 * live save. Failures leave the account marked, to be tried on the next switch.
 */
export async function purgeDeletedAccounts(): Promise<void> {
  if (pendingPurge.size === 0) return
  let keys: readonly string[]
  try {
    keys = await AsyncStorage.getAllKeys()
  } catch {
    return
  }
  for (const userId of [...pendingPurge]) {
    if (activeScope?.kind === 'user' && activeScope.userId === userId) continue
    const prefix = `${PREFIX}${userId}:`
    try {
      await AsyncStorage.multiRemove(keys.filter((key) => key.startsWith(prefix)))
      pendingPurge.delete(userId)
    } catch {
      /* stays marked */
    }
  }
}

/*
 * Set when an account is deleted: the guest namespace the app falls back to
 * still holds whatever this handset did before signing in (onboarding
 * complete, usually), and someone who just deleted their account should start
 * over rather than land on that guest's Home.
 */
let freshStartPending = false

/** Asks the next switch into the guest scope to begin from a fresh install. */
export function requestFreshStart(): void {
  freshStartPending = true
}

/**
 * Erases the guest's account keys if a fresh start was requested. Called by
 * AppContext with writes suspended, after the scope is set and before hydrate,
 * so the load that follows sees nothing and falls back to defaults. Device
 * keys are left alone.
 */
export async function eraseGuestScopeIfRequested(scope: StorageScope): Promise<void> {
  if (!freshStartPending || scope.kind !== 'guest') return
  const prefix = `${PREFIX}guest:${scope.installationId}:`
  try {
    const keys = await AsyncStorage.getAllKeys()
    await AsyncStorage.multiRemove(keys.filter((key) => key.startsWith(prefix)))
    freshStartPending = false
  } catch {
    /* stays requested, tried again on the next switch */
  }
}

/**
 * Points subsequent account reads and writes at a different learner.
 *
 * Returns whether the scope actually changed, so the caller can skip a
 * re-hydrate it does not need. `AppContext` owns the sequencing: it suspends
 * writes, resets in-memory state, sets the scope, then hydrates — in that
 * order, so no default is ever written into the arriving account's namespace.
 */
export function setActiveScope(scope: StorageScope | null): boolean {
  if (sameScope(activeScope, scope)) return false
  activeScope = scope
  return true
}

export function getActiveScope(): StorageScope | null {
  return activeScope
}

/** The resolved AsyncStorage key, or null when an account key has no scope yet. */
function resolveKey(key: StorageKey): string | null {
  if (classifyKey(key) === 'device') return legacyKey(key)
  if (!activeScope) return null
  return scopedKey(activeScope, key)
}

export async function loadStored<T>(key: StorageKey, fallback: T): Promise<T> {
  const resolved = resolveKey(key)
  if (!resolved) return fallback
  try {
    const raw = await AsyncStorage.getItem(resolved)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function saveStored<T>(key: StorageKey, value: T): Promise<void> {
  const resolved = resolveKey(key)
  if (!resolved) return
  try {
    await AsyncStorage.setItem(resolved, JSON.stringify(value))
  } catch {
    // storage unavailable (quota, corrupted store) — fail silently, state stays in-memory
  }
}
