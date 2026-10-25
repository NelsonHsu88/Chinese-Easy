import type { ReactNode } from 'react'
import { View, Text, Image } from 'react-native'
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg'
import { ArrowRight, Check, ChartNoAxesColumn, ChevronRight, Lock, RotateCcw, Waypoints } from 'lucide-react-native'
import { CardArt, DASH_LIFT, DashboardCard, LiftedFace, PressableScale } from './parts'
import { homeArt, homeRefCards } from './art'
import { homeColors as c, homeSurfaces, homeType as t, homeLayout as l } from './tokens'
import type { VocabWord, PhoneticScript, ScriptMode } from '../../types'
import type { WeekDay } from '../../lib/progress'
import { displayWord, displayPinyin, hanziFont } from '../../lib/hanzi'
import { shortGloss } from '../../lib/definitions'
import { tapHaptic } from '../../lib/haptics'
import { SpeakChip } from '../dictionary/DictionaryControls'

/*
 * The four cards of Home, each across the full column: Review, the word on
 * offer, Daily Challenges and This Week.
 *
 * The refinement pass gave them one hierarchy. The hero carries the big
 * painting; Review keeps a smaller one; the word card's range is a pale
 * atmosphere behind the word; Daily Challenges has one gift; This Week has
 * none. Every button is the same shape (`HomeButton`): one height, one radius,
 * a thin lower edge instead of a raised shoulder.
 *
 * Each card's watercolour was cut from the mockup (`homeArt`) and is placed by
 * the mockup's own offsets, scaled from that card's reference width
 * (`homeRefCards`) to the real one — so a corner of scenery stays tucked into
 * its corner at any column width. (Review is the exception: its painting is
 * sized to the card's height — see the Review section.)
 */

/**
 * Home's raised button, back by request: a face standing on a deeper shoulder
 * that sinks when pressed (`LiftedFace`), in the original lighter coral and
 * green. Secondary is a white face on a quiet grey shoulder.
 */
function HomeButton({
  label,
  variant = 'primary',
  tone = 'jade',
  icon,
}: {
  label: string
  variant?: 'primary' | 'secondary'
  tone?: 'jade' | 'coral'
  icon?: ReactNode
}) {
  const primary = variant === 'primary'
  const fill = !primary ? c.white : tone === 'coral' ? c.coral : c.green
  const shoulder = !primary ? c.quietShoulder : tone === 'coral' ? c.coralShoulder : c.greenShoulder
  return (
    <LiftedFace height={l.buttonHeight} fill={fill} shoulder={shoulder} border={primary ? undefined : c.quietLine} shadow={primary}>
      {/* iOS can shrink a label that won't fit; elsewhere the button's width is planned for it. */}
      <Text
        className="font-nunito-extrabold"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={{ ...t.button, color: primary ? c.white : c.ink, flexShrink: 1 }}
      >
        {label}
      </Text>
      {icon}
    </LiftedFace>
  )
}

function IconDisc({ size, fill = c.sageSoft, children }: { size: number; fill?: string; children: ReactNode }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: fill,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </View>
  )
}

// --- Review -------------------------------------------------------------------

/*
 * One card in two states, built from the same parts: surface, padding, the
 * section heading (icon disc + "Review", the same row as Today's Word's), the
 * Lora count/title and the line under it, and the 字 cards painted into the
 * bottom-right corner.
 *
 * Due: a coral review disc, "N words due", "Keep your streak alive!", the coral
 * Start Review button.
 *
 * Nothing due: a jade ✓ disc, "All caught up!", "No words due right now." No
 * button and no chevron. There is no practice-anyway action on
 * purpose: every review mode draws from due cards, so it would open an empty
 * session. The card itself still opens the Review tab, as before. This state is
 * shorter (no button), with its text centred in the height it keeps.
 *
 * The painting is as tall as the card. Its height is worked out from the
 * layout constants below rather than measured (`onLayout` isn't reliable on
 * web), and the card's `minHeight` is that same number, so the two always
 * agree; larger system text can still grow the card, and the painting stays
 * pinned to the bottom. The PNG has almost no transparent margin, so its
 * sparse left strip (the edges of the back cards, a stone) tucks under the
 * text side behind a fade in the card's own colour. The 字 card itself never
 * sits under text: on a narrow phone the painting shrinks instead.
 */

/** Inside the Review card, both states — the same inset as Today's Word. */
const REVIEW_PAD = l.cardPad + 2
/** The heading row's icon disc (Today's Word's size), and the gaps in the text stack. */
const REVIEW_HEADING_H = 32
const REVIEW_GAP = { headingToTitle: 14, titleToBody: 4, bodyToButton: 16 } as const
/** The widest the Start Review button gets; it sits left, as in the reference. */
const REVIEW_BUTTON_MAX = 190
/**
 * The narrowest the text column may get before the painting gives way: room for
 * "12 words due" and the button, or for "No words due right now." on one line.
 */
const REVIEW_COLUMN_MIN = { due: 150, done: 172 } as const
/** Between the text column and the protected part of the painting. */
const REVIEW_ART_GAP = 8
/** How much of the painting's width, from its left, may lie under the faded text side. */
const REVIEW_ART_TUCK = 0.28
/** The resting state keeps a little more height than its text needs, so it isn't a sliver. */
const REVIEW_DONE_MIN = 132

const REVIEW_ART_RATIO = homeArt.review.box.w / homeArt.review.box.h

/** The text stack every state shares: heading row, title, the line under it. */
const REVIEW_TEXT_H = REVIEW_HEADING_H + REVIEW_GAP.headingToTitle + t.due.lineHeight + REVIEW_GAP.titleToBody + t.body.lineHeight

/** The card's planned height in each state, borders included. */
function reviewCardHeight(due: boolean): number {
  const text = REVIEW_PAD * 2 + REVIEW_TEXT_H + 2
  return due ? text + REVIEW_GAP.bodyToButton + l.buttonHeight + DASH_LIFT : Math.max(text, REVIEW_DONE_MIN)
}

/** The painting's size and the text column it leaves, at this card width. */
function reviewLayout(width: number, due: boolean) {
  const height = reviewCardHeight(due)
  /* Full card height, unless that would push the text column under its floor. */
  const columnMin = REVIEW_COLUMN_MIN[due ? 'due' : 'done']
  const roomForArt = (width - REVIEW_PAD - REVIEW_ART_GAP - columnMin) / (1 - REVIEW_ART_TUCK)
  const artW = Math.max(0, Math.min(height * REVIEW_ART_RATIO, roomForArt))
  const artLeft = width - artW
  const column = artLeft + artW * REVIEW_ART_TUCK - REVIEW_ART_GAP - REVIEW_PAD
  return { height, artW, artH: artW / REVIEW_ART_RATIO, artLeft, column }
}

export function ReviewCard({ dueCount, width, onPress }: { dueCount: number; width: number; onPress: () => void }) {
  const due = dueCount > 0
  const { height, artW, artH, artLeft, column } = reviewLayout(width, due)
  const words = `${dueCount} ${dueCount === 1 ? 'word' : 'words'}`
  /* The fade runs from the text side's solid fill to clear, ending a little past the tuck. */
  const fadeW = artW * (REVIEW_ART_TUCK + 0.1)

  return (
    <DashboardCard
      fill={homeSurfaces.review.fill}
      border={homeSurfaces.review.border}
      minHeight={height}
      onPress={onPress}
      accessibilityLabel={
        due ? `Start review, ${words} due` : 'Review complete. All caught up, no words due right now. Opens Review.'
      }
    >
      <CardArt
        source={homeArt.review.source}
        ratio={REVIEW_ART_RATIO}
        width={artW}
        style={{ right: 0, bottom: 0 }}
      />
      <View pointerEvents="none" style={{ position: 'absolute', left: artLeft, bottom: 0, width: fadeW, height: artH }}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="reviewArtFade" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={homeSurfaces.review.fill} stopOpacity={1} />
              <Stop offset="0.55" stopColor={homeSurfaces.review.fill} stopOpacity={0.55} />
              <Stop offset="1" stopColor={homeSurfaces.review.fill} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#reviewArtFade)" />
        </Svg>
      </View>

      <View style={{ flexGrow: 1, justifyContent: 'center', padding: REVIEW_PAD }}>
        {/* The section heading, built like Today's Word's: disc, 10pt, Lora Bold title. */}
        <View style={{ width: column, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {due ? (
            <IconDisc size={REVIEW_HEADING_H} fill={c.tagFill}>
              <RotateCcw size={16} color={c.coral} strokeWidth={2.4} />
            </IconDisc>
          ) : (
            /* The same coral disc as the due state: a finished review stays the red card. */
            <IconDisc size={REVIEW_HEADING_H} fill={c.tagFill}>
              <Check size={16} color={c.coral} strokeWidth={2.6} />
            </IconDisc>
          )}
          <Text className="font-nunito-extrabold" numberOfLines={1} style={{ ...t.title, color: c.ink, flexShrink: 1 }}>
            Review
          </Text>
        </View>

        <View style={{ width: column }}>
          <Text
            className="font-nunito-extrabold"
            numberOfLines={2}
            style={{ ...t.due, color: c.ink, marginTop: REVIEW_GAP.headingToTitle }}
          >
            {due ? `${words} due` : 'All caught up!'}
          </Text>
          {/* Reviews do count: grading a card registers the day's activity (AppContext `gradeCard`). */}
          <Text
            className="font-nunito-semibold"
            numberOfLines={2}
            style={{ ...t.body, color: c.subtle, marginTop: REVIEW_GAP.titleToBody }}
          >
            {due ? 'Keep your streak alive!' : 'No words due right now.'}
          </Text>
        </View>

        {due && (
          /* The whole card is the button, so this is a face, not a second target. A little
             short of the column: the painting's lowest blossoms reach in at the bottom. */
          <View style={{ width: Math.min(column - 8, REVIEW_BUTTON_MAX), marginTop: REVIEW_GAP.bodyToButton }}>
            <HomeButton label="Start Review" tone="coral" icon={<ArrowRight size={17} color={c.white} strokeWidth={2.5} />} />
          </View>
        )}
      </View>
    </DashboardCard>
  )
}

// --- The word on offer ----------------------------------------------------------

/** The range behind the word: present as atmosphere, well behind the type. */
const WORD_ART_OPACITY = 0.5

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
  /** "Skip word" — or, once the word is added, on to the next one. */
  onSkip: () => void
}) {
  const card = homeRefCards.word
  const k = width / card.w
  /* The word sits over the left of the range, as in the mockup. */
  const range = homeArt.wordRange.box
  const wordColumn = (range.x - card.x + 30) * k

  const shown = word ? displayWord(word, script) : ''
  const speaker = 40
  /* CJK sizes come from width and character count — adjustsFontSizeToFit is iOS-only. */
  const hanziSize = Math.min(42, (wordColumn - l.cardPad - speaker - 10) / Math.max(1, Array.from(shown).length))

  return (
    <DashboardCard
      fill={homeSurfaces.word.fill}
      border={homeSurfaces.word.border}
      onPress={onSeeAll}
      accessibilityLabel={word ? `Today's word: ${shown}, ${shortGloss(word)}. Open new words.` : 'Open new words'}
      accessibilityRole="none"
    >
      {/* The range rests on the button row, faded back so the word reads first. */}
      <CardArt
        source={homeArt.wordRange.source}
        ratio={range.w / range.h}
        width={range.w * k}
        opacity={WORD_ART_OPACITY}
        style={{ right: (card.x + card.w - (range.x + range.w)) * k, bottom: l.cardPad + 2 + l.buttonHeight }}
      />

      <View style={{ padding: l.cardPad + 2 }}>
        {/* For screen readers this row is the card's own "open New Words" action: the card stops
            grouping its children (so its buttons are reachable), which leaves the row to carry it. */}
        <View
          accessible
          accessibilityRole="button"
          accessibilityLabel={word ? `Today's word: ${shown}, ${shortGloss(word)}. Open new words.` : "Today's word. Open new words."}
          accessibilityActions={[{ name: 'activate' }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'activate') onSeeAll()
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <IconDisc size={32}>
            <Waypoints size={16} color={c.jade} strokeWidth={2.2} />
          </IconDisc>
          <Text className="font-nunito-extrabold" numberOfLines={1} style={{ ...t.title, color: c.ink, flex: 1 }}>
            Today’s Word
          </Text>
        </View>

        {/* The finished state has no hanzi to size against, so it takes the card's width: in the word
            column alone, "Today's words done" broke one word per line. */}
        <View style={{ justifyContent: 'center', paddingVertical: 12, minHeight: 96, width: word ? wordColumn : undefined }}>
          {word ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text
                  className={hanziFont(script, 'semibold')}
                  style={{ fontSize: hanziSize, lineHeight: hanziSize * 1.3, color: c.ink, includeFontPadding: false }}
                >
                  {shown}
                </Text>
                {/* The dictionary word card's speaker, so every word's audio button is one object. */}
                <SpeakChip text={word.simplified} size={speaker} />
              </View>
              {/* Pinyin or zhuyin, by the learner's setting. */}
              <Text className="font-nunito-semibold" style={{ ...t.pinyin, color: c.subtle, marginTop: 4 }}>
                {displayPinyin(word, phoneticScript)}
              </Text>
              {/* Regular weight, set as a style so every platform agrees. */}
              <Text numberOfLines={2} style={{ ...t.gloss, fontFamily: 'NunitoSemiBold', color: c.ink, marginTop: 2 }}>
                {shortGloss(word)}
              </Text>
            </>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconDisc size={44}>
                <Check size={22} color={c.jade} strokeWidth={2.6} />
              </IconDisc>
              <View style={{ flex: 1 }}>
                <Text className="font-nunito-extrabold" style={{ ...t.pinyin, color: c.ink }}>
                  Today’s words done
                </Text>
                <Text className="font-nunito-semibold" style={{ ...t.body, color: c.subtle, marginTop: 2 }}>
                  {wordsToday} new {wordsToday === 1 ? 'word' : 'words'} today
                </Text>
              </View>
            </View>
          )}
        </View>

        {word ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PressableScale
              onPress={() => {
                tapHaptic()
                onSkip()
              }}
              accessibilityLabel={added ? 'Next word' : `Skip ${shown}. It won't be offered again.`}
              wrapperStyle={{ flex: 0.72 }}
            >
              <HomeButton label={added ? 'Next word' : 'Skip word'} variant="secondary" />
            </PressableScale>
            <PressableScale onPress={onAdd} accessibilityLabel={added ? `${shown} added to your words` : `Learn ${shown}: add it to your review deck`} wrapperStyle={{ flex: 1 }}>
              <HomeButton label={added ? 'Added ✓' : 'Learn this word'} />
            </PressableScale>
          </View>
        ) : (
          <PressableScale onPress={onSeeAll} accessibilityLabel="See new words">
            <HomeButton label="See new words" />
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
  /** Second line: "5 words". */
  detail: string
  done: boolean
}

export type RewardState = 'locked' | 'ready' | 'claimed'

const STEP_RING = 28
const TRACK = 3
/** The reward row's gift: the whole painting, centred on a gold-washed tile
    shaped like it, with the same margin on every side. */
const GIFT_WIDTH = 44
const GIFT_PAD = 5

/**
 * Four rings on one straight track, each a number until its challenge is done
 * and a check after; a "1 of 4 completed" line says the same in words. Under
 * them, the reward: the gift, what it is, and whether it's locked, waiting to
 * be claimed or collected. The card opens Challenges, where claiming happens,
 * so the reward chip is a status, not a second button.
 */
export function ChallengesCard({
  steps,
  reward,
  xpReward,
  width,
  onPress,
}: {
  steps: ChallengeStep[]
  reward: RewardState
  /** The completion reward's XP. */
  xpReward: number
  width: number
  onPress: () => void
}) {
  const pad = l.cardPad + 2
  const doneCount = steps.filter((s) => s.done).length
  /* The steps reach halfway into the card's padding: "5 characters" needs every point on a narrow phone. */
  const stepsInset = pad / 2
  const slot = (width - 2 - stepsInset * 2) / Math.max(1, steps.length)
  const centre = (i: number) => slot * (i + 0.5)
  const gift = homeArt.challengeGift.box
  const rewardLine =
    reward === 'claimed'
      ? `+${xpReward} XP collected today`
      : reward === 'ready'
        ? `+${xpReward} XP is waiting for you`
        : `+${xpReward} XP when all ${steps.length} are done`

  return (
    <DashboardCard
      fill={homeSurfaces.challenges.fill}
      border={homeSurfaces.challenges.border}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Daily challenges, ${doneCount} of ${steps.length} completed. Daily reward ${
        reward === 'claimed' ? 'claimed' : reward === 'ready' ? 'ready to claim' : 'locked'
      }. Open challenges.`}
    >
      <View style={{ padding: pad }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text className="font-nunito-extrabold" numberOfLines={1} style={{ ...t.title, color: c.ink }}>
              Daily Challenges
            </Text>
            <Text className="font-nunito-semibold" numberOfLines={1} style={{ ...t.body, color: c.subtle, marginTop: 2, fontVariant: ['tabular-nums'] }}>
              {doneCount} of {steps.length} completed
            </Text>
          </View>
          <ChevronRight size={20} color={c.muted} strokeWidth={2} />
        </View>

        {/* The steps: a straight track behind the rings, sage between two finished neighbours. */}
        <View pointerEvents="none" style={{ marginTop: 16, marginHorizontal: stepsInset - pad }}>
          <View style={{ position: 'absolute', top: STEP_RING / 2 - TRACK / 2, left: 0, right: 0, height: TRACK }}>
            {steps.slice(0, -1).map((step, i) => (
              <View
                key={step.id}
                style={{
                  position: 'absolute',
                  left: centre(i),
                  width: slot,
                  height: TRACK,
                  backgroundColor: step.done && steps[i + 1].done ? c.sage : c.track,
                }}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row' }}>
            {steps.map((step, i) => (
              <View key={step.id} style={{ width: slot, alignItems: 'center' }}>
                <View
                  style={{
                    width: STEP_RING,
                    height: STEP_RING,
                    borderRadius: STEP_RING / 2,
                    borderWidth: step.done ? 0 : 1.5,
                    borderColor: c.idle,
                    backgroundColor: step.done ? c.sage : c.white,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {step.done ? (
                    <Check size={15} color={c.white} strokeWidth={3} />
                  ) : (
                    <Text className="font-nunito-extrabold" style={{ fontSize: 13, color: c.subtle }}>
                      {i + 1}
                    </Text>
                  )}
                </View>
                <Text
                  className="font-nunito-extrabold"
                  numberOfLines={2}
                  style={{ ...t.label, color: step.done ? c.jade : c.ink, marginTop: 6, textAlign: 'center' }}
                >
                  {step.verb}
                </Text>
                <Text className="font-nunito-semibold" numberOfLines={2} style={{ ...t.label, color: c.subtle, textAlign: 'center', paddingHorizontal: 2 }}>
                  {step.detail}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* The reward, under a hairline: the one illustration on this card. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginTop: 14,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: homeSurfaces.challenges.border,
          }}
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ opacity: reward === 'claimed' ? 0.6 : 1 }}
          >
            <View style={{ padding: GIFT_PAD, borderRadius: 14, backgroundColor: c.goldWash }}>
              <Image
                source={homeArt.challengeGift.source}
                style={{ width: GIFT_WIDTH, height: Math.round(GIFT_WIDTH / (gift.w / gift.h)) }}
                resizeMode="contain"
              />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text className="font-nunito-extrabold" numberOfLines={1} style={{ fontSize: 14.5, lineHeight: 19, color: c.ink }}>
              Daily reward
            </Text>
            <Text className="font-nunito-semibold" numberOfLines={2} style={{ ...t.label, fontSize: 12.5, color: c.subtle }}>
              {rewardLine}
            </Text>
          </View>
          <RewardChip state={reward} />
        </View>
      </View>
    </DashboardCard>
  )
}

/** Locked (neutral, a padlock), ready (gold — the one warm call on the card), claimed (sage, a check). */
function RewardChip({ state }: { state: RewardState }) {
  const look =
    state === 'ready'
      ? { fill: c.goldWash, border: c.gold, ink: c.goldInk, label: 'Claim reward' }
      : state === 'claimed'
        ? { fill: c.sageSoft, border: c.greenLine, ink: c.jade, label: 'Claimed' }
        : { fill: c.ivory, border: c.hairline, ink: c.subtle, label: 'Locked' }
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        minHeight: 30,
        paddingVertical: 4,
        paddingHorizontal: 11,
        borderRadius: 15,
        backgroundColor: look.fill,
        borderWidth: 1,
        borderColor: look.border,
      }}
    >
      {state === 'locked' && <Lock size={13} color={look.ink} strokeWidth={2.2} />}
      {state === 'claimed' && <Check size={14} color={look.ink} strokeWidth={2.6} />}
      <Text className="font-nunito-extrabold" style={{ fontSize: 13, color: look.ink }}>
        {look.label}
      </Text>
      {state === 'ready' && <ChevronRight size={14} color={look.ink} strokeWidth={2.4} />}
    </View>
  )
}

// --- This week ------------------------------------------------------------------

const DAY = 26
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Oct 13 – 19", or "Sep 29 – Oct 5" across a month boundary. From the week's own ISO dates — no clock or timezone of its own. */
function weekRange(week: WeekDay[]): string {
  if (week.length === 0) return ''
  const parse = (iso: string) => {
    const [, m, d] = iso.split('-').map(Number)
    return { m: m - 1, d }
  }
  const a = parse(week[0].date)
  const b = parse(week[week.length - 1].date)
  return a.m === b.m ? `${MONTHS[a.m]} ${a.d} – ${b.d}` : `${MONTHS[a.m]} ${a.d} – ${MONTHS[b.m]} ${b.d}`
}

export function WeekCard({ week, width, onPress }: { week: WeekDay[]; width: number; onPress: () => void }) {
  const activeDays = week.filter((d) => d.active).length
  const words = week.reduce((sum, d) => sum + d.wordsLearned, 0)
  const range = weekRange(week)

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
      accessibilityRole="button"
      accessibilityLabel={`This week, ${range}: ${activeDays} active ${activeDays === 1 ? 'day' : 'days'}, ${words} ${
        words === 1 ? 'word' : 'words'
      } learned. Open progress.`}
    >
      <View style={{ padding: pad }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconDisc size={36}>
            <ChartNoAxesColumn size={18} color={c.jade} strokeWidth={2.6} />
          </IconDisc>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text className="font-nunito-extrabold" numberOfLines={1} style={{ ...t.title, color: c.ink }}>
                This Week
              </Text>
              <Text className="font-nunito-semibold" numberOfLines={1} style={{ ...t.label, color: c.muted, flexShrink: 1 }}>
                {range}
              </Text>
            </View>
            <Text className="font-nunito-semibold" numberOfLines={1} style={{ ...t.body, color: c.subtle, marginTop: 2 }}>
              {activeDays} active {activeDays === 1 ? 'day' : 'days'} · {words} {words === 1 ? 'word' : 'words'} learned
            </Text>
          </View>
        </View>

        {/* The days: studied is a filled check, today an outline in jade, the rest a quiet ring. */}
        <View pointerEvents="none" style={{ flexDirection: 'row', marginLeft: GUTTER, marginTop: 14 }}>
          {week.map((day) => (
            <View key={day.date} style={{ width: pitch, alignItems: 'center' }}>
              <Text
                className={day.isToday ? 'font-nunito-extrabold' : 'font-nunito-semibold'}
                style={{ ...t.label, color: day.isToday ? c.jade : c.muted }}
              >
                {day.letter}
              </Text>
              <View
                style={{
                  marginTop: 6,
                  width: DAY,
                  height: DAY,
                  borderRadius: DAY / 2,
                  backgroundColor: day.active ? c.sage : c.white,
                  borderWidth: day.active ? 0 : day.isToday ? 2 : 1.3,
                  borderColor: day.isToday ? c.jade : c.idle,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {day.active && <Check size={14} color={c.white} strokeWidth={3} />}
              </View>
            </View>
          ))}
        </View>

        {words === 0 ? (
          /* No chart of zeros: a line saying what will appear here, and how to start it. */
          <View
            style={{
              marginTop: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: c.white,
              borderWidth: 1,
              borderColor: homeSurfaces.week.border,
            }}
          >
            <Text className="font-nunito-extrabold" style={{ ...t.body, color: c.ink }}>
              No new words yet this week
            </Text>
            <Text className="font-nunito-semibold" style={{ ...t.label, fontSize: 12.5, lineHeight: 17, color: c.subtle, marginTop: 2 }}>
              Learn one today and your words-per-day chart starts here.
            </Text>
          </View>
        ) : (
          <>
            <Text className="font-nunito-semibold" style={{ ...t.label, color: c.muted, marginTop: 14, marginBottom: 4 }}>
              Words learned per day
            </Text>
            <View pointerEvents="none" style={{ height: PLOT_H }}>
              {/* The counts are RN text over the gutter, not SVG text, so they share the card's font. */}
              {ticks.map((value) => (
                <Text
                  key={value}
                  className="font-nunito-semibold"
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
                    <Stop offset="0" stopColor={c.sage} stopOpacity={0.26} />
                    <Stop offset="1" stopColor={c.sage} stopOpacity={0.02} />
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
                    stroke={value === 0 ? c.idle : c.track}
                    strokeWidth={1}
                    strokeDasharray={value === 0 ? undefined : '2 4'}
                  />
                ))}
                {area ? <Path d={area} fill="url(#homeWeekFill)" /> : null}
                {line ? (
                  <Path d={line} stroke={c.sage} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ) : null}
                {points.map((p) => (
                  <Circle
                    key={p.x}
                    cx={p.x}
                    cy={p.y}
                    r={p.isToday ? 4 : 2.6}
                    fill={c.sage}
                    stroke={c.white}
                    strokeWidth={p.isToday ? 2 : 1.4}
                  />
                ))}
              </Svg>
            </View>
          </>
        )}
      </View>
    </DashboardCard>
  )
}
