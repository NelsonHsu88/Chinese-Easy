import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { ThumbsUp, Eye, HelpCircle, GraduationCap, Sparkles, type LucideIcon } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { placementItems } from '../data/placementTest'
import { computeEstimatedHsk } from '../lib/placement'
import { displayWord } from '../lib/hanzi'
import { todayISO } from '../lib/date'
import type { PlacementAnswer } from '../types'

type Step = 'intro' | 'test' | 'result'

const RATING_OPTIONS: { rating: PlacementAnswer['rating']; label: string; icon: LucideIcon; className: string }[] = [
  { rating: 'know', label: 'I know this', icon: ThumbsUp, className: 'bg-brand-500' },
  { rating: 'recognize', label: 'I recognize it', icon: Eye, className: 'bg-amber-500' },
  { rating: 'unknown', label: "I don't know this", icon: HelpCircle, className: 'bg-slate-400' },
]

export function Onboarding() {
  const { completeOnboarding, onboardingComplete } = useApp()

  const [step, setStep] = useState<Step>('intro')
  const [testIndex, setTestIndex] = useState(0)
  const [answers, setAnswers] = useState<PlacementAnswer[]>([])

  const estimatedHsk = useMemo(() => computeEstimatedHsk(placementItems, answers), [answers])

  useEffect(() => {
    if (step === 'result') {
      completeOnboarding({ estimatedHsk, completedAt: todayISO() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const currentItem = placementItems[testIndex]

  const handleRate = (rating: PlacementAnswer['rating']) => {
    const nextAnswers = [...answers, { wordId: currentItem.id, rating }]
    setAnswers(nextAnswers)
    if (testIndex + 1 >= placementItems.length) {
      setStep('result')
    } else {
      setTestIndex((i) => i + 1)
    }
  }

  return (
    <LinearGradient colors={['#eefdf4', '#ffffff']} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 px-6 py-8">
        {step === 'intro' && (
          <View className="flex-1 items-center justify-center gap-6">
            <Text className="font-hanzi text-6xl font-bold text-brand-500">{'你好'}</Text>
            <View className="items-center">
              <Text className="text-center text-3xl font-extrabold text-slate-900">Welcome to Chinese Easy</Text>
              <Text className="mt-2 max-w-sm text-center text-slate-500">
                A quick placement test helps us find your starting level so we can pick the right words for you.
              </Text>
            </View>
            <Pressable onPress={() => setStep('test')} className="w-full max-w-xs items-center rounded-2xl bg-brand-500 py-4 shadow-card">
              <Text className="text-lg font-bold text-white">Get Started</Text>
            </Pressable>
          </View>
        )}

        {step === 'test' && currentItem && (
          <View className="flex-1">
            <View className="mb-2">
              <View className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <View className="h-full rounded-full bg-brand-500" style={{ width: `${(testIndex / placementItems.length) * 100}%` }} />
              </View>
              <Text className="mt-2 text-center text-xs font-medium text-slate-400">
                {testIndex + 1} of {placementItems.length}
              </Text>
            </View>

            <View className="flex-1 items-center justify-center gap-2">
              <Text className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-400">HSK {currentItem.hskLevel}</Text>
              <Text className="font-hanzi text-7xl font-bold text-slate-900">{displayWord(currentItem, 'traditional')}</Text>
            </View>

            <View className="gap-2.5 pb-4">
              {RATING_OPTIONS.map(({ rating, label, icon: Icon, className }) => (
                <Pressable
                  key={rating}
                  onPress={() => handleRate(rating)}
                  className={`flex-row items-center justify-center gap-2 rounded-2xl py-4 shadow-card ${className}`}
                >
                  <Icon size={18} color="white" />
                  <Text className="text-base font-bold text-white">{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {step === 'result' && (
          <View className="flex-1 items-center justify-center gap-6">
            <GraduationCap size={56} color="#1fb96d" />
            <View className="items-center">
              <Text className="text-sm font-medium text-slate-400">Your estimated level</Text>
              <Text className="text-6xl font-extrabold text-brand-600">HSK {estimatedHsk}</Text>
            </View>
            <Text className="max-w-xs text-center text-sm text-slate-500">
              We'll start you off with words around this level and adjust as you go. You can retake this test anytime from Settings.
            </Text>
            <Pressable onPress={() => router.replace('/')} className="w-full max-w-xs flex-row items-center justify-center gap-2 rounded-2xl bg-brand-500 py-4 shadow-card">
              <Sparkles size={20} color="white" />
              <Text className="text-lg font-bold text-white">Start Learning</Text>
            </Pressable>
          </View>
        )}

        {onboardingComplete && step !== 'result' && (
          <Pressable onPress={() => router.replace('/')} className="mt-4 items-center">
            <Text className="text-center text-sm font-medium text-slate-400">Cancel and return to app</Text>
          </Pressable>
        )}
      </SafeAreaView>
    </LinearGradient>
  )
}
