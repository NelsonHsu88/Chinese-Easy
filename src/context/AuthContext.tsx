import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Platform } from 'react-native'
import type { Session, User } from '@supabase/supabase-js'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { deviceStore } from '../lib/storage'
import { recordGuestAdoptionIntent } from '../lib/storageScope'

/*
 * Closes the browser tab left over from an OAuth redirect on web. A no-op
 * everywhere else, and safe to call at module scope — which is where it has to
 * be, because the redirect lands before any component has mounted.
 */
WebBrowser.maybeCompleteAuthSession()

/*
 * Who is signed in.
 *
 * Deliberately separate from `AppContext` rather than folded into it, for one
 * concrete reason: the session is persisted by `supabase-js` itself, so it does
 * not go through `hydrate()`, `skipNextSave` and a guarded save effect the way
 * every field in AppContext does. Putting it there would mean a piece of state
 * that looks like the others and follows none of their rules.
 *
 * It wraps `AppProvider` in the root layout, so the sync layer can read the
 * signed-in user id from inside the app store when it lands.
 */

export interface AuthResult {
  /** Human-readable and safe to put in front of a learner. Null on success. */
  error: string | null
  /**
   * True when the account was created but Supabase is holding it until the
   * address is confirmed by email. There is no session yet in that case, so the
   * UI has to say "check your email" rather than carrying on as signed in.
   */
  needsEmailConfirmation?: boolean
  /**
   * True when the person backed out of Google's screen rather than failing.
   *
   * Told apart from an error deliberately: closing a sign-in sheet is a
   * decision, not a fault, and showing "something went wrong" to someone who
   * simply changed their mind is the app arguing with them.
   */
  cancelled?: boolean
  /**
   * What the provider says about **the person who just signed in** — never
   * about the developer. Offered to the profile screen as a starting point.
   */
  account?: { email: string; name: string }
}

interface AuthContextValue {
  /**
   * False until the stored session has been read.
   *
   * This is a *local* read — `getSession()` comes out of AsyncStorage, not the
   * network — which is the only reason it is allowed to gate the splash screen.
   * Nothing in the launch path may ever wait on a request.
   */
  ready: boolean
  /** False until `.env` carries a Supabase URL and key. */
  configured: boolean

  session: Session | null
  user: User | null
  userId: string | null
  /** The address the account is registered under, once there is one. */
  email: string | null

  signUpWithEmail: (email: string, password: string) => Promise<AuthResult>
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>
  /**
   * Real Google OAuth, through Google's own servers.
   *
   * Worth being explicit about what this does and does not do, because the
   * screen it replaced was a mock that listed a hardcoded account: **the app
   * never sees anybody's Google password, and no account is ever suggested by
   * us.** The person authenticates on Google's page, in their own browser
   * session, against whichever account they are signed into on that device.
   * What comes back is a token for *them*.
   */
  signInWithGoogle: () => Promise<AuthResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Supabase's messages are written for developers; these are for learners.
 *
 * The fallback used to be `return message` — an unbounded passthrough of a third
 * party's error text straight into the interface. Supabase's auth messages are
 * mostly harmless, which is exactly why that was easy to leave: it works until
 * the day GoTrue returns a provider misconfiguration, an internal rate-limit
 * detail or a stack fragment, and then it is on screen in front of everybody.
 *
 * So the list is the allowlist, and anything unrecognised gets one plain
 * sentence. The detail is not thrown away — it goes to the console in
 * development, which is where somebody debugging this can actually use it.
 */
function readableError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'That email and password don’t match an account.'
  if (m.includes('user already registered')) return 'There’s already an account with that email. Try signing in.'
  if (m.includes('password should be at least')) return 'Please choose a password of at least 6 characters.'
  if (m.includes('unable to validate email')) return 'That doesn’t look like a valid email address.'
  if (m.includes('network') || m.includes('fetch')) return 'Couldn’t reach the server. Check your connection and try again.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Please wait a minute and try again.'
  if (m.includes('email not confirmed')) return 'Please confirm your email address first — check your inbox.'
  if (__DEV__) console.warn('[auth] unmapped error:', message)
  return 'Something went wrong signing in. Please try again.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    /*
     * No keys yet: stay signed out and let the app run. This is the state the
     * project is in before `.env` is filled, and it must not be a crash — every
     * other screen works perfectly well without an account.
     */
    if (!isSupabaseConfigured) {
      setReady(true)
      return
    }

    const supabase = getSupabase()
    let cancelled = false

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      setReady(true)
    })

    // Fires on sign-in, sign-out, and every token refresh, so the session held
    // here never goes stale against the one the client is actually sending.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!cancelled) setSession(next)
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  const signUpWithEmail = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return { error: 'Supabase isn’t configured yet.' }
    const { data, error } = await getSupabase().auth.signUp({
      email: email.trim(),
      password,
    })
    if (error) return { error: readableError(error.message) }
    /*
     * Account *creation* is the only local proof that an account is new, and a
     * new account is the only one guest progress may be adopted into. Recording
     * the intent here — and nowhere else — is what stops a friend signing into
     * their own established account on this phone from inheriting the owner's
     * vocabulary. See `maybeAdoptGuestProgress` in lib/storageMigration.ts.
     */
    await recordGuestAdoptionIntent(deviceStore, email)
    /*
     * With "Confirm email" on — Supabase's default — signUp returns a user but
     * no session, and nothing else happens until the link in the email is
     * clicked. Reporting that honestly is the difference between a learner
     * waiting for a screen that never comes and one checking their inbox.
     */
    if (data.user && !data.session) return { error: null, needsEmailConfirmation: true }
    return { error: null }
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return { error: 'Supabase isn’t configured yet.' }
    const { error } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    return { error: error ? readableError(error.message) : null }
  }, [])

  /**
   * The redirect Google sends the person back to when they are done.
   *
   * Derived from the app's own scheme (`chineseeasy://auth/callback` in a
   * build, an `exp://` URL under Expo Go) rather than written out, so it stays
   * correct across dev, preview and release without three copies to keep in
   * step. **This exact value has to be on Supabase's redirect allowlist** —
   * Auth refuses to send anyone to a URL that is not on it, which is what stops
   * a malicious app claiming the callback.
   */
  const oauthRedirectTo = useCallback(() => Linking.createURL('auth/callback'), [])

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return { error: 'Supabase isn’t configured yet.' }
    const supabase = getSupabase()

    /*
     * On the web there is no in-app browser to open: the page navigates to
     * Google and comes back to itself, and `detectSessionInUrl` (set in
     * lib/supabase.ts, web only) picks the session up on the way in. Nothing
     * after this line runs, because the tab has gone.
     */
    if (Platform.OS === 'web') {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: oauthRedirectTo() },
      })
      return { error: error ? readableError(error.message) : null }
    }

    const redirectTo = oauthRedirectTo()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        /* We open the browser ourselves so the result comes back to us as a
           value, rather than as a navigation we would have to listen for. */
        skipBrowserRedirect: true,
      },
    })
    if (error) return { error: readableError(error.message) }
    if (!data?.url) return { error: 'Google sign-in is not enabled for this project yet.' }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
    if (result.type === 'cancel' || result.type === 'dismiss') return { error: null, cancelled: true }
    if (result.type !== 'success') return { error: 'Sign-in didn’t finish. Please try again.' }

    /* `Linking.parse` rather than `new URL` — React Native's URL has no
       reliable `searchParams`, and a custom scheme is exactly the shape it
       handles worst. */
    const params = Linking.parse(result.url).queryParams ?? {}
    const denied = typeof params.error === 'string' ? params.error : null
    if (denied) {
      /* Google says access_denied both for "cancelled" and for a refused
         consent screen. Neither is an app failure worth alarming anyone over. */
      return denied === 'access_denied'
        ? { error: null, cancelled: true }
        : { error: 'Google couldn’t complete the sign-in. Please try again.' }
    }

    const code = typeof params.code === 'string' ? params.code : null
    if (!code) return { error: 'Sign-in didn’t finish. Please try again.' }

    /* PKCE: the code is worthless without the verifier held by this client, so
       intercepting the redirect gains an attacker nothing. See `flowType` in
       lib/supabase.ts. */
    const exchanged = await supabase.auth.exchangeCodeForSession(code)
    if (exchanged.error) return { error: readableError(exchanged.error.message) }

    const user = exchanged.data.session?.user
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>
    const name = [meta.full_name, meta.name, meta.given_name].find(
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    )

    return {
      error: null,
      account: { email: user?.email ?? '', name: name?.trim() ?? '' },
    }
  }, [oauthRedirectTo])

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return
    await getSupabase().auth.signOut()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      configured: isSupabaseConfigured,
      session,
      user: session?.user ?? null,
      userId: session?.user.id ?? null,
      email: session?.user.email ?? null,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      signOut,
    }),
    [ready, session, signUpWithEmail, signInWithEmail, signInWithGoogle, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
