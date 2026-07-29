import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { useApp } from '../context/AppContext'

export function Profile() {
  const { settings, updateSettings } = useApp()
  const navigate = useNavigate()
  const [name, setName] = useState(settings.username)

  const trimmed = name.trim()
  const canSave = trimmed.length > 0 && trimmed.length <= 24

  const handleSave = () => {
    if (!canSave) return
    updateSettings({ username: trimmed })
    navigate('/settings')
  }

  return (
    <div className="flex min-h-dvh flex-col px-4 pt-6">
      <header className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate('/settings')}
          className="rounded-full bg-white p-2 text-slate-500 shadow-card dark:bg-slate-900 dark:text-slate-400"
          aria-label="Back to Settings"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">Edit Profile</h1>
      </header>

      <div className="flex flex-col items-center gap-3 py-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-500 text-4xl font-bold text-white">
          {trimmed ? trimmed[0].toUpperCase() : '?'}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Display name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          placeholder="Your name"
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900"
        />
      </label>
      <p className="mt-1.5 text-xs text-slate-400">Shown on your Dashboard. Up to 24 characters.</p>

      <button
        onClick={handleSave}
        disabled={!canSave}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 py-4 text-lg font-bold text-white shadow-card active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Check size={20} /> Save
      </button>
    </div>
  )
}
