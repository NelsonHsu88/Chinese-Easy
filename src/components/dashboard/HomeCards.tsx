import type { ReactNode } from 'react'
import { View, Text, type ViewStyle } from 'react-native'
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg'
import { ArrowRight, Check, ChartNoAxesColumn, Volume2, Waypoints } from 'lucide-react-native'
import { CardArt, DashboardCard, LiftedFace, PressableScale, DASH_LIFT } from './parts'
import { homeArt, homeRefCards } from './art'
import { homeColors as c, homeSurfaces, homeType as t, homeLayout as l } from './tokens'
import type { VocabWord, PhoneticScript, ScriptMode } from '../../types'
import type { WeekDay } from '../../lib/progress'
import { displayWord, displayPinyin, hanziFont } from '../../lib/hanzi'
import { shortGloss } from '../../lib/definitions'
import { speak } from '../../lib/speech'
import { tapHaptic } from '../../lib/haptics'

/*
 * The four cards of the redesigned Home ("SS1012 Home Page Redesign UI 2"),
 * each across the full column: Review, the word on offer, Daily Challenges and
 * This Week.
 *
 * Each card's watercolour was cut from the mockup (`homeArt`) and is placed by
 * the mockup's own offsets, scaled from that card's reference width
 * (`homeRefCards`) to the real one — so a corner of scenery stays tucked into
 * its corner at any column width.
 */

type ArtPiece = (typeof homeArt)[keyof typeof homeArt]
type RefCard = (typeof homeRefCards)[keyof typeof homeRefCards]

/** A piece of card art, anchored to whichever card edges the mockup put it nearest. */
function PlacedArt({
  piece,
  card,
  k,
  anchor,
}: {
  piece: ArtPiece
  card: RefCard
  k: number
  anchor: { x: 'left' | 'right'; y: 'top' | 'bottom' }
}) {
  const { x, y, w, h } = piece.box
  const style = {
    [anchor.x]: (anchor.x === 'left' ? x - card.x : card.x + card.w - (x + w)) * k,
    [anchor.y]: (anchor.y === 'top' ? y - card.y : card.y + card.h - (y + h)) * k,
  } as ViewStyle
  return <CardArt source={piece.source} ratio={w / h} width={w * k} style={style} />
}

/** A raised pill with a Lora label, for the two half-width cards. */
function HomeButtonFace({
  label,
  fill,
  shoulder,
  icon,
}: {
  label: string
  fill: string
  shoulder: string
  icon?: ReactNode
}) {
  return (
    <LiftedFace height={l.buttonHeight} fill={fill} shoulder={shoulder}>
      <Text className="font-lora-bold" numberOfLines={1} style={{ ...t.button, color: c.white }}>
        {label}
      </Text>
      {icon}
    </LiftedFace>
  )
}

function IconDisc({ size, children }: { size: number; children: ReactNode }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.greenSoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </View>
  )
}

// --- Review -------------------------------------------------------------------

export function ReviewCard({ dueCount, width, onPress }: { dueCount: number; width: number; onPress: () => void }) {
  const card = homeRefCards.review
  const k = width / card.w
  /* The text column stops where the 字 cards begin, as in the mockup. */
  const column = Math.max(150, (homeArt.review.box.x - card.x) * k - l.cardPad)
  const button = Math.min(column, Math.max(150, 338 * k))

  return (
    <DashboardCard
      fill={homeSurfaces.review.fill}
      border={homeSurfaces.review.border}
      minHeight={card.h * k}
      onPress={onPress}
      accessibilityLabel={dueCount > 0 ? `Start review, ${dueCount} words due` : 'Start review, you are all caught up'}
    >
      <PlacedArt piece={homeArt.review} card={card} k={k} anchor={{ x: 'right', y: 'bottom' }} />

      <View style={{ flex: 1, padding: l.cardPad + 2, width: column + l.cardPad, justifyContent: 'center' }}>
        <View
          style={{
            alignSelf: 'flex-start',
            height: 22,
            paddingHorizontal: 9,
            borderRadius: 11,
            backgroundColor: c.tagFill,
            justifyContent: 'center',
          }}
        >
          <Text className="font-lora" style={{ ...t.tag, color: c.tagInk }}>
            REVIEW
          </Text>
        </View>

        <Text className="font-lora-bold" numberOfLines={1} style={{ ...t.due, color: c.ink, marginTop: 10 }}>
          {dueCount > 0 ? `${dueCount} ${dueCount === 1 ? 'word' : 'words'} due` : 'All caught up'}
        </Text>
        <Text className="font-lora" numberOfLines={2} style={{ ...t.body, color: c.subtle, marginTop: 2 }}>
          {dueCount > 0 ? 'Keep your streak alive!' : 'Nothing due right now.'}
        </Text>

        {/* The whole card is the button, so this is a face, not a second target. */}
        <View style={{ width: button, marginTop: 16 }}>
          <HomeButtonFace
            label="Start Review"
            fill={c.coral}
            shoulder={c.coralShoulder}
            icon={<ArrowRight size={17} color={c.white} strokeWidth={2.5} />}
          />
        </View>
      </View>
    </DashboardCard>
  )
}

// --- The word on offer ----------------------------------------------------------

export function WordCard({
  word,
  script,
  phoneticScript,
  added,
  wordsToday,
  width,
  onSeeAll,
  onAdd,
  onSkip,
}: {
  /** Undefined once the daily goal is met or the pool is empty. */
  word: VocabWord | undefined
  script: ScriptMode
  phoneticScript: PhoneticScript
  added: boolean
  wordsToday: number
  width: number
  onSeeAll: () => void
  onAdd: () => void
  /** "Not now" — or, once the word is added, on to the next one. */
  onSkip: () => void
}) {
  const card = homeRefCards.word
  const k = width / card.w
  /* The word sits over the left of the range, as in the mockup. */
  const range = homeArt.wordRange.box
  const wordColumn = (range.x - card.x + 30) * k

  const shown = word ? displayWord(word, script) : ''
  const speaker = 36
  /* CJK sizes come from width and character count — adjustsFontSizeToFit is iOS-only. */
  const hanziSize = Math.min(38, (wordColumn - l.cardPad - speaker - 10) / Math.max(1, Array.from(shown).length))

  return (
    <DashboardCard
      fill={homeSurfaces.word.fill}
      border={homeSurfaces.word.border}
      minHeight={card.h * k}
      onPress={onSeeAll}
      accessibilityLabel={word ? `Learn a new word: ${shown}. Open new words.` : 'Open new words'}
      accessibilityRole="none"
    >
      {/* The range rests on the button row, as in the mockup, whatever height the card grows to. */}
      <CardArt
        source={homeArt.wordRange.source}
        ratio={range.w / range.h}
        width={range.w * k * 1.12}
        style={{ right: (card.x + card.w - (range.x + range.w)) * k, bottom: l.cardPad + 2 + l.buttonHeight + DASH_LIFT - 10 }}
      />

      <View style={{ flex: 1, padding: l.cardPad + 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <IconDisc size={36}>
            <Waypoints size={18} color={c.greenInk} strokeWidth={2.2} />
          </IconDisc>
          <Text className="font-lora-bold" numberOfLines={1} style={{ ...t.title, color: c.ink, flex: 1 }}>
            Learn a New Word
          </Text>
        </View>

        <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 10, width: wordColumn }}>
          {word ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text
                  className={hanziFont(script, 'semibold')}
                  style={{ fontSize: hanziSize, lineHeight: hanziSize * 1.3, color: c.ink, includeFontPadding: false }}
                >
                  {shown}
                </Text>
                <PressableScale
                  onPress={() => {
                    tapHaptic()
                    speak(word.simplified)
                  }}
                  accessibilityLabel="Play pronunciation"
                  scaleTo={0.9}
                >
                  <IconDisc size={speaker}>
                    <Volume2 size={18} color={c.greenInk} strokeWidth={2.2} />
                  </IconDisc>
                </PressableScale>
              </View>
              <Text className="font-lora" style={{ ...t.pinyin, color: c.subtle, marginTop: 2 }}>
                {displayPinyin(word, phoneticScript)}
              </Text>
              <Text className="font-lora" numberOfLines={1} style={{ ...t.gloss, color: c.ink, marginTop: 1 }}>
                {shortGloss(word)}
              </Text>
            </>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconDisc size={44}>
                <Check size={22} color={c.greenInk} strokeWidth={2.6} />
              </IconDisc>
              <View style={{ flex: 1 }}>
                <Text className="font-lora-bold" style={{ ...t.pinyin, color: c.ink }}>
                  Today’s words done
                </Text>
                <Text className="font-lora" style={{ ...t.body, color: c.subtle, marginTop: 2 }}>
                  {wordsToday} new {wordsToday === 1 ? 'word' : 'words'} today
                </Text>
              </View>
            </View>
          )}
        </View>

        {word ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <PressableScale
              onPress={() => {
                tapHaptic()
                onSkip()
              }}
              accessibilityLabel={added ? 'Next word' : `Not now, skip ${shown}`}
              wrapperStyle={{ flex: 0.8 }}
            >
              <LiftedFace
                height={l.buttonHeight}
                fill={c.white}
                shoulder={c.quietShoulder}
                border={c.quietLine}
                shadow={false}
              >
                <Text className="font-lora-bold" numberOfLines={1} style={{ ...t.button, color: c.subtle }}>
                  {added ? 'Next word' : 'Not now'}
                </Text>
              </LiftedFace>
            </PressableScale>
            <PressableScale onPress={onAdd} accessibilityLabel={`Add ${shown} to my deck`} wrapperStyle={{ flex: 1 }}>
              <HomeButtonFace
                label={added ? 'Added ✓' : 'Add this word'}
                fill={added ? c.greenDeep : c.green}
                shoulder={added ? c.greenDeepShoulder : c.greenShoulder}
              />
            </PressableScale>
          </View>
        ) : (
          <PressableScale onPress={onSeeAll} accessibilityLabel="See new words">
            <HomeButtonFace label="See new words" fill={c.green} shoulder={c.greenShoulder} />
          </PressableScale>
        )}
      </View>
    </DashboardCard>
  )
}

// --- Daily challenges -------------------------------------------------------------

export interface ChallengeStep {
  id: string
  /** First line under the ring: "Learn". */
  verb: string
  /** Second line: "3 words". */
  detail: string
  done: boolean
}

export type RewardState = 'locked' | 'ready' | 'claimed'

const STEP_RING = 30
const CHECK = 20

export function ChallengesCard({
  steps,
  reward,
  width,
  onPress,
}: {
  steps: ChallengeStep[]
  reward: RewardState
  width: number
  onPress: () => void
}) {
  const card = homeRefCards.challenges
  const k = width / card.w
  const lantern = homeArt.lantern.box

  /* The "Earn reward" pill sits on the patch the script in-painted out of the gift corner. */
  const pillWidth = Math.max(92, 165 * k)
  const pillHeight = 28
  const pillCentreX = (715 - card.x) * k
  const pillCentreFromBottom = (card.y + card.h - 1446) * k

  /*
   * Step centres. Three steps take the mockup's own positions; more share the
   * room left of the gift evenly, so "5 characters" never runs into its
   * neighbour on a narrow phone.
   */
  const mockupSpan = steps.length <= 3
  /* The labels may sit over the corner trees: they're pale, and "5 characters" needs the room. */
  const span = { from: l.cardPad - 4, to: pillCentreX - pillWidth / 2 - 2 }
  const slot = mockupSpan ? (360 * k) / 2 : (span.to - span.from) / steps.length
  const first = mockupSpan ? 135 * k : span.from + slot / 2
  const last = mockupSpan ? 495 * k : span.to - slot / 2
  const pitch = steps.length > 1 ? (last - first) / (steps.length - 1) : 0
  const centre = (i: number) => (steps.length > 1 ? first + i * pitch : (first + last) / 2)
  /* "5 characters" is the widest label, about 5.6 em-ish characters of Lora. */
  const labelSize = Math.max(10, Math.min(t.label.fontSize, slot / 6))

  const doneCount = steps.filter((s) => s.done).length

  return (
    <DashboardCard
      fill={homeSurfaces.challenges.fill}
      border={homeSurfaces.challenges.border}
      minHeight={card.h * k}
      onPress={onPress}
      accessibilityRole="none"
      accessibilityLabel={`Daily challenges, ${doneCount} of ${steps.length} complete`}
    >
      <PlacedArt piece={homeArt.challengeTrees} card={card} k={k} anchor={{ x: 'left', y: 'bottom' }} />
      <PlacedArt piece={homeArt.challengeRocks} card={card} k={k} anchor={{ x: 'left', y: 'bottom' }} />
      <PlacedArt piece={homeArt.challengeGift} card={card} k={k} anchor={{ x: 'right', y: 'bottom' }} />
      <PlacedArt piece={homeArt.lantern} card={card} k={k} anchor={{ x: 'left', y: 'top' }} />

      <View
        style={{
          paddingTop: l.cardPad,
          paddingLeft: (lantern.x - card.x + lantern.w) * k + 14,
          paddingRight: l.cardPad,
        }}
      >
        <Text className="font-lora-bold" numberOfLines={1} style={{ ...t.title, color: c.ink }}>
          Daily Challenges
        </Text>
        <Text className="font-lora" numberOfLines={2} style={{ ...t.body, color: c.subtle, marginTop: 2 }}>
          {reward === 'claimed'
            ? 'All done for today — reward collected!'
            : `Complete ${steps.length} challenges to earn a reward!`}
        </Text>
      </View>

      {/* The path: a soft brush stroke joining the rings, then the steps on it. */}
      <View style={{ height: STEP_RING + 6 + labelSize * 2.7 + 8 + CHECK + l.cardPad, marginTop: 8 }}>
        <Svg
          pointerEvents="none"
          width={width}
          height={STEP_RING}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <Path
            d={`M ${30 * k} ${STEP_RING / 2 + 2} C ${first + pitch * 0.5} ${STEP_RING / 2 - 7}, ${
              first + pitch * 1.2
            } ${STEP_RING / 2 + 9}, ${(first + last) / 2} ${STEP_RING / 2} S ${last + 30 * k} ${STEP_RING / 2 - 6}, ${
              550 * k
            } ${STEP_RING / 2 + 1}`}
            stroke={c.stepTrack}
            strokeOpacity={0.55}
            strokeWidth={11}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>

        {steps.map((step, i) => (
          <View
            key={step.id}
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, left: centre(i) - slot / 2, width: slot, alignItems: 'center' }}
          >
            <View
              style={{
                width: STEP_RING,
                height: STEP_RING,
                borderRadius: STEP_RING / 2,
                borderWidth: 2,
                borderColor: step.done ? c.greenRing : c.stepRing,
                backgroundColor: step.done ? c.greenSoft : c.white,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text className="font-lora-bold" style={{ fontSize: 15, color: step.done ? c.greenInk : c.ink }}>
                {i + 1}
              </Text>
            </View>
            <Text
              className="font-lora"
              numberOfLines={1}
              style={{ fontSize: labelSize, lineHeight: labelSize * 1.35, color: c.ink, marginTop: 6, textAlign: 'center' }}
            >
              {step.verb}
            </Text>
            <Text
              className="font-lora"
              numberOfLines={1}
              style={{ fontSize: labelSize, lineHeight: labelSize * 1.35, color: c.ink, textAlign: 'center' }}
            >
              {step.detail}
            </Text>
            <View
              style={{
                marginTop: 8,
                width: CHECK,
                height: CHECK,
                borderRadius: CHECK / 2,
                borderWidth: step.done ? 0 : 1.5,
                borderColor: c.checkRing,
                backgroundColor: step.done ? c.green : c.white,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {step.done && <Check size={13} color={c.white} strokeWidth={3} />}
            </View>
          </View>
        ))}
      </View>

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: pillCentreX - pillWidth / 2,
          bottom: pillCentreFromBottom - pillHeight / 2,
          width: pillWidth,
          height: pillHeight,
          borderRadius: pillHeight / 2,
          backgroundColor: c.goldPill,
          borderWidth: 1,
          borderColor: c.goldPillLine,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: reward === 'claimed' ? 0.75 : 1,
        }}
      >
        <Text className={reward === 'ready' ? 'font-lora-bold' : 'font-lora'} style={{ fontSize: 12.5, color: c.goldPillInk }}>
          {reward === 'ready' ? 'Claim reward' : reward === 'claimed' ? 'Claimed ✓' : 'Earn reward'}
        </Text>
      </View>
    </DashboardCard>
  )
}

// --- This week ------------------------------------------------------------------

const DAY = 24
/** Left gutter carrying the chart's word counts; the day strip is inset by it too, so columns line up. */
const GUTTER = 22
/** The plot box, and where its top gridline and zero baseline sit inside it. */
const PLOT_H = 64
const PLOT_TOP = 6
const PLOT_BASE = 58

/**
 * The top of the axis. Every step is even, so the middle gridline is a whole
 * number of words, and the floor of 4 keeps a one-word week from drawing as a
 * full-height mountain.
 */
const AXIS_STEPS = [4, 6, 8, 10, 12, 16, 20, 24, 30, 40, 50, 60, 80, 100]
function axisMax(peak: number): number {
  for (const step of AXIS_STEPS) if (peak <= step) return step
  return Math.ceil(peak / 50) * 50
}

/** A gentle Catmull-Rom curve through the days — gentle, so it never dips below zero between a peak and an idle day. */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

export function WeekCard({ week, width, onPress }: { week: WeekDay[]; width: number; onPress: () => void }) {
  const activeDays = week.filter((d) => d.active).length
  const words = week.reduce((sum, d) => sum + d.wordsLearned, 0)

  const pad = l.cardPad + 2
  /* Seven columns shared by the day strip and the chart under it. */
  const plotWidth = width - 2 - pad * 2 - GUTTER
  const pitch = plotWidth / 7

  /* The line stops at today: running it along zero to Sunday would draw days not yet lived as days missed. */
  const max = axisMax(Math.max(0, ...week.filter((d) => !d.isFuture).map((d) => d.wordsLearned)))
  const ticks = [max, max / 2, 0]
  const yFor = (value: number) => PLOT_BASE - (value / max) * (PLOT_BASE - PLOT_TOP)
  const points = week
    .map((day, i) => ({ day, i }))
    .filter(({ day }) => !day.isFuture)
    .map(({ day, i }) => ({ x: (i + 0.5) * pitch, y: yFor(day.wordsLearned), isToday: day.isToday }))
  const line = smoothPath(points)
  const area =
    points.length > 1
      ? `${line} L ${points[points.length - 1].x.toFixed(1)} ${PLOT_BASE} L ${points[0].x.toFixed(1)} ${PLOT_BASE} Z`
      : ''

  return (
    <DashboardCard
      fill={homeSurfaces.week.fill}
      border={homeSurfaces.week.border}
      onPress={onPress}
      accessibilityRole="none"
      accessibilityLabel={`This week: ${activeDays} active ${activeDays === 1 ? 'day' : 'days'}, ${words} words learned.`}
    >
      <View style={{ padding: pad }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconDisc size={40}>
            <ChartNoAxesColumn size={20} color={c.greenInk} strokeWidth={2.6} />
          </IconDisc>
          <View style={{ flex: 1 }}>
            <Text className="font-lora-bold" numberOfLines={1} style={{ ...t.title, color: c.ink }}>
              This Week
            </Text>
            <Text className="font-lora" numberOfLines={1} style={{ ...t.body, color: c.subtle, marginTop: 2 }}>
              {activeDays} active {activeDays === 1 ? 'day' : 'days'} • {words} {words === 1 ? 'word' : 'words'} learned
            </Text>
          </View>
        </View>

        {/* The days: a letter over a ring, filled for a day with any study. */}
        <View pointerEvents="none" style={{ flexDirection: 'row', marginLeft: GUTTER, marginTop: 14 }}>
          {week.map((day) => (
            <View key={day.date} style={{ width: pitch, alignItems: 'center' }}>
              <Text
                className={day.isToday ? 'font-lora-bold' : 'font-lora'}
                style={{ ...t.label, color: day.isToday || day.active ? c.greenInk : c.muted }}
              >
                {day.letter}
              </Text>
              <View
                style={{
                  marginTop: 6,
                  width: DAY,
                  height: DAY,
                  borderRadius: DAY / 2,
                  backgroundColor: day.active ? c.green : 'transparent',
                  borderWidth: day.active ? 0 : day.isToday ? 2 : 1.3,
                  borderColor: day.isToday ? c.green : c.greenRing,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {day.active && <Check size={14} color={c.white} strokeWidth={3} />}
              </View>
            </View>
          ))}
        </View>

        {/* Words learned per day, as a line under the same seven columns. */}
        <View
          style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 14, marginBottom: 4 }}
        >
          <Text className="font-lora" style={{ ...t.label, color: c.muted }}>
            Words learned per day
          </Text>
          <Text className="font-lora-bold" style={{ ...t.label, color: c.subtle }}>
            {words} this week
          </Text>
        </View>
        <View pointerEvents="none" style={{ height: PLOT_H }}>
          {/* The counts are RN text over the gutter, not SVG text, so they share the card's font. */}
          {ticks.map((value) => (
            <Text
              key={value}
              className="font-lora"
              style={{
                position: 'absolute',
                left: 0,
                width: GUTTER - 6,
                top: yFor(value) - 7,
                textAlign: 'right',
                fontSize: 10,
                lineHeight: 14,
                color: c.muted,
              }}
            >
              {value}
            </Text>
          ))}
          <Svg width={plotWidth} height={PLOT_H} style={{ marginLeft: GUTTER }}>
            <Defs>
              <LinearGradient id="homeWeekFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={c.green} stopOpacity={0.28} />
                <Stop offset="1" stopColor={c.green} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>
            {/* Dashed reference lines above, a solid baseline at zero. */}
            {ticks.map((value) => (
              <Line
                key={value}
                x1={0}
                x2={plotWidth}
                y1={yFor(value)}
                y2={yFor(value)}
                stroke={value === 0 ? c.greenRing : c.greenTrack}
                strokeWidth={1}
                strokeDasharray={value === 0 ? undefined : '2 4'}
              />
            ))}
            {area ? <Path d={area} fill="url(#homeWeekFill)" /> : null}
            {line ? (
              <Path d={line} stroke={c.green} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ) : null}
            {points.map((p) => (
              <Circle
                key={p.x}
                cx={p.x}
                cy={p.y}
                r={p.isToday ? 4 : 2.6}
                fill={c.green}
                stroke={c.white}
                strokeWidth={p.isToday ? 2 : 1.4}
              />
            ))}
          </Svg>
        </View>
      </View>
    </DashboardCard>
  )
}
