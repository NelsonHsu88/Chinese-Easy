import type { ReactNode } from 'react'
import { View, Text, Modal, Pressable, ScrollView } from 'react-native'
import { X, Quote } from 'lucide-react-native'
import { PressScale } from './PressScale'
import { ReadingSentence } from './ReadingSentence'
import { AddCircleButton, SpeakChip, ICON_GREEN, ICON_MUTED, ICON_STROKE } from './DictionaryControls'
import type { SentenceHit } from '../../lib/dictionary'
import { shortGloss } from '../../lib/definitions'
import { tapHaptic } from '../../lib/haptics'
import { displayWord, hanziFont } from '../../lib/hanzi'
import { useApp } from '../../context/AppContext'
import type { VocabWord } from '../../types'

/**
 * The sheet both "Appears in" lists open into.
 *
 * Two ways out on purpose — the X in the header and the backdrop behind it —
 * because the sheet covers the word you were reading and a modal with one exit
 * in one corner is a modal people feel stuck in. Android's back gesture is wired
 * up too, via `onRequestClose`.
 */
function ListSheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string
  subtitle: string
  onClose: () => void
  children: ReactNode
}) {
  const close = () => {
    tapHaptic()
    onClose()
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        {/*
          The backdrop is a sibling filling the space above the sheet rather than
          a parent wrapping it — a Pressable around the whole screen would swallow
          taps meant for the rows inside.
        */}
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={`Close ${title.toLowerCase()}`}
          className="flex-1"
        />

        <View className="max-h-[85%] rounded-t-[28px] bg-dict-page pb-2">
          <View className="flex-row items-center gap-3 border-b border-dict-line px-5 py-4">
            <View className="flex-1">
              <Text className="font-dict-bold text-[20px] leading-[26px] text-dict-heading">{title}</Text>
              <Text className="mt-0.5 font-inter text-[13px] leading-[18px] text-dict-muted">{subtitle}</Text>
            </View>
            <PressScale
              onPress={close}
              className="h-10 w-10 items-center justify-center rounded-full border border-dict-line bg-dict-card"
              accessibilityLabel={`Close ${title.toLowerCase()}`}
            >
              <X size={18} color={ICON_MUTED} strokeWidth={ICON_STROKE} />
            </PressScale>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

/** "Showing the first 60 of 2,259" — only said when it's true. */
function shownOf(shown: number, total: number, noun: string): string {
  if (total === 0) return `No ${noun} yet`
  if (shown < total) return `Showing the first ${shown} of ${total.toLocaleString()} ${noun}`
  return `${total} ${total === 1 ? noun.replace(/s$/, '') : noun}`
}

/**
 * Every word built from the term.
 *
 * The rows carry an add button as well as opening the entry, so the list is
 * somewhere to build a deck from and not only somewhere to look.
 */
export function WordsModal({
  term,
  words,
  total,
  isAdded,
  onOpen,
  onAdd,
  onClose,
}: {
  term: string
  words: VocabWord[]
  total: number
  isAdded: (wordId: string) => boolean
  onOpen: (word: VocabWord) => void
  onAdd: (wordId: string) => void
  onClose: () => void
}) {
  const { settings } = useApp()
  const script = settings.script
  return (
    <ListSheet title={`Words with ${term}`} subtitle={shownOf(words.length, total, 'words')} onClose={onClose}>
      {words.length === 0 && (
        <Text className="font-dict-sans text-[15px] leading-[21px] text-dict-body">
          No other word in the dictionary is built from {term}.
        </Text>
      )}

      {words.map((word) => (
        <View key={word.id} className="flex-row items-center gap-3 rounded-dict bg-dict-card p-4 shadow-dict">
          <PressScale
            onPress={() => {
              // Closing first, so the sheet isn't left hanging over the entry it
              // just navigated to.
              onClose()
              onOpen(word)
            }}
            outerClassName="flex-1"
            className="flex-row items-center gap-3"
            accessibilityLabel={`Open ${displayWord(word, script)}`}
          >
            <Text className={`${hanziFont(script)} text-[30px] leading-[38px] text-dict-heading`}>
              {displayWord(word, script)}
            </Text>
            <View className="flex-1">
              <Text className="font-dict-semibold text-[15px] leading-[20px] text-dict-green">{word.pinyin}</Text>
              <Text numberOfLines={2} className="font-dict-sans text-[14px] leading-[19px] text-dict-muted">
                {shortGloss(word)}
              </Text>
            </View>
          </PressScale>
          <AddCircleButton added={isAdded(word.id)} onAdd={() => onAdd(word.id)} />
        </View>
      ))}
    </ListSheet>
  )
}

/**
 * Every sentence in the bank that uses the term, with it tinted inside each one.
 *
 * Rows don't navigate. A sentence belongs to some other entry only as an
 * accident of which word it was filed under, so making the row open that entry
 * would send someone reading examples of 咖啡 off to 每天. The speaker is the
 * action instead — this list is for reading and hearing the word in use.
 */
export function SentencesModal({
  term,
  hits,
  total,
  onClose,
}: {
  term: string
  hits: SentenceHit[]
  total: number
  onClose: () => void
}) {
  const { settings } = useApp()
  const script = settings.script
  return (
    <ListSheet title={`Sentences with ${term}`} subtitle={shownOf(hits.length, total, 'sentences')} onClose={onClose}>
      {hits.length === 0 && (
        <Text className="font-dict-sans text-[15px] leading-[21px] text-dict-body">
          No sentence in the bundled corpus uses {term} yet. Example sentences are only ever taken from the corpus, never
          written to fill a gap.
        </Text>
      )}

      {hits.map(({ word, example }, i) => (
        <View key={`${word.id}-${i}`} className="rounded-dict bg-dict-card p-4 shadow-dict">
          <View className="flex-row gap-2">
            <View className="pt-1">
              <Quote size={15} color={ICON_GREEN} strokeWidth={ICON_STROKE} />
            </View>
            {/*
              Inert: the row already sits under a sheet, and a lookup from here
              would have to dismiss it. The reading over each word is the point.
            */}
            <View className="flex-1">
              <ReadingSentence text={script === 'simplified' ? example.simplified : example.traditional} term={term} size="compact" />
            </View>
            <SpeakChip text={script === 'simplified' ? example.simplified : example.traditional} size={34} />
          </View>

          <Text className="mt-1.5 font-inter text-[14px] leading-[20px] text-dict-body">{example.translation}</Text>
        </View>
      ))}
    </ListSheet>
  )
}
