import { Fragment } from 'react'
import { View, Text } from 'react-native'
import { PlayCircle, PencilLine, ChevronRight, BookOpen, FileText, Quote } from 'lucide-react-native'
import { PressScale } from './PressScale'
import { ReadingSentence } from './ReadingSentence'
import { DetailCard, CardTitle } from './DetailShell'
import { AddCircleButton, ICON_GREEN, ICON_STROKE, SpeakChip } from './DictionaryControls'
import { TourPulse } from '../tour/TourPulse'
import { allSenses, shortGloss } from '../../lib/definitions'
import { tapHaptic } from '../../lib/haptics'
import { displayWord, hanziFont } from '../../lib/hanzi'
import { useApp } from '../../context/AppContext'
import type { RadicalInfo } from '../../lib/dictionary'
import type { KangxiRadical, VocabWord } from '../../types'

/** One cell of the hero card's fact strip. `hanzi` renders its value in the serif face. */
export interface HeroStat {
  label: string
  value: string
  hanzi?: boolean
  green?: boolean
}

/**
 * The top card: the glyph itself, how to say it, the facts worth knowing at a
 * glance, and the two things you can do with it.
 *
 * Both actions are offered for every entry. They used to be hidden for
 * characters missing from the bundled `hanziData.json`, which was too cautious:
 * `HanziStage` falls back to the hanzi-writer CDN for anything not bundled, so
 * hiding the buttons denied stroke practice on words that can perfectly well
 * animate. For the rare glyph with no data anywhere, the stage says so — an
 * honest empty state beats a silently missing feature.
 */
export function HeroCard({
  glyph,
  pinyin,
  stats,
  onWatch,
  onPractice,
}: {
  glyph: string
  pinyin: string
  stats: HeroStat[]
  onWatch: () => void
  onPractice: () => void
}) {
  // A single character can carry the full display size; a phrase has to come down
  // or it wraps out of the card.
  const length = [...glyph].length
  const size = length <= 1 ? 128 : length === 2 ? 88 : length === 3 ? 66 : 52
  const face = hanziFont(useApp().settings.script)

  return (
    <DetailCard>
      <View className="items-center pb-2 pt-3">
        <Text
          style={{ fontSize: size, lineHeight: size * 1.18 }}
          className={`${face} text-dict-heading`}
        >
          {glyph}
        </Text>
        <View className="mt-3 flex-row items-center gap-3">
          <Text className="font-dict-semibold text-[24px] leading-[30px] text-dict-green">{pinyin}</Text>
          <SpeakChip text={glyph} size={36} />
        </View>
      </View>

      {stats.length > 0 && (
        <View className="mt-4 flex-row items-stretch rounded-dict-sm border border-dict-line">
          {stats.map((stat, i) => (
            <Fragment key={stat.label}>
              {i > 0 && <View className="w-px bg-dict-line" />}
              <View className="flex-1 items-center px-2 py-3">
                <Text className="font-inter text-[12px] leading-[16px] text-dict-muted">{stat.label}</Text>
                <Text
                  className={`mt-0.5 text-[17px] leading-[23px] ${
                    stat.hanzi ? face : 'font-dict-semibold'
                  } ${stat.green ? 'text-dict-green-dark' : 'text-dict-heading'}`}
                >
                  {stat.value}
                </Text>
              </View>
            </Fragment>
          ))}
        </View>
      )}

      {/*
        Two halves of one row, so both labels have to fit half a phone.
        "Watch stroke order" did not: at 16px beside a 20px icon it needs about
        158pt against the ~125pt a 390pt screen leaves inside the button, so the
        tail ran under the edge. It is trimmed to the words that carry the
        meaning and set a step smaller, with `numberOfLines` so any future
        overrun shows as an ellipsis rather than silently disappearing —
        `adjustsFontSizeToFit` is iOS-only and would have fixed nothing on
        Android. The full phrase stays as the accessibility label.
      */}
      <View className="mt-4 flex-row gap-3">
          <TourPulse target="word-watch" radius={14} style={{ flex: 1 }}>
            <PressScale
              onPress={onWatch}
              outerClassName="flex-1"
              className="flex-row items-center justify-center gap-1.5 rounded-dict-sm bg-dict-green-dark py-4"
              accessibilityLabel="Watch stroke order"
            >
              <PlayCircle size={18} color="#ffffff" strokeWidth={ICON_STROKE} />
              <Text numberOfLines={1} className="font-dict-bold text-[15px] text-white">
                Stroke order
              </Text>
            </PressScale>
          </TourPulse>
          <TourPulse target="word-practice" radius={14} style={{ flex: 1 }}>
            <PressScale
              onPress={onPractice}
              outerClassName="flex-1"
              className="flex-row items-center justify-center gap-1.5 rounded-dict-sm border border-dict-green bg-dict-card py-4"
              accessibilityLabel="Practice writing"
            >
              <PencilLine size={18} color={ICON_GREEN} strokeWidth={ICON_STROKE} />
              <Text numberOfLines={1} className="font-dict-bold text-[15px] text-dict-green-dark">
                Practice
              </Text>
            </PressScale>
          </TourPulse>
      </View>
    </DetailCard>
  )
}

/**
 * "Meaning" — the one clearest sense, with the rest listed under it.
 *
 * The other senses used to be dumped back as CC-CEDICT's raw semicolon run,
 * which put the thing the headline gloss was chosen to avoid — seven meanings in
 * one breath — directly beneath the headline gloss. One per line is the same
 * information at a glance instead of in a paragraph.
 */
export function MeaningCard({ word }: { word: VocabWord }) {
  const [gloss, ...others] = allSenses(word)

  return (
    <DetailCard>
      <CardTitle>Meaning</CardTitle>
      <Text className="mt-2 font-dict-sans text-[17px] leading-[24px] text-dict-body">{gloss ?? word.definition}</Text>

      {others.length > 0 && (
        <View className="mt-3 border-t border-dict-line pt-3">
          <Text className="font-inter text-[13px] leading-[17px] text-dict-muted">
            Also means {others.length === 1 ? '' : `(${others.length})`}
          </Text>
          <View className="mt-1.5 gap-1">
            {others.map((sense, i) => (
              <View key={`${sense}-${i}`} className="flex-row gap-2">
                <Text className="font-inter text-[14px] leading-[21px] text-dict-muted">·</Text>
                <Text className="flex-1 font-inter text-[14px] leading-[21px] text-dict-muted">{sense}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </DetailCard>
  )
}

/**
 * Rows of words built from a character, each addable in place.
 *
 * Always rendered, even empty. A missing section reads as a bug — "why does this
 * entry have fewer parts than the last one?" — where an empty one answers the
 * question the section poses. The empty case is genuinely rare: it takes a
 * character that no other word in a 20,000-entry bank uses.
 */
export function WordsContainingCard({
  character,
  words,
  isAdded,
  onOpen,
  onAdd,
  onViewAll,
  totalCount,
}: {
  character: string
  words: VocabWord[]
  isAdded: (wordId: string) => boolean
  onOpen: (word: VocabWord) => void
  onAdd: (wordId: string) => void
  onViewAll: () => void
  totalCount: number
}) {
  const script = useApp().settings.script
  const face = hanziFont(script)
  return (
    <DetailCard>
      <View className="flex-row items-center gap-1.5">
        <CardTitle>Words containing</CardTitle>
        <Text className={`${face} text-[19px] leading-[25px] text-dict-green`}>{character}</Text>
      </View>

      {words.length === 0 && (
        <Text className="mt-2 font-dict-sans text-[15px] leading-[21px] text-dict-body">
          No other word in the dictionary is built from {character}.
        </Text>
      )}

      <View className="mt-2">
        {words.map((w, i) => (
          <View
            key={w.id}
            className={`flex-row items-center gap-3 py-3 ${i > 0 ? 'border-t border-dict-line' : ''}`}
          >
            <PressScale
              onPress={() => onOpen(w)}
              outerClassName="flex-1"
              className="flex-row items-center gap-3"
              accessibilityLabel={`Open ${displayWord(w, script)}`}
            >
              <Text className={`${face} text-[30px] leading-[38px] text-dict-heading`}>{displayWord(w, script)}</Text>
              <View className="flex-1">
                <Text className="font-dict-semibold text-[15px] leading-[20px] text-dict-green">{w.pinyin}</Text>
                <Text numberOfLines={1} className="font-dict-sans text-[14px] leading-[19px] text-dict-muted">
                  {shortGloss(w)}
                </Text>
              </View>
            </PressScale>
            <AddCircleButton added={isAdded(w.id)} onAdd={() => onAdd(w.id)} />
          </View>
        ))}
      </View>

      {totalCount > words.length && (
        <PressScale
          onPress={() => {
            tapHaptic()
            onViewAll()
          }}
          outerClassName="w-full"
          className="mt-1 flex-row items-center justify-between border-t border-dict-line pt-3"
          accessibilityLabel={`View all words containing ${character}`}
        >
          <Text className="font-dict-semibold text-[15px] text-dict-green">
            View all {totalCount} words containing {character}
          </Text>
          <ChevronRight size={18} color={ICON_GREEN} strokeWidth={ICON_STROKE} />
        </PressScale>
      )}
    </DetailCard>
  )
}

/**
 * The example sentence, word by word.
 *
 * Every word the bank knows is its own tap target, so an unfamiliar word in the
 * sentence is a lookup rather than a dead end — the same move the story reader
 * offers, which is where a learner will already have met it. The word being
 * viewed is tinted instead of tappable: it's the page you're on.
 *
 * Laid out as a wrapping row of boxes rather than one `Text` with nested
 * pressables, so each word gets a real hit target instead of a hairline of
 * baseline.
 */
export function ExampleCard({
  sentence,
  term,
  translation,
  onOpenWord,
}: {
  sentence: string
  term: string
  translation: string
  onOpenWord: (word: VocabWord) => void
}) {
  return (
    <DetailCard>
      <View className="flex-row items-center justify-between gap-3">
        <CardTitle>Example</CardTitle>
        <Text className="font-inter text-[12px] leading-[16px] text-dict-muted">Tap a word to look it up</Text>
      </View>

      <View className="mt-3 flex-row gap-2">
        <View className="pt-1.5">
          <Quote size={16} color={ICON_GREEN} strokeWidth={ICON_STROKE} />
        </View>
        <View className="flex-1">
          <ReadingSentence text={sentence} term={term} onPressWord={onOpenWord} />
        </View>
      </View>

      {/*
       * No sentence-level pinyin line any more. `ReadingSentence` puts a reading
       * over every word it knows, in whichever script the learner has chosen —
       * a second romanised copy of the whole sentence underneath would repeat it
       * in the wrong script for half the audience.
       */}
      <Text className="mt-2 font-inter text-[14px] leading-[20px] text-dict-body">{translation}</Text>
    </DetailCard>
  )
}

/** "Kangxi radical 85 · also written 氵" — the identity line under the radical's name. */
function radicalSubtitle(radical: KangxiRadical): string {
  const variants = radical.variants ?? []
  const written = variants.length > 0 ? ` · also written ${variants.join(' ')}` : ''
  return `Kangxi radical ${radical.number}${written}`
}

/**
 * The radical a character is filed under.
 *
 * Always rendered, because every character has one — `characterRadicals.json`
 * files the whole word bank. Three shapes, in descending order of what the app
 * knows: a radical the Radicals screen teaches (name plus its explanation), one
 * it only names, and the character that *is* a radical, which is filed under
 * itself and gets told so rather than shown a circular lookup.
 *
 * There is still no component-decomposition dataset here, so this names the
 * radical and shows its neighbours — it doesn't draw a breakdown diagram.
 */
export function RadicalCard({
  character,
  info,
  related,
  onOpenCharacter,
}: {
  character: string
  info: RadicalInfo | null
  related: string[]
  onOpenCharacter: (character: string) => void
}) {
  if (!info) {
    return (
      <DetailCard>
        <CardTitle>Radical</CardTitle>
        <Text className="mt-2 font-dict-sans text-[15px] leading-[21px] text-dict-body">
          {character} sits outside the bundled dictionary, so we can't say which radical it's filed under.
        </Text>
      </DetailCard>
    )
  }

  const { radical, curated, isSelf } = info
  const face = hanziFont(useApp().settings.script)

  return (
    <DetailCard>
      <CardTitle>Radical</CardTitle>

      <View className="mt-3 flex-row items-center gap-4">
        {/*
          Traditional regardless of the learner's script, unlike everything else
          on these cards: a Kangxi radical is a fixed reference glyph from
          KANGXI_RADICALS, not a word out of the bank that has two forms.
        */}
        <View className="h-[76px] w-[76px] items-center justify-center rounded-full bg-dict-green-pale">
          <Text className="font-hanzi-tc-regular text-[36px] leading-[44px] text-dict-heading">{radical.character}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-dict-semibold text-[17px] leading-[22px] text-dict-heading">
            {radical.pinyin} · {radical.meaning}
          </Text>
          <Text className="mt-0.5 font-inter text-[13px] leading-[18px] text-dict-muted">
            {radicalSubtitle(radical)}
          </Text>
          {isSelf && (
            <Text className="mt-1.5 font-dict-sans text-[15px] leading-[21px] text-dict-body">
              {character} is a radical in its own right — one of the 214 parts every other character is filed under,
              rather than a character filed under one.
            </Text>
          )}
          {curated && (
            <Text className="mt-1.5 font-dict-sans text-[15px] leading-[21px] text-dict-body">
              {curated.explanation}
            </Text>
          )}
        </View>
      </View>

      {related.length > 0 && (
        <View className="mt-4 border-t border-dict-line pt-3">
          <Text className="font-inter text-[13px] leading-[17px] text-dict-muted">
            {isSelf ? 'Characters filed under it' : 'Other characters with this radical'}
          </Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {related.map((char) => (
              <PressScale
                key={char}
                onPress={() => onOpenCharacter(char)}
                className="h-11 w-11 items-center justify-center rounded-dict-sm bg-dict-page"
                accessibilityLabel={`Open ${char}`}
              >
                <Text className={`${face} text-[22px] leading-[28px] text-dict-heading`}>{char}</Text>
              </PressScale>
            ))}
          </View>
        </View>
      )}
    </DetailCard>
  )
}

/** "12 strokes · Kangxi radical 85", dropping whatever isn't known. */
function characterSubtitle(character: string, info: RadicalInfo | null, strokes: number | null): string {
  const parts: string[] = []
  if (strokes !== null) parts.push(`${strokes} strokes`)
  if (info) parts.push(info.isSelf ? `${character} is itself a radical` : `Kangxi radical ${info.radical.number}`)
  return parts.join(' · ')
}

/**
 * A multi-character word's characters, each with the radical it's filed under.
 *
 * A word doesn't have a radical — its characters do — so this is a summary that
 * drills into the per-character screen rather than a copy of `RadicalCard`.
 * Single-character words skip it and get the full card instead.
 */
export function WordRadicalsCard({
  characters,
  onOpenCharacter,
}: {
  characters: { character: string; info: RadicalInfo | null; strokes: number | null }[]
  onOpenCharacter: (character: string) => void
}) {
  const face = hanziFont(useApp().settings.script)
  return (
    <DetailCard>
      <CardTitle>Characters and radicals</CardTitle>

      <View className="mt-1">
        {characters.map(({ character, info, strokes }, i) => (
          <PressScale
            key={`${character}-${i}`}
            onPress={() => onOpenCharacter(character)}
            outerClassName="w-full"
            className={`flex-row items-center gap-3 py-3 ${i > 0 ? 'border-t border-dict-line' : ''}`}
            accessibilityLabel={`Open character ${character}`}
          >
            <Text className={`${face} text-[30px] leading-[38px] text-dict-heading`}>{character}</Text>
            {info ? (
              <>
                <View className="h-11 w-11 items-center justify-center rounded-full bg-dict-green-pale">
                  <Text className="font-hanzi-tc-regular text-[22px] leading-[28px] text-dict-heading">
                    {info.radical.character}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-dict-semibold text-[15px] leading-[20px] text-dict-heading">
                    {info.radical.pinyin} · {info.radical.meaning}
                  </Text>
                  <Text numberOfLines={1} className="font-inter text-[13px] leading-[17px] text-dict-muted">
                    {characterSubtitle(character, info, strokes)}
                  </Text>
                </View>
              </>
            ) : (
              <View className="flex-1">
                <Text className="font-dict-sans text-[15px] leading-[20px] text-dict-muted">
                  Radical unknown — this character isn't in the bundled dictionary
                </Text>
                {strokes !== null && (
                  <Text className="font-inter text-[13px] leading-[17px] text-dict-muted">{strokes} strokes</Text>
                )}
              </View>
            )}
            <ChevronRight size={18} color={ICON_GREEN} strokeWidth={ICON_STROKE} />
          </PressScale>
        ))}
      </View>
    </DetailCard>
  )
}

/** One half of "Appears in": a counted fact you can open. */
function AppearsInButton({
  icon: Icon,
  label,
  count,
  onPress,
}: {
  icon: typeof BookOpen
  label: string
  count: number
  onPress: () => void
}) {
  // Nothing to list, so nothing to open. Still shown — a zero is an answer, and
  // hiding the half would leave the card lopsided.
  const empty = count === 0

  return (
    <PressScale
      onPress={() => {
        tapHaptic()
        onPress()
      }}
      disabled={empty}
      outerClassName="flex-1"
      className="flex-row items-center gap-3 rounded-dict-sm bg-dict-page px-3 py-3"
      accessibilityLabel={empty ? `${label}: none` : `See all ${count} ${label.toLowerCase()}`}
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-dict-green-pale">
        <Icon size={20} color={ICON_GREEN} strokeWidth={ICON_STROKE} />
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="font-dict-sans text-[14px] leading-[18px] text-dict-body">
          {label}
        </Text>
        <View className="flex-row items-center gap-1">
          <Text className="font-dict-bold text-[18px] leading-[24px] text-dict-green-dark">{count}</Text>
          {!empty && <ChevronRight size={15} color={ICON_GREEN} strokeWidth={ICON_STROKE} />}
        </View>
      </View>
    </PressScale>
  )
}

/**
 * "Appears in" — two counted facts, both read off the bundled corpus, and both
 * a way in to what was counted.
 *
 * The counts come from `appearsIn`, which applies exactly the tests the two
 * modals list by, so the number on a button is the number of rows behind it.
 */
export function AppearsInCard({
  words,
  sentences,
  onOpenWords,
  onOpenSentences,
}: {
  words: number
  sentences: number
  onOpenWords: () => void
  onOpenSentences: () => void
}) {
  return (
    <DetailCard>
      <CardTitle>Appears in</CardTitle>
      <View className="mt-3 flex-row items-stretch gap-2">
        <AppearsInButton icon={BookOpen} label="Common words" count={words} onPress={onOpenWords} />
        <AppearsInButton icon={FileText} label="Example sentences" count={sentences} onPress={onOpenSentences} />
      </View>
    </DetailCard>
  )
}
