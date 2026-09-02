import type { KeyValueStore } from './keyValueStore'
import { PREFIX, type StorageScope } from './storageKeys'

/*
 * Deciding *whose* data the app is looking at.
 *
 * Two jobs live here: minting the random per-installation id a signed-out
 * learner is scoped by, and recording the one narrow case in which guest
 * progress may be adopted into an account.
 */

/** Device-level keys. Never scoped — they are what scoping is built on. */
const INSTALLATION_KEY = `${PREFIX}installationId`
const ADOPTION_INTENT_KEY = `${PREFIX}guestAdoptionIntent`

/** An adoption intent older than this is ignored. */
export const ADOPTION_INTENT_TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * A random id for this installation, minted once and kept.
 *
 * Deliberately app-generated and meaningless: no advertising id, no hardware
 * serial, no IMEI, no Apple id, no email. It exists only to keep one guest's
 * progress separate from the next person's on a shared handset, so anything
 * that could identify the *person* would be both unnecessary and worse.
 *
 * `crypto.randomUUID` is available in Hermes and in every browser this runs in;
 * the fallback covers older runtimes without pulling in a uuid dependency.
 */
export async function installationId(store: KeyValueStore): Promise<string> {
  const existing = await store.get(INSTALLATION_KEY)
  if (existing) return existing
  const minted = randomId()
  await store.set(INSTALLATION_KEY, minted)
  return minted
}

function randomId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (c?.randomUUID) return c.randomUUID()
  // Not cryptographic, and does not need to be — this is a namespace, not a secret.
  return `i-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

/** The scope for a signed-in user id, or the guest scope when signed out. */
export async function resolveScope(
  store: KeyValueStore,
  userId: string | null,
): Promise<StorageScope> {
  if (userId) return { kind: 'user', userId }
  return { kind: 'guest', installationId: await installationId(store) }
}

/**
 * A record that this installation just created an account.
 *
 * ── Why an intent, rather than checking whether the account looks empty ──────
 * Guest progress may only be adopted into an account that is *provably* new,
 * and "the local namespace for this user id is empty" does not prove that. A
 * friend signing into their own established account on your phone has an empty
 * local namespace too — adopting there would hand them your vocabulary, which
 * is precisely the case this must not get wrong.
 *
 * Account *creation* is the only local proof available, so sign-up records this
 * intent and the adoption runs when a session for that same email appears. The
 * email is what ties the two halves together: without it, the next person to
 * sign in on this handset would consume an intent that was not about them.
 *
 * It is consumed once and expires, so a sign-up that is never confirmed cannot
 * leave a trap armed indefinitely.
 */
export interface GuestAdoptionIntent {
  /** The address the account was created with, lowercased. */
  email: string
  /** The guest namespace whose progress may be adopted. */
  installationId: string
  at: string
}

export async function recordGuestAdoptionIntent(
  store: KeyValueStore,
  email: string,
): Promise<void> {
  const intent: GuestAdoptionIntent = {
    email: email.trim().toLowerCase(),
    installationId: await installationId(store),
    at: new Date().toISOString(),
  }
  await store.set(ADOPTION_INTENT_KEY, JSON.stringify(intent))
}

export async function readGuestAdoptionIntent(
  store: KeyValueStore,
  now: number = Date.now(),
): Promise<GuestAdoptionIntent | null> {
  const raw = await store.get(ADOPTION_INTENT_KEY)
  if (!raw) return null
  try {
    const intent = JSON.parse(raw) as GuestAdoptionIntent
    if (!intent?.email || !intent?.installationId || !intent?.at) return null
    if (now - new Date(intent.at).getTime() > ADOPTION_INTENT_TTL_MS) return null
    return intent
  } catch {
    return null
  }
}

export async function clearGuestAdoptionIntent(store: KeyValueStore): Promise<void> {
  await store.remove(ADOPTION_INTENT_KEY)
}
