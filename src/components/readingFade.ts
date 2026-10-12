import { useEffect, useRef } from 'react'
import { Animated, Easing, Platform } from 'react-native'
import { useApp } from '../context/AppContext'

/** How long the readings take to fade when the learner switches them. */
const FADE_MS = 220

/**
 * The opacity for a pinyin/zhuyin line under running Chinese text — 1 with
 * `settings.showReadings` on, 0 with it off.
 *
 * **Hidden, never removed.** A reading is laid out either way, so switching
 * them off leaves every character exactly where it was: the line under each
 * word is still there, just transparent. Taking the readings out of layout
 * instead would close up the rows and the whole sentence would jump — which is
 * the one thing the switch must not do while someone is mid-sentence.
 *
 * Put it on a plain `Animated.View` wrapping the reading's `Text`, not on an
 * `Animated.Text`: NativeWind drops `className` on Animated components.
 */
export function useReadingFade() {
  const { settings } = useApp()
  const show = settings.showReadings
  const opacity = useRef(new Animated.Value(show ? 1 : 0)).current

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: show ? 1 : 0,
      duration: FADE_MS,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    }).start()
    // Backstop for a stalled browser tab (see CLAUDE.md, Animation).
    const backstop = setTimeout(() => opacity.setValue(show ? 1 : 0), FADE_MS + 150)
    return () => clearTimeout(backstop)
  }, [show, opacity])

  return { opacity, hidden: !show }
}
