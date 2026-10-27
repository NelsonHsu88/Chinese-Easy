import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Animated, Platform } from 'react-native'
import { PressableScale, LiftedFace, DASH_LIFT } from './dashboard/parts'
import { DrillShell, DRILL_PAD, useDrillColumn, verdictDetailLabel } from './drills/parts'
import { drillColors as c, drillShoulders, drillShadow, drillSize, drillType as t } from './drills/tokens'
import { useSessionProgressStart } from './progress/sessionProgress'
import { Mic, MicOff, Check, ChevronRight } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { displayWord, displayPinyin, hanziFont } from '../lib/hanzi'
import { shortGloss } from '../lib/definitions'
import { SpeakButton } from './SpeakButton'
import { bestTranscript, gradePronunciation, PASS_THRESHOLD } from '../lib/pronunciation'
import { isSpeechRecognitionAvailable, startListening, type ListenSession, type RecognitionFailure } from '../lib/speechRecognition'
import { playCorrectSound, playRetryTone } from '../lib/sound'
import { correctHaptic, tapHaptic, tickHaptic } from '../lib/haptics'
import type { VocabWord } from '../types'
import { spacedReading } from './SpacedReading'

/** The mic button's diameter. */
const MIC = 104

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
  onCantSpeak,
  onClose,
  step,
  total,
  secondsLeft,
}: {
  word: VocabWord
  /** Continue on the correct sheet. */
  onPass: () => void
  onSkip: () => void
  /** "I can't speak now" — like "Can't listen now", it turns speaking off for a while (the session shows the notice); falls back to a skip. */
  onCantSpeak?: () => void
  onClose: () => void
  /** The card this word was, 1-based — the card is finished, so the bar counts it. */
  step: number
  total: number
  secondsLeft?: number | null
}) {
  const { settings } = useApp()
  const { inner } = useDrillColumn()
  /*
   * The bar keeps the flashcard header's count: the card just graded is done,
   * so it steps forward to `step` here, and the next card (which counts
   * `step + 1` as its own) opens where this left it rather than replaying.
   */
  const progressFrom = useSessionProgressStart(step + 1, total)
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
    /* The drills' right-answer ding and buzz; the correct sheet rises with its confetti (`answer` below), and its Continue moves on. */
    playCorrectSound()
    correctHaptic()
  }, [])

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

  /* Closes the mic exactly as a skip does, then lets the session turn speaking off. */
  const cantSpeak = useCallback(() => {
    skippedRef.current = true
    if (passTimer.current) clearTimeout(passTimer.current)
    sessionRef.current?.cancel()
    sessionRef.current = null
    ;(onCantSpeak ?? onSkip)()
  }, [onCantSpeak, onSkip])

  /* Continue on the correct sheet, once. */
  const passed = useRef(false)
  const pass = useCallback(() => {
    if (passed.current) return
    passed.current = true
    onPass()
  }, [onPass])

  const ringStyle = {
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.75] }) }],
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.32, 0] }),
  }

  /* Hanzi sized to the card: CJK glyphs are ~1em wide, and adjustsFontSizeToFit is iOS-only. */
  const glyphs = [...character]
  const hanziSize = Math.round(Math.max(28, Math.min(56, (inner - 110) / Math.max(1, glyphs.length))))
  const listening = status === 'listening'

  const caption =
    status === 'idle'
      ? 'Tap the mic and say the word'
      : status === 'listening'
        ? heard || 'Listening…'
        : status === 'correct'
          ? 'Nice — that’s it!'
          : status === 'miss'
            ? lastScore === 0
              ? 'Didn’t catch that — try a little louder'
              : lastScore >= PASS_THRESHOLD - 0.2
                ? `Close — ${Math.round(lastScore * 100)}% there. Hear it again, then retry.`
                : `${Math.round(lastScore * 100)}% there — listen once more and try again.`
            : ''

  /*
   * The row under the mic, in the drills' raised buttons: a quiet "I can't
   * speak now" until the learner has tried; Skip beside Try again once speaking
   * has failed them; one Continue when the mic isn't an option. A passed word
   * keeps the row's height so nothing moves while it holds.
   */
  const quiet = (label: string, onPress: () => void = skip) => (
    <PressableScale onPress={onPress} scaleTo={1} haptic={false} wrapperStyle={{ flex: 1 }} accessibilityLabel={label}>
      <LiftedFace height={drillSize.button} fill={c.card} shoulder={drillShoulders.quiet} border={c.outline} shadow={false}>
        <Text style={{ fontFamily: 'NunitoBold', ...t.button, color: c.slate }}>{label}</Text>
      </LiftedFace>
    </PressableScale>
  )
  const primary = (label: string, onPress: () => void, icon: 'mic' | 'next', flex: number) => (
    <PressableScale onPress={onPress} scaleTo={1} haptic={false} wrapperStyle={{ flex }} accessibilityLabel={label}>
      <LiftedFace height={drillSize.button} fill={c.green} shoulder={drillShoulders.primary}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon === 'mic' && <Mic size={18} color="#FFFFFF" strokeWidth={2.4} />}
          <Text style={{ fontFamily: 'NunitoBold', ...t.button, color: '#FFFFFF' }}>{label}</Text>
          {icon === 'next' && <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.4} />}
        </View>
      </LiftedFace>
    </PressableScale>
  )
  const buttons =
    status === 'blocked' ? (
      primary('Continue', skip, 'next', 1)
    ) : status === 'correct' ? (
      <View style={{ flex: 1, height: drillSize.button + DASH_LIFT }} />
    ) : status === 'miss' ? (
      <>
        {quiet('Skip')}
        {primary('Try again', listen, 'mic', 1.15)}
      </>
    ) : (
      attempts > 0 ? quiet('Skip speaking') : quiet('I can’t speak now', cantSpeak)
    )

  return (
    <DrillShell
      title="Speaking"
      step={step}
      total={total}
      secondsLeft={secondsLeft}
      onClose={onClose}
      scroll={false}
      sakuraCorner
      progress={{ shown: Math.min(step, total), from: Math.max(0, progressFrom - 1) }}
      buttons={buttons}
      /* Heard right: the same correct sheet the Mixed Drills raise — praise, confetti, the word, Continue. */
      answer={
        status === 'correct'
          ? {
              kind: 'correct',
              onContinue: pass,
              detailLabel: verdictDetailLabel('correct'),
              detail: (
                <Text numberOfLines={2} style={{ fontFamily: 'NunitoSemiBold', fontSize: 15, lineHeight: 20, color: c.slate }}>
                  <Text className={hanziFont(settings.script, 'medium')} style={{ fontSize: 18, color: c.ink }}>
                    {character}
                  </Text>
                  {'  '}— {shortGloss(word)}
                </Text>
              ),
            }
          : null
      }
    >
      <View style={{ flex: 1, minHeight: 0, paddingHorizontal: DRILL_PAD, marginTop: 18 }}>
        {/* What to say, in the drills' card. */}
        <View
          style={{
            alignItems: 'center',
            borderRadius: drillSize.radius.card,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.card,
            paddingHorizontal: 18,
            paddingTop: 16,
            paddingBottom: 18,
            ...drillShadow,
          }}
        >
          <Text style={{ fontFamily: 'NunitoExtraBold', fontSize: 11, lineHeight: 14, letterSpacing: 1.2, color: c.greenDark }}>
            SAY IT OUT LOUD
          </Text>
          {/*
           * Each character turns green as its syllable lands, so on a longer
           * word you can see which part you've already said and which one to
           * aim at next. Interim results drive it, so it fills in while you
           * are still speaking.
           */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 }}>
            <View style={{ flexDirection: 'row', flexShrink: 1 }} accessible accessibilityLabel={character}>
              {glyphs.map((glyph, i) => (
                <Text
                  key={`${glyph}-${i}`}
                  className={hanziFont(settings.script, 'semibold')}
                  style={{ fontSize: hanziSize, lineHeight: Math.round(hanziSize * 1.28), color: heardSyllables[i] ? c.green : c.ink, includeFontPadding: false }}
                >
                  {glyph}
                </Text>
              ))}
            </View>
            <SpeakButton text={character} size={20} label="Hear it first" />
          </View>
          <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: 17, lineHeight: 23, color: c.slate, marginTop: 2, textAlign: 'center' }}>
            {spacedReading(displayPinyin(word, settings.phoneticScript), 17)}
          </Text>
          <Text numberOfLines={2} style={{ fontFamily: 'NunitoBold', fontSize: 17, lineHeight: 22, color: c.ink, marginTop: 4, textAlign: 'center' }}>
            {shortGloss(word)}
          </Text>
        </View>

        {/* The mic, centred in the room left between the card and the buttons. */}
        <View style={{ flex: 1, minHeight: MIC + 72, alignItems: 'center', justifyContent: 'center' }}>
          {status === 'blocked' ? (
            <View style={{ alignItems: 'center', paddingHorizontal: 12 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.track, alignItems: 'center', justifyContent: 'center' }}>
                <MicOff size={30} color={c.slate} />
              </View>
              <Text style={{ fontFamily: 'NunitoExtraBold', fontSize: 17, lineHeight: 23, color: c.ink, textAlign: 'center', marginTop: 14 }}>
                {BLOCKED_COPY[blockedBy].title}
              </Text>
              <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: 14.5, lineHeight: 20, color: c.slate, textAlign: 'center', marginTop: 4 }}>
                {BLOCKED_COPY[blockedBy].body}
              </Text>
            </View>
          ) : (
            <>
              <View style={{ width: MIC + 48, height: MIC + 48, alignItems: 'center', justifyContent: 'center' }}>
                {/* The breathing ring while the mic is open. Plain styles: NativeWind drops className on Animated.View. */}
                {listening && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      { position: 'absolute', top: 24, left: 24, width: MIC, height: MIC, borderRadius: MIC / 2, backgroundColor: c.green },
                      ringStyle,
                    ]}
                  />
                )}
                <PressableScale
                  onPress={status === 'correct' ? undefined : listening ? () => sessionRef.current?.stop() : listen}
                  scaleTo={0.96}
                  haptic={false}
                  accessibilityLabel={listening ? 'Stop listening' : 'Start speaking'}
                >
                  <LiftedFace height={MIC} radius={MIC / 2} fill={listening ? c.greenDark : c.green} shoulder={drillShoulders.primary} style={{ width: MIC }}>
                    {status === 'correct' ? <Check size={40} color="#FFFFFF" strokeWidth={3} /> : <Mic size={38} color="#FFFFFF" strokeWidth={2.2} />}
                  </LiftedFace>
                </PressableScale>
              </View>
              {/* A fixed height: the caption changing never moves the mic. */}
              <View style={{ height: 48, justifyContent: 'center', paddingHorizontal: 8 }} accessibilityLiveRegion="polite">
                <Text
                  numberOfLines={2}
                  style={{
                    fontFamily: status === 'correct' || listening ? 'NunitoBold' : 'NunitoSemiBold',
                    fontSize: status === 'correct' ? 17 : 15,
                    lineHeight: 21,
                    color: status === 'correct' || listening ? c.greenDark : c.slate,
                    textAlign: 'center',
                  }}
                >
                  {caption}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </DrillShell>
  )
}
