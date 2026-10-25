import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import {
  BookOpenCheck,
  ChartColumn,
  ChartPie,
  Diamond,
  Feather,
  MessageSquareQuote,
  PenLine,
  PenTool,
  Quote,
  ScrollText,
  Shapes,
  Sprout,
} from 'lucide-react-native'
import {
  AppearsInTiles,
  CardHeader,
  CharacterInfoRow,
  ExampleSheetCard,
  InfoRows,
  MeaningSheetCard,
  PracticeSheetCard,
  SentenceBlock,
  SheetCard,
  StrokeOrderSheetCard,
  ViewAllLink,
  WidePillButton,
  WordRow,
} from './ExploreCards'
import { sheetColors } from './sheetTokens'
import type { SheetTab } from './InfoSheet'
import type { SentenceHit } from '../../lib/dictionary'
import { displayExample } from '../../lib/hanzi'
import type { ScriptMode, VocabWord } from '../../types'

/*
 * The four tabs of the detail pages' Explore sheet — Overview, Examples,
 * Related, Stats — shared by the word and character pages. Every number shown
 * is counted from the bundled data; a fact the data doesn't hold is left out
 * rather than filled in.
 */

export interface ExploreData {
  /** The word or character, in the learner's script. */
  glyph: string
  /** Its dictionary entry, if it has one (a bare character may not). */
  entry?: VocabWord
  senses: string[]
  script: ScriptMode
  /**
   * The overview's character card: look-alikes of a single character (大 → 太
   * 犬 天), or a word's own characters. Hidden when empty.
   */
  overviewCharacters: { title: string; characters: string[] }
  /** The Related tab's longer list: look-alikes, or the word's characters. */
  relatedCharacters: string[]
  relatedCharactersTitle: string
  /** "Words containing": the term, a few rows, and how many there are in all. */
  containingTerm: string
  containingWords: VocabWord[]
  containingTotal: number
  /** A longer list for the Related tab. */
  relatedWords: VocabWord[]
  sentences: SentenceHit[]
  counts: { words: number; sentences: number }
  stats: { label: string; value: string }[]
  isAdded: (wordId: string) => boolean
  onAdd: (wordId: string) => void
  openWord: (word: VocabWord) => void
  openCharacter: (character: string) => void
  /** Searches the dictionary for everything containing the term. */
  viewAllWords: () => void
  openWordsList: () => void
  openSentencesList: () => void
  onWatch: () => void
  onPractice: () => void
  /** Anything that belongs at the very end of the overview (Remove from My Words). */
  overviewFooter?: ReactNode
}

function CharacterRows({ characters, onOpen }: { characters: string[]; onOpen: (c: string) => void }) {
  return (
    <View style={{ marginTop: 6 }}>
      {characters.map((character, i) => (
        <CharacterInfoRow key={character} first={i === 0} character={character} onOpen={() => onOpen(character)} />
      ))}
    </View>
  )
}

function WordRows({ d, words }: { d: ExploreData; words: VocabWord[] }) {
  return (
    <View style={{ marginTop: 6 }}>
      {words.map((w, i) => (
        <WordRow
          key={w.id}
          first={i === 0}
          word={w}
          added={d.isAdded(w.id)}
          onOpen={() => d.openWord(w)}
          onAdd={() => d.onAdd(w.id)}
        />
      ))}
    </View>
  )
}

function Empty({ children }: { children: string }) {
  return (
    <Text style={{ marginTop: 10, fontFamily: 'Nunito', fontSize: 14, lineHeight: 20, color: sheetColors.muted }}>
      {children}
    </Text>
  )
}

/** The headline example: the entry's own sentence, else the first one the corpus has. */
function leadExample(d: ExploreData) {
  if (d.entry?.example) {
    return { sentence: displayExample(d.entry, d.script), translation: d.entry.example.translation }
  }
  const hit = d.sentences[0]
  return hit ? { sentence: displayExample(hit.word, d.script), translation: hit.example.translation } : null
}

export function buildExploreTabs(d: ExploreData): SheetTab[] {
  const overview = () => {
    const lead = leadExample(d)
    return (
      <>
        {d.senses.length > 0 && <MeaningSheetCard senses={d.senses} />}
        {lead && (
          <ExampleSheetCard
            icon={Quote}
            sentence={lead.sentence}
            term={d.glyph}
            translation={lead.translation}
            onOpenWord={d.openWord}
          />
        )}
        {d.overviewCharacters.characters.length > 0 && (
          <SheetCard>
            <CardHeader kind="characters" icon={Feather} title={d.overviewCharacters.title} />
            <CharacterRows characters={d.overviewCharacters.characters} onOpen={d.openCharacter} />
          </SheetCard>
        )}
        <SheetCard>
          <CardHeader
            kind="words"
            icon={Sprout}
            title="Words containing"
            titleExtra={<Text style={{ fontSize: 18, lineHeight: 22, color: sheetColors.greenDark }}>{d.containingTerm}</Text>}
          />
          {d.containingWords.length === 0 ? (
            <Empty>{`No other word in the dictionary is built from ${d.containingTerm}.`}</Empty>
          ) : (
            <WordRows d={d} words={d.containingWords} />
          )}
          {d.containingTotal > d.containingWords.length && (
            <View style={{ alignItems: 'center', marginTop: 4 }}>
              <ViewAllLink label={`View all ${d.containingTotal} words`} onPress={d.viewAllWords} />
            </View>
          )}
        </SheetCard>
        <AppearsInTiles
          icon={ScrollText}
          words={d.counts.words}
          sentences={d.counts.sentences}
          onOpenWords={d.openWordsList}
          onOpenSentences={d.openSentencesList}
        />
        {d.overviewFooter}
      </>
    )
  }

  const examples = () => (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, paddingHorizontal: 2 }}>
        <View style={{ flex: 1 }}>
          <CardHeader
            kind="example"
            icon={Quote}
            title="Example sentences"
            right={
              <Text style={{ fontFamily: 'Nunito', fontSize: 12, color: sheetColors.muted }}>Tap a word to look it up</Text>
            }
          />
        </View>
      </View>
      {d.sentences.length === 0 ? (
        <SheetCard>
          <Empty>{`The dictionary has no example sentences using ${d.glyph} yet.`}</Empty>
        </SheetCard>
      ) : (
        d.sentences.map((hit) => (
          <SheetCard key={hit.word.id}>
            <SentenceBlock
              sentence={displayExample(hit.word, d.script)}
              term={d.glyph}
              translation={hit.example.translation}
              onOpenWord={d.openWord}
            />
          </SheetCard>
        ))
      )}
      {d.counts.sentences > d.sentences.length && (
        <WidePillButton label={`View all ${d.counts.sentences} example sentences`} onPress={d.openSentencesList} />
      )}
    </>
  )

  const related = () => (
    <>
      <SheetCard>
        <CardHeader
          kind="related"
          icon={Shapes}
          title="Related words"
          right={d.containingTotal > d.relatedWords.length ? <ViewAllLink onPress={d.viewAllWords} /> : undefined}
        />
        {d.relatedWords.length === 0 ? (
          <Empty>{`No other word in the dictionary is built from ${d.containingTerm}.`}</Empty>
        ) : (
          <WordRows d={d} words={d.relatedWords} />
        )}
      </SheetCard>
      {d.relatedCharacters.length > 0 && (
        <SheetCard>
          <CardHeader kind="characters" icon={Feather} title={d.relatedCharactersTitle} />
          <CharacterRows characters={d.relatedCharacters} onOpen={d.openCharacter} />
        </SheetCard>
      )}
    </>
  )

  const stats = () => (
    <>
      <SheetCard>
        <CardHeader kind="info" icon={ChartPie} title={[...d.glyph].length === 1 ? 'Character information' : 'Word information'} />
        <InfoRows rows={d.stats} />
      </SheetCard>
      <StrokeOrderSheetCard glyph={d.glyph} icon={PenTool} onWatch={d.onWatch} />
      <PracticeSheetCard glyph={d.glyph} icon={PenLine} onPractice={d.onPractice} />
    </>
  )

  return [
    { key: 'overview', label: 'Overview', icon: BookOpenCheck, render: overview },
    { key: 'examples', label: 'Examples', icon: MessageSquareQuote, render: examples },
    { key: 'related', label: 'Related', icon: Diamond, render: related },
    { key: 'stats', label: 'Stats', icon: ChartColumn, render: stats },
  ]
}
