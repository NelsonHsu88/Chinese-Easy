import { View, Text } from 'react-native'
import { Quote } from 'lucide-react-native'
import { PressScale } from './PressScale'
import { ReadingSentence } from './ReadingSentence'
import { DeckStateButton, HskBadge, IconChip, SpeakChip, ICON_GREEN, ICON_STROKE } from './DictionaryControls'
import type { EntryState } from '../../lib/dictionary'
import { shortGloss } from '../../lib/definitions'
import { tapHaptic } from '../../lib/haptics'
import { displayWord, displayExample, hanziFont } from '../../lib/hanzi'
import type { ScriptMode, VocabWord } from '../../types'

/**
 * One search result.
 *
 * `expanded` gives the card its example sentence with the searched term tinted
 * inside it. Only the top hit gets it: every card carrying a sentence would turn
 * a scannable list into a wall, and the first result is the one people are
 * usually looking for.
 */
export function EntryCard({
  word,
  pinyin,
  script,
  state,
  expanded = false,
  onOpen,
  onAdd,
  onPractice,
}: {
  word: VocabWord
  pinyin: string
  script: ScriptMode
  state: EntryState
  expanded?: boolean
  onOpen: () => void
  onAdd: () => void
  onPractice: () => void
}) {
  const example = expanded ? word.example : undefined
  const hanzi = displayWord(word, script)
  const exampleText = example ? displayExample(word, script) : ''

  return (
    <PressScale
      onPress={() => {
        // Opening an entry is navigation: a light feel, and deliberately silent.
        tapHaptic()
        onOpen()
      }}
      scaleTo={0.985}
      accessibilityLabel={`${hanzi}, ${pinyin}, ${shortGloss(word)}`}
      className="rounded-dict bg-dict-card p-5 shadow-dict"
    >
      <View className="flex-row items-start gap-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-3">
            <Text className={`${hanziFont(script)} text-[38px] leading-[48px] text-dict-heading`}>{hanzi}</Text>
            <HskBadge level={word.hskLevel} />
          </View>
          <Text className="mt-1 font-dict-sans text-[16px] leading-[21px] text-dict-muted">{pinyin}</Text>
        </View>

        <View className="flex-row gap-2 pt-1">
          <SpeakChip text={hanzi} />
          <IconChip icon="practice" tint="muted" label={`Practice writing ${hanzi}`} onPress={onPractice} />
        </View>
      </View>

      <Text className="mt-3 font-dict-sans text-[16px] leading-[22px] text-dict-body">{shortGloss(word)}</Text>

      {example ? (
        <View className="mt-4 flex-row items-end gap-3">
          <View className="flex-1 rounded-dict-sm bg-dict-page p-4">
            <View className="flex-row gap-2">
              <Quote size={14} color={ICON_GREEN} strokeWidth={ICON_STROKE} />
              {/*
                Inert on purpose — the whole card is already one press that opens
                the entry, and a tap target inside it would fight that.
              */}
              <View className="flex-1">
                <ReadingSentence text={exampleText} term={hanzi} size="compact" />
              </View>
            </View>
            <Text className="mt-1.5 font-inter text-[13px] leading-[18px] text-dict-body">{example.translation}</Text>
          </View>
          <DeckStateButton state={state} onAdd={onAdd} />
        </View>
      ) : (
        <View className="mt-4 flex-row justify-end">
          <DeckStateButton state={state} onAdd={onAdd} compact />
        </View>
      )}
    </PressScale>
  )
}
