import type { ReactNode } from 'react'
import { View, Text, Image, Animated } from 'react-native'
import { Check, ChevronRight, Clock, Star } from 'lucide-react-native'
import { LiftedFace, PressableScale } from '../dashboard/parts'
/* The entrance machinery is shared with the Dashboard and Review rather than
   reimplemented — same `Animated`-not-Reanimated constraint, same hidden-tab
   backstop. Only the timings differ, and those live in `chalEntrance`. */
import { useReveal } from '../dashboard/entrance'
import type { WeekDay } from '../../lib/progress'
import type { ChallengeScene } from '../../lib/challenges'
import { chalArt, SCENE_ART, FIRE_RATIO } from './art'
import {
  chalColors as c,
  chalSpacing as s,
  chalType as t,
  chalRadius,
  chalCard,
  chalReward,
  chalWeek,
  chalHero,
  chalShadow,
  chalEntrance,
  CHAL_CONTENT_MAX,
  CHAL_ART_RATIO,
} from './tokens'
import { ShadowSurface } from '../shadowReveal'

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
        <Text className="font-lora-bold" accessibilityRole="header" style={{ ...t.title, color: c.navy, marginTop: s.xs }}>
          Challenges
        </Text>
        <Text className="font-lora" style={{ ...t.subtitle, color: c.slate, marginTop: s.xs }}>
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
 * The streak and this calendar week, Monday to Sunday — the same week, from
 * the same `currentWeekActivity`, as the Dashboard's This Week strip, so the
 * two can never disagree about which days count.
 */
export function StreakCard({ streak, week }: { streak: number; week: WeekDay[] }) {
  const today = week.find((d) => d.isToday)
  const doneToday = today?.active ?? false
  const note = streak === 0 ? 'Start one today!' : doneToday ? 'Keep going!' : 'Study today to keep it.'

  return (
    <ShadowSurface shadow={chalShadow}
      style={[{ flexDirection: 'row', alignItems: 'center' }, {
        backgroundColor: c.card,
        borderRadius: chalRadius.large,
        borderWidth: 1,
        borderColor: c.border,
        paddingVertical: s.md + 2,
        paddingLeft: s.md + 2,
        paddingRight: s.sm,
      }]}
    >
      <View
        className="flex-row items-center"
        accessible
        accessibilityLabel={`${streak} day streak. ${note}`}
        style={{ gap: s.sm + 2 }}
      >
        <View
          className="items-center justify-center"
          style={{ width: chalWeek.flame, height: chalWeek.flame, borderRadius: chalWeek.flame / 2, backgroundColor: c.peach }}
        >
          <Image source={chalArt.fire} style={{ width: 26 * FIRE_RATIO, height: 26 }} resizeMode="contain" />
        </View>
        <View>
          <Text className="font-lora-bold" style={{ ...t.streakTitle, color: c.navy }}>
            {streak} day streak
          </Text>
          <Text className="font-lora" style={{ ...t.streakSub, color: c.slate, marginTop: 2 }}>
            {note}
          </Text>
        </View>
      </View>

      <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: c.border, marginHorizontal: s.sm + 2 }} />

      <View className="flex-row" style={{ flex: 1 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {week.map((day) => (
          <View key={day.date} className="flex-1 items-center" style={{ gap: 6 }}>
            <Text className="font-lora" style={{ ...t.dayLetter, color: day.isToday ? c.jade : c.slate }}>
              {day.letter}
            </Text>
            <DayDot day={day} />
          </View>
        ))}
      </View>
    </ShadowSurface>
  )
}

/**
 * Done is a jade check. Today, not yet counted, is a pale ring in the same
 * family — an opportunity, not a gap. Anything else is a quiet grey disc,
 * whether missed or still to come: this strip is about the run, and the
 * Dashboard's fuller one is where missed and future are told apart.
 */
function DayDot({ day }: { day: WeekDay }) {
  const size = chalWeek.dot
  if (day.active) {
    return (
      <View className="items-center justify-center" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.jade }}>
        <Check size={13} color={c.onJade} strokeWidth={3} />
      </View>
    )
  }
  if (day.isToday) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: c.todayWash,
          borderWidth: 2,
          borderColor: c.todayRing,
        }}
      />
    )
  }
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.dayEmpty }} />
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
              fill={active ? c.jade : c.card}
              shoulder={active ? c.jadeShoulder : c.quietShoulder}
              border={active ? undefined : c.border}
              shadow={active}
            >
              <Text className="font-lora-bold" style={{ ...t.tab, color: active ? c.onJade : c.navy }}>
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
      <Text className="font-lora-bold" accessibilityRole="header" style={{ ...t.section, color: c.navy, flexShrink: 1 }}>
        {title}
      </Text>
      {resets && (
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <Clock size={16} color={c.slate} strokeWidth={1.8} />
          <Text className="font-lora" style={{ ...t.resets, color: c.slate }}>
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
      <ShadowSurface shadow={chalShadow} style={{ borderRadius: chalRadius.large, backgroundColor: c.card, borderWidth: 1, borderColor: c.border,  }}>
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
            <Text className="font-lora-bold" style={{ ...t.cardTitle, color: c.navy }}>
              {title}
            </Text>
            <Text className="font-lora" numberOfLines={2} style={{ ...t.cardBody, color: c.slate, marginTop: 2 }}>
              {description}
            </Text>
            {/* The count sits at the end of its own bar rather than beside the
                description, as the reference has it: on a phone column that
                cost the description two extra lines. */}
            <View className="flex-row items-center" style={{ marginTop: 6, gap: s.sm }}>
              <View
                style={{
                  flex: 1,
                  height: chalCard.barHeight,
                  borderRadius: chalCard.barHeight / 2,
                  backgroundColor: c.track,
                  overflow: 'hidden',
                }}
              >
                <View style={{ width: `${fraction * 100}%`, height: '100%', borderRadius: chalCard.barHeight / 2, backgroundColor: c.bar }} />
              </View>
              <Text className="font-lora" style={{ ...t.count, color: c.navy, minWidth: 46, textAlign: 'right' }}>
                {current} / {target}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center" style={{ marginLeft: s.md, paddingRight: chalCard.paddingRight, gap: 2 }}>
            <RewardPill xp={xpReward} state={state} onClaim={onClaim} />
            <ChevronRight size={20} color={c.navy} strokeWidth={1.8} />
          </View>
        </View>
      </ShadowSurface>
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
        <LiftedFace height={32} fill={c.jade} shoulder={c.jadeShoulder}>
          <View style={{ minWidth: 60, paddingHorizontal: s.md - 2, alignItems: 'center' }}>
            {/* "Claim" alone: the amount was on the gold pill a moment ago, and
                "Claim +10" is wide enough to truncate the card's title. */}
            <Text className="font-lora-bold" style={{ ...t.reward, color: c.onJade }}>
              Claim
            </Text>
          </View>
        </LiftedFace>
      </PressableScale>
    )
  }

  if (state === 'claimed') {
    return (
      <Pill fill={c.track}>
        <Check size={15} color={c.slate} strokeWidth={2.6} />
        <Text className="font-lora-bold" style={{ ...t.reward, color: c.slate }}>
          +{xp}
        </Text>
      </Pill>
    )
  }

  return (
    <Pill fill={c.goldWash}>
      <Star size={17} color={c.star} fill={c.star} strokeWidth={1.5} />
      <Text className="font-lora-bold" style={{ ...t.reward, color: c.goldInk }}>
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
    <ShadowSurface shadow={chalShadow}
      accessible={state !== 'claimable'}
      accessibilityLabel={`${title}. ${description} ${state === 'claimed' ? 'Reward claimed.' : `Reward ${xpReward} XP.`}`}
      style={{ borderRadius: chalRadius.large, backgroundColor: c.reward, borderWidth: 1, borderColor: c.border,  }}
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
          <Text className="font-lora" style={{ ...t.rewardTitle, color: c.navy }}>
            {title}
          </Text>
          <Text className="font-lora" style={{ ...t.cardBody, color: c.slate, marginTop: 3 }}>
            {description}
          </Text>
        </View>

        {/* Over the left of the corner painting, where its hill was cut away for it. */}
        <View style={{ marginLeft: s.sm, marginRight: Math.round(cornerWidth * 0.42) }}>
          <RewardPill xp={xpReward} state={state} onClaim={onClaim} />
        </View>
      </View>
    </ShadowSurface>
  )
}
