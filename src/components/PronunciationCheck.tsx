import { RaisedButton } from './dashboard/parts'
import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, Animated, Platform } from 'react-native'
import { Mic, MicOff, Check, ChevronRight } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { displayWord, displayPinyin, hanziFont } from '../lib/hanzi'
import { shortGloss } from '../lib/definitions'
import { SpeakButton } from './SpeakButton'
import { bestTranscript, gradePronunciation, PASS_THRESHOLD } from '../lib/pronunciation'
import { isSpeechRecognitionAvailable, startListening, type ListenSession, type RecognitionFailure } from '../lib/speechRecognition'
import { playPositiveChime, playRetryTone } from '../lib/sound'
import { celebrateHaptic, tapHaptic, tickHaptic } from '../lib/haptics'
import type { VocabWord } from '../types'
import { spacedReading } from './SpacedReading'

/** The raised buttons' faces and shoulders: Tailwind's `brand-500` on `brand-700`, and a quiet white on slate-300. */
const BRAND = '#22c55e'
const BRAND_SHOULDER = '#15803d'
const QUIET = '#ffffff'
const QUIET_BORDER = '#cbd5e1'

type Status =
  /** Waiting for the learner to tap the mic. */
  | 'idle'
  /** Microphone open. */
  | 'listening'
  /** Heard the word — passing through to the next card. */
  | 'correct'
  /** Heard something else, or nothing. */
  | 'miss'
  /** Can't listen at all: no engine, or permission refused. */
  | 'blocked'

/**
 * How long the green success state is held before the session moves on.
 *
 * Long enough to be read as a result rather than a flicker: the characters have
 * just turned green one by one, and cutting away the instant the last one lands
 * throws away the only confirmation the learner gets. Not longer, though — this
 * sits between two cards in a drill, and a genuine pause of any length turns
 * into waiting.
 */
const PASS_HOLD_MS = 1500

const BLOCKED_COPY: Record<'unavailable' | 'permission', { title: string; body: string }> = {
  unavailable: {
    title: 'Speaking practice unavailable',
    body: "This device can't do speech recognition, so this step is optional here.",
  },
  permission: {
    title: 'Microphone is off',
    body: 'Allow microphone access in your device settings to check your pronunciation.',
  },
}

/**
 * The speaking gate between one card and the next: say the word you just
 * finished, and the card advances once the recogniser hears it.
 *
 * Always escapable. Speaking out loud isn't possible on a bus, in an office, or
 * for everyone at all, so the skip is a permanent fixture rather than a
 * consolation that appears after enough failures — it just gets more prominent
 * once the learner has actually tried.
 */
export function PronunciationCheck({
  word,
  onPass,
  onSkip,
}: {
  word: VocabWord
  onPass: () => void
  onSkip: () => void
}) {
  const { settings } = useApp()
  const [status, setStatus] = useState<Status>(() => (isSpeechRecognitionAvailable() ? 'idle' : 'blocked'))
  const [blockedBy, setBlockedBy] = useState<'unavailable' | 'permission'>('unavailable')
  const [heard, setHeard] = useState('')
  const [attempts, setAttempts] = useState(0)
  /**
   * Which syllables of the target have landed. One entry per character, since a
   * Han character is exactly one syllable — a word whose pinyin doesn't split
   * that way simply never lights up, which is a missing flourish rather than a
   * broken screen.
   */
  const [heardSyllables, setHeardSyllables] = useState<boolean[]>([])

  const sessionRef = useRef<ListenSession | null>(null)
  /*
   * Set from the tap until the attempt ends. State alone can't guard this: a
   * second tap before the re-render saw the old status and opened a second
   * recognition session, of which only one was ever closed.
   */
  const attemptOpen = useRef(false)
  const alive = useRef(true)
  const skippedRef = useRef(false)
  const matchedRef = useRef(false)
  /** Best score this attempt reached, so a near miss can be told apart from a wrong word. */
  const scoreRef = useRef(0)
  const passTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [lastScore, setLastScore] = useState(0)

  const character = displayWord(word, settings.script)

  // A new word starts unspoken, however far through the last one we got.
  useEffect(() => {
    setHeardSyllables([])
  }, [word.id])

  // The mic must not outlive the screen: leaving it open would keep recording
  // into a session the learner has already left.
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      sessionRef.current?.cancel()
      sessionRef.current = null
      if (passTimer.current) clearTimeout(passTimer.current)
    }
  }, [])

  /*
   * A ring breathing out from the mic while it's open. RN's own Animated rather
   * than Reanimated, whose update loop doesn't drive on this project's web
   * target; layout stays untouched so the native driver can carry it.
   */
  const pulse = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (status !== 'listening') {
      pulse.setValue(0)
      return
    }
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: Platform.OS !== 'web',
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [status, pulse])

  const succeed = useCallback(() => {
    setStatus('correct')
    playPositiveChime()
    celebrateHaptic()
    passTimer.current = setTimeout(onPass, PASS_HOLD_MS)
  }, [onPass])

  const listen = useCallback(async () => {
    if (status === 'listening' || attemptOpen.current) return
    attemptOpen.current = true
    tapHaptic()
    matchedRef.current = false
    scoreRef.current = 0
    setHeard('')
    setHeardSyllables([])
    setStatus('listening')

    const session = await startListening({
      onResult: (transcripts, isFinal) => {
        const best = bestTranscript(transcripts)
        if (best) setHeard(best)
        if (matchedRef.current) return

        const result = gradePronunciation(word, transcripts)
        // Kept even on a miss, so the retry copy can say how close it was rather
        // than only what it thought it heard.
        scoreRef.current = Math.max(scoreRef.current, result.score)
        // Only ever adds. A later interim result can drop a syllable the engine
        // had already committed to, and a character that goes green and then
        // grey again reads as the app changing its mind about work you did.
        setHeardSyllables((prev) => {
          const next = result.heard.map((landed, i) => landed || prev[i] === true)
          // One detent per syllable as it lands, so a two-syllable word can be
          // felt arriving in two pieces without looking at the screen. Fired
          // from the updater so it can't double up on a re-render that hasn't
          // actually changed anything.
          if (next.some((landed, i) => landed && !prev[i])) tickHaptic()
          return next
        })
        if (result.passed) {
          matchedRef.current = true
          // Close the mic as soon as the word is heard rather than waiting out
          // the trailing silence — the learner has already finished speaking.
          // A final non-match needs no handling here: `end` follows it and
          // decides the outcome.
          sessionRef.current?.stop()
        }
      },
      onEnd: () => {
        sessionRef.current = null
        attemptOpen.current = false
        // Cancelled by a skip or by leaving: nothing to judge, and the retry
        // tone would mark the way out as a mistake.
        if (!alive.current || skippedRef.current) return
        setLastScore(scoreRef.current)
        if (matchedRef.current) {
          succeed()
        } else {
          setAttempts((a) => a + 1)
          setStatus('miss')
          playRetryTone()
        }
      },
      onFailure: (reason: RecognitionFailure, _message) => {
        if (reason === 'permission' || reason === 'unavailable') {
          attemptOpen.current = false
          setBlockedBy(reason)
          setStatus('blocked')
        }
        // 'no-speech' and 'error' fall through to `onEnd`, which shows the miss
        // state with whatever was (or wasn't) heard.
      },
    })

    // The learner left while the mic was starting: close it rather than keep
    // recording for a screen that is gone.
    if (!alive.current) {
      session?.cancel()
      return
    }
    if (session) {
      // Only if this attempt is still running — an engine that ended at once has
      // already been through `onEnd`.
      if (attemptOpen.current) sessionRef.current = session
      return
    }
    // Couldn't start, and `onEnd` will never come. Unless that was a refusal
    // (already shown as blocked), offer another try instead of a dead mic.
    if (attemptOpen.current) {
      attemptOpen.current = false
      setAttempts((a) => a + 1)
      setStatus('miss')
    }
  }, [status, succeed, word])

  const skip = useCallback(() => {
    skippedRef.current = true
    if (passTimer.current) clearTimeout(passTimer.current)
    sessionRef.current?.cancel()
    sessionRef.current = null
    onSkip()
  }, [onSkip])

  const ringStyle = {
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) }],
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
  }

  return (
    <View className="flex-1 justify-between px-4 pb-6 pt-2">
      <View className="items-center gap-1 pt-2">
        <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">Say it out loud</Text>
      </View>

      {/* What to say, with the model pronunciation on tap. */}
      <View className="items-center gap-3 rounded-3xl bg-white p-6 shadow-card dark:bg-slate-900">
        {/*
         * Each character turns green as its syllable lands, so on a longer word
         * you can see which part you've already said and which one to aim at
         * next — rather than one verdict once the mic closes. Interim results
         * drive it, so it fills in while you're still speaking.
         */}
        <View className="flex-row items-center gap-3">
          <View className="flex-row">
            {[...character].map((glyph, i) => (
              <Text
                key={`${glyph}-${i}`}
                className={`${hanziFont(settings.script, 'semibold')} text-[44px] leading-[56px] ${
                  heardSyllables[i] ? 'text-brand-500 dark:text-brand-400' : 'text-slate-900 dark:text-white'
                }`}
              >
                {glyph}
              </Text>
            ))}
          </View>
          <SpeakButton text={character} size={20} label="Hear it first" />
        </View>
        <Text className="text-lg font-medium text-slate-400">{spacedReading(displayPinyin(word, settings.phoneticScript), 18)}</Text>
        <Text className="text-center text-base font-semibold text-slate-700 dark:text-slate-300">{shortGloss(word)}</Text>
      </View>

      <View className="items-center gap-4">
        {status === 'blocked' ? (
          <View className="items-center gap-2 px-4">
            <View className="rounded-full bg-slate-100 p-4 dark:bg-slate-800">
              <MicOff size={28} color="#94a3b8" />
            </View>
            <Text className="text-center text-base font-bold text-slate-700 dark:text-slate-200">
              {BLOCKED_COPY[blockedBy].title}
            </Text>
            <Text className="text-center text-sm text-slate-500 dark:text-slate-400">{BLOCKED_COPY[blockedBy].body}</Text>
          </View>
        ) : (
          <>
            <Pressable
              onPress={status === 'listening' ? () => sessionRef.current?.stop() : listen}
              disabled={status === 'correct'}
              accessibilityRole="button"
              accessibilityLabel={status === 'listening' ? 'Stop listening' : 'Start speaking'}
              className="items-center justify-center"
            >
              <View className="h-24 w-24 items-center justify-center">
                {/* NativeWind drops `className` on an Animated.View, so the ring
                    carries plain styles and the button below keeps its classes. */}
                {status === 'listening' && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      {
                        position: 'absolute',
                        height: 88,
                        width: 88,
                        borderRadius: 44,
                        backgroundColor: '#22c55e',
                      },
                      ringStyle,
                    ]}
                  />
                )}
                {/* Green in every state rather than the app's usual dark
                    primary: a lucide icon takes a fixed colour, so a
                    `dark:bg-white` button would leave a white mic on white. */}
                <View
                  className={`h-[88px] w-[88px] items-center justify-center rounded-full shadow-card ${
                    status === 'listening' ? 'bg-brand-600' : 'bg-brand-500'
                  }`}
                >
                  {status === 'correct' ? (
                    <Check size={38} color="#ffffff" strokeWidth={3} />
                  ) : (
                    <Mic size={34} color="#ffffff" />
                  )}
                </View>
              </View>
            </Pressable>

            <View className="h-12 items-center justify-center px-4">
              {status === 'idle' && (
                <Text className="text-center text-sm text-slate-500 dark:text-slate-400">
                  {attempts === 0 ? 'Tap the mic and say the word' : 'Tap to try again'}
                </Text>
              )}
              {status === 'listening' && (
                <Text className="text-center text-sm font-semibold text-brand-600 dark:text-brand-400">
                  {heard ? heard : 'Listening…'}
                </Text>
              )}
              {status === 'correct' && (
                <Text className="text-center text-base font-bold text-brand-600 dark:text-brand-400">Nice — that's it!</Text>
              )}
              {/*
               * The miss copy leads with how close the *sounds* were, not with
               * the characters the recogniser wrote. Since grading moved to
               * pronunciation, "Heard 寫寫" is often the engine picking a
               * homophone off an attempt that was nearly right — which reads as
               * being marked wrong for saying a word you never said.
               */}
              {status === 'miss' && (
                <Text className="text-center text-sm text-slate-500 dark:text-slate-400">
                  {lastScore === 0
                    ? "Didn't catch that — try again a little louder"
                    : lastScore >= PASS_THRESHOLD - 0.2
                      ? `Close — ${Math.round(lastScore * 100)}% of the way there. Hear it again, then have another go.`
                      : `That came out ${Math.round(lastScore * 100)}% of the way there — listen once more and try again.`}
                </Text>
              )}
            </View>
          </>
        )}
      </View>

      <View className="gap-3">
        {status === 'miss' && (
          <RaisedButton onPress={listen} accessibilityLabel="Try again" height={56} radius={16} fill={BRAND} shoulder={BRAND_SHOULDER}>
            <Mic size={20} color="#ffffff" />
            <Text className="text-lg font-bold text-white">Try again</Text>
          </RaisedButton>
        )}

        {/*
         * The way out. Quiet while the learner hasn't tried yet so it doesn't
         * read as the expected choice, then a full button once speaking has
         * failed them — or straight away when the mic isn't an option at all.
         */}
        {status === 'blocked' || attempts > 0 ? (
          <RaisedButton
            onPress={skip}
            accessibilityLabel={status === 'blocked' ? 'Continue' : 'Skip speaking'}
            height={56}
            radius={16}
            fill={status === 'blocked' ? BRAND : QUIET}
            border={status === 'blocked' ? undefined : QUIET_BORDER}
            shoulder={status === 'blocked' ? BRAND_SHOULDER : QUIET_BORDER}
          >
            <Text
              className={`text-base font-bold ${status === 'blocked' ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}
            >
              {status === 'blocked' ? 'Continue' : 'Skip speaking'}
            </Text>
            <ChevronRight size={18} color={status === 'blocked' ? '#ffffff' : '#64748b'} />
          </RaisedButton>
        ) : (
          <Pressable onPress={skip} accessibilityRole="button" className="flex-row items-center justify-center gap-1.5 py-2">
            <Text className="text-sm font-semibold text-slate-400">I can't speak right now</Text>
            <ChevronRight size={15} color="#94a3b8" />
          </Pressable>
        )}
      </View>
    </View>
  )
}
