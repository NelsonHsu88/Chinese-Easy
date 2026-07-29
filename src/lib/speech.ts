import * as Speech from 'expo-speech'

/** Speaks Chinese text aloud, preferring a Traditional (zh-TW) voice when available. */
export function speak(text: string): void {
  if (!text) return
  Speech.stop()
  Speech.speak(text, { language: 'zh-TW', rate: 0.85 })
}
