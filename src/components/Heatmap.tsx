import { useState } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import type { HeatmapDay } from '../lib/progress'

interface Props {
  data: HeatmapDay[]
}

const LEVELS = [
  { max: 0, cls: 'bg-slate-100 dark:bg-slate-800' },
  { max: 2, cls: 'bg-brand-200 dark:bg-brand-900' },
  { max: 5, cls: 'bg-brand-300 dark:bg-brand-700' },
  { max: 9, cls: 'bg-brand-500 dark:bg-brand-500' },
  { max: Infinity, cls: 'bg-brand-700 dark:bg-brand-300' },
]

function colorFor(total: number): string {
  return LEVELS.find((l) => total <= l.max)?.cls ?? LEVELS[LEVELS.length - 1].cls
}

function tooltipFor(day: HeatmapDay): string {
  if (day.total === 0) return `${day.date}: no activity`
  const parts: string[] = []
  if (day.wordsLearned > 0) parts.push(`${day.wordsLearned} new word${day.wordsLearned === 1 ? '' : 's'}`)
  if (day.reviewsCompleted > 0) parts.push(`${day.reviewsCompleted} review${day.reviewsCompleted === 1 ? '' : 's'}`)
  return `${day.date}: ${parts.join(', ')}`
}

export function Heatmap({ data }: Props) {
  const [selected, setSelected] = useState<HeatmapDay | null>(null)

  // group into columns of 7 (weeks), oldest first
  const weeks: HeatmapDay[][] = []
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7))
  }

  return (
    <View className="gap-2">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, paddingBottom: 4 }}>
        {weeks.map((week, wi) => (
          <View key={wi} className="gap-1">
            {week.map((day) => (
              <Pressable key={day.date} onPress={() => setSelected(day)}>
                <View className={`h-3 w-3 rounded-sm ${colorFor(day.total)}`} />
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
      <View className="flex-row items-center justify-between">
        <Text className="text-[10px] text-slate-400">{selected ? tooltipFor(selected) : ' '}</Text>
        <View className="flex-row items-center gap-1.5">
          <Text className="text-[10px] text-slate-400">Less</Text>
          {LEVELS.map((l, i) => (
            <View key={i} className={`h-2.5 w-2.5 rounded-sm ${l.cls}`} />
          ))}
          <Text className="text-[10px] text-slate-400">More</Text>
        </View>
      </View>
    </View>
  )
}
