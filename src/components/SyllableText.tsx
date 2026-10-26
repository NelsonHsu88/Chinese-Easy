import { View, Text, type LayoutChangeEvent, type StyleProp, type TextStyle } from 'react-native'

/** A zhuyin syllable's trailing tone mark (2nd, 3rd, 4th tone). */
const TONE_MARK = /^(.+?)([ˊˇˋ])$/
/** The neutral tone's dot, which zhuyin writes before the syllable (˙ㄒㄧㄝ). */
const NEUTRAL_MARK = /^(˙)(.+)$/
/** Word joiners, which prose readings put before a mark so a line can't break there. */
const JOINER = /⁠/g

/** How wide a hanging mark is, as a share of the reading's font size. */
const MARK_WIDTH = 0.45
/**
 * The space between the symbols and a hanging mark. Without it the mark sat
 * flush against the last symbol (ㄏㄠˇ read as one squashed run, and in 謝謝 the
 * first syllable's ˋ ran into the second's ˙): printed zhuyin leaves a thin
 * space, and so does this.
 */
const MARK_GAP = 0.2

/**
 * One syllable of reading, centred under its character.
 *
 * Zhuyin writes the tone mark after the symbols (the neutral dot before them),
 * so centring the whole string pushes the symbols off the glyph above them
 * (SS1025 "Zhuyin misalignment"). Printed zhuyin centres the symbols and lets
 * the mark hang beside them, a thin space away; this does the same. Room for a
 * mark is reserved on both sides, so the box stays symmetric — centring it
 * still centres the symbols — and a neighbouring syllable's mark can never
 * reach into this one's.
 *
 * Pinyin, and any reading without a tone mark, render as plain text.
 */
export function SyllableText({
  text,
  className,
  style,
  fontSize,
  onSymbolsLayout,
}: {
  text: string
  className?: string
  style?: StyleProp<TextStyle>
  /** The reading's font size; sets how wide the hanging mark and its gap are. */
  fontSize: number
  /** Where the symbols start inside this box (past a leading mark's room), once laid out. */
  onSymbolsLayout?: (x: number) => void
}) {
  const reportSymbols = onSymbolsLayout ? (e: LayoutChangeEvent) => onSymbolsLayout(e.nativeEvent.layout.x) : undefined
  const clean = text.replace(JOINER, '')
  const after = TONE_MARK.exec(clean)
  const before = after ? null : NEUTRAL_MARK.exec(clean)
  if (!after && !before) {
    return (
      <Text numberOfLines={1} className={className} style={style} onLayout={reportSymbols}>
        {text}
      </Text>
    )
  }
  const gap = Math.max(1.5, fontSize * MARK_GAP)
  const hang = Math.ceil(fontSize * MARK_WIDTH + gap)
  const symbols = after ? after[1] : before![2]
  const mark = after ? after[2] : before![1]
  /*
   * A plain row — room, symbols, room — with the mark in its side's room, a
   * gap away from the symbols. Both rooms are the same width, so centring the
   * row still centres the symbols. (The mark used to be absolutely positioned
   * at `left: '100%'` with a negative margin; Android doesn't resolve that the
   * way the web does and drew the mark over or before the symbols, SS1025
   * "Zhuyin Fix".)
   */
  const markBox = (
    <View style={{ width: hang, alignSelf: 'stretch' }}>
      {/* Out of flow at a plain offset, so a font that gives the mark a wide
          advance can neither wrap nor truncate it. */}
      <Text className={className} style={[style, { position: 'absolute', top: 0 }, after ? { left: gap } : { right: gap }]}>
        {mark}
      </Text>
    </View>
  )
  const room = <View style={{ width: hang }} />
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      {after ? room : markBox}
      <Text numberOfLines={1} className={className} style={style} onLayout={reportSymbols}>
        {symbols}
      </Text>
      {after ? markBox : room}
    </View>
  )
}
