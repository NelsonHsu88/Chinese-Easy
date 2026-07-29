import { useEffect, useMemo, useState } from 'react'
import { Plus, SkipForward, BookPlus, PenLine } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { newWordsPool } from '../lib/selectors'
import { displayWord, displayExample, displayPinyin } from '../lib/hanzi'
import { AddCustomWordModal } from '../components/AddCustomWordModal'
import { WritingPracticeModal } from '../components/WritingPracticeModal'
import { SpeakButton } from '../components/SpeakButton'

export function NewWords() {
  const { wordBank, deck, settings, addToReviewDeck, wordsLearnedToday } = useApp()
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [flipped, setFlipped] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPractice, setShowPractice] = useState(false)

  const pool = useMemo(() => newWordsPool(wordBank, deck, settings), [wordBank, deck, settings])
  const available = useMemo(() => pool.filter((w) => !skipped.has(w.id)), [pool, skipped])
  const current = available[0]

  useEffect(() => {
    setFlipped(false)
  }, [current?.id])

  const limitReached = wordsLearnedToday >= settings.dailyNewWordLimit

  return (
    <div className="flex min-h-dvh flex-col px-4 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Chinese Easy</p>
          <h1 className="text-lg font-bold">New Words</h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
        >
          <Plus size={16} /> Custom
        </button>
      </header>

      <div className="mb-3 flex items-center justify-between rounded-xl bg-white px-3.5 py-2.5 text-sm shadow-card dark:bg-slate-900">
        <span className="text-slate-500 dark:text-slate-400">
          New today: <span className="font-bold text-slate-800 dark:text-slate-200">{wordsLearnedToday}</span> / {settings.dailyNewWordLimit}
        </span>
        <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
          HSK {settings.hskLevel}
        </span>
      </div>

      {!current ? (
        <EmptyState limitReached={limitReached} onAddCustom={() => setShowAddModal(true)} />
      ) : (
        <div className="flex flex-1 flex-col">
          {limitReached && (
            <div className="mb-3 rounded-xl bg-amber-100 px-3.5 py-2.5 text-sm font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              Daily new word limit reached. Adjust it in Settings to keep going.
            </div>
          )}

          <div
            role="button"
            tabIndex={0}
            onClick={() => setFlipped((f) => !f)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setFlipped((f) => !f)
              }
            }}
            className="flex min-h-[340px] flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl bg-white p-8 text-center shadow-card animate-flipIn dark:bg-slate-900"
            key={current.id}
          >
            {!flipped ? (
              <>
                <p className="hanzi text-7xl font-bold">{displayWord(current, settings.script)}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-medium text-slate-400">{displayPinyin(current, settings.phoneticScript)}</p>
                  <SpeakButton text={displayWord(current, settings.script)} />
                </div>
                <p className="mt-4 text-xs text-slate-300 dark:text-slate-600">tap to flip</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold">{current.definition}</p>
                {displayExample(current, settings.script) && (
                  <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="hanzi text-lg text-slate-700 dark:text-slate-300">{displayExample(current, settings.script)}</p>
                    <p className="text-sm text-slate-400">{current.example.pinyin}</p>
                    <p className="text-sm italic text-slate-400">{current.example.translation}</p>
                  </div>
                )}
                <p className="mt-4 text-xs text-slate-300 dark:text-slate-600">tap to flip back</p>
              </>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2 pb-6">
            <div className="flex gap-3">
              <button
                onClick={() => setSkipped((prev) => new Set(prev).add(current.id))}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-300 py-4 font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400"
              >
                <SkipForward size={18} /> Skip
              </button>
              <button
                onClick={() => addToReviewDeck(current.id)}
                disabled={limitReached}
                className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-brand-500 py-4 text-lg font-bold text-white shadow-card active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <BookPlus size={20} /> Add to Review Deck
              </button>
            </div>
            <button
              onClick={() => setShowPractice(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-brand-300 py-3.5 font-semibold text-brand-600 dark:border-brand-800 dark:text-brand-400"
            >
              <PenLine size={18} /> Practice writing this word
            </button>
          </div>
        </div>
      )}

      {showAddModal && <AddCustomWordModal onClose={() => setShowAddModal(false)} />}
      {showPractice && current && <WritingPracticeModal word={current} onClose={() => setShowPractice(false)} />}
    </div>
  )
}

function EmptyState({ limitReached, onAddCustom }: { limitReached: boolean; onAddCustom: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div className="text-5xl">{'\u{1F38A}'}</div>
      <h2 className="text-lg font-bold">
        {limitReached ? "You've hit today's limit" : "You've cleared this level!"}
      </h2>
      <p className="max-w-xs text-sm text-slate-400">
        {limitReached
          ? 'Come back tomorrow, or raise your daily new word limit in Settings.'
          : 'Add a custom word, or check Settings to raise your HSK level.'}
      </p>
      <button onClick={onAddCustom} className="mt-2 rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white shadow-card">
        Add Custom Word
      </button>
    </div>
  )
}
