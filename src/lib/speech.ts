import * as Speech from 'expo-speech'

/**
 * Mandarin locale tags, best match first. Asking for a language alone is not
 * enough: if the device has no voice for the exact tag it falls back to any
 * "Chinese" voice it does have, and on a lot of Android builds that is
 * Cantonese. So we resolve an explicit voice ourselves and pass its identifier.
 *
 * zh-CN leads because it is the tag engines most reliably map to Mandarin.
 * zh-TW is Mandarin too and matches the app's traditional script, so it is
 * preferred over the generic tags but is no longer trusted on its own.
 */
const MANDARIN_TAGS = ['zh-cn', 'zh-hans', 'cmn-hans', 'cmn', 'zh-tw', 'zh-hant-tw', 'zh-hant', 'zh']

/** Cantonese tags. These are "Chinese" but must never be selected. */
const CANTONESE_TAGS = ['yue', 'zh-hk', 'zh-hant-hk', 'zh-yue', 'zh-cantonese']

/** Language passed when no specific voice could be resolved. */
const FALLBACK_LANGUAGE = 'zh-CN'

function normalise(tag: string | undefined): string {
  return (tag ?? '').toLowerCase().replace(/_/g, '-')
}

function isCantonese(tag: string | undefined): boolean {
  const t = normalise(tag)
  return CANTONESE_TAGS.some((c) => t.startsWith(c))
}

/** Lower is better; Infinity means "not a Mandarin voice we want". */
function rank(tag: string | undefined): number {
  const t = normalise(tag)
  if (!t || isCantonese(t)) return Infinity
  const i = MANDARIN_TAGS.findIndex((m) => t.startsWith(m))
  return i === -1 ? Infinity : i
}

// Resolved once and reused — enumerating voices is comparatively slow, and the
// answer cannot change while the app is running.
let voicePromise: Promise<Speech.Voice | null> | null = null

function mandarinVoice(): Promise<Speech.Voice | null> {
  voicePromise ??= Speech.getAvailableVoicesAsync()
    .then((voices) => {
      const usable = voices
        .map((v) => ({ voice: v, score: rank(v.language) }))
        .filter((v) => v.score !== Infinity)
        .sort((a, b) => a.score - b.score)
      return usable[0]?.voice ?? null
    })
    // Web and some engines don't implement voice enumeration; fall back to the
    // language tag rather than losing audio entirely.
    .catch(() => null)
  return voicePromise
}

/** Speaks Chinese text aloud in Mandarin, never Cantonese. */
export function speak(text: string): void {
  if (!text) return
  Speech.stop()
  void mandarinVoice().then((voice) => {
    Speech.speak(text, {
      language: voice?.language ?? FALLBACK_LANGUAGE,
      voice: voice?.identifier,
      rate: 0.85,
    })
  })
}
