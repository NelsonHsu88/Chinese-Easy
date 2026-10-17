import type { TextSegment } from './textSegmentation'

/*
 * The arithmetic behind the story audiobook.
 *
 * A text-to-speech engine gives you no timeline: no duration, no current time,
 * nothing to seek. The only position signal is a boundary event carrying the
 * character offset of the word about to be spoken. Everything the transport
 * controls promise has to be rebuilt from that one number, which is what lives
 * here — kept free of expo-speech and of React so it can be reasoned about (and
 * tested) on its own. The platform side is `speech.ts`; the wiring is
 * `StoryReader`.
 */

/** What one press of the skip buttons is worth. */
export const SKIP_SECONDS = 5

/*
 * Speaking speed before any has been measured.
 *
 * Mandarin text-to-speech runs around five characters a second at its normal
 * rate; the app asks for 0.85 of that (`SPEECH_RATE`), so this is the resulting
 * figure. It only governs a skip pressed in the first second or so of playback
 * — after that the estimator below has watched the real voice and takes over.
 */
export const DEFAULT_CHARS_PER_SECOND = 4.2

/*
 * Bounds on anything the estimator will believe.
 *
 * Boundary events are not evenly spaced — engines batch them, and a long pause
 * at a comma or a stall while the next chunk buffers can imply an absurd rate
 * over a short window. Clamping keeps one bad sample from turning a five-second
 * skip into half a page.
 */
const MIN_CHARS_PER_SECOND = 1.5
const MAX_CHARS_PER_SECOND = 14

/** Shortest window worth dividing by, in seconds. */
const MIN_WINDOW = 0.6

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value))
}

export interface RateEstimator {
  /**
   * Opens a fresh measuring window, discarding samples but keeping the estimate.
   * Call whenever speech restarts — a pause or a skip puts a gap between the
   * old samples and the new ones that would otherwise read as very slow speech.
   */
  reset(): void
  /** Feed each boundary event's absolute character offset. */
  record(charIndex: number, now?: number): void
  /**
   * Feed a whole finished run: this many characters took this many
   * milliseconds. The calibration of last resort, for voices that report no
   * progress at all — a page spoken start to finish still reveals the rate, so
   * the *next* page can be predicted accurately even though this one was
   * guessed at.
   */
  observeRun(chars: number, ms: number): void
  /**
   * One measured stretch of speech, pauses already taken out. Blended into the
   * estimate rather than replacing it, so one odd interval can't swing it.
   */
  sample(chars: number, seconds: number): void
  /** The current best guess, always within the bounds above. */
  perSecond(): number
}

/**
 * Watches boundary events go by and works out how fast the voice is actually
 * speaking, so "+5 seconds" can mean five seconds rather than a guess.
 *
 * Measuring beats assuming here because the answer genuinely varies: a device's
 * chosen Mandarin voice, the engine behind it and the user's own system speech
 * rate all move it, and a fixed constant would be wrong on most devices in one
 * direction or the other.
 */
export function createRateEstimator(initial = DEFAULT_CHARS_PER_SECOND): RateEstimator {
  let anchorChar = 0
  let anchorAt = 0
  let estimate = clamp(initial, MIN_CHARS_PER_SECOND, MAX_CHARS_PER_SECOND)

  return {
    reset() {
      anchorAt = 0
    },
    record(charIndex, now = Date.now()) {
      if (!anchorAt) {
        anchorChar = charIndex
        anchorAt = now
        return
      }
      const seconds = (now - anchorAt) / 1000
      const chars = charIndex - anchorChar
      if (seconds >= MIN_WINDOW && chars > 0) {
        estimate = clamp(chars / seconds, MIN_CHARS_PER_SECOND, MAX_CHARS_PER_SECOND)
      }
    },
    observeRun(chars, ms) {
      const seconds = ms / 1000
      if (seconds >= MIN_WINDOW && chars > 0) {
        estimate = clamp(chars / seconds, MIN_CHARS_PER_SECOND, MAX_CHARS_PER_SECOND)
      }
    },
    sample(chars, seconds) {
      if (seconds <= 0 || chars <= 0) return
      const measured = clamp(chars / seconds, MIN_CHARS_PER_SECOND, MAX_CHARS_PER_SECOND)
      // Longer stretches are better measurements and count for more.
      const weight = clamp(seconds / 3, 0.15, 0.6)
      estimate = clamp(estimate + (measured - estimate) * weight, MIN_CHARS_PER_SECOND, MAX_CHARS_PER_SECOND)
    },
    perSecond() {
      return estimate
    },
  }
}

/**
 * Where the narrator has most likely reached, `ms` after starting at `from`.
 *
 * The fallback for voices that report no position of their own. Chrome fires no
 * `boundary` events at all for its remote (network) voices — the Google
 * Mandarin ones among them — so on a machine whose only Mandarin voice is
 * remote there is nothing to follow, and a highlight that waits for a boundary
 * event simply never moves off the first word. Predicting from elapsed time and
 * a measured speaking rate is less exact than a real boundary, but it tracks
 * the voice closely enough to be worth having, and it is the difference between
 * a line that moves and one that doesn't.
 */
export function predictedChar(
  from: number,
  ms: number,
  charsPerSecond: number,
  textLength: number,
): number {
  return clamp(Math.floor(from + (ms / 1000) * charsPerSecond), from, Math.max(from, textLength - 1))
}

/** Punctuation an engine pauses at — and, on Android, the only places some engines report a boundary. */
const CLAUSE_BREAK = /[，。！？、；：,.!?;:…「」『』“”]/

/**
 * The last character of the clause `from` sits in: one before the next
 * pause-worthy punctuation mark, or the end of the text.
 *
 * Android's Mandarin voices commonly report a boundary only at the start of
 * each clause, so between reports the highlight is predicted from the clock —
 * and capped here, so a voice slower than the estimate never sees the line run
 * ahead into a clause it has not reached. The next real boundary re-anchors it.
 */
export function clauseEnd(text: string, from: number): number {
  for (let i = Math.max(0, from) + 1; i < text.length; i++) {
    if (CLAUSE_BREAK.test(text[i])) return i - 1
  }
  return Math.max(0, text.length - 1)
}

/*
 * How long a voice rests at punctuation, in seconds. A prediction that reads
 * straight through a comma runs ahead of a voice that pauses there, then has to
 * wait for it — which is what made the line stall and then lurch.
 */
const CLAUSE_PAUSE = 0.22
const SENTENCE_PAUSE = 0.4
const SENTENCE_END = /[。！？!?…]/

function pauseAt(ch: string): number {
  if (SENTENCE_END.test(ch)) return SENTENCE_PAUSE
  if (CLAUSE_BREAK.test(ch)) return CLAUSE_PAUSE
  return 0
}

/** One before the next sentence-ending mark after `from`, or the end of the text. */
export function sentenceEnd(text: string, from: number): number {
  for (let i = Math.max(0, from) + 1; i < text.length; i++) {
    if (SENTENCE_END.test(text[i])) return i - 1
  }
  return Math.max(0, text.length - 1)
}

/**
 * How far a voice gets in `seconds` from `from`, paying each character's share
 * of the rate and resting at punctuation.
 */
function advance(text: string, from: number, seconds: number, charsPerSecond: number): number {
  const perChar = 1 / charsPerSecond
  let at = from
  let left = seconds
  while (at < text.length - 1) {
    const cost = perChar + pauseAt(text[at])
    if (left < cost) break
    left -= cost
    at++
  }
  return at
}

/** Seconds a voice spends on `text[from..to)`, the same way `advance` counts them. */
function spokenSeconds(text: string, from: number, to: number, charsPerSecond: number): { speech: number; pauses: number } {
  let pauses = 0
  for (let i = from; i < to; i++) pauses += pauseAt(text[i])
  return { speech: (to - from) / charsPerSecond, pauses }
}

/**
 * How far a boundary may fall behind the line before the line goes back to it.
 * Smaller corrections are absorbed by holding still until the voice catches
 * up; the line never visibly steps backwards over a word or two.
 */
const BACKTRACK_TOLERANCE = 6

export interface NarrationFollower {
  /** The voice has actually started (the engine's start event). */
  started(now?: number): void
  /** A boundary event, as an absolute character offset into the page text. */
  boundary(charIndex: number, now?: number): void
  /** Where to draw the line now. Never moves backwards except to a boundary well behind it. */
  position(now?: number): number
}

/**
 * Follows a voice through one run of text: from `from` to the end of the page.
 *
 * Between boundary events the line is predicted from the clock, with the pauses
 * a voice takes at punctuation, at a rate learned from the boundaries themselves
 * (fed back into `rate` so skips use it too). Engines differ in how often they
 * report — per word on iOS, per clause or per sentence on Android voices — so
 * the prediction is held at the end of whichever unit the voice has been seen
 * to report in, rather than always at the next comma: capped at a comma, a
 * once-a-sentence voice left the line parked mid-sentence and then jumping.
 * Nothing moves until the voice starts, since engines take a moment to begin.
 */
export function createNarrationFollower(
  text: string,
  from: number,
  rate: RateEstimator,
  now: number = Date.now(),
): NarrationFollower {
  let anchor = from
  let anchorAt = now
  let speaking = false
  let shown = from
  let lastBoundary = -1
  let lastBoundaryAt = 0
  /** Whether boundaries arrive at least once per clause; null until one interval has been seen. */
  let perClause: boolean | null = null
  let boundaries = 0

  return {
    started(at = Date.now()) {
      if (speaking) return
      speaking = true
      anchorAt = at
    },
    boundary(charIndex, at = Date.now()) {
      speaking = true
      boundaries++
      if (lastBoundary >= 0 && charIndex > lastBoundary) {
        const span = text.slice(lastBoundary, charIndex)
        const crossedClause = [...span.slice(1)].some((ch) => CLAUSE_BREAK.test(ch))
        // Once a voice has skipped a clause between reports, it is a coarse reporter.
        perClause = perClause === false ? false : !crossedClause
        const elapsed = (at - lastBoundaryAt) / 1000
        const { pauses } = spokenSeconds(text, lastBoundary, charIndex, rate.perSecond())
        const speech = elapsed - pauses
        if (speech > 0.15) rate.sample(charIndex - lastBoundary, speech)
      }
      lastBoundary = charIndex
      lastBoundaryAt = at
      anchor = charIndex
      anchorAt = at
      if (charIndex > shown || shown - charIndex > BACKTRACK_TOLERANCE) shown = charIndex
    },
    position(at = Date.now()) {
      if (!speaking) return shown
      let target = advance(text, anchor, (at - anchorAt) / 1000, rate.perSecond())
      if (boundaries > 0) {
        const cap = perClause === false ? sentenceEnd(text, anchor) : clauseEnd(text, anchor)
        target = Math.min(target, cap)
      }
      if (target > shown) shown = target
      return shown
    },
  }
}

/** Seconds, as m:ss. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export interface SegmentSpan {
  /** Index into the segment list. */
  index: number
  /** Character offset of the segment's first character in the page text. */
  start: number
  /** One past its last character. */
  end: number
}

/**
 * Character spans for a page's segments.
 *
 * `segmentText` returns the pieces in order and covering the string exactly, so
 * the offsets are just a running total — but the narrator needs them on every
 * boundary event, and recomputing a sum per event is the sort of thing that
 * quietly costs a frame on a long page.
 */
export function segmentSpans(segments: TextSegment[]): SegmentSpan[] {
  const spans: SegmentSpan[] = []
  let at = 0
  for (let index = 0; index < segments.length; index++) {
    const end = at + segments[index].text.length
    spans.push({ index, start: at, end })
    at = end
  }
  return spans
}

/**
 * Which segment the given character falls in, or -1 for none.
 *
 * This is what puts the green line under a word: the engine reports a character
 * and the reader draws on whole words, so the two have to be joined somewhere.
 */
export function segmentAt(spans: SegmentSpan[], charIndex: number): number {
  if (charIndex < 0) return -1
  for (const span of spans) {
    if (charIndex >= span.start && charIndex < span.end) return span.index
  }
  return -1
}

/**
 * Where to restart speech for a skip of `seconds` from `charIndex`.
 *
 * Snapped to the nearest word edge. Restarting mid-word makes the engine read a
 * fragment as though it were a word — which in Chinese is not a clipped sound
 * but a different, wrong one — and would leave the underline, which can only
 * highlight whole segments, disagreeing with what is being said.
 *
 * A result equal to the text length means the skip ran off the end of the page;
 * the caller decides whether that turns into the next page or a stop.
 */
export function skipTarget(
  charIndex: number,
  seconds: number,
  charsPerSecond: number,
  spans: SegmentSpan[],
  textLength: number,
): number {
  const raw = clamp(charIndex + seconds * charsPerSecond, 0, textLength)
  if (raw >= textLength) return textLength
  if (spans.length === 0) return Math.round(raw)

  let best = spans[0].start
  let bestGap = Math.abs(best - raw)
  for (const span of spans) {
    const gap = Math.abs(span.start - raw)
    if (gap < bestGap) {
      best = span.start
      bestGap = gap
    }
  }
  return best
}
