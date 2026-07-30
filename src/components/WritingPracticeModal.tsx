import { useState } from 'react'
import { View, Text, Pressable, Modal as RNModal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { X, RotateCw, Eye, Lightbulb, Volume2 } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { displayWord, displayPinyin } from '../lib/hanzi'
import { HanziStage } from './HanziStage'
import { speak } from '../lib/speech'
import { playTapSound } from '../lib/sound'
import type { VocabWord } from '../types'

interface Props {
  word: VocabWord
  onClose: () => void
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

export function WritingPracticeModal({ word, onClose }: Props) {
  const { settings } = useApp()
  const [attempt, setAttempt] = useState(0)
  const [hintKey, setHintKey] = useState(0)
  const [revealKey, setRevealKey] = useState(0)
  const [strokesDone, setStrokesDone] = useState(0)
  const [totalStrokes, setTotalStrokes] = useState(0)

  const text = displayWord(word, settings.script)
  const pinyin = displayPinyin(word, settings.phoneticScript)
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
      // hanzi-writer never reports the stroke total up front, so derive it from
      // the first progress event: what's left plus what's already been drawn.
      setTotalStrokes((t) => (t > 0 ? t : strokesRemaining + next))
      return next
    })
  }

  const reset = () => {
    playTapSound()
    setStrokesDone(0)
    setTotalStrokes(0)
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
          <Text className="text-[22px] font-extrabold text-slate-900 dark:text-white">Write this character</Text>
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
            revealKey={revealKey}
            resetKey={attempt}
            onQuizProgress={handleProgress}
          />
        </View>

        <View className="mt-4 flex-row items-baseline justify-center gap-2.5">
          <Text className="font-hanzi text-[26px] text-slate-900 dark:text-white">{text}</Text>
          <Text className="text-[19px] text-slate-400">{word.definition}</Text>
        </View>

        {exampleText ? (
          <View className="mx-5 mt-4 flex-row items-center gap-3 rounded-2xl bg-brand-100/70 px-4 py-3.5 dark:bg-brand-950/40">
            <View className="flex-1">
              <Text className="font-hanzi text-[21px] text-slate-900 dark:text-white">{exampleText}</Text>
              {example?.pinyin ? (
                <Text className="mt-1 text-[14px] text-slate-500 dark:text-slate-400">{example.pinyin}</Text>
              ) : null}
            </View>
            <SpeakChip text={exampleText} size={19} dim={42} />
          </View>
        ) : null}

        <Pressable
          onPress={() => {
            playTapSound()
            setRevealKey((n) => n + 1)
          }}
          className="mx-5 flex-row items-center justify-center gap-2.5 rounded-full bg-slate-800 py-4 shadow-card active:opacity-90 dark:bg-slate-100"
        >
          <Eye size={22} color="#ffffff" />
          <Text className="text-[19px] font-bold text-white">Show Answer</Text>
        </Pressable>

        <View className="flex-row items-center justify-between px-5 pb-4 pt-4">
          <Pressable onPress={reset} className="flex-row items-center gap-2.5 p-1 active:opacity-60">
            <RotateCw size={22} color="#94a3b8" strokeWidth={2.5} />
            <Text className="text-[18px] font-semibold text-slate-400">Reset</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              playTapSound()
              setHintKey((n) => n + 1)
            }}
            className="flex-row items-center gap-2 rounded-full bg-brand-100 px-5 py-2.5 active:opacity-80 dark:bg-brand-900/40"
          >
            <Lightbulb size={20} color="#16a34a" />
            <Text className="text-[18px] font-bold text-brand-700 dark:text-brand-300">Hint</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </RNModal>
  )
}
