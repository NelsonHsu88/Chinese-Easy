import { useEffect, useState } from 'react'
import { View, Text, Pressable, Modal as RNModal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { X, RotateCw, Lightbulb, Volume2 } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { displayWord, displayPinyin, hanziFont } from '../lib/hanzi'
import { HanziStage } from './HanziStage'
import { speak } from '../lib/speech'
import { playTapSound, playCorrectSound } from '../lib/sound'
import { correctHaptic, tickHaptic } from '../lib/haptics'
import type { VocabWord } from '../types'
import { shortGloss } from '../lib/definitions'
import { ReadingSentence } from './dictionary/ReadingSentence'
import { PressableScale, LiftedFace } from './dashboard/parts'
import { AnswerSheet } from './drills/parts'

/**
 * Faces and shoulders for the raised buttons, from the `brand` scale in the
 * Tailwind config: each shoulder a step or two below its face.
 */
const RAISED = {
  hint: { fill: '#d6fae3', shoulder: '#9fe2b8' },
} as const

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
  /**
   * Once the word is written, replay its stroke order as an animation — the
   * same playback a review flashcard gives after the learner finishes writing.
   * Opt-in, because the writing guide's tracing page advances on Done and has
   * its own animated centrepiece already.
   */
  playbackOnFinish?: boolean
}

/**
 * How long the learner's own finished writing stays on screen before the
 * playback replaces it. Long enough to register "I wrote that", short enough
 * that the playback still reads as the answer to what they just did.
 */
const PLAYBACK_DELAY_MS = 900

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

export function WritingPracticeModal({ word, onClose, onCompleted, playbackOnFinish = false }: Props) {
  const { settings, trackLearningEvent } = useApp()
  const [attempt, setAttempt] = useState(0)
  /** Bumped to clear only the character currently being written — see `resetActive`. */
  const [resetActiveKey, setResetActiveKey] = useState(0)
  const [hintKey, setHintKey] = useState(0)
  const [strokesDone, setStrokesDone] = useState(0)
  const [totalStrokes, setTotalStrokes] = useState(0)
  const [finished, setFinished] = useState(false)
  /** The stage has switched from the learner's quiz to the stroke-order demo. */
  const [playing, setPlaying] = useState(false)
  /**
   * Which characters in the word are already written — the progress
   * indicator's whole reason for existing. Indexes into `characters` below,
   * not into anything HanziStage exposes directly; it reports completions as
   * they happen rather than handing back its own internal state.
   */
  const [completedChars, setCompletedChars] = useState<Set<number>>(() => new Set())

  useEffect(() => {
    if (!finished || !playbackOnFinish) return
    const timer = setTimeout(() => setPlaying(true), PLAYBACK_DELAY_MS)
    return () => clearTimeout(timer)
  }, [finished, playbackOnFinish])

  const text = displayWord(word, settings.script)
  const pinyin = displayPinyin(word, settings.phoneticScript)
  /* Unicode-safe: a spread iterates by code point, which is what every other
     character count in this app already does (see `HanziStage`, `WordDetail`). */
  const characters = [...text]

  // A fresh word, or a full restart after finishing, starts every character grey again.
  useEffect(() => {
    setCompletedChars(new Set())
  }, [text, attempt])

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

  /*
   * `done`/`total` come pre-computed from `HanziStage`, across every
   * character in the word — not accumulated here by counting calls, which is
   * what let the very first version of this go backwards incorrectly: a
   * reset of one character in the middle of the word has to move this bar
   * back down, and only the component that actually knows every glyph's own
   * stroke count can get that arithmetic right.
   */
  const handleProgress = (done: number, total: number) => {
    setStrokesDone(done)
    setTotalStrokes(total)
  }

  /** A single character in the word is finished — lights it up in the header above. */
  const handleCharacterComplete = (idx: number) => {
    setCompletedChars((prev) => {
      if (prev.has(idx)) return prev
      const next = new Set(prev)
      next.add(idx)
      return next
    })
  }

  /*
   * Finishing the word is the one genuine accomplishment in this screen, so it
   * gets what a correct drill answer gets: the answer sheet rising with "Well
   * done!", the ding-ding and its haptic. Guarded against firing twice:
   * hanzi-writer can report completion again if the last stroke is re-evaluated.
   */
  const handleComplete = () => {
    if (finished) return
    setFinished(true)
    trackLearningEvent({ type: 'WRITING_COMPLETED', characters: characters.length })
    playCorrectSound()
    correctHaptic()
  }

  /** "Write it again" — the whole word over, from its first character. */
  const restartWord = () => {
    playTapSound()
    tickHaptic()
    setStrokesDone(0)
    setTotalStrokes(0)
    setFinished(false)
    setPlaying(false)
    setCompletedChars(new Set())
    setAttempt((n) => n + 1)
  }

  /**
   * "Reset" during practice — clears only the character currently being
   * written. `HanziStage` is what actually knows which one that is, so this
   * just bumps the counter it watches for that; the corrected stroke count
   * for the bar above arrives back through `onQuizProgress` a moment later,
   * same as a real stroke would.
   */
  const resetActive = () => {
    playTapSound()
    tickHaptic()
    setResetActiveKey((n) => n + 1)
  }

  return (
    <RNModal animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
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
            {characters.length > 1 ? 'Write this word' : 'Write this character'}
          </Text>
          <SpeakChip text={text} />
        </View>

        {/*
          The word itself, doubling as the progress indicator: each character
          starts muted and turns the same brand green the pinyin used to be
          the moment `HanziStage` reports it finished. A learner can see at a
          glance which character they're on without a separate row of dots or
          numbers competing with the header for attention.
        */}
        <View className="items-center pt-5">
          <View className="flex-row" style={{ gap: 6 }}>
            {characters.map((glyph, i) => (
              <Text
                key={i}
                className={`font-hanzi text-[34px] font-bold ${
                  completedChars.has(i) ? 'text-brand-600 dark:text-brand-400' : 'text-slate-300 dark:text-slate-600'
                }`}
              >
                {glyph}
              </Text>
            ))}
          </View>
          <Text className="mt-1 text-[16px] font-bold text-slate-400">{pinyin}</Text>
        </View>

        {/* Flexes to absorb whatever height is left rather than claiming a fixed
            square — at aspect-square the box alone ate ~350pt and pushed Show
            Answer / Reset / Hint off the bottom of the screen. */}
        <View
          style={{ minHeight: 200 }}
          className="mx-5 mt-3 flex-1 rounded-2xl border border-slate-200 bg-white/60 dark:border-slate-700 dark:bg-slate-900/40"
        >
          <HanziStage
            character={text}
            mode={playing ? 'demo' : 'quiz'}
            // Slow, like the review flashcard's playback: it is watched once,
            // at a glance, rather than studied.
            speed={playing ? 'slow' : 'normal'}
            showOutline
            showGuides
            hintKey={hintKey}
            resetKey={`${attempt}-${playing}`}
            resetActiveKey={resetActiveKey}
            holdCharacterOnComplete
            onQuizProgress={handleProgress}
            onCharacterComplete={handleCharacterComplete}
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

        {/* Reset and Hint keep their place once the word is written — hidden
            under the answer sheet rather than removed, so nothing above moves. */}
        <View
          pointerEvents={finished ? 'none' : 'auto'}
          importantForAccessibility={finished ? 'no-hide-descendants' : 'auto'}
          accessibilityElementsHidden={finished}
          style={{ opacity: finished ? 0 : 1 }}
        >
          <View className="flex-row items-center justify-between px-5 pb-4 pt-4">
            <Pressable onPress={resetActive} className="flex-row items-center gap-2.5 p-1 active:opacity-60">
              <RotateCw size={22} color="#94a3b8" strokeWidth={2.5} />
              <Text className="text-[18px] font-semibold text-slate-400">Reset</Text>
            </Pressable>
            <PressableScale
              onPress={() => {
                playTapSound()
                tickHaptic()
                setHintKey((n) => n + 1)
              }}
              haptic={false}
              accessibilityLabel="Hint"
            >
              <LiftedFace height={44} fill={RAISED.hint.fill} shoulder={RAISED.hint.shoulder} shadow={false}>
                {/* The face is content-sized, so the pill's padding lives here. */}
                <View className="flex-row items-center" style={{ gap: 8, paddingHorizontal: 20 }}>
                  <Lightbulb size={20} color="#16a34a" />
                  <Text className="text-[18px] font-bold text-brand-700">Hint</Text>
                </View>
              </LiftedFace>
            </PressableScale>
          </View>
        </View>
      </SafeAreaView>

      {/* "Go again, or move on" — the only question left once the word is
          written, asked the way a correct drill answer is. */}
      {finished ? (
        <AnswerSheet
          key={attempt}
          kind="correct"
          title="Well done!"
          detail={
            <>
              <Text className={hanziFont(settings.script, 'medium')} style={{ fontSize: 20, color: '#1e293b', includeFontPadding: false }}>
                {text}
              </Text>
              <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: 15, color: '#64748b' }}>
                {pinyin} — {shortGloss(word)}
              </Text>
            </>
          }
          secondary={{ label: 'Write it again', onPress: restartWord }}
          continueLabel="Done"
          onContinue={() => {
            playTapSound()
            ;(onCompleted ?? onClose)()
          }}
        />
      ) : null}
      </View>
    </RNModal>
  )
}
