import { useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { useApp, DEFAULT_SETTINGS } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { Card, ControlGroup, DetailShell, Hint, ActionButton } from '../../components/settings/parts'
import { useCaptcha } from '../../components/auth/Captcha'
import { signUpErrors } from '../../lib/authForm'
import { MIN_PASSWORD_LENGTH } from '../../lib/passwordRules'
import { setColors as c, setSpacing as s, setRow } from '../../components/settings/tokens'
import { SettingsInput } from './General'

/*
 * Turning a guest into an account: a username, an email and a password.
 * Reached from Profile's "Save your progress" card and from Settings, General.
 *
 * Email only, on purpose. Creating an account by email records the adoption
 * intent (`createEmailAccount`), so the guest's words, reviews and XP move into
 * the new account when its session arrives. A Google or Apple sign-in records
 * no such intent and would open an empty account.
 */
export function CreateAccount() {
  const { settings, updateSettings } = useApp()
  const { userId, email: signedInEmail, signUpWithEmail } = useAuth()
  const captcha = useCaptcha()

  const startName = settings.username.trim() === DEFAULT_SETTINGS.username ? '' : settings.username.trim()
  const [name, setName] = useState(startName)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const errors = signUpErrors({ name, email, password, confirm })
  const firstError = Object.values(errors)[0]
  const filled = name.trim().length > 0 && email.trim().length > 0 && password.length > 0 && confirm.length > 0

  async function submit() {
    if (busy) return
    setTried(true)
    setError(null)
    if (firstError || !captcha.ready) return
    setBusy(true)
    const result = await signUpWithEmail(email, password, name, captcha.token)
    // Turnstile tokens are single-use, pass or fail.
    captcha.reset()
    setBusy(false)
    if (result.error) return setError(result.error)
    updateSettings({ username: name.trim(), email: email.trim() })
    setPassword('')
    setConfirm('')
    if (result.needsEmailConfirmation) setSentTo(email.trim())
  }

  if (userId) {
    return (
      <DetailShell title="Account">
        <ControlGroup title="Account">
          <Card>
            <View style={{ padding: setRow.padding }}>
              <Text className="font-nunito-bold" style={{ fontSize: 16, lineHeight: 21, color: c.navy }}>
                Your progress is saved
              </Text>
              <View style={{ marginTop: s.xs }}>
                <Hint>Signed in as {signedInEmail ?? 'your account'}. Your words sync to it on every device.</Hint>
              </View>
            </View>
          </Card>
        </ControlGroup>
      </DetailShell>
    )
  }

  if (sentTo) {
    return (
      <DetailShell title="Create account">
        <ControlGroup title="Check your inbox">
          <Card>
            <View style={{ padding: setRow.padding }}>
              <Text className="font-nunito-bold" style={{ fontSize: 16, lineHeight: 21, color: c.navy }}>
                One more step
              </Text>
              <View style={{ marginTop: s.xs }}>
                <Hint>
                  We sent a link to {sentTo}. Open it on this device to finish. Your words, reviews and XP move into
                  the account then. Keep learning in the meantime.
                </Hint>
              </View>
            </View>
          </Card>
        </ControlGroup>
      </DetailShell>
    )
  }

  return (
    <DetailShell title="Create account">
      <ControlGroup title="Save your progress">
        <Card>
          <View style={{ padding: setRow.padding, gap: s.md }}>
            <Hint>
              You’re a guest, so everything lives on this device only. Add an email to keep your words, streak and XP
              safe and use them on other devices.
            </Hint>
            <SettingsInput
              label="Username"
              value={name}
              onChangeText={setName}
              autoComplete="username"
              autoCapitalize="words"
              maxLength={24}
            />
            <SettingsInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />
            <SettingsInput
              label={`Password (at least ${MIN_PASSWORD_LENGTH} characters)`}
              value={password}
              onChangeText={setPassword}
              secure
              autoComplete="new-password"
            />
            <SettingsInput label="Confirm password" value={confirm} onChangeText={setConfirm} secure autoComplete="new-password" />
            {captcha.widget}
            {tried && firstError ? (
              <Text className="font-nunito-semibold" style={{ fontSize: 13.5, lineHeight: 19, color: c.coralDark }}>
                {firstError}
              </Text>
            ) : null}
            {error ? (
              <Text className="font-nunito-semibold" style={{ fontSize: 13.5, lineHeight: 19, color: c.coralDark }}>
                {error}
              </Text>
            ) : null}
            {busy ? (
              <ActivityIndicator color={c.green} />
            ) : (
              <ActionButton
                label="Create account"
                tone={filled && captcha.ready ? 'primary' : 'quiet'}
                onPress={() => void submit()}
              />
            )}
          </View>
        </Card>
      </ControlGroup>
    </DetailShell>
  )
}
