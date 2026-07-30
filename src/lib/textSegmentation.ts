import type { VocabWord } from '../types'

export interface TextSegment {
  text: string
  word?: VocabWord
}

const MAX_WORD_LEN = 4

/**
 * Greedy longest-match segmentation against the word bank (no proper CJK
 * segmenter is available/needed here) — walks the string trying the longest
 * known word first at each position, falling back to a single inert
 * character (punctuation, or a word not yet in the bank).
 */
export function segmentText(text: string, wordBank: VocabWord[]): TextSegment[] {
  const byText = new Map<string, VocabWord>()
  for (const w of wordBank) {
    if (!byText.has(w.traditional)) byText.set(w.traditional, w)
  }

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
      segments.push({ text: text.slice(i, i + matchedLen), word: matched })
      i += matchedLen
    } else {
      segments.push({ text: text[i] })
      i += 1
    }
  }
  return segments
}
