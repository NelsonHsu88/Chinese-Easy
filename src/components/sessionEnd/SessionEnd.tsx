import { useState, type ComponentType, type ReactNode } from 'react'
import { View, Text, Image, ScrollView, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Flame, Layers, Shuffle, Target } from 'lucide-react-native'
import { ReviewButton } from '../review/parts'
import { Reveal, useEntranceRun } from '../dashboard/entrance'
import { revEntrance } from '../review/tokens'
import { thunkHaptic } from '../../lib/haptics'
import { endImages } from './art'
import {
  endColors as c,
  endType as t,
  endSpacing as s,
  endRadius,
  endShadow,
  endArt,
  endFoot,
  endContentBelow,
  END_DISC,
  END_HERO_MIN,
  END_CONTENT_MAX,
} from './tokens'
import { ShadowSurface } from '../shadowReveal'

/*
 * The review session's end screen, in its two states — built to the SS930
 * "Nothing to Review" and "Session Complete" references over `tokens.ts`.
 *
 * Both are the same composition: a painted hero, a Lora title and two lines, a
 * card, and the hub's own Back to Review button standing in the hole the foot
 * painting leaves for it. Only the hero changes size — it is given what the
 * screen has left once everything below it is placed — so the page ends at the
 * bottom of the screen on a tall phone and shrinks the painting, rather than
 * scrolling, on a short one.
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
      streak: number
      /** The quick session's five minutes ran out before the queue did. */
      timedOut: boolean
    }

export function SessionEnd(props: Props) {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const run = useEntranceRun()
  const beat = { at: revEntrance.at, duration: revEntrance.for, run, distance: revEntrance.slideY }

  const empty = props.kind === 'empty'
  const column = Math.min(width, END_CONTENT_MAX)
  /* Type and discs are drawn at the 430pt column and scale with it, so the
     stats still fit side by side on a 360pt phone. */
  const k = column / END_CONTENT_MAX
  const page = empty ? c.emptyPage : c.donePage

  const heroRatio = empty ? endArt.emptyHero : endArt.doneHero
  const footRatio = empty ? endArt.emptyFoot : endArt.doneFoot
  const foot = empty ? endFoot.empty : endFoot.done
  const footHeight = column / footRatio

  /* The hero takes what is left, between a floor and its natural size. */
  const natural = column / heroRatio
  const left = height - insets.top - footHeight - endContentBelow[props.kind]
  const heroHeight = Math.max(natural * END_HERO_MIN, Math.min(natural, left))

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
        <View style={{ width: column, flexGrow: 1, paddingTop: insets.top }}>
          <Reveal from="bottom" {...beat}>
            <View style={{ height: heroHeight, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Image
                source={empty ? endImages.emptyHero : endImages.doneHero}
                style={{ width: heroHeight * heroRatio, height: heroHeight }}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </View>
          </Reveal>

          {/* Spare height is shared between here and above the foot, so a tall
              screen opens up evenly rather than leaving one band of bare paper. */}
          <View style={{ flexGrow: 1, minHeight: 4, maxHeight: 48 }} />

          <Reveal from="bottom" {...beat}>
            <View style={{ paddingHorizontal: s.screen }}>
              <Text
                className="font-lora-bold"
                accessibilityRole="header"
                style={{ ...scaled(t.title, k), color: c.navy, textAlign: 'center' }}
              >
                {empty ? 'Nothing to Review' : props.timedOut ? 'Time’s Up!' : 'Session Complete!'}
              </Text>
              <Text className="font-lora" style={{ ...t.subtitle, color: c.slate, textAlign: 'center', marginTop: s.titleGap }}>
                {empty ? emptySubtitle(props.mode) : doneSubtitle(props.mode, props.reviewed)}
              </Text>
            </View>
          </Reveal>

          <Reveal from="bottom" {...beat} style={{ marginTop: s.section, paddingHorizontal: s.screen }}>
            {empty ? <TipCard mode={props.mode} artWidth={column * endArt.scrollShare} /> : <StatsCard {...props} k={k} />}
          </Reveal>

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
      <Text className="font-lora" style={{ ...t.tip, color: c.slate, flex: 1, paddingHorizontal: 16 }}>
        {emptyTip(mode)}
      </Text>
    </Panel>
  )
}

function StatsCard({
  mode,
  reviewed,
  correct,
  streak,
  k,
}: {
  mode: SessionMode
  reviewed: number
  correct: number
  streak: number
  k: number
}) {
  const accuracy = reviewed === 0 ? 0 : Math.round((correct / reviewed) * 100)
  const AccuracyIcon = mode === 'mixed' ? Shuffle : mode === 'mistakes' ? Target : Layers
  return (
    <Panel>
      <Stat
        icon={AccuracyIcon}
        iconColor={c.accuracy}
        disc={c.accuracyDisc}
        label="Accuracy"
        value={`${accuracy}%`}
        valueColor={c.accuracy}
        note={`${correct} / ${reviewed} correct`}
        k={k}
      />
      <Divider />
      <Stat
        icon={Flame}
        iconColor={c.flame}
        iconFill={c.flame}
        disc={c.flameDisc}
        label="Streak"
        value={`${streak} ${streak === 1 ? 'day' : 'days'}`}
        valueColor={c.streak}
        note="Keep it up!"
        k={k}
      />
    </Panel>
  )
}

/** A type style at `k` times its designed size. */
function scaled<T extends { fontSize: number; lineHeight: number }>(style: T, k: number): T {
  return { ...style, fontSize: style.fontSize * k, lineHeight: style.lineHeight * k }
}

function Stat({
  icon: Icon,
  iconColor,
  iconFill,
  disc,
  label,
  value,
  valueColor,
  note,
  k,
}: {
  icon: ComponentType<{ color: string; size: number; strokeWidth: number; fill?: string }>
  iconColor: string
  iconFill?: string
  disc: string
  label: string
  value: string
  valueColor: string
  note: string
  k: number
}) {
  const discSize = END_DISC * k
  /*
   * The value is sized to the width its column actually has. Guessing from the
   * character count let "100%" through at full size — four characters, so no
   * shrink — and on a phone it ran out of room and printed as "100…". Until
   * the column reports its width, the estimate from the screen is used.
   */
  const [avail, setAvail] = useState<number | null>(null)
  const designSize = t.statValue.fontSize * k
  const fitted = avail == null ? designSize : Math.min(designSize, (avail * 0.94) / emWidth(value))
  const shrink = fitted / designSize
  /* The label and note around it fit the same way, so a 320pt phone gets
     "ACCURACY" and "2 / 2 correct" whole rather than "ACCURA…". */
  const fit = (text: string, size: number, tracking = 0) =>
    avail == null ? 1 : Math.min(1, (avail * 0.96) / (emWidth(text) * size * k + tracking * text.length))
  const labelK = k * fit(label.toUpperCase(), t.statLabel.fontSize, t.statLabel.letterSpacing)
  const noteK = k * fit(note, t.statNote.fontSize)
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 }}>
      <View
        style={{
          width: discSize,
          height: discSize,
          borderRadius: discSize / 2,
          backgroundColor: disc,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon color={iconColor} size={30 * k} strokeWidth={2.2} fill={iconFill ?? 'none'} />
      </View>
      <View style={{ flex: 1 }} onLayout={(e) => setAvail(e.nativeEvent.layout.width)}>
        <Text className="font-lora" numberOfLines={1} style={{ ...scaled(t.statLabel, labelK), color: c.slate }}>
          {label.toUpperCase()}
        </Text>
        {/* Fitted by measurement rather than with `adjustsFontSizeToFit`,
            which is iOS-only: on Android "12 days" would simply clip. */}
        <Text
          className="font-lora-bold"
          numberOfLines={1}
          style={{ ...scaled(t.statValue, k * shrink), color: valueColor }}
        >
          {value}
        </Text>
        <Text className="font-lora" numberOfLines={1} style={{ ...scaled(t.statNote, noteK), color: c.slate }}>
          {note}
        </Text>
      </View>
    </View>
  )
}

/**
 * A string's advance in Lora, in ems — generous, so the estimate errs towards
 * fitting. Digits are tabular-ish (~0.62em), capitals and the percent sign wide.
 */
function emWidth(text: string): number {
  let em = 0
  for (const ch of text) {
    if (ch >= '0' && ch <= '9') em += 0.62
    else if (ch === '%') em += 0.92
    else if (ch === ' ') em += 0.26
    else if (ch === '/') em += 0.4
    else if (ch >= 'A' && ch <= 'Z') em += 0.72
    else em += 0.54
  }
  return Math.max(em, 1)
}
