import { useState, type ReactNode } from 'react'
import { Modal } from './Modal'
import { useApp } from '../context/AppContext'

interface Props {
  onClose: () => void
}

const inputClasses =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800'

export function AddCustomWordModal({ onClose }: Props) {
  const { addCustomWord } = useApp()
  const [word, setWord] = useState('')
  const [pinyin, setPinyin] = useState('')
  const [definition, setDefinition] = useState('')
  const [exampleSimplified, setExampleSimplified] = useState('')
  const [exampleTranslation, setExampleTranslation] = useState('')

  const canSubmit = word.trim().length > 0 && definition.trim().length > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    addCustomWord({
      simplified: word.trim(),
      traditional: word.trim(),
      pinyin: pinyin.trim(),
      definition: definition.trim(),
      exampleSimplified: exampleSimplified.trim(),
      exampleTraditional: exampleSimplified.trim(),
      examplePinyin: '',
      exampleTranslation: exampleTranslation.trim(),
    })
    onClose()
  }

  return (
    <Modal title="Add Custom Word" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Field label="Chinese word (Traditional)">
          <input className={`${inputClasses} hanzi text-xl`} value={word} onChange={(e) => setWord(e.target.value)} placeholder="你好" />
        </Field>
        <Field label="Pinyin">
          <input className={inputClasses} value={pinyin} onChange={(e) => setPinyin(e.target.value)} placeholder="nǐ hǎo" />
        </Field>
        <Field label="Definition">
          <input className={inputClasses} value={definition} onChange={(e) => setDefinition(e.target.value)} placeholder="hello" />
        </Field>
        <Field label="Example sentence (optional)">
          <input className={`${inputClasses} hanzi`} value={exampleSimplified} onChange={(e) => setExampleSimplified(e.target.value)} placeholder="你好吗？" />
        </Field>
        <Field label="Example translation (optional)">
          <input className={inputClasses} value={exampleTranslation} onChange={(e) => setExampleTranslation(e.target.value)} placeholder="How are you?" />
        </Field>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="mt-2 w-full rounded-2xl bg-brand-500 py-3.5 text-lg font-bold text-white shadow-card disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add to Review Deck
        </button>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  )
}
