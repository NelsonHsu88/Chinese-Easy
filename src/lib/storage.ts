import AsyncStorage from '@react-native-async-storage/async-storage'
import type { KeyValueStore } from './keyValueStore'
import {
  classifyKey,
  legacyKey,
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
