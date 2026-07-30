import '../global.css'
import { useEffect } from 'react'
import { Stack, Redirect, usePathname } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import { Nunito_400Regular } from '@expo-google-fonts/nunito'
import { NotoSerifSC_400Regular } from '@expo-google-fonts/noto-serif-sc'
import { NotoSerifTC_400Regular } from '@expo-google-fonts/noto-serif-tc'
import { AppProvider, useApp } from '../context/AppContext'

SplashScreen.preventAutoHideAsync().catch(() => {})

function RootNavigator() {
  const { ready, onboardingComplete } = useApp()
  const pathname = usePathname()
  const [fontsLoaded] = useFonts({
    Nunito: Nunito_400Regular,
    NotoSerifSC: NotoSerifSC_400Regular,
    NotoSerifTC: NotoSerifTC_400Regular,
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
