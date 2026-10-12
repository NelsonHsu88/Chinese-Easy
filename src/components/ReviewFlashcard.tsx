import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, Animated, Easing, Platform, ScrollView } from 'react-native'
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
   * The reveal is one change, not several. The whole card area — writer,
   * answer card, buttons — dips out together, swaps while it is invisible, and
   * comes back together with the stroke animation starting as it arrives.
   *
   * It used to happen in pieces: the writing card snapped smaller to make room,
   * the writer restarted, and the answer and the tiles rose in on their own
   * timing, so the screen seemed to arrive a part at a time. Swapping while
   * faded out means no resize is ever on screen.
   *
   * `fade` is 1 at rest. RN's own Animated (Reanimated doesn't drive on web),
   * each leg with a backstop for a stalled browser tab — and the backstop
   * covers the swap itself, not just the value (see CLAUDE.md, Animation).
   *
   * **What fades is a veil, not the cards.** Fading the area's own opacity was
   * janky on Android, where a parent's alpha is not applied to its children's
   * elevation shadows or to the writer's WebView: the shadows and outlines
   * arrived at full strength first and the cards caught up after.
   * `needsOffscreenAlphaCompositing` was meant to cover that, but it only took
   * effect a render after the native fade had already started. A plain view in
   * the page's colour, laid over everything, fades the same on every platform
   * — and on Android it carries the highest elevation in the area, which is
   * what draws it above the shadows rather than under them.
   */
  const fade = useRef(new Animated.Value(1)).current
  const [turning, setTurning] = useState(false)
  const revealing = useRef(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }

  const reveal = useCallback(() => {
    if (revealing.current) return
    revealing.current = true
    setTurning(true)
    let swapped = false
    const swap = () => {
      if (swapped) return
      swapped = true
      fade.setValue(0)
      setRevealed(true)
    }
    Animated.timing(fade, {
      toValue: 0,
      duration: fcReveal.outMs,
      easing: Easing.in(Easing.quad),
      useNativeDriver: NATIVE,
    }).start(swap)
    later(swap, fcReveal.outMs + fcReveal.backstop)
  }, [fade])

  // The second half runs once React has committed the answer layout, so what
  // fades in is the finished screen rather than the last frame of the old one.
  useEffect(() => {
    if (!revealed) return
    Animated.timing(fade, {
      toValue: 1,
      duration: fcReveal.inMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    }).start(() => setTurning(false))
    later(() => {
      fade.setValue(1)
      setTurning(false)
    }, fcReveal.inMs + fcReveal.backstop)
  }, [revealed, fade])

  /* The answer and the tiles also rise a little as they arrive; the writer
     only fades, so the character never drifts under the learner's eye. */
  const riseStyle = {
    transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [fcReveal.rise, 0] }) }],
  }

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
          <View pointerEvents={turning ? 'none' : 'auto'} style={{ flexGrow: 1 }}>
          <WritingCard
            minHeight={revealed ? fcSize.writingMinRevealed : fcSize.writingMin}
            corner={
              <>
                {!revealed && !hintShown && direction === 'production' && (
                  <DiscButton onPress={() => setHintShown(true)} label="Show a hint">
                    <Lightbulb size={20} color={onbVerdict.unsure.accent} />
                  </DiscButton>
                )}
                <DiscButton
                  onPress={() => setAttempt((a) => a + 1)}
                  label={revealed ? 'Replay stroke order' : 'Restart writing attempt'}
                >
                  <RotateCcw size={20} color={c.body} />
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

          {/* The answer card — or, before the reveal, the question. */}
          {/* Plain paper: by request this card carries no painting, so nothing
              competes with the word and its sentence. */}
          <Animated.View style={[card, fcShadow, { marginTop: 12 }, riseStyle]}>
            {revealed ? (
              <View style={{ padding: 20, paddingBottom: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <Text className={face} style={{ ...t.word, color: c.ink, includeFontPadding: false }}>{text}</Text>
                    <SpeakerDisc text={text} />
                  </View>
                  <DuePill isNew={isNew} />
                </View>
                <Text style={{ fontFamily: 'InterMedium', ...t.reading, color: c.green, marginTop: 4 }}>
                  {displayPinyin(word, settings.phoneticScript)}
                </Text>
                <Text style={{ fontFamily: 'NunitoSemiBold', ...t.gloss, color: c.body, marginTop: 4 }}>{shortGloss(word)}</Text>
                {example ? (
                  <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}>
                    <ReadingSentence text={example} term={text} tone="card" size="compact" />
                    <Text style={{ fontFamily: 'LoraItalic', ...t.translation, color: c.slate, marginTop: 4 }}>
                      {word.example!.translation}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={{ padding: 20, paddingBottom: 22, minHeight: 132 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <Text style={{ flex: 1, fontFamily: 'NunitoExtraBold', ...t.label, color: c.slate, textTransform: 'uppercase', marginTop: 6 }}>
                    {direction === 'recognition' ? 'Recognize this' : 'Write in Chinese'}
                  </Text>
                  <DuePill isNew={isNew} />
                </View>
                {direction === 'recognition' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <Text className={face} style={{ ...t.word, color: c.ink, includeFontPadding: false }}>{text}</Text>
                    <SpeakerDisc text={text} />
                  </View>
                ) : (
                  <Text style={{ fontFamily: 'LoraBold', ...t.prompt, color: c.ink, marginTop: 10, }}>
                    {shortGloss(word)}
                  </Text>
                )}
              </View>
            )}
          </Animated.View>

          {/* Show Answer, or the four grade tiles. */}
          <Animated.View style={[{ marginTop: 14 }, riseStyle]}>
            {revealed ? (
              <View style={{ flexDirection: 'row', gap: fcSize.tileGap }}>
                {GRADE_BUTTONS.map(({ grade, label: name, Icon }) => (
                  <GradeTile
                    key={grade}
                    grade={grade}
                    name={name}
                    Icon={Icon}
                    interval={preview?.[grade].label}
                    width={(cardWidth - fcSize.tileGap * 3) / 4}
                    onPress={() => onGrade(grade)}
                  />
                ))}
              </View>
            ) : (
              <PressableScale onPress={reveal} scaleTo={1} haptic={false} accessibilityLabel="Show answer">
                <LiftedFace height={fcSize.button} fill={c.green} shoulder={fcShoulders.primary}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Eye size={20} color={c.onColor} />
                    <Text style={{ fontFamily: 'LoraBold', ...t.button, color: c.onColor }}>Show Answer</Text>
                  </View>
                </LiftedFace>
              </PressableScale>
            )}

            {/*
              The honest way out, before the answer. It sends the word to the
              back of the session queue ungraded — a learner who admits they
              don't know has told the truth, and making them grade themselves
              "Again" to move on would score that as a miss. Not after the
              reveal: once the answer is on screen, the learner judges
              themselves with the four tiles, and nothing else.
            */}
            {onSkip && !revealed && (
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
          </Animated.View>

          {/* The veil the reveal turns behind — see `fade` above. It reaches past
              the column's padding so the cards' shadows are covered too. */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -6,
              bottom: -10,
              left: -fcSize.pad,
              right: -fcSize.pad,
              backgroundColor: c.background,
              opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              zIndex: 50,
              elevation: 50,
            }}
          />
          </View>
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
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: c.mint,
      }}
    >
      <Icon size={15} color={c.greenDark} />
      <Text style={{ fontFamily: 'NunitoBold', ...t.pill, color: c.greenDark }}>{isNew ? 'New word' : 'Due today'}</Text>
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
        <Text style={{ fontFamily: 'LoraBold', ...t.grade, color: c.onColor }}>{name}</Text>
        {interval ? (
          <Text style={{ fontFamily: 'NunitoSemiBold', ...t.interval, color: c.onColorSoft }}>{interval}</Text>
        ) : null}
      </View>
      </View>
    </PressableScale>
  )
}
