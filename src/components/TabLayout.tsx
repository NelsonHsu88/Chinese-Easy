import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function TabLayout() {
  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      <main className="mx-auto max-w-lg pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
