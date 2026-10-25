import type { ReactNode } from 'react'
import { View, Text, Image, Animated } from 'react-native'
import { Check, ChevronRight, Clock, Star } from 'lucide-react-native'
import { LiftedFace, PressableScale } from '../dashboard/parts'
/* The entrance machinery is shared with the Dashboard and Review rather than
   reimplemented — same `Animated`-not-Reanimated constraint, same hidden-tab
   backstop. Only the timings differ, and those live in `chalEntrance`. */
import { useReveal } from '../dashboard/entrance'
import { RaisedProgressBar } from '../progress/RaisedProgressBar'
import type { WeekDay } from '../../lib/progress'
import type { ChallengeScene } from '../../lib/challenges'
import { chalArt, SCENE_ART, FIRE_RATIO } from './art'
import {
  chalColors as c,
  chalPalette as p,
  chalSceneTint,
  chalSpacing as s,
  chalType as t,
  chalRadius,
  chalCard,
  chalReward,
  chalWeek,
  chalHero,
  chalEntrance,
  CHAL_CONTENT_MAX,
  CHAL_ART_RATIO,
} from './tokens'

/*
 * The Challenges screen's building blocks, built to the Beta 2.1 reference.
 *
 * Press response is the Dashboard's `PressableScale` — this screen is one tap
 * off that one — and nesting is safe only through it: a card is the target
 * that opens its challenge, and the Claim pill inside it is a second target.
 * `PressableScale` claims its press before the event bubbles (`PressClaim`),
 * so tapping Claim never also opens the challenge on web.
 */

/** Where a challenge stands, as far as the card is concerned. */
export type ChallengeCardState = 'open' | 'claimable' | 'claimed'

// --- Hero ---------------------------------------------------------------------

/**
 * Title and subtitle, and the painting behind them.
 *
 * The same composition as Review's hero: the painting is laid straight onto
 * the page, anchored to the hero's bottom right and bleeding off the screen
 * edge, so its bottom always meets the streak card that follows. Everything
 * textual is ordinary flow, so a wrapped subtitle grows the hero rather than
 * colliding with anything.
 *
 * Shifu and his speech bubble were taken off this screen at the learner's
 * request; the painting is the Profile screen's, which is the reference's
 * scene without him.
 */
export function ChallengesHero({ column, run }: { column: number; run: number }) {
  const artWidth = chalHero.artWidth * (column / CHAL_CONTENT_MAX)
  const artHeight = artWidth / chalHero.artRatio

  const art = useReveal({ from: 'right', at: chalEntrance.at, duration: chalEntrance.for, run, distance: chalEntrance.slideX })
  const text = useReveal({ from: 'bottom', at: chalEntrance.at, duration: chalEntrance.for, run, distance: chalEntrance.slideY })

  return (
    <View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', right: -s.screen, bottom: 0 }, art]}>
        <Image source={chalArt.hero} style={{ width: artWidth, height: artHeight }} resizeMode="contain" />
      </Animated.View>

      <Animated.View style={[text, { paddingBottom: s.xxl }]}>
        <Text className="font-nunito-extrabold" accessibilityRole="header" style={{ ...t.title, color: p.ink, marginTop: s.xs }}>
          Challenges
        </Text>
        <Text className="font-nunito-semibold" style={{ ...t.subtitle, fontSize: 15.5, lineHeight: 21, color: p.slate, marginTop: s.xs, maxWidth: '58%' }}>
          Build consistent habits{'\n'}and make progress together.
        </Text>
        {/* Room for the painting's lower half, which is where the pagoda
            stands; without it the streak card cuts it off at the roof. */}
        <View style={{ height: Math.max(0, artHeight * 0.45) }} />
      </Animated.View>
    </View>
  )
}

// --- Streak -------------------------------------------------------------------

/**
 * The streak, on its own across the whole card. The week strip that used to sit
 * at its right was taken off at the learner's request; `week` is still read for
 * today, which decides the note under the count.
 */
export function StreakCard({ streak, week }: { streak: number; week: WeekDay[] }) {
  const today = week.find((d) => d.isToday)
  const doneToday = today?.active ?? false
  const note = streak === 0 ? 'Start one today!' : doneToday ? 'Keep going!' : 'Study today to keep it.'

  return (
    <View
      accessible
      accessibilityLabel={`${streak} day streak. ${note}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: s.md,
        backgroundColor: p.page,
        borderRadius: chalRadius.large,
        borderWidth: 1,
        borderColor: p.border,
        paddingVertical: s.md + 2,
        paddingHorizontal: s.lg,
      }}
    >
      <View
        className="items-center justify-center"
        style={{ width: chalWeek.flame, height: chalWeek.flame, borderRadius: chalWeek.flame / 2, backgroundColor: c.peach }}
      >
        <Image source={chalArt.fire} style={{ width: 26 * FIRE_RATIO, height: 26 }} resizeMode="contain" />
      </View>
      <View style={{ flex: 1 }}>
        <Text className="font-nunito-extrabold" style={{ ...t.streakTitle, color: p.ink }}>
          {streak} day streak
        </Text>
        <Text className="font-nunito-semibold" style={{ ...t.streakSub, color: p.slate, marginTop: 2 }}>
          {note}
        </Text>
      </View>
    </View>
  )
}

// --- Tabs ---------------------------------------------------------------------

/**
 * Daily · Weekly · Special, as three separate pills rather than a segmented
 * track: the active one filled jade, the others a drawn outline. Raised like
 * every other button in the app (`LiftedFace`), so each one sinks when pressed.
 */
export function ShelfTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <View className="flex-row" style={{ gap: s.sm }} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.value === value
        return (
          <PressableScale
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityLabel={active ? `${option.label}, selected` : option.label}
            wrapperStyle={{ flex: 1 }}
          >
            <LiftedFace
              height={40}
              fill={active ? p.jade : p.page}
              shoulder={active ? p.jadeEdge : p.border}
              border={active ? undefined : p.border}
              shadow={false}
            >
              <Text className="font-nunito-extrabold" style={{ ...t.tab, color: active ? p.onJade : p.ink }}>
                {option.label}
              </Text>
            </LiftedFace>
          </PressableScale>
        )
      })}
    </View>
  )
}

// --- Section heading ----------------------------------------------------------

/** "Daily Challenges" — with the reset countdown at the right where there is one. */
export function SectionHeading({ title, resets }: { title: string; resets?: string }) {
  return (
    <View className="flex-row items-center justify-between" style={{ gap: s.md }}>
      <Text className="font-nunito-extrabold" accessibilityRole="header" style={{ ...t.section, color: p.ink, flexShrink: 1 }}>
        {title}
      </Text>
      {resets && (
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <Clock size={16} color={p.slate} strokeWidth={1.8} />
          <Text className="font-nunito-semibold" style={{ ...t.resets, color: p.slate }}>
            {resets}
          </Text>
        </View>
      )}
    </View>
  )
}

// --- Challenge card -----------------------------------------------------------

/**
 * One challenge: a painted scene on the left, a serif title, the task and its
 * count, a slim bar, the reward pill and a chevron.
 *
 * Two views rather than one, because iOS clips a shadow along with everything
 * else under `overflow: hidden`: the outer carries the shadow and the border,
 * the inner clips the painting to the rounded corners.
 */
/** Each challenge kind's card. The gift and streak scenes borrow the gold and rose cards. */
const SCENE_TINT: Record<ChallengeScene, (typeof chalSceneTint)[keyof typeof chalSceneTint]> = {
  words: chalSceneTint.words,
  writing: chalSceneTint.writing,
  listening: chalSceneTint.listening,
  review: chalSceneTint.review,
  gift: chalSceneTint.writing,
  streak: chalSceneTint.review,
}

export function ChallengeCard({
  title,
  description,
  scene,
  current,
  target,
  xpReward,
  state,
  width,
  onOpen,
  onClaim,
}: {
  title: string
  description: string
  scene: ChallengeScene
  current: number
  target: number
  xpReward: number
  state: ChallengeCardState
  /** The card's own width; the painting's share is measured off it. */
  width: number
  onOpen: () => void
  onClaim: () => void
}) {
  const artWidth = Math.round(width * chalCard.artShare)
  const fraction = target > 0 ? Math.min(1, current / target) : 0
  const claimable = state === 'claimable'
  const tint = SCENE_TINT[scene]

  return (
    <PressableScale
      onPress={onOpen}
      scaleTo={0.985}
      /* A card holding a real Claim button must not itself be a `<button>` on
         web — see `PressableScale`'s note on nested buttons. */
      accessibilityRole={claimable ? 'none' : 'button'}
      accessibilityLabel={`${title}. ${description} ${current} of ${target}. ${
        state === 'claimed' ? 'Reward claimed.' : `Reward ${xpReward} XP.`
      }`}
    >
      <View style={{ borderRadius: chalRadius.large, backgroundColor: tint.fill, borderWidth: 1, borderColor: tint.border }}>
        <View
          className="flex-row items-center"
          style={{ minHeight: chalCard.minHeight, borderRadius: chalRadius.large - 1, overflow: 'hidden' }}
        >
          <SceneArt scene={scene} width={artWidth} />

          <View style={{ flex: 1, marginLeft: artWidth * (1 - chalCard.textOverlap), paddingVertical: chalCard.paddingY }}>
            {/* No `numberOfLines`: a title that does not fit wraps onto a second
                line rather than ending in "…". A phone narrower than the design
                column, or a learner with larger system text, truncated
                "Listening Practice" and "Writing Practice". */}
            <Text className="font-nunito-extrabold" style={{ ...t.cardTitle, color: p.ink }}>
              {title}
            </Text>
            <Text className="font-nunito-semibold" numberOfLines={2} style={{ ...t.cardBody, color: p.slate, marginTop: 2 }}>
              {description}
            </Text>
            {/* The count sits at the end of its own bar rather than beside the
                description, as the reference has it: on a phone column that
                cost the description two extra lines. */}
            <View className="flex-row items-center" style={{ marginTop: 6, gap: s.sm }}>
              {/* The compact raised bar: a card holds it, so it's slimmer than a session header's. */}
              <RaisedProgressBar progress={fraction} size="compact" accessibilityLabel={`${title}: ${current} of ${target}`} />
              <Text className="font-nunito-semibold" style={{ ...t.count, color: p.ink, minWidth: 46, textAlign: 'right' }}>
                {current} / {target}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center" style={{ marginLeft: s.md, paddingRight: chalCard.paddingRight, gap: 2 }}>
            <RewardPill xp={xpReward} state={state} onClaim={onClaim} />
            <ChevronRight size={20} color={tint.accent} strokeWidth={1.8} />
          </View>
        </View>
      </View>
    </PressableScale>
  )
}

/**
 * The painting on a card's left: the whole render at the card's art width,
 * centred vertically, never cropped.
 *
 * A card is taller for its width than the reference's, so a box filled with
 * `cover` cropped the painting's sides — and its right-hand side is the
 * feathered fade into the text column, so what was left ended in a hard
 * vertical edge. Shown whole, the fade is intact and the text starts on it
 * (`chalCard.textOverlap`), the way the mockup's title sits on the mist.
 */
function SceneArt({ scene, width }: { scene: ChallengeScene; width: number }) {
  if (scene !== 'streak') {
    return (
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width, justifyContent: 'center' }}>
        <Image source={SCENE_ART[scene]} resizeMode="contain" style={{ width, height: width / CHAL_ART_RATIO.card }} />
      </View>
    )
  }
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width }}>
      <View className="flex-1 items-center justify-center">
        <View
          className="items-center justify-center"
          style={{ width: chalWeek.flame, height: chalWeek.flame, borderRadius: chalWeek.flame / 2, backgroundColor: c.peach }}
        >
          <Image source={chalArt.fire} style={{ width: 30 * FIRE_RATIO, height: 30 }} resizeMode="contain" />
        </View>
      </View>
    </View>
  )
}

/**
 * "★ +10". Three looks for three states: a gold wash while the reward is still
 * to be earned; jade and pressable once it is — the one thing on the card
 * asking to be tapped; and a quiet check once collected.
 */
export function RewardPill({
  xp,
  state,
  onClaim,
}: {
  xp: number
  state: ChallengeCardState
  onClaim?: () => void
}) {
  if (state === 'claimable') {
    return (
      <PressableScale onPress={onClaim} haptic={false} accessibilityLabel={`Claim ${xp} XP`}>
        {/* Raised, like the app's other buttons: it is the one thing on the
            card asking to be pressed. */}
        <LiftedFace height={32} fill={p.jade} shoulder={p.jadeEdge} shadow={false}>
          <View style={{ minWidth: 60, paddingHorizontal: s.md - 2, alignItems: 'center' }}>
            {/* "Claim" alone: the amount was on the gold pill a moment ago, and
                "Claim +10" is wide enough to truncate the card's title. */}
            <Text className="font-nunito-extrabold" style={{ ...t.reward, color: p.onJade }}>
              Claim
            </Text>
          </View>
        </LiftedFace>
      </PressableScale>
    )
  }

  if (state === 'claimed') {
    return (
      <Pill fill={p.track}>
        <Check size={15} color={p.slate} strokeWidth={2.6} />
        <Text className="font-nunito-extrabold" style={{ ...t.reward, color: p.slate }}>
          +{xp}
        </Text>
      </Pill>
    )
  }

  return (
    <Pill fill={p.goldWash}>
      <Star size={17} color={p.star} fill={p.star} strokeWidth={1.5} />
      <Text className="font-nunito-extrabold" style={{ ...t.reward, color: p.goldInk }}>
        +{xp}
      </Text>
    </Pill>
  )
}

function Pill({ fill, children }: { fill: string; children: ReactNode }) {
  return (
    <View
      className="flex-row items-center justify-center"
      style={{ height: 32, minWidth: 60, paddingHorizontal: s.md - 2, borderRadius: chalRadius.pill, backgroundColor: fill, gap: 5 }}
    >
      {children}
    </View>
  )
}

// --- Completion reward --------------------------------------------------------

/**
 * The bonus for finishing the whole set: the gift on the left, the sakura and
 * pagoda in the right-hand corner, and the reward pill sitting where the
 * painting's hill leaves room for it (the mockup's own pill was faded out of
 * that corner by `processChallengesArt.mjs`).
 */
export function CompletionRewardCard({
  title,
  description,
  xpReward,
  state,
  width,
  onClaim,
}: {
  title: string
  description: string
  xpReward: number
  state: ChallengeCardState
  width: number
  onClaim: () => void
}) {
  const giftWidth = Math.round(width * chalReward.giftShare)
  const cornerWidth = Math.round(width * chalReward.cornerShare)

  return (
    <View
      accessible={state !== 'claimable'}
      accessibilityLabel={`${title}. ${description} ${state === 'claimed' ? 'Reward claimed.' : `Reward ${xpReward} XP.`}`}
      style={{ borderRadius: chalRadius.large, backgroundColor: c.reward, borderWidth: 1, borderColor: p.border }}
    >
      <View className="flex-row items-center" style={{ minHeight: chalReward.minHeight, borderRadius: chalRadius.large - 1, overflow: 'hidden' }}>
        {/* Both shown whole, like the challenge cards' scenes, so neither
            loses its feathered edge to a `cover` crop. The gift is centred;
            the corner sits on the card's floor, where its hill belongs. */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: giftWidth, justifyContent: 'center' }}>
          <Image source={chalArt.gift} resizeMode="contain" style={{ width: giftWidth, height: giftWidth / CHAL_ART_RATIO.gift }} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', right: 0, bottom: 0 }}>
          <Image source={chalArt.corner} resizeMode="contain" style={{ width: cornerWidth, height: cornerWidth / CHAL_ART_RATIO.corner }} />
        </View>

        <View style={{ flex: 1, marginLeft: giftWidth * (1 - chalCard.textOverlap), paddingVertical: s.md }}>
          <Text className="font-nunito-semibold" style={{ ...t.rewardTitle, color: p.ink }}>
            {title}
          </Text>
          <Text className="font-nunito-semibold" style={{ ...t.cardBody, color: p.slate, marginTop: 3 }}>
            {description}
          </Text>
        </View>

        {/* Over the left of the corner painting, where its hill was cut away for it. */}
        <View style={{ marginLeft: s.sm, marginRight: Math.round(cornerWidth * 0.42) }}>
          <RewardPill xp={xpReward} state={state} onClaim={onClaim} />
        </View>
      </View>
    </View>
  )
}
