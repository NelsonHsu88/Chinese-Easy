import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, ScrollView, Animated, Easing, Platform, useWindowDimensions } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, Stack } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { playTapSound, playPositiveChime } from '../lib/sound'
import { celebrateHaptic, tapHaptic, tickHaptic } from '../lib/haptics'
import { devNow } from '../lib/devClock'
import { safeRoute } from '../lib/features'
import { currentWeekActivity } from '../lib/progress'
import { addDays } from '../lib/date'
import {
  ChallengesHero,
  StreakCard,
  ShelfTabs,
  SectionHeading,
  ChallengeCard,
  CompletionRewardCard,
  type ChallengeCardState,
} from '../components/challenges/parts'
import {
  chalCard,
  chalColors as c,
  chalSpacing as s,
  chalEntrance as anim,
  CHAL_CONTENT_MAX,
} from '../components/challenges/tokens'
import { Reveal, useEntranceRun } from '../components/dashboard/entrance'
import { AppBannerAd } from '../components/ads/AppBannerAd'
import {
  COMPLETION_REWARDS,
  challengeInstanceId,
  challengeTarget,
  isCompletionRewardEarned,
  offeredChallenges,
  weekStartISO,
  type ChallengeCadence,
  type ChallengeContext,
  type ChallengeDef,
} from '../lib/challenges'

/*
 * Challenges, built to the Beta 2.1 reference (`SS 929 Redesigned
 * Challenges.png`).
 *
 * Its design system is `components/challenges/tokens.ts` — the ivory-and-jade
 * family, spread from Review's — and its pieces are in
 * `components/challenges/parts.tsx`. What lives here is the composition, the
 * wiring from real progress to every number, and the claim animation.
 *
 * Every count on the screen is read from the learner's own activity: nothing
 * here shows the mockup's 6 / 10 unless they have learned six words today.
 */

type Shelf = ChallengeCadence

/** `milestone` is labelled Special — see `ChallengeCadence`. */
const SHELVES: { value: Shelf; label: string; heading: string }[] = [
  { value: 'daily', label: 'Daily', heading: 'Daily Challenges' },
  { value: 'weekly', label: 'Weekly', heading: 'Weekly Challenges' },
  { value: 'milestone', label: 'Special', heading: 'Special Challenges' },
]

/**
 * How a claimed challenge leaves its place in the list.
 *
 * It used to be removed outright. Now it keeps its row but stops competing for
 * attention: it collapses out of position, and reappears dimmed at the foot of
 * the list where finished work belongs. Splitting the move into a collapse and
 * an arrival means the cards below close the gap smoothly and the claimed card
 * doesn't have to be measured and flown across the screen to get there.
 */
const LEAVE_DURATION = 380
const ARRIVE_DURATION = 320

/** How much a claimed card fades once it has settled at the bottom. */
const CLAIMED_OPACITY = 0.6

/** Grace after an animation's nominal end before the timer takes over from it. */
const ANIMATION_SAFETY_MS = 400

/** Wraps a callback so the animation and its safety timer can't both run it. */
function once(fn: () => void): () => void {
  let called = false
  return () => {
    if (called) return
    called = true
    fn()
  }
}

/** "14h 22m" / "3d 5h" / "12m" — the largest two units that mean anything. */
function formatRemaining(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

/**
 * Time left until a shelf rolls over, from the app's notion of "now" — the
 * daily set at midnight, the weekly one at the start of next Monday. Special
 * challenges never reset, so they get no countdown at all.
 */
function resetsInLabel(shelf: Shelf): string | undefined {
  if (shelf === 'milestone') return undefined
  const now = devNow()
  let end: Date
  if (shelf === 'daily') {
    end = new Date(now)
    end.setHours(24, 0, 0, 0)
  } else {
    const [y, m, d] = addDays(weekStartISO(), 7).split('-').map(Number)
    end = new Date(y, m - 1, d)
  }
  return `Resets in ${formatRemaining(end.getTime() - now.getTime())}`
}

/**
 * A card in its slot, playing whichever move the list has asked of it.
 *
 * `leaving` collapses the row's height and margin so everything below rises into
 * the space; `arriving` fades and lifts it into its new place at the foot. Both
 * touch layout properties, so neither can use the native driver.
 */
function CardSlot({
  id,
  leaving,
  arriving,
  dimmed,
  onLeft,
  onArrived,
  children,
}: {
  id: string
  leaving: boolean
  arriving: boolean
  dimmed: boolean
  onLeft: (id: string) => void
  onArrived: (id: string) => void
  children: React.ReactNode
}) {
  const leave = useRef(new Animated.Value(0)).current
  const arrive = useRef(new Animated.Value(arriving ? 0 : 1)).current
  /*
   * The row's resting height, so the collapse has something to shrink from — an
   * Animated.Value can't interpolate out of "auto".
   *
   * Treated as a bonus rather than a precondition. `onLayout` doesn't fire for
   * every view on react-native-web, and gating the animation on it meant a
   * claimed row could sit frozen in place forever: no height, no animation, no
   * completion callback, so the list never learned to move it. The fade and
   * slide always run; the height collapse joins in when the measurement exists.
   */
  const [height, setHeight] = useState<number | null>(null)

  /*
   * Both moves report back through `once`, and both are backed by a timer as
   * well as the animation's own callback.
   *
   * A non-native animation is driven by requestAnimationFrame, which a browser
   * stops entirely for a hidden tab — so an app backgrounded mid-claim would
   * come back to a row frozen in place, still offering a Claim button for a
   * challenge already paid out. Timers keep firing (throttled) where rAF does
   * not, so the list reaches its resting order whether or not a single frame
   * was ever painted.
   */
  useEffect(() => {
    if (!leaving) return
    const finish = once(() => onLeft(id))
    Animated.timing(leave, {
      toValue: 1,
      duration: LEAVE_DURATION,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start(finish)
    const safety = setTimeout(finish, LEAVE_DURATION + ANIMATION_SAFETY_MS)
    return () => clearTimeout(safety)
  }, [leaving, leave, id, onLeft])

  useEffect(() => {
    if (!arriving) return
    const finish = once(() => onArrived(id))
    arrive.setValue(0)
    Animated.timing(arrive, {
      toValue: 1,
      duration: ARRIVE_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(finish)
    const safety = setTimeout(finish, ARRIVE_DURATION + ANIMATION_SAFETY_MS)
    return () => clearTimeout(safety)
  }, [arriving, arrive, id, onArrived])

  const leavingStyle = leaving
    ? {
        ...(height === null
          ? null
          : {
              height: leave.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }),
              marginBottom: leave.interpolate({ inputRange: [0, 1], outputRange: [chalCard.gap, 0] }),
            }),
        opacity: leave.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.4, 0] }),
        transform: [{ translateY: leave.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) }],
      }
    : null

  const arrivingStyle = arriving
    ? {
        opacity: arrive.interpolate({ inputRange: [0, 1], outputRange: [0, CLAIMED_OPACITY] }),
        transform: [{ translateY: arrive.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
      }
    : null

  /*
   * Android applies a view's `opacity` to each layer under it separately rather
   * than to the row as one picture, so a faded card showed its own elevation
   * shadow through its translucent surface: the rim around the content came out
   * darker than the middle. Compositing offscreen first fades the finished card
   * as a whole, the way iOS and the web always do. Only while it is actually
   * translucent — the offscreen pass is not free.
   */
  const translucent = dimmed || leaving || arriving

  return (
    <Animated.View
      onLayout={(e) => {
        if (!leaving) setHeight(e.nativeEvent.layout.height)
      }}
      needsOffscreenAlphaCompositing={translucent}
      style={[
        { marginBottom: chalCard.gap, opacity: dimmed ? CLAIMED_OPACITY : 1, overflow: 'hidden' },
        leavingStyle,
        arrivingStyle,
      ]}
    >
      {children}
    </Animated.View>
  )
}

/*
 * Switching shelves is a "fade through", the Material pattern for moving
 * between sibling views that aren't spatially related: the old list fades out
 * quickly with nothing else moving, then the new one fades in a little slower
 * while rising a few points into place. The tab itself answers at once — only
 * the content waits.
 *
 * All three shelves stay mounted, the hidden ones stacked out of the flow at
 * opacity 0, so a switch never mounts a list of cards and their paintings in
 * the middle of the animation. Each shelf owns its opacity and rise values,
 * bound once: moving one value between views makes Android draw a frame at the
 * default opacity. The fade-in starts from an effect, after the swap has
 * committed — started from the timer, the native fade began on the old list.
 */
const SHELF_FADE_OUT_MS = 120
const SHELF_FADE_IN_MS = 240
const SHELF_RISE = 8

export function Challenges() {
  const { xp, claimedChallengeIds, claimChallenge, dailyProgress, streak, completedLessonIds, settings } = useApp()
  /** The tab that is selected — moves the moment it is tapped. */
  const [shelf, setShelf] = useState<Shelf>('daily')
  /** The shelf whose challenges are on screen — swaps once the old list has faded out. */
  const [shownShelf, setShownShelf] = useState<Shelf>('daily')
  const shelfOpacity = useRef<Record<Shelf, Animated.Value>>({
    daily: new Animated.Value(1),
    weekly: new Animated.Value(0),
    milestone: new Animated.Value(0),
  }).current
  const shelfRise = useRef<Record<Shelf, Animated.Value>>({
    daily: new Animated.Value(0),
    weekly: new Animated.Value(SHELF_RISE),
    milestone: new Animated.Value(SHELF_RISE),
  }).current
  const shelfTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => shelfTimers.current.forEach(clearTimeout), [])

  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const column = Math.min(width, CHAL_CONTENT_MAX)
  const contentWidth = column - s.screen * 2

  /*
   * The page's arrival, on one beat like Review — the painting in from the
   * right, everything else rising. It replays on every focus, so coming back
   * from a challenge's own screen hands the board back the way it was opened.
   * It wraps the claim animation rather than competing with it: this plays on
   * the way in, where that one fires on a tap long after this has settled.
   */
  const run = useEntranceRun()
  const beat = { at: anim.at, duration: anim.for, run, distance: anim.slideY } as const

  /** The card collapsing out of its old position, if any. */
  const [leavingId, setLeavingId] = useState<string | null>(null)
  /** The card fading into its new position at the foot of the list, if any. */
  const [arrivingId, setArrivingId] = useState<string | null>(null)

  const context = useMemo<ChallengeContext>(
    () => ({
      dailyProgress,
      streak,
      completedLessonCount: completedLessonIds.length,
      xp,
      dailyNewWordLimit: settings.dailyNewWordLimit,
      dailyReviewLimit: settings.dailyReviewLimit,
    }),
    [dailyProgress, streak, completedLessonIds, xp, settings.dailyNewWordLimit, settings.dailyReviewLimit],
  )

  const week = useMemo(() => currentWeekActivity(dailyProgress), [dailyProgress])

  const claim = useCallback(
    (instanceId: string, reward: number) => {
      playPositiveChime()
      celebrateHaptic()
      claimChallenge(instanceId, reward)
    },
    [claimChallenge],
  )

  const handleClaim = useCallback(
    (def: ChallengeDef) => {
      setLeavingId(def.id)
      claim(challengeInstanceId(def), def.xpReward)
    },
    [claim],
  )

  const handleLeft = useCallback((id: string) => {
    setLeavingId((current) => (current === id ? null : current))
    setArrivingId(id)
  }, [])

  const handleArrived = useCallback((id: string) => {
    setArrivingId((current) => (current === id ? null : current))
  }, [])

  const changeShelf = (next: Shelf) => {
    if (next === shelf) return
    tickHaptic()
    setShelf(next)

    // A tap mid-transition restarts it towards the newest choice.
    shelfTimers.current.forEach(clearTimeout)
    shelfTimers.current = []

    /* Back to the list still on screen before it finished leaving: bring it
       back where it is, with no swap. */
    if (next === shownShelf) {
      fadeShelfIn(next, false)
      return
    }

    for (const { value } of SHELVES) {
      if (value === next) continue
      shelfOpacity[value].stopAnimation()
      Animated.timing(shelfOpacity[value], {
        toValue: 0,
        duration: SHELF_FADE_OUT_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: Platform.OS !== 'web',
      }).start()
    }

    /*
     * The swap hangs off a timer rather than the fade-out's completion
     * callback: rAF stops in a hidden browser tab, and a callback that never
     * fires would leave the list invisible. The fade-in follows the swap's
     * commit (the effect below).
     */
    shelfTimers.current = [
      setTimeout(() => {
        for (const { value } of SHELVES) if (value !== next) shelfOpacity[value].setValue(0)
        setShownShelf(next)
      }, SHELF_FADE_OUT_MS),
    ]
  }

  const fadeShelfIn = (value: Shelf, fromHidden: boolean) => {
    const opacity = shelfOpacity[value]
    const rise = shelfRise[value]
    const native = Platform.OS !== 'web'
    opacity.stopAnimation()
    rise.stopAnimation()
    if (fromHidden) {
      opacity.setValue(0)
      rise.setValue(SHELF_RISE)
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: SHELF_FADE_IN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
      Animated.timing(rise, { toValue: 0, duration: SHELF_FADE_IN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
    ]).start()
    // Forces the end state if the frames never run (a hidden browser tab).
    shelfTimers.current.push(
      setTimeout(() => {
        opacity.setValue(1)
        rise.setValue(0)
      }, SHELF_FADE_IN_MS + 200),
    )
  }

  const firstShown = useRef(true)
  useEffect(() => {
    if (firstShown.current) {
      firstShown.current = false
      return
    }
    fadeShelfIn(shownShelf, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownShelf])

  /*
   * The list, with finished work sorted to the foot.
   *
   * A claimed challenge stays on the screen rather than vanishing — seeing what
   * you got done is the point of the screen — but it stops holding a place among
   * the ones still to do. The card mid-collapse is deliberately treated as *not*
   * claimed so it holds its old slot until the animation ends; only then does
   * the sort move it.
   */
  const shelves = useMemo(() => {
    const claimedNow = (def: ChallengeDef) =>
      claimedChallengeIds.includes(challengeInstanceId(def)) && def.id !== leavingId

    return SHELVES.map(({ value, heading }) => {
      const rows = offeredChallenges(value)
        .map((def) => {
          const target = challengeTarget(def, context)
          const current = Math.min(target, def.progress(context))
          const claimed = claimedNow(def)
          const state: ChallengeCardState = claimed ? 'claimed' : current >= target ? 'claimable' : 'open'
          return { def, target, current, claimed, state }
        })
        // Stable: finished work drops to the bottom, everything else keeps the
        // order the definitions declare.
        .sort((a, b) => Number(a.claimed) - Number(b.claimed))

      /** The bonus for the whole set — daily and weekly only; milestones have no "all". */
      let reward: { def: (typeof COMPLETION_REWARDS)['daily']; instanceId: string; state: ChallengeCardState } | null = null
      if (value !== 'milestone') {
        const def = COMPLETION_REWARDS[value]
        const instanceId = challengeInstanceId(def)
        const state: ChallengeCardState = claimedChallengeIds.includes(instanceId)
          ? 'claimed'
          : isCompletionRewardEarned(value, context)
            ? 'claimable'
            : 'open'
        reward = { def, instanceId, state }
      }
      /* Recomputed per focus rather than ticking live: a countdown that moves
         while you read it is a distraction on a board like this. */
      return { value, heading, rows, reward, resets: resetsInLabel(value) }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimedChallengeIds, leavingId, context, run])

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.background }}>
      {/*
        The navigator's own push transition is switched off for this route so the
        entrance below is the only animation playing — two transitions at
        different speeds read as a stutter. Same call `Books` and `DetailShell`
        make.
      */}
      <Stack.Screen options={{ animation: 'none' }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingBottom: Math.max(s.xxl, insets.bottom + s.md) }}
      >
        <View style={{ width: column, paddingHorizontal: s.screen }}>
          <View className="flex-row items-center" style={{ height: 48 }}>
            {/* Guarded, never a bare `back()`: reached by deep link or after a
                web reload there is nothing to pop, and the arrow would be inert. */}
            <Pressable
              onPress={() => {
                playTapSound()
                tapHaptic()
                if (router.canGoBack()) router.back()
                else router.replace('/')
              }}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={12}
              className="items-center justify-center active:opacity-60"
              style={{ width: 40, height: 44, marginLeft: -6 }}
            >
              <ArrowLeft size={26} color={c.jadeDark} strokeWidth={2} />
            </Pressable>
          </View>

          <ChallengesHero column={column} run={run} />

          {/* No gap: the card's top edge is where the hero painting ends. */}
          <Reveal from="bottom" {...beat}>
            <StreakCard streak={streak} week={week} />
          </Reveal>

          <Reveal from="bottom" {...beat}>
            <View style={{ marginTop: s.lg }}>
              <ShelfTabs value={shelf} options={SHELVES} onChange={changeShelf} />
            </View>

            {/*
              Everything below the tabs fades through together, one layer per
              shelf. Each is flattened while it fades (`needsOffscreenAlphaCompositing`,
              the hardware texture on Android) so the cards' elevation shadows
              fade with them instead of lingering after the cards have gone.
              The shelf on screen is in the flow and sets the height; the other
              two sit on top of it, invisible and untouchable.
            */}
            <View>
            {shelves.map(({ value, heading, rows, reward, resets }) => {
              const active = value === shownShelf
              return (
            <Animated.View
              key={value}
              needsOffscreenAlphaCompositing
              renderToHardwareTextureAndroid
              pointerEvents={active ? 'auto' : 'none'}
              accessibilityElementsHidden={!active}
              importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
              style={[
                { opacity: shelfOpacity[value], transform: [{ translateY: shelfRise[value] }] },
                active ? null : { position: 'absolute', top: 0, left: 0, right: 0 },
              ]}
            >
            <View style={{ marginTop: s.xl, marginBottom: s.md }}>
              <SectionHeading title={heading} resets={resets} />
            </View>

            {/* No `gap` on the container: each slot carries its own bottom margin
                so it can collapse along with its height on the way out. */}
            <View>
              {rows.map(({ def, current, target, state }) => (
                <CardSlot
                  key={def.id}
                  id={def.id}
                  leaving={leavingId === def.id}
                  arriving={arrivingId === def.id}
                  dimmed={state === 'claimed' && arrivingId !== def.id}
                  onLeft={handleLeft}
                  onArrived={handleArrived}
                >
                  <ChallengeCard
                    title={def.title}
                    description={def.description(target)}
                    scene={def.scene}
                    current={current}
                    target={target}
                    xpReward={def.xpReward}
                    state={state}
                    width={contentWidth}
                    onOpen={() => {
                      playTapSound()
                      // "Earn 200 XP" points at the lesson path, but XP also comes
                      // from reviews — so when Lessons is switched off the link
                      // falls back to Review rather than losing its way in.
                      const route = safeRoute(def.route, '/review-tab') as Parameters<typeof router.push>[0]
                      // A tab is switched to, not pushed: pushing it from here
                      // would stack a second copy of the whole tab bar.
                      if (String(route).endsWith('-tab')) router.navigate(route)
                      else router.push(route)
                    }}
                    onClaim={() => handleClaim(def)}
                  />
                </CardSlot>
              ))}
            </View>

            {rows.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: s.xxl }}>
                <Text className="font-lora-bold" style={{ fontSize: 18, color: c.navy }}>
                  Nothing here yet
                </Text>
                <Text className="font-lora" style={{ marginTop: 4, fontSize: 14, color: c.slate }}>
                  A fresh set arrives soon.
                </Text>
              </View>
            )}

            {reward && (
              <>
                <View style={{ marginTop: s.md, marginBottom: s.md }}>
                  <SectionHeading title="Completion Reward" />
                </View>
                <CompletionRewardCard
                  title={reward.def.title}
                  description={reward.def.description}
                  xpReward={reward.def.xpReward}
                  state={reward.state}
                  width={contentWidth}
                  onClaim={() => claim(reward.instanceId, reward.def.xpReward)}
                />
              </>
            )}
            </Animated.View>
              )
            })}
            </View>
          </Reveal>

          {/*
            Last, and deliberately outside the `CardSlot` list: those slots
            animate their own height as a claimed challenge collapses and fades
            back in at the foot, and an advert loading mid-claim could land
            exactly where the collapsing card is being measured.
          */}
          <View style={{ marginTop: s.lg }}>
            <AppBannerAd placement="challenges" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
