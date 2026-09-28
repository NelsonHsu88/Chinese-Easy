import { createElement, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, Platform, View, Text, ActivityIndicator, type LayoutChangeEvent } from 'react-native'
import WebView, { type WebViewMessageEvent } from 'react-native-webview'
import type { CharacterJson } from 'hanzi-writer'
import { playStrokeSound, playGongSound } from '../../lib/sound'
import { tickHaptic, thudHaptic } from '../../lib/haptics'
import { WRITER_HTML } from './writerHtml'
import { bundledCharacterData } from '../../lib/hanziStrokeData'

export type HanziStageMode = 'demo' | 'quiz'

/**
 * How fast the demo animation runs. `slow` is for a learner following a stroke
 * with their eye or their hand rather than watching the character appear.
 */
export type HanziStageSpeed = 'normal' | 'slow'

/*
 * Pinned, deliberately. This used to be `@latest`, which meant the stroke data
 * a learner's device executed could change without a single change to this repo
 * or to package-lock.json — including after an upstream compromise, and
 * including a breaking change to the data format. Keep this in step with the
 * `hanzi-writer-data` devDependency, which is what buildHanziData.mjs bundles
 * from, so the CDN fallback and the bundled shards are the same vintage.
 */
const CDN_VERSION = '2.0.1'
const CDN_URL = (char: string) =>
  `https://cdn.jsdelivr.net/npm/hanzi-writer-data@${CDN_VERSION}/${encodeURIComponent(char)}.json`

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * hanzi-writer's own contract: a list of SVG path strings and one median per
 * stroke.
 *
 * Checked because this is third-party data arriving over the network and going
 * straight into the WebView. The blast radius is small — hanzi-writer turns it
 * into path geometry, not script — but "small" is an argument for validating
 * cheaply, not for trusting. A malformed payload has somewhere good to go
 * already: `loadCharData`'s caller shows "Stroke data unavailable", which is a
 * supported state for the 165 characters upstream has no data for anyway.
 */
function isCharacterJson(value: unknown): value is CharacterJson {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    Array.isArray(candidate.strokes) &&
    candidate.strokes.length > 0 &&
    candidate.strokes.every((stroke) => typeof stroke === 'string') &&
    Array.isArray(candidate.medians) &&
    candidate.medians.length === candidate.strokes.length
  )
}

async function fetchJson(url: string): Promise<CharacterJson> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  const body: unknown = await res.json()
  if (!isCharacterJson(body)) throw new Error('Unexpected stroke data shape')
  return body
}

/**
 * Loads stroke data for our own word list from the locally-bundled dataset
 * first (no network) and only falls back to the public hanzi-writer-data CDN
 * for characters we haven't bundled — e.g. a user's custom word.
 *
 * The bundled read is a file read rather than an object lookup now: the dataset
 * ships as asset shards instead of being inlined into the JS bundle (see
 * lib/hanziStrokeData.ts). Still offline, still the same data, and this function
 * was already async — which is why nothing above it had to change. A failed
 * shard read falls through to the CDN rather than throwing, so a character the
 * app *does* have bundled still draws if its shard is somehow unreadable.
 */
async function loadCharData(char: string): Promise<CharacterJson> {
  try {
    const bundled = await bundledCharacterData(char)
    if (bundled) return bundled
  } catch {
    // Fall through to the CDN below.
  }
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
  /** Draws the 米字格 practice grid behind each glyph. */
  showGuides?: boolean
  /** Bump to flash the stroke the learner is currently expected to draw. */
  hintKey?: number
  /** Bump to reveal the finished character over the drawing area. */
  revealKey?: number
  /** Bump to restart the demo animation or reset a quiz attempt for the same word. */
  resetKey?: number | string
  /**
   * Bump to clear only the character currently being written — its drawn
   * strokes, its stroke count towards the word's progress, its hint state —
   * without touching characters already finished or restarting the word from
   * its first glyph. See "Reset" in `WritingPracticeModal`, which is the one
   * control this exists for; `resetKey` above is still what restarts the
   * whole word.
   */
  resetActiveKey?: number
  /** Demo playback speed. Ignored in quiz mode, which isn't animating anything. */
  speed?: HanziStageSpeed
  /**
   * Keeps the finished character painted in the stroke colour once a quiz is
   * completed, instead of leaving the learner looking at the faint outline.
   * For screens that stay on the completed character rather than moving on.
   */
  holdCharacterOnComplete?: boolean
  /**
   * Fired on every accepted stroke — and once more, immediately, whenever
   * `resetActiveKey` clears the active glyph — with figures for the **whole
   * word**, not the character currently being written. `done`/`total` rather
   * than "remaining", and computed fresh each time from every glyph's own
   * count rather than accumulated as strokes are drawn, is what lets a reset
   * make the bar go backwards correctly instead of a caller having to guess
   * how much to subtract.
   */
  onQuizProgress?: (done: number, total: number, totalMistakes: number) => void
  onQuizComplete?: (totalMistakes: number) => void
  onDemoComplete?: () => void
  /**
   * Fired the moment any one character in the word is finished — including
   * the last one, ahead of `onQuizComplete` for the word as a whole. This is
   * what a caller drives a per-character progress indicator from (see
   * `WritingPracticeModal`), since which glyphs are done otherwise lives only
   * inside this component.
   */
  onCharacterComplete?: (index: number) => void
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
  showGuides = false,
  hintKey = 0,
  revealKey = 0,
  resetKey,
  resetActiveKey = 0,
  speed = 'normal',
  holdCharacterOnComplete = false,
  onQuizProgress,
  onQuizComplete,
  onDemoComplete,
  onCharacterComplete,
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

  /*
   * One character fills the whole stage — never divided by how many the word
   * has. A multi-character word is written one glyph at a time (see
   * `activeIndex` below), and the rest wait off to the side rather than
   * sharing the drawing area with the active one.
   */
  const stageSize = box ? Math.floor(Math.min(box.w, box.h, maxSize)) : null

  // Multi-character words play/quiz one character at a time, left to right —
  // the second character only becomes active once the first is done.
  const [activeIndex, setActiveIndex] = useState(0)
  const completedIndexes = useRef(new Set<number>())
  const demoCompletedIndexes = useRef(new Set<number>())
  const totalMistakes = useRef(0)

  /*
   * Per-glyph stroke bookkeeping, so progress can be reported for the word.
   *
   * `glyphTotals` is filled as each glyph's stroke data loads — every glyph
   * mounts and loads at once, even though only the active one takes input, so
   * the totals are all known well before the first stroke is drawn. A glyph
   * whose data never arrives stays absent and simply contributes nothing, which
   * is the same way the rest of this component treats missing stroke data.
   */
  const glyphTotals = useRef<number[]>([])
  const glyphDrawn = useRef<number[]>([])

  useEffect(() => {
    completedIndexes.current = new Set()
    demoCompletedIndexes.current = new Set()
    totalMistakes.current = 0
    glyphDrawn.current = []
    setActiveIndex(0)
  }, [character, mode, resetKey])

  // Totals belong to the characters, not to an attempt, so they survive a reset
  // and are only discarded when the word itself changes.
  useEffect(() => {
    glyphTotals.current = []
  }, [character])

  /*
   * The word advances one glyph at a time, and this is what everything on
   * screen actually slides against — a single value rather than one per
   * glyph, so every glyph's position is just "how far am I from `position`"
   * and the whole word can never disagree about where the seam is.
   */
  const position = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(position, {
      toValue: activeIndex,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start()
  }, [activeIndex, position])

  /** `done`/`total` strokes across the whole word, as of right now. */
  const wordProgress = () => {
    let done = 0
    let total = 0
    for (let i = 0; i < chars.length; i++) {
      done += glyphDrawn.current[i] ?? 0
      total += glyphTotals.current[i] ?? 0
    }
    return { done, total }
  }

  /*
   * Resetting the active glyph only ever touches its own entry in
   * `glyphDrawn` — the whole point is that a character already finished, and
   * the word's position in the queue, are untouched. Skipped on the render
   * that introduces a fresh key (0) so mounting never fires this.
   */
  const resetActiveKeyRef = useRef(resetActiveKey)
  useEffect(() => {
    if (resetActiveKey === resetActiveKeyRef.current) return
    resetActiveKeyRef.current = resetActiveKey
    glyphDrawn.current[activeIndex] = 0
    const { done, total } = wordProgress()
    onQuizProgress?.(done, total, totalMistakes.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetActiveKey])

  const handleGlyphProgress = (idx: number, strokesRemaining: number, mistakes: number) => {
    // Derive this glyph's total from its own first event if its stroke data
    // hasn't landed yet: what remains plus what has been drawn.
    glyphDrawn.current[idx] = (glyphDrawn.current[idx] ?? 0) + 1
    glyphTotals.current[idx] ??= strokesRemaining + glyphDrawn.current[idx]

    const { done, total } = wordProgress()
    // Completed glyphs have already banked their mistakes; the active one is
    // still reporting a running count of its own.
    onQuizProgress?.(done, total, totalMistakes.current + mistakes)
  }

  const handleGlyphQuizComplete = (idx: number, mistakes: number) => {
    completedIndexes.current.add(idx)
    totalMistakes.current += mistakes
    onCharacterComplete?.(idx)
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
    <View className="absolute inset-0 items-center justify-center" onLayout={handleLayout}>
      {stageSize != null && (
        <View style={{ width: stageSize, height: stageSize }}>
          {chars.map((char, idx) => {
            /*
             * This glyph's distance from the active one, as a single number:
             * 0 while it's active, negative once a later glyph takes over
             * (so it settles off to the left, already written), positive
             * while its own turn hasn't arrived yet (waiting off to the
             * right). Every glyph reads the same shared `position`, so a
             * transition is one animation rather than a coordinated pair.
             */
            const offset = Animated.subtract(idx, position)
            const translateX = offset.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [-stageSize, 0, stageSize],
              extrapolate: 'clamp',
            })
            const opacity = offset.interpolate({
              inputRange: [-1, -0.4, 0, 0.4, 1],
              outputRange: [0, 0, 1, 0, 0],
              extrapolate: 'clamp',
            })
            return (
              <Animated.View
                key={`${idx}-${char}-slot`}
                pointerEvents={idx === activeIndex ? 'auto' : 'none'}
                style={{ position: 'absolute', inset: 0, opacity, transform: [{ translateX }] }}
              >
                <SingleGlyphStage
                  // `speed` is in the key because the WebView is configured once, by the
                  // `init` message — there is no way to retune a live writer, so
                  // changing speed has to rebuild it.
                  key={`${idx}-${char}-${mode}-${speed}-${resetKey}-${Math.round(stageSize / 4) * 4}-${showOutline}`}
                  char={char}
                  mode={mode}
                  speed={speed}
                  showOutline={showOutline}
                  showGuides={showGuides}
                  hintKey={hintKey}
                  revealKey={revealKey}
                  restartKey={resetActiveKey}
                  size={stageSize}
                  holdCharacterOnComplete={holdCharacterOnComplete}
                  active={idx === activeIndex}
                  onStrokeTotal={(total) => {
                    glyphTotals.current[idx] = total
                  }}
                  onQuizProgress={(remaining, mistakes) => handleGlyphProgress(idx, remaining, mistakes)}
                  onQuizComplete={(mistakes) => handleGlyphQuizComplete(idx, mistakes)}
                  onDemoComplete={() => handleGlyphDemoComplete(idx)}
                />
              </Animated.View>
            )
          })}
        </View>
      )}
    </View>
  )
}

interface GlyphProps {
  speed: HanziStageSpeed
  char: string
  mode: HanziStageMode
  showOutline: boolean
  showGuides: boolean
  hintKey: number
  revealKey: number
  /** Bump to clear this glyph's own drawn strokes and re-quiz it in place. */
  restartKey: number
  size: number
  holdCharacterOnComplete: boolean
  /** Whether it's this character's turn — only the active glyph takes input. */
  active: boolean
  /** This glyph's stroke count, as soon as its stroke data resolves. */
  onStrokeTotal: (total: number) => void
  /** Strokes remaining in *this* glyph. The parent sums them across the word. */
  onQuizProgress?: (strokesRemaining: number, totalMistakes: number) => void
  onQuizComplete: (mistakes: number) => void
  onDemoComplete: () => void
}

function SingleGlyphStage({ char, mode, speed, showOutline, showGuides, hintKey, revealKey, restartKey, size, holdCharacterOnComplete, active, onStrokeTotal, onQuizProgress, onQuizComplete, onDemoComplete }: GlyphProps) {
  const webviewRef = useRef<WebView>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
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
        if (cancelled) return
        setStrokeData(data)
        onStrokeTotal(data.strokes.length)
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
    // Keyed on the character alone. `onStrokeTotal` is an inline arrow from the
    // parent, so including it would refetch the stroke data on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char])

  /** Sends a message into this glyph's writer — a real WebView on native, a plain <iframe> on web (see render below). */
  const postToGlyph = (payload: object) => {
    const json = JSON.stringify(payload)
    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(json, '*')
    } else {
      webviewRef.current?.postMessage(json)
    }
  }

  const sendInit = () => {
    if (initSentRef.current || !strokeData || !webviewReadyRef.current) return
    initSentRef.current = true
    postToGlyph({
      type: 'init',
      char,
      mode,
      speed,
      showOutline,
      showGuides,
      showStartHint,
      size,
      padding,
      drawingWidth,
      strokeWidth,
      strokeData,
      holdCharacterOnComplete,
    })
  }

  useEffect(() => {
    sendInit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokeData])

  // Hint/reveal are fire-and-forget pulses driven by a bumped counter. Skip the
  // initial value so mounting a glyph doesn't immediately hint or spoil it, and
  // only act on the glyph whose turn it currently is.
  useEffect(() => {
    if (!hintKey || !active || status !== 'ready') return
    postToGlyph({ type: 'hint' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hintKey])

  useEffect(() => {
    if (!revealKey || !active || status !== 'ready') return
    postToGlyph({ type: 'reveal' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealKey])

  // Same fire-and-forget shape as hint/reveal above, but restarts this
  // glyph's own quiz in place — hanzi-writer's `.quiz()` can be called again
  // on the same writer, so this never touches the WebView itself.
  useEffect(() => {
    if (!restartKey || !active || status !== 'ready') return
    postToGlyph({ type: 'restart' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartKey])

  const processMessage = (data: string) => {
    let msg: { type: string; strokesRemaining?: number; totalMistakes?: number }
    try {
      msg = JSON.parse(data)
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
      // The lightest feel in the app. A stroke lands many times per character,
      // and anything heavier stops reading as confirmation and turns into a
      // rattle by the fourth or fifth stroke.
      tickHaptic()
      onQuizProgress?.(msg.strokesRemaining ?? 0, msg.totalMistakes ?? 0)
    } else if (msg.type === 'strokeHint') {
      // The writer has given up on this stroke and highlighted it. Sounded here
      // alongside the stroke sound rather than in each screen, so every place
      // that shows a quiz gets the same feedback without repeating itself.
      // The heaviest feel in the app, and the only place it's used.
      playGongSound()
      thudHaptic()
    } else if (msg.type === 'demoComplete') {
      onDemoComplete()
    } else if (msg.type === 'quizComplete') {
      onQuizComplete(msg.totalMistakes ?? 0)
    }
  }

  const handleMessage = (event: WebViewMessageEvent) => processMessage(event.nativeEvent.data)

  // On web there's no react-native-webview bridge — the glyph's <iframe> posts straight
  // to window instead (see writerHtml.ts's post()). Every glyph's iframe shares the same
  // top-level window, so filter by source to route each message to the right instance.
  // This must be a layout effect, not a plain effect: the iframe starts parsing and
  // running its script (which posts "ready" once, with no retry) as soon as it's
  // inserted into the DOM, and a passive effect can run late enough to miss that
  // first message, leaving the glyph stuck on its loading spinner forever.
  useLayoutEffect(() => {
    if (Platform.OS !== 'web') return
    const listener = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      processMessage(event.data)
    }
    window.addEventListener('message', listener)
    return () => window.removeEventListener('message', listener)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    postToGlyph({ type: 'start' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, status])

  return (
    <View
      className="relative rounded-2xl"
      style={{ width: size, height: size }}
      pointerEvents={active ? 'auto' : 'none'}
    >
      {status !== 'error' &&
        (Platform.OS === 'web'
          ? createElement('iframe', {
              ref: iframeRef,
              srcDoc: WRITER_HTML,
              style: { width: size, height: size, border: 'none', background: 'transparent' },
              title: `hanzi-writer-${char}`,
              // The iframe's own script posts a one-off "ready" message with no retry,
              // which is easy to miss (a background/inactive screen kept alive by the
              // navigator, or any other timing hiccup) and then never recovers. The
              // native onLoad event is a reliable guarantee the document already
              // finished executing, so use it as the primary readiness signal on web —
              // the "ready" message becomes a harmless backup if it does arrive.
              onLoad: () => {
                webviewReadyRef.current = true
                sendInit()
              },
            })
          : (
            <WebView
              ref={webviewRef}
              source={{ html: WRITER_HTML }}
              onMessage={handleMessage}
              /*
               * The same readiness backstop the web branch above has, and it is
               * needed here for exactly the same reason.
               *
               * The writer document posts `ready` once, synchronously, with no
               * retry (writerHtml.ts). If that single message is missed — a
               * screen the navigator is keeping mounted but inactive, a slow
               * first paint, any timing hiccup — `webviewReadyRef` never flips,
               * `sendInit` refuses to send, the writer is never handed its
               * stroke data, and the glyph sits under its spinner **forever**.
               * Nothing after that point retries. It shows up as "some
               * characters never draw", varying run to run, which is what a
               * missed-message race looks like from the outside.
               *
               * `onLoadEnd` fires once the document has finished loading, and
               * the script attaches its `message` listeners on both `document`
               * and `window` before it posts `ready` — so by this point the
               * WebView can definitely receive an init. `initSentRef` inside
               * `sendInit` makes the overlap harmless: whichever of the two
               * signals lands first sends, the other is a no-op.
               *
               * This branch was left behind when the web branch was fixed; the
               * two must keep the same belt and braces.
               */
              onLoadEnd={() => {
                webviewReadyRef.current = true
                sendInit()
              }}
              /*
               * This document is static local HTML that draws one glyph. It has
               * no links, no forms and no reason to navigate anywhere, so say
               * so — `originWhitelist={['*']}` let it navigate to any URL, which
               * is a permission nothing here ever needed.
               *
               * Defence in depth rather than a fix for a live bug: the only
               * external input is the CDN stroke data above, which arrives as
               * postMessage JSON and becomes SVG path geometry. This caps the
               * blast radius if that data, or a future hanzi-writer, ever
               * produced something navigable.
               *
               * `about:blank` is the origin React Native gives a `source={{html}}`
               * document; the guard below is what actually refuses everything else.
               */
              originWhitelist={['about:blank']}
              onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
              setSupportMultipleWindows={false}
              scrollEnabled={false}
              bounces={false}
              style={{ width: size, height: size, backgroundColor: 'transparent' }}
              containerStyle={{ backgroundColor: 'transparent' }}
            />
          ))}
      {status === 'loading' && (
        <View className="absolute inset-0 items-center justify-center">
          <ActivityIndicator color="#22c55e" />
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
