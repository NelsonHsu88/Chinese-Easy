import { useState } from 'react'
import { View, Text, TextInput } from 'react-native'
import { router } from 'expo-router'
import { Check } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { DetailShell, ControlGroup, Field, ActionButton, Hint } from '../components/settings/parts'
import { setColors as c, setSpacing as s, setType as t, setRadius } from '../components/settings/tokens'

/*
 * Edit Profile, repainted to match the Settings screen it opens from.
 *
 * The email field is new here, and it is not a new setting: onboarding has been
 * writing `settings.email` since the account step, and until now there was no
 * way to correct it afterwards. The profile card on Settings shows that address,
 * so it had to become editable in the place the card points at.
 */
export function Profile() {
  const { settings, updateSettings } = useApp()
  const [name, setName] = useState(settings.username)
  const [email, setEmail] = useState(settings.email)

  const trimmedName = name.trim()
  const trimmedEmail = email.trim()

  /* A blank address is allowed — plenty of installs have none. A wrong-looking
     one is not, and the pattern is deliberately loose: anything stricter only
     ever rejects somebody's real address. */
  const emailOk = trimmedEmail.length === 0 || /^\S+@\S+\.\S+$/.test(trimmedEmail)
  const canSave = trimmedName.length > 0 && trimmedName.length <= 24 && emailOk

  const handleSave = () => {
    if (!canSave) return
    updateSettings({ username: trimmedName, email: trimmedEmail })
    if (router.canGoBack()) router.back()
    else router.replace('/settings')
  }

  const input = {
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.background,
    borderRadius: setRadius.inner,
    paddingHorizontal: s.lg,
    paddingVertical: s.md,
    fontSize: 16,
    color: c.navy,
  } as const

  return (
    <DetailShell title="Edit profile">
      <View className="items-center">
        <View
          className="items-center justify-center rounded-full"
          style={{ width: 88, height: 88, backgroundColor: c.sage }}
        >
          <Text
            className="font-nunito-extrabold"
            style={{ fontSize: 42, lineHeight: 52, color: '#FFFFFF' }}
          >
            {trimmedName ? trimmedName[0].toUpperCase() : '?'}
          </Text>
        </View>
        <View style={{ marginTop: s.md }}>
          <Hint>Your initial stands in until profile pictures arrive.</Hint>
        </View>
      </View>

      <ControlGroup title="Your details">
        <Field label="Display name" hint="Shown on your Dashboard. Up to 24 characters.">
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={24}
            placeholder="Your name"
            placeholderTextColor={c.textMuted}
            accessibilityLabel="Display name"
            className="font-nunito-semibold"
            style={input}
          />
        </Field>

        <Field label="Email" hint="From the account you signed in with. Never shared.">
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="you@example.com"
            placeholderTextColor={c.textMuted}
            accessibilityLabel="Email address"
            className="font-nunito-semibold"
            style={[input, !emailOk && { borderColor: c.coral }]}
          />
          {!emailOk && (
            <Text
              className="font-nunito-semibold"
              style={{ ...t.hint, color: c.coralDark, marginTop: 6 }}
            >
              That does not look like an email address.
            </Text>
          )}
        </Field>
      </ControlGroup>

      <View style={{ opacity: canSave ? 1 : 0.45 }}>
        <ActionButton label="Save" icon={Check} tone="primary" onPress={handleSave} />
      </View>
    </DetailShell>
  )
}
