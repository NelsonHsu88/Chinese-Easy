import { useMemo } from 'react'
import { View, Text } from 'react-native'
import { useApp } from '../../context/AppContext'
import { displayPinyin, hanziFont } from '../../lib/hanzi'
import { readingForText } from '../../lib/characterReading'
import { segmentText } from '../../lib/textSegmentation'
import { PressScale } from './PressScale'
import type { ScriptMode, VocabWord } from '../../types'

/*
 * This app carries three visual languages — the dictionary's greens, the older
 * slate/brand card design that the review and word screens still use (with dark
 * mode), and the reading library's cream paper. A sentence renders in all three,
 * so the palette is a prop rather than baked in.
 */
export type ReadingTone = 'dictionary' | 'card' | 'paper'

const TONES: Record<ReadingTone, { hanzi: string; reading: string; term: string; press: string }> = {
  dictionary: {
    hanzi: 'text-dict-heading',
    reading: 'text-dict-muted',
    term: 'text-dict-green',
    press: 'bg-dict-page',
  },
  card: {
    hanzi: 'text-dict-heading',
    reading: 'text-dict-muted',
    term: 'text-brand-600 dark:text-brand-400',
    press: 'bg-dict-green-pale',
  },
  paper: {
    hanzi: 'text-read-ink',
    reading: 'text-read-muted',
    term: 'text-read-green',
    press: 'bg-read-cream',
  },
}

/**
 * A Chinese sentence with each word's reading sitting under it.
 *
 * Every segment is its own column, so the reading lines up with the word it
 * belongs to instead of running as one romanised copy of the whole sentence
 * underneath. That's the same layout the story reader uses, and for the same
 * reason: a learner matching sound to character needs to see which syllables go
 * with which glyph.
 *
 * The reading follows `settings.phoneticScript`, so a learner on zhuyin never
 * sees pinyin here. It comes from each matched word's own entry via
 * `displayPinyin` — not from the sentence's `pinyin` field, which most of the
 * bulk-imported corpus doesn't have and which couldn't be aligned per word
 * anyway — and falls back to the per-character index for anything the bank
 * can't match as a word.
 */
export function ReadingSentence({
  text,
  term,
  size = 'normal',
  tone = 'dictionary',
  script,
  onPressWord,
}: {
  text: string
  /** The word this sentence is an example of — tinted, and never a tap target. */
  term?: string
  /** `compact` for list rows, where the sentence is one of many. */
  size?: 'normal' | 'compact'
  tone?: ReadingTone
  /**
   * Which script `text` is written in, for choosing the hanzi face.
   *
   * Defaults to the learner's preference, which is right for every caller today:
   * every sentence this renders is word-bank data, which carries both forms, so
   * whoever passed it in has already resolved the script. The override exists for
   * text that is canonically one script regardless of the setting — the story
   * reader needed it before it converted its own prose, and would need it again
   * for any surface that deliberately shows unconverted source text.
   */
  script?: ScriptMode
  /** Omit to render the sentence inert — required inside an already-pressable card. */
  onPressWord?: (word: VocabWord) => void
}) {
  const { wordBank, settings } = useApp()
  const face = hanziFont(script ?? settings.script)
  const segments = useMemo(() => segmentText(text, wordBank), [text, wordBank])

  const palette = TONES[tone]
  const hanzi = size === 'compact' ? 'text-[17px] leading-[24px]' : 'text-[19px] leading-[26px]'
  const reading = size === 'compact' ? 'text-[10px] leading-[14px]' : 'text-[11px] leading-[15px]'

  return (
    <View className="flex-row flex-wrap items-start">
      {segments.map((segment, i) => {
        const isTerm = !!term && segment.text === term
        /*
         * A matched word's own pinyin first — it knows which reading this word
         * takes. Failing that, the per-character index, so a name or a rare
         * character still gets a sound instead of a blank line.
         */
        const sound = segment.word
          ? displayPinyin(segment.word, settings.phoneticScript)
          : readingForText(segment.display, settings.phoneticScript)
        const tappable = !!onPressWord && !!segment.word && !isTerm

        const column = (
          <View className="items-center px-[1px]">
            <Text className={`${face} ${hanzi} ${isTerm ? palette.term : palette.hanzi}`}>
              {segment.display}
            </Text>
            {/*
              An empty line still reserves its height. Without it the words that
              do have a reading sit lower than the ones that don't, and the
              sentence develops a wobble.
            */}
            <Text numberOfLines={1} className={`font-inter ${reading} ${isTerm ? palette.term : palette.reading}`}>
              {sound || ' '}
            </Text>
          </View>
        )

        if (!tappable) return <View key={i}>{column}</View>

        return (
          <PressScale
            key={i}
            onPress={() => onPressWord!(segment.word!)}
            scaleTo={0.94}
            className={`rounded-[5px] ${palette.press}`}
            accessibilityLabel={`Look up ${segment.display}${sound ? `, ${sound}` : ''}`}
          >
            {column}
          </PressScale>
        )
      })}
    </View>
  )
}
