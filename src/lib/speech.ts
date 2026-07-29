const PREFERRED_LANGS = ['zh-TW', 'zh-HK', 'zh-CN', 'zh']

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null
  const voices = window.speechSynthesis.getVoices()
  for (const lang of PREFERRED_LANGS) {
    const match = voices.find((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()))
    if (match) return match
  }
  return null
}

/** Speaks Chinese text aloud, preferring a Traditional (zh-TW) voice when available. */
export function speak(text: string): void {
  if (!isSpeechSupported() || !text) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = pickVoice()
  utterance.lang = voice?.lang ?? 'zh-TW'
  if (voice) utterance.voice = voice
  utterance.rate = 0.85
  window.speechSynthesis.speak(utterance)
}
