import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
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

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartRow }[] }) {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0].payload
  return (
    <div className="rounded-xl bg-slate-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
      <p className="font-semibold">{row.isToday ? 'Today' : row.label}</p>
      <p>{row.wordsLearned} new word{row.wordsLearned === 1 ? '' : 's'}</p>
      <p>{row.reviewsCompleted} review{row.reviewsCompleted === 1 ? '' : 's'}</p>
    </div>
  )
}

export function WeeklyChart({ data }: Props) {
  const today = todayISO()
  const chartData: ChartRow[] = data.map((d) => ({
    date: d.date,
    label: weekdayLabel(d.date),
    isToday: d.date === today,
    wordsLearned: d.wordsLearned,
    reviewsCompleted: d.reviewsCompleted,
    total: d.wordsLearned + d.reviewsCompleted,
  }))

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'currentColor' }}
            className="text-slate-400 dark:text-slate-500"
          />
          <Tooltip cursor={{ fill: 'rgba(148,163,184,0.15)' }} content={<ChartTooltip />} />
          <Bar dataKey="total" radius={[8, 8, 8, 8]} maxBarSize={28}>
            {chartData.map((entry) => (
              <Cell key={entry.date} fill={entry.isToday ? '#f6432c' : '#43d488'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
