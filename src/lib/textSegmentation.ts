import { displayWord } from './hanzi'
import { toSimplifiedText } from './scriptConversion'
import type { ScriptMode, VocabWord } from '../types'

export interface TextSegment {
  /**
   * The segment as it appears in the text that was segmented — canonical.
   *
   * Offsets into the source string are measured from these, so this must stay
   * the form the caller passed in even when a different form is being drawn.
   * `segmentSpans` and the story reader's narration cursor both depend on it.
   */
  text: string
  /**
   * The form to render. Identical to `text` unless a script conversion applied.
   *
   * Kept separate rather than overwriting `text` so that converting the display
   * cannot disturb anything keyed on position or identity. Draw this; measure
   * and look up with the other two.
   */
  display: string
  /**
   * The bank entry this segment matched, if any — **the canonical vocabulary
   * identity, independent of which script is being displayed.**
   *
   * A simplified learner tapping 学校 in a story gets the same `VocabWord` as a
   * traditional learner tapping 學校, because the match happened against the
   * canonical text before conversion. Nothing downstream needs to convert back.
   */
  word?: VocabWord
}

const MAX_WORD_LEN = 4

/*
 * The lookup table, cached against the bank it was built from.
 *
 * The bank is 20,000 entries and its identity is stable for the life of the app,
 * so rebuilding this per call meant 20,000 map inserts to segment one sentence.
 * That was survivable when only the story reader called it, one page at a time;
 * it is not when a modal segments sixty example sentences in a row.
 */
let cachedBank: VocabWord[] | null = null
let cachedIndex: Map<string, VocabWord> | null = null

function indexFor(wordBank: VocabWord[]): Map<string, VocabWord> {
  if (cachedBank === wordBank && cachedIndex) return cachedIndex
  const byText = new Map<string, VocabWord>()
  /*
   * Both scripts go in one table, rather than one table per script chosen by
   * the caller's `settings.script`.
   *
   * The text being segmented does not always match the learner's preference:
   * story prose is authored in traditional and is not converted, while an
   * example sentence rendered next to it follows the setting. A single index
   * keyed on both forms segments either without the caller having to know which
   * kind of text it is holding — and for the ~40% of entries whose two forms are
   * identical it costs nothing at all. Traditional is inserted first so it wins
   * a collision, which is the pre-existing behaviour for every ambiguous form.
   */
  for (const w of wordBank) {
    if (!byText.has(w.traditional)) byText.set(w.traditional, w)
  }
  for (const w of wordBank) {
    if (!byText.has(w.simplified)) byText.set(w.simplified, w)
  }
  cachedBank = wordBank
  cachedIndex = byText
  return byText
}

/**
 * Greedy longest-match segmentation against the word bank (no proper CJK
 * segmenter is available/needed here) — walks the string trying the longest
 * known word first at each position, falling back to a single inert
 * character (punctuation, or a word not yet in the bank).
 *
 * `displayScript` converts each segment's rendered form while leaving `text` and
 * `word` canonical, for the one caller that needs it: the story reader, whose
 * prose is authored in traditional and may be read by someone who reads
 * simplified. Omit it — as every other caller does — and `display` is just
 * `text`, since a sentence out of the word bank already arrives in the right
 * script.
 *
 * **Converting per segment rather than converting the string first is what keeps
 * the reader interactive.** A matched segment takes its display form from its own
 * bank entry, so the conversion is phrase-level exactly where phrase-level
 * matters and agrees with what the dictionary will show when the word is tapped;
 * an unmatched run falls back to the character table. Converting `text` up front
 * would instead segment simplified text against a traditional match, and every
 * word whose forms differ would stop resolving — no tap target, no reading, no
 * deck status.
 */
export function segmentText(text: string, wordBank: VocabWord[], displayScript?: ScriptMode): TextSegment[] {
  const byText = indexFor(wordBank)
  const convert = displayScript === 'simplified'

  const segments: TextSegment[] = []
  let i = 0
  while (i < text.length) {
    let matched: VocabWord | undefined
    let matchedLen = 0
    for (let len = Math.min(MAX_WORD_LEN, text.length - i); len >= 1; len--) {
      const candidate = text.slice(i, i + len)
      const found = byText.get(candidate)
      if (found) {
        matched = found
        matchedLen = len
        break
      }
    }
    if (matched) {
      const raw = text.slice(i, i + matchedLen)
      /*
       * The matched word's own simplified form, not the character table — this is
       * where the contextual cases come out right. 頭髮 is 头发 because
       * CC-CEDICT says so for that word, where 髮 and 發 both reduce to 发 and no
       * per-character rule could tell them apart.
       *
       * Guarded on equal length: the build enforces it for every entry, and if a
       * future rebuild ever broke that, falling back to the character table keeps
       * the narration cursor aligned rather than silently drifting.
       */
      let display = raw
      if (convert) {
        const fromBank = displayWord(matched, 'simplified')
        display = fromBank.length === raw.length ? fromBank : toSimplifiedText(raw)
      }
      segments.push({ text: raw, display, word: matched })
      i += matchedLen
    } else {
      segments.push({ text: text[i], display: convert ? toSimplifiedText(text[i]) : text[i] })
      i += 1
    }
  }
  return segments
}
