import '../global.css'
import { useEffect } from 'react'
import { Stack, Redirect, usePathname } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import { Nunito_400Regular, Nunito_700Bold, Nunito_900Black } from '@expo-google-fonts/nunito'
import { Caveat_500Medium, Caveat_700Bold } from '@expo-google-fonts/caveat'
import { NotoSerifSC_400Regular, NotoSerifSC_700Bold } from '@expo-google-fonts/noto-serif-sc'
import {
  NotoSerifTC_400Regular,
  NotoSerifTC_500Medium,
  NotoSerifTC_600SemiBold,
  NotoSerifTC_700Bold,
} from '@expo-google-fonts/noto-serif-tc'
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter'
import { Lora_400Regular } from '@expo-google-fonts/lora'
import { AppProvider, useApp } from '../context/AppContext'

SplashScreen.preventAutoHideAsync().catch(() => {})

function RootNavigator() {
  const { ready, onboardingComplete } = useApp()
  const pathname = usePathname()
  const [fontsLoaded] = useFonts({
    Nunito: Nunito_400Regular,
    // Only the bold face is loaded — the greeting is the sole place it's used.
    Caveat: Caveat_700Bold,
    NotoSerifSC: NotoSerifSC_400Regular,
    NotoSerifTC: NotoSerifTC_400Regular,
    // Real bold faces — CJK has no synthesisable bold, so `fontWeight` alone
    // leaves characters looking thin. Used via the `font-hanzi-bold` family.
    NotoSerifSCBold: NotoSerifSC_700Bold,
    NotoSerifTCBold: NotoSerifTC_700Bold,

    // Reading Library / Story Reader faces. RN selects a weight by picking a
    // different family, so each one is registered separately — see the
    // `fontFamily` block in tailwind.config.js for the class names these back.
    NunitoBold: Nunito_700Bold,
    NunitoBlack: Nunito_900Black,
    Inter: Inter_400Regular,
    InterMedium: Inter_500Medium,
    InterSemiBold: Inter_600SemiBold,
    InterBold: Inter_700Bold,
    Lora: Lora_400Regular,
    NotoSerifTCMedium: NotoSerifTC_500Medium,
    NotoSerifTCSemiBold: NotoSerifTC_600SemiBold,
    CaveatMedium: Caveat_500Medium,
  })

  useEffect(() => {
    if (ready && fontsLoaded) SplashScreen.hideAsync().catch(() => {})
  }, [ready, fontsLoaded])

  if (!ready || !fontsLoaded) return null

  if (!onboardingComplete && pathname !== '/onboarding') {
    return <Redirect href="/onboarding" />
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <RootNavigator />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
