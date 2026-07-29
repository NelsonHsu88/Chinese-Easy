import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Sparkles, Repeat, BookOpen, Settings as SettingsIcon } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { dueCountFor } from '../lib/selectors'

const TABS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/new-words', label: 'New Words', icon: Sparkles, end: false },
  { to: '/review', label: 'Review', icon: Repeat, end: false },
  { to: '/dictionary', label: 'Dictionary', icon: BookOpen, end: false },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, end: false },
] as const

export function BottomNav() {
  const { deck } = useApp()
  const dueCount = dueCountFor(deck)

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                }`
              }
            >
              <span className="relative">
                <Icon size={22} strokeWidth={2.25} />
                {to === '/review' && dueCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold leading-none text-white">
                    {dueCount > 99 ? '99+' : dueCount}
                  </span>
                )}
              </span>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
