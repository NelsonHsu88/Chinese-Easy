import { useState } from 'react'
import { View, Text, Pressable, Modal as RNModal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { X, RotateCw, PenLine, Check } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { displayWord, displayPinyin } from '../lib/hanzi'
import { HanziStage } from './HanziStage'
import { SpeakButton } from './SpeakButton'
import type { VocabWord } from '../types'

interface Props {
  word: VocabWord
  onClose: () => void
}

type Phase = 'demo' | 'write'

export function WritingPracticeModal({ word, onClose }: Props) {
  const { settings } = useApp()
  const [phase, setPhase] = useState<Phase>('demo')
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ mistakes: number } | null>(null)

  const text = displayWord(word, settings.script)

  const goWrite = () => {
    setResult(null)
    setPhase('write')
  }

  const replayDemo = () => {
    setAttempt((n) => n + 1)
    setResult(null)
    setPhase('demo')
  }

  const tryAgain = () => {
    setAttempt((n) => n + 1)
    setResult(null)
  }

  return (
    <RNModal animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
        <View className="flex-row items-center gap-3 px-4 pt-4">
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close practice"
            className="rounded-full bg-white p-2 shadow-card dark:bg-slate-900"
          >
            <X size={20} color="#64748b" />
          </Pressable>
          <View className="flex-1 flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">Writing Practice</Text>
              <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {text} <Text className="font-normal text-slate-400">{displayPinyin(word, settings.phoneticScript)}</Text>
              </Text>
            </View>
            <SpeakButton text={text} />
          </View>
        </View>

        {phase === 'demo' ? (
          <>
            <View className="items-center gap-1 px-4 pb-2 pt-3">
              <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">Watch how it's written</Text>
            </View>
            <View className="relative mx-4 mb-4 flex-1">
              <HanziStage character={text} mode="demo" resetKey={attempt} showOutline />
            </View>
            <View className="flex-row gap-3 px-4 pb-6 pt-4">
              <Pressable
                onPress={replayDemo}
                className="flex-row items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-4 dark:border-slate-700"
              >
                <RotateCw size={18} color="#64748b" />
                <Text className="font-semibold text-slate-500 dark:text-slate-400">Replay</Text>
              </Pressable>
              <Pressable
                onPress={goWrite}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-brand-500 py-4 shadow-card"
              >
                <PenLine size={20} color="white" />
                <Text className="text-lg font-bold text-white">Let me try</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View className="items-center gap-1 px-4 pb-2 pt-3">
              <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {result
                  ? `Nice! ${result.mistakes === 0 ? 'Perfect strokes' : `${result.mistakes} mistake${result.mistakes === 1 ? '' : 's'}`}`
                  : 'Trace each stroke'}
              </Text>
            </View>
            <View className="relative mx-4 mb-4 flex-1">
              <HanziStage character={text} mode="quiz" showOutline resetKey={attempt} onQuizComplete={(mistakes) => setResult({ mistakes })} />
            </View>
            <View className="gap-2 px-4 pb-6">
              <View className="flex-row gap-2">
                <Pressable
                  onPress={tryAgain}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-slate-300 py-3.5 dark:border-slate-700"
                >
                  <RotateCw size={18} color="#64748b" />
                  <Text className="font-semibold text-slate-500 dark:text-slate-400">Try again</Text>
                </Pressable>
                <Pressable
                  onPress={replayDemo}
                  className="flex-1 items-center justify-center rounded-2xl border border-slate-300 py-3.5 dark:border-slate-700"
                >
                  <Text className="font-semibold text-slate-500 dark:text-slate-400">Watch demo again</Text>
                </Pressable>
              </View>
              <Pressable onPress={onClose} className="w-full flex-row items-center justify-center gap-2 rounded-2xl bg-brand-500 py-4 shadow-card">
                <Check size={20} color="white" />
                <Text className="text-lg font-bold text-white">Done</Text>
              </Pressable>
            </View>
          </>
        )}
      </SafeAreaView>
    </RNModal>
  )
}
