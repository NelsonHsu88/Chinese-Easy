import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

/*
 * Where the Supabase session lives.
 *
 * A platform bridge in the same sense as `storage.ts` and `speech.ts`, and it
 * exists for one reason: the session is not app state, it is a **credential**.
 * It carries a refresh token, and a refresh token mints new access tokens for
 * as long as it is valid — which, with `autoRefreshToken` on, is indefinitely.
 *
 * This used to be plain `AsyncStorage`, which on Android is an unencrypted
 * SQLite file and on iOS an unencrypted file in the app container. Anything
 * that could read the filesystem — a rooted or jailbroken device, a forensic
 * dump of a lost phone, an Android backup (see `allowBackup` in app.json) —
 * read the token and became that learner. That is the one failure in this app
 * that crosses from "your own data" to "somebody else's account", so the
 * session goes to the keychain / EncryptedSharedPreferences instead, where the
 * OS holds the key and a filesystem read yields ciphertext.
 *
 * ── Two things here are not optional ─────────────────────────────────────────
 *
 * **Chunking.** SecureStore refuses values over 2048 bytes. A Supabase session
 * is a JSON blob containing two JWTs and the whole user record, and it goes
 * past that as soon as a provider attaches any real metadata — so the value is
 * split and the part count is stored under the base key. Writing it whole
 * "worked" right up until a Google account with a long enough token silently
 * failed to persist, and the learner was signed out on every cold start.
 *
 * **Web falls back to AsyncStorage.** There is no keychain in a browser;
 * SecureStore's web implementation does not exist. AsyncStorage there is
 * localStorage, which is what supabase-js used on every platform before this,
 * so the web build is no worse off than it was — and web is not the target the
 * threat model above is about.
 */

/*
 * Comfortably under SecureStore's 2048-byte limit. The limit is on the *encoded*
 * value, so leaving headroom rather than sitting on the boundary is deliberate:
 * a multi-byte character must not be what decides whether a session persists.
 */
const CHUNK_SIZE = 1800

/** Every key this store writes for one logical value, so removal is complete. */
function partKey(key: string, index: number): string {
  return `${key}.${index}`
}

/*
 * `getItem` returning null means "no session" to supabase-js, which signs the
 * learner out and recovers cleanly. Every failure path below therefore resolves
 * to null rather than throwing — a keychain that is unavailable for a moment
 * (device locked during a background refresh, say) must not surface as an
 * unhandled rejection inside the auth client.
 */
export const secureSessionStore = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key)

    try {
      const count = await SecureStore.getItemAsync(key)
      if (count === null) return null

      const parts = Number(count)
      if (!Number.isInteger(parts) || parts < 0) return null

      const chunks = await Promise.all(
        Array.from({ length: parts }, (_, i) => SecureStore.getItemAsync(partKey(key, i))),
      )
      /* A missing chunk means a half-written or half-wiped value. Treat it as no
         session at all — reassembling a partial JWT set is worse than a sign-in. */
      if (chunks.some((chunk) => chunk === null)) return null

      return chunks.join('')
    } catch {
      return null
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return AsyncStorage.setItem(key, value)

    try {
      /* Clear first: a shorter session than the one already stored would
         otherwise leave the tail chunks of the old one behind, and the stale
         count would reassemble the two into nonsense. */
      await this.removeItem(key)

      const chunks: string[] = []
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE))
      }

      await Promise.all(
        chunks.map((chunk, i) => SecureStore.setItemAsync(partKey(key, i), chunk)),
      )
      /* The count is written last, so a failure part-way through leaves no count
         and `getItem` reads "no session" rather than a truncated one. */
      await SecureStore.setItemAsync(key, String(chunks.length))
    } catch {
      // Nothing useful to do: the next launch signs the learner in again.
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(key)

    try {
      const count = await SecureStore.getItemAsync(key)
      if (count === null) return

      const parts = Number(count)
      if (Number.isInteger(parts) && parts >= 0) {
        await Promise.all(
          Array.from({ length: parts }, (_, i) => SecureStore.deleteItemAsync(partKey(key, i))),
        )
      }
      await SecureStore.deleteItemAsync(key)
    } catch {
      // Same reasoning as setItem.
    }
  },
}
