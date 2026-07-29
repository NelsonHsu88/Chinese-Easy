import { useState } from 'react'
import { X, RotateCw, PenLine, Check } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { displayWord, displayPinyin } from '../lib/hanzi'
import { HanziStage } from './HanziStage'
import { SpeakButton } from './SpeakButton'
import type { VocabWord } from '../types'

interface Props {
  word: VocabWord
  onClose: () => void
}

type Phase = 'demo' | 'write'

export function WritingPracticeModal({ word, onClose }: Props) {
  const { settings } = useApp()
  const [phase, setPhase] = useState<Phase>('demo')
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ mistakes: number } | null>(null)

  const text = displayWord(word, settings.script)

  const goWrite = () => {
    setResult(null)
    setPhase('write')
  }

  const replayDemo = () => {
    setAttempt((n) => n + 1)
    setResult(null)
    setPhase('demo')
  }

  const tryAgain = () => {
    setAttempt((n) => n + 1)
    setResult(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-950">
      <div className="flex items-center gap-3 px-4 pt-4">
        <button
          onClick={onClose}
          className="rounded-full bg-white p-2 text-slate-500 shadow-card dark:bg-slate-900 dark:text-slate-400"
          aria-label="Close practice"
        >
          <X size={20} />
        </button>
        <div className="flex flex-1 items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Writing Practice</p>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              {text} <span className="font-normal text-slate-400">{displayPinyin(word, settings.phoneticScript)}</span>
            </p>
          </div>
          <SpeakButton text={text} />
        </div>
      </div>

      {phase === 'demo' ? (
        <>
          <div className="flex flex-col items-center gap-1 px-4 pb-2 pt-3 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Watch how it&apos;s written</p>
          </div>
          <div className="relative flex-1 mx-4 mb-4">
            <HanziStage character={text} mode="demo" resetKey={attempt} showOutline />
          </div>
          <div className="flex gap-3 px-4 pb-6 pt-4">
            <button
              onClick={replayDemo}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-4 font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400"
            >
              <RotateCw size={18} /> Replay
            </button>
            <button
              onClick={goWrite}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-500 py-4 text-lg font-bold text-white shadow-card active:scale-[0.98]"
            >
              <PenLine size={20} /> Let me try
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col items-center gap-1 px-4 pb-2 pt-3 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {result ? `Nice! ${result.mistakes === 0 ? 'Perfect strokes' : `${result.mistakes} mistake${result.mistakes === 1 ? '' : 's'}`}` : 'Trace each stroke'}
            </p>
          </div>
          <div className="relative flex-1 mx-4 mb-4">
            <HanziStage
              character={text}
              mode="quiz"
              showOutline
              resetKey={attempt}
              onQuizComplete={(mistakes) => setResult({ mistakes })}
            />
          </div>
          <div className="flex flex-col gap-2 px-4 pb-6">
            <div className="flex gap-2">
              <button
                onClick={tryAgain}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-300 py-3.5 font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400"
              >
                <RotateCw size={18} /> Try again
              </button>
              <button
                onClick={replayDemo}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-300 py-3.5 font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400"
              >
                Watch demo again
              </button>
            </div>
            <button
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 py-4 text-lg font-bold text-white shadow-card active:scale-[0.98]"
            >
              <Check size={20} /> Done
            </button>
          </div>
        </>
      )}
    </div>
  )
}
