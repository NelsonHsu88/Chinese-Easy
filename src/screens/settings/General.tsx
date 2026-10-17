import { useState } from 'react'
import { View, Text, TextInput, Platform, ActivityIndicator, useColorScheme } from 'react-native'
import { router } from 'expo-router'
import { Volume2, Vibrate, Moon, Wrench, ChevronRight, History, Compass, Trash2, Mail, KeyRound } from 'lucide-react-native'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import {
  DetailShell,
  ControlGroup,
  InlineRow,
  Toggle,
  Card,
  PressRow,
  IconCircle,
  Hint,
  ActionButton,
} from '../../components/settings/parts'
import { useLeave } from '../../components/settings/transition'
import { useCaptcha } from '../../components/auth/Captcha'
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../../lib/passwordRules'
import { setColors as c, setSpacing as s, setRow, setRadius } from '../../components/settings/tokens'

/*
 * The drawer everything unglamorous lives in.
 *
 * The reference labels this row "Language, sounds, dark mode". Two of those
 * three are not settings this app has: there is no interface-language option
 * (the UI is English only), and dark mode is not a choice — NativeWind follows
 * the OS on its own. Rather than build two dead controls to match a caption,
 * appearance is stated as the fact it is, and the two that *can* be real —
 * sound and haptics — are wired straight into `lib/sound.ts` and
 * `lib/haptics.ts`.
 */
export function General() {
  const {
    settings,
    updateSettings,
    recoverableProgress,
    adoptRecoverableProgress,
    dismissRecoverableProgress,
    startTour,
    replayScreenTours,
  } = useApp()
  const scheme = useColorScheme()
  const leave = useLeave()

  return (
    <DetailShell title="General">
      {/*
        Progress left in this device's guest namespace, offered rather than
        taken. It appears only when there is something to offer and the account
        is empty, and it disappears for good once answered either way — see
        `findRecoverableGuestProgress`.
      */}
      {recoverableProgress ? (
        <ControlGroup title="Restore progress">
          <Card>
            <View style={{ padding: setRow.padding, paddingVertical: s.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconCircle icon={History} tint={c.slateSoft} color={c.slate} />
                <View style={{ flex: 1, marginLeft: setRow.iconGap }}>
                  <Text
                    className="font-nunito-bold"
                    style={{ fontSize: 16, lineHeight: 21, color: c.navy }}
                  >
                    Progress found on this device
                  </Text>
                  <Text
                    className="font-nunito-semibold"
                    style={{ fontSize: 13.5, lineHeight: 18, color: c.textSecondary, marginTop: 1 }}
                  >
                    {recoverableProgress.deckCount} words, {recoverableProgress.xp} XP, studied
                    before you signed in.
                  </Text>
                </View>
              </View>
              <Text
                className="font-nunito-semibold"
                style={{ fontSize: 13.5, lineHeight: 19, color: c.textSecondary, marginTop: s.md }}
              >
                Add it to your account only if it is yours. Nothing is deleted either way.
              </Text>
            </View>
            <PressRow
              onPress={() => void adoptRecoverableProgress()}
              accessibilityLabel="Add this device's progress to my account"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                minHeight: setRow.minHeight,
                paddingHorizontal: setRow.padding,
              }}
            >
              <Text
                className="font-nunito-bold"
                style={{ flex: 1, fontSize: 15.5, lineHeight: 20, color: c.navy }}
              >
                Add to my account
              </Text>
              <ChevronRight size={20} color={c.textMuted} strokeWidth={2.2} />
            </PressRow>
            <PressRow
              onPress={() => void dismissRecoverableProgress()}
              accessibilityLabel="This progress is not mine"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                minHeight: setRow.minHeight,
                paddingHorizontal: setRow.padding,
              }}
            >
              <Text
                className="font-nunito-semibold"
                style={{ flex: 1, fontSize: 15.5, lineHeight: 20, color: c.textSecondary }}
              >
                Not mine
              </Text>
            </PressRow>
          </Card>
        </ControlGroup>
      ) : null}

      <ControlGroup title="Feedback">
        <InlineRow
          label="Sound effects"
          hint="Stroke clicks, the chime on a correct answer, the gong on a hint."
        >
          <Toggle
            label="Sound effects"
            value={settings.soundEnabled}
            onChange={(soundEnabled) => updateSettings({ soundEnabled })}
          />
        </InlineRow>

        <InlineRow
          label="Haptics"
          hint={
            Platform.OS === 'web'
              ? 'Vibration feedback on taps and milestones. Not available in a browser.'
              : 'Vibration feedback on taps, strokes and milestones.'
          }
        >
          <Toggle
            label="Haptics"
            value={settings.hapticsEnabled}
            onChange={(hapticsEnabled) => updateSettings({ hapticsEnabled })}
          />
        </InlineRow>
      </ControlGroup>

      {/*
        The guided tour is offered once, after onboarding; this is the way back
        to it for anyone who said "Maybe later" or wants it again. Starting it
        is all this does — the tour takes the learner to the Dashboard itself.
      */}
      <ControlGroup title="Help">
        <Hint>
          A short walk-through with Shifu: learning new words, saving them, and reviewing. The guides on
          Learn, Dictionary and Settings show again too, the next time you open each one.
        </Hint>
        <View style={{ marginTop: s.md }}>
          <ActionButton
            label="Replay the app tour"
            icon={Compass}
            onPress={() => {
              replayScreenTours()
              startTour()
            }}
          />
        </View>
      </ControlGroup>

      <ControlGroup title="Appearance">
        <View className="flex-row items-start" style={{ gap: s.md }}>
          <View
            className="items-center justify-center rounded-full"
            style={{ width: 34, height: 34, backgroundColor: c.lavenderSoft }}
          >
            <Moon size={16} color={c.lavender} strokeWidth={2.3} />
          </View>
          <View style={{ flex: 1 }}>
            <Text className="font-nunito-bold" style={{ fontSize: 16, lineHeight: 21, color: c.navy }}>
              Follows your device
            </Text>
            <View style={{ marginTop: 2 }}>
              <Hint>
                Chinese Easy uses your system appearance — currently{' '}
                {scheme === 'dark' ? 'dark' : 'light'}. The reading, writing and settings screens
                are painted on cream paper and stay light in either.
              </Hint>
            </View>
          </View>
        </View>
      </ControlGroup>

      <AccountSection />

      {/*
        Developer is a row rather than a section, and it is the last thing on the
        screen — in a development build. **It must never reach a release.**

        The tools behind it are not diagnostics, they are cheats: the simulated
        clock re-arms every daily challenge (`challengeInstanceId` is
        date-suffixed), fabricates a streak, and resets the interstitial day cap
        in `lib/ads/frequency.ts`; the entitlement toggle turns ads off outright.
        Shipped, that is a learner rewriting their own progress and our ad
        policy from the Settings screen — and once `FEATURES.cloudSync` is on,
        writing the fabrication to the server as history.

        This used to be ungated, with a comment arguing that somebody testing on
        a device has no console to reach for. That need is real and `__DEV__`
        already meets it: it is true in Expo Go and in any `eas build --profile
        development` client, so the row is still there on a phone all through
        development. It is false only in the builds that go to a store, where
        Metro strips this branch entirely.

        The screen itself refuses too (see Developer.tsx) — hiding the way in
        does not stop a deep link to chineseeasy://settings/developer.
      */}
      {__DEV__ && (
        <View style={{ gap: s.md }}>
          <View className="flex-row items-center" style={{ gap: s.sm }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.textMuted }} />
            <Text
              className="font-nunito-extrabold"
              style={{ fontSize: 13, lineHeight: 17, letterSpacing: 0.3, color: c.textMuted, textTransform: 'uppercase' }}
            >
              Advanced
            </Text>
          </View>
          <Card>
            <PressRow
              /* Same exit as the row that opened this screen — a link one level
                 down should not cut where the one above it eased. */
              onPress={() => leave(() => router.push('/settings/developer'))}
              accessibilityLabel="Developer options"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                minHeight: setRow.minHeight,
                paddingHorizontal: setRow.padding,
                paddingVertical: s.md,
              }}
            >
              <IconCircle icon={Wrench} tint={c.slateSoft} color={c.slate} />
              <View style={{ flex: 1, marginLeft: setRow.iconGap, marginRight: s.sm }}>
                <Text className="font-nunito-bold" style={{ fontSize: 16, lineHeight: 21, color: c.navy }}>
                  Developer
                </Text>
                <Text
                  className="font-nunito-semibold"
                  numberOfLines={1}
                  style={{ fontSize: 13.5, lineHeight: 18, color: c.textSecondary, marginTop: 1 }}
                >
                  Simulated clock, replay onboarding
                </Text>
              </View>
              <ChevronRight size={20} color={c.textMuted} strokeWidth={2.2} />
            </PressRow>
          </Card>
        </View>
      )}

      <View style={{ padding: s.lg, borderRadius: setRadius.inner, backgroundColor: c.background }}>
        <Hint>
          Chinese Easy is English-only for now, so there is no interface language to choose.
        </Hint>
      </View>
    </DetailShell>
  )
}

/*
 * Account deletion. Required by the App Store for any app that lets people
 * create an account (guideline 5.1.1(v)), and two-step so a stray tap can't do
 * it: the row opens a confirmation that says exactly what goes, and only the
 * coral button on it deletes. No `Alert` — it does nothing on the web build.
 *
 * Shown only while signed in; a guest has no account to delete.
 */
function AccountSection() {
  const { userId, email, deleteAccount } = useAuth()
  const [stage, setStage] = useState<'idle' | 'confirm' | 'working'>('idle')
  const [error, setError] = useState<string | null>(null)

  if (!userId) return null

  async function confirmDelete() {
    setStage('working')
    setError(null)
    const result = await deleteAccount()
    if (result.error) {
      setError(result.error)
      setStage('confirm')
      return
    }
    /* Signed out with a fresh guest, so the root layout redirects to the
       first page of onboarding. */
    router.replace('/')
  }

  const rowStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    minHeight: setRow.minHeight,
    paddingHorizontal: setRow.padding,
  }

  return (
    <ControlGroup title="Account">
      <Card>
        {email ? (
          <View style={{ padding: setRow.padding, paddingBottom: 0 }}>
            <Hint>Signed in as {email}</Hint>
          </View>
        ) : null}

        <CredentialRows />
        <View style={{ height: 1, backgroundColor: c.separator, marginHorizontal: setRow.padding }} />

        {stage === 'idle' ? (
          <PressRow
            onPress={() => setStage('confirm')}
            accessibilityLabel="Delete account"
            style={{ ...rowStyle, paddingVertical: s.md }}
          >
            <IconCircle icon={Trash2} tint={c.coralSoft} color={c.coralDark} />
            <Text
              className="font-nunito-bold"
              style={{ flex: 1, marginLeft: setRow.iconGap, fontSize: 16, lineHeight: 21, color: c.coralDark }}
            >
              Delete account
            </Text>
            <ChevronRight size={20} color={c.textMuted} strokeWidth={2.2} />
          </PressRow>
        ) : (
          <View style={{ padding: setRow.padding, paddingVertical: s.md }}>
            <Text className="font-nunito-bold" style={{ fontSize: 16, lineHeight: 21, color: c.navy }}>
              Delete your account?
            </Text>
            <Text
              className="font-nunito-semibold"
              style={{ fontSize: 13.5, lineHeight: 19, color: c.textSecondary, marginTop: s.xs }}
            >
              This permanently deletes your account and everything saved to it — your words, reviews,
              streak and XP — on every device. It can’t be undone.
            </Text>
            {error ? (
              <Text
                className="font-nunito-semibold"
                style={{ fontSize: 13.5, lineHeight: 19, color: c.coralDark, marginTop: s.sm }}
              >
                {error}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: s.sm, marginTop: s.md }}>
              <View style={{ flex: 1 }}>
              <PressRow
                onPress={
                  stage === 'working'
                    ? undefined
                    : () => {
                        setError(null)
                        setStage('idle')
                      }
                }
                accessibilityLabel="Keep my account"
                style={{
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: c.border,
                }}
              >
                <Text className="font-nunito-bold" style={{ fontSize: 15, color: c.textSecondary }}>
                  Cancel
                </Text>
              </PressRow>
              </View>
              <View style={{ flex: 1 }}>
              <PressRow
                onPress={stage === 'working' ? undefined : () => void confirmDelete()}
                accessibilityLabel="Permanently delete my account"
                style={{
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: c.coralDark,
                }}
              >
                {stage === 'working' ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="font-nunito-bold" style={{ fontSize: 15, color: '#FFFFFF' }}>
                    Delete
                  </Text>
                )}
              </PressRow>
              </View>
            </View>
          </View>
        )}
      </Card>
    </ControlGroup>
  )
}

/*
 * Change email and Change password, as rows that open in place — the same
 * shape as Delete account below them, and for the same reason: no `Alert`
 * (it does nothing on web), and nothing happens on a single stray tap.
 *
 * Change password appears only for accounts that have one. A Google- or
 * Apple-only account signs in through its provider; resetting a password it
 * never had would be "Forgot password?" in disguise.
 */
function CredentialRows() {
  const { email, hasPassword, changeEmail, changePassword } = useAuth()
  const [open, setOpen] = useState<'none' | 'email' | 'password'>('none')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const captcha = useCaptcha()

  const toggle = (which: 'email' | 'password') => {
    setOpen((was) => (was === which ? 'none' : which))
    setError(null)
    setDone(null)
    setNewEmail('')
    setCurrent('')
    setNext('')
    setConfirm('')
  }

  const emailValid = /^\S+@\S+\.\S+$/.test(newEmail.trim()) && newEmail.trim().toLowerCase() !== (email ?? '').toLowerCase()
  const passwordValid = current.length > 0 && next.length >= MIN_PASSWORD_LENGTH && next === confirm && captcha.ready

  async function submitEmail() {
    if (!emailValid || busy) return
    setBusy(true)
    setError(null)
    const result = await changeEmail(newEmail)
    setBusy(false)
    if (result.error) return setError(result.error)
    setDone(`Check ${newEmail.trim()} (and your current inbox) for a confirmation link. Your email changes once it’s opened.`)
    setNewEmail('')
  }

  async function submitPassword() {
    if (!passwordValid || busy) return
    setBusy(true)
    setError(null)
    const result = await changePassword(current, next, captcha.token)
    captcha.reset()
    setBusy(false)
    if (result.error) return setError(result.error)
    setDone('Your password has been changed.')
    setCurrent('')
    setNext('')
    setConfirm('')
  }

  const rowStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    minHeight: setRow.minHeight,
    paddingHorizontal: setRow.padding,
    paddingVertical: s.md,
  }

  const row = (which: 'email' | 'password', label: string, Icon: typeof Mail) => (
    <PressRow onPress={() => toggle(which)} accessibilityLabel={label} style={rowStyle}>
      <IconCircle icon={Icon} tint={c.slateSoft} color={c.slate} />
      <Text
        className="font-nunito-bold"
        style={{ flex: 1, marginLeft: setRow.iconGap, fontSize: 16, lineHeight: 21, color: c.navy }}
      >
        {label}
      </Text>
      <ChevronRight
        size={20}
        color={c.textMuted}
        strokeWidth={2.2}
        style={{ transform: [{ rotate: open === which ? '90deg' : '0deg' }] }}
      />
    </PressRow>
  )

  const feedback = (
    <>
      {error ? (
        <Text className="font-nunito-semibold" style={{ fontSize: 13.5, lineHeight: 19, color: c.coralDark }}>
          {error}
        </Text>
      ) : null}
      {done ? (
        <Text className="font-nunito-semibold" style={{ fontSize: 13.5, lineHeight: 19, color: c.greenDark }}>
          {done}
        </Text>
      ) : null}
    </>
  )

  return (
    <View>
      {row('email', 'Change email', Mail)}
      {open === 'email' ? (
        <View style={{ paddingHorizontal: setRow.padding, paddingBottom: s.lg, gap: s.md }}>
          <SettingsInput
            label="New email address"
            value={newEmail}
            onChangeText={setNewEmail}
            keyboardType="email-address"
            autoComplete="email"
          />
          {feedback}
          {busy ? (
            <ActivityIndicator color={c.green} />
          ) : (
            <ActionButton label="Send confirmation" tone={emailValid ? 'primary' : 'quiet'} onPress={() => void submitEmail()} />
          )}
        </View>
      ) : null}

      {hasPassword ? (
        <>
          <View style={{ height: 1, backgroundColor: c.separator, marginHorizontal: setRow.padding }} />
          {row('password', 'Change password', KeyRound)}
          {open === 'password' ? (
            <View style={{ paddingHorizontal: setRow.padding, paddingBottom: s.lg, gap: s.md }}>
              <SettingsInput label="Current password" value={current} onChangeText={setCurrent} secure autoComplete="current-password" />
              <SettingsInput
                label={`New password (at least ${MIN_PASSWORD_LENGTH} characters)`}
                value={next}
                onChangeText={setNext}
                secure
                autoComplete="new-password"
              />
              <SettingsInput label="Confirm new password" value={confirm} onChangeText={setConfirm} secure autoComplete="new-password" />
              {confirm.length > 0 && next !== confirm ? <Hint>The new passwords don’t match yet.</Hint> : null}
              {captcha.widget}
              {feedback}
              {busy ? (
                <ActivityIndicator color={c.green} />
              ) : (
                <ActionButton label="Change password" tone={passwordValid ? 'primary' : 'quiet'} onPress={() => void submitPassword()} />
              )}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  )
}

function SettingsInput({
  label,
  value,
  onChangeText,
  secure = false,
  keyboardType = 'default',
  autoComplete,
}: {
  label: string
  value: string
  onChangeText: (text: string) => void
  secure?: boolean
  keyboardType?: 'default' | 'email-address'
  autoComplete?: 'email' | 'current-password' | 'new-password'
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      accessibilityLabel={label}
      placeholder={label}
      placeholderTextColor={c.textMuted}
      secureTextEntry={secure}
      keyboardType={keyboardType}
      autoComplete={autoComplete}
      autoCapitalize="none"
      autoCorrect={false}
      maxLength={secure ? MAX_PASSWORD_LENGTH : 254}
      className="font-nunito-semibold"
      style={{
        height: 48,
        borderRadius: setRadius.inner,
        borderWidth: 1.5,
        borderColor: c.border,
        backgroundColor: c.background,
        paddingHorizontal: s.lg,
        fontSize: 15.5,
        color: c.navy,
        ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
      }}
    />
  )
}
