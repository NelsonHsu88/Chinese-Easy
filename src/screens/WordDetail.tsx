import { RaisedButton } from '../components/dashboard/parts'
import { lookalikesFor } from '../lib/lookalikes'
import { useMemo, useState } from 'react'
import { View, Text } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useApp } from '../context/AppContext'
import { LOOKUP_HSK_LEVEL } from '../data/lookupWords'
import { displayPinyin, displayWord } from '../lib/hanzi'
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
import { DeckStateButton, FavoriteButton, RemoveFromDeckButton } from '../components/dictionary/DictionaryControls'
import { DICT_BG } from '../components/dictionary/shadows'
import { WritingPracticeModal } from '../components/WritingPracticeModal'
import { TourTarget } from '../components/tour/targets'
import {
  appearsIn,
  buildDeckIndex,
  entryStateFor,
  isInDeck,
  radicalFor,
  relatedCharacters,
  sentencesForWord,
  strokeCountFor,
  wordsContaining,
  wordsWith,
} from '../lib/dictionary'
import { tapHaptic } from '../lib/haptics'
import { allSenses, shortGloss } from '../lib/definitions'
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
  const inTab = useInDictionaryTab()
  const {
    wordBank,
    settings,
    deck,
    newlyAddedWordIds,
    addToReviewDeck,
    getWord,
    pushRecentSearch,
    favoriteWordIds,
    toggleFavorite,
    removeFromReviewDeck,
  } = useApp()

  const [watching, setWatching] = useState(false)
  const [practising, setPractising] = useState(false)
  /** Which half of "Appears in" is open, if either. */
  const [appearsInList, setAppearsIn] = useState<'words' | 'sentences' | null>(null)
  /** Whether "Remove from My Words" has been armed — see `RemoveFromDeckButton`. */
  const [confirmRemove, setConfirmRemove] = useState(false)

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
    () => (word ? appearsIn(wordBank, form, script, word) : { words: 0, sentences: 0 }),
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
    () => (appearsInList === 'sentences' && word ? sentencesForWord(wordBank, word, script) : []),
    [appearsInList, wordBank, word, form, script],
  )

  const deckIndex = useMemo(() => buildDeckIndex(deck, newlyAddedWordIds), [deck, newlyAddedWordIds])

  /* The Explore sheet's longer lists: five related words, five example sentences. */
  const relatedLong = useMemo(
    () => (related.term ? wordsContaining(wordBank, related.term, script, 5) : []),
    [wordBank, related.term, script],
  )
  const exampleHits = useMemo(
    () => (word ? sentencesForWord(wordBank, word, script, 5) : []),
    [wordBank, word, form, script],
  )

  if (!word) {
    return (
      <DetailShell title="Word">
        <DetailCard>
          <Text className="font-sans text-[16px] text-dict-body">
            This word is no longer in the dictionary. It may have been renamed or removed the last time the word
            list was updated.
          </Text>
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

  const facts: HeroFact[] = [
    ...(characters.length > 1 ? [{ text: `${characters.length} characters` }] : []),
    ...(strokeTotal !== null ? [{ text: `${strokeTotal} strokes` }] : []),
    // Tier-2 words carry a sentinel level rather than a graded one — see HskBadge.
    word.hskLevel < LOOKUP_HSK_LEVEL ? { text: `HSK ${word.hskLevel}`, green: true } : { text: 'Rare' },
  ]

  const openCharacter = (character: string) => {
    tapHaptic()
    openCharacterDetail(character, inTab)
  }

  const openWord = (next: VocabWord) => {
    tapHaptic()
    pushRecentSearch(next.id)
    openWordDetail(next.id, inTab)
  }

  const single = characters.length === 1
  const senses = allSenses(word)
  const hints = [
    ...(word.example || counts.sentences > 0 ? ['Examples'] : []),
    single ? 'Radical' : 'Characters',
    ...(related.words.length > 0 ? ['Related words'] : []),
    ...(senses.length > 1 ? ['More meanings'] : []),
  ].slice(0, 3)

  const ownRadical = radicals[0]?.info ?? null
  const lookalikes = single ? lookalikesFor(form, wordBank, script) : []
  const rank = frequencyRank(word)
  const tabs = buildExploreTabs({
    glyph: form,
    entry: word,
    senses,
    script,
    /* A one-character word: characters that look like it (大 → 太 犬 天). A
       longer word: its own characters. */
    overviewCharacters: single
      ? { title: 'Related characters', characters: lookalikes.slice(0, 3) }
      : { title: 'Characters in this word', characters: [...new Set(characters)] },
    relatedCharacters: single ? lookalikes : [...new Set(characters)],
    relatedCharactersTitle: single ? 'Related characters' : 'Characters in this word',
    containingTerm: related.term,
    containingWords: related.words,
    containingTotal: relatedTotal,
    relatedWords: relatedLong,
    sentences: exampleHits,
    counts,
    stats: [
      ...(strokeTotal !== null ? [{ label: 'Strokes', value: String(strokeTotal) }] : []),
      ...(!single ? [{ label: 'Characters', value: String(characters.length) }] : []),
      ...(single && ownRadical
        ? [{ label: 'Kangxi radical', value: `${ownRadical.radical.number} (${ownRadical.radical.character} · ${ownRadical.radical.meaning})` }]
        : []),
      { label: 'HSK level', value: word.hskLevel < LOOKUP_HSK_LEVEL ? `HSK ${word.hskLevel}` : 'Rare' },
      ...(rank !== null ? [{ label: 'Frequency', value: frequencyLabel(rank) }] : []),
    ],
    isAdded: (id) => isInDeck(id, deckIndex),
    onAdd: addToReviewDeck,
    openWord,
    openCharacter,
    // The tab route, not the standalone `/dictionary` — that one sits outside the tab group and would drop the nav bar.
    viewAllWords: () => router.push(`/dictionary-tab?q=${encodeURIComponent(related.term)}`),
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
    /* Opened from My Words (the standalone route), the page is also where a word leaves it. */
    overviewFooter:
      !inTab && isInDeck(word.id, deckIndex) ? (
        <View style={{ paddingVertical: 8 }}>
          <RemoveFromDeckButton
            armed={confirmRemove}
            onArm={() => setConfirmRemove(true)}
            onCancel={() => setConfirmRemove(false)}
            onConfirm={() => {
              removeFromReviewDeck([word.id])
              if (router.canGoBack()) router.back()
              else router.replace('/my-words')
            }}
          />
        </View>
      ) : undefined,
  })

  const sheetHeader = (
    <SheetHeader
      glyph={form}
      reading={displayPinyin(word, settings.phoneticScript)}
      meanings={senses.slice(0, 3)}
      facts={[
        ...(strokeTotal !== null ? [`${strokeTotal} strokes`] : []),
        word.hskLevel < LOOKUP_HSK_LEVEL ? `HSK ${word.hskLevel}` : 'Rare',
      ]}
    />
  )

  return (
    <DetailSheetShell
      title="Word"
      sheetLabel="Explore this word"
      sheetHints={hints}
      sheetHeader={sheetHeader}
      tabs={tabs}
      hero={(availableHeight) => (
        /* `word-hero` and `word-save` are where Shifu's word-card guide points (`lib/screenTours.ts`). */
        <TourTarget id="word-hero" radius={20}>
          <DetailHero
            glyph={form}
            reading={displayPinyin(word, settings.phoneticScript)}
            meaning={shortGloss(word)}
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
            save={
              <TourTarget id="word-save" radius={16}>
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                  <DeckStateButton state={entryStateFor(word.id, deckIndex)} onAdd={() => addToReviewDeck(word.id)} />
                  <FavoriteButton favorite={favoriteWordIds.includes(word.id)} onToggle={() => toggleFavorite(word.id)} />
                </View>
              </TourTarget>
            }
          />
        </TourTarget>
      )}
    >
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
    </DetailSheetShell>
  )
}
