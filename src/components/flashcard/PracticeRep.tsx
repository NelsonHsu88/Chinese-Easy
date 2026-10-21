import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, ScrollView, Animated, Easing, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RotateCcw, Volume2 } from 'lucide-react-native'
import { useApp } from '../../context/AppContext'
import { displayPinyin, displayWord, hanziFont } from '../../lib/hanzi'
import { shortGloss } from '../../lib/definitions'
import { speak } from '../../lib/speech'
import { HanziStage } from '../HanziStage'
import { PressableScale, LiftedFace } from '../dashboard/parts'
import { DiscButton, FlashcardHeader, WritingCard, card, useFlashcardColumn } from './parts'
import { fcColors as c, fcShoulders, fcShadow, fcType as t, fcSize, fcRepSlide, FC_CHARACTER_HOLD_MS } from './tokens'
import type { VocabWord } from '../../types'
import { QuestionContent } from '../motion/questionMotion'

/**
 * How long a finished rep stays on screen before the next one starts by
 * itself. Long enough to see the character whole; short enough that writing
 * it *is* the way through, with the button only a fallback.
 */
const AUTO_NEXT_MS = 650

const NATIVE = Platform.OS !== 'web'

/**
 * One remedial writing rep after an "Again" — "Rewrite it to lock it in" —
 * in the flashcard's own design, so failing a card doesn't drop the learner
 * onto a screen from a different app.
 *
 * Mount with a fresh `key` per rep: the auto-advance, the slide and the
 * writer's state all belong to one rep.
 *
 * **The last rep is from memory**: no outline to trace, and the word card
 * shows the sound and meaning but not the character, so the learner finds out
 * whether the reps before it actually stuck. Every rep before it is traced.
 */
export function PracticeRep({
  word,
  rep,
  total,
  secondsLeft,
  onNext,
  onClose,
}: {
  word: VocabWord
  /** 1-based. */
  rep: number
  total: number
  secondsLeft?: number | null
  onNext: () => void
  onClose: () => void
}) {
  const { settings, trackLearningEvent } = useApp()
  const { column, cardWidth } = useFlashcardColumn()
  const [attempt, setAttempt] = useState(0)
  const text = displayWord(word, settings.script)
  const face = hanziFont(settings.script, 'semibold')
  const last = rep >= total
  const fromMemory = last

  /*
   * Between reps the writing card leaves to the left and the next one arrives
   * from the right — the direction the session itself moves forward — so a
   * rep reads as progress rather than the same box being wiped. The first rep
   * doesn't arrive this way (the session already slid it in), and the last
   * doesn't leave this way (the session's own slide carries it off).
   *
   * -1 off to the left, 0 in place, 1 waiting off to the right. Each leg has a
   * backstop for a stalled browser tab (see CLAUDE.md, Animation).
   */
  const slide = useRef(new Animated.Value(rep > 1 ? 1 : 0)).current
  useEffect(() => {
    if (rep <= 1) return
    Animated.timing(slide, {
      toValue: 0,
      duration: fcRepSlide.inMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    }).start()
    const backstop = setTimeout(() => slide.setValue(0), fcRepSlide.inMs + fcRepSlide.backstop)
    return () => clearTimeout(backstop)
  }, [rep, slide])
  const slideStyle = {
    flexGrow: 1,
    opacity: slide.interpolate({ inputRange: [-1, -0.5, 0, 0.5, 1], outputRange: [0, 0.6, 1, 0.6, 0] }),
    transform: [{ translateX: slide.interpolate({ inputRange: [-1, 0, 1], outputRange: [-cardWidth, 0, cardWidth] }) }],
  }

  /*
   * Finishing the character moves on by itself, and the button stays for
   * anyone who'd rather not write it out. Both routes go through `next`, which
   * fires once per rep however they race — a tap landing while the automatic
   * advance is pending must not skip a rep.
   */
  const done = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])
  const next = useCallback(() => {
    if (done.current) return
    done.current = true
    if (timer.current) clearTimeout(timer.current)
    if (last) {
      onNext()
      return
    }
    let left = false
    const leave = () => {
      if (left) return
      left = true
      onNext()
    }
    Animated.timing(slide, {
      toValue: -1,
      duration: fcRepSlide.outMs,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
      useNativeDriver: NATIVE,
    }).start(leave)
    timer.current = setTimeout(leave, fcRepSlide.outMs + fcRepSlide.backstop)
  }, [onNext, last, slide])

  // Counts toward the Writing Practice challenge only when every stroke is
  // written — the button can be pressed without writing.
  const handleComplete = useCallback(() => {
    trackLearningEvent({ type: 'WRITING_COMPLETED', characters: [...text].length })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(next, AUTO_NEXT_MS)
  }, [next, text, trackLearningEvent])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={{ width: column, flexGrow: 1, paddingHorizontal: fcSize.pad, paddingBottom: 12 }}>
          <FlashcardHeader onClose={onClose} step={rep} total={total} label="Rewrite it" unit="rep" secondsLeft={secondsLeft} />

          {/* Moves when the session moves on to or from the reps; a veil, not a
              fade, because of the writer's WebView (see `QuestionContent`). */}
          <QuestionContent style={{ flexGrow: 1 }} veil={{ color: c.background, inset: { top: 6, bottom: 12, side: fcSize.pad } }}>
          <View style={[card, fcShadow, { padding: 18, marginBottom: 12 }]}>
            <Text style={{ fontFamily: 'NunitoExtraBold', ...t.label, color: c.slate, textTransform: 'uppercase' }}>
              {fromMemory ? 'Now from memory' : 'Rewrite it to lock it in'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8, minHeight: t.word.lineHeight }}>
              {fromMemory ? null : (
                <Text className={face} style={{ ...t.word, color: c.ink, includeFontPadding: false }}>{text}</Text>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'InterMedium', ...t.reading, color: c.green }}>{displayPinyin(word, settings.phoneticScript)}</Text>
                <Text numberOfLines={2} style={{ fontFamily: 'NunitoSemiBold', ...t.gloss, color: c.body }}>{shortGloss(word)}</Text>
              </View>
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
            </View>
          </View>

          <Animated.View style={slideStyle}>
          <WritingCard
            minHeight={fcSize.writingMin}
            corner={
              <DiscButton onPress={() => setAttempt((a) => a + 1)} label="Restart writing attempt">
                <RotateCcw size={20} color={c.body} />
              </DiscButton>
            }
          >
            <HanziStage
              character={text}
              mode="quiz"
              showOutline={!fromMemory}
              showGuides
              holdCharacterOnComplete
              characterHoldMs={FC_CHARACTER_HOLD_MS}
              resetKey={attempt}
              onQuizComplete={handleComplete}
            />
          </WritingCard>
          </Animated.View>

          <View style={{ marginTop: 14 }}>
            <PressableScale onPress={next} scaleTo={1} haptic={false} accessibilityLabel={last ? 'Done' : 'Next rep'}>
              <LiftedFace height={fcSize.button} fill={c.green} shoulder={fcShoulders.primary}>
                <Text style={{ fontFamily: 'LoraBold', ...t.button, color: c.onColor }}>{last ? 'Done' : 'Next rep'}</Text>
              </LiftedFace>
            </PressableScale>
          </View>
          </QuestionContent>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
