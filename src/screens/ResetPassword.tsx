import { useEffect, useState } from 'react'
import { ActivityIndicator, Platform, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { ArrowRight, Lock } from 'lucide-react-native'
import { useAuth } from '../context/AuthContext'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { OnbBody, OnbButton, OnbRise, OnbShell, OnbTextField, OnbTitle, OnbTopBar } from '../components/onboarding/parts'
import { onbColors as c, onbSpacing as s, onbType as t, onbVerdict } from '../components/onboarding/tokens'
import { MIN_PASSWORD_LENGTH } from '../lib/passwordRules'

/*
 * Where the "Reset your password" email lands: `…/auth/reset-password?code=…`.
 *
 * The link signs the learner in (PKCE: the code is only good on the device that
 * asked for the reset, which holds the verifier). On web `detectSessionInUrl`
 * does that exchange before this screen mounts; on native it happens here.
 * Then the one thing left is choosing a new password.
 *
 * Opened on another device, or a second time, the exchange fails — the screen
 * says so and offers the way back, rather than a form that can't succeed.
 */
export default function ResetPassword() {
  const { ready, session, setNewPassword } = useAuth()
  const { code } = useLocalSearchParams<{ code?: string }>()
  const [exchanging, setExchanging] = useState(Platform.OS !== 'web' && typeof code === 'string' && isSupabaseConfigured)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!exchanging || typeof code !== 'string') return
    void getSupabase()
      .auth.exchangeCodeForSession(code)
      .catch(() => undefined)
      .finally(() => setExchanging(false))
  }, [exchanging, code])

  const leave = () => router.replace('/')
  const longEnough = password.length >= MIN_PASSWORD_LENGTH
  const matches = password === confirm
  const canSubmit = !busy && longEnough && matches

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    const result = await setNewPassword(password)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setPassword('')
    setConfirm('')
    setDone(true)
  }

  if (!ready || exchanging) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.paper }}>
        <ActivityIndicator color={c.green} />
      </View>
    )
  }

  const linkFailed = !session
  const title = linkFailed ? 'This link has expired' : done ? 'Password updated' : 'Choose a new password'
  const body = linkFailed
    ? 'Reset links work once, on the device that asked\nfor them. Request a new one from the log-in page.'
    : done
      ? 'You’re signed in with your new password.'
      : `Signed in as ${session.user.email ?? 'your account'}.\nPick something you haven’t used before.`

  return (
    <OnbShell
      top={<OnbTopBar onBack={leave} />}
      footer={
        <OnbButton
          label={linkFailed || done ? 'Continue' : busy ? 'Saving…' : 'Save new password'}
          icon={<ArrowRight size={20} color={c.paper} strokeWidth={2.4} />}
          onPress={linkFailed || done ? leave : () => void submit()}
          disabled={!(linkFailed || done) && !canSubmit}
        />
      }
    >
      <View className="flex-1" style={{ paddingTop: s.xl }}>
        <OnbRise index={0}>
          <View className="items-center">
            <OnbTitle>{title}</OnbTitle>
            <OnbBody style={{ marginTop: s.sm }}>{body}</OnbBody>
          </View>
        </OnbRise>

        {!linkFailed && !done && (
          <View style={{ gap: s.xl, paddingTop: s.xxl, paddingHorizontal: s.sm }}>
            <OnbRise index={1}>
              <OnbTextField
                label="New password"
                value={password}
                onChangeText={setPassword}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                autoCapitalize="none"
                autoComplete="new-password"
                maxLength={72}
                secure
                icon={<Lock size={22} color={c.textSecondary} strokeWidth={1.9} />}
              />
            </OnbRise>
            <OnbRise index={2}>
              <OnbTextField
                label="Confirm new password"
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Type it again"
                autoCapitalize="none"
                autoComplete="new-password"
                maxLength={72}
                secure
                hint={confirm.length > 0 && !matches ? 'The passwords don’t match yet' : undefined}
                icon={<Lock size={22} color={c.textSecondary} strokeWidth={1.9} />}
              />
            </OnbRise>
            {error !== null && (
              <Text className="text-center font-nunito-semibold" style={{ ...t.body, color: onbVerdict.incorrect.text }}>
                {error}
              </Text>
            )}
          </View>
        )}
      </View>
    </OnbShell>
  )
}
