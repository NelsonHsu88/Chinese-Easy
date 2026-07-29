import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, ActivityIndicator, type LayoutChangeEvent } from 'react-native'
import WebView, { type WebViewMessageEvent } from 'react-native-webview'
import type { CharacterJson } from 'hanzi-writer'
import { playStrokeSound } from '../../lib/sound'
import { WRITER_HTML } from './writerHtml'
import hanziData from '../../assets/hanziData.json'

export type HanziStageMode = 'demo' | 'quiz'

const CDN_URL = (char: string) => `https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/${encodeURIComponent(char)}.json`
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
 * Loads stroke data for our own word list from the locally-bundled dataset
 * first (instant, no network) and only falls back to the public
 * hanzi-writer-data CDN for characters we haven't bundled — e.g. a user's
 * custom word.
 */
async function loadCharData(char: string): Promise<CharacterJson> {
  const bundled = (hanziData as Record<string, CharacterJson>)[char]
  if (bundled) return bundled
  // One retry on the CDN fetch since a transient network hiccup shouldn't
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
  maxSize?: number
}

/**
 * Renders a word (one or more characters) using real stroke-order data — each
 * character gets its own hanzi-writer instance running inside a WebView (hanzi-writer
 * draws into real SVG/DOM, which only exists there), laid out side by side. In "demo"
 * mode each animates the correct stroke order; in "quiz" mode each listens for the
 * user's drawn strokes and snaps them to a clean, correctly shaped stroke as recognized.
 */
export function HanziStage({
  character,
  mode,
  showOutline = true,
  resetKey,
  onQuizProgress,
  onQuizComplete,
  onDemoComplete,
  maxSize = 360,
}: Props) {
  const chars = useMemo(() => [...character].filter(Boolean), [character])
  const [box, setBox] = useState<{ w: number; h: number } | null>(null)

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    const w = Math.floor(width)
    const h = Math.floor(height)
    if (w <= 0 || h <= 0) return
    setBox((prev) => (prev && Math.abs(prev.w - w) < 4 && Math.abs(prev.h - h) < 4 ? prev : { w, h }))
  }

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
    <View className="absolute inset-0 flex-row items-center justify-center" style={{ gap: GAP }} onLayout={handleLayout}>
      {perCharSize &&
        chars.map((char, idx) => (
          <SingleGlyphStage
            key={`${idx}-${char}-${mode}-${resetKey}-${Math.round(perCharSize / 4) * 4}-${showOutline}`}
            char={char}
            mode={mode}
            showOutline={showOutline}
            size={perCharSize}
            active={idx === activeIndex}
            onQuizProgress={onQuizProgress}
            onQuizComplete={(mistakes) => handleGlyphQuizComplete(idx, mistakes)}
            onDemoComplete={() => handleGlyphDemoComplete(idx)}
          />
        ))}
    </View>
  )
}

interface GlyphProps {
  char: string
  mode: HanziStageMode
  showOutline: boolean
  size: number
  /** Whether it's this character's turn — inactive glyphs wait, dimmed, until the ones before them finish. */
  active: boolean
  onQuizProgress?: (strokesRemaining: number, totalMistakes: number) => void
  onQuizComplete: (mistakes: number) => void
  onDemoComplete: () => void
}

function SingleGlyphStage({ char, mode, showOutline, size, active, onQuizProgress, onQuizComplete, onDemoComplete }: GlyphProps) {
  const webviewRef = useRef<WebView>(null)
  const startedRef = useRef(false)
  const webviewReadyRef = useRef(false)
  const initSentRef = useRef(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [strokeData, setStrokeData] = useState<CharacterJson | null>(null)

  const padding = Math.max(8, Math.round(size * 0.06))
  const drawingWidth = Math.max(3, Math.round(size / 60))
  const strokeWidth = Math.max(2, Math.round(size / 100))
  const showStartHint = mode === 'quiz' && !showOutline

  useEffect(() => {
    let cancelled = false
    loadCharData(char)
      .then((data) => {
        if (!cancelled) setStrokeData(data)
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [char])

  const sendInit = () => {
    if (initSentRef.current || !strokeData || !webviewReadyRef.current) return
    initSentRef.current = true
    webviewRef.current?.postMessage(
      JSON.stringify({
        type: 'init',
        char,
        mode,
        showOutline,
        showStartHint,
        size,
        padding,
        drawingWidth,
        strokeWidth,
        strokeData,
      }),
    )
  }

  useEffect(() => {
    sendInit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokeData])

  const handleMessage = (event: WebViewMessageEvent) => {
    let msg: { type: string; strokesRemaining?: number; totalMistakes?: number }
    try {
      msg = JSON.parse(event.nativeEvent.data)
    } catch {
      return
    }

    if (msg.type === 'ready') {
      webviewReadyRef.current = true
      sendInit()
    } else if (msg.type === 'loadSuccess') {
      setStatus('ready')
    } else if (msg.type === 'loadError') {
      setStatus('error')
    } else if (msg.type === 'correctStroke') {
      playStrokeSound()
      onQuizProgress?.(msg.strokesRemaining ?? 0, msg.totalMistakes ?? 0)
    } else if (msg.type === 'demoComplete') {
      onDemoComplete()
    } else if (msg.type === 'quizComplete') {
      onQuizComplete(msg.totalMistakes ?? 0)
    }
  }

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
    webviewRef.current?.postMessage(JSON.stringify({ type: 'start' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, status])

  return (
    <View
      className={active ? 'relative rounded-2xl opacity-100' : 'relative rounded-2xl opacity-20'}
      style={{ width: size, height: size }}
      pointerEvents={active ? 'auto' : 'none'}
    >
      {status !== 'error' && (
        <WebView
          ref={webviewRef}
          source={{ html: WRITER_HTML }}
          onMessage={handleMessage}
          originWhitelist={['*']}
          scrollEnabled={false}
          bounces={false}
          style={{ width: size, height: size, backgroundColor: 'transparent' }}
          containerStyle={{ backgroundColor: 'transparent' }}
        />
      )}
      {status === 'loading' && (
        <View className="absolute inset-0 items-center justify-center">
          <ActivityIndicator color="#1fb96d" />
        </View>
      )}
      {status === 'error' && (
        <View className="absolute inset-1 items-center justify-center gap-1 rounded-xl bg-slate-100 p-2 dark:bg-slate-800">
          <Text className="font-hanzi font-bold text-slate-400 dark:text-slate-500" style={{ fontSize: size * 0.32 }}>
            {char}
          </Text>
          <Text className="text-center text-[10px] leading-tight text-slate-400">Stroke data unavailable</Text>
        </View>
      )}
    </View>
  )
}
