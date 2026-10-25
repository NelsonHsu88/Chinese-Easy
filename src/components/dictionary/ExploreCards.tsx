import type { ReactNode } from 'react'
import { Image, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { ChevronRight, FileText, BookOpen, Play, PencilLine, type LucideIcon } from 'lucide-react-native'
import { PressScale } from './PressScale'
import { DICT_BG } from './shadows'
import { LiftedFace, PressableScale, RaisedButton } from '../dashboard/parts'
import { ReadingSentence } from './ReadingSentence'
import { AddCircleButton, SpeakChip, ICON_STROKE } from './DictionaryControls'
import { sheetBadges, sheetCardShadow, sheetColors as C, type SheetBadge } from './sheetTokens'
import { displayPinyin, displayWord, hanziFont } from '../../lib/hanzi'
import { shortGloss } from '../../lib/definitions'
import { readingForText } from '../../lib/characterReading'
import { radicalFor, strokeCountFor } from '../../lib/dictionary'
import { characterEntries } from '../../lib/lookalikes'
import { tapHaptic } from '../../lib/haptics'
import { useApp } from '../../context/AppContext'
import type { VocabWord } from '../../types'

/*
 * The cards inside the detail pages' "Explore" sheet (SS1021 Writing Cards):
 * white rounded cards on the sheet's paper, each headed by a coloured round
 * badge. Plain style objects throughout — see `DetailHero` for why NativeWind
 * is kept off controls on these pages.
 */

const SPRIG = { source: require('../../assets/images/onboarding/sakura-sprig.png'), ratio: 320 / 151 }

const T = {
  title: { fontFamily: 'NunitoBold', fontSize: 17, lineHeight: 22, color: C.heading },
  body: { fontFamily: 'Nunito', fontSize: 15, lineHeight: 21, color: C.body },
  rowTitle: { fontFamily: 'NunitoSemiBold', fontSize: 15, lineHeight: 20, color: C.heading },
  small: { fontFamily: 'Nunito', fontSize: 13, lineHeight: 18, color: C.muted },
  link: { fontFamily: 'NunitoSemiBold', fontSize: 14, lineHeight: 19, color: C.greenDark },
} as const

export function SheetCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        {
          backgroundColor: C.card,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: C.cardBorder,
          padding: 16,
          marginBottom: 14,
        },
        sheetCardShadow,
        style,
      ]}
    >
      {children}
    </View>
  )
}

export function Badge({ kind, icon: Icon, size = 40 }: { kind: SheetBadge; icon: LucideIcon; size?: number }) {
  const { bg, icon } = sheetBadges[kind]
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={size * 0.48} color={icon} strokeWidth={ICON_STROKE} />
    </View>
  )
}

/** Badge, title, and whatever sits at the right end of the header. */
export function CardHeader({
  kind,
  icon,
  title,
  titleExtra,
  right,
}: {
  kind: SheetBadge
  icon: LucideIcon
  title: string
  titleExtra?: ReactNode
  right?: ReactNode
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Badge kind={kind} icon={icon} />
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <Text style={T.title} accessibilityRole="header">
          {title}
        </Text>
        {titleExtra}
      </View>
      {right}
    </View>
  )
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: C.line }} />
}

/** "View all ›" at the right end of a card header. */
export function ViewAllLink({ label = 'View all', onPress }: { label?: string; onPress: () => void }) {
  return (
    <PressScale
      onPress={() => {
        tapHaptic()
        onPress()
      }}
      innerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4 }}
      accessibilityLabel={label}
    >
      <Text style={T.link}>{label}</Text>
      <ChevronRight size={15} color={C.greenDark} strokeWidth={ICON_STROKE} />
    </PressScale>
  )
}

// --- Header ------------------------------------------------------------------

/** The compact word block at the top of the open sheet. */
export function SheetHeader({
  glyph,
  reading,
  meanings,
  facts,
}: {
  glyph: string
  reading: string
  meanings: string[]
  facts: string[]
}) {
  const face = hanziFont(useApp().settings.script)
  const length = Math.max(1, [...glyph].length)
  const size = length === 1 ? 60 : length === 2 ? 50 : length === 3 ? 42 : 34
  return (
    <View style={{ alignItems: 'center' }}>
      <Text
        numberOfLines={1}
        className={face}
        style={{ fontSize: size, lineHeight: Math.round(size * 1.2), color: C.heading, includeFontPadding: false }}
      >
        {glyph}
      </Text>
      <View style={{ marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {reading.length > 0 && (
          <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: 17, lineHeight: 22, color: C.heading, includeFontPadding: false }}>
            {reading}
          </Text>
        )}
        <SpeakChip text={glyph} size={30} />
      </View>
      {meanings.length > 0 && (
        <Text numberOfLines={1} style={[T.small, { marginTop: 4, fontSize: 14, color: C.body }]}>
          {meanings.join(' · ')}
        </Text>
      )}
      {facts.length > 0 && (
        <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
          {facts.map((fact) => (
            <View key={fact} style={{ backgroundColor: C.pill, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ fontFamily: 'NunitoSemiBold', fontSize: 13, lineHeight: 18, color: C.heading }}>{fact}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

// --- Overview ----------------------------------------------------------------

/** The headline sense, the others as a bullet run, a sprig of blossom in the corner. */
export function MeaningSheetCard({ senses }: { senses: string[] }) {
  const [gloss, ...others] = senses
  /* A single meaning gets a compact card: no reserved height, a smaller sprig
     that still fits inside it, and the text centred on the badge. */
  const compact = others.length === 0
  const sprigWidth = compact ? 112 : 150
  return (
    <SheetCard style={{ overflow: 'hidden', ...(compact ? null : { minHeight: 124 }) }}>
      <View pointerEvents="none" style={{ position: 'absolute', right: -12, bottom: compact ? -4 : -6 }}>
        <Image
          source={SPRIG.source}
          style={{ width: sprigWidth, height: sprigWidth / SPRIG.ratio, opacity: 0.9 }}
          resizeMode="contain"
        />
      </View>
      <View style={{ flexDirection: 'row', alignItems: compact ? 'center' : 'flex-start', gap: 12, paddingRight: compact ? 84 : 96 }}>
        <Badge kind="meaning" icon={BookOpen} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={T.title} accessibilityRole="header">
            Meaning
          </Text>
          <Text style={[T.body, { marginTop: 4 }]}>{gloss}</Text>
          {others.length > 0 && (
            <>
              <Text style={[T.small, { marginTop: 10 }]}>Also means</Text>
              <View style={{ marginTop: 2, flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 2 }}>
                {others.slice(0, 6).map((sense, i) => (
                  <Text key={`${sense}-${i}`} style={[T.small, { color: C.body, fontSize: 14 }]}>
                    •  {sense}
                  </Text>
                ))}
              </View>
            </>
          )}
        </View>
      </View>
    </SheetCard>
  )
}

/** One example sentence, word by word, with a play button. */
export function SentenceBlock({
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
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <View style={{ flex: 1 }}>
        <ReadingSentence text={sentence} term={term} onPressWord={onOpenWord} />
        <Text style={[T.body, { marginTop: 6, fontSize: 14 }]}>{translation}</Text>
      </View>
      <SpeakChip text={sentence} size={34} />
    </View>
  )
}

export function ExampleSheetCard(props: {
  icon: LucideIcon
  sentence: string
  term: string
  translation: string
  onOpenWord: (word: VocabWord) => void
}) {
  const { icon, ...sentence } = props
  return (
    <SheetCard>
      <CardHeader kind="example" icon={icon} title="Example" />
      <View style={{ marginTop: 12 }}>
        <SentenceBlock {...sentence} />
      </View>
    </SheetCard>
  )
}

/** A character with a line about it, opening its own page. */
export function CharacterRow({
  glyph,
  title,
  subtitle,
  onPress,
  first,
}: {
  glyph: string
  title: string
  subtitle: string
  onPress: () => void
  first?: boolean
}) {
  const face = hanziFont(useApp().settings.script)
  return (
    <>
      {!first && <Divider />}
      <PressScale
        onPress={() => {
          tapHaptic()
          onPress()
        }}
        scaleTo={0.98}
        innerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 }}
        accessibilityLabel={`Open character ${glyph}`}
      >
        <Text className={face} style={{ width: 40, textAlign: 'center', fontSize: 30, lineHeight: 38, color: C.heading }}>
          {glyph}
        </Text>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={T.rowTitle}>
            {title}
          </Text>
          <Text numberOfLines={1} style={T.small}>
            {subtitle}
          </Text>
        </View>
        <ChevronRight size={18} color={C.heading} strokeWidth={ICON_STROKE} />
      </PressScale>
    </>
  )
}

/**
 * A character's own reading and meaning, with its strokes and radical below:
 * "tiān · sky" over "4 strokes · radical 大 big". The reading follows the
 * learner's pinyin/zhuyin setting. (These rows used to print the *radical's*
 * reading as the title, so 天 read "dà · big".)
 */
export function CharacterInfoRow({ character, onOpen, first }: { character: string; onOpen: () => void; first?: boolean }) {
  const { settings, wordBank } = useApp()
  const entry = characterEntries(wordBank, settings.script).get(character)
  const reading = entry?.pinyin
    ? displayPinyin(entry, settings.phoneticScript)
    : readingForText(character, settings.phoneticScript)
  const title = [reading, entry ? shortGloss(entry) : ''].filter(Boolean).join(' · ') || character

  const strokes = strokeCountFor(character)
  const radical = radicalFor(character)
  const subtitle = [
    strokes !== null ? `${strokes} strokes` : '',
    radical ? (radical.isSelf ? 'itself a radical' : `radical ${radical.radical.character} ${radical.radical.meaning}`) : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return <CharacterRow glyph={character} title={title} subtitle={subtitle} onPress={onOpen} first={first} />
}

/** A word built from this one, addable in place. */
export function WordRow({
  word,
  added,
  onOpen,
  onAdd,
  first,
}: {
  word: VocabWord
  added: boolean
  onOpen: () => void
  onAdd: () => void
  first?: boolean
}) {
  const { script, phoneticScript } = useApp().settings
  const face = hanziFont(script)
  const form = displayWord(word, script)
  return (
    <>
      {!first && <Divider />}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 }}>
        <PressScale
          onPress={onOpen}
          scaleTo={0.98}
          outerStyle={{ flex: 1 }}
          innerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
          accessibilityLabel={`Open ${form}`}
        >
          <Text className={face} style={{ minWidth: 56, fontSize: 24, lineHeight: 32, color: C.heading }}>
            {form}
          </Text>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={[T.small, { color: C.body }]}>
              {displayPinyin(word, phoneticScript)}
            </Text>
            <Text numberOfLines={1} style={T.small}>
              {shortGloss(word)}
            </Text>
          </View>
        </PressScale>
        <AddCircleButton added={added} onAdd={onAdd} />
      </View>
    </>
  )
}

/** "Appears in": two counted facts, each opening the list it counted. */
export function AppearsInTiles({
  icon: Icon,
  words,
  sentences,
  onOpenWords,
  onOpenSentences,
}: {
  icon: LucideIcon
  words: number
  sentences: number
  onOpenWords: () => void
  onOpenSentences: () => void
}) {
  const tile = (label: string, count: number, onPress: () => void, tint: string, TileIcon: LucideIcon) => (
    <PressScale
      onPress={() => {
        tapHaptic()
        onPress()
      }}
      disabled={count === 0}
      outerStyle={{ flex: 1 }}
      innerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, backgroundColor: tint, padding: 12 }}
      accessibilityLabel={count === 0 ? `${label}: none` : `See all ${count} ${label.toLowerCase()}`}
    >
      <TileIcon size={22} color={C.heading} strokeWidth={1.6} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={2} style={[T.small, { fontSize: 12, lineHeight: 16 }]}>
          {label}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={{ fontFamily: 'NunitoBold', fontSize: 18, lineHeight: 24, color: C.greenDark }}>{count}</Text>
          {count > 0 && <ChevronRight size={14} color={C.greenDark} strokeWidth={ICON_STROKE} />}
        </View>
      </View>
    </PressScale>
  )
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, marginBottom: 10 }}>
        <Icon size={18} color={C.heading} strokeWidth={ICON_STROKE} />
        <Text style={[T.title, { fontSize: 15 }]}>Appears in</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {tile('Common words', words, onOpenWords, '#EEF4EA', BookOpen)}
        {tile('Example sentences', sentences, onOpenSentences, '#EAF0F8', FileText)}
      </View>
    </View>
  )
}

/** A wide soft-green pill: "View all 3 example sentences ›". */
export function WidePillButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <RaisedButton
      onPress={() => {
        tapHaptic()
        onPress()
      }}
      scaleTo={0.97}
      wrapperStyle={{ marginBottom: 14 }}
      height={48}
      fill={C.greenWash}
      shoulder={C.greenWashShoulder}
      accessibilityLabel={label}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }}>
        <Text style={[T.link, { fontSize: 15 }]}>{label}</Text>
        <ChevronRight size={18} color={C.greenDark} strokeWidth={ICON_STROKE} />
      </View>
    </RaisedButton>
  )
}

// --- Stats -------------------------------------------------------------------

export function InfoRows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <View style={{ marginTop: 8 }}>
      {rows.map((row, i) => (
        <View key={row.label}>
          {i > 0 && <Divider />}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, gap: 12 }}>
            <Text style={[T.body, { color: C.body }]}>{row.label}</Text>
            <Text style={[T.body, { color: C.heading, flexShrink: 1, textAlign: 'right' }]}>{row.value}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

/** The raised buttons' face height — the same 48 the flat pills had. */
const SHEET_BUTTON_HEIGHT = 48

const BUTTON_LABEL = { fontFamily: 'NunitoBold', fontSize: 16, lineHeight: 20 } as const

/*
 * Both Stats buttons are the Dashboard's `LiftedFace` — a face standing on a
 * darker shoulder that sinks flush onto it on press, the same 3D object as the
 * word page's Stroke order and Practice buttons. Watch is the filled one;
 * Practice is the outlined one, as in the hero row.
 */

export function StrokeOrderSheetCard({ glyph, icon, onWatch }: { glyph: string; icon: LucideIcon; onWatch: () => void }) {
  return (
    <SheetCard>
      <CardHeader kind="stroke" icon={icon} title="Stroke order" />
      <Text style={[T.small, { marginTop: 8, fontSize: 14, lineHeight: 20 }]}>
        Watch the stroke order animation and learn how to write {glyph} correctly.
      </Text>
      <View style={{ marginTop: 14 }}>
        <PressableScale onPress={onWatch} scaleTo={1} accessibilityLabel="Watch stroke order">
          <LiftedFace height={SHEET_BUTTON_HEIGHT} fill={DICT_BG.greenDark} shoulder={DICT_BG.greenDarkShoulder}>
            <Play size={16} color="#FFFFFF" fill="#FFFFFF" strokeWidth={ICON_STROKE} />
            <Text style={[BUTTON_LABEL, { color: '#FFFFFF' }]}>Watch stroke order</Text>
          </LiftedFace>
        </PressableScale>
      </View>
    </SheetCard>
  )
}

export function PracticeSheetCard({ glyph, icon, onPractice }: { glyph: string; icon: LucideIcon; onPractice: () => void }) {
  return (
    <SheetCard>
      <CardHeader kind="practice" icon={icon} title="Writing practice" />
      <Text style={[T.small, { marginTop: 8, fontSize: 14, lineHeight: 20 }]}>
        Practice writing {glyph} with guided stroke order and instant feedback.
      </Text>
      <View style={{ marginTop: 14 }}>
        <PressableScale onPress={onPractice} scaleTo={1} accessibilityLabel="Start writing practice">
          <LiftedFace
            height={SHEET_BUTTON_HEIGHT}
            fill={DICT_BG.card}
            border={DICT_BG.green}
            shoulder={DICT_BG.green}
            shadow={false}
          >
            <PencilLine size={18} color={C.greenDark} strokeWidth={ICON_STROKE} />
            <Text style={[BUTTON_LABEL, { color: C.greenDark }]}>Start practice</Text>
          </LiftedFace>
        </PressableScale>
      </View>
    </SheetCard>
  )
}
