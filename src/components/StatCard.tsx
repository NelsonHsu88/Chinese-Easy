import type { ReactNode } from 'react'

interface Props {
  label: string
  value: ReactNode
  icon?: ReactNode
  accent?: 'brand' | 'amber' | 'coral' | 'slate'
}

const ACCENTS: Record<NonNullable<Props['accent']>, string> = {
  brand: 'text-brand-600 dark:text-brand-400',
  amber: 'text-amber-600 dark:text-amber-400',
  coral: 'text-coral-600 dark:text-coral-400',
  slate: 'text-slate-700 dark:text-slate-300',
}

export function StatCard({ label, value, icon, accent = 'slate' }: Props) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-bold ${ACCENTS[accent]}`}>{value}</div>
    </div>
  )
}
