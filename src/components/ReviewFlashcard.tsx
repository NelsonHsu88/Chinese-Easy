import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, Animated, Easing, Platform, ScrollView, useWindowDimensions, type LayoutChangeEvent } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import {
  BookOpen,
  Eye,
  Frown,
  Laugh,
  Lightbulb,
  Meh,
  RotateCcw,
  Smile,
  Sparkles,
  Volume2,
} from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { displayWord, displayExample, displayPinyin, hanziFont } from '../lib/hanzi'
import { speak } from '../lib/speech'
import { ReadingSentence } from './dictionary/ReadingSentence'
import { HanziStage } from './HanziStage'
import { PressableScale, LiftedFace } from './dashboard/parts'
import { onbVerdict } from './onboarding/tokens'
import { playTints } from './dashboard/tokens'
import { DiscButton, FlashcardHeader, WritingCard, card, useFlashcardColumn } from './flashcard/parts'
import {
  fcColors as c,
  fcGrades,
  fcShoulders,
  fcShadow,
  fcType as t,
  fcSize,
  fcReveal,
  FC_CHARACTER_HOLD_MS,
} from './flashcard/tokens'
import type { ReviewPreview } from '../lib/srs'
import type { Grade, VocabWord } from '../types'
import { shortGloss } from '../lib/definitions'
import { QuestionContent } from './motion/questionMotion'
import { useReduceMotion } from './tour/useReduceMotion'
import { spacedReading } from './SpacedReading'

const NATIVE = Platform.OS !== 'web'

export type ReviewDirectionResolved = 'recognition' | 'production'

/** Resolves the per-card prompt direction, spreading "mixed" deterministically by word id. */
export function directionFor(wordId: string, setting: 'recognition' | 'production' | 'mixed'): ReviewDirectionResolved {
  if (setting !== 'mixed') return setting
  let h = 0
  for (const ch of wordId) h = (h * 31 + ch.charCodeAt(0)) % 2
  return h === 0 ? 'recognition' : 'production'
}

const GRADE_BUTTONS: { grade: Grade; label: string; Icon: typeof Smile }[] = [
  { grade: 'again', label: 'Again', Icon: Frown },
  { grade: 'hard', label: 'Hard', Icon: Meh },
  { grade: 'good', label: 'Good', Icon: Smile },
  { grade: 'easy', label: 'Easy', Icon: Laugh },
]

/**
 * One flashcard, as a whole screen, built to `SS 1011 Flashcards Redesign
 * UI.png`: header, the writing card (stroke-order stage under a sakura branch
 * and a misty range), the answer card (word, reading, gloss, example) and the
 * four FSRS grade tiles.
 *
 * Holds only per-card UI state — mount it with a fresh `key` so it resets on
 * advance; scheduling and session bookkeeping stay with the caller.
 */
export function ReviewFlashcard({
  word,
  direction,
  preview,
  isNew = false,
  onGrade,
  onSkip,
  onClose,
  step,
  total,
  label = 'Flashcards',
  secondsLeft,
}: {
  word: VocabWord
  direction: ReviewDirectionResolved
  /**
   * The four scheduling outcomes, for the interval under each button.
   *
   * Comes from the caller rather than being computed here, and that is what
   * makes the number a promise: it is the same result object the caller commits,
   * so the "4d" on the button is the 4d that gets stored. Optional because the
   * card can be rendered before a preview exists.
   */
  preview?: ReviewPreview
  /** A card never reviewed before — the pill says "New word" rather than "Due today". */
  isNew?: boolean
  onGrade: (grade: Grade) => void
  /** "I don't know" — sends the word to the back of the session queue ungraded. */
  onSkip?: () => void
  onClose: () => void
  step: number
  total: number
  label?: string
  secondsLeft?: number | null
}) {
  const { settings, trackLearningEvent } = useApp()
  const { column, cardWidth } = useFlashcardColumn()

  const [revealed, setRevealed] = useState(false)
  const [hintShown, setHintShown] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const text = displayWord(word, settings.script)
  const face = hanziFont(settings.script, 'semibold')

  /*
   * The reveal is a sheet rising from the bottom of the screen; nothing else moves.
   *
   * The answer card and the four grade tiles come up as one sheet, backed in
   * the page colour, over the question (its card, Show Answer, "I don't
   * know"), which holds still underneath and is hidden once covered. The tiles
   * trail the card a little, each a beat after the last. The writer never
   * resizes or fades — it just starts replaying the stroke order where it is.
   *
   * The question doesn't move out of the way on purpose: two things crossing
   * in opposite directions read as clutter, and the backing means nothing of
   * it shows between the tiles while they settle.
   *
   * The space below the writer is sized for the question alone (SS1025: the
   * writing card gets most of the screen, roughly 55–65% of its height). The
   * answer sheet is anchored to that region's foot and, being taller, rises
   * over the writing card's lower edge — the writer's square is pinned to the
   * card's top (`stageTop`), so what it covers is the card's spare foot, and
   * the corner discs are lifted ahead of it. Both layers are rendered from
   * mount (the answer parked below the screen) and measured, so the reveal
   * changes no layout and the writer never resizes.
   *
   * Slides only, no fades: on Android a fading parent shows its children's
   * elevation shadows at full strength (CLAUDE.md, Animation traps). Each
   * value is native-driven with a backstop for a stalled browser tab.
   */
  const reduceMotion = useReduceMotion()
  const { height: windowHeight } = useWindowDimensions()
  const [questionHeight, setQuestionHeight] = useState(0)
  const [answerHeight, setAnswerHeight] = useState(0)
  /* Far enough that the answer starts wholly below the screen. Until it is
     measured, a whole screen's height is the safe distance. */
  const travel = answerHeight > 0 ? answerHeight + fcReveal.travelExtra : windowHeight
  /* How far the risen answer reaches up over the writing card's foot. */
  const overlap = Math.max(0, answerHeight - questionHeight)
  /* The writing card takes whatever the screen has left (flex), but never less
     than this: about half the screen, capped at a square of the card's width
     (the writer is square, so height past that is not more room to write). */
  const writerMin = Math.max(fcSize.writingMin, Math.min(cardWidth, Math.round(windowHeight * 0.46)))
  const measure = (set: (h: number) => void) => (e: LayoutChangeEvent) => {
    const h = Math.ceil(e.nativeEvent.layout.height)
    set(h)
  }

  const [covered, setCovered] = useState(false)
  const cardIn = useRef(new Animated.Value(0)).current
  const tilesIn = useRef(GRADE_BUTTONS.map(() => new Animated.Value(0))).current
  const revealing = useRef(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }

  const reveal = useCallback(() => {
    if (revealing.current) return
    revealing.current = true
    setRevealed(true)
    const settle = () => {
      cardIn.setValue(1)
      tilesIn.forEach((v) => v.setValue(1))
      setCovered(true)
    }
    if (reduceMotion) {
      settle()
      return
    }
    const arrive = Easing.bezier(0.16, 1, 0.3, 1)
    // Under the sheet once it has landed, so hiding it can't be seen.
    later(() => setCovered(true), fcReveal.inMs)
    Animated.parallel([
      Animated.timing(cardIn, {
        toValue: 1,
        duration: fcReveal.inMs,
        easing: arrive,
        useNativeDriver: NATIVE,
      }),
      ...tilesIn.map((v, i) =>
        Animated.timing(v, {
          toValue: 1,
          duration: fcReveal.inMs,
          delay: fcReveal.tileDelay + i * fcReveal.tileStagger,
          easing: arrive,
          useNativeDriver: NATIVE,
        }),
      ),
    ]).start()
    const last = fcReveal.tileDelay + (tilesIn.length - 1) * fcReveal.tileStagger + fcReveal.inMs
    later(settle, last + fcReveal.backstop)
  }, [cardIn, tilesIn, reduceMotion])

  /** Rises `distance` up into place as `v` goes 0 → 1. */
  const rise = (v: Animated.Value, distance: number) => ({
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  })

  /*
   * Writing the last stroke correctly *is* the answer, so there's nothing left
   * to ask — the card reveals itself, after a beat in which the finished
   * character stays on screen (`holdCharacterOnComplete`). Only in production
   * ("write this") mode: in recognition mode the character is already on
   * screen, so the stage is practice rather than the question, and
   * auto-revealing would grade the card out from under someone still studying it.
   */
  const handleQuizComplete = useCallback(() => {
    trackLearningEvent({ type: 'WRITING_COMPLETED', characters: [...text].length })
    if (direction === 'production') later(reveal, fcReveal.holdMs)
  }, [direction, trackLearningEvent, text, reveal])

  const example = word.example ? displayExample(word, settings.script) : ''

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={{ width: column, flexGrow: 1, paddingHorizontal: fcSize.pad, paddingBottom: 12 }}>
          <FlashcardHeader onClose={onClose} step={step} total={total} label={label} secondsLeft={secondsLeft} />

          {/*
            The answer animation always runs slow, with no control to change it.
            This isn't a stroke-order reference you came to study — it's the
            replay you get the moment you finish writing, and its whole job is to
            be followable at a glance while the card is still in front of you.
            The full Normal/Slow choice lives where someone has gone looking for
            stroke order: the "Watch stroke order" sheet and the writing guide.
          */}
          {/*
            Faded as one picture while it turns. Android applies `opacity` to
            each layer under a view separately, so without this every card's
            shadow and hairline showed through its own half-transparent surface
            — the outlines and padding seemed to arrive before the cards did.
            iOS and web group-fade already. Only while turning: compositing
            offscreen every frame costs something, and at rest there is no fade.
          */}
          {/* Between cards only this part moves, behind a veil in the page colour
              rather than its own fade, for the same reason as the reveal's veil. */}
          <QuestionContent style={{ flexGrow: 1 }} veil={{ color: c.background, inset: { top: 6, bottom: 10, side: fcSize.pad } }}>
          <View style={{ flexGrow: 1 }}>
          <WritingCard
            minHeight={writerMin}
            stageTop
            cornerLift={cardIn.interpolate({ inputRange: [0, 1], outputRange: [0, -overlap] })}
            corner={
              <>
                {!revealed && !hintShown && direction === 'production' && (
                  <DiscButton onPress={() => setHintShown(true)} label="Show a hint" tint={playTints.honey}>
                    <Lightbulb size={20} color={playTints.honey.ink} />
                  </DiscButton>
                )}
                <DiscButton
                  onPress={() => setAttempt((a) => a + 1)}
                  label={revealed ? 'Replay stroke order' : 'Restart writing attempt'}
                  tint={playTints.jade}
                >
                  <RotateCcw size={20} color={playTints.jade.ink} />
                </DiscButton>
              </>
            }
          >
            <HanziStage
              character={text}
              mode={revealed ? 'demo' : 'quiz'}
              speed="slow"
              showOutline={revealed || direction === 'recognition' || hintShown}
              showGuides
              characterHoldMs={FC_CHARACTER_HOLD_MS}
              holdCharacterOnComplete
              resetKey={`${word.id}-${attempt}-${revealed}`}
              onQuizComplete={handleQuizComplete}
            />
          </WritingCard>

          {/* The region the reveal happens in — sized for the question; the
              answer rises from its foot (see `reveal` above). */}
          <View style={{ marginTop: 12 }}>
          {/* The question: sky-washed card (SS1017), Show Answer, "I don't know". */}
          <Animated.View
            onLayout={measure(setQuestionHeight)}
            pointerEvents={revealed ? 'none' : 'auto'}
            importantForAccessibility={revealed ? 'no-hide-descendants' : 'auto'}
            accessibilityElementsHidden={revealed}
            style={{ opacity: covered ? 0 : 1 }}
          >
            {/* Compact on purpose: the label and pill, then the prompt — the
                screen's height belongs to the writing card above. */}
            <View
              style={[
                card,
                fcShadow,
                { backgroundColor: playTints.sky.fill, borderColor: playTints.sky.border },
              ]}
            >
              <View style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ flex: 1, fontFamily: 'NunitoExtraBold', ...t.label, color: playTints.sky.text, textTransform: 'uppercase' }}>
                    {direction === 'recognition' ? 'Recognize this' : 'Write in Chinese'}
                  </Text>
                  <DuePill isNew={isNew} />
                </View>
                <View style={{ justifyContent: 'center', alignItems: 'center', paddingTop: 6 }}>
                  {direction === 'recognition' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text className={face} style={{ ...t.word, color: c.ink, includeFontPadding: false }}>{text}</Text>
                      <SpeakerDisc text={text} />
                    </View>
                  ) : (
                    <Text style={{ fontFamily: 'NunitoExtraBold', ...t.prompt, color: c.ink, textAlign: 'center' }}>
                      {shortGloss(word)}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <View style={{ marginTop: 14 }}>
              <PressableScale onPress={reveal} scaleTo={1} haptic={false} accessibilityLabel="Show answer">
                <LiftedFace height={fcSize.button} fill={c.green} shoulder={fcShoulders.primary}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Eye size={20} color={c.onColor} />
                    <Text style={{ fontFamily: 'NunitoExtraBold', ...t.button, color: c.onColor }}>Show Answer</Text>
                  </View>
                </LiftedFace>
              </PressableScale>

              {/*
                The honest way out, before the answer. It sends the word to the
                back of the session queue ungraded — a learner who admits they
                don't know has told the truth, and making them grade themselves
                "Again" to move on would score that as a miss. Not after the
                reveal: once the answer is on screen, the learner judges
                themselves with the four tiles, and nothing else.
              */}
              {onSkip && (
                <Pressable
                  onPress={onSkip}
                  accessibilityRole="button"
                  accessibilityLabel="I don't know this word"
                  hitSlop={6}
                  style={{ alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 16, marginTop: 4 }}
                >
                  <Text style={{ fontFamily: 'NunitoSemiBold', ...t.quiet, color: c.slate }}>I don’t know</Text>
                </Pressable>
              )}
            </View>
          </Animated.View>

          {/* The answer: one sheet parked below the screen until the reveal,
              then risen into place over the question. Plain paper, no
              painting, so nothing competes with the word and its sentence. */}
          <Animated.View
            onLayout={measure(setAnswerHeight)}
            pointerEvents={revealed ? 'box-none' : 'none'}
            importantForAccessibility={revealed ? 'auto' : 'no-hide-descendants'}
            accessibilityElementsHidden={!revealed}
            style={[{ position: 'absolute', bottom: 0, left: 0, right: 0 }, rise(cardIn, travel)]}
          >
            {/* The sheet's backing, in the page colour: it hides the question
                between and below the tiles. It starts under the card, clear of
                its rounded corners, and runs past the screen's foot. */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: fcSize.radius.card * 2,
                bottom: -fcReveal.travelExtra * 2,
                left: -fcSize.pad,
                right: -fcSize.pad,
                backgroundColor: c.background,
              }}
            />
            <View style={[card, fcShadow, { flexGrow: 1 }]}>
              <View style={{ padding: 20, paddingBottom: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <Text className={face} style={{ ...t.word, color: c.ink, includeFontPadding: false }}>{text}</Text>
                    <SpeakerDisc text={text} />
                  </View>
                  <DuePill isNew={isNew} />
                </View>
                <Text style={{ fontFamily: 'NunitoSemiBold', ...t.reading, color: c.green, marginTop: 4 }}>
                  {spacedReading(displayPinyin(word, settings.phoneticScript), t.reading.fontSize)}
                </Text>
                <Text style={{ fontFamily: 'NunitoSemiBold', ...t.gloss, color: c.body, marginTop: 4 }}>{shortGloss(word)}</Text>
                {example ? (
                  <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}>
                    <ReadingSentence text={example} term={text} tone="card" size="compact" />
                    <Text style={{ fontFamily: 'NunitoSemiBoldItalic', ...t.translation, color: c.slate, marginTop: 4 }}>
                      {word.example!.translation}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* The four grade tiles, trailing the card, each a beat after the last. */}
            <View style={{ flexDirection: 'row', gap: fcSize.tileGap, marginTop: 14 }}>
              {GRADE_BUTTONS.map(({ grade, label: name, Icon }, i) => (
                <Animated.View key={grade} style={[{ flex: 1 }, rise(tilesIn[i], fcReveal.tileLag)]}>
                  <GradeTile
                    grade={grade}
                    name={name}
                    Icon={Icon}
                    interval={preview?.[grade].label}
                    width={(cardWidth - fcSize.tileGap * 3) / 4}
                    onPress={() => onGrade(grade)}
                  />
                </Animated.View>
              ))}
            </View>
          </Animated.View>
          </View>
          </View>
          </QuestionContent>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function SpeakerDisc({ text }: { text: string }) {
  return (
    <Pressable onPress={() => speak(text)} accessibilityRole="button" accessibilityLabel="Play pronunciation" hitSlop={6}>
      <View
        style={{
          width: fcSize.speaker,
          height: fcSize.speaker,
          borderRadius: fcSize.speaker / 2,
          backgroundColor: c.mint,
          borderWidth: 1,
          borderColor: c.mintBorder,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Volume2 size={20} color={c.greenDark} />
      </View>
    </Pressable>
  )
}

function DuePill({ isNew }: { isNew: boolean }) {
  const Icon = isNew ? Sparkles : BookOpen
  /* A new word is honey, as on New Words; a due one jade. */
  const tint = isNew ? playTints.honey : playTints.jade
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: tint.soft,
      }}
    >
      <Icon size={15} color={tint.ink} />
      <Text style={{ fontFamily: 'NunitoBold', ...t.pill, color: tint.text }}>{isNew ? 'New word' : 'Due today'}</Text>
    </View>
  )
}

/**
 * One grade: a coloured tile with a face, the grade's name, and when the card
 * would come back — the Anki habit of showing the consequence before the
 * choice. The interval appears only once the preview has arrived rather than
 * as a placeholder, because a row of dashes that becomes numbers reads as the
 * app still thinking.
 */
function GradeTile({
  grade,
  name,
  Icon,
  interval,
  width,
  onPress,
}: {
  grade: Grade
  name: string
  Icon: typeof Smile
  interval?: string
  width: number
  onPress: () => void
}) {
  const tone = fcGrades[grade]
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.95}
      wrapperStyle={{ flex: 1 }}
      accessibilityLabel={interval ? `${name}, next review in ${interval}` : name}
    >
      <View style={{ height: fcSize.tile, borderRadius: fcSize.radius.tile, backgroundColor: tone.fill, ...fcShadow }}>
      <View
        style={{
          flex: 1,
          borderRadius: fcSize.radius.tile,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}
      >
        {/* A watercolour range at the tile's foot, as the reference paints it. */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <Svg width={width} height={24} viewBox="0 0 100 34" preserveAspectRatio="none">
            <Path d="M0 21 Q8 12 15 10 Q21 9 26 15 Q32 6 39 5 Q46 6 53 17 Q59 11 65 11 Q72 13 79 19 Q85 12 91 12 Q96 13 100 16 L100 34 L0 34 Z" fill={tone.hills} opacity={0.22} />
            <Path d="M0 28 Q6 21 13 19 Q20 20 27 26 Q35 16 43 15 Q51 17 58 25 Q65 19 72 20 Q79 22 86 27 Q93 21 100 22 L100 34 L0 34 Z" fill={tone.hills} opacity={0.3} />
          </Svg>
        </View>
        <Icon size={19} color={c.onColor} strokeWidth={2} />
        <Text style={{ fontFamily: 'NunitoExtraBold', ...t.grade, color: c.onColor }}>{name}</Text>
        {interval ? (
          <Text style={{ fontFamily: 'NunitoSemiBold', ...t.interval, color: c.onColorSoft }}>{interval}</Text>
        ) : null}
      </View>
      </View>
    </PressableScale>
  )
}
