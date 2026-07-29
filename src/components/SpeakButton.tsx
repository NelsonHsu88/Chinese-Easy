import { Volume2 } from 'lucide-react'
import { speak } from '../lib/speech'

interface Props {
  text: string
  size?: number
  className?: string
  label?: string
}

/** A small speaker button that reads Chinese text aloud via the browser's speech synthesis. */
export function SpeakButton({ text, size = 18, className = '', label = 'Play pronunciation' }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        speak(text)
      }}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 ${className}`}
    >
      <Volume2 size={size} />
    </button>
  )
}
