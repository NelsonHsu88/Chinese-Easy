import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import type { DailyProgress } from '../types'
import { todayISO, weekdayLabel } from '../lib/date'

interface Props {
  data: DailyProgress[]
}

interface ChartRow {
  date: string
  label: string
  isToday: boolean
  wordsLearned: number
  reviewsCompleted: number
  total: number
}

const CHART_HEIGHT = 120

export function WeeklyChart({ data }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const today = todayISO()
  const chartData: ChartRow[] = data.map((d) => ({
    date: d.date,
    label: weekdayLabel(d.date),
    isToday: d.date === today,
    wordsLearned: d.wordsLearned,
    reviewsCompleted: d.reviewsCompleted,
    total: d.wordsLearned + d.reviewsCompleted,
  }))
  const maxTotal = Math.max(1, ...chartData.map((d) => d.total))
  const selectedRow = chartData.find((d) => d.date === selected)

  return (
    <View className="w-full gap-2">
      <Text className="h-4 text-xs text-slate-500 dark:text-slate-400">
        {selectedRow
          ? `${selectedRow.isToday ? 'Today' : selectedRow.label}: ${selectedRow.wordsLearned} new word${selectedRow.wordsLearned === 1 ? '' : 's'}, ${selectedRow.reviewsCompleted} review${selectedRow.reviewsCompleted === 1 ? '' : 's'}`
          : ' '}
      </Text>
      <View className="flex-row items-end justify-between" style={{ height: CHART_HEIGHT }}>
        {chartData.map((row) => (
          <Pressable key={row.date} onPress={() => setSelected(row.date)} className="flex-1 items-center gap-1.5">
            <View
              className={`w-6 rounded-lg ${row.isToday ? 'bg-coral-500' : 'bg-brand-400'}`}
              style={{ height: Math.max(4, (row.total / maxTotal) * (CHART_HEIGHT - 20)) }}
            />
            <Text className="text-xs text-slate-400 dark:text-slate-500">{row.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}
