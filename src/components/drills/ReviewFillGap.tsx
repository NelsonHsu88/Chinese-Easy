import { useMemo, useState } from 'react'
import { View, Text, Pressable, Animated } from 'react-native'
import { Check, Volume2, X } from 'lucide-react-native'
import { useApp } from '../../context/AppContext'
import { displayPinyin, displayWord, hanziFont } from '../../lib/hanzi'
import { readingForText } from '../../lib/characterReading'
import { shortGloss } from '../../lib/definitions'
import { blankTranslation, clozeFor } from '../../lib/mixedDrills'
import { speak } from '../../lib/speech'
import { playCorrectSound, playRetryTone } from '../../lib/sound'
import { carefulHaptic, correctHaptic, tapHaptic, tickHaptic } from '../../lib/haptics'
import { onbVerdict, type VerdictKind } from '../onboarding/tokens'
import { DrillShell, AnswerButtons, DRILL_PAD, useDrillColumn, verdictDetailLabel } from './parts'
import { useAnswerReaction } from '../motion/questionMotion'
import { AnswerShimmer, AnswerSparks } from '../motion/answerFeedback'
import { useReadingFade } from '../readingFade'
import { drillColors as c, drillType as t, drillSize, drillShadow } from './tokens'
import type { VocabWord } from '../../types'

/** Above this many characters the sentence steps down a size so it wraps onto two lines, not three. */
const LONG_SENTENCE = 12

/**
 * Fill the Gap, built to the Beta 2.1 reference (`SS 102 Fill in the Blank.png`)
 * — minus its painting: the sentence card is plain, by request, so nothing
 * competes with the sentence.
 *
 * One of the bank's own example sentences with the word cut out, the reading
 * over every other word, the English beneath, and four same-length words to
 * choose from. Pick, then Check Answer — exactly the listening drill's
 * two-step, so the learner commits before anything is coloured.
 *
 * The gap has **no reading over it** until the answer is in, and the sentence
 * isn't playable until then either: either would read the answer out. What the
 * learner *is* given is the missing word's meaning, centred under the sentence —
 * the question is "which characters say this?", not "guess the word" — and the
 * reading under every answer tile, so a word they know by sound but not yet by
 * sight is still within reach.
 *
 * Mount with a `key` per step so the answer state resets per word.
 */
export function ReviewFillGap({
  word,
  options,
  onAnswer,
  onSkip,
  onClose,
  step,
  total,
  secondsLeft,
}: {
  word: VocabWord
  options: VocabWord[]
  onAnswer: (correct: boolean) => void
  /** "I don't know" — the word goes to the back of the queue ungraded. */
  onSkip?: () => void
  onClose: () => void
  step: number
  total: number
  secondsLeft?: number | null
}) {
  const { settings, wordBank } = useApp()
  /* The sentence's readings hide without moving it, like every other sentence. */
  const fade = useReadingFade()
  const script = settings.script
  const phonetic = settings.phoneticScript
  const cloze = useMemo(() => clozeFor(word, script, wordBank), [word, script, wordBank])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const [gaveUp, setGaveUp] = useState(false)

  const answered = checked || gaveUp
  const wasCorrect = checked && selectedId === word.id
  const verdict: VerdictKind = gaveUp ? 'unsure' : wasCorrect ? 'correct' : 'incorrect'

  // The plan only builds this step for a word with a usable sentence, so this
  // is a bank that changed underneath — let the learner past rather than strand them.
  if (!cloze) {
    return (
      <DrillShell
        title="Fill the Gap"
        step={step}
        total={total}
        secondsLeft={secondsLeft}
        onClose={onClose}
        sakuraCorner
        buttons={<AnswerButtons answered ready onCheck={() => {}} onContinue={() => onSkip?.()} />}
      >
        <View style={{ flexGrow: 1 }} />
      </DrillShell>
    )
  }

  const sentence = cloze.segments.map((s) => s.display).join('')
  const long = [...sentence].length > LONG_SENTENCE
  const type = long ? t.sentenceLong : t.sentence
  const answerForm = displayWord(word, script)
  const translation = answered ? word.example!.translation : blankTranslation(word.example!.translation, word)

  const handleCheck = () => {
    if (answered || !selectedId) return
    setChecked(true)
    if (selectedId === word.id) {
      playCorrectSound()
      correctHaptic()
    } else {
      playRetryTone()
      carefulHaptic()
    }
  }

  const handleGiveUp = () => {
    if (answered) return
    setGaveUp(true)
    tickHaptic()
  }

  const handleContinue = () => (gaveUp ? onSkip?.() : onAnswer(wasCorrect))

  /* The gap is as wide as the answer would be, so filling it doesn't reflow the line. */
  const gapWidth = [...answerForm].length * type.fontSize + 18
  const gapTone = !answered ? null : onbVerdict[verdict]

  return (
    <DrillShell
      title="Fill the Gap"
      step={step}
      total={total}
      secondsLeft={secondsLeft}
      onClose={onClose}
      sakuraCorner
      answer={
        answered
          ? {
              kind: verdict,
              onContinue: handleContinue,
              detailLabel: verdictDetailLabel(verdict),
              detail: (
                <>
                  {/* Word and reading are one unit that never wraps apart. Zhuyin
                      is left out: bopomofo is full-width, so a two-syllable
                      reading broke away from its word — and the answer tiles
                      already show it under each option. */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text className={hanziFont(script, 'medium')} style={{ fontSize: 20, color: c.ink, includeFontPadding: false }}>
                      {answerForm}
                    </Text>
                    {phonetic === 'pinyin' && (
                      <Text numberOfLines={1} style={{ fontFamily: 'NunitoSemiBold', fontSize: 15, color: c.slate, includeFontPadding: false }}>
                        {displayPinyin(word, phonetic)}
                      </Text>
                    )}
                  </View>
                  <Text numberOfLines={2} style={{ fontFamily: 'NunitoSemiBold', fontSize: 15, color: c.slate }}>
                    — {shortGloss(word)}
                  </Text>
                </>
              ),
            }
          : null
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
      <View style={{ flexGrow: 1, paddingHorizontal: DRILL_PAD, marginTop: 26 }}>
        {/* The sentence card. Plain on purpose. It takes the screen's slack, up
            to a point, so a tall phone gets a roomier card rather than a band of
            bare paper above the buttons. */}
        <View
          style={{
            flexGrow: 1,
            maxHeight: 260,
            justifyContent: 'center',
            borderRadius: drillSize.radius.card,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.card,
            paddingHorizontal: 18,
            paddingTop: 22,
            paddingBottom: 16,
            ...drillShadow,
          }}
        >
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-end', rowGap: 6 }}
            accessibilityLabel={answered ? sentence : sentence.replace(cloze.segments[cloze.gap].display, '___')}
          >
            {cloze.segments.map((segment, i) => {
              const isGap = i === cloze.gap
              const sound = isGap
                ? answered
                  ? displayPinyin(word, phonetic)
                  : ''
                : segment.word
                  ? displayPinyin(segment.word, phonetic)
                  : readingForText(segment.display, phonetic)
              return (
                <View key={i} style={{ alignItems: 'center', paddingHorizontal: isGap ? 4 : 1.5 }}>
                  {/* An empty reading still reserves its line, or words without one sit higher. */}
                  <Animated.View style={{ opacity: fade.opacity }} accessibilityElementsHidden={fade.hidden}>
                    <Text
                      numberOfLines={1}
                      style={{ fontFamily: 'NunitoSemiBold', ...t.reading, color: isGap && gapTone ? gapTone.text : c.reading }}
                    >
                      {sound || ' '}
                    </Text>
                  </Animated.View>
                  {isGap ? (
                    <View
                      style={{
                        width: gapWidth,
                        height: type.lineHeight + 6,
                        borderRadius: 8,
                        borderWidth: 1.5,
                        borderStyle: answered ? 'solid' : 'dashed',
                        borderColor: gapTone ? gapTone.accent : c.gapLine,
                        backgroundColor: gapTone ? gapTone.fill : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {answered && (
                        <Text className={hanziFont(script, 'semibold')} style={{ ...type, color: gapTone?.text }}>
                          {answerForm}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Text className={hanziFont(script, 'semibold')} style={{ ...type, color: c.ink }}>
                      {segment.display}
                    </Text>
                  )}
                </View>
              )
            })}
          </View>

          {/* The missing word's meaning, as a centred label and line — part of
              the question, so it shows from the start. */}
          <View style={{ alignItems: 'center', marginTop: 14 }} accessibilityLabel={`Missing word: ${shortGloss(word)}`}>
            <Text style={{ fontFamily: 'NunitoExtraBold', fontSize: 11, lineHeight: 14, letterSpacing: 1.2, color: c.greenDark, textAlign: 'center' }}>
              MISSING WORD
            </Text>
            <Text
              numberOfLines={2}
              style={{ fontFamily: 'NunitoBold', fontSize: 17, lineHeight: 22, color: c.ink, textAlign: 'center', marginTop: 2 }}
            >
              {shortGloss(word)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 10, minHeight: 44 }}>
            {/* Playable only once answered — before that it would say the answer. */}
            {answered && (
              <Pressable
                onPress={() => {
                  tapHaptic()
                  speak(sentence)
                }}
                accessibilityRole="button"
                accessibilityLabel="Hear the sentence"
                hitSlop={6}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    borderWidth: 1,
                    borderColor: c.border,
                    backgroundColor: c.replay,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Volume2 size={19} color={c.greenDark} strokeWidth={2.3} />
                </View>
              </Pressable>
            )}
            <Text style={{ flexShrink: 1, fontFamily: 'NunitoSemiBoldItalic', ...t.translation, color: c.slate, textAlign: 'center' }}>
              {translation}
            </Text>
          </View>
        </View>

        {/* Four answers, two by two. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginTop: 18 }}>
          {options.map((option) => (
            <GapOption
              key={option.id}
              option={option}
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
    </DrillShell>
  )
}

/**
 * One answer tile: the characters, with their reading centred under them.
 * The look is on a `View` inside a plain `Pressable` (see CLAUDE.md, Styling).
 */
function GapOption({
  option,
  selected,
  answered,
  isAnswer,
  onPress,
}: {
  option: VocabWord
  selected: boolean
  answered: boolean
  isAnswer: boolean
  onPress: () => void
}) {
  const { settings } = useApp()
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
    state === 'selected' ? c.greenFill : state === 'right' ? onbVerdict.correct.fill : state === 'wrong' ? onbVerdict.incorrect.fill : c.card
  const border =
    state === 'selected' ? c.green : state === 'right' ? onbVerdict.correct.accent : state === 'wrong' ? onbVerdict.incorrect.accent : c.border
  const form = displayWord(option, settings.script)
  const reading = displayPinyin(option, settings.phoneticScript)
  /* Tiles are 48% of the column. A long reading — four syllables, and zhuyin
     above all, whose symbols are full-width — steps down a size to stay on one
     line rather than wrapping or being cut off. ~0.55em a pinyin letter, ~1em a
     bopomofo symbol. */
  const { inner } = useDrillColumn()
  const readingRoom = inner * 0.48 - 24
  const perChar = settings.phoneticScript === 'zhuyin' ? 1 : 0.56
  const readingSize = Math.max(10, Math.min(14, readingRoom / Math.max(1, [...reading].length * perChar)))
  /* Only the picked tile reacts; the right one shown after a miss just turns green. */
  const picked = answered && selected ? (isAnswer ? 'pop' : 'shake') : null
  const reaction = useAnswerReaction(picked)

  return (
    <Pressable
      onPress={onPress}
      style={{ width: '48%' }}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: answered }}
      accessibilityLabel={`${form}${answered ? (isAnswer ? ', correct' : selected ? ', not correct' : '') : ''}`}
    >
      <Animated.View
        style={{
          transform: reaction.transform,
          height: drillSize.optionHeight,
          borderRadius: drillSize.radius.tile,
          borderWidth: state === 'idle' || state === 'dim' ? 1 : 1.75,
          borderColor: border,
          backgroundColor: fill,
          opacity: state === 'dim' ? 0.55 : 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AnswerShimmer play={picked === 'pop'} radius={drillSize.radius.tile} />
        <Text
          className={hanziFont(settings.script, 'semibold')}
          numberOfLines={1}
          style={{
            ...t.optionHanzi,
            fontSize: [...form].length > 2 ? 26 : t.optionHanzi.fontSize,
            lineHeight: [...form].length > 2 ? 34 : t.optionHanzi.lineHeight,
            color: c.ink,
            textAlign: 'center',
            // Android pads a Text by its font's extremes, and Noto Serif's are
            // far taller than Nunito's — without this the pair sits off-centre.
            includeFontPadding: false,
          }}
        >
          {form}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: 'NunitoSemiBold',
            fontSize: readingSize,
            lineHeight: readingSize + 4,
            color: c.slate,
            textAlign: 'center',
            alignSelf: 'stretch',
            paddingHorizontal: 12,
            marginTop: 2,
            includeFontPadding: false,
          }}
        >
          {reading}
        </Text>
        {(state === 'right' || state === 'wrong') && (
          <View
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: state === 'right' ? onbVerdict.correct.accent : onbVerdict.incorrect.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {state === 'right' ? <Check size={13} color="#FFFFFF" strokeWidth={3.2} /> : <X size={13} color="#FFFFFF" strokeWidth={3.2} />}
          </View>
        )}
        <AnswerSparks play={picked === 'pop'} />
      </Animated.View>
    </Pressable>
  )
}
