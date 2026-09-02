import { AppState, Platform } from 'react-native'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { secureSessionStore } from './secureSessionStore'

/*
 * The Supabase client — a platform bridge, in the same sense as `storage.ts`
 * and `speech.ts`: the only file in the app that imports `@supabase/supabase-js`,
 * thin enough that swapping the backend would mean rewriting this and nothing
 * else.
 *
 * Two things here are deliberate and easy to get wrong.
 *
 * **The client is built lazily, not at module scope.** Expo Router runs a static
 * render pass for the web build in an environment with no AsyncStorage and no
 * env vars, and anything that throws at import time takes the whole app down
 * there rather than at the call site. `sound.ts` creates its `AudioPlayer`s
 * lazily for exactly this reason — same trap, same defence.
 *
 * **A missing key is a legible error, not a crash.** Until `.env` is filled in,
 * `isSupabaseConfigured` is false and the app runs exactly as it always has,
 * signed out. Throwing at import would mean an empty `.env` bricks the app for
 * everyone working on any other part of it.
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

/**
 * Whether `.env` carries both values Supabase needs.
 *
 * Read this before touching `getSupabase()` — it is what lets the auth layer
 * report "not connected yet" instead of throwing at a learner.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

let client: SupabaseClient | null = null

/**
 * The shared client, created on first use.
 *
 * Throws if the environment is missing, which is why every caller either checks
 * `isSupabaseConfigured` first or is only reachable once a session exists.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client

  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and ' +
        'EXPO_PUBLIC_SUPABASE_ANON_KEY in .env, then restart the dev server — ' +
        'Metro only reads .env when it starts, so a reload on the phone is not enough.',
    )
  }

  client = createClient(url, anonKey, {
    auth: {
      /*
       * Deliberately *not* the AsyncStorage the rest of the app uses. The
       * session carries a refresh token, which is a credential rather than
       * state, and AsyncStorage is unencrypted on both platforms — so it goes
       * to the keychain instead. See lib/secureSessionStore.ts for the chunking
       * that makes that work and for what was wrong with the old arrangement.
       *
       * Existing signed-in learners are signed out once, on the launch after
       * this ships: the old value is under a key this store does not read, and
       * migrating a token that has already sat in plaintext would carry the
       * exposure forward rather than end it. One sign-in is the cheaper half of
       * that trade.
       */
      storage: secureSessionStore,
      autoRefreshToken: true,
      persistSession: true,
      /*
       * Only the web build has a URL to recover a session from. Left on for
       * native, the client waits for a redirect that never arrives.
       */
      detectSessionInUrl: Platform.OS === 'web',
      // PKCE is the flow for a public client that cannot keep a secret, which
      // is precisely what a phone app is.
      flowType: 'pkce',
    },
  })

  /*
   * Refresh tokens only while the app is in front. Supabase's timer is a plain
   * JS interval, and leaving it running in the background burns wakeups to
   * refresh a token nobody is using; worse, a token that expires while
   * backgrounded is not noticed until the app comes back, which is what this
   * listener is for.
   */
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') void client?.auth.startAutoRefresh()
      else void client?.auth.stopAutoRefresh()
    })
  }

  return client
}
