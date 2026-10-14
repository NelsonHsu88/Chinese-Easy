import { memo, useMemo, useState, type ReactNode } from 'react'
import { View, Text, Pressable, Image, ScrollView, StyleSheet, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BookOpen, ChevronsRight } from 'lucide-react-native'
import { segmentText, type TextSegment } from '../../lib/textSegmentation'
import { displayPinyin, displayTitleReading, hanziFont } from '../../lib/hanzi'
import { forScript } from '../../lib/scriptConversion'
import { readingForText } from '../../lib/characterReading'
import { segmentAt, segmentSpans } from '../../lib/narration'
import type { StoryScreen } from '../../lib/pagination'
import type { PhoneticScript, ScriptMode, Story, VocabWord } from '../../types'
import { StoryArt } from '../reading/StoryArt'
import { useReadingFade } from '../readingFade'
import { formatCount } from '../reading/storyPresentation'
import { bookColors as c, bookSize, COVER_RATIO } from './tokens'

const MOUNTAINS = require('../../assets/images/decor/mountains-small.png')
/** mountains-small.png is 325×132. */
const MOUNTAINS_RATIO = 325 / 132

/**
 * One sheet of paper: cream, a shadow running into the spine on the left, a
 * faint range of mountains printed at its foot, and the page number. Every page
 * of the book — title page and text pages alike — is drawn on one of these, so
 * the leaf in the air during a turn is the same object as the page at rest.
 */
export function BookSheet({ width, height, folio, children }: { width: number; height: number; folio?: string; children: ReactNode }) {
  return (
    <View
      style={{
        width,
        height,
        backgroundColor: c.paper,
        borderTopRightRadius: bookSize.radius.outer,
        borderBottomRightRadius: bookSize.radius.outer,
        borderTopLeftRadius: bookSize.radius.spine,
        borderBottomLeftRadius: bookSize.radius.spine,
        overflow: 'hidden',
      }}
    >
      <Image
        source={MOUNTAINS}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width, height: width / MOUNTAINS_RATIO, opacity: 0.32 }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      {/* The gutter: paper curving down into the binding. */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(92,66,34,0.22)', 'rgba(92,66,34,0.06)', 'rgba(92,66,34,0)']}
        locations={[0, 0.4, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 30 }}
      />
      {children}
      {folio ? (
        <Text
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 14,
            textAlign: 'center',
            fontFamily: 'Lora',
            fontSize: 12,
            color: c.inkFaint,
          }}
        >
          {folio}
        </Text>
      ) : null}
    </View>
  )
}

/**
 * The title page the book opens on: the story's painting, its title, reading
 * and English, and a line about it — what a printed book puts before chapter
 * one. It also gives the first swipe somewhere to go, so a reader learns the
 * gesture on a page with nothing to lose.
 */
export function TitlePage({
  story,
  width,
  height,
  script,
  phoneticScript,
}: {
  story: Story
  width: number
  height: number
  script: ScriptMode
  phoneticScript: PhoneticScript
}) {
  const artWidth = Math.min(width * 0.58, (height - 300) * COVER_RATIO)
  return (
    <BookSheet width={width} height={height}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: bookSize.padX + 6, paddingBottom: 24 }}>
        <View style={{ borderRadius: 10, backgroundColor: c.card, padding: 5, borderWidth: 1, borderColor: c.cardBorder, ...artShadow }}>
          <StoryArt story={story} width={artWidth} height={artWidth / COVER_RATIO} radius={6} />
        </View>
        <Text
          className={hanziFont(script, 'semibold')}
          style={{ marginTop: 22, fontSize: 30, lineHeight: 40, color: c.ink, textAlign: 'center' }}
        >
          {forScript(story.title, script)}
        </Text>
        <Text style={{ fontFamily: 'Lora', fontSize: 14, lineHeight: 20, color: c.inkSoft, textAlign: 'center' }}>{displayTitleReading(story.titlePinyin, phoneticScript)}</Text>
        <Text style={{ fontFamily: 'LoraItalic', fontSize: 14, lineHeight: 20, color: c.inkSoft, textAlign: 'center' }}>
          {story.titleEnglish}
        </Text>
        {/* A printer's flourish between the title and the blurb. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 12 }}>
          <View style={{ width: 34, height: 1, backgroundColor: c.hairline }} />
          <View style={{ width: 5, height: 5, borderRadius: 1, backgroundColor: c.ribbon, transform: [{ rotate: '45deg' }] }} />
          <View style={{ width: 34, height: 1, backgroundColor: c.hairline }} />
        </View>
        <Text style={{ fontFamily: 'Lora', fontSize: 14, lineHeight: 21, color: c.inkSoft, textAlign: 'center' }}>{story.description}</Text>
        <Text style={{ fontFamily: 'Lora', fontSize: 12, lineHeight: 18, color: c.inkFaint, textAlign: 'center', marginTop: 6 }}>
          HSK {story.hskLevel} · {formatCount(story.wordCount)} words
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 18 }}>
          <Text style={{ fontFamily: 'NunitoBold', fontSize: 13, color: c.teal }}>Swipe to turn the page</Text>
          <ChevronsRight size={16} color={c.teal} strokeWidth={2.4} />
        </View>
      </View>
    </BookSheet>
  )
}

const artShadow = {
  shadowColor: '#3A2A14',
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 10,
  shadowOpacity: 0.16,
  elevation: 4,
} as const

/**
 * Coral dots under a word the learner hasn't added yet.
 *
 * `alignSelf: 'stretch'`, never a percentage width: the cell is sized by its
 * contents, and a percentage resolves against the whole line on native, which
 * makes every word a row of its own (CLAUDE.md, Styling).
 */
function Dots({ width }: { width: number }) {
  const count = Math.max(2, Math.floor(width / 6))
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', height: 3, marginTop: 1, alignSelf: 'stretch', paddingHorizontal: 2 }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ width: 2.5, height: 2.5, borderRadius: 1.25, backgroundColor: c.coral }} />
      ))}
    </View>
  )
}

/**
 * A page of the story: the words, each tappable with its reading under it, and
 * the page's translation beneath a hairline. Laid out to fit the paper — the
 * pagination is cut to this page's measured area — with a scroll view only as
 * a safety net for a reading wider than the estimate allowed for.
 *
 * Memoised: during a turn the page beside this one renders every frame's
 * worth of parent state, and re-segmenting a page for nothing is the one thing
 * here that costs.
 */
export const TextPage = memo(function TextPage({
  screen,
  width,
  height,
  folio,
  wordBank,
  deckWordIds,
  script,
  phonetic,
  spokenChar,
  onPressWord,
}: {
  screen: StoryScreen
  width: number
  height: number
  folio: string
  wordBank: VocabWord[]
  deckWordIds: ReadonlySet<string>
  script: ScriptMode
  phonetic: PhoneticScript
  /** The narrator's position on this page, or -1. */
  spokenChar: number
  onPressWord: (word: VocabWord) => void
}) {
  const segments: TextSegment[] = useMemo(() => segmentText(screen.chinese, wordBank, script), [screen.chinese, wordBank, script])
  const spans = useMemo(() => segmentSpans(segments), [segments])
  const spoken = spokenChar >= 0 ? segmentAt(spans, spokenChar) : -1
  const face = hanziFont(script, 'medium')
  /*
   * Scrolling stays off unless this page's text really is taller than its
   * paper. A live scroll view under the finger competes with the page-turn
   * swipe — on Android it can claim a slightly diagonal drag first — and a page
   * cut to fit has nothing to scroll.
   */
  const [overflows, setOverflows] = useState(false)
  const fade = useReadingFade()

  return (
    <BookSheet width={width} height={height} folio={folio}>
      <ScrollView
        style={{ flex: 1 }}
        scrollEnabled={overflows}
        onContentSizeChange={(_, contentHeight) => setOverflows(contentHeight > height + 1)}
        contentContainerStyle={{ paddingHorizontal: bookSize.padX, paddingTop: bookSize.padTop, paddingBottom: bookSize.padBottom }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {segments.map((seg, i) => {
            const reading = seg.word ? displayPinyin(seg.word, phonetic) : readingForText(seg.text, phonetic)
            const unknown = !!seg.word && !deckWordIds.has(seg.word.id)
            const isSpoken = spoken === i
            const word = seg.word
            return (
              <Pressable
                key={i}
                disabled={!word}
                onPress={() => word && onPressWord(word)}
                accessibilityRole={word ? 'button' : undefined}
                accessibilityLabel={word ? `${seg.display}, ${reading}` : undefined}
                style={{ alignItems: 'center', paddingHorizontal: 1.5, marginBottom: 6 }}
              >
                <View
                  style={{
                    alignItems: 'center',
                    borderRadius: 6,
                    paddingHorizontal: 1,
                    backgroundColor: isSpoken ? 'rgba(62,154,110,0.16)' : 'transparent',
                  }}
                >
                  <Text className={face} style={{ fontSize: 21, lineHeight: 30, color: c.ink }}>
                    {seg.display}
                  </Text>
                  {unknown ? <Dots width={seg.display.length * 21} /> : <View style={{ height: 4 }} />}
                </View>
                {/* Faded rather than removed when readings are off, so the page
                    never reflows under the reader (see `useReadingFade`). */}
                <Animated.View style={{ opacity: fade.opacity }} accessibilityElementsHidden={fade.hidden}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 9.5, lineHeight: 12, color: c.inkFaint }}>{reading || ' '}</Text>
                </Animated.View>
              </Pressable>
            )
          })}
        </View>

        {/* The translation, under a hairline — part of the page, not a card on it. */}
        {screen.translation ? (
          <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.hairline }}>
            <Text style={{ fontFamily: 'LoraItalic', fontSize: 13.5, lineHeight: 20, color: c.inkSoft }}>{screen.translation}</Text>
          </View>
        ) : null}

      </ScrollView>
    </BookSheet>
  )
})

/**
 * The page after the story: 完, "The End", and the way back to the library.
 *
 * Its own page rather than a line under the last paragraph. Pages are cut to
 * fill their paper, so the last one is as full as any other, and the ending
 * appended to it used to be squeezed into whatever was left at the foot —
 * jammed against the page number, or pushed past it into a scroll.
 */
export function EndPage({
  story,
  width,
  height,
  script,
  onDone,
}: {
  story: Story
  width: number
  height: number
  script: ScriptMode
  onDone: () => void
}) {
  return (
    <BookSheet width={width} height={height}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: bookSize.padX + 6, paddingBottom: 40 }}>
        {/* A seal, stamped in red. */}
        <View
          style={{
            width: 74,
            height: 74,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: c.ribbon,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: '-3deg' }],
          }}
        >
          <Text className={hanziFont(script, 'semibold')} style={{ fontSize: 44, lineHeight: 54, color: c.ribbon, includeFontPadding: false }}>
            {forScript('完', script)}
          </Text>
        </View>
        <Text style={{ fontFamily: 'LoraItalic', fontSize: 20, lineHeight: 28, color: c.ink, marginTop: 18 }}>The End</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 12 }}>
          <View style={{ width: 34, height: 1, backgroundColor: c.hairline }} />
          <View style={{ width: 5, height: 5, borderRadius: 1, backgroundColor: c.ribbon, transform: [{ rotate: '45deg' }] }} />
          <View style={{ width: 34, height: 1, backgroundColor: c.hairline }} />
        </View>
        <Text className={hanziFont(script, 'semibold')} style={{ fontSize: 20, lineHeight: 28, color: c.ink, textAlign: 'center' }}>
          {forScript(story.title, script)}
        </Text>
        <Text style={{ fontFamily: 'Lora', fontSize: 14, lineHeight: 20, color: c.inkSoft, textAlign: 'center' }}>{story.titleEnglish}</Text>

        <Pressable onPress={onDone} accessibilityRole="button" accessibilityLabel="Back to the library" style={{ marginTop: 30 }}>
          <View
            style={{
              height: 46,
              paddingHorizontal: 26,
              borderRadius: 23,
              backgroundColor: c.teal,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <BookOpen size={17} color={c.cream} strokeWidth={2.2} />
            <Text style={{ fontFamily: 'NunitoBold', fontSize: 15.5, color: c.cream, includeFontPadding: false }}>Back to the library</Text>
          </View>
        </Pressable>
      </View>
    </BookSheet>
  )
}

/**
 * Everything around the page that is not the page: the stacked edges of the
 * pages still to come on the right and along the foot, and the red ribbon
 * hanging out of the bottom. Drawn behind the PageFlip, so a turning leaf
 * passes over them.
 */
export function BookBlock({ width, height }: { width: number; height: number }) {
  const layers = [3, 2, 1]
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill]}>
      {layers.map((n) => (
        <View
          key={n}
          style={{
            position: 'absolute',
            left: 0,
            top: n,
            width: width + n * bookSize.edgeStep,
            height: height + n * 1.5,
            backgroundColor: c.pageEdge,
            borderWidth: 1,
            borderColor: c.pageEdgeLine,
            borderTopRightRadius: bookSize.radius.outer,
            borderBottomRightRadius: bookSize.radius.outer,
            borderTopLeftRadius: bookSize.radius.spine,
            borderBottomLeftRadius: bookSize.radius.spine,
          }}
        />
      ))}
      {/* The ribbon bookmark: a strip of red cloth out of the foot, notched at its end. */}
      <View style={{ position: 'absolute', left: width * 0.72, top: height - 6, alignItems: 'center' }}>
        <View style={{ width: 14, height: 30, backgroundColor: c.ribbon }}>
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: c.ribbonDark, opacity: 0.45 }} />
        </View>
        <View style={{ flexDirection: 'row' }}>
          <View style={notch('left')} />
          <View style={notch('right')} />
        </View>
      </View>
    </View>
  )
}

/** One half of the ribbon's swallowtail — a triangle drawn with borders. */
function notch(side: 'left' | 'right') {
  return {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderTopColor: c.ribbon,
    ...(side === 'left'
      ? { borderRightWidth: 7, borderRightColor: 'transparent' }
      : { borderLeftWidth: 7, borderLeftColor: 'transparent' }),
  } as const
}
