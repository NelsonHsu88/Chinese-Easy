import { useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, Image, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ChevronLeft, ChevronRight, Volume2, RotateCcw, BookOpen, Timer, TriangleAlert, Flame, ClipboardList } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { MascotPrompt } from '../components/OnboardingKit'
import { dueCardsFor, dueCountFor, listeningCardsFor, mistakeCardsFor, weakCardsFor } from '../lib/selectors'
import { playTapSound } from '../lib/sound'
import type { ReviewMode } from './ReviewSession'

const FIRE_ICON = require('../assets/images/icons/fire.png')
// The same misty band the Lessons path sits on. Cropped to its own content by
// scripts/processCloudOverlay.mjs, so the aspect is fixed and the art meets the
// bottom edge exactly.
const CLOUDS = require('../assets/images/icons/lessons-clouds.png')
const CLOUDS_ASPECT = 1080 / 239

function openSession(mode: ReviewMode) {
  playTapSound()
  router.push(`/review-session?mode=${mode}`)
}

/** The stack-of-flashcards badge from the reference — two cards offset behind a front one. */
function FlashcardsBadge() {
  return (
    <View className="h-[68px] w-[68px] items-center justify-center rounded-full bg-coral-600">
      <View className="absolute h-9 w-8 rotate-[-14deg] rounded-md bg-white/70" />
      <View className="h-9 w-8 items-center justify-center rounded-md bg-white shadow-card">
        <Text className="font-hanzi-bold text-[19px] leading-[24px] text-coral-600">學</Text>
      </View>
    </View>
  )
}

interface ModeCardProps {
  tag: string
  title: string
  description: string
  count: string
  countUnit: string
  badge: React.ReactNode
  cardClass: string
  tagClass: string
  countClass: string
  onPress: () => void
}

function ModeCard({ tag, title, description, count, countUnit, badge, cardClass, tagClass, countClass, onPress }: ModeCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${count} ${countUnit}`}
      className={`flex-row items-center gap-4 rounded-3xl px-4 py-4 active:opacity-80 ${cardClass}`}
    >
      {badge}
      <View className="flex-1">
        <View className={`self-start rounded-md px-2 py-0.5 ${tagClass}`}>
          <Text className="text-[11px] font-extrabold uppercase tracking-wide">{tag}</Text>
        </View>
        <Text className="mt-1 text-[21px] font-extrabold text-slate-900 dark:text-white">{title}</Text>
        <Text className="mt-0.5 text-[13px] leading-[17px] text-slate-500 dark:text-slate-400">{description}</Text>
      </View>
      <View className="items-center">
        <Text className={`text-[26px] font-extrabold leading-[30px] ${countClass}`}>{count}</Text>
        <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400">{countUnit}</Text>
      </View>
      <View className="h-9 w-9 items-center justify-center rounded-full bg-white shadow-card dark:bg-slate-800">
        <ChevronRight size={20} color="#64748b" strokeWidth={2.5} />
      </View>
    </Pressable>
  )
}

export function Review() {
  const { deck, settings, streak } = useApp()

  const { width: windowWidth } = useWindowDimensions()
  // Measured rather than taken from useWindowDimensions: on web the window can be
  // far wider than the screen the app is actually laid out in.
  const [containerWidth, setContainerWidth] = useState(windowWidth)

  const counts = useMemo(
    () => ({
      due: dueCountFor(deck),
      flashcards: dueCardsFor(deck, settings).length,
      listening: listeningCardsFor(deck, settings).length,
      mistakes: mistakeCardsFor(deck).length,
      weak: weakCardsFor(deck).length,
    }),
    [deck, settings],
  )

  const mascotMessage =
    counts.due === 0
      ? "Nothing due right now — want to drill what you've missed before?"
      : counts.mistakes > 0
        ? "Let's strengthen what you've learned!"
        : `${counts.due} word${counts.due === 1 ? '' : 's'} waiting — let's strengthen what you've learned!`

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas dark:bg-slate-950">
      <View
        pointerEvents="none"
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: containerWidth / CLOUDS_ASPECT }}
      >
        <Image source={CLOUDS} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="mb-4 flex-row items-center gap-1">
          {/* Same back control the Lessons path uses — Review is pushed over the
              tabs, so this is the way out. */}
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityRole="button"
            accessibilityLabel="Back"
            className="-ml-1 p-1"
          >
            <ChevronLeft size={28} color="#1e293b" strokeWidth={2.5} />
          </Pressable>
          <Text className="flex-1 text-[38px] font-extrabold leading-[44px] text-slate-900 dark:text-white">Review</Text>
          <View className="flex-row items-center gap-1.5 rounded-full border border-coral-200 bg-white px-3.5 py-2 shadow-card dark:border-coral-900 dark:bg-slate-900">
            <Image source={FIRE_ICON} style={{ width: 20, height: 20 }} resizeMode="contain" />
            <Text className="text-base font-extrabold text-slate-800 dark:text-slate-100">{streak}</Text>
          </View>
        </View>

        <MascotPrompt message={mascotMessage} />

        <View className="mb-4 flex-row items-stretch rounded-3xl bg-white px-2 py-4 shadow-card dark:bg-slate-900">
          <Pressable
            onPress={() => router.push('/due-words')}
            accessibilityRole="button"
            accessibilityLabel={`${counts.due} words due. Browse them.`}
            className="flex-1 items-center gap-1 active:opacity-70"
          >
            <Text className="text-[26px] font-extrabold leading-[30px] text-slate-900 dark:text-white">{counts.due}</Text>
            <Text className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Words due</Text>
            <ClipboardList size={18} color="#f04747" />
          </Pressable>
          <View className="w-px bg-slate-200 dark:bg-slate-700" />
          <View className="flex-1 items-center gap-1">
            <Text className="text-[26px] font-extrabold leading-[30px] text-slate-900 dark:text-white">{streak}</Text>
            <Text className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Day streak</Text>
            <Flame size={18} color="#ff6b6b" fill="#f5b93d" />
          </View>
          <View className="w-px bg-slate-200 dark:bg-slate-700" />
          <View className="flex-1 items-center gap-1">
            <Text className="text-[26px] font-extrabold leading-[30px] text-slate-900 dark:text-white">{counts.weak}</Text>
            <Text className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Weak words</Text>
            <TriangleAlert size={18} color="#f5b93d" fill="#f5b93d" />
          </View>
        </View>

        <View className="gap-3">
          <ModeCard
            tag="Review"
            title="Flashcards"
            description="Review words and meanings with spaced repetition."
            count={String(counts.flashcards)}
            countUnit="due"
            badge={<FlashcardsBadge />}
            cardClass="bg-coral-50 dark:bg-coral-900/20"
            tagClass="bg-coral-100 dark:bg-coral-900/40"
            countClass="text-coral-600"
            onPress={() => openSession('flashcards')}
          />

          <ModeCard
            tag="Listen"
            title="Listening"
            description="Practice listening and improve your comprehension."
            count={String(counts.listening)}
            countUnit="due"
            badge={
              <View className="h-[68px] w-[68px] items-center justify-center rounded-full bg-brand-500">
                <Volume2 size={34} color="white" strokeWidth={2.25} />
              </View>
            }
            cardClass="bg-brand-50 dark:bg-brand-900/20"
            tagClass="bg-brand-100 dark:bg-brand-900/40"
            countClass="text-brand-600"
            onPress={() => openSession('listening')}
          />

          <ModeCard
            tag="Improve"
            title="Mistakes"
            description="Review words you've missed before."
            count={String(counts.mistakes)}
            countUnit="due"
            badge={
              <View className="h-[68px] w-[68px] items-center justify-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                <RotateCcw size={34} color="#64748b" strokeWidth={2.25} />
              </View>
            }
            cardClass="bg-slate-100/80 dark:bg-slate-800/50"
            tagClass="bg-slate-200 dark:bg-slate-700"
            countClass="text-slate-700 dark:text-slate-200"
            onPress={() => openSession('mistakes')}
          />
        </View>

        <Pressable
          onPress={() => openSession('full')}
          accessibilityRole="button"
          className="mt-5 flex-row items-center justify-center gap-3 rounded-full bg-brand-600 py-4 shadow-card active:opacity-90"
        >
          <BookOpen size={22} color="white" strokeWidth={2.25} />
          <Text className="text-[19px] font-extrabold text-white">Start Review Session</Text>
        </Pressable>

        <Pressable
          onPress={() => openSession('quick')}
          accessibilityRole="button"
          className="mt-3 flex-row items-center justify-center gap-2 self-center rounded-full border-2 border-brand-500 bg-white/80 px-7 py-3 active:opacity-80 dark:bg-slate-900/80"
        >
          <Timer size={19} color="#16a34a" strokeWidth={2.25} />
          <Text className="text-[16px] font-extrabold text-brand-700 dark:text-brand-400">Quick 5-min Review</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
