import { requireOptionalNativeModule } from 'expo'
import type { ExpoSpeechRecognitionModule as SpeechModule } from 'expo-speech-recognition'
import { FALLBACK_LANGUAGE, bestMandarinTag } from './mandarinLocale'

/*
 * Microphone + speech-to-text, as a thin bridge over `expo-speech-recognition`.
 *
 * Recognition runs on the platform's own engine — SFSpeechRecognizer on iOS,
 * SpeechRecognizer on Android, the Web Speech API in the browser — so there is
 * no API key and nothing is billed per use.
 *
 * Everything here fails soft. A device with no Mandarin model, a denied
 * permission and a browser without the Web Speech API all resolve to "not
 * available" rather than throwing, because the caller's fallback (let the
 * learner skip) is the same in every case.
 *
 * That softness has to start at the import. `expo-speech-recognition` calls
 * `requireNativeModule` at module scope, which *throws* when the native module
 * isn't linked — and it isn't in Expo Go, which only carries the modules in the
 * Expo SDK. A static import therefore crashed the whole app on launch there
 * rather than disabling one optional step, so the module is both probed for and
 * resolved lazily below, and its absence is just another "not available".
 */

/**
 * The native module, or null where it doesn't exist.
 *
 * `undefined` means "not looked up yet" — the lookup is done once and the answer
 * cached, including the negative one, since a missing native module cannot
 * appear later in the same process.
 */
let nativeModule: typeof SpeechModule | null | undefined

/** The module, or a throw that every caller below already handles. */
function requireSpeech(): typeof SpeechModule {
  const module = speechModule()
  if (!module) throw new Error('Speech recognition is not available on this device.')
  return module
}

/** The name `expo-speech-recognition` registers its native module under. */
const NATIVE_MODULE_NAME = 'ExpoSpeechRecognition'

/**
 * Whether the native side actually exists in this binary.
 *
 * ── Why the try/catch below is not enough on its own ─────────────────────────
 * `expo-speech-recognition` calls `requireNativeModule` at module scope, which
 * throws where the module isn't linked. Wrapping the `require` in a try looks
 * like it handles that, and in a development build it does not, because Metro
 * never lets the exception reach us:
 *
 *     catch (e) { global.ErrorUtils.reportFatalError(e) }   // ← swallowed
 *                        - metro-runtime/src/polyfills/require.js
 *
 * A module whose body throws is reported to LogBox as a **fatal error** and
 * `require()` returns `undefined`; nothing is re-thrown, so `catch` never runs.
 * The result was correct — reading `.ExpoSpeechRecognitionModule` off
 * `undefined` threw a TypeError that *was* caught, so this resolved to null and
 * pronunciation practice degraded to "unavailable" exactly as designed — but
 * the learner also got a full-screen error about a module they will never have
 * in Expo Go.
 *
 * So the import has to be *avoided* rather than caught.
 * `requireOptionalNativeModule` is the non-throwing sibling of
 * `requireNativeModule`: same lookup, returns null instead of raising. It can
 * never be more restrictive than the package's own call, so a build that has
 * the module still gets it.
 *
 * Same defect, same shape of fix, as `lib/ads/nativeModule.ts`.
 */
function nativeModuleRegistered(): boolean {
  try {
    return requireOptionalNativeModule(NATIVE_MODULE_NAME) != null
  } catch {
    return false
  }
}

function speechModule(): typeof SpeechModule | null {
  if (nativeModule !== undefined) return nativeModule

  /* Ask before importing - a `require` of the package where the native module
     is missing is not recoverable. See `nativeModuleRegistered`. */
  if (!nativeModuleRegistered()) {
    nativeModule = null
    return nativeModule
  }

  try {
    // Required rather than imported: the package's body still touches native on
    // evaluation, and that has to land inside this try.
    nativeModule = (require('expo-speech-recognition') as { ExpoSpeechRecognitionModule: typeof SpeechModule })
      .ExpoSpeechRecognitionModule
  } catch {
    nativeModule = null
  }
  return nativeModule
}

/** Why listening couldn't produce an answer. The UI wording differs per case. */
export type RecognitionFailure =
  /** No engine, no Mandarin model, or a browser that doesn't implement it. */
  | 'unavailable'
  /** Microphone or speech-recognition permission was refused. */
  | 'permission'
  /** The engine ran but heard nothing it could transcribe. */
  | 'no-speech'
  /** Anything else the engine reported. */
  | 'error'

export interface ListenHandlers {
  /** Candidate transcripts for the current utterance, best first. */
  onResult: (transcripts: string[], isFinal: boolean) => void
  /** The engine stopped, for any reason. Always fires exactly once per session. */
  onEnd: () => void
  onFailure: (reason: RecognitionFailure, message: string) => void
}

/** Handle on a listening session. `stop` asks for a final result; `cancel` throws it away. */
export interface ListenSession {
  stop: () => void
  cancel: () => void
}

/**
 * How long to keep the microphone open before giving up.
 *
 * The engines have their own silence detection, but it is inconsistent — some
 * Android builds will sit open indefinitely if the room is noisy. A single word
 * never needs longer than this, and a mic that never closes reads as a hang.
 */
const MAX_LISTEN_MS = 8000

/** Whether the current device/browser can do speech recognition at all. */
export function isSpeechRecognitionAvailable(): boolean {
  try {
    // No native module (Expo Go) or no Web Speech API — same answer either way.
    return speechModule()?.isRecognitionAvailable() ?? false
  } catch {
    return false
  }
}

/*
 * Resolved once and reused. Enumerating locales is comparatively slow and the
 * answer can't change while the app runs — the same reasoning as the voice
 * lookup in `speech.ts`.
 */
let localePromise: Promise<string> | null = null

function mandarinLocale(): Promise<string> {
  // Wrapped in `Promise.resolve().then` so that a missing native module throws
  // *inside* the chain and lands in the catch below, rather than synchronously
  // past it.
  localePromise ??= Promise.resolve()
    .then(() => requireSpeech().getSupportedLocales({}))
    .then(({ locales, installedLocales }) => {
      // An installed model works offline and starts faster, so it wins when the
      // device has one; otherwise fall back to anything merely supported.
      return bestMandarinTag(installedLocales) ?? bestMandarinTag(locales) ?? FALLBACK_LANGUAGE
    })
    // Web and some Android services don't implement enumeration; asking for the
    // fallback tag directly is better than losing recognition entirely.
    .catch(() => FALLBACK_LANGUAGE)
  return localePromise
}

/** Asks for microphone/recognition permission, resolving false rather than throwing. */
async function ensureSpeechPermission(): Promise<boolean> {
  try {
    const current = await requireSpeech().getPermissionsAsync()
    if (current.granted) return true
    const requested = await requireSpeech().requestPermissionsAsync()
    return requested.granted
  } catch {
    return false
  }
}

/**
 * Opens the microphone and reports what it hears.
 *
 * Resolves to a session handle once the engine has actually been started, or to
 * `null` if it couldn't start — in which case `onFailure` has already fired and
 * `onEnd` never will.
 */
export async function startListening(handlers: ListenHandlers): Promise<ListenSession | null> {
  if (!isSpeechRecognitionAvailable()) {
    handlers.onFailure('unavailable', 'Speech recognition is not available on this device.')
    return null
  }

  const speech = speechModule()
  if (!speech) {
    handlers.onFailure('unavailable', 'Speech recognition is not available on this device.')
    return null
  }

  if (!(await ensureSpeechPermission())) {
    handlers.onFailure('permission', 'Microphone access is needed to check your pronunciation.')
    return null
  }

  const lang = await mandarinLocale()

  // One `end` for the caller no matter how the engine unwinds: `error` is
  // followed by `end` on some platforms and not others, and a stuck screen is
  // worse than a duplicate-free guarantee is expensive.
  let closed = false
  let timer: ReturnType<typeof setTimeout> | null = null

  const subscriptions = [
    speech.addListener('result', (event) => {
      handlers.onResult(
        event.results.map((r) => r.transcript).filter(Boolean),
        event.isFinal,
      )
    }),
    speech.addListener('nomatch', () => {
      handlers.onFailure('no-speech', "Didn't catch that.")
    }),
    speech.addListener('error', (event) => {
      // `aborted` is this module cancelling on purpose (unmount, or the learner
      // skipping) — reporting it back as a failure would flash an error at
      // someone who is already on their way somewhere else.
      if (event.error === 'aborted') return
      if (event.error === 'no-speech') handlers.onFailure('no-speech', "Didn't catch that.")
      else if (event.error === 'not-allowed' || event.error === 'service-not-allowed')
        handlers.onFailure('permission', 'Microphone access is needed to check your pronunciation.')
      else handlers.onFailure('error', event.message || 'The microphone stopped unexpectedly.')
    }),
    speech.addListener('end', () => close()),
  ]

  function close() {
    if (closed) return
    closed = true
    if (timer) clearTimeout(timer)
    for (const sub of subscriptions) sub.remove()
    handlers.onEnd()
  }

  try {
    speech.start({
      lang,
      // One word, one answer — `continuous` would keep the mic open past it.
      continuous: false,
      // Interim results are what make the mic feel alive while someone speaks.
      interimResults: true,
      // Mandarin is dense in homophones; extra candidates give the character
      // match a fair chance at a word the top guess got contextually wrong.
      maxAlternatives: 5,
    })
  } catch (error) {
    handlers.onFailure('error', error instanceof Error ? error.message : 'Could not start the microphone.')
    for (const sub of subscriptions) sub.remove()
    closed = true
    return null
  }

  timer = setTimeout(() => {
    try {
      speech.stop()
    } catch {
      close()
    }
  }, MAX_LISTEN_MS)

  return {
    stop: () => {
      try {
        speech.stop()
      } catch {
        close()
      }
    },
    cancel: () => {
      try {
        speech.abort()
      } catch {
        // fall through to close() below
      }
      close()
    },
  }
}
