import { type ReactNode } from 'react'
import { View, Text, Image, ScrollView, useWindowDimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Layers, Shuffle, Target, Zap } from 'lucide-react-native'
import { ReviewButton } from '../review/parts'
import { Reveal, useEntranceRun } from '../dashboard/entrance'
import { revEntrance } from '../review/tokens'
import { thunkHaptic } from '../../lib/haptics'
import { endImages } from './art'
import { ResultBoxes, type ResultBox } from './ResultBoxes'
import {
  endColors as c,
  endType as t,
  endSpacing as s,
  endRadius,
  endShadow,
  endArt,
  endBoxes,
  endFoot,
  endContentBelow,
  END_CONTENT_MAX,
} from './tokens'
import { ShadowSurface } from '../shadowReveal'

/*
 * The review session's end screen, in its two states — built to the SS930
 * "Nothing to Review" and "Session Complete" references over `tokens.ts`.
 *
 * Both are the same composition: a painted hero, a title and two lines, then
 * the tip card ("Nothing to Review") or the result boxes ("Session Complete" —
 * Duolingo's lesson-complete boxes, counting up one after another, see
 * `ResultBoxes`), and the hub's own Back to Review button standing in the hole
 * the foot painting leaves for it. The hero fills the screen edge to edge, up
 * under the status bar, down to the title, cropped to cover; it is given what
 * the screen has left once everything below it is placed.
 */

export type SessionMode = 'flashcards' | 'mixed' | 'mistakes' | 'full' | 'quick'

type Props =
  | { kind: 'empty'; mode: SessionMode; onBack: () => void }
  | {
      kind: 'done'
      mode: SessionMode
      onBack: () => void
      reviewed: number
      correct: number
      /** XP this session earned (grading awards it as it goes). */
      xpEarned: number
      /** The quick session's five minutes ran out before the queue did. */
      timedOut: boolean
    }

export function SessionEnd(props: Props) {
  const { width, height } = useWindowDimensions()
  const run = useEntranceRun()
  const beat = { at: revEntrance.at, duration: revEntrance.for, run, distance: revEntrance.slideY }

  const empty = props.kind === 'empty'
  const column = Math.min(width, END_CONTENT_MAX)
  /* Type is drawn at the 430pt column and scales with it. */
  const k = column / END_CONTENT_MAX
  const page = empty ? c.emptyPage : c.donePage

  const heroRatio = empty ? endArt.emptyHero : endArt.doneHero
  const footRatio = empty ? endArt.emptyFoot : endArt.doneFoot
  const foot = empty ? endFoot.empty : endFoot.done
  const footHeight = column / footRatio

  /*
   * The painting fills the screen (SS1025): edge to edge, up under the status
   * bar, and down to the title, cropped to cover rather than shrunk inside
   * white margins. Its foot dissolves into the page. Both states — on a phone
   * the done state used to sit inside margins under the status bar, which read
   * as a smaller screen than the one before it.
   */
  const natural = column / heroRatio
  const bleedHeight = Math.max(natural * 0.75, height - footHeight - endContentBelow[props.kind])

  const back = () => {
    thunkHaptic()
    props.onBack()
  }

  return (
    <View style={{ flex: 1, backgroundColor: page }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={{ width: column, flexGrow: 1 }}>
          <Reveal from="bottom" {...beat}>
            <View style={{ height: bleedHeight, overflow: 'hidden' }}>
              <Image
                source={empty ? endImages.emptyHero : endImages.doneHero}
                style={{ width: column, height: bleedHeight }}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
              <LinearGradient
                pointerEvents="none"
                colors={[c.emptyPageClear, page]}
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: Math.round(bleedHeight * 0.18) }}
              />
            </View>
          </Reveal>

          {/* Spare height is shared between here and above the foot, so a tall
              screen opens up evenly rather than leaving one band of bare paper. */}
          <View style={{ flexGrow: 1, minHeight: 4, maxHeight: 48 }} />

          <Reveal from="bottom" {...beat}>
            <View style={{ paddingHorizontal: s.screen }}>
              <Text
                className="font-nunito-extrabold"
                accessibilityRole="header"
                style={{ ...scaled(t.title, k), color: c.navy, textAlign: 'center' }}
              >
                {empty ? 'Nothing to Review' : props.timedOut ? 'Time’s Up!' : 'Session Complete!'}
              </Text>
              <Text className="font-nunito-semibold" style={{ ...t.subtitle, color: c.slate, textAlign: 'center', marginTop: s.titleGap }}>
                {empty ? emptySubtitle(props.mode) : doneSubtitle(props.mode, props.reviewed)}
              </Text>
            </View>
          </Reveal>

          {empty ? (
            <Reveal from="bottom" {...beat} style={{ marginTop: s.section, paddingHorizontal: s.screen }}>
              <TipCard mode={props.mode} artWidth={column * endArt.scrollShare} />
            </Reveal>
          ) : (
            /* The boxes play their own entrance, a beat after the title. */
            <View style={{ marginTop: s.section + 6, paddingHorizontal: s.screen }}>
              <ResultBoxes boxes={resultBoxes(props.mode, props.reviewed, props.correct, props.xpEarned)} width={column - s.screen * 2} startDelay={420} />
            </View>
          )}

          {/* Slack lands here, so the foot always meets the bottom of the screen. */}
          <View style={{ flexGrow: 1, minHeight: s.section }} />

          <Reveal from="bottom" {...beat}>
            <View style={{ height: footHeight }}>
              <Image
                source={empty ? endImages.emptyFoot : endImages.doneFoot}
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: column, height: footHeight }}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
              {/* In the hole the foot painting leaves for it. */}
              <View
                style={{
                  position: 'absolute',
                  top: column * foot.top,
                  left: column * foot.inset,
                  right: column * foot.inset,
                }}
              >
                <ReviewButton label="Back to Review" tone="primary" onPress={back} />
              </View>
            </View>
          </Reveal>
        </View>
      </ScrollView>
    </View>
  )
}

// --- Copy -----------------------------------------------------------------------

function emptySubtitle(mode: SessionMode): string {
  if (mode === 'mistakes') return 'No repeated mistakes to drill — nothing you’ve missed twice.'
  if (mode === 'mixed') return 'No studied words are due for drills right now.'
  return 'You’re all caught up — nothing is due right now.'
}

function emptyTip(mode: SessionMode): string {
  if (mode === 'mistakes') return 'Keep reviewing — any word you miss twice will show up here to drill.'
  if (mode === 'mixed') return 'Keep exploring new content and come back later for more drills!'
  return 'Learn a few new words, and come back when your next reviews are due.'
}

function doneSubtitle(mode: SessionMode, reviewed: number): string {
  const lead =
    mode === 'mixed'
      ? 'Great practice!'
      : mode === 'mistakes'
        ? 'Great work on your mistakes!'
        : mode === 'flashcards'
          ? 'Great review!'
          : 'Great session!'
  const plural = reviewed === 1 ? '' : 's'
  const count =
    mode === 'mixed' ? `You completed ${reviewed} question${plural}.` : `You reviewed ${reviewed} card${plural}.`
  return `${lead}\n${count}`
}

// --- Cards ----------------------------------------------------------------------

function Panel({ children }: { children: ReactNode }) {
  return (
    <ShadowSurface shadow={endShadow}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.panel,
        borderRadius: endRadius.card,
        borderWidth: 1,
        borderColor: c.border,
        paddingVertical: 16,
      }}
    >
      {children}
    </ShadowSurface>
  )
}

function Divider() {
  return <View style={{ width: 1, alignSelf: 'stretch', marginVertical: 4, backgroundColor: c.border }} />
}

function TipCard({ mode, artWidth }: { mode: SessionMode; artWidth: number }) {
  return (
    <Panel>
      {/* Sized outright: a percentage width with `aspectRatio` fell back to
          the PNG's own pixel height on web and doubled the card. */}
      <View style={{ paddingHorizontal: 10 }}>
        <Image
          source={endImages.emptyScroll}
          style={{ width: artWidth, height: artWidth / endArt.scroll }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
      <Divider />
      <Text className="font-nunito-semibold" style={{ ...t.tip, color: c.slate, flex: 1, paddingHorizontal: 16 }}>
        {emptyTip(mode)}
      </Text>
    </Panel>
  )
}

/** A type style at `k` times its designed size. */
function scaled<T extends { fontSize: number; lineHeight: number }>(style: T, k: number): T {
  return { ...style, fontSize: style.fontSize * k, lineHeight: style.lineHeight * k }
}

/** Duolingo's three boxes: XP, how well it went (the header says how), and how many. */
function resultBoxes(mode: SessionMode, reviewed: number, correct: number, xpEarned: number): ResultBox[] {
  const accuracy = reviewed === 0 ? 0 : Math.round((correct / reviewed) * 100)
  return [
    { key: 'xp', label: 'TOTAL XP', icon: Zap, filledIcon: true, value: xpEarned, format: (n) => String(n), tone: endBoxes.xp },
    { key: 'accuracy', label: verdict(accuracy), icon: Target, value: accuracy, format: (n) => `${n}%`, tone: endBoxes.accuracy },
    {
      key: 'count',
      label: mode === 'mixed' ? 'QUESTIONS' : 'CARDS',
      icon: mode === 'mixed' ? Shuffle : Layers,
      value: reviewed,
      format: (n) => String(n),
      tone: endBoxes.count,
    },
  ]
}

/** The accuracy box's header, as Duolingo names a result. */
function verdict(accuracy: number): string {
  if (accuracy >= 100) return 'PERFECT'
  if (accuracy >= 90) return 'AMAZING'
  if (accuracy >= 75) return 'GREAT'
  if (accuracy >= 50) return 'GOOD'
  return 'NICE TRY'
}
