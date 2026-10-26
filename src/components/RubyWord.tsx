import { useEffect, useLayoutEffect, useRef, useState, type Ref } from 'react'
import { View, Text, StyleSheet, type LayoutChangeEvent, type StyleProp, type TextStyle } from 'react-native'
import { SyllableText } from './SyllableText'

/**
 * A headword with its zhuyin under each character, each syllable centred on its
 * own glyph (tone marks hanging, see `SyllableText`). Falls back to the whole
 * reading under the whole word when syllables and characters don't pair up.
 *
 * `flush` lines the first character up with the left edge of the column it is
 * in. A cell is as wide as its widest line, and a zhuyin syllable is often
 * wider than its glyph (its tone mark's room is reserved on both sides, see
 * `SyllableText`), so the first character is centred a few points in from the
 * edge — while the English under the word starts right at it, and the two
 * looked out of line. The inset is read from layout and taken back with a
 * negative margin; the reading still centres on its glyph. Insets are
 * remembered per word and size, so a remount (the dictionary's ink copy of a
 * card, a list scrolled back) starts in place instead of settling a frame late.
 */
const insets = new Map<string, number>()
/** Where each word's reading starts, remembered the same way (see `onReadingStart`). */
const readingStarts = new Map<string, number>()

/**
 * Where a `RubyWord`'s reading starts, for the text under it to start there
 * too: the gloss lines up with the first zhuyin symbol rather than the
 * character. Remembered per word, so a remount starts in place.
 */
export function useReadingStart() {
  const [start, setStart] = useState(0)
  const onReadingStart = (x: number) => setStart((prev) => (Math.abs(prev - x) < 0.5 ? prev : x))
  return { start, onReadingStart }
}

export function RubyWord({
  hanzi,
  reading,
  hanziClass,
  hanziStyle,
  readingClass,
  readingSize,
  readingLineHeight,
  readingColor,
  gap = 2,
  flush = false,
  rowRef,
  onReadingStart,
}: {
  hanzi: string
  reading: string
  hanziClass: string
  hanziStyle?: StyleProp<TextStyle>
  readingClass: string
  readingSize: number
  readingLineHeight: number
  readingColor?: string
  gap?: number
  /** Pull the word left so its first character starts at the column's edge. */
  flush?: boolean
  /** The row the glyphs are drawn in — where they really are, `flush` margin included. */
  rowRef?: Ref<unknown>
  /**
   * Reports how far in from this word's left edge (its `flush` margin
   * included) the first syllable's symbols start — past a hanging neutral
   * dot — so the text under the word can start there (`useReadingStart`).
   */
  onReadingStart?: (x: number) => void
}) {
  const key = `${hanzi}|${reading}|${hanziClass}|${StyleSheet.flatten(hanziStyle)?.fontSize ?? ''}|${readingSize}`
  const [inset, setInset] = useState(() => insets.get(key) ?? 0)
  /* The first reading's box inside its cell, and its symbols inside that box. */
  const firstReading = useRef({ box: -1, symbols: -1 })
  /* Before paint, so a remembered start never shows a frame out of place. */
  useLayoutEffect(() => {
    const known = readingStarts.get(key)
    if (onReadingStart && known !== undefined) onReadingStart(known)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const reportStart = () => {
    const { box, symbols } = firstReading.current
    if (!onReadingStart || box < 0 || symbols < 0) return
    /* To the half point, like the inset. */
    const x = Math.max(0, Math.round((box + symbols - (flush ? inset : 0)) * 2) / 2)
    readingStarts.set(key, x)
    onReadingStart(x)
  }
  /* `flush` moves the word after the reading was measured. */
  useEffect(reportStart, [inset])
  const onFirstGlyph = (e: LayoutChangeEvent) => {
    /* To the half point: Android reports fractions that differ a little between passes. */
    const x = Math.max(0, Math.round(e.nativeEvent.layout.x * 2) / 2)
    insets.set(key, x)
    if (Math.abs(x - inset) >= 0.5) setInset(x)
  }
  const characters = Array.from(hanzi)
  /* Any whitespace: zhuyin syllables are joined by an en space (`ZHUYIN_SYLLABLE_GAP`). */
  const syllables = reading.split(/\s+/).filter(Boolean)
  const paired = syllables.length === characters.length
  const cells = paired ? characters.map((ch, i) => [ch, syllables[i]] as const) : [[hanzi, reading] as const]
  return (
    <View ref={rowRef as never} style={{ flexDirection: 'row', alignItems: 'flex-start', gap, marginLeft: flush ? -inset : 0 }}>
      {cells.map(([glyph, sound], i) => (
        <View key={i} style={{ alignItems: 'center' }}>
          <Text className={hanziClass} style={hanziStyle} onLayout={flush && i === 0 ? onFirstGlyph : undefined}>
            {glyph}
          </Text>
          <View
            onLayout={
              onReadingStart && i === 0
                ? (e) => {
                    firstReading.current.box = e.nativeEvent.layout.x
                    reportStart()
                  }
                : undefined
            }
          >
          <SyllableText
            text={sound}
            fontSize={readingSize}
            onSymbolsLayout={
              onReadingStart && i === 0
                ? (x) => {
                    firstReading.current.symbols = x
                    reportStart()
                  }
                : undefined
            }
            className={readingClass}
            style={{ fontSize: readingSize, lineHeight: readingLineHeight, ...(readingColor ? { color: readingColor } : null) }}
          />
          </View>
        </View>
      ))}
    </View>
  )
}
