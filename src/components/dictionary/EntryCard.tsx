import { View, Text } from 'react-native'
import { PressScale } from './PressScale'
import { RubyWord, useReadingStart } from '../RubyWord'
import { DeckStateButton, HskBadge, IconChip, SpeakChip } from './DictionaryControls'
import { DICT_BG, DICT_CARD_SHADOW } from './shadows'
import { useRevealedShadow } from '../shadowReveal'
import type { EntryState } from '../../lib/dictionary'
import { shortGloss } from '../../lib/definitions'
import { tapHaptic } from '../../lib/haptics'
import { displayWord, hanziFont } from '../../lib/hanzi'
import type { ScriptMode, VocabWord } from '../../types'

/** Bopomofo block: the reading was rendered in zhuyin. */
const ZHUYIN = /[㄀-ㄯ]/

type FaceProps = {
  word: VocabWord
  pinyin: string
  script: ScriptMode
  state: EntryState
  onAdd: () => void
  onPractice: () => void
}

/**
 * One search result: the word, its reading and gloss, and its controls. Every
 * card has the same shape — no example sentences in the list (SS1025); they
 * live on the word's own page.
 *
 * Tapping the card's body opens the word; the speaker, practice and Add
 * controls keep their own presses.
 */
export function EntryCard({
  onOpen,
  ...face
}: FaceProps & {
  onOpen: () => void
}) {
  const { word, pinyin, script } = face
  const hanzi = displayWord(word, script)
  const shadow = useRevealedShadow(DICT_CARD_SHADOW)

  return (
    <PressScale
      onPress={() => {
        // Opening an entry is navigation: a light feel, and deliberately silent.
        tapHaptic()
        onOpen()
      }}
      scaleTo={0.985}
      accessibilityLabel={`${hanzi}, ${pinyin}, ${shortGloss(word)}`}
      style={[shadow, { borderRadius: 20, backgroundColor: DICT_BG.card }]}
      className="rounded-dict bg-dict-card p-5"
      /*
       * The card also holds its own real buttons (speaker, practice, add) —
       * `accessibilityRole="button"` (PressScale's default) would render this
       * as a literal `<button>` on web, nesting one `<button>` inside another,
       * which is invalid HTML and throws React's DOM-nesting warning. `onPress`
       * doesn't depend on the role, so this changes no behavior.
       */
      accessibilityRole="none"
    >
      <EntryCardFace {...face} />
    </PressScale>
  )
}

/** The card's contents. */
function EntryCardFace({
  word,
  pinyin,
  script,
  state,
  onAdd,
  onPractice,
}: FaceProps) {
  const hanzi = displayWord(word, script)
  const glyphClass = `${hanziFont(script)} text-[38px] leading-[48px] text-dict-heading`
  const zhuyin = ZHUYIN.test(pinyin)
  const readingStart = useReadingStart()
  return (
    <>
      <View className="flex-row items-start gap-3">
        <View className="flex-1">
          {zhuyin ? (
            /* Zhuyin sits under each character, centred on its glyph (SS1025). */
            <View className="flex-row items-start gap-3">
              <RubyWord
                hanzi={hanzi}
                reading={pinyin}
                hanziClass={glyphClass}
                readingClass="font-nunito-semibold text-dict-muted"
                readingSize={13}
                readingLineHeight={18}
                gap={4}
                flush
                onReadingStart={readingStart.onReadingStart}
              />
              <View style={{ marginTop: 12 }}>
                <HskBadge level={word.hskLevel} />
              </View>
            </View>
          ) : (
            <>
              <View className="flex-row items-center gap-3">
                <Text className={glyphClass}>{hanzi}</Text>
                <HskBadge level={word.hskLevel} />
              </View>
              <Text className="mt-1 font-sans text-[16px] leading-[21px] text-dict-muted">{pinyin}</Text>
            </>
          )}
        </View>

        <View className="flex-row gap-2 pt-1">
          <SpeakChip text={hanzi} />
          <IconChip icon="practice" tint="muted" label={`Practice writing ${hanzi}`} onPress={onPractice} />
        </View>
      </View>

      {/* Under zhuyin, the English starts where the reading does. */}
      <Text className="mt-3 font-sans text-[16px] leading-[22px] text-dict-body" style={{ marginLeft: zhuyin ? readingStart.start : 0 }}>
        {shortGloss(word)}
      </Text>

      <View className="mt-4 flex-row justify-end">
        <DeckStateButton state={state} onAdd={onAdd} compact />
      </View>
    </>
  )
}
