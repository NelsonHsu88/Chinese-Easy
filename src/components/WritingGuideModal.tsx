import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, Modal as RNModal, ScrollView, Animated, Platform, useWindowDimensions } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft, Bookmark, Droplet, Pencil, Puzzle, Rocket, Star, Trophy } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { WritingPracticeModal } from './WritingPracticeModal'
import { WritingGrid } from './writingGuide/WritingGrid'
import { RuleList, STROKE_RULES } from './writingGuide/RuleList'
import {
  GuideProgress,
  ExampleCard,
  PlainCard,
  TakeawayCard,
  CardText,
  SpeedSegment,
  PrimaryButton,
  type GuideSpeed,
} from './writingGuide/parts'
import { guideColors as c, spacing, rhythm, type as t, motion } from './writingGuide/tokens'
import { tickHaptic } from '../lib/haptics'
import { playTapSound } from '../lib/sound'
import type { VocabWord } from '../types'

/*
 * A short primer on how Chinese writing actually works, for someone who has
 * never held a pen over a character.
 *
 * Four pages, each pairing one idea with one character animated live by the
 * same writer the practice screens use — watching 好 build itself in order
 * teaches the rule far better than a numbered diagram of it. That is the whole
 * reason this is a screen rather than a paragraph of help text.
 *
 * The design is its own visual language, defined in `writingGuide/tokens.ts`:
 * warm cream, one green, surfaces made of borders and tints rather than
 * shadows, and a fixed vertical rhythm repeated on every page. Explanations are
 * kept to two sentences on purpose — a lesson page that turns into three
 * paragraphs stops being looked at.
 */

const USE_NATIVE_DRIVER = Platform.OS !== 'web'

/** The character each page teaches. */
const PAGE_CHARACTERS = ['好', '媽', '十', '十'] as const
const TOTAL = 4

/**
 * Only the first page asks the learner to write.
 *
 * Tracing is how page one proves its point — you cannot feel that a character
 * is built in a fixed order by reading that it is. Pages two and three are
 * about *recognising* things (which part carries the meaning, which pattern the
 * strokes follow), and making the learner trace 媽 again to get past a sentence
 * about radicals is a toll rather than a lesson. They acknowledge and move on.
 */
const TRACING_PAGE = 0

/*
 * The design is drawn for a phone, so the column is capped and centred rather
 * than allowed to fill a desktop browser. Without this the writing card
 * stretches to the window width and its guides end up drawn into one corner of
 * a very wide rectangle. Matches `ReadingShell`'s cap so the two full-screen
 * designs in the app agree on how wide "a page" is.
 */
const CONTENT_MAX = 430

/*
 * The writing card is a centred square, not a full-width block: still narrower
 * than the cards beneath it, which is what stops the page reading as a stack of
 * identical panels, but big enough to be the thing you actually look at.
 *
 * Its width is capped by the column, but its real size comes from the *height
 * left over* on the page it sits on — because the guide must not scroll, and
 * the character is the only element with any give. Everything else is type and
 * cards at fixed sizes; asking the learner to scroll past a rule to reach the
 * next one is exactly what this sizing exists to prevent.
 */
const GRID_RATIO = 0.7

/**
 * Chrome above and below the scrolling body, in points: the 50pt header, the
 * gap to the progress row, the row itself, the gap down to the heading, the
 * body's bottom padding, and the speed control plus button beneath it.
 *
 * Measured from the running app rather than derived from the styles — the same
 * call `pagination.ts` makes, and for the same reason: line heights and the
 * button's own padding do not add up to what the styles imply.
 */
const CHROME = 260

/**
 * How much of the leftover height each page can give its character, and the
 * smallest square still worth drawing one in.
 *
 * Per page, because the pages are not equally full: page three carries five
 * rule rows and can spare far less than page four, which is a heading and a
 * single card. One shared ratio meant either a tiny character on page one or a
 * scrollbar on page three.
 */
const GRID_SHARE = [0.42, 0.34, 0.28, 0.5] as const
const GRID_MIN = 128

export function WritingGuideModal({ onClose }: { onClose: () => void }) {
  const { wordBank } = useApp()
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const columnWidth = Math.min(windowWidth, CONTENT_MAX)
  const [page, setPage] = useState(0)

  /*
   * Height the page body actually has, after the chrome and the device's own
   * safe areas. `useSafeAreaInsets` rather than `SafeAreaView`'s own padding,
   * because the number is needed here as arithmetic, not just as padding.
   */
  const bodyHeight = windowHeight - CHROME - insets.top - insets.bottom
  const gridSide = Math.round(
    Math.max(GRID_MIN, Math.min(columnWidth * GRID_RATIO, bodyHeight * GRID_SHARE[page])),
  )
  const [speed, setSpeed] = useState<GuideSpeed>('normal')
  /** Which stroke rule page 3 is demonstrating. */
  const [selectedRule, setSelectedRule] = useState(2)
  const [tracing, setTracing] = useState(false)

  const isLast = page === TOTAL - 1

  /*
   * The word handed to the practice modal. Looked up in the bank so the learner
   * gets the real pinyin and gloss; the fallback keeps the lesson working for a
   * character the bank happens not to carry as a standalone word.
   */
  const traceWord: VocabWord = useMemo(() => {
    const char = PAGE_CHARACTERS[page]
    const found = wordBank.find((w) => w.traditional === char)
    return (
      found ?? {
        id: `guide-${char}`,
        simplified: char,
        traditional: char,
        pinyin: '',
        definition: '',
        hskLevel: 1,
        category: 'daily',
      }
    )
  }, [page, wordBank])

  // Page content settles in rather than snapping — 220ms, once, on arrival.
  const enter = useRef(new Animated.Value(1)).current
  useEffect(() => {
    enter.setValue(0)
    Animated.timing(enter, {
      toValue: 1,
      duration: motion.pageIn,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start()
  }, [page, enter])

  const goTo = (next: number) => {
    tickHaptic()
    setPage(Math.min(TOTAL - 1, Math.max(0, next)))
  }

  const handleCta = () => {
    playTapSound()
    if (isLast) {
      // The lesson ends by leading somewhere real rather than just closing.
      onClose()
      router.push('/new-words')
      return
    }
    if (page === TRACING_PAGE) {
      setTracing(true)
      return
    }
    goTo(page + 1)
  }

  const ctaLabel = isLast ? 'Start practice' : page === TRACING_PAGE ? 'Try tracing' : 'Got it'

  return (
    <RNModal animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 items-center" style={{ backgroundColor: c.background }}>
       <View className="flex-1" style={{ width: columnWidth }}>
        {/*
          The title is centred on the *screen*, not between the two icons — with
          a back arrow on one side and a bookmark on the other it would
          otherwise sit very slightly off-centre, which is the kind of thing
          that reads as sloppy without being identifiable.
        */}
        <View className="justify-center" style={{ height: 50, paddingHorizontal: spacing.screen }}>
          <Text
            className="text-center font-nunito-extrabold"
            style={{ fontSize: t.header.fontSize, color: c.navy }}
          >
            How to write Chinese
          </Text>
          <View className="absolute inset-x-0 flex-row items-center justify-between" style={{ paddingHorizontal: spacing.screen }}>
            <Pressable
              onPress={() => (page === 0 ? onClose() : goTo(page - 1))}
              accessibilityRole="button"
              accessibilityLabel={page === 0 ? 'Close writing guide' : 'Previous page'}
              hitSlop={12}
              className="active:opacity-60"
            >
              <ArrowLeft size={23} color={c.navy} strokeWidth={2.2} />
            </Pressable>
            {/* Inert, matching the reference — bookmarking isn't a feature yet. */}
            <Bookmark size={21} color={c.textMuted} strokeWidth={2} />
          </View>
        </View>

        {/*
          `flexGrow: 1` plus `space-between` on the body is what keeps a short
          page from sitting in the top third of the screen over a pool of dead
          space. The container always grows to at least the viewport, and the
          body then spreads its blocks into whatever height is left over, so the
          gaps in `rhythm` act as minimums rather than as the final measurements.
          Content taller than the viewport still scrolls normally.

          It only works because every page below returns a handful of *grouped*
          blocks. Returning a flat fragment would make each Text its own flex
          child, and the distribution would prise a heading apart from its own
          supporting line.
        */}
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: spacing.screen,
            paddingTop: rhythm.headerToProgress,
            paddingBottom: spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
          <GuideProgress page={page} total={TOTAL} />

          <Animated.View
            style={{
              flex: 1,
              opacity: enter,
              transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
              marginTop: rhythm.progressToHeading,
            }}
          >
            <View className="flex-1" style={{ justifyContent: 'space-between' }}>
              <PageBody
                page={page}
                speed={speed}
                gridSide={gridSide}
                selectedRule={selectedRule}
                onSelectRule={setSelectedRule}
              />
            </View>
          </Animated.View>
        </ScrollView>

        <View style={{ paddingHorizontal: spacing.screen, paddingBottom: spacing.lg, gap: rhythm.controlsToCta }}>
          {/* On every page, including the rules one — it animates a character too. */}
          <SpeedSegment speed={speed} onChange={(next) => { tickHaptic(); setSpeed(next) }} />

          {/*
            The icon follows the label: a pencil only where the button actually
            opens the writing pad, a rocket on the last page, and nothing on the
            acknowledge pages — a pencil on "Got it" would promise a tracing
            step that no longer happens there.
          */}
          <PrimaryButton
            label={ctaLabel}
            icon={
              isLast ? (
                <Rocket size={18} color="#ffffff" strokeWidth={2.5} />
              ) : page === TRACING_PAGE ? (
                <Pencil size={18} color="#ffffff" strokeWidth={2.5} />
              ) : undefined
            }
            onPress={handleCta}
          />

        </View>

        {/*
          Page one only (`TRACING_PAGE`). Finishing the character closes
          practice and turns the page; closing it early deliberately does not
          advance, because writing 好 once is the point that page is making.
          Nobody is trapped by that — the header's back arrow still works, and
          every later page moves on with a tap.
        */}
        {tracing && (
          <WritingPracticeModal
            word={traceWord}
            onClose={() => setTracing(false)}
            onCompleted={() => {
              setTracing(false)
              goTo(page + 1)
            }}
          />
        )}
       </View>
      </SafeAreaView>
    </RNModal>
  )
}

/**
 * Heading and supporting copy — both centred, as every reference screen has
 * them. Left-aligning these was the single biggest thing making the first pass
 * look like a different design.
 */
function Heading({ title, copy }: { title: string; copy: string }) {
  // One View, not a fragment: the page body distributes leftover height between
  // its children, and a heading that is two separate children gets pulled apart
  // from the line explaining it.
  return (
    <View>
      <Text className="text-center font-nunito-extrabold" style={{ ...t.heading, color: c.navy }}>
        {title}
      </Text>
      {copy !== '' && (
        <Text
          className="text-center font-nunito-semibold"
          style={{ ...t.intro, color: c.textSecondary, marginTop: rhythm.headingToCopy }}
        >
          {copy}
        </Text>
      )}
    </View>
  )
}

/** A Chinese fragment inside an English sentence — sans, to sit with Nunito. */
function Han({ children, green = false }: { children: string; green?: boolean }) {
  return (
    <Text className="font-hanzi-sans-bold" style={{ fontSize: 17, color: green ? c.greenDark : c.navy }}>
      {children}
    </Text>
  )
}

/** The writing card, centred in the column at its own narrower width. */
function Grid({
  character,
  speed,
  gridSide,
}: {
  character: string
  speed: GuideSpeed
  gridSide: number
}) {
  return (
    <View className="items-center" style={{ marginTop: rhythm.copyToCharacter }}>
      <WritingGrid character={character} speed={speed} width={gridSide} height={gridSide} />
    </View>
  )
}

/** One line under the writing card, centred, naming what to watch for. */
function Caption({ children }: { children: string }) {
  return (
    <Text
      className="text-center font-nunito-semibold"
      style={{ ...t.intro, color: c.textSecondary, marginTop: rhythm.characterToExplanation }}
    >
      {children}
    </Text>
  )
}

function PageBody({
  page,
  speed,
  gridSide,
  selectedRule,
  onSelectRule,
}: {
  page: number
  speed: GuideSpeed
  gridSide: number
  selectedRule: number
  onSelectRule: (index: number) => void
}) {
  if (page === 0) {
    return (
      <>
        <Heading
          title={`Characters are
built from parts`}
          copy={`Chinese characters are not random drawings.
They are built from smaller parts and written
in a fixed order.`}
        />
        <Grid character="好" speed={speed} gridSide={gridSide} />
        <View style={{ marginTop: rhythm.characterToExplanation }}>
          {/*
            Two lines that say the same thing twice, once in characters and once
            in English. Without the second line the equation is a shape puzzle:
            it shows 好 is made of 女 and 子 while leaving the actual point —
            that a woman and a child add up to *good* — for the learner to guess.
          */}
          <ExampleCard label="Example">
            <Text className="font-nunito-semibold" style={{ ...t.cardBody, color: c.textSecondary }}>
              <Han green>好</Han> (hǎo) = <Han green>女</Han> (woman) + <Han green>子</Han> (child)
            </Text>
            <Text
              className="font-nunito-bold"
              style={{ ...t.cardBody, color: c.greenDark, marginTop: spacing.xs }}
            >
              good = woman + child
            </Text>
          </ExampleCard>
        </View>
        <View style={{ marginTop: rhythm.explanationToCard }}>
          <TakeawayCard icon={<Star size={24} color="#ffffff" strokeWidth={2.4} fill="#ffffff" />}>
            <CardText>Learn the parts, and most characters become easier to remember.</CardText>
          </TakeawayCard>
        </View>
      </>
    )
  }

  if (page === 1) {
    return (
      <>
        <Heading
          title="Radicals give clues"
          copy={`A radical often hints at meaning,
while another part may hint at sound.`}
        />
        <Grid character="媽" speed={speed} gridSide={gridSide} />
        <View style={{ marginTop: rhythm.characterToExplanation }}>
          {/*
            The radical is labelled with what it *means*, not with the word
            "meaning". Writing 女 (meaning) named the job the part is doing while
            withholding the one fact that makes the example land — that the part
            hinting at this character's sense is the word for woman.
          */}
          <ExampleCard icon={<Puzzle size={20} color={c.green} strokeWidth={2.3} />}>
            <Text className="font-nunito-semibold" style={{ ...t.cardBody, color: c.textSecondary }}>
              <Han green>媽</Han> (mother) = <Han green>女</Han> (woman) + <Han green>馬</Han>{' '}
              (sound, mǎ)
            </Text>
          </ExampleCard>
        </View>
        <View style={{ marginTop: rhythm.explanationToCard }}>
          <PlainCard
            title="Example: Water radical"
            icon={<Droplet size={19} color="#4E9BD6" strokeWidth={2.3} fill="#4E9BD6" />}
          >
            <View className="flex-row" style={{ gap: spacing.sm, marginBottom: spacing.md }}>
              {[
                { han: '河', pinyin: 'hé' },
                { han: '海', pinyin: 'hǎi' },
                { han: '洗', pinyin: 'xǐ' },
              ].map((w) => (
                <View
                  key={w.han}
                  className="flex-1 items-center rounded-xl"
                  style={{
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: c.plainCardBorder,
                    paddingVertical: spacing.md,
                  }}
                >
                  <Text className="font-hanzi-sans-bold" style={{ fontSize: 30, color: c.navy }}>
                    {w.han}
                  </Text>
                  <Text
                    className="mt-1 font-nunito-semibold"
                    style={{ fontSize: 13, color: c.textMuted }}
                  >
                    {w.pinyin}
                  </Text>
                </View>
              ))}
            </View>
            <CardText>They all relate to water.</CardText>
          </PlainCard>
        </View>
      </>
    )
  }

  if (page === 2) {
    const rule = STROKE_RULES[selectedRule]
    return (
      <>
        <Heading title={`Stroke order
follows patterns`} copy="" />
        {/* Grouped: the caption names what to watch in the card above it. */}
        <View>
          <Grid character={rule.character} speed={speed} gridSide={gridSide} />
          <Caption>{rule.caption}</Caption>
        </View>
        <View style={{ marginTop: rhythm.explanationToCard }}>
          <RuleList selected={selectedRule} onSelect={onSelectRule} />
        </View>
      </>
    )
  }

  return (
    <>
      <Heading
        title={`Every stroke has
a direction`}
        copy={`Horizontal strokes go left to right.
Vertical strokes go top to bottom.`}
      />
      <Grid character="十" speed={speed} gridSide={gridSide} />
      <View style={{ marginTop: rhythm.explanationToCard + spacing.sm }}>
        <TakeawayCard icon={<Trophy size={24} color="#ffffff" strokeWidth={2.2} />}>
          <CardText>
            If you can spot the parts and follow the order, you can write new characters with
            confidence.
          </CardText>
        </TakeawayCard>
      </View>
    </>
  )
}
