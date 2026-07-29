import { useMemo, useState, type ReactNode } from 'react'
import { BookText, PenLine } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { displayWord, displayPinyin, displayExample } from '../lib/hanzi'
import { Modal } from '../components/Modal'
import { WritingPracticeModal } from '../components/WritingPracticeModal'
import { SpeakButton } from '../components/SpeakButton'
import { CATEGORY_META, CATEGORY_ORDER } from '../lib/categories'
import type { VocabWord, WordCategory } from '../types'

interface Group {
  label: string
  words: VocabWord[]
}

type LevelFilter = 'all' | number
type CategoryFilter = 'all' | WordCategory

export function Dictionary() {
  const { wordBank, settings } = useApp()
  const [selected, setSelected] = useState<VocabWord | null>(null)
  const [practiceWord, setPracticeWord] = useState<VocabWord | null>(null)
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')

  const filtered = useMemo(
    () =>
      wordBank.filter(
        (w) => (levelFilter === 'all' || w.hskLevel === levelFilter) && (categoryFilter === 'all' || w.category === categoryFilter),
      ),
    [wordBank, levelFilter, categoryFilter],
  )

  const groups = useMemo<Group[]>(() => {
    const byLevel = new Map<number | 'custom', VocabWord[]>()
    for (const word of filtered) {
      const key = word.custom ? 'custom' : word.hskLevel
      const list = byLevel.get(key) ?? []
      list.push(word)
      byLevel.set(key, list)
    }
    const levels = [...byLevel.keys()]
      .filter((k): k is number => k !== 'custom')
      .sort((a, b) => a - b)

    const ordered: Group[] = levels.map((level) => ({
      label: `HSK ${level}`,
      words: [...(byLevel.get(level) ?? [])].sort((a, b) => a.simplified.localeCompare(b.simplified)),
    }))
    const custom = byLevel.get('custom')
    if (custom && custom.length > 0) ordered.push({ label: 'Custom words', words: custom })
    return ordered
  }, [filtered])

  return (
    <div className="flex min-h-dvh flex-col px-4 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Chinese Easy</p>
          <h1 className="text-lg font-bold">Dictionary</h1>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
          <BookText size={14} /> {filtered.length} words
        </span>
      </header>

      <div className="no-scrollbar mb-2.5 flex gap-2 overflow-x-auto pb-1">
        <FilterChip active={levelFilter === 'all'} onClick={() => setLevelFilter('all')}>
          All levels
        </FilterChip>
        {[1, 2, 3, 4, 5, 6].map((lvl) => (
          <FilterChip key={lvl} active={levelFilter === lvl} onClick={() => setLevelFilter(lvl)}>
            HSK {lvl}
          </FilterChip>
        ))}
      </div>

      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
        <FilterChip active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>
          All categories
        </FilterChip>
        {CATEGORY_ORDER.map((cat) => {
          const meta = CATEGORY_META[cat]
          const Icon = meta.icon
          return (
            <FilterChip key={cat} active={categoryFilter === cat} onClick={() => setCategoryFilter(cat)}>
              <Icon size={13} /> {meta.label}
            </FilterChip>
          )
        })}
      </div>

      <div className="flex flex-col gap-6 pb-8">
        {groups.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-400">No words match these filters.</p>
        )}
        {groups.map((group) => (
          <section key={group.label}>
            <h2 className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{group.label}</h2>
            <div className="grid grid-cols-3 gap-2.5">
              {group.words.map((word) => (
                <button
                  key={word.id}
                  onClick={() => setSelected(word)}
                  className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-white py-3.5 shadow-card active:scale-95 dark:bg-slate-900"
                >
                  <span className="hanzi text-2xl font-bold">{displayWord(word, settings.script)}</span>
                  <span className="text-[11px] text-slate-400">{displayPinyin(word, settings.phoneticScript)}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

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
                {(() => {
                  const Icon = CATEGORY_META[selected.category].icon
                  return <Icon size={12} />
                })()}
                {CATEGORY_META[selected.category].label}
              </span>
            </div>

            <button
              onClick={() => setPracticeWord(selected)}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 py-3.5 text-lg font-bold text-white shadow-card active:scale-[0.98]"
            >
              <PenLine size={18} /> Practice Writing
            </button>
          </div>
        </Modal>
      )}

      {practiceWord && <WritingPracticeModal word={practiceWord} onClose={() => setPracticeWord(null)} />}
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
        active
          ? 'bg-brand-500 text-white'
          : 'bg-white text-slate-500 shadow-card dark:bg-slate-900 dark:text-slate-400'
      }`}
    >
      {children}
    </button>
  )
}
