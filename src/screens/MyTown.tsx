import { useMemo } from 'react'
import { View, Text, Pressable, ScrollView, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { ArrowLeft, Lock, Star } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { TOWN_BUILDINGS } from '../data/townBuildings'
import { canAfford, levelForXp, XP_PER_LEVEL } from '../lib/townEconomy'
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
      <ScrollView contentContainerStyle={{ gap: 18, padding: 16, paddingBottom: 40 }}>
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            className="rounded-full bg-white p-2 shadow-card dark:bg-slate-900"
          >
            <ArrowLeft size={20} color="#64748b" />
          </Pressable>
          <Text className="flex-1 text-lg font-bold text-slate-900 dark:text-white">My Town</Text>
          <View className="flex-row items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 dark:bg-amber-900/40">
            <Star size={14} color="#f5b93d" fill="#f5b93d" />
            <Text className="text-sm font-extrabold text-amber-700 dark:text-amber-300">{xp} XP</Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
          <View className="flex-1">
            <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">Town Progress</Text>
            <Text className="mt-0.5 text-base font-extrabold text-slate-900 dark:text-white">Level {level}</Text>
            <View className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <View className="h-full rounded-full bg-brand-500" style={{ width: `${levelPct}%` }} />
            </View>
            <Text className="mt-1 text-[11px] text-slate-400">
              {xpIntoLevel} / {XP_PER_LEVEL} XP
            </Text>
          </View>
          <Image source={TOWN_BUILDINGS[8].image} style={{ width: 64, height: 64 }} resizeMode="contain" />
        </View>

        <View className="overflow-hidden rounded-3xl shadow-card">
          <LinearGradient colors={['#dff1ff', '#eafbe7', '#d6f0c9']} className="p-4">
            <Text className="text-sm font-extrabold text-slate-700">Your Chinese Village</Text>
            <Text className="mt-0.5 text-[11px] text-slate-500">
              Level {level} · {unlocked.length} building{unlocked.length === 1 ? '' : 's'}
            </Text>

            {unlocked.length === 0 ? (
              <View className="items-center py-10">
                <Text className="text-xs text-slate-500">Nothing built yet — unlock your first building below.</Text>
              </View>
            ) : (
              <View className="mt-3 flex-row flex-wrap items-end justify-center gap-x-1 gap-y-3">
                {unlocked.map((b) => (
                  <View key={b.id} className="w-1/3 items-center">
                    <Image source={b.image} style={{ width: 86, height: 86 }} resizeMode="contain" />
                    <View className="-mt-1 rounded-full bg-white/85 px-2 py-0.5">
                      <Text className="text-[9px] font-bold text-slate-700">{b.name}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </LinearGradient>
        </View>

        <View>
          <Text className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">Shop</Text>
          <View className="gap-2.5">
            {locked.map((b) => {
              const affordable = canAfford(xp, b.xpCost)
              return (
                <View
                  key={b.id}
                  className="flex-row items-center gap-3 rounded-2xl bg-white p-3 shadow-card dark:bg-slate-900"
                >
                  <Image
                    source={b.image}
                    style={{ width: 56, height: 56, opacity: affordable ? 1 : 0.4 }}
                    resizeMode="contain"
                  />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-slate-900 dark:text-white">{b.name}</Text>
                    <Text numberOfLines={2} className="text-xs text-slate-400">{b.description}</Text>
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
