import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, ChevronRight, BookMarked, CalendarRange, List, Zap, CalendarCheck } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { WeeklyChart } from '../components/WeeklyChart'
import { Heatmap } from '../components/Heatmap'
import { StatCard } from '../components/StatCard'
import { dueCountFor } from '../lib/selectors'
import { buildHeatmapFromProgress, summarizeActivity } from '../lib/progress'
import { lastNDays } from '../lib/date'

export function Dashboard() {
  const { wordsLearnedToday, dailyProgress, streak, deck, settings } = useApp()
  const navigate = useNavigate()

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
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Hi, {settings.username || 'Learner'}</p>
          <h1 className="text-lg font-bold">Dashboard</h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          <Flame size={18} className="fill-amber-500 text-amber-500" />
          <span className="text-sm font-bold">{streak}</span>
          <span className="text-xs font-medium">day streak</span>
        </div>
      </header>

      <section className="rounded-3xl bg-gradient-to-br from-brand-500 to-brand-600 p-6 text-white shadow-card">
        <p className="text-sm font-medium text-brand-100">Words learned today</p>
        <p className="mt-1 text-6xl font-extrabold leading-none tabular-nums">{wordsLearnedToday}</p>
      </section>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => navigate('/review')}
          className="flex w-full items-center justify-between rounded-2xl bg-coral-500 px-5 py-4 text-left text-white shadow-card transition-transform active:scale-[0.98]"
        >
          <span className="flex items-center gap-2 text-lg font-bold">
            Start Review
            {dueCount > 0 && (
              <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-sm font-bold">{dueCount} due</span>
            )}
          </span>
          <ChevronRight size={24} />
        </button>
        {dueCount > 0 && (
          <button
            onClick={() => navigate('/due-words')}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold text-slate-500 dark:text-slate-400"
          >
            <List size={15} /> View words due
          </button>
        )}
      </div>

      <section className="grid grid-cols-2 gap-3">
        <StatCard
          label="This week"
          value={weekTotal}
          icon={<CalendarRange size={14} />}
          accent="brand"
        />
        <StatCard
          label="Words due"
          value={dueCount}
          icon={<BookMarked size={14} />}
          accent={dueCount > 0 ? 'coral' : 'slate'}
        />
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Last 7 days</h2>
        <p className="mb-1 text-xs text-slate-400">New words learned + reviews completed, per day</p>
        <WeeklyChart data={weeklyChartData} />
      </section>

      <section className="rounded-2xl bg-white p-4 pb-5 shadow-card dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Consistency</h2>
          <span className="text-xs text-slate-400">Last {heatmapSummary.totalDays} days</span>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-800">
            <CalendarCheck size={14} className="mx-auto mb-1 text-brand-500" />
            <p className="text-lg font-bold leading-none">{heatmapSummary.activeDays}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">active days</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-800">
            <Zap size={14} className="mx-auto mb-1 text-amber-500" />
            <p className="text-lg font-bold leading-none">{heatmapSummary.longestStreak}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">best streak</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-800">
            <BookMarked size={14} className="mx-auto mb-1 text-coral-500" />
            <p className="text-lg font-bold leading-none">{heatmapSummary.totalWordsLearned + heatmapSummary.totalReviewsCompleted}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">total activity</p>
          </div>
        </div>

        <Heatmap data={heatmap} />
      </section>
    </div>
  )
}
