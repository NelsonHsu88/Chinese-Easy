import { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, Modal as RNModal, Animated, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { X, RotateCw, Lightbulb, Volume2, Check, ArrowRight } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { displayWord, displayPinyin } from '../lib/hanzi'
import { HanziStage } from './HanziStage'
import { speak } from '../lib/speech'
import { playTapSound, playPositiveChime } from '../lib/sound'
import { rippleHaptic, tickHaptic } from '../lib/haptics'
import type { VocabWord } from '../types'
import { shortGloss } from '../lib/definitions'
import { ReadingSentence } from './dictionary/ReadingSentence'

interface Props {
  word: VocabWord
  onClose: () => void
  /**
   * Fired instead of `onClose` when the learner finishes the character and taps
   * Done — a signal that the practice was actually *completed*, not merely
   * dismissed. The writing guide uses it to advance its lesson, which closing
   * early must not do.
   */
  onCompleted?: () => void
}

/** White circular speaker chip, as used in the reference design. */
function SpeakChip({ text, size = 22, dim = 48 }: { text: string; size?: number; dim?: number }) {
  return (
    <Pressable
      onPress={() => speak(text)}
      accessibilityRole="button"
      accessibilityLabel={`Play pronunciation of ${text}`}
      style={{ width: dim, height: dim }}
      className="items-center justify-center rounded-full bg-white shadow-card active:opacity-70"
    >
      <Volume2 size={size} color="#1e293b" />
    </Pressable>
  )
}

export function WritingPracticeModal({ word, onClose, onCompleted }: Props) {
  const { settings } = useApp()
  const [attempt, setAttempt] = useState(0)
  const [hintKey, setHintKey] = useState(0)
  const [strokesDone, setStrokesDone] = useState(0)
  const [totalStrokes, setTotalStrokes] = useState(0)
  const [finished, setFinished] = useState(false)

  /*
   * Finishing the character used to leave the learner facing a "Show Answer"
   * button, which makes no sense once they've written the thing correctly —
   * there's no answer left to show. Instead the card asks the only question that
   * still matters: go again, or move on.
   */
  const finishRise = useRef(new Animated.Value(0)).current
  const [finishHeight, setFinishHeight] = useState(180)

  useEffect(() => {
    if (!finished) return
    Animated.spring(finishRise, {
      toValue: 1,
      damping: 21,
      stiffness: 195,
      mass: 0.9,
      useNativeDriver: Platform.OS !== 'web',
    }).start()
  }, [finished, finishRise])

  const text = displayWord(word, settings.script)
  const pinyin = displayPinyin(word, settings.phoneticScript)

  /*
   * Says the word once, as the screen opens.
   *
   * Writing a character you can't hear is copying a shape. Every caller mounts
   * this modal fresh when practice starts, so mounting is exactly the moment
   * practice begins and one play here covers all of them — the dictionary, New
   * Words, My Words, the two detail screens and the story reader.
   *
   * Keyed on the text rather than on mount alone so that a word arriving late,
   * or the script setting changing underneath it, says the thing actually on
   * screen. The speaker chip stays where it is for hearing it again.
   */
  useEffect(() => {
    if (text) speak(text)
  }, [text])
  const example = word.example
  const exampleText = example
    ? settings.script === 'simplified'
      ? example.simplified
      : example.traditional
    : ''

  const progressPct = totalStrokes > 0 ? Math.round((strokesDone / totalStrokes) * 100) : 0

  const handleProgress = (strokesRemaining: number) => {
    setStrokesDone((done) => {
      const next = done + 1
      /*
       * hanzi-writer never reports the stroke total up front, so derive it from
       * the first progress event: what's left plus what's already been drawn.
       *
       * `strokesRemaining` counts the whole word, not the character currently
       * being written (see `HanziStage`), so a two-character word reads 12 here
       * rather than the 8 of its first character — which used to leave the
       * counter finishing at 12 / 8 with the bar overshot.
       */
      setTotalStrokes((t) => (t > 0 ? t : strokesRemaining + next))
      return next
    })
  }

  /*
   * Finishing the character is the one genuine accomplishment in this screen, so
   * it gets the same chime-and-buzz the app uses for a correct review answer
   * rather than passing in silence. Guarded against firing twice: hanzi-writer
   * can report completion again if the last stroke is re-evaluated.
   */
  const handleComplete = () => {
    if (finished) return
    setFinished(true)
    playPositiveChime()
    // One beat per character, so the rhythm counts back what was just written —
    // a two-character word feels different from a four.
    rippleHaptic([...text].length)
  }

  const reset = () => {
    playTapSound()
    tickHaptic()
    setStrokesDone(0)
    setTotalStrokes(0)
    setFinished(false)
    finishRise.setValue(0)
    setAttempt((n) => n + 1)
  }

  return (
    <RNModal animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-canvas dark:bg-slate-950">
        <View className="flex-row items-center gap-3 px-5 pt-3">
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close practice"
            className="-ml-1 p-1 active:opacity-60"
          >
            <X size={28} color="#1e293b" strokeWidth={2.5} />
          </Pressable>
          <View className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
            <View className="h-full rounded-full bg-brand-500" style={{ width: `${progressPct}%` }} />
          </View>
          <Text className="text-[17px] font-bold text-slate-400">
            {strokesDone} / {totalStrokes || '—'}
          </Text>
        </View>

        <View className="flex-row items-center justify-between px-5 pt-6">
          <Text className="text-[22px] font-extrabold text-slate-900 dark:text-white">
            {[...text].length > 1 ? 'Write this word' : 'Write this character'}
          </Text>
          <SpeakChip text={text} />
        </View>

        <Text className="pt-5 text-center text-[26px] font-extrabold text-brand-600 dark:text-brand-400">{pinyin}</Text>

        {/* Flexes to absorb whatever height is left rather than claiming a fixed
            square — at aspect-square the box alone ate ~350pt and pushed Show
            Answer / Reset / Hint off the bottom of the screen. */}
        <View
          style={{ minHeight: 200 }}
          className="mx-5 mt-3 flex-1 rounded-2xl border border-slate-200 bg-white/60 dark:border-slate-700 dark:bg-slate-900/40"
        >
          <HanziStage
            character={text}
            mode="quiz"
            showOutline
            showGuides
            hintKey={hintKey}
            resetKey={attempt}
            holdCharacterOnComplete
            onQuizProgress={handleProgress}
            onQuizComplete={handleComplete}
          />
        </View>

        <View className="mt-4 flex-row items-baseline justify-center gap-2.5">
          <Text className="font-hanzi text-[26px] text-slate-900 dark:text-white">{text}</Text>
          <Text className="text-[19px] text-slate-400">{shortGloss(word)}</Text>
        </View>

        {exampleText ? (
          <View className="mx-5 mt-4 flex-row items-center gap-3 rounded-2xl bg-brand-100/70 px-4 py-3.5 dark:bg-brand-950/40">
            <View className="flex-1">
              <ReadingSentence text={exampleText} term={text} tone="card" />
            </View>
            <SpeakChip text={exampleText} size={19} dim={42} />
          </View>
        ) : null}

        {finished ? (
          // NativeWind doesn't process `className` on an Animated.View, so the
          // animated wrapper carries plain styles and the inner View keeps the
          // Tailwind styling.
          <Animated.View
            onLayout={(e) => setFinishHeight(e.nativeEvent.layout.height)}
            style={{
              transform: [
                { translateY: finishRise.interpolate({ inputRange: [0, 1], outputRange: [finishHeight, 0] }) },
              ],
              opacity: finishRise,
            }}
          >
            <View className="px-5 pb-4 pt-2">
              <View className="mb-3 flex-row items-center justify-center gap-2">
                <Check size={22} color="#16a34a" strokeWidth={3} />
                <Text className="text-[19px] font-extrabold text-brand-600 dark:text-brand-400">
                  Nicely written!
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={reset}
                  accessibilityRole="button"
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-full border border-slate-200 bg-white py-4 shadow-card active:opacity-80 dark:border-slate-700 dark:bg-slate-900"
                >
                  <RotateCw size={20} color="#64748b" strokeWidth={2.5} />
                  <Text className="text-[17px] font-bold text-slate-600 dark:text-slate-300">Write it again</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    playTapSound()
                    ;(onCompleted ?? onClose)()
                  }}
                  accessibilityRole="button"
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-full bg-brand-500 py-4 shadow-card active:opacity-80"
                >
                  <Text className="text-[17px] font-bold text-white">Done</Text>
                  <ArrowRight size={20} color="#ffffff" strokeWidth={2.5} />
                </Pressable>
              </View>
            </View>
          </Animated.View>
        ) : (
          <View className="flex-row items-center justify-between px-5 pb-4 pt-4">
            <Pressable onPress={reset} className="flex-row items-center gap-2.5 p-1 active:opacity-60">
              <RotateCw size={22} color="#94a3b8" strokeWidth={2.5} />
              <Text className="text-[18px] font-semibold text-slate-400">Reset</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                playTapSound()
                tickHaptic()
                setHintKey((n) => n + 1)
              }}
              className="flex-row items-center gap-2 rounded-full bg-brand-100 px-5 py-2.5 active:opacity-80 dark:bg-brand-900/40"
            >
              <Lightbulb size={20} color="#16a34a" />
              <Text className="text-[18px] font-bold text-brand-700 dark:text-brand-300">Hint</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </RNModal>
  )
}
