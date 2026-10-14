import { useEffect, useState } from 'react'
import { View, ActivityIndicator, Platform } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { isGoogleSignInRedirect, useAuth } from '../../context/AuthContext'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { dashColors } from '../../components/dashboard/tokens'

/*
 * Where Google sends the learner back to.
 *
 * On **native**, `signInWithGoogle` opens the browser itself with
 * `skipBrowserRedirect`, so the redirect comes back as a return value from
 * `WebBrowser.openAuthSessionAsync` and the code is exchanged there. But on
 * Android the same redirect *also* arrives as a deep link and opens this
 * screen. That one must neither spend the code nor reset to '/' — doing so sent
 * the learner back to the first page of onboarding mid-sign-in. It closes
 * itself, uncovering the onboarding step underneath, which finishes the
 * sign-in. An email confirmation link does land here for real — see below.
 *
 * On **web** there is no in-app browser to hand a value back. The page navigates
 * to Google and Google navigates it here — to the exact path
 * `Linking.createURL('auth/callback')` produces, which is what has to be on
 * Supabase's redirect allowlist. There was no route at that path, so the one
 * platform that actually needs it got a 404 at the end of an otherwise working
 * sign-in.
 *
 * There is nothing to *do* here. `detectSessionInUrl` (set for web only in
 * lib/supabase.ts) reads the code out of the URL and completes the exchange
 * before this component's effect runs, and `onAuthStateChange` updates
 * AuthContext. So this waits for the session to land and then gets out of the
 * way — replacing rather than pushing, because a URL carrying an auth code has
 * no business staying in the history.
 */
export default function AuthCallback() {
  const { ready, session } = useAuth()
  const { code } = useLocalSearchParams<{ code?: string }>()
  /* Read once: by the time the effects run, the sign-in may have finished. */
  const [googleRedirect] = useState(() => Platform.OS !== 'web' && isGoogleSignInRedirect(code))
  /*
   * The one native visitor: the link in a sign-up confirmation email, opened on
   * a phone, arrives as `chineseeasy://auth/callback?code=…`. Nothing else
   * exchanges that code on native, so this does. It can fail harmlessly — opened
   * on a different device from the one that signed up, the PKCE verifier isn't
   * here — but the address is already confirmed by then, so logging in with the
   * password works either way.
   */
  const [exchanging, setExchanging] = useState(
    Platform.OS !== 'web' && !googleRedirect && typeof code === 'string' && isSupabaseConfigured,
  )

  useEffect(() => {
    if (!googleRedirect) return
    if (router.canGoBack()) router.back()
    else router.replace('/')
  }, [googleRedirect])

  useEffect(() => {
    if (!exchanging || typeof code !== 'string') return
    void getSupabase()
      .auth.exchangeCodeForSession(code)
      .catch(() => undefined)
      .finally(() => setExchanging(false))
  }, [exchanging, code])

  useEffect(() => {
    if (googleRedirect || !ready || exchanging) return
    /*
     * Both outcomes go to the same place. The root layout already redirects to
     * onboarding when it is incomplete and to the tabs when it is not, so
     * sending everyone to '/' lets the one piece of code that knows the rule
     * apply it — rather than a second copy here that can disagree with it.
     *
     * A failed sign-in lands here too (Google appends an error, no code, no
     * session). It is not this screen's job to explain that: the learner ends up
     * back where they started, still signed out, which is exactly what the
     * onboarding account step is built to handle.
     */
    router.replace('/')
  }, [googleRedirect, ready, exchanging, session])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: dashColors.background }}>
      <ActivityIndicator color={dashColors.green} />
    </View>
  )
}
