import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Eye, Check, RotateCw, Lightbulb } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { dueCardsFor } from '../lib/selectors'
import { displayWord, displayExample, displayPinyin } from '../lib/hanzi'
import { HanziStage } from '../components/HanziStage'
import { SpeakButton } from '../components/SpeakButton'
import { Celebration } from '../components/Celebration'
import { playPositiveChime, playRetryTone } from '../lib/sound'
import { celebrateHaptic } from '../lib/haptics'
import type { Grade } from '../types'

type Direction = 'recognition' | 'production'

function directionFor(wordId: string, setting: 'recognition' | 'production' | 'mixed'): Direction {
  if (setting !== 'mixed') return setting
  let h = 0
  for (const ch of wordId) h = (h * 31 + ch.charCodeAt(0)) % 2
  return h === 0 ? 'recognition' : 'production'
}

const GRADE_BUTTONS: { grade: Grade; label: string; classes: string }[] = [
  { grade: 'again', label: 'Again', classes: 'bg-red-500 hover:bg-red-600' },
  { grade: 'hard', label: 'Hard', classes: 'bg-orange-500 hover:bg-orange-600' },
  { grade: 'good', label: 'Good', classes: 'bg-brand-500 hover:bg-brand-600' },
  { grade: 'easy', label: 'Easy', classes: 'bg-blue-500 hover:bg-blue-600' },
]

interface PracticeState {
  wordId: string
  remaining: number
  total: number
}

export function Review() {
  const navigate = useNavigate()
  const { deck, settings, getWord, gradeCard, completePracticeRep, streak } = useApp()

  const [sessionQueue] = useState(() => dueCardsFor(deck, settings).map((c) => c.wordId))
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [hintShown, setHintShown] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [practice, setPractice] = useState<PracticeState | null>(null)
  const [stats, setStats] = useState({ reviewed: 0, correct: 0 })
  const [finished, setFinished] = useState(sessionQueue.length === 0)
  const [celebrateKey, setCelebrateKey] = useState(0)

  const currentWordId = sessionQueue[index]
  const word = currentWordId ? getWord(currentWordId) : undefined
  const direction = currentWordId ? directionFor(currentWordId, settings.reviewDirection) : 'recognition'

  const total = sessionQueue.length
  const remainingCount = Math.max(0, total - index)

  const advance = () => {
    setRevealed(false)
    setHintShown(false)
    setAttempt(0)
    if (index + 1 >= total) {
      setFinished(true)
    } else {
      setIndex((i) => i + 1)
    }
  }

  const handleGrade = (grade: Grade) => {
    if (!currentWordId) return
    gradeCard(currentWordId, grade)
    setStats((s) => ({ reviewed: s.reviewed + 1, correct: s.correct + (grade === 'again' ? 0 : 1) }))

    if (grade === 'easy' || grade === 'good') {
      playPositiveChime()
      celebrateHaptic()
      setCelebrateKey((k) => k + 1)
    } else {
      playRetryTone()
    }

    if (grade === 'again') {
      setRevealed(false)
      setPractice({ wordId: currentWordId, remaining: settings.wrongAnswerReps, total: settings.wrongAnswerReps })
    } else {
      advance()
    }
  }

  const handlePracticeNext = () => {
    if (!practice) return
    completePracticeRep(practice.wordId)
    if (practice.remaining - 1 <= 0) {
      setPractice(null)
      advance()
    } else {
      setPractice((p) => (p ? { ...p, remaining: p.remaining - 1 } : p))
    }
  }

  const accuracy = useMemo(
    () => (stats.reviewed === 0 ? 0 : Math.round((stats.correct / stats.reviewed) * 100)),
    [stats],
  )

  if (finished) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-slate-50 px-6 text-center dark:bg-slate-950">
        <Celebration trigger={celebrateKey} />
        <div className="text-6xl">{stats.reviewed === 0 ? '\u{1F4ED}' : accuracy >= 80 ? '\u{1F389}' : '\u{1F44D}'}</div>
        <h1 className="text-2xl font-bold">{stats.reviewed === 0 ? 'Nothing to review' : 'Session complete!'}</h1>
        <p className="text-slate-500 dark:text-slate-400">
          {stats.reviewed === 0
            ? "You're all caught up. Check back later or add new words."
            : `You reviewed ${stats.reviewed} card${stats.reviewed === 1 ? '' : 's'}.`}
        </p>

        {stats.reviewed > 0 && (
          <div className="grid w-full max-w-xs grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
              <p className="text-xs font-medium uppercase text-slate-400">Accuracy</p>
              <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{accuracy}%</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
              <p className="text-xs font-medium uppercase text-slate-400">Streak</p>
              <p className="text-2xl font-bold text-amber-500">{streak} days</p>
            </div>
          </div>
        )}

        <button
          onClick={() => navigate('/')}
          className="mt-2 w-full max-w-xs rounded-2xl bg-brand-500 px-6 py-4 text-lg font-bold text-white shadow-card active:scale-[0.98]"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  if (!word) return null

  if (practice) {
    const doneCount = practice.total - practice.remaining + 1
    return (
      <div className="flex min-h-dvh flex-col bg-slate-50 dark:bg-slate-950">
        <ReviewHeader onClose={() => navigate('/')} label={`Practice ${doneCount} of ${practice.total}`} progress={doneCount / practice.total} tint="amber" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 pb-4">
          <p className="hanzi text-3xl font-semibold">{displayWord(word, settings.script)}</p>
          <p className="text-sm text-slate-400">Rewrite it to lock it in</p>
        </div>
        <div className="relative mx-4 mb-4" style={{ height: '48vh' }}>
          <HanziStage character={displayWord(word, settings.script)} mode="quiz" showOutline resetKey={practice.remaining} />
        </div>
        <div className="px-4 pb-6">
          <button
            onClick={handlePracticeNext}
            className="w-full rounded-2xl bg-amber-500 py-4 text-lg font-bold text-white shadow-card active:scale-[0.98]"
          >
            {practice.remaining <= 1 ? 'Done' : 'Next rep'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 dark:bg-slate-950">
      <Celebration trigger={celebrateKey} />
      <ReviewHeader onClose={() => navigate('/')} label={`${remainingCount} of ${total} remaining`} progress={index / total} />

      <div className="flex flex-col items-center gap-1 px-4 pb-2 pt-3 text-center">
        {direction === 'recognition' ? (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Recognize this</p>
            <div className="flex items-center gap-2">
              <p className="hanzi text-5xl font-bold">{displayWord(word, settings.script)}</p>
              <SpeakButton text={displayWord(word, settings.script)} />
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Write in Chinese</p>
            <p className="text-2xl font-bold">{word.definition}</p>
          </>
        )}
      </div>

      <div className="relative flex-1 mx-4 mb-4">
        <HanziStage
          character={displayWord(word, settings.script)}
          mode={revealed ? 'demo' : 'quiz'}
          showOutline={revealed || direction === 'recognition' || hintShown}
          resetKey={`${currentWordId}-${attempt}-${revealed}`}
        />
      </div>

      {revealed && (
        <div className="mx-4 mb-3 animate-popIn rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <p className="hanzi text-3xl font-bold">{displayWord(word, settings.script)}</p>
            <p className="text-sm font-medium text-slate-400">{displayPinyin(word, settings.phoneticScript)}</p>
            <SpeakButton text={displayWord(word, settings.script)} size={16} />
          </div>
          <p className="mt-1 text-base font-medium text-slate-700 dark:text-slate-300">{word.definition}</p>
          {displayExample(word, settings.script) && (
            <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
              <p className="hanzi text-sm text-slate-600 dark:text-slate-400">{displayExample(word, settings.script)}</p>
              <p className="text-xs text-slate-400">{word.example.pinyin}</p>
              <p className="text-xs italic text-slate-400">{word.example.translation}</p>
            </div>
          )}
        </div>
      )}

      <div className="px-4 pb-6">
        {!revealed ? (
          <div className="flex gap-2">
            <button
              onClick={() => setAttempt((a) => a + 1)}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-3.5 py-4 font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400"
              aria-label="Restart writing attempt"
            >
              <RotateCw size={18} />
            </button>
            {!hintShown && direction === 'production' && (
              <button
                onClick={() => setHintShown(true)}
                className="flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-amber-300 px-3.5 py-4 font-semibold text-amber-600 dark:border-amber-800 dark:text-amber-400"
              >
                <Lightbulb size={18} /> View Strokes
              </button>
            )}
            <button
              onClick={() => setRevealed(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-lg font-bold text-white shadow-card active:scale-[0.98] dark:bg-white dark:text-slate-900"
            >
              <Eye size={20} /> Show Answer
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {GRADE_BUTTONS.map(({ grade, label, classes }) => (
              <button
                key={grade}
                onClick={() => handleGrade(grade)}
                className={`flex flex-col items-center gap-1 rounded-2xl py-3 text-sm font-bold text-white shadow-card active:scale-[0.96] ${classes}`}
              >
                {grade === 'easy' && <Check size={16} />}
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ReviewHeader({
  onClose,
  label,
  progress,
  tint = 'brand',
}: {
  onClose: () => void
  label: string
  progress: number
  tint?: 'brand' | 'amber'
}) {
  const pct = Math.min(100, Math.max(0, progress * 100))
  return (
    <div className="px-4 pt-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="rounded-full bg-white p-2 text-slate-500 shadow-card dark:bg-slate-900 dark:text-slate-400"
          aria-label="Close review"
        >
          <X size={20} />
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-all ${tint === 'amber' ? 'bg-amber-500' : 'bg-brand-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <p className="mt-2 text-center text-xs font-medium text-slate-400">{label}</p>
    </div>
  )
}
