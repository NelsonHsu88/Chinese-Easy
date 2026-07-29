import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Play } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { allDueCardsFor } from '../lib/selectors'
import { displayWord, displayPinyin, displayExample } from '../lib/hanzi'
import { Modal } from '../components/Modal'
import { SpeakButton } from '../components/SpeakButton'
import { CATEGORY_META } from '../lib/categories'
import type { VocabWord } from '../types'

const STAGE_LABEL: Record<string, string> = {
  new: 'New',
  learning: 'Learning',
  review: 'Review',
}

export function DueWords() {
  const navigate = useNavigate()
  const { deck, settings, getWord } = useApp()
  const [selected, setSelected] = useState<VocabWord | null>(null)

  const dueCards = useMemo(() => allDueCardsFor(deck, settings), [deck, settings])

  return (
    <div className="flex min-h-dvh flex-col px-4 pt-6">
      <header className="mb-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="rounded-full bg-white p-2 text-slate-500 shadow-card dark:bg-slate-900 dark:text-slate-400"
          aria-label="Back to Dashboard"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold">Due for Review</h1>
          <p className="text-xs text-slate-400">{dueCards.length} word{dueCards.length === 1 ? '' : 's'}</p>
        </div>
      </header>

      {dueCards.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <div className="text-5xl">{'\u{1F4ED}'}</div>
          <p className="text-slate-400">Nothing due right now.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 pb-28">
          {dueCards.map((card) => {
            const word = getWord(card.wordId)
            if (!word) return null
            return (
              <button
                key={card.wordId}
                onClick={() => setSelected(word)}
                className="flex items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-card active:scale-[0.99] dark:bg-slate-900"
              >
                <span className="hanzi w-16 flex-shrink-0 text-2xl font-bold">{displayWord(word, settings.script)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-500 dark:text-slate-400">
                    {displayPinyin(word, settings.phoneticScript)}
                  </span>
                  <span className="block truncate text-sm text-slate-400">{word.definition}</span>
                </span>
                <span className="flex-shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400 dark:bg-slate-800">
                  {STAGE_LABEL[card.stage] ?? card.stage}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {dueCards.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <button
            onClick={() => navigate('/review')}
            className="mx-auto flex w-full max-w-lg items-center justify-center gap-2 rounded-2xl bg-coral-500 py-4 text-lg font-bold text-white shadow-card active:scale-[0.98]"
          >
            <Play size={20} /> Start Review
          </button>
        </div>
      )}

      {selected && (
        <Modal title={displayWord(selected, settings.script)} onClose={() => setSelected(null)}>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-2">
              <p className="hanzi text-6xl font-bold">{displayWord(selected, settings.script)}</p>
              <SpeakButton text={displayWord(selected, settings.script)} />
            </div>
            <p className="text-lg font-medium text-slate-400">{displayPinyin(selected, settings.phoneticScript)}</p>
            <p className="text-xl font-semibold">{selected.definition}</p>
            {displayExample(selected, settings.script) && (
              <div className="w-full border-t border-slate-100 pt-3 dark:border-slate-800">
                <p className="hanzi text-base text-slate-700 dark:text-slate-300">{displayExample(selected, settings.script)}</p>
                <p className="text-sm text-slate-400">{selected.example.pinyin}</p>
                <p className="text-sm italic text-slate-400">{selected.example.translation}</p>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-400 dark:bg-slate-800">
                {selected.custom ? 'Custom word' : `HSK ${selected.hskLevel}`}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-400 dark:bg-slate-800">
                {CATEGORY_META[selected.category].label}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
