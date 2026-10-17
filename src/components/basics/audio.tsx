import { useEffect, useState, useSyncExternalStore } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { Snail, Volume2 } from 'lucide-react-native'
import { hasMandarinVoice, SLOW_SPEECH_RATE, speakTracked, stopSpeaking } from '../../lib/speech'
import { basicsColors as c } from './tokens'

/*
 * Chinese Basics' audio: one thing plays at a time, and every play button
 * knows whether it's loading, playing or idle.
 *
 * ── What plays ──────────────────────────────────────────────────────────────
 * There are no recorded Mandarin clips in the app yet, so this is the device's
 * Mandarin voice (`lib/speech.ts`, which refuses Cantonese voices). It is
 * only ever handed hanzi — a whole syllable or word — never a pinyin letter or
 * zhuyin symbol, which no voice reads reliably. Slow playback is the voice's
 * own slower rate, so its pitch is preserved.
 *
 * ── Backstops ───────────────────────────────────────────────────────────────
 * Some engines never report start or end (web without voices, a backgrounded
 * tab). A clip that hasn't started in `START_TIMEOUT_MS` is reported as
 * failed; one that has started is ended after a generous estimate of its
 * length, so no button stays stuck on "playing".
 */

export type AudioPhase = 'idle' | 'loading' | 'playing'

interface AudioState {
  id: string | null
  phase: AudioPhase
  /** Set when the last clip failed to start. */
  failed: string | null
}

const START_TIMEOUT_MS = 4000
const MS_PER_CHAR = 700
const END_MARGIN_MS = 2000

let state: AudioState = { id: null, phase: 'idle', failed: null }
let token = 0
let timer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<() => void>()

function set(next: Partial<AudioState>) {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

function clearTimer() {
  if (timer) clearTimeout(timer)
  timer = null
}

/** Plays hanzi aloud. `id` names the button that asked, so only it lights up. */
export function playZh(text: string, id: string, opts: { slow?: boolean } = {}) {
  const mine = ++token
  clearTimer()
  set({ id, phase: 'loading', failed: null })
  timer = setTimeout(() => {
    if (mine === token && state.phase === 'loading') set({ id: null, phase: 'idle', failed: id })
  }, START_TIMEOUT_MS)
  speakTracked(text, {
    rate: opts.slow ? SLOW_SPEECH_RATE : undefined,
    onStart: () => {
      if (mine !== token) return
      clearTimer()
      set({ phase: 'playing' })
      const estimate = (text.length * MS_PER_CHAR) / (opts.slow ? 0.7 : 1) + END_MARGIN_MS
      timer = setTimeout(() => {
        if (mine === token) set({ id: null, phase: 'idle' })
      }, estimate)
    },
    onEnd: () => {
      if (mine !== token) return
      clearTimer()
      set({ id: null, phase: 'idle' })
    },
    onError: () => {
      if (mine !== token) return
      clearTimer()
      set({ id: null, phase: 'idle', failed: id })
    },
  })
}

export function stopAudio() {
  token++
  clearTimer()
  stopSpeaking()
  set({ id: null, phase: 'idle' })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAudioState(): AudioState {
  return useSyncExternalStore(subscribe, () => state, () => state)
}

/** This button's phase. */
export function useAudioPhase(id: string): AudioPhase {
  const s = useAudioState()
  return s.id === id ? s.phase : 'idle'
}

/** Stops speech when the screen using it goes away. */
export function useStopAudioOnUnmount() {
  useEffect(() => stopAudio, [])
}

/**
 * Whether to warn that the device has no Mandarin voice. Null while unknown
 * or when the platform can't tell — no warning then.
 */
export function useMissingVoice(): boolean {
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    let alive = true
    void hasMandarinVoice().then((has) => {
      if (alive) setMissing(has === false)
    })
    return () => {
      alive = false
    }
  }, [])
  return missing
}

/** A round speaker button. */
export function AudioButton({
  text,
  id,
  size = 44,
  slow = false,
  label,
  soft = true,
}: {
  text: string
  id: string
  size?: number
  slow?: boolean
  label?: string
  soft?: boolean
}) {
  const key = slow ? `${id}:slow` : id
  const phase = useAudioPhase(key)
  return (
    <Pressable
      onPress={() => playZh(text, key, { slow })}
      accessibilityRole="button"
      accessibilityLabel={label ?? (slow ? `Play ${text} slowly` : `Play ${text}`)}
      accessibilityState={{ busy: phase === 'loading' }}
      hitSlop={6}
    >
      <AudioIndicator id={key} size={size} slow={slow} soft={soft} />
    </Pressable>
  )
}

/**
 * The speaker's face without a button of its own — for a row that is itself
 * the play button (a nested button is invalid on web).
 */
export function AudioIndicator({ id, size = 44, slow = false, soft = true }: { id: string; size?: number; slow?: boolean; soft?: boolean }) {
  const phase = useAudioPhase(id)
  const Icon = slow ? Snail : Volume2
  const active = phase !== 'idle'
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? c.jade : soft ? c.sageSoft : c.card,
        borderWidth: soft ? 0 : 1,
        borderColor: c.border,
      }}
    >
      {phase === 'loading' ? (
        <ActivityIndicator size="small" color={c.onSolid} />
      ) : (
        <Icon size={Math.round(size * 0.46)} color={active ? c.onSolid : c.sageDark} strokeWidth={2.1} />
      )}
    </View>
  )
}

/** The quiet notice shown when speech failed or there's no Mandarin voice. */
export function AudioNotice() {
  const { failed } = useAudioState()
  const missing = useMissingVoice()
  if (!failed && !missing) return null
  return (
    <View style={{ marginTop: 10, borderRadius: 14, padding: 12, backgroundColor: c.goldSoft }} accessibilityLiveRegion="polite">
      <Text className="font-nunito-semibold" style={{ fontSize: 13, lineHeight: 18, color: c.navy }}>
        {missing
          ? 'This device has no Mandarin voice installed, so audio may not play. Add a Chinese (Mandarin) voice in your system’s text-to-speech settings.'
          : 'The audio didn’t start. Check your volume and try again.'}
      </Text>
    </View>
  )
}
