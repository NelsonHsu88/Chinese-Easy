import { useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  Image,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
} from 'react-native'
import { Volume2, RotateCcw, Check, X, History, HeadphoneOff } from 'lucide-react-native'
import { useApp, type WordListened } from '../context/AppContext'
import { displayWord, displayPinyin, hanziFont } from '../lib/hanzi'
import { speak, stopSpeaking, SLOW_SPEECH_RATE } from '../lib/speech'
import { playCorrectSound, playRetryTone } from '../lib/sound'
import { carefulHaptic, correctHaptic, tickHaptic, tapHaptic } from '../lib/haptics'
import { shortGloss } from '../lib/definitions'
import { DrillShell, AnswerButtons, DRILL_PAD, verdictDetailLabel } from './drills/parts'
import { useAnswerReaction } from './motion/questionMotion'
import { AnswerShimmer, AnswerSparks } from './motion/answerFeedback'
/* The verdict palette is the placement test's, imported rather than re-picked:
   the same judgement should be the same colour wherever the learner meets it. */
import { onbVerdict, type VerdictKind } from './onboarding/tokens'
import { playTints } from './dashboard/tokens'
import {
  listenColors as c,
  listenType as t,
  listenSize,
  listenShadow,
  LISTEN_CARD_ART_RATIO,
  LISTEN_CONTENT_MAX,
} from './listening/tokens'
import { listenArt } from './listening/art'
import type { PhoneticScript, ScriptMode, VocabWord } from '../types'
import { useLearningLoaderGone } from './loading/LearningLoader'

const SCREEN_PAD = DRILL_PAD

/**
 * The listening drill, built to the Beta 2.1 reference (`SS930 Listening UI
 * Redesigned.png`): the word is spoken aloud and the learner picks which of
 * four words they heard, then checks the answer.
 *
 * It owns its whole screen — header, progress, card, buttons — because the
 * reference gives it a chrome of its own (a titled header with a Recent
 * button) rather than the session's generic one.
 *
 * Options show the English and the characters but **not the reading until the
 * answer is checked**. The reference prints pinyin on every option; that was
 * left out on purpose, because pinyin is a transcript of the audio and showing
 * it turns "which word did you hear?" into matching a spelling. After checking
 * it appears on every row, which is when it teaches something.
 *
 * Mount with a `key` per step so the auto-play and answer state reset per word.
 */
export function ReviewListening({
  word,
  options,
  onAnswer,
  onSkip,
  onCantListen,
  onClose,
  step,
  total,
  secondsLeft,
}: {
  word: VocabWord
  options: VocabWord[]
  onAnswer: (correct: boolean) => void
  /** "I don't know" — sends the word to the back of the session queue ungraded. */
  onSkip?: () => void
  /** "Can't listen now" — turns listening off for a while; the session swaps this question for another kind, ungraded. */
  onCantListen?: () => void
  onClose: () => void
  step: number
  total: number
  /** Quick review's countdown, when there is one. */
  secondsLeft?: number | null
}) {
  const { settings, listeningHistory, noteWordListened, getWord } = useApp()
  const { width } = useWindowDimensions()
  const column = Math.min(width, LISTEN_CONTENT_MAX)
  const cardWidth = column - SCREEN_PAD * 2

  /** Selected but not yet committed — the radio, before Check Answer. */
  const [selectedId, setSelectedId] = useState<string | null>(null)
  /** Set by Check Answer. Options are uncoloured until then, so there is no shopping for the green one. */
  const [checked, setChecked] = useState(false)
  /** Set by "I don't know": the answer is shown, but nothing was guessed. */
  const [gaveUp, setGaveUp] = useState(false)
  const [showRecent, setShowRecent] = useState(false)
  const spokenText = displayWord(word, settings.script)

  // Play once on arrival, the way a listening exercise opens itself — but not
  // under the learning loader: a session that opens on a listening question
  // waits until Shifu has gone, so the word isn't spoken to a loading screen.
  const loaderGone = useLearningLoaderGone()
  useEffect(() => {
    if (loaderGone) speak(spokenText)
  }, [spokenText, loaderGone])
  // Closing the drill mid-word mustn't leave the voice talking over the hub.
  useEffect(() => () => stopSpeaking(), [])

  const answered = checked || gaveUp
  const wasCorrect = checked && selectedId === word.id

  /*
   * Three verdicts, not two, and they are the onboarding placement test's.
   * Gold for "I don't know", which is deliberately neither: an honest admission
   * is not a mistake, and colouring it like one teaches the learner to guess.
   */
  const verdict: VerdictKind = gaveUp ? 'unsure' : wasCorrect ? 'correct' : 'incorrect'

  const handleCheck = () => {
    if (answered || !selectedId) return
    setChecked(true)
    const correct = selectedId === word.id
    noteWordListened(word.id, correct ? 'correct' : 'incorrect')
    if (correct) {
      playCorrectSound()
      correctHaptic()
    } else {
      playRetryTone()
      carefulHaptic()
    }
  }

  /*
   * Giving up still shows the answer before moving on. Skipping straight past
   * it would make "I don't know" the fastest way through the drill and teach
   * nothing. No sound — this is not a failure, and the retry tone would say it was.
   */
  const handleGiveUp = () => {
    if (answered) return
    setGaveUp(true)
    noteWordListened(word.id, 'unsure')
    tickHaptic()
  }

  const handleContinue = () => (gaveUp ? onSkip?.() : onAnswer(wasCorrect))

  const artWidth = cardWidth * listenSize.artShare

  return (
    <>
      <DrillShell
        title="Listening"
        scroll={false}
        step={step}
        total={total}
        secondsLeft={secondsLeft}
        onClose={onClose}
        answer={
          answered
            ? {
                kind: verdict,
                onContinue: handleContinue,
                detailLabel: verdictDetailLabel(verdict),
                detail: (
                  <Text numberOfLines={2} style={{ fontFamily: 'NunitoSemiBold', fontSize: 15, lineHeight: 20, color: c.slate }}>
                    <Text className={hanziFont(settings.script, 'medium')} style={{ fontSize: 18, color: c.ink }}>
                      {spokenText}
                    </Text>
                    {'  '}— {shortGloss(word)}
                  </Text>
                ),
              }
            : null
        }
        headerRight={
          <Pressable
            onPress={() => {
              tickHaptic()
              setShowRecent(true)
            }}
            accessibilityRole="button"
            accessibilityLabel={`Recently heard, ${listeningHistory.length} words`}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 4 }}
          >
            <History size={21} color={c.greenDark} strokeWidth={2.2} />
            <Text style={{ fontFamily: 'NunitoSemiBold', ...t.recent, color: c.slate }}>Recent</Text>
          </Pressable>
        }
        buttons={
          <AnswerButtons
            answered={answered}
            ready={Boolean(selectedId)}
            onCheck={handleCheck}
            onGiveUp={onSkip ? handleGiveUp : undefined}
            onContinue={handleContinue}
          />
        }
      >
        {/* The question card. */}
        <View
          style={{
            marginHorizontal: SCREEN_PAD,
            marginTop: 16,
            // Takes exactly what's left between the header and the buttons —
            // the page doesn't scroll, so the card is what gives.
            flex: 1,
            minHeight: 0,
            borderRadius: listenSize.radius.card,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.card,
            ...listenShadow,
          }}
        >
          {/* Clip the painting to the card's corner without clipping the shadow. */}
          <View pointerEvents="none" style={{ ...absoluteFill, borderRadius: listenSize.radius.card, overflow: 'hidden' }}>
            <Image
              source={listenArt.card}
              style={{
                position: 'absolute',
                right: 0,
                bottom: 0,
                width: artWidth,
                height: artWidth / LISTEN_CARD_ART_RATIO,
              }}
              resizeMode="contain"
            />
          </View>

          <View style={{ alignItems: 'center', paddingTop: 18, paddingHorizontal: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* A spacer the replay's width, so the audio disc stays centred. */}
              <View style={{ width: listenSize.replay + 18 }} />
              <AudioDisc onPress={() => speak(spokenText)} />
              <View style={{ width: 18 }} />
              <Pressable
                onPress={() => {
                  tapHaptic()
                  speak(spokenText, { rate: SLOW_SPEECH_RATE })
                }}
                accessibilityRole="button"
                accessibilityLabel="Play the word again, slowly"
                hitSlop={6}
              >
                <View
                  style={{
                    width: listenSize.replay,
                    height: listenSize.replay,
                    borderRadius: listenSize.replay / 2,
                    backgroundColor: playTints.sky.soft,
                    borderWidth: 1,
                    borderColor: playTints.sky.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <RotateCcw size={17} color={playTints.sky.ink} strokeWidth={2.3} />
                </View>
              </Pressable>
            </View>

            {/* The caption doubles as the verdict once the answer is in, so
                the layout never moves under the learner's thumb. */}
            <View style={{ height: 40, marginTop: 8, justifyContent: 'center' }}>
              {answered ? (
                <Verdict kind={verdict} word={word} script={settings.script} phonetic={settings.phoneticScript} />
              ) : (
                <Text style={{ fontFamily: 'NunitoSemiBold', ...t.caption, color: c.slate }}>Listen carefully</Text>
              )}
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: 18, marginTop: 8 }} />

          {/* The rows share the card's height (each capped), so on a tall
              phone the list fills the card instead of bunching at the top, and
              on a short one they give rather than pushing the page into a scroll. */}
          <View style={{ flex: 1, minHeight: 0, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 16, gap: 10 }}>
            {options.map((option) => (
              <OptionRow
                key={option.id}
                option={option}
                script={settings.script}
                phonetic={settings.phoneticScript}
                selected={option.id === selectedId}
                answered={answered}
                isAnswer={option.id === word.id}
                onPress={() => {
                  if (answered || option.id === selectedId) return
                  tickHaptic()
                  setSelectedId(option.id)
                }}
              />
            ))}
          </View>
        </View>

        {/* Only before an answer is in: once it is, Continue grades the card,
            and swapping the question away underneath would throw that away. */}
        {onCantListen && !answered && (
          <Pressable
            onPress={() => {
              tickHaptic()
              onCantListen()
            }}
            accessibilityRole="button"
            accessibilityLabel="Can't listen now. Turns listening off for 30 minutes."
            hitSlop={6}
            style={{ alignSelf: 'center', marginTop: 10 }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 16,
                height: 34,
                borderRadius: 17,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.card,
              }}
            >
              <HeadphoneOff size={16} color={c.slate} strokeWidth={2.3} />
              <Text style={{ fontFamily: 'NunitoBold', fontSize: 14, color: c.slate, includeFontPadding: false }}>Can’t listen now</Text>
            </View>
          </Pressable>
        )}
      </DrillShell>

      {showRecent && (
        <RecentlyHeardSheet
          history={listeningHistory}
          getWord={getWord}
          script={settings.script}
          phonetic={settings.phoneticScript}
          onClose={() => setShowRecent(false)}
        />
      )}
    </>
  )
}

const absoluteFill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const

/**
 * The big green disc. The reference draws a play triangle; this keeps the
 * speaker, because the button plays a *word*, not a track, and the speaker is
 * the icon the rest of the app uses for "hear this".
 *
 * It breathes once on each press — a ring swelling out of the halo — so a tap
 * reads as having started the audio even before the voice starts.
 */
function AudioDisc({ onPress }: { onPress: () => void }) {
  const pulse = useRef(new Animated.Value(0)).current

  const play = () => {
    tapHaptic()
    onPress()
    pulse.setValue(0)
    Animated.timing(pulse, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start()
  }

  return (
    <Pressable onPress={play} accessibilityRole="button" accessibilityLabel="Play the word">
      <View style={{ width: listenSize.halo, height: listenSize.halo, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            ...absoluteFill,
            borderRadius: listenSize.halo / 2,
            backgroundColor: c.greenHalo,
          }}
        />
        <Animated.View
          style={{
            ...absoluteFill,
            borderRadius: listenSize.halo / 2,
            borderWidth: 2,
            borderColor: c.green,
            opacity: pulse.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.35, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] }) }],
          }}
        />
        <View
          style={{
            width: listenSize.disc,
            height: listenSize.disc,
            borderRadius: listenSize.disc / 2,
            backgroundColor: c.green,
            alignItems: 'center',
            justifyContent: 'center',
            ...listenShadow,
          }}
        >
          <Volume2 size={31} color="#FFFFFF" strokeWidth={2.3} />
        </View>
      </View>
    </Pressable>
  )
}

/**
 * The word that was spoken, in the caption's slot and the verdict's colour. The
 * judgement itself is the answer sheet's, so it isn't said twice on one screen.
 */
function Verdict({
  kind,
  word,
  script,
  phonetic,
}: {
  kind: VerdictKind
  word: VocabWord
  script: ScriptMode
  phonetic: PhoneticScript
}) {
  const tone = onbVerdict[kind]
  const rise = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const anim = Animated.timing(rise, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    })
    anim.start()
    // Backstop: rAF stalls in a hidden browser tab (see CLAUDE.md, Animation).
    const backstop = setTimeout(() => rise.setValue(1), 400)
    return () => clearTimeout(backstop)
  }, [rise])

  return (
    <Animated.View
      style={{
        opacity: rise,
        transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 14,
          height: 38,
          borderRadius: 19,
          backgroundColor: tone.fill,
          borderWidth: 1,
          borderColor: tone.border,
        }}
      >
        {/* `includeFontPadding: false` on every line here: Android pads each Text
            by its font's own extremes, and Noto Serif's are far taller than
            Nunito's, so in this centred row the hanzi sat visibly below the pinyin. */}
        <Text className={hanziFont(script, 'medium')} style={{ fontSize: 17, color: c.ink, includeFontPadding: false }}>
          {displayWord(word, script)}
        </Text>
        {/* Pinyin only. Bopomofo is full-width, so a zhuyin reading is too wide
            for this one-line pill and fell onto a line of its own; the options
            below already show it under each answer once checked. */}
        {phonetic === 'pinyin' && (
          <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: 'NunitoSemiBold', fontSize: 14, color: c.slate, includeFontPadding: false }}>
            {displayPinyin(word, phonetic)}
          </Text>
        )}
      </View>
    </Animated.View>
  )
}

/**
 * One answer. A radio, the English, and the characters under it.
 *
 * The look lives on a `View` inside a plain `Pressable` — a style *function* on
 * a Pressable is dropped on native (see CLAUDE.md, Styling).
 */
function OptionRow({
  option,
  script,
  phonetic,
  selected,
  answered,
  isAnswer,
  onPress,
}: {
  option: VocabWord
  script: ScriptMode
  phonetic: PhoneticScript
  selected: boolean
  answered: boolean
  isAnswer: boolean
  onPress: () => void
}) {
  /* Once answered the right option always turns green — including when it
     wasn't the one picked, so a miss still teaches the answer. */
  const state: 'idle' | 'selected' | 'right' | 'wrong' | 'dim' = !answered
    ? selected
      ? 'selected'
      : 'idle'
    : isAnswer
      ? 'right'
      : selected
        ? 'wrong'
        : 'dim'

  const fill =
    state === 'selected'
      ? c.greenFill
      : state === 'right'
        ? onbVerdict.correct.fill
        : state === 'wrong'
          ? onbVerdict.incorrect.fill
          : c.option
  const border =
    state === 'selected' ? c.green : state === 'right' ? onbVerdict.correct.accent : state === 'wrong' ? onbVerdict.incorrect.accent : c.border
  const ring =
    state === 'selected' ? c.green : state === 'right' ? onbVerdict.correct.accent : state === 'wrong' ? onbVerdict.incorrect.accent : c.radio
  /* Only the picked option reacts; the right one shown after a miss just turns green. */
  const picked = answered && selected ? (isAnswer ? 'pop' : 'shake') : null
  const reaction = useAnswerReaction(picked)

  return (
    <Pressable
      onPress={onPress}
      style={{ flex: 1, minHeight: listenSize.optionMinHeight, maxHeight: listenSize.optionMaxHeight }}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: answered }}
      accessibilityLabel={`${shortGloss(option)}, ${displayWord(option, script)}${
        answered ? (isAnswer ? ', correct' : selected ? ', not correct' : '') : ''
      }`}
    >
      <Animated.View
        style={{
          flex: 1,
          transform: reaction.transform,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: listenSize.radius.option,
          borderWidth: state === 'idle' || state === 'dim' ? 1 : 1.5,
          borderColor: border,
          backgroundColor: fill,
          opacity: state === 'dim' ? 0.55 : 1,
        }}
      >
        <AnswerShimmer play={picked === 'pop'} radius={listenSize.radius.option} />
        <View
          style={{
            width: listenSize.radio,
            height: listenSize.radio,
            borderRadius: listenSize.radio / 2,
            borderWidth: 2,
            borderColor: ring,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
          }}
        >
          {state === 'selected' && (
            <View style={{ width: 11, height: 11, borderRadius: 5.5, backgroundColor: c.green }} />
          )}
          {state === 'right' && <Check size={12} color={onbVerdict.correct.accent} strokeWidth={3.5} />}
          {state === 'wrong' && <X size={12} color={onbVerdict.incorrect.accent} strokeWidth={3.5} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontFamily: 'NunitoBold', ...t.gloss, color: c.ink }}>
            {shortGloss(option)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 1 }}>
            <Text className={hanziFont(script, 'medium')} style={{ ...t.hanzi, color: c.slate }}>
              {displayWord(option, script)}
            </Text>
            {/* The reading appears only once the answer is in — before that it
                is a transcript of the audio, and would answer the question. */}
            {answered && (
              <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: 14, color: c.slate }}>
                {displayPinyin(option, phonetic)}
              </Text>
            )}
          </View>
        </View>
        <AnswerSparks play={picked === 'pop'} />
      </Animated.View>
    </Pressable>
  )
}

/**
 * Every word heard in the listening drill, newest first, with how it went and
 * a speaker to hear it again. Read from `listeningHistory`, which is persisted,
 * so it spans sessions rather than just this one.
 */
function RecentlyHeardSheet({
  history,
  getWord,
  script,
  phonetic,
  onClose,
}: {
  history: WordListened[]
  getWord: (id: string) => VocabWord | undefined
  script: ScriptMode
  phonetic: PhoneticScript
  onClose: () => void
}) {
  const { height } = useWindowDimensions()
  /* Stored oldest-first so trimming drops the oldest; read newest-first. */
  const rows = useMemo(
    () =>
      [...history]
        .reverse()
        .map((entry) => ({ entry, word: getWord(entry.wordId) }))
        .filter((row): row is { entry: WordListened; word: VocabWord } => Boolean(row.word)),
    [history, getWord],
  )

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 49, 67, 0.35)' }} onPress={onClose}>
        {/* Stops a tap inside the sheet from reaching the backdrop's dismiss. */}
        <Pressable
          onPress={() => {}}
          style={{
            maxHeight: height * 0.8,
            width: '100%',
            maxWidth: LISTEN_CONTENT_MAX,
            alignSelf: 'center',
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            backgroundColor: c.background,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 22,
              paddingTop: 18,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
            }}
          >
            <View>
              <Text style={{ fontFamily: 'NunitoExtraBold', fontSize: 19, color: c.ink }}>Recently heard</Text>
              <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: 13, color: c.slate }}>
                {rows.length === 0 ? 'Words you listen to show up here' : `${rows.length} word${rows.length === 1 ? '' : 's'} listened to`}
              </Text>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} style={{ padding: 4 }}>
              <X size={22} color={c.slate} />
            </Pressable>
          </View>

          {rows.length === 0 ? (
            <View style={{ paddingHorizontal: 28, paddingVertical: 48, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: 14, textAlign: 'center', color: c.slate }}>
                Nothing yet. Every word you answer here will be listed, so you can hear it again.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 32, gap: 8 }}>
              {rows.map(({ entry, word }) => {
                const tone = onbVerdict[entry.outcome === 'unsure' ? 'unsure' : entry.outcome]
                const label = entry.outcome === 'correct' ? 'Correct' : entry.outcome === 'incorrect' ? 'Missed' : 'Didn’t know'
                const text = displayWord(word, script)
                return (
                  <View
                    key={entry.wordId}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: c.border,
                      backgroundColor: c.card,
                    }}
                  >
                    <Pressable
                      onPress={() => {
                        tapHaptic()
                        speak(text)
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Hear ${text}`}
                      hitSlop={6}
                    >
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: c.greenHalo,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Volume2 size={18} color={c.greenDark} strokeWidth={2.3} />
                      </View>
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                        <Text className={hanziFont(script, 'medium')} style={{ fontSize: 22, lineHeight: 30, color: c.ink }}>
                          {text}
                        </Text>
                        <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: 14, color: c.slate }}>{displayPinyin(word, phonetic)}</Text>
                      </View>
                      <Text numberOfLines={1} style={{ fontFamily: 'NunitoSemiBold', fontSize: 13.5, color: c.slate }}>
                        {shortGloss(word)}
                      </Text>
                    </View>
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 999,
                        backgroundColor: tone.fill,
                        borderWidth: 1,
                        borderColor: tone.border,
                      }}
                    >
                      <Text style={{ fontFamily: 'NunitoBold', fontSize: 12, color: tone.text }}>{label}</Text>
                    </View>
                  </View>
                )
              })}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}
