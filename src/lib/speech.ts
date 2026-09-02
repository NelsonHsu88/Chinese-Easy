import * as Speech from 'expo-speech'
import { FALLBACK_LANGUAGE, rankMandarinTag as rank } from './mandarinLocale'

// The "never pick Cantonese" tag tables live in `mandarinLocale.ts`, shared with
// the speech *recognition* bridge, which hits exactly the same trap.

// Resolved once and reused — enumerating voices is comparatively slow, and the
// answer cannot change while the app is running.
let voicePromise: Promise<Speech.Voice | null> | null = null

/*
 * How much being a *remote* voice costs in the ranking.
 *
 * Large enough to outrank every language-tag difference, so any local Mandarin
 * voice beats any network one. Two reasons, and the second is the one that bit:
 * a network voice needs a connection to say anything, and Chrome fires no
 * `boundary` events whatsoever for its remote voices — which silently breaks
 * the story narrator, because the position it reports is the only thing the
 * green line can follow.
 *
 * This machine is the worked example. Its only zh-CN voice is Google's, which
 * is remote; `rank` scores zh-CN 0 and zh-TW 4, so the untweaked ranking chose
 * a network voice over three perfectly good local Microsoft ones and the
 * highlight never moved off the first word.
 *
 * Safe against the Cantonese trap this whole module exists for: every candidate
 * here has already been ranked as Mandarin, so preferring a local one only ever
 * chooses between Mandarin voices.
 */
const REMOTE_VOICE_PENALTY = 100

/**
 * Whether a voice is known to run on the device.
 *
 * `localService` is real on web — expo-speech's web bridge passes it straight
 * through from the browser — but absent from the declared `Voice` type and from
 * the native platforms, where it doesn't apply and boundary events work anyway.
 * Only an explicit `false` is penalised; unknown is left alone.
 */
function isRemoteVoice(voice: Speech.Voice): boolean {
  return (voice as Speech.Voice & { localService?: boolean }).localService === false
}

function mandarinVoice(): Promise<Speech.Voice | null> {
  voicePromise ??= Speech.getAvailableVoicesAsync()
    .then((voices) => {
      const usable = voices
        .map((v) => ({
          voice: v,
          score: rank(v.language) + (isRemoteVoice(v) ? REMOTE_VOICE_PENALTY : 0),
        }))
        .filter((v) => Number.isFinite(v.score))
        .sort((a, b) => a.score - b.score)
      return usable[0]?.voice ?? null
    })
    // Web and some engines don't implement voice enumeration; fall back to the
    // language tag rather than losing audio entirely.
    .catch(() => null)
  return voicePromise
}

/**
 * Reading speed, shared by the one-shot playback below and the story narrator.
 * They must agree: the narrator calibrates a characters-per-second figure from
 * how fast this rate actually speaks, and uses it to size its skip steps.
 */
export const SPEECH_RATE = 0.85

/** Speaks Chinese text aloud in Mandarin, never Cantonese. */
export function speak(text: string): void {
  if (!text) return
  Speech.stop()
  void mandarinVoice().then((voice) => {
    Speech.speak(text, {
      language: voice?.language ?? FALLBACK_LANGUAGE,
      voice: voice?.identifier,
      rate: SPEECH_RATE,
    })
  })
}

export interface ProgressSpeechOptions {
  /**
   * Fired as each word begins, with its offset **into the text passed here** —
   * the caller adds its own base offset if it handed over a slice.
   */
  onBoundary?: (charIndex: number) => void
  /** The whole run finished on its own. Not called when `Speech.stop()` cuts it short. */
  onDone?: () => void
}

/**
 * Speaks a run of text, reporting the position of each word as it is uttered.
 *
 * This is the story narrator's engine. `onBoundary` is the only position signal
 * a text-to-speech engine offers — there is no duration, no current time and no
 * seek — so everything the audiobook controls do is built on top of it: the
 * green underline follows it, and the skip buttons convert seconds into a
 * character offset using the speed it reveals.
 *
 * Callers must treat `onDone` as advisory and guard it with their own
 * cancellation flag. Web fires the underlying `end` event for a cancelled
 * utterance as well as a finished one, so a bare `onDone` would turn "the
 * learner pressed pause" into "the page finished, turn to the next one".
 */
export function speakWithProgress(text: string, opts: ProgressSpeechOptions): void {
  if (!text) {
    opts.onDone?.()
    return
  }
  void mandarinVoice().then((voice) => {
    Speech.speak(text, {
      language: voice?.language ?? FALLBACK_LANGUAGE,
      voice: voice?.identifier,
      rate: SPEECH_RATE,
      // Native reports a `{ charIndex, charLength }` object; web hands back a
      // SpeechSynthesisEvent carrying the same field. expo-speech types the
      // callback as the union of the two, which is too wide to infer a
      // parameter from — hence the explicit annotation covering both.
      onBoundary: (event: { charIndex?: number } | undefined) => {
        const at = event?.charIndex
        if (typeof at === 'number') opts.onBoundary?.(at)
      },
      onDone: () => opts.onDone?.(),
    })
  })
}

/** Silences whatever is being spoken. Safe to call when nothing is. */
export function stopSpeaking(): void {
  void Speech.stop()
}
