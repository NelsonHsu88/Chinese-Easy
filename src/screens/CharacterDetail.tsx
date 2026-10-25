import { RaisedButton } from '../components/dashboard/parts'
import { lookalikesFor } from '../lib/lookalikes'
import { useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useApp } from '../context/AppContext'
import {
  DetailShell,
  DetailCard,
  DetailSheetShell,
  StrokeOrderModal,
  openCharacterDetail,
  openWordDetail,
  useInDictionaryTab,
} from '../components/dictionary/DetailShell'
import { DetailHero, type HeroFact } from '../components/dictionary/DetailSections'
import { SheetHeader } from '../components/dictionary/ExploreCards'
import { buildExploreTabs } from '../components/dictionary/exploreTabs'
import { frequencyLabel, frequencyRank } from '../lib/frequency'
import { SentencesModal, WordsModal } from '../components/dictionary/AppearsInModals'
import { WritingPracticeModal } from '../components/WritingPracticeModal'
import { DICT_BG } from '../components/dictionary/shadows'
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
import { allSenses, shortGloss } from '../lib/definitions'
import { displayPinyin } from '../lib/hanzi'
import { LOOKUP_HSK_LEVEL } from '../data/lookupWords'
import { DeckStateButton, FavoriteButton } from '../components/dictionary/DictionaryControls'
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
  const inTab = useInDictionaryTab()
  const { wordBank, deck, newlyAddedWordIds, addToReviewDeck, pushRecentSearch, settings, favoriteWordIds, toggleFavorite } = useApp()

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
  const lookalikes = useMemo(() => (glyph ? lookalikesFor(glyph, wordBank, settings.script) : []), [glyph, wordBank, settings.script])
  const counts = useMemo(() => (glyph ? appearsIn(wordBank, glyph, settings.script) : { words: 0, sentences: 0 }), [wordBank, glyph, settings.script])
  const words = useMemo(() => (glyph ? wordsContaining(wordBank, glyph, settings.script, 3) : []), [wordBank, glyph, settings.script])
  const deckIndex = useMemo(() => buildDeckIndex(deck, newlyAddedWordIds), [deck, newlyAddedWordIds])
  /* The Explore sheet's longer lists: five related words, five example sentences. */
  const relatedLong = useMemo(() => (glyph ? wordsContaining(wordBank, glyph, settings.script, 5) : []), [wordBank, glyph, settings.script])
  const exampleHits = useMemo(() => (glyph ? sentencesWith(wordBank, glyph, settings.script, 5) : []), [wordBank, glyph, settings.script])

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
          <Text className="font-sans text-[16px] text-dict-body">No character was given.</Text>
          <RaisedButton
            onPress={() => {
              tapHaptic()
              if (router.canGoBack()) router.back()
              else router.replace(inTab ? '/dictionary-tab' : '/my-words')
            }}
            accessibilityLabel="Back to the dictionary"
            wrapperStyle={{ marginTop: 16, alignSelf: 'stretch' }}
            height={48}
            fill={DICT_BG.green}
            shoulder={DICT_BG.greenShoulder}
          >
            <Text className="font-nunito-bold text-[15px] text-white">Back to Dictionary</Text>
          </RaisedButton>
        </DetailCard>
      </DetailShell>
    )
  }

  const strokes = strokeCountFor(glyph)

  const facts: HeroFact[] = [
    ...(strokes !== null ? [{ text: `${strokes} strokes` }] : []),
    ...(entry && entry.hskLevel < LOOKUP_HSK_LEVEL ? [{ text: `HSK ${entry.hskLevel}`, green: true }] : []),
  ]

  const openWord = (word: VocabWord) => {
    tapHaptic()
    pushRecentSearch(word.id)
    openWordDetail(word.id, inTab)
  }

  const hints = [
    ...(entry?.example ? ['Examples'] : []),
    'Radical',
    ...(words.length > 0 ? ['Related words'] : []),
    ...(entry && allSenses(entry).length > 1 ? ['More meanings'] : []),
  ].slice(0, 3)

  const senses = entry ? allSenses(entry) : []
  const rank = entry ? frequencyRank(entry) : null
  const level = entry ? (entry.hskLevel < LOOKUP_HSK_LEVEL ? `HSK ${entry.hskLevel}` : 'Rare') : null
  const openCharacter = (char: string) => {
    tapHaptic()
    openCharacterDetail(char, inTab)
  }

  const tabs = buildExploreTabs({
    glyph,
    entry,
    senses,
    script: settings.script,
    /* Characters that look like this one (大 → 太 犬 天). */
    overviewCharacters: { title: 'Related characters', characters: lookalikes.slice(0, 3) },
    relatedCharacters: lookalikes,
    relatedCharactersTitle: 'Related characters',
    containingTerm: glyph,
    containingWords: words,
    containingTotal: counts.words,
    relatedWords: relatedLong,
    sentences: exampleHits,
    counts,
    stats: [
      ...(strokes !== null ? [{ label: 'Strokes', value: String(strokes) }] : []),
      ...(radical
        ? [{ label: 'Kangxi radical', value: `${radical.radical.number} (${radical.radical.character} · ${radical.radical.meaning})` }]
        : []),
      ...(level ? [{ label: 'HSK level', value: level }] : []),
      ...(rank !== null ? [{ label: 'Frequency', value: frequencyLabel(rank) }] : []),
    ],
    isAdded: (id) => isInDeck(id, deckIndex),
    onAdd: addToReviewDeck,
    openWord,
    openCharacter,
    // The tab route, not the standalone `/dictionary` — that one sits outside the tab group and would drop the nav bar.
    viewAllWords: () => router.push(`/dictionary-tab?q=${encodeURIComponent(glyph)}`),
    openWordsList: () => setAppearsIn('words'),
    openSentencesList: () => setAppearsIn('sentences'),
    onWatch: () => {
      tapHaptic()
      setWatching(true)
    },
    onPractice: () => {
      tapHaptic()
      setPractising(true)
    },
  })

  const sheetHeader = (
    <SheetHeader
      glyph={glyph}
      reading={entry ? displayPinyin(entry, settings.phoneticScript) : ''}
      meanings={senses.slice(0, 3)}
      facts={[...(strokes !== null ? [`${strokes} strokes`] : []), ...(level ? [level] : [])]}
    />
  )

  return (
    <DetailSheetShell
      title="Character"
      sheetLabel="Explore this character"
      sheetHints={hints}
      sheetHeader={sheetHeader}
      tabs={tabs}
      hero={(availableHeight) => (
        <DetailHero
          glyph={glyph}
          reading={entry ? displayPinyin(entry, settings.phoneticScript) : ''}
          meaning={entry ? shortGloss(entry) : undefined}
          facts={facts}
          availableHeight={availableHeight}
          onWatch={() => {
            tapHaptic()
            setWatching(true)
          }}
          onPractice={() => {
            tapHaptic()
            setPractising(true)
          }}
          /* Only a character that is an entry of its own can be saved. */
          save={
            entry ? (
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                <DeckStateButton state={entryStateFor(entry.id, deckIndex)} onAdd={() => addToReviewDeck(entry.id)} />
                <FavoriteButton favorite={favoriteWordIds.includes(entry.id)} onToggle={() => toggleFavorite(entry.id)} />
              </View>
            ) : undefined
          }
        />
      )}
    >
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
    </DetailSheetShell>
  )
}
