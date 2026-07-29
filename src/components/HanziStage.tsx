import { useEffect, useMemo, useRef, useState } from 'react'
import HanziWriter, { type CharacterJson } from 'hanzi-writer'
import { playStrokeSound } from '../lib/sound'

export type HanziStageMode = 'demo' | 'quiz'

const CDN_URL = (char: string) => `https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/${encodeURIComponent(char)}.json`
const LOCAL_URL = (char: string) => `/hanzi-data/${encodeURIComponent(char)}.json`
const GAP = 10

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchJson(url: string): Promise<CharacterJson> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json()
}

/**
 * Loads stroke data for our own word list from a locally-bundled copy first
 * (instant, no network race, immune to CDN hiccups) and only falls back to
 * the public hanzi-writer-data CDN for characters we haven't bundled — e.g.
 * a user's custom word.
 */
async function loadCharData(char: string): Promise<CharacterJson> {
  try {
    return await fetchJson(LOCAL_URL(char))
  } catch {
    // not bundled locally — fall through to the CDN
  }
  // The CDN fetch gets one retry since a transient network hiccup shouldn't
  // permanently show "stroke data unavailable" for a character that's really there.
  try {
    return await fetchJson(CDN_URL(char))
  } catch {
    await delay(400)
    return await fetchJson(CDN_URL(char))
  }
}

interface Props {
  /** One or more Han characters — a whole word/phrase. Each renders as its own writer. */
  character: string
  mode: HanziStageMode
  /** Shows a faint reference outline of the target character behind the drawing area. */
  showOutline?: boolean
  /** Bump to restart the demo animation or reset a quiz attempt for the same word. */
  resetKey?: number | string
  onQuizProgress?: (strokesRemaining: number, totalMistakes: number) => void
  onQuizComplete?: (totalMistakes: number) => void
  onDemoComplete?: () => void
  className?: string
  maxSize?: number
}

/**
 * Renders a word (one or more characters) using real stroke-order data —
 * each character gets its own hanzi-writer instance, laid out side by side.
 * In "demo" mode each animates the correct stroke order; in "quiz" mode each
 * listens for the user's drawn strokes and snaps them to a clean, correctly
 * shaped stroke as recognized — the same interaction Skritter uses.
 */
export function HanziStage({
  character,
  mode,
  showOutline = true,
  resetKey,
  onQuizProgress,
  onQuizComplete,
  onDemoComplete,
  className = '',
  maxSize = 360,
}: Props) {
  const chars = useMemo(() => [...character].filter(Boolean), [character])
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ w: number; h: number } | null>(null)

  // We measure the *parent* element's real rendered box (getBoundingClientRect,
  // already-resolved layout) rather than giving this wrapper a CSS h-full/w-full
  // and reading its own clientHeight — percentage heights don't reliably resolve
  // through a flex-1 chain in every browser, which left this stuck at 0 and the
  // writer permanently "loading" (looked identical to missing stroke data).
  useEffect(() => {
    const parent = wrapperRef.current?.parentElement
    if (!parent) return
    const update = () => {
      const rect = parent.getBoundingClientRect()
      const w = Math.floor(rect.width)
      const h = Math.floor(rect.height)
      if (w <= 0 || h <= 0) return
      // Ignore sub-4px jitter (scrollbars, font-swap reflow, etc.) so we don't
      // tear down and recreate writers — and their in-flight data fetches —
      // for a resize that doesn't actually matter.
      setBox((prev) => (prev && Math.abs(prev.w - w) < 4 && Math.abs(prev.h - h) < 4 ? prev : { w, h }))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [])

  const perCharSize = box
    ? Math.floor(Math.min(box.h, maxSize, (box.w - GAP * (chars.length - 1)) / chars.length))
    : null

  // Multi-character words play/quiz one character at a time, left to right —
  // the second character only becomes active once the first is done.
  const [activeIndex, setActiveIndex] = useState(0)
  const completedIndexes = useRef(new Set<number>())
  const demoCompletedIndexes = useRef(new Set<number>())
  const totalMistakes = useRef(0)

  useEffect(() => {
    completedIndexes.current = new Set()
    demoCompletedIndexes.current = new Set()
    totalMistakes.current = 0
    setActiveIndex(0)
  }, [character, mode, resetKey])

  const handleGlyphQuizComplete = (idx: number, mistakes: number) => {
    completedIndexes.current.add(idx)
    totalMistakes.current += mistakes
    if (completedIndexes.current.size === chars.length) {
      onQuizComplete?.(totalMistakes.current)
    } else if (idx === activeIndex) {
      setActiveIndex(idx + 1)
    }
  }

  const handleGlyphDemoComplete = (idx: number) => {
    demoCompletedIndexes.current.add(idx)
    if (demoCompletedIndexes.current.size === chars.length) {
      onDemoComplete?.()
    } else if (idx === activeIndex) {
      setActiveIndex(idx + 1)
    }
  }

  return (
    <div ref={wrapperRef} className={`absolute inset-0 flex items-center justify-center gap-2.5 ${className}`}>
      {perCharSize &&
        chars.map((char, idx) => (
          <SingleGlyphStage
            key={`${idx}-${char}`}
            char={char}
            mode={mode}
            showOutline={showOutline}
            resetKey={`${resetKey}`}
            size={perCharSize}
            active={idx === activeIndex}
            onQuizProgress={onQuizProgress}
            onQuizComplete={(mistakes) => handleGlyphQuizComplete(idx, mistakes)}
            onDemoComplete={() => handleGlyphDemoComplete(idx)}
          />
        ))}
    </div>
  )
}

interface GlyphProps {
  char: string
  mode: HanziStageMode
  showOutline: boolean
  resetKey: string
  size: number
  /** Whether it's this character's turn — inactive glyphs wait, dimmed, until the ones before them finish. */
  active: boolean
  onQuizProgress?: (strokesRemaining: number, totalMistakes: number) => void
  onQuizComplete: (mistakes: number) => void
  onDemoComplete: () => void
}

function SingleGlyphStage({ char, mode, showOutline, resetKey, size, active, onQuizProgress, onQuizComplete, onDemoComplete }: GlyphProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const writerRef = useRef<HanziWriter | null>(null)
  const startedRef = useRef(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [firstStrokePath, setFirstStrokePath] = useState<string | null>(null)
  const [firstStrokeDrawn, setFirstStrokeDrawn] = useState(false)

  const padding = Math.max(8, Math.round(size * 0.06))

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    host.innerHTML = ''
    setStatus('loading')
    setFirstStrokePath(null)
    setFirstStrokeDrawn(false)
    startedRef.current = false
    let cancelled = false

    const writer = HanziWriter.create(host, char, {
      width: size,
      height: size,
      padding,
      charDataLoader: (c) => loadCharData(c),
      showOutline,
      showCharacter: false,
      // Demo mode is passive viewing, so it can move quickly — this matters a lot
      // for multi-character words now that characters demo one at a time instead
      // of all at once; a many-stroke first character shouldn't make you wait
      // half a minute before the second one even starts.
      strokeAnimationSpeed: mode === 'demo' ? 3.5 : 1,
      strokeFadeDuration: 200,
      delayBetweenStrokes: mode === 'demo' ? 60 : 250,
      strokeColor: '#1fb96d',
      radicalColor: '#149457',
      outlineColor: '#cbd5e1',
      highlightColor: '#f6432c',
      drawingColor: '#0f172a',
      drawingWidth: Math.max(3, Math.round(size / 60)),
      strokeWidth: Math.max(2, Math.round(size / 100)),
      outlineWidth: Math.max(2, Math.round(size / 100)),
      showHintAfterMisses: 2,
      highlightOnComplete: true,
      leniency: 1.2,
      onLoadCharDataSuccess: (data) => {
        if (cancelled) return
        setStatus('ready')
        setFirstStrokePath(data.strokes[0] ?? null)
      },
      onLoadCharDataError: () => {
        if (cancelled) return
        setStatus('error')
      },
    })
    writerRef.current = writer

    return () => {
      cancelled = true
      writerRef.current = null
      try {
        writer.cancelQuiz()
      } catch {
        // wasn't quizzing — nothing to cancel
      }
    }
  }, [char, mode, size, showOutline, resetKey])

  // Only start animating/quizzing once this glyph has settled (loaded or errored)
  // and it's its turn. A char with no stroke data still counts as "done" so it
  // doesn't permanently block the characters after it in the same word.
  useEffect(() => {
    if (!active || status === 'loading' || startedRef.current) return
    startedRef.current = true

    if (status === 'error') {
      if (mode === 'demo') onDemoComplete()
      else onQuizComplete(0)
      return
    }

    const writer = writerRef.current
    if (!writer) return
    if (mode === 'demo') {
      writer.animateCharacter({ onComplete: () => onDemoComplete() })
    } else {
      writer.quiz({
        onCorrectStroke: (strokeData) => {
          playStrokeSound()
          setFirstStrokeDrawn(true)
          onQuizProgress?.(strokeData.strokesRemaining, strokeData.totalMistakes)
        },
        onComplete: (summary) => onQuizComplete(summary.totalMistakes),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, status, mode])

  // In blind quiz mode (no outline) we still show a faint hint of just the
  // *first* stroke — enough to know where to start writing without giving
  // the rest of the character away. It disappears once that stroke is drawn.
  const showStartHint = mode === 'quiz' && !showOutline && status === 'ready' && firstStrokePath && !firstStrokeDrawn
  const startHintTransform = useMemo(
    () => HanziWriter.getScalingTransform(size, size, padding).transform,
    [size, padding],
  )

  return (
    <div
      className={`relative rounded-2xl transition-all duration-300 ${
        active ? 'scale-100 opacity-100' : 'scale-90 opacity-20 grayscale'
      }`}
      style={{ width: size, height: size, pointerEvents: active ? 'auto' : 'none' }}
    >
      <div ref={hostRef} />
      {showStartHint && (
        <svg className="pointer-events-none absolute inset-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <g transform={startHintTransform}>
            <path d={firstStrokePath} fill="#1fb96d" fillOpacity={0.32} />
          </g>
        </svg>
      )}
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500 dark:border-slate-700" />
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-1 flex flex-col items-center justify-center gap-1 rounded-xl bg-slate-100 p-2 text-center dark:bg-slate-800">
          <p className="hanzi font-bold text-slate-400 dark:text-slate-500" style={{ fontSize: size * 0.32 }}>
            {char}
          </p>
          <p className="text-[10px] leading-tight text-slate-400">Stroke data unavailable</p>
        </div>
      )}
    </div>
  )
}
