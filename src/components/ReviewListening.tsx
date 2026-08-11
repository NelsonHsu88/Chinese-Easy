import { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, Animated, Easing, Platform } from 'react-native'
import { Volume2, Check, X } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { displayWord, displayPinyin } from '../lib/hanzi'
import { speak } from '../lib/speech'
import { playPositiveChime, playRetryTone } from '../lib/sound'
import { celebrateHaptic } from '../lib/haptics'
import type { VocabWord } from '../types'
import { shortGloss } from '../lib/definitions'

/**
 * The listening drill: the word is spoken aloud and the learner picks which of
 * four written words they heard. Options deliberately show the characters and
 * the English gloss but not pinyin — pinyin is a transcription of the audio, so
 * showing it would answer the question.
 *
 * Mount with `key={word.id}` so the auto-play and answer state reset per word.
 */
export function ReviewListening({
  word,
  options,
  onAnswer,
}: {
  word: VocabWord
  options: VocabWord[]
  onAnswer: (correct: boolean) => void
}) {
  const { settings } = useApp()
  const [pickedId, setPickedId] = useState<string | null>(null)
  const spokenText = displayWord(word, settings.script)

  /*
   * The result bar rises from below the fold rather than appearing under the
   * options. Answering is the moment the drill turns from a question into
   * feedback, and having the verdict slide up to meet you marks that far better
   * than a swap that happens between frames.
   *
   * RN's own Animated rather than Reanimated: Reanimated's update loop doesn't
   * drive on this project's web target, so an animated style there evaluates
   * once and then never changes.
   */
  const resultRise = useRef(new Animated.Value(0)).current
  const [barHeight, setBarHeight] = useState(160)

  // Play once on arrival, the way a listening exercise opens itself.
  useEffect(() => {
    speak(spokenText)
  }, [spokenText])

  const answered = pickedId !== null
  const wasCorrect = pickedId === word.id

  // Springs the result bar up once an answer lands. Damped hard enough that the
  // Continue button doesn't wobble under the thumb reaching for it.
  useEffect(() => {
    if (pickedId === null) return
    Animated.spring(resultRise, {
      toValue: 1,
      damping: 20,
      stiffness: 190,
      mass: 0.9,
      useNativeDriver: Platform.OS !== 'web',
    }).start()
  }, [pickedId, resultRise])

  const handlePick = (id: string) => {
    if (answered) return
    setPickedId(id)
    if (id === word.id) {
      playPositiveChime()
      celebrateHaptic()
    } else {
      playRetryTone()
    }
  }

  return (
    <>
      <View className="items-center gap-4 px-4 pb-2 pt-6">
        <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">Which word do you hear?</Text>
        <Pressable
          onPress={() => speak(spokenText)}
          accessibilityRole="button"
          accessibilityLabel="Play the word again"
          className="h-24 w-24 items-center justify-center rounded-full bg-brand-500 shadow-card active:opacity-80"
        >
          <Volume2 size={44} color="white" strokeWidth={2.25} />
        </Pressable>
        <Text className="text-sm text-slate-400">Tap to hear it again</Text>
      </View>

      <View className="flex-1 justify-center gap-3 px-4 py-4">
        {options.map((option) => {
          const isAnswer = option.id === word.id
          const isPicked = option.id === pickedId
          // Once answered, the right option always turns green — including when
          // it wasn't the one tapped, so a miss still teaches the answer.
          const tone = !answered
            ? 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
            : isAnswer
              ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/25'
              : isPicked
                ? 'border-coral-500 bg-coral-50 dark:border-coral-400 dark:bg-coral-900/25'
                : 'border-slate-200 bg-white opacity-50 dark:border-slate-700 dark:bg-slate-900'

          return (
            <Pressable
              key={option.id}
              onPress={() => handlePick(option.id)}
              disabled={answered}
              accessibilityRole="button"
              className={`flex-row items-center gap-4 rounded-2xl border-2 px-5 py-4 ${tone}`}
            >
              <Text className="font-hanzi-bold text-[32px] leading-[40px] text-slate-900 dark:text-white">
                {displayWord(option, settings.script)}
              </Text>
              <Text className="flex-1 text-base font-semibold text-slate-600 dark:text-slate-300" numberOfLines={2}>
                {shortGloss(option)}
              </Text>
              {answered && isAnswer && <Check size={22} color="#16a34a" strokeWidth={3} />}
              {answered && isPicked && !isAnswer && <X size={22} color="#f04747" strokeWidth={3} />}
            </Pressable>
          )
        })}
      </View>

      <View className="overflow-hidden px-4 pb-6">
        {/* NativeWind doesn't process `className` on an Animated.View, so the
            animated wrapper below carries plain styles only and the inner View
            keeps the Tailwind layout. */}
        {answered ? (
          <Animated.View
            onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
            style={{
              transform: [
                {
                  translateY: resultRise.interpolate({
                    inputRange: [0, 1],
                    // Starts one bar-height down so it clears the clipped edge
                    // completely, rather than peeking before it moves.
                    outputRange: [barHeight, 0],
                  }),
                },
              ],
              opacity: resultRise,
            }}
          >
            <View className="gap-3">
              <View className="flex-row items-center justify-center gap-2">
                <Text className={`text-base font-extrabold ${wasCorrect ? 'text-brand-600' : 'text-coral-600'}`}>
                  {wasCorrect ? 'Correct!' : 'Not quite —'}
                </Text>
                <Text className="font-hanzi text-lg text-slate-800 dark:text-slate-200">{spokenText}</Text>
                <Text className="text-base text-slate-400">{displayPinyin(word, settings.phoneticScript)}</Text>
              </View>
              <Pressable
                onPress={() => onAnswer(wasCorrect)}
                className={`w-full items-center rounded-2xl py-4 shadow-card ${wasCorrect ? 'bg-brand-500' : 'bg-slate-900 dark:bg-white'}`}
              >
                <Text className={`text-lg font-bold ${wasCorrect ? 'text-white' : 'text-white dark:text-slate-900'}`}>
                  Continue
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <View className="items-center py-4">
            <Text className="text-sm text-slate-400">Pick the word you heard</Text>
          </View>
        )}
      </View>
    </>
  )
}
