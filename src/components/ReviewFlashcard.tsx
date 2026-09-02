import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, Animated, Platform } from 'react-native'
import { Eye, Check, RotateCw, Lightbulb } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { displayWord, displayExample, displayPinyin } from '../lib/hanzi'
import { ReadingSentence } from './dictionary/ReadingSentence'
import { HanziStage } from './HanziStage'
import { SpeakButton } from './SpeakButton'
import type { ReviewPreview } from '../lib/srs'
import type { Grade, VocabWord } from '../types'
import { shortGloss } from '../lib/definitions'

export type ReviewDirectionResolved = 'recognition' | 'production'

/** Resolves the per-card prompt direction, spreading "mixed" deterministically by word id. */
export function directionFor(wordId: string, setting: 'recognition' | 'production' | 'mixed'): ReviewDirectionResolved {
  if (setting !== 'mixed') return setting
  let h = 0
  for (const ch of wordId) h = (h * 31 + ch.charCodeAt(0)) % 2
  return h === 0 ? 'recognition' : 'production'
}

const GRADE_BUTTONS: { grade: Grade; label: string; className: string }[] = [
  { grade: 'again', label: 'Again', className: 'bg-red-500' },
  { grade: 'hard', label: 'Hard', className: 'bg-orange-500' },
  { grade: 'good', label: 'Good', className: 'bg-brand-500' },
  { grade: 'easy', label: 'Easy', className: 'bg-blue-500' },
]

/**
 * One flashcard: prompt, stroke-order stage, reveal, and the four FSRS grade
 * buttons. Holds only per-card UI state — mount it with `key={word.id}` so it
 * resets on advance; scheduling and session bookkeeping stay with the caller.
 */
export function ReviewFlashcard({
  word,
  direction,
  preview,
  onGrade,
  onSkip,
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
  onGrade: (grade: Grade) => void
  /** "I don't know" — sends the word to the back of the session queue ungraded. */
  onSkip?: () => void
}) {
  const { settings } = useApp()
  const [revealed, setRevealed] = useState(false)
  const [hintShown, setHintShown] = useState(false)
  const [attempt, setAttempt] = useState(0)

  /*
   * The answer rises into place rather than snapping in. Since finishing the
   * character now reveals the answer on its own, the learner isn't looking at a
   * button when it happens — the movement is what draws the eye down to it.
   *
   * RN's own Animated rather than Reanimated: Reanimated's update loop doesn't
   * drive on this project's web target.
   */
  const revealRise = useRef(new Animated.Value(0)).current
  const [answerHeight, setAnswerHeight] = useState(220)

  useEffect(() => {
    if (!revealed) return
    Animated.spring(revealRise, {
      toValue: 1,
      damping: 21,
      stiffness: 195,
      mass: 0.9,
      useNativeDriver: Platform.OS !== 'web',
    }).start()
  }, [revealed, revealRise])

  /*
   * Writing the last stroke correctly *is* the answer, so there's nothing left
   * to ask — the card reveals itself. Only in production ("write this") mode:
   * in recognition mode the character is already on screen, so the stage is
   * practice rather than the question, and auto-revealing would grade the card
   * out from under someone still studying it.
   */
  const handleQuizComplete = useCallback(() => {
    if (direction === 'production') setRevealed(true)
  }, [direction])

  return (
    <>
      <View className="items-center gap-1 px-4 pb-2 pt-3">
        {direction === 'recognition' ? (
          <>
            <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">Recognize this</Text>
            <View className="flex-row items-center gap-2">
              <Text className="font-hanzi text-5xl font-bold text-slate-900 dark:text-white">{displayWord(word, settings.script)}</Text>
              <SpeakButton text={displayWord(word, settings.script)} />
            </View>
          </>
        ) : (
          <>
            <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">Write in Chinese</Text>
            <Text className="text-2xl font-bold text-slate-900 dark:text-white">{shortGloss(word)}</Text>
          </>
        )}
      </View>

      <View
        style={{ minHeight: 200 }}
        className="relative mx-4 mb-4 flex-1 rounded-2xl border border-slate-200 bg-white/60 dark:border-slate-700 dark:bg-slate-900/40"
      >
        {/*
          The answer animation always runs slow, with no control to change it.
          This isn't a stroke-order reference you came to study — it's the replay
          you get the moment you finish writing, and its whole job is to be
          followable at a glance while the card is still in front of you. A speed
          toggle here would also sit right over the drawing area, one more thing
          to catch mid-stroke. The full Normal/Slow choice lives where someone
          has actually gone looking for stroke order: the "Watch stroke order"
          sheet and the writing guide.
        */}
        <HanziStage
          character={displayWord(word, settings.script)}
          mode={revealed ? 'demo' : 'quiz'}
          speed="slow"
          showOutline={revealed || direction === 'recognition' || hintShown}
          showGuides
          resetKey={`${word.id}-${attempt}-${revealed}`}
          onQuizComplete={handleQuizComplete}
        />
      </View>

      {revealed && (
        // NativeWind doesn't process `className` on an Animated.View, so the
        // animated wrapper carries plain styles and the inner View keeps the
        // Tailwind styling.
        <Animated.View
          onLayout={(e) => setAnswerHeight(e.nativeEvent.layout.height)}
          style={{
            transform: [
              { translateY: revealRise.interpolate({ inputRange: [0, 1], outputRange: [answerHeight, 0] }) },
            ],
            opacity: revealRise,
          }}
        >
          <View className="mx-4 mb-3 rounded-3xl bg-white p-5 shadow-card dark:bg-slate-900">
            <View className="flex-row items-center gap-3">
              <Text className="font-hanzi-bold text-[40px] leading-[50px] text-slate-900 dark:text-white">
                {displayWord(word, settings.script)}
              </Text>
              <Text className="text-lg font-medium text-slate-400">{displayPinyin(word, settings.phoneticScript)}</Text>
              <SpeakButton text={displayWord(word, settings.script)} size={20} />
            </View>
            <Text className="mt-1.5 text-xl font-semibold text-slate-800 dark:text-slate-200">{shortGloss(word)}</Text>
            {word.example && displayExample(word, settings.script) && (
              <View className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <ReadingSentence text={displayExample(word, settings.script)} term={displayWord(word, settings.script)} tone="card" size="compact" />
                <Text className="mt-0.5 text-sm italic text-slate-500 dark:text-slate-400">{word.example.translation}</Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}

      <View className="px-4 pb-6">
        {!revealed ? (
          <View className="gap-3">
            <Pressable
              onPress={() => setRevealed(true)}
              className="flex-row items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 shadow-card dark:bg-white"
            >
              <Eye size={20} color="white" />
              <Text className="text-lg font-bold text-white dark:text-slate-900">Show Answer</Text>
            </Pressable>
            <View className="flex-row items-center justify-between px-1">
              <Pressable
                onPress={() => setAttempt((a) => a + 1)}
                accessibilityLabel="Restart writing attempt"
                className="flex-row items-center gap-1.5"
              >
                <RotateCw size={16} color="#64748b" />
                <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">Reset</Text>
              </Pressable>
              {!hintShown && direction === 'production' && (
                <Pressable onPress={() => setHintShown(true)} className="flex-row items-center gap-1.5">
                  <Lightbulb size={16} color="#db9f2e" />
                  <Text className="text-sm font-semibold text-amber-600 dark:text-amber-400">Hint</Text>
                </Pressable>
              )}
            </View>

            {/*
              The honest way out, offered before the answer rather than after.
              It sends the word to the back of the session queue ungraded — a
              learner who admits they don't know has told the truth, and making
              them grade themselves "Again" to move on scores that as a miss.
              Only before the reveal: once the answer is on screen the four
              grade buttons are the right thing to press.
            */}
            {onSkip && (
              <Pressable
                onPress={onSkip}
                accessibilityRole="button"
                accessibilityLabel="I don't know this word"
                className="items-center py-1 active:opacity-60"
              >
                <Text className="text-sm font-semibold text-slate-400 dark:text-slate-500">I don’t know</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View className="flex-row gap-2">
            {GRADE_BUTTONS.map(({ grade, label, className }) => (
              <Pressable
                key={grade}
                onPress={() => onGrade(grade)}
                accessibilityRole="button"
                accessibilityLabel={preview ? `${label}, next review in ${preview[grade].label}` : label}
                className={`flex-1 items-center gap-0.5 rounded-2xl py-3 shadow-card ${className}`}
              >
                {grade === 'easy' && <Check size={16} color="white" />}
                <Text className="text-sm font-bold text-white">{label}</Text>
                {/*
                  When the card comes back if this button is pressed — the Anki
                  habit of showing the consequence before the choice. Rendered
                  only once the preview has arrived rather than as a placeholder,
                  because a row of dashes that becomes numbers reads as the app
                  still thinking.
                */}
                {preview && <Text className="text-[11px] font-semibold text-white/75">{preview[grade].label}</Text>}
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </>
  )
}
