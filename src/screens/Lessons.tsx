import { useState } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft, Lock, CheckCircle2, Circle, ChevronDown, ChevronUp, Star, Landmark } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { UNITS } from '../data/units'
import { lessonsForUnit } from '../data/lessons'
import { playTapSound } from '../lib/sound'
import { levelForXp, XP_PER_LEVEL } from '../lib/townEconomy'

export function Lessons() {
  const { completedLessonIds, xp } = useApp()
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>('the-basics')

  const sortedUnits = [...UNITS].sort((a, b) => a.order - b.order)
  const { level, xpIntoLevel, levelPct } = levelForXp(xp)

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="mb-2 flex-row items-center justify-between px-4 pt-2">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            className="rounded-full bg-white p-2 shadow-card dark:bg-slate-900"
          >
            <ArrowLeft size={20} color="#64748b" />
          </Pressable>
          <Text className="text-lg font-bold text-slate-900 dark:text-white">Lessons Path</Text>
        </View>
        <View className="flex-row items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 dark:bg-amber-900/40">
          <Star size={14} color="#f5b93d" fill="#f5b93d" />
          <Text className="text-xs font-extrabold text-amber-700 dark:text-amber-300">{xp} XP</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ gap: 4, padding: 16, paddingTop: 8 }}>
        <View className="mb-4 flex-row items-center justify-between rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
          <View className="flex-1">
            <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">Your Progress</Text>
            <Text className="mt-0.5 text-base font-extrabold text-slate-900 dark:text-white">Level {level}</Text>
            <View className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <View className="h-full rounded-full bg-brand-500" style={{ width: `${levelPct}%` }} />
            </View>
            <Text className="mt-1 text-[11px] text-slate-400">
              {xpIntoLevel} / {XP_PER_LEVEL} XP
            </Text>
          </View>
          <Landmark size={40} color="#f5b93d" strokeWidth={1.5} />
        </View>

        {sortedUnits.map((unit, i) => {
          const lessons = lessonsForUnit(unit.id)
          const hasContent = lessons.length > 0
          const previousUnit = sortedUnits[i - 1]
          const previousComplete =
            !previousUnit || lessonsForUnit(previousUnit.id).every((l) => completedLessonIds.includes(l.id))
          const unlocked = unit.order === 1 || (hasContent && previousComplete)
          const completedCount = lessons.filter((l) => completedLessonIds.includes(l.id)).length
          const unitComplete = hasContent && completedCount === lessons.length
          const isExpanded = expandedUnitId === unit.id
          const isLast = i === sortedUnits.length - 1

          return (
            <View key={unit.id} className="flex-row gap-3">
              <View className="items-center">
                <View className="relative">
                  <View className={`h-12 w-12 items-center justify-center rounded-full ${unlocked ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    {unlocked ? <unit.icon size={22} color="white" /> : <Lock size={18} color="#94a3b8" />}
                  </View>
                  <View className="absolute -left-1 -top-1 h-5 w-5 items-center justify-center rounded-full border-2 border-slate-50 bg-white shadow-card dark:border-slate-950 dark:bg-slate-800">
                    <Text className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">{i + 1}</Text>
                  </View>
                </View>
                {!isLast && <View className="my-1 w-0.5 flex-1 border-l-2 border-dashed border-slate-200 dark:border-slate-700" />}
              </View>

              <View className="mb-4 flex-1 overflow-hidden rounded-2xl bg-white shadow-card dark:bg-slate-900">
                <Pressable
                  disabled={!unlocked}
                  onPress={() => {
                    playTapSound()
                    setExpandedUnitId((prev) => (prev === unit.id ? null : unit.id))
                  }}
                  className={`flex-row items-center gap-3 p-4 ${!unlocked ? 'opacity-50' : ''}`}
                >
                  <View className="flex-1">
                    <Text className="text-base font-bold text-slate-900 dark:text-white">{unit.title}</Text>
                    <Text className="font-hanzi text-sm text-slate-500 dark:text-slate-400">{unit.hanzi}</Text>
                    <Text className="text-xs text-slate-400">{unit.pinyin}</Text>
                  </View>
                  {unitComplete && <CheckCircle2 size={20} color="#22c55e" />}
                  {unlocked && hasContent && !unitComplete && (isExpanded ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />)}
                </Pressable>

                {isExpanded && unlocked && hasContent && (
                  <View className="gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
                    {lessons.map((lesson) => {
                      const isComplete = completedLessonIds.includes(lesson.id)
                      return (
                        <Pressable
                          key={lesson.id}
                          onPress={() => {
                            playTapSound()
                            router.push(`/lesson/${lesson.id}`)
                          }}
                          className="flex-row items-center gap-3 rounded-xl bg-slate-50 p-3 active:bg-slate-100 dark:bg-slate-800 dark:active:bg-slate-700"
                        >
                          {isComplete ? <CheckCircle2 size={18} color="#22c55e" /> : <Circle size={18} color="#cbd5e1" />}
                          <Text className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{lesson.title}</Text>
                        </Pressable>
                      )
                    })}
                  </View>
                )}
                {!hasContent && <Text className="px-4 pb-4 text-xs font-semibold text-slate-400">Coming soon</Text>}
              </View>
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}
