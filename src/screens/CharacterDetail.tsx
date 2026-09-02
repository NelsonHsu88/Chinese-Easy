import { useMemo, useState } from 'react'
import { Text } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useApp } from '../context/AppContext'
import { DetailShell, DetailCard, StrokeOrderModal } from '../components/dictionary/DetailShell'
import {
  AppearsInCard,
  HeroCard,
  MeaningCard,
  RadicalCard,
  WordsContainingCard,
  type HeroStat,
} from '../components/dictionary/DetailSections'
import { SentencesModal, WordsModal } from '../components/dictionary/AppearsInModals'
import { WritingPracticeModal } from '../components/WritingPracticeModal'
import {
  appearsIn,
  buildDeckIndex,
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
 * A single character.
 *
 * Reached by drilling into a word's title. Where the word screen is about
 * meaning and usage, this one is about the glyph: its radical, its strokes, and
 * the vocabulary built from it.
 */
export function CharacterDetail() {
  const { character } = useLocalSearchParams<{ character?: string }>()
  const { wordBank, deck, newlyAddedWordIds, addToReviewDeck, pushRecentSearch, settings } = useApp()

  const [watching, setWatching] = useState(false)
  const [practising, setPractising] = useState(false)
  /** Which half of "Appears in" is open, if either. */
  const [appearsInList, setAppearsIn] = useState<'words' | 'sentences' | null>(null)

  const glyph = character ? decodeURIComponent(character).slice(0, 2) : ''

  /*
   * The character's own dictionary entry, when it has one. Plenty of characters
   * are components rather than standalone words, so pinyin and meaning are shown
   * only when the bank actually holds the single-character entry.
   */
  // Matched on either form: the glyph arrives from whatever the learner tapped,
  // which on a simplified deck is the simplified character.
  const entry = useMemo(
    () => wordBank.find((w) => w.traditional === glyph || w.simplified === glyph),
    [wordBank, glyph],
  )

  /*
   * What the writing practice modal drills. It wants a `VocabWord`, and plenty
   * of characters reachable from here (radical components, related characters)
   * have no entry of their own — so stand one up from the glyph rather than
   * leaving the Practice button dead. Pinyin and definition are left empty
   * rather than guessed; the modal simply shows nothing where they'd go.
   */
  const practiceTarget = useMemo<VocabWord | null>(() => {
    if (entry) return entry
    if (!glyph) return null
    return {
      id: `character-${glyph}`,
      simplified: glyph,
      traditional: glyph,
      pinyin: '',
      definition: '',
      hskLevel: 1,
      category: 'daily',
    }
  }, [entry, glyph])

  const radical = useMemo(() => (glyph ? radicalFor(glyph) : null), [glyph])
  const related = useMemo(() => (radical ? relatedCharacters(radical, glyph) : []), [radical, glyph])
  const counts = useMemo(() => (glyph ? appearsIn(wordBank, glyph, settings.script) : { words: 0, sentences: 0 }), [wordBank, glyph, settings.script])
  const words = useMemo(() => (glyph ? wordsContaining(wordBank, glyph, settings.script, 3) : []), [wordBank, glyph, settings.script])
  const deckIndex = useMemo(() => buildDeckIndex(deck, newlyAddedWordIds), [deck, newlyAddedWordIds])

  // Full scans of the bank, so only run once a sheet is actually open — see the
  // same pair in WordDetail.
  const listedWords = useMemo(
    () => (appearsInList === 'words' && glyph ? wordsWith(wordBank, glyph, settings.script) : []),
    [appearsInList, wordBank, glyph, settings.script],
  )
  const listedSentences = useMemo(
    () => (appearsInList === 'sentences' && glyph ? sentencesWith(wordBank, glyph, settings.script) : []),
    [appearsInList, wordBank, glyph, settings.script],
  )

  if (!glyph) {
    return (
      <DetailShell title="Character">
        <DetailCard>
          <Text className="font-dict-sans text-[16px] text-dict-body">No character was given.</Text>
        </DetailCard>
      </DetailShell>
    )
  }

  const strokes = strokeCountFor(glyph)

  const stats: HeroStat[] = [
    ...(radical ? [{ label: 'Radical', value: radical.radical.character, hanzi: true }] : []),
    ...(strokes !== null ? [{ label: 'Strokes', value: `${strokes}` }] : []),
    ...(entry ? [{ label: 'Level', value: `HSK ${entry.hskLevel}`, green: true }] : []),
  ]

  const openWord = (word: VocabWord) => {
    tapHaptic()
    pushRecentSearch(word.id)
    router.push(`/dictionary-tab/word/${encodeURIComponent(word.id)}`)
  }

  return (
    <DetailShell title="Character">
      <HeroCard
        glyph={glyph}
        pinyin={entry?.pinyin ?? ''}
        stats={stats}
        onWatch={() => {
          tapHaptic()
          setWatching(true)
        }}
        onPractice={() => {
          tapHaptic()
          setPractising(true)
        }}
      />

      {entry && <MeaningCard word={entry} />}

      <WordsContainingCard
        character={glyph}
        words={words}
        totalCount={counts.words}
        isAdded={(id) => isInDeck(id, deckIndex)}
        onOpen={openWord}
        onAdd={addToReviewDeck}
        onViewAll={() => {
          tapHaptic()
          // The tab route, not the standalone `/dictionary` — that one sits
          // outside the tab group and would drop the nav bar.
          router.push(`/dictionary-tab?q=${encodeURIComponent(glyph)}`)
        }}
      />

      <RadicalCard
        character={glyph}
        info={radical}
        related={related}
        onOpenCharacter={(char) => {
          tapHaptic()
          router.push(`/dictionary-tab/character/${encodeURIComponent(char)}`)
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
          term={glyph}
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
          term={glyph}
          hits={listedSentences}
          total={counts.sentences}
          onClose={() => setAppearsIn(null)}
        />
      )}

      {watching && <StrokeOrderModal characters={glyph} onClose={() => setWatching(false)} />}
      {practising && practiceTarget && (
        <WritingPracticeModal word={practiceTarget} onClose={() => setPractising(false)} />
      )}
    </DetailShell>
  )
}
