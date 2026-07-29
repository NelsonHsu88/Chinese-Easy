import { useNavigate } from 'react-router-dom'
import { GraduationCap, RotateCcw, Bell, ChevronRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { SettingsSection, SegmentedControl, Stepper, SliderRow, Row } from '../components/SettingsControls'
import type { PhoneticScript, ReviewDirection, ReviewOrder } from '../types'

export function Settings() {
  const { settings, updateSettings, retakePlacementTest } = useApp()
  const navigate = useNavigate()

  const handleRetake = () => {
    retakePlacementTest()
    navigate('/onboarding')
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-10 pt-6">
      <header>
        <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Chinese Easy</p>
        <h1 className="text-lg font-bold">Settings</h1>
        <p className="mt-1 text-xs text-slate-400">Traditional Chinese only, for now.</p>
      </header>

      <button
        onClick={() => navigate('/profile')}
        className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card active:scale-[0.99] dark:bg-slate-900"
      >
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 text-lg font-bold text-white">
          {settings.username ? settings.username[0].toUpperCase() : '?'}
        </div>
        <div className="flex-1 text-left">
          <p className="font-semibold">{settings.username || 'Learner'}</p>
          <p className="text-xs text-slate-400">Edit profile</p>
        </div>
        <ChevronRight size={18} className="text-slate-300" />
      </button>

      <SettingsSection title="Skill level">
        <Row label="Estimated HSK level" hint="From your placement test">
          <span className="flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-sm font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            <GraduationCap size={16} /> HSK {settings.hskLevel}
          </span>
        </Row>
        <button
          onClick={handleRetake}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
        >
          <RotateCcw size={16} /> Retake placement test
        </button>
      </SettingsSection>

      <SettingsSection title="Phonetic notation">
        <SegmentedControl<PhoneticScript>
          value={settings.phoneticScript}
          onChange={(phoneticScript) => updateSettings({ phoneticScript })}
          options={[
            { value: 'pinyin', label: 'Pinyin' },
            { value: 'zhuyin', label: 'Bopomofo (ㄅㄆㄇ)' },
          ]}
        />
        <p className="mt-2 text-xs text-slate-400">
          Controls how a word's pronunciation is shown on New Words and Review cards.
        </p>
      </SettingsSection>

      <SettingsSection title="Review direction">
        <SegmentedControl<ReviewDirection>
          value={settings.reviewDirection}
          onChange={(reviewDirection) => updateSettings({ reviewDirection })}
          options={[
            { value: 'recognition', label: 'Recognition' },
            { value: 'production', label: 'Production' },
            { value: 'mixed', label: 'Mixed' },
          ]}
        />
        <p className="mt-2 text-xs text-slate-400">
          Recognition: see Chinese, recall meaning. Production: see English, write Chinese.
        </p>
      </SettingsSection>

      <SettingsSection title="Review order">
        <SegmentedControl<ReviewOrder>
          value={settings.reviewOrder}
          onChange={(reviewOrder) => updateSettings({ reviewOrder })}
          options={[
            { value: 'due', label: 'Due date' },
            { value: 'shuffled', label: 'Shuffled' },
            { value: 'hardest-first', label: 'Hardest first' },
          ]}
        />
      </SettingsSection>

      <SettingsSection title="Daily limits">
        <div className="flex flex-col gap-4">
          <SliderRow
            label="Review cards per day"
            value={settings.dailyReviewLimit}
            min={5}
            max={100}
            step={5}
            onChange={(dailyReviewLimit) => updateSettings({ dailyReviewLimit })}
          />
          <SliderRow
            label="New words per day"
            value={settings.dailyNewWordLimit}
            min={1}
            max={30}
            onChange={(dailyNewWordLimit) => updateSettings({ dailyNewWordLimit })}
          />
        </div>
      </SettingsSection>

      <SettingsSection title="Wrong-answer practice">
        <Row label="Rewrite reps after a miss" hint="Extra writing reps queued after grading 'Again'">
          <Stepper
            value={settings.wrongAnswerReps}
            min={1}
            max={10}
            onChange={(wrongAnswerReps) => updateSettings({ wrongAnswerReps })}
          />
        </Row>
      </SettingsSection>

      <SettingsSection title="Reminders">
        <Row label="Daily reminder time" hint="UI only for now">
          <label className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
            <Bell size={16} className="text-slate-400" />
            <input
              type="time"
              value={settings.reminderTime}
              onChange={(e) => updateSettings({ reminderTime: e.target.value })}
              className="bg-transparent text-sm font-semibold outline-none"
            />
          </label>
        </Row>
      </SettingsSection>
    </div>
  )
}
