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
  // group into columns of 7 (weeks), oldest first
  const weeks: HeatmapDay[][] = []
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="no-scrollbar flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => (
              <div key={day.date} title={tooltipFor(day)} className={`h-3 w-3 rounded-sm ${colorFor(day.total)}`} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
        <span>Less</span>
        {LEVELS.map((l, i) => (
          <span key={i} className={`h-2.5 w-2.5 rounded-sm ${l.cls}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
