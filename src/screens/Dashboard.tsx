import { useMemo } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Flame, ChevronRight, BookMarked, CalendarRange, List, Zap, CalendarCheck } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { WeeklyChart } from '../components/WeeklyChart'
import { Heatmap } from '../components/Heatmap'
import { StatCard } from '../components/StatCard'
import { dueCountFor } from '../lib/selectors'
import { buildHeatmapFromProgress, summarizeActivity } from '../lib/progress'
import { lastNDays } from '../lib/date'

export function Dashboard() {
  const { wordsLearnedToday, dailyProgress, streak, deck, settings } = useApp()

  const dueCount = dueCountFor(deck)
  const heatmap = useMemo(() => buildHeatmapFromProgress(dailyProgress, 98), [dailyProgress])
  const heatmapSummary = useMemo(() => summarizeActivity(heatmap), [heatmap])
  const weekTotal = useMemo(() => dailyProgress.reduce((sum, d) => sum + d.wordsLearned, 0), [dailyProgress])

  // Always show a real last-7-days window, even for days with zero activity.
  const weeklyChartData = useMemo(() => {
    const byDate = new Map(dailyProgress.map((d) => [d.date, d]))
    return lastNDays(7).map((date) => {
      const entry = byDate.get(date)
      return { date, wordsLearned: entry?.wordsLearned ?? 0, reviewsCompleted: entry?.reviewsCompleted ?? 0 }
    })
  }, [dailyProgress])

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50 dark:bg-slate-950">
      <ScrollView contentContainerStyle={{ gap: 24, padding: 16, paddingTop: 8 }}>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-medium text-slate-400 dark:text-slate-500">Hi, {settings.username || 'Learner'}</Text>
            <Text className="text-lg font-bold text-slate-900 dark:text-white">Dashboard</Text>
          </View>
          <View className="flex-row items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 dark:bg-amber-900/40">
            <Flame size={18} color="#f59e0b" fill="#f59e0b" />
            <Text className="text-sm font-bold text-amber-700 dark:text-amber-300">{streak}</Text>
            <Text className="text-xs font-medium text-amber-700 dark:text-amber-300">day streak</Text>
          </View>
        </View>

        <LinearGradient
          colors={['#1fb96d', '#149457']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 24, padding: 24 }}
        >
          <Text className="text-sm font-medium text-brand-100">Words learned today</Text>
          <Text className="mt-1 text-6xl font-extrabold leading-none tabular-nums text-white">{wordsLearnedToday}</Text>
        </LinearGradient>

        <View className="gap-2">
          <Pressable
            onPress={() => router.push('/review')}
            className="w-full flex-row items-center justify-between rounded-2xl bg-coral-500 px-5 py-4 shadow-card"
          >
            <View className="flex-row items-center gap-2">
              <Text className="text-lg font-bold text-white">Start Review</Text>
              {dueCount > 0 && (
                <Text className="rounded-full bg-white/25 px-2.5 py-0.5 text-sm font-bold text-white">{dueCount} due</Text>
              )}
            </View>
            <ChevronRight size={24} color="white" />
          </Pressable>
          {dueCount > 0 && (
            <Pressable onPress={() => router.push('/due-words')} className="w-full flex-row items-center justify-center gap-1.5 rounded-xl py-2">
              <List size={15} color="#64748b" />
              <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">View words due</Text>
            </Pressable>
          )}
        </View>

        <View className="flex-row gap-3">
          <StatCard label="This week" value={weekTotal} icon={<CalendarRange size={14} color="#149457" />} accent="brand" />
          <StatCard
            label="Words due"
            value={dueCount}
            icon={<BookMarked size={14} color={dueCount > 0 ? '#e3280f' : '#64748b'} />}
            accent={dueCount > 0 ? 'coral' : 'slate'}
          />
        </View>

        <View className="rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
          <Text className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Last 7 days</Text>
          <Text className="mb-1 text-xs text-slate-400">New words learned + reviews completed, per day</Text>
          <WeeklyChart data={weeklyChartData} />
        </View>

        <View className="rounded-2xl bg-white p-4 pb-5 shadow-card dark:bg-slate-900">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">Consistency</Text>
            <Text className="text-xs text-slate-400">Last {heatmapSummary.totalDays} days</Text>
          </View>

          <View className="mb-4 flex-row gap-2">
            <View className="flex-1 items-center rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800">
              <CalendarCheck size={14} color="#1fb96d" />
              <Text className="mt-1 text-lg font-bold leading-none text-slate-900 dark:text-white">{heatmapSummary.activeDays}</Text>
              <Text className="mt-0.5 text-[10px] text-slate-400">active days</Text>
            </View>
            <View className="flex-1 items-center rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800">
              <Zap size={14} color="#f59e0b" />
              <Text className="mt-1 text-lg font-bold leading-none text-slate-900 dark:text-white">{heatmapSummary.longestStreak}</Text>
              <Text className="mt-0.5 text-[10px] text-slate-400">best streak</Text>
            </View>
            <View className="flex-1 items-center rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800">
              <BookMarked size={14} color="#f6432c" />
              <Text className="mt-1 text-lg font-bold leading-none text-slate-900 dark:text-white">
                {heatmapSummary.totalWordsLearned + heatmapSummary.totalReviewsCompleted}
              </Text>
              <Text className="mt-0.5 text-[10px] text-slate-400">total activity</Text>
            </View>
          </View>

          <Heatmap data={heatmap} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
