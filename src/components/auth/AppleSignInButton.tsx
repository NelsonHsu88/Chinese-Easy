import { useEffect, useState } from 'react'
import { Platform, View } from 'react-native'

/*
 * Apple's own button, not a lookalike: App Review checks Sign in with Apple
 * against Apple's button guidelines, and the system component is the version
 * that always passes. White-outline suits the ivory onboarding pages.
 *
 * Renders nothing off iOS, or on a device where Apple sign-in is unavailable,
 * so callers can drop it in unconditionally. The native module is required
 * lazily — it doesn't exist on Android or web.
 */
export function AppleSignInButton({ onPress, disabled = false }: { onPress: () => void; disabled?: boolean }) {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    if (Platform.OS !== 'ios') return
    let cancelled = false
    const Apple = require('expo-apple-authentication') as typeof import('expo-apple-authentication')
    void Apple.isAvailableAsync()
      .then((ok) => {
        if (!cancelled) setAvailable(ok)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  if (!available) return null
  const Apple = require('expo-apple-authentication') as typeof import('expo-apple-authentication')

  return (
    <View style={{ opacity: disabled ? 0.6 : 1 }} pointerEvents={disabled ? 'none' : 'auto'}>
      <Apple.AppleAuthenticationButton
        buttonType={Apple.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={Apple.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
        cornerRadius={24}
        style={{ height: 54, alignSelf: 'stretch' }}
        onPress={onPress}
      />
    </View>
  )
}
