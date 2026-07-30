import { useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft, BookOpen, Lock, ChevronRight } from 'lucide-react-native'
import { STORIES } from '../data/stories'
import { playTapSound } from '../lib/sound'

type Tier = 'all' | 'beginner' | 'intermediate' | 'advanced'

function tierFor(hskLevel: number): Exclude<Tier, 'all'> {
  if (hskLevel <= 2) return 'beginner'
  if (hskLevel <= 4) return 'intermediate'
  return 'advanced'
}

const TIER_LABEL: Record<Exclude<Tier, 'all'>, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export function Books() {
  const [tier, setTier] = useState<Tier>('all')

  const filteredStories = useMemo(
    () => STORIES.filter((s) => tier === 'all' || tierFor(s.hskLevel) === tier),
    [tier],
  )

  const byLevel = useMemo(() => {
    const map = new Map<number, typeof STORIES>()
    for (const story of filteredStories) {
      const list = map.get(story.hskLevel) ?? []
      list.push(story)
      map.set(story.hskLevel, list)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [filteredStories])

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="mb-2 flex-row items-center gap-3 px-4 pt-2">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="rounded-full bg-white p-2 shadow-card dark:bg-slate-900"
        >
          <ArrowLeft size={20} color="#64748b" />
        </Pressable>
        <View>
          <Text className="text-sm font-medium text-slate-400 dark:text-slate-500">Chinese Easy</Text>
          <Text className="text-lg font-bold text-slate-900 dark:text-white">Books</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 14 }}>
        {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTier(t)}
            className={`rounded-full px-3.5 py-2 ${tier === t ? 'bg-brand-500' : 'bg-white shadow-card dark:bg-slate-900'}`}
          >
            <Text className={`text-xs font-semibold ${tier === t ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
              {t === 'all' ? 'All' : TIER_LABEL[t]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ gap: 20, paddingHorizontal: 16, paddingBottom: 32 }}>
        {byLevel.length === 0 && <Text className="py-12 text-center text-sm text-slate-400">No stories at this level yet.</Text>}
        {byLevel.map(([level, stories]) => (
          <View key={level}>
            <View className="mb-2 flex-row items-center gap-2">
              <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">HSK {level}</Text>
              <Text className="text-xs text-slate-400">· {TIER_LABEL[tierFor(level)]}</Text>
            </View>
            <View className="gap-2.5">
              {stories.map((story) => {
                const available = story.pages.length > 0
                return (
                  <Pressable
                    key={story.id}
                    disabled={!available}
                    onPress={() => {
                      playTapSound()
                      router.push(`/story/${story.id}`)
                    }}
                    className={`flex-row items-center gap-3 rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900 ${!available ? 'opacity-50' : ''}`}
                  >
                    <View className={`h-11 w-11 items-center justify-center rounded-full ${available ? 'bg-brand-100 dark:bg-brand-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                      {available ? <BookOpen size={20} color="#16a34a" /> : <Lock size={18} color="#94a3b8" />}
                    </View>
                    <View className="flex-1">
                      <Text className="font-hanzi text-base font-bold text-slate-900 dark:text-white">{story.title}</Text>
                      <Text className="text-xs text-slate-400">
                        {available ? (story.difficulty === 'easy' ? '1 page · Easy' : '2 pages · Harder') : 'Coming soon'}
                      </Text>
                    </View>
                    {available && <ChevronRight size={18} color="#cbd5e1" />}
                  </Pressable>
                )
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
