import { Fragment, type ReactNode } from 'react'
import { Text } from 'react-native'

/*
 * A zhuyin reading set on one line of text, with a thin gap between each
 * syllable and its tone mark.
 *
 * Zhuyin writes the tone mark straight after the symbols (ㄏㄠˇ) and the
 * neutral dot straight before them (˙ㄒㄧㄝ), and in Nunito's fallback the
 * mark then touches the symbol beside it. Printed zhuyin leaves a thin space.
 * A space character can't be added to the reading itself — syllables are split
 * on whitespace all over the app — so the gap is letter spacing on the one
 * character beside each mark, in a nested Text: it works inside any line of
 * text, on every platform, and leaves the string (and what is copied or read
 * aloud) unchanged.
 *
 * Syllables drawn one by one under their characters use `SyllableText`,
 * which hangs the mark with the same gap.
 */

/** The gap, as a share of the reading's font size (matches `SyllableText`). */
const GAP = 0.2

/** A trailing tone mark, or a leading neutral dot, and the symbol beside it. */
const BESIDE_MARK = /([^\s˙ˊˇˋ⁠])(⁠?[ˊˇˋ])|(˙)(⁠?)(?=[^\s])/g

/**
 * `text` with the gap before each tone mark (and after each neutral dot). Text
 * with no zhuyin marks — pinyin, English — comes back unchanged.
 */
export function spacedReading(text: string, fontSize: number): ReactNode {
  if (!/[˙ˊˇˋ]/.test(text)) return text
  const gap = { letterSpacing: Math.max(1.5, fontSize * GAP) }
  const parts: ReactNode[] = []
  let at = 0
  let key = 0
  for (const m of text.matchAll(BESIDE_MARK)) {
    const start = m.index ?? 0
    if (start > at) parts.push(text.slice(at, start))
    if (m[1]) {
      /* The symbol before a trailing mark carries the gap after it. */
      parts.push(
        <Text key={key++} style={gap}>
          {m[1]}
        </Text>,
        m[2],
      )
    } else {
      /* A leading neutral dot carries the gap after itself. */
      parts.push(
        <Text key={key++} style={gap}>
          {m[3]}
        </Text>,
        m[4] ?? '',
      )
    }
    at = start + m[0].length
  }
  if (at < text.length) parts.push(text.slice(at))
  return <Fragment>{parts}</Fragment>
}
