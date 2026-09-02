import { useMemo, useState } from 'react'
import { View, Text } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useApp } from '../context/AppContext'
import { LOOKUP_HSK_LEVEL } from '../data/lookupWords'
import { displayExample, displayPinyin, displayWord } from '../lib/hanzi'
import { DetailShell, DetailCard, StrokeOrderModal } from '../components/dictionary/DetailShell'
import {
  AppearsInCard,
  ExampleCard,
  HeroCard,
  MeaningCard,
  RadicalCard,
  WordRadicalsCard,
  WordsContainingCard,
  type HeroStat,
} from '../components/dictionary/DetailSections'
import { SentencesModal, WordsModal } from '../components/dictionary/AppearsInModals'
import { DeckStateButton } from '../components/dictionary/DictionaryControls'
import { WritingPracticeModal } from '../components/WritingPracticeModal'
import { TourPulse } from '../components/tour/TourPulse'
import {
  appearsIn,
  buildDeckIndex,
  entryStateFor,
  isInDeck,
  radicalFor,
  relatedCharacters,
  sentencesWith,
  strokeCountFor,
  wordsContaining,
  wordsWith,
} from '../lib/dictionary'
import { tapHaptic } from '../lib/haptics'
import type { VocabWord } from '../types'

/**
 * A dictionary entry in full.
 *
 * The word is the subject here; each character is a doorway to the per-character
 * screen, which goes deeper on the glyph itself. The radical section is the one
 * thing shown at both levels — it's the first question asked of an unfamiliar
 * character, and making people drill in for it was the wrong default.
 */
export function WordDetail() {
  const { wordId } = useLocalSearchParams<{ wordId?: string }>()
  const {
    wordBank,
    settings,
    deck,
    newlyAddedWordIds,
    addToReviewDeck,
    getWord,
    pushRecentSearch,
    reportTourAction,
  } = useApp()

  const [watching, setWatching] = useState(false)
  const [practising, setPractising] = useState(false)
  /** Which half of "Appears in" is open, if either. */
  const [appearsInList, setAppearsIn] = useState<'words' | 'sentences' | null>(null)

  const word = wordId ? getWord(decodeURIComponent(wordId)) : undefined

  const script = settings.script
  /*
   * The word in the learner's script, and the term everything below is keyed on.
   *
   * Both the display *and* the lookups use this one form. The relationship
   * helpers match a term against the same script it is written in, so mixing
   * them — a simplified heading over a traditional query — is what would empty
   * every card on the screen.
   */
  const form = word ? displayWord(word, script) : ''
  const characters = useMemo(() => [...form], [form])

  // A word's stroke total is the sum of its characters', and is only honest when
  // every character is in the bundled dataset.
  const strokeTotal = useMemo(() => {
    if (characters.length === 0) return null
    let total = 0
    for (const char of characters) {
      const count = strokeCountFor(char)
      if (count === null) return null
      total += count
    }
    return total
  }, [characters])

  const radicals = useMemo(
    () =>
      characters.map((character) => ({
        character,
        info: radicalFor(character),
        strokes: strokeCountFor(character),
      })),
    [characters],
  )

  const counts = useMemo(
    () => (word ? appearsIn(wordBank, form, script) : { words: 0, sentences: 0 }),
    [wordBank, word, form, script],
  )

  /*
   * What "Words containing" is about on this screen.
   *
   * The whole word first — 學 → 學生, 學校 — but plenty of entries are already
   * as long as anything in the bank, and a three-character word is contained by
   * almost nothing. Rather than drop the section for those, it falls back to the
   * first character that leads somewhere and says so in its own heading, so the
   * rows always match the term above them.
   */
  const related = useMemo(() => {
    if (!word) return { term: '', words: [] as VocabWord[] }
    const exact = wordsContaining(wordBank, form, script, 3)
    if (exact.length > 0 || characters.length === 1) return { term: form, words: exact }
    for (const character of characters) {
      const words = wordsContaining(wordBank, character, script, 3)
      if (words.length > 0) return { term: character, words }
    }
    return { term: form, words: [] }
  }, [wordBank, word, form, script, characters])

  /**
   * How many entries the "view all" link would turn up. `appearsIn` already
   * excludes the term's own entry and applies the same teachability test
   * `wordsContaining` does, so this is the count of exactly those rows.
   */
  const relatedTotal = useMemo(() => {
    if (!related.term) return 0
    return related.term === form ? counts.words : appearsIn(wordBank, related.term, script).words
  }, [wordBank, form, script, related, counts])

  /*
   * The modal lists, built only once a modal is actually open.
   *
   * Both are full scans of a 20,000-entry bank. Computing them on mount would
   * pay for a list most visits never open; computing them inline in the JSX
   * would pay again on every re-render the sheet is up for — and adding a word
   * to the deck from inside it re-renders.
   */
  const listedWords = useMemo(
    () => (appearsInList === 'words' && word ? wordsWith(wordBank, form, script) : []),
    [appearsInList, wordBank, word, form, script],
  )
  const listedSentences = useMemo(
    () => (appearsInList === 'sentences' && word ? sentencesWith(wordBank, form, script) : []),
    [appearsInList, wordBank, word, form, script],
  )

  const deckIndex = useMemo(() => buildDeckIndex(deck, newlyAddedWordIds), [deck, newlyAddedWordIds])

  if (!word) {
    return (
      <DetailShell title="Word">
        <DetailCard>
          <Text className="font-dict-sans text-[16px] text-dict-body">This word is no longer in the dictionary.</Text>
        </DetailCard>
      </DetailShell>
    )
  }

  const stats: HeroStat[] = [
    { label: 'Characters', value: String(characters.length) },
    ...(strokeTotal !== null ? [{ label: 'Strokes', value: String(strokeTotal) }] : []),
    // Tier-2 words carry a sentinel level rather than a graded one — see HskBadge.
    word.hskLevel < LOOKUP_HSK_LEVEL
      ? { label: 'Level', value: `HSK ${word.hskLevel}`, green: true }
      : { label: 'Level', value: 'Rare' },
  ]

  const openCharacter = (character: string) => {
    tapHaptic()
    router.push(`/dictionary-tab/character/${encodeURIComponent(character)}`)
  }

  const openWord = (next: VocabWord) => {
    tapHaptic()
    pushRecentSearch(next.id)
    router.push(`/dictionary-tab/word/${encodeURIComponent(next.id)}`)
  }

  return (
    <DetailShell title="Word">
      <HeroCard
        glyph={form}
        pinyin={displayPinyin(word, settings.phoneticScript)}
        stats={stats}
        onWatch={() => {
          tapHaptic()
          setWatching(true)
          reportTourAction('word:watch')
        }}
        onPractice={() => {
          tapHaptic()
          setPractising(true)
          reportTourAction('word:practice')
        }}
      />

      <View className="flex-row justify-center">
        <TourPulse target="word-add" radius={22}>
          <DeckStateButton
            state={entryStateFor(word.id, deckIndex)}
            onAdd={() => {
              addToReviewDeck(word.id)
              reportTourAction('word:add')
            }}
          />
        </TourPulse>
      </View>

      <MeaningCard word={word} />

      {word.example && (
        <ExampleCard
          sentence={displayExample(word, script)}
          term={form}
          translation={word.example.translation}
          onOpenWord={openWord}
        />
      )}

      {/*
       * The radical section. A word doesn't have one — each of its characters
       * does — so a single-character entry gets the same full card as the
       * character screen, and anything longer gets a row per character that
       * doubles as the drill-down into that screen.
       */}
      {characters.length === 1 ? (
        <RadicalCard
          character={form}
          info={radicals[0].info}
          related={radicals[0].info ? relatedCharacters(radicals[0].info, form) : []}
          onOpenCharacter={openCharacter}
        />
      ) : (
        <WordRadicalsCard characters={radicals} onOpenCharacter={openCharacter} />
      )}

      <WordsContainingCard
        character={related.term}
        words={related.words}
        totalCount={relatedTotal}
        isAdded={(id) => isInDeck(id, deckIndex)}
        onOpen={openWord}
        onAdd={addToReviewDeck}
        onViewAll={() => {
          tapHaptic()
          // The tab route, not the standalone `/dictionary` — that one sits
          // outside the tab group and would drop the nav bar.
          router.push(`/dictionary-tab?q=${encodeURIComponent(related.term)}`)
        }}
      />

      <AppearsInCard
        words={counts.words}
        sentences={counts.sentences}
        onOpenWords={() => setAppearsIn('words')}
        onOpenSentences={() => setAppearsIn('sentences')}
      />

      {appearsInList === 'words' && (
        <WordsModal
          term={form}
          words={listedWords}
          total={counts.words}
          isAdded={(id) => isInDeck(id, deckIndex)}
          onOpen={openWord}
          onAdd={addToReviewDeck}
          onClose={() => setAppearsIn(null)}
        />
      )}
      {appearsInList === 'sentences' && (
        <SentencesModal
          term={form}
          hits={listedSentences}
          total={counts.sentences}
          onClose={() => setAppearsIn(null)}
        />
      )}

      {watching && <StrokeOrderModal characters={form} onClose={() => setWatching(false)} />}
      {practising && <WritingPracticeModal word={word} onClose={() => setPractising(false)} />}
    </DetailShell>
  )
}
