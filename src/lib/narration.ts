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
