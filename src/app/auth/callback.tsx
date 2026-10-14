import { useEffect, useState } from 'react'
import { View, ActivityIndicator, Platform } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useAuth } from '../../context/AuthContext'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { dashColors } from '../../components/dashboard/tokens'

/*
 * Where Google sends the learner back to.
 *
 * On **native** Google never lands here: `signInWithGoogle` opens the browser
 * itself with `skipBrowserRedirect`, so the redirect comes back as a return
 * value from `WebBrowser.openAuthSessionAsync` and the code is exchanged inline.
 * See AuthContext. An email confirmation link does land here — see below.
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
  /*
   * The one native visitor: the link in a sign-up confirmation email, opened on
   * a phone, arrives as `chineseeasy://auth/callback?code=…`. Nothing else
   * exchanges that code on native, so this does. It can fail harmlessly — opened
   * on a different device from the one that signed up, the PKCE verifier isn't
   * here — but the address is already confirmed by then, so logging in with the
   * password works either way.
   */
  const [exchanging, setExchanging] = useState(Platform.OS !== 'web' && typeof code === 'string' && isSupabaseConfigured)

  useEffect(() => {
    if (!exchanging || typeof code !== 'string') return
    void getSupabase()
      .auth.exchangeCodeForSession(code)
      .catch(() => undefined)
      .finally(() => setExchanging(false))
  }, [exchanging, code])

  useEffect(() => {
    if (!ready || exchanging) return
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
  }, [ready, exchanging, session])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: dashColors.background }}>
      <ActivityIndicator color={dashColors.green} />
    </View>
  )
}
