import { useMemo } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft, Check, Zap } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { playTapSound, playPositiveChime } from '../lib/sound'
import { celebrateHaptic } from '../lib/haptics'
import { CHALLENGE_DEFS, challengeInstanceId, type ChallengeDef } from '../lib/challenges'

function ChallengeCard({ def }: { def: ChallengeDef }) {
  const { dailyProgress, streak, completedLessonIds, xp, claimedChallengeIds, claimChallenge } = useApp()

  const current = Math.min(
    def.target,
    def.progress({ dailyProgress, streak, completedLessonCount: completedLessonIds.length, xp }),
  )
  const instanceId = challengeInstanceId(def)
  const claimed = claimedChallengeIds.includes(instanceId)
  const complete = current >= def.target
  const pct = Math.round((current / def.target) * 100)

  const handleClaim = () => {
    if (!complete || claimed) return
    playPositiveChime()
    celebrateHaptic()
    claimChallenge(instanceId, def.xpReward)
  }

  return (
    <View className="rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
      <View className="flex-row items-center gap-3">
        <View
          className={`h-11 w-11 items-center justify-center rounded-2xl ${
            claimed ? 'bg-brand-500' : 'bg-slate-100 dark:bg-slate-800'
          }`}
        >
          {claimed ? <Check size={20} color="white" /> : <def.icon size={20} color="#16a34a" />}
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-slate-900 dark:text-white">{def.title}</Text>
          <Text className="text-xs text-slate-400">{def.description}</Text>
        </View>
        <View className="flex-row items-center gap-1 rounded-full bg-amber-100 px-2 py-1 dark:bg-amber-900/40">
          <Zap size={12} color="#f59e0b" fill="#f59e0b" />
          <Text className="text-xs font-bold text-amber-700 dark:text-amber-300">+{def.xpReward}</Text>
        </View>
      </View>

      <View className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <View
          className={`h-full rounded-full ${claimed ? 'bg-brand-500' : 'bg-coral-500'}`}
          style={{ width: `${pct}%` }}
        />
      </View>
      <View className="mt-1.5 flex-row items-center justify-between">
        <Text className="text-xs text-slate-400">
          {current}/{def.target}
        </Text>
        {complete && !claimed && (
          <Pressable onPress={handleClaim} className="rounded-full bg-brand-500 px-3 py-1">
            <Text className="text-xs font-bold text-white">Claim</Text>
          </Pressable>
        )}
        {claimed && <Text className="text-xs font-semibold text-brand-600 dark:text-brand-400">Claimed</Text>}
      </View>
    </View>
  )
}

export function Challenges() {
  const dailyDefs = useMemo(() => CHALLENGE_DEFS.filter((d) => d.cadence === 'daily'), [])
  const milestoneDefs = useMemo(() => CHALLENGE_DEFS.filter((d) => d.cadence === 'milestone'), [])

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="mb-2 flex-row items-center gap-3 px-4 pt-2">
        <Pressable
          onPress={() => {
            playTapSound()
            router.back()
          }}
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="rounded-full bg-white p-2 shadow-card dark:bg-slate-900"
        >
          <ArrowLeft size={20} color="#64748b" />
        </Pressable>
        <View>
          <Text className="text-sm font-medium text-slate-400 dark:text-slate-500">Chinese Easy</Text>
          <Text className="text-lg font-bold text-slate-900 dark:text-white">Challenges</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ gap: 20, padding: 16, paddingTop: 8 }}>
        <View className="gap-2.5">
          <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">Today</Text>
          {dailyDefs.map((def) => (
            <ChallengeCard key={def.id} def={def} />
          ))}
        </View>

        <View className="gap-2.5">
          <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">Milestones</Text>
          {milestoneDefs.map((def) => (
            <ChallengeCard key={def.id} def={def} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
