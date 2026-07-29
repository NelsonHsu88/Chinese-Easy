import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThumbsUp, Eye, HelpCircle, GraduationCap, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { placementItems } from '../data/placementTest'
import { computeEstimatedHsk } from '../lib/placement'
import { displayWord } from '../lib/hanzi'
import { todayISO } from '../lib/date'
import type { PlacementAnswer } from '../types'

type Step = 'intro' | 'test' | 'result'

const RATING_OPTIONS: { rating: PlacementAnswer['rating']; label: string; icon: typeof ThumbsUp; classes: string }[] = [
  { rating: 'know', label: 'I know this', icon: ThumbsUp, classes: 'bg-brand-500 hover:bg-brand-600' },
  { rating: 'recognize', label: 'I recognize it', icon: Eye, classes: 'bg-amber-500 hover:bg-amber-600' },
  { rating: 'unknown', label: "I don't know this", icon: HelpCircle, classes: 'bg-slate-400 hover:bg-slate-500' },
]

export function Onboarding() {
  const { completeOnboarding, onboardingComplete } = useApp()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('intro')
  const [testIndex, setTestIndex] = useState(0)
  const [answers, setAnswers] = useState<PlacementAnswer[]>([])

  const estimatedHsk = useMemo(() => computeEstimatedHsk(placementItems, answers), [answers])

  useEffect(() => {
    if (step === 'result') {
      completeOnboarding({ estimatedHsk, completedAt: todayISO() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const currentItem = placementItems[testIndex]

  const handleRate = (rating: PlacementAnswer['rating']) => {
    const nextAnswers = [...answers, { wordId: currentItem.id, rating }]
    setAnswers(nextAnswers)
    if (testIndex + 1 >= placementItems.length) {
      setStep('result')
    } else {
      setTestIndex((i) => i + 1)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-brand-50 to-white px-6 py-8 dark:from-slate-950 dark:to-slate-950">
      {step === 'intro' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <div className="hanzi text-6xl font-bold text-brand-500">{'你好'}</div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Welcome to Chinese Easy</h1>
            <p className="mt-2 max-w-sm text-slate-500 dark:text-slate-400">
              A quick placement test helps us find your starting level so we can pick the right words for you.
            </p>
          </div>
          <button
            onClick={() => setStep('test')}
            className="w-full max-w-xs rounded-2xl bg-brand-500 py-4 text-lg font-bold text-white shadow-card active:scale-[0.98]"
          >
            Get Started
          </button>
        </div>
      )}

      {step === 'test' && currentItem && (
        <div className="flex flex-1 flex-col">
          <div className="mb-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-brand-500 transition-all"
                style={{ width: `${(testIndex / placementItems.length) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs font-medium text-slate-400">
              {testIndex + 1} of {placementItems.length}
            </p>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-400 dark:bg-slate-800">
              HSK {currentItem.hskLevel}
            </span>
            <p className="hanzi text-7xl font-bold">{displayWord(currentItem, 'traditional')}</p>
          </div>

          <div className="flex flex-col gap-2.5 pb-4">
            {RATING_OPTIONS.map(({ rating, label, icon: Icon, classes }) => (
              <button
                key={rating}
                onClick={() => handleRate(rating)}
                className={`flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white shadow-card active:scale-[0.98] ${classes}`}
              >
                <Icon size={18} /> {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'result' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <GraduationCap size={56} className="text-brand-500" />
          <div>
            <p className="text-sm font-medium text-slate-400">Your estimated level</p>
            <p className="text-6xl font-extrabold text-brand-600 dark:text-brand-400">HSK {estimatedHsk}</p>
          </div>
          <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
            We'll start you off with words around this level and adjust as you go. You can retake this test anytime
            from Settings.
          </p>
          <button
            onClick={() => navigate('/')}
            className="flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-brand-500 py-4 text-lg font-bold text-white shadow-card active:scale-[0.98]"
          >
            <Sparkles size={20} /> Start Learning
          </button>
        </div>
      )}

      {onboardingComplete && step !== 'result' && (
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-center text-sm font-medium text-slate-400 underline-offset-2 hover:underline"
        >
          Cancel and return to app
        </button>
      )}
    </div>
  )
}
