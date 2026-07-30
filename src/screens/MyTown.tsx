import { useMemo } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft, Zap, Lock, Landmark } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { TOWN_BUILDINGS } from '../data/townBuildings'
import { canAfford, levelForXp } from '../lib/townEconomy'
import { playTapSound } from '../lib/sound'

export function MyTown() {
  const { xp, unlockedBuildingIds, unlockBuilding } = useApp()
  const { level, xpIntoLevel, levelPct } = levelForXp(xp)

  const unlocked = useMemo(
    () => TOWN_BUILDINGS.filter((b) => unlockedBuildingIds.includes(b.id)),
    [unlockedBuildingIds],
  )
  const locked = useMemo(
    () => TOWN_BUILDINGS.filter((b) => !unlockedBuildingIds.includes(b.id)),
    [unlockedBuildingIds],
  )

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50 dark:bg-slate-950">
      <ScrollView contentContainerStyle={{ gap: 20, padding: 16, paddingBottom: 40 }}>
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            className="rounded-full bg-white p-2 shadow-card dark:bg-slate-900"
          >
            <ArrowLeft size={20} color="#64748b" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-sm font-medium text-slate-400 dark:text-slate-500">Chinese Easy</Text>
            <Text className="text-lg font-bold text-slate-900 dark:text-white">My Town</Text>
          </View>
          <View className="flex-row items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 dark:bg-amber-900/40">
            <Zap size={16} color="#db9f2e" fill="#db9f2e" />
            <Text className="text-sm font-bold text-amber-700 dark:text-amber-300">{xp} XP</Text>
          </View>
        </View>

        <Text className="text-xs text-slate-400">
          Earn XP by reviewing words and finishing lessons, then spend it below to build up your town.
        </Text>

        <View className="flex-row items-center justify-between rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
          <View className="flex-1">
            <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">Town Progress</Text>
            <Text className="mt-0.5 text-base font-extrabold text-slate-900 dark:text-white">Level {level}</Text>
            <View className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <View className="h-full rounded-full bg-amber-500" style={{ width: `${levelPct}%` }} />
            </View>
            <Text className="mt-1 text-[11px] text-slate-400">
              {xpIntoLevel} / 200 XP
            </Text>
          </View>
          <Landmark size={40} color="#f5b93d" strokeWidth={1.5} />
        </View>

        <View>
          <Text className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">Your town · {unlocked.length} buildings</Text>
          {unlocked.length === 0 ? (
            <View className="items-center rounded-3xl border-2 border-dashed border-brand-200 bg-brand-50/60 py-10 dark:border-brand-900 dark:bg-brand-950/20">
              <Text className="text-sm text-slate-400">Nothing built yet — unlock your first building below.</Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-3 rounded-3xl bg-brand-50/60 p-4 dark:bg-brand-950/20">
              {unlocked.map((b) => (
                <View key={b.id} className="w-[30%] items-center gap-1.5 rounded-2xl bg-white py-4 shadow-card dark:bg-slate-900">
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40">
                    <b.icon size={20} color="#16a34a" />
                  </View>
                  <Text className="px-1 text-center text-[11px] font-bold text-slate-700 dark:text-slate-300">{b.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View>
          <Text className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">Shop</Text>
          <View className="gap-2.5">
            {locked.map((b) => {
              const affordable = canAfford(xp, b.xpCost)
              return (
                <View
                  key={b.id}
                  className="flex-row items-center gap-3 rounded-2xl bg-white p-3.5 shadow-card dark:bg-slate-900"
                >
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <b.icon size={20} color="#94a3b8" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-slate-900 dark:text-white">{b.name}</Text>
                    <Text numberOfLines={1} className="text-xs text-slate-400">{b.description}</Text>
                  </View>
                  <Pressable
                    disabled={!affordable}
                    onPress={() => {
                      playTapSound()
                      unlockBuilding(b.id, b.xpCost)
                    }}
                    className={`flex-row items-center gap-1.5 rounded-xl px-3 py-2 ${affordable ? 'bg-brand-500' : 'bg-slate-100 dark:bg-slate-800'}`}
                  >
                    {!affordable && <Lock size={12} color="#94a3b8" />}
                    <Text className={`text-xs font-bold ${affordable ? 'text-white' : 'text-slate-400'}`}>{b.xpCost} XP</Text>
                  </Pressable>
                </View>
              )
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
