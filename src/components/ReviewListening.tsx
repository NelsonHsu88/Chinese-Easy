import { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, Animated, Easing, Platform } from 'react-native'
import { Volume2, Check, X, HelpCircle } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { displayWord, displayPinyin } from '../lib/hanzi'
import { speak } from '../lib/speech'
import { playPositiveChime, playRetryTone } from '../lib/sound'
import { celebrateHaptic, tickHaptic } from '../lib/haptics'
/* The verdict palette is the placement test's, imported rather than re-picked:
   the same judgement should be the same colour wherever the learner meets it. */
import { onbVerdict, type VerdictKind } from './onboarding/tokens'
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
  onSkip,
}: {
  word: VocabWord
  options: VocabWord[]
  onAnswer: (correct: boolean) => void
  /** "I don't know" — sends the word to the back of the session queue ungraded. */
  onSkip?: () => void
}) {
  const { settings } = useApp()
  const [pickedId, setPickedId] = useState<string | null>(null)
  /** Set by "I don't know": the answer is shown, but nothing was guessed. */
  const [gaveUp, setGaveUp] = useState(false)
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

  const answered = pickedId !== null || gaveUp
  const wasCorrect = pickedId === word.id

  /*
   * Three verdicts, not two, and they are the onboarding placement test's —
   * imported rather than re-picked so the same judgement is the same colour
   * wherever the learner meets it. Coral *is* this palette's red; a pure red
   * would read as an error dialog from another app. Gold for "I don't know",
   * which is deliberately neither: an honest admission is not a mistake, and
   * colouring it like one teaches the learner to guess instead.
   */
  const verdict: VerdictKind = gaveUp ? 'unsure' : wasCorrect ? 'correct' : 'incorrect'
  const tone = onbVerdict[verdict]

  // Springs the result bar up once an answer lands. Damped hard enough that the
  // Continue button doesn't wobble under the thumb reaching for it.
  useEffect(() => {
    if (!answered) return
    Animated.spring(resultRise, {
      toValue: 1,
      damping: 20,
      stiffness: 190,
      mass: 0.9,
      useNativeDriver: Platform.OS !== 'web',
    }).start()
  }, [answered, resultRise])

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

  /*
   * Giving up still shows the answer before moving on. Skipping straight past
   * it would make "I don't know" the fastest way through the drill and teach
   * nothing; seeing the right word is the whole value of admitting you missed
   * it. No sound — this is not a failure, and the retry tone would say it was.
   */
  const handleGiveUp = () => {
    if (answered) return
    setGaveUp(true)
    tickHaptic()
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
              {/*
                A tinted panel rather than a line of coloured text: a wrong
                answer now looks wrong at a glance, from across the room, the
                way the placement test's does. Inline styles because the tone
                comes from `onbVerdict` — a token file, which is where a colour
                literal belongs — rather than from this screen's Tailwind scale.
              */}
              <View
                className="flex-row items-center gap-3 rounded-2xl px-4 py-3"
                style={{ backgroundColor: tone.fill, borderWidth: 1, borderColor: tone.border }}
              >
                <View
                  className="items-center justify-center rounded-full"
                  style={{ width: 26, height: 26, backgroundColor: tone.accent }}
                >
                  {verdict === 'correct' ? (
                    <Check size={15} color="#ffffff" strokeWidth={3} />
                  ) : verdict === 'incorrect' ? (
                    <X size={15} color="#ffffff" strokeWidth={3} />
                  ) : (
                    <HelpCircle size={15} color="#ffffff" strokeWidth={3} />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-base font-extrabold" style={{ color: tone.text }}>
                    {verdict === 'correct' ? 'Correct!' : verdict === 'incorrect' ? 'Not quite' : 'No problem'}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="font-hanzi text-lg text-slate-800 dark:text-slate-200">{spokenText}</Text>
                    <Text className="text-base text-slate-400">{displayPinyin(word, settings.phoneticScript)}</Text>
                  </View>
                </View>
              </View>

              <Pressable
                onPress={() => (gaveUp ? onSkip?.() : onAnswer(wasCorrect))}
                className={`w-full items-center rounded-2xl py-4 shadow-card ${wasCorrect ? 'bg-brand-500' : 'bg-slate-900 dark:bg-white'}`}
              >
                <Text className={`text-lg font-bold ${wasCorrect ? 'text-white' : 'text-white dark:text-slate-900'}`}>
                  Continue
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <View className="items-center gap-2 py-2">
            <Text className="text-sm text-slate-400">Pick the word you heard</Text>
            {/*
              The honest way out. It shows the answer and sends the word to the
              back of the queue rather than grading it wrong — a learner who
              admits they don't know has told the truth, and scoring that as a
              miss is what teaches people to guess.
            */}
            {onSkip && (
              <Pressable
                onPress={handleGiveUp}
                accessibilityRole="button"
                accessibilityLabel="I don't know this word"
                className="rounded-full px-4 py-2 active:opacity-60"
              >
                <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">I don’t know</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </>
  )
}
