import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Platform } from 'react-native'
import type { Session, User } from '@supabase/supabase-js'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { deviceStore, markAccountForPurge, requestFreshStart } from '../lib/storage'
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

  /** True when the account signs in by email and password (not Google or Apple only). */
  hasPassword: boolean

  /*
   * `captchaToken` is required by Supabase on these calls once CAPTCHA
   * protection is on, and ignored while it is off. See components/auth/Captcha.
   */

  /** `name` is stored on the account (`user_metadata.display_name`) so a later
      log-in on another device can greet the learner without asking again. */
  signUpWithEmail: (email: string, password: string, name?: string, captchaToken?: string) => Promise<AuthResult>
  signInWithEmail: (email: string, password: string, captchaToken?: string) => Promise<AuthResult>
  /**
   * Sign in with Apple — iOS only, native sheet, no browser. Apple requires it
   * of any App Store app that offers Google sign-in (guideline 4.8).
   */
  signInWithApple: (captchaToken?: string) => Promise<AuthResult>
  /** Emails a reset link. Always reports success, so it can't reveal who has an account. */
  sendPasswordReset: (email: string, captchaToken?: string) => Promise<AuthResult>
  /** Sets a new password for the signed-in account (after a recovery link, or from Settings). */
  setNewPassword: (password: string) => Promise<AuthResult>
  /** Checks the current password first, so a borrowed unlocked phone can't change it. */
  changePassword: (current: string, next: string, captchaToken?: string) => Promise<AuthResult>
  /** Sends confirmation links; the address changes only once they're opened. */
  changeEmail: (email: string) => Promise<AuthResult>
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
  /**
   * Permanently deletes the signed-in account: the server deletes the user
   * (every synced row goes with it, by `on delete cascade`), then this device
   * signs out and erases its copy of that account's progress. Guest progress
   * from before sign-in is left alone — it was never the account's.
   *
   * The work is done by the `delete-account` Edge Function, because deleting a
   * user needs the service_role key, which never ships in the app.
   */
  deleteAccount: () => Promise<AuthResult>
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
  // `email_address_invalid`: Supabase won't mail placeholder or test-looking addresses.
  if (m.includes('email address') && m.includes('is invalid'))
    return 'We can’t send email to that address. Please use an inbox you can open.'
  // `email_address_not_authorized`: the built-in mailer only reaches the project's own team.
  if (m.includes('not authorized')) return 'We can’t send email to that address right now. Try signing in with Google instead.'
  if (m.includes('network') || m.includes('fetch')) return 'Couldn’t reach the server. Check your connection and try again.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Please wait a minute and try again.'
  if (m.includes('email not confirmed')) return 'Please confirm your email address first — check your inbox.'
  if (m.includes('password should contain')) return 'Please use a mix of upper- and lower-case letters, numbers and symbols.'
  if (m.includes('captcha')) return 'Please complete the security check and try again.'
  if (m.includes('should be different')) return 'Your new password must be different from the old one.'
  if (m.includes('weak') || m.includes('pwned') || m.includes('easy to guess'))
    return 'That password has appeared in a data breach. Please choose another.'
  if (m.includes('already been registered')) return 'That email address is already used by another account.'
  if (m.includes('reauthentication')) return 'For your security, please log out and back in, then try again.'
  if (__DEV__) console.warn('[auth] unmapped error:', message)
  return 'Something went wrong signing in. Please try again.'
}

/** The learner's name as the account knows it — set at email sign-up, or by Google. */
export function accountFor(user: User | null | undefined): { email: string; name: string } {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>
  const name = [meta.display_name, meta.full_name, meta.name, meta.given_name].find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  )
  return { email: user?.email ?? '', name: name?.trim() ?? '' }
}

/** How long after an account is created (or confirmed) a sign-in counts as a return visit. */
const RETURNING_AFTER_MS = 10 * 60 * 1000

/**
 * True when this session is an existing account signing back in, rather than
 * one made a moment ago by onboarding's own sign-up.
 *
 * Read from Supabase's timestamps because the session is all onboarding has
 * after a sign-in: the switch to the account's storage remounts the screen, so
 * nothing it held about *how* the learner got here survives. A new Google or
 * Apple account signs in the instant it is created, and an emailed sign-up
 * signs in the instant it is confirmed; a log-in to an established account is
 * long after both.
 */
export function isReturningAccount(user: User | null | undefined): boolean {
  if (!user) return false
  const signedIn = Date.parse(user.last_sign_in_at ?? '')
  const created = Date.parse(user.created_at ?? '')
  const confirmed = Date.parse(user.email_confirmed_at ?? user.confirmed_at ?? '')
  if (!Number.isFinite(signedIn) || !Number.isFinite(created)) return false
  const joined = Number.isFinite(confirmed) ? Math.max(created, confirmed) : created
  return signedIn - joined > RETURNING_AFTER_MS
}

/**
 * Where an emailed link (confirmation, and later password reset) lands. The
 * same callback Google uses, so the one allowlist entry covers both.
 */
const authRedirectTo = () => Linking.createURL('auth/callback')

/*
 * Native Google sign-in in progress, and the codes it has claimed.
 *
 * On Android the redirect back from Google reaches the app twice: as the
 * return value of `openAuthSessionAsync`, and as a deep link the router opens
 * at /auth/callback. That screen is built for emailed links — it spends the
 * code and replaces everything with '/', which restarted onboarding from its
 * first page and raced `signInWithGoogle` for the same single-use code. It asks
 * here first, and steps aside for a sign-in this flow is already finishing.
 */
let googleSignInInFlight = false
const claimedOAuthCodes = new Set<string>()

/** True when /auth/callback should leave `code` to `signInWithGoogle`. */
export function isGoogleSignInRedirect(code: string | undefined): boolean {
  return googleSignInInFlight || (code !== undefined && claimedOAuthCodes.has(code))
}

/** The native half of Google sign-in: the browser round trip and the code exchange. */
async function finishGoogleSignIn(authUrl: string, redirectTo: string): Promise<AuthResult> {
  const supabase = getSupabase()
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo)
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
  claimedOAuthCodes.add(code)

  /* PKCE: the code is worthless without the verifier held by this client, so
     intercepting the redirect gains an attacker nothing. See `flowType` in
     lib/supabase.ts. */
  const exchanged = await supabase.auth.exchangeCodeForSession(code)
  if (exchanged.error) return { error: readableError(exchanged.error.message) }

  return { error: null, account: accountFor(exchanged.data.session?.user) }
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

  const signUpWithEmail = useCallback(async (email: string, password: string, name?: string, captchaToken?: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return { error: 'Supabase isn’t configured yet.' }
    const { data, error } = await getSupabase().auth.signUp({
      email: email.trim(),
      password,
      options: {
        captchaToken,
        emailRedirectTo: authRedirectTo(),
        data: name?.trim() ? { display_name: name.trim() } : undefined,
      },
    })
    if (error) return { error: readableError(error.message) }
    /*
     * With confirmation on, signing up with an address that already has an
     * account is not an error — Supabase answers with a placeholder user with no
     * identities, so the response can't be used to probe who is registered. The
     * placeholder is the only signal we get; without this check the learner
     * would wait for a confirmation email that is never sent.
     */
    if (data.user && data.user.identities?.length === 0) {
      return { error: 'There’s already an account with that email. Try logging in.' }
    }
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
    return { error: null, account: accountFor(data.user) }
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string, captchaToken?: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return { error: 'Supabase isn’t configured yet.' }
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
      options: { captchaToken },
    })
    if (error) return { error: readableError(error.message) }
    return { error: null, account: accountFor(data.user) }
  }, [])

  const signInWithApple = useCallback(async (captchaToken?: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return { error: 'Supabase isn’t configured yet.' }
    if (Platform.OS !== 'ios') return { error: 'Sign in with Apple is only available on iPhone and iPad.' }
    // Required lazily: the native module doesn't exist on Android or web.
    const Apple = require('expo-apple-authentication') as typeof import('expo-apple-authentication')
    const Crypto = require('expo-crypto') as typeof import('expo-crypto')

    /*
     * The nonce ties Apple's token to this one request: Apple signs its SHA-256
     * into the token, Supabase hashes the raw value we send and compares. A
     * token lifted from somewhere else carries someone else's nonce.
     */
    const rawNonce = Crypto.randomUUID()
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce)

    let credential: Awaited<ReturnType<typeof Apple.signInAsync>>
    try {
      credential = await Apple.signInAsync({
        requestedScopes: [Apple.AppleAuthenticationScope.FULL_NAME, Apple.AppleAuthenticationScope.EMAIL],
        nonce: hashedNonce,
      })
    } catch (e) {
      if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return { error: null, cancelled: true }
      return { error: 'Apple couldn’t complete the sign-in. Please try again.' }
    }
    if (!credential.identityToken) return { error: 'Apple couldn’t complete the sign-in. Please try again.' }

    const supabase = getSupabase()
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
      options: { captchaToken },
    })
    if (error) return { error: readableError(error.message) }

    /*
     * Apple sends the name only on the very first sign-in, and never puts it in
     * the token — so it is saved onto the account now or lost for good.
     */
    const given = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ').trim()
    if (given && !accountFor(data.user).name) {
      await supabase.auth.updateUser({ data: { display_name: given } })
    }
    const account = accountFor(data.user)
    return { error: null, account: { email: account.email, name: account.name || given } }
  }, [])

  const sendPasswordReset = useCallback(async (email: string, captchaToken?: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return { error: 'Supabase isn’t configured yet.' }
    const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Linking.createURL('auth/reset-password'),
      captchaToken,
    })
    /*
     * Supabase answers the same whether or not the address has an account, and
     * so does this — except for errors the learner can act on (rate limits,
     * a failed check, no connection).
     */
    if (error) {
      const message = readableError(error.message)
      if (message.startsWith('Something went wrong')) return { error: null }
      return { error: message }
    }
    return { error: null }
  }, [])

  const setNewPassword = useCallback(async (password: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return { error: 'Supabase isn’t configured yet.' }
    const { error } = await getSupabase().auth.updateUser({ password })
    return { error: error ? readableError(error.message) : null }
  }, [])

  const changePassword = useCallback(
    async (current: string, next: string, captchaToken?: string): Promise<AuthResult> => {
      const address = session?.user.email
      if (!isSupabaseConfigured || !address) return { error: 'You’re not signed in.' }
      const supabase = getSupabase()
      /* Re-checking the current password is what makes an unlocked phone left
         on a table not enough to take the account over. */
      const check = await supabase.auth.signInWithPassword({ email: address, password: current, options: { captchaToken } })
      if (check.error) {
        return check.error.message.toLowerCase().includes('invalid login credentials')
          ? { error: 'Your current password isn’t right.' }
          : { error: readableError(check.error.message) }
      }
      const { error } = await supabase.auth.updateUser({ password: next })
      return { error: error ? readableError(error.message) : null }
    },
    [session],
  )

  const changeEmail = useCallback(async (email: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured || !session) return { error: 'You’re not signed in.' }
    const { error } = await getSupabase().auth.updateUser(
      { email: email.trim() },
      { emailRedirectTo: authRedirectTo() },
    )
    return { error: error ? readableError(error.message) : null }
  }, [session])

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
  const oauthRedirectTo = useCallback(authRedirectTo, [])

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

    googleSignInInFlight = true
    try {
      return await finishGoogleSignIn(data.url, redirectTo)
    } finally {
      googleSignInInFlight = false
    }
  }, [oauthRedirectTo])


  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return
    await getSupabase().auth.signOut()
  }, [])

  const deleteAccount = useCallback(async (): Promise<AuthResult> => {
    const userId = session?.user.id
    if (!isSupabaseConfigured || !userId) return { error: 'You’re not signed in.' }
    const supabase = getSupabase()

    /* `invoke` sends the session's access token; the function reads whose
       account to delete from that token alone. */
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
    if (error) {
      if (__DEV__) console.warn('[auth] delete-account failed:', error.message)
      return { error: 'Your account couldn’t be deleted. Check your connection and try again.' }
    }

    markAccountForPurge(userId)
    /* Back to the first page of onboarding, not to this handset's guest. */
    requestFreshStart()
    /* Local only: the user no longer exists, so there is no server session left
       to revoke, and a network sign-out would only fail. */
    await supabase.auth.signOut({ scope: 'local' })
    return { error: null }
  }, [session])

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      configured: isSupabaseConfigured,
      session,
      user: session?.user ?? null,
      userId: session?.user.id ?? null,
      email: session?.user.email ?? null,
      hasPassword: ((session?.user.app_metadata?.providers as string[] | undefined) ?? []).includes('email'),
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      signInWithApple,
      sendPasswordReset,
      setNewPassword,
      changePassword,
      changeEmail,
      signOut,
      deleteAccount,
    }),
    [
      ready, session, signUpWithEmail, signInWithEmail, signInWithGoogle, signInWithApple,
      sendPasswordReset, setNewPassword, changePassword, changeEmail, signOut, deleteAccount,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
