import { useMemo } from 'react'
import { View, Text, Pressable, ScrollView, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Flame, BookMarked, CalendarCheck, Zap, GraduationCap, Building2, List, Trophy, Menu } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { IllustratedCard } from '../components/IllustratedCard'
import { WordsLineChart } from '../components/WordsLineChart'
import { Heatmap } from '../components/Heatmap'
import { MascotPrompt } from '../components/OnboardingKit'
import { dueCountFor } from '../lib/selectors'
import { buildHeatmapFromProgress, summarizeActivity } from '../lib/progress'
import { lastNDays, weekdayLabel } from '../lib/date'
import { devNow } from '../lib/devClock'
import { CHALLENGE_DEFS, challengeInstanceId } from '../lib/challenges'
import { LESSONS } from '../data/lessons'
import { TOWN_BUILDINGS } from '../data/townBuildings'

function greeting(): string {
  const hour = devNow().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
}

const GENERAL_SHIFU_LINES = [
  'Every character you learn brings you closer to fluency!',
  'Consistency beats perfection — even five minutes counts today.',
  'I believe in you! Let’s keep the momentum going.',
  'Ready when you are! What shall we learn today?',
  'Small steps every day add up to big progress.',
]

/** Picks what Shifu says on the dashboard: a contextual nudge first, otherwise a day-stable rotating line. */
function shifuQuote(name: string, lessonsCompletedCount: number, dueCount: number, streak: number): string {
  const displayName = name || 'friend'
  if (lessonsCompletedCount === 0) return `Hi ${displayName}! Let's start our first lesson together!`
  if (dueCount > 0) return `You have ${dueCount} word${dueCount === 1 ? '' : 's'} waiting — let's review them!`
  if (streak >= 3) return `You're on a ${streak}-day streak! I'm proud of you, ${displayName}.`
  const dayIndex = new Date().getDate() % GENERAL_SHIFU_LINES.length
  return GENERAL_SHIFU_LINES[dayIndex]
}

export function Dashboard() {
  const { wordsLearnedToday, dailyProgress, streak, deck, settings, xp, unlockedBuildingIds, completedLessonIds, claimedChallengeIds } =
    useApp()

  const dueCount = dueCountFor(deck)
  const claimableChallenges = useMemo(() => {
    const ctx = { dailyProgress, streak, completedLessonCount: completedLessonIds.length, xp }
    return CHALLENGE_DEFS.filter((def) => {
      const id = challengeInstanceId(def)
      if (claimedChallengeIds.includes(id)) return false
      return def.progress(ctx) >= def.target
    }).length
  }, [dailyProgress, streak, completedLessonIds.length, xp, claimedChallengeIds])
  const heatmap = useMemo(() => buildHeatmapFromProgress(dailyProgress, 98), [dailyProgress])
  const heatmapSummary = useMemo(() => summarizeActivity(heatmap), [heatmap])
  const weekTotal = useMemo(() => dailyProgress.reduce((sum, d) => sum + d.wordsLearned, 0), [dailyProgress])

  const weeklyChartData = useMemo(() => {
    const byDate = new Map(dailyProgress.map((d) => [d.date, d]))
    return lastNDays(7).map((date) => ({ date, wordsLearned: byDate.get(date)?.wordsLearned ?? 0 }))
  }, [dailyProgress])
  const dayLabels = useMemo(() => weeklyChartData.map((d) => weekdayLabel(d.date)), [weeklyChartData])

  // The reference mockup breaks the greeting over two lines ("Good" / "Morning,").
  const [greetingLead, ...greetingRest] = greeting().split(' ')
  const greetingTail = greetingRest.join(' ')

  const lessonsCompletedCount = completedLessonIds.length
  const lessonSubtitle =
    lessonsCompletedCount === 0 ? 'Begin Unit 1: The Basics' : `${lessonsCompletedCount}/${LESSONS.length} lessons complete`
  const mascotMessage = useMemo(
    () => shifuQuote(settings.username, lessonsCompletedCount, dueCount, streak),
    [settings.username, lessonsCompletedCount, dueCount, streak],
  )

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas dark:bg-slate-950">
      <ScrollView contentContainerStyle={{ gap: 20, padding: 16, paddingTop: 8 }}>
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            className="-ml-1 rounded-full p-1 active:bg-slate-200/60 dark:active:bg-slate-800"
          >
            <Menu size={26} color="#334155" strokeWidth={2.5} />
          </Pressable>
          <View className="flex-row items-center gap-1.5 rounded-full border border-black/5 bg-white px-3.5 py-2 shadow-card dark:border-white/10 dark:bg-slate-900">
            <Flame size={18} color="#ff6b6b" fill="#f5b93d" />
            <Text className="text-base font-extrabold text-slate-800 dark:text-slate-100">{streak}</Text>
          </View>
        </View>

        <View className="-mt-2">
          <Text className="text-[38px] font-extrabold leading-[1.08] text-slate-900 dark:text-white">
            {greetingLead}
          </Text>
          <Text className="text-[38px] font-extrabold leading-[1.08] text-slate-900 dark:text-white">
            {greetingTail},
          </Text>
          <View className="mt-1 self-start rounded-lg bg-amber-300 px-2.5 py-0.5 dark:bg-amber-500/40">
            <Text className="text-[38px] font-extrabold italic leading-[1.15] text-slate-900 dark:text-white">
              {settings.username || 'Learner'}!
            </Text>
          </View>
        </View>

        <MascotPrompt message={mascotMessage} />

        <IllustratedCard
          tag="Review"
          title="Start Review"
          subtitle={dueCount > 0 ? 'Keep your streak alive!' : "You're all caught up"}
          icon={<Flame size={56} color="#ff6b6b" fill="#ff6b6b" fillOpacity={0.25} strokeWidth={1.75} />}
          color="coral"
          stats={[
            { label: 'Words due', value: dueCount },
            { label: 'Day streak', value: streak },
          ]}
          onPress={() => router.push('/review')}
        />
        {dueCount > 0 && (
          <Pressable onPress={() => router.push('/due-words')} className="-mt-3 flex-row items-center justify-center gap-1.5 rounded-xl py-1">
            <List size={15} color="#64748b" />
            <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">View words due</Text>
          </Pressable>
        )}

        <IllustratedCard
          tag="Learn"
          title="Ready to start a lesson?"
          subtitle={lessonSubtitle}
          icon={<GraduationCap size={56} color="#22c55e" strokeWidth={1.75} />}
          color="brand"
          stats={[
            { label: 'Lessons completed', value: lessonsCompletedCount },
            { label: 'XP earned', value: xp },
          ]}
          onPress={() => router.push('/lessons')}
        />

        <IllustratedCard
          tag="Build"
          title="Build your town"
          subtitle="Grow your Chinese village!"
          icon={<Image source={TOWN_BUILDINGS[6].image} style={{ width: 84, height: 84 }} resizeMode="contain" />}
          color="amber"
          stats={[
            { label: 'Buildings', value: unlockedBuildingIds.length },
            { label: 'XP to spend', value: xp },
          ]}
          onPress={() => router.push('/my-town')}
        />

        <IllustratedCard
          tag="Challenges"
          title={claimableChallenges > 0 ? 'Rewards ready to claim!' : 'Daily challenges'}
          subtitle="Complete goals to earn bonus XP"
          icon={<Trophy size={56} color="#8b5cf6" strokeWidth={1.75} />}
          color="violet"
          stats={[
            { label: 'Ready to claim', value: claimableChallenges },
            { label: 'Total challenges', value: CHALLENGE_DEFS.length },
          ]}
          onPress={() => router.push('/challenges')}
        />

        <View className="rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
          <Text className="mb-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Words learned</Text>
          <Text className="mb-2 text-xs text-slate-400">Last 7 days · {wordsLearnedToday} today</Text>
          <WordsLineChart data={weeklyChartData} dayLabels={dayLabels} />
        </View>

        <View className="rounded-2xl bg-white p-4 pb-5 shadow-card dark:bg-slate-900">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">Consistency</Text>
            <Text className="text-xs text-slate-400">Last {heatmapSummary.totalDays} days</Text>
          </View>

          <View className="mb-4 flex-row gap-2">
            <View className="flex-1 items-center rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800">
              <CalendarCheck size={14} color="#22c55e" />
              <Text className="mt-1 text-lg font-bold leading-none text-slate-900 dark:text-white">{heatmapSummary.activeDays}</Text>
              <Text className="mt-0.5 text-[10px] text-slate-400">active days</Text>
            </View>
            <View className="flex-1 items-center rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800">
              <Zap size={14} color="#f59e0b" />
              <Text className="mt-1 text-lg font-bold leading-none text-slate-900 dark:text-white">{heatmapSummary.longestStreak}</Text>
              <Text className="mt-0.5 text-[10px] text-slate-400">best streak</Text>
            </View>
            <View className="flex-1 items-center rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800">
              <BookMarked size={14} color="#ff6b6b" />
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
