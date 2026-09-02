import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, ScrollView, Image, Animated, Easing } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, Stack } from 'expo-router'
import { ChevronLeft, CalendarDays, Trophy } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { playTapSound, playPositiveChime } from '../lib/sound'
import { celebrateHaptic, tapHaptic } from '../lib/haptics'
import { devNow } from '../lib/devClock'
import { FEATURES, safeRoute } from '../lib/features'
import { ChallengeCard, type CardState } from '../components/challenges/ChallengeCard'
import { ChallengeHero } from '../components/challenges/ChallengeHero'
import { SegmentedTabs, XpCounter } from '../components/challenges/ChallengeParts'
import { CARD, CHAL, GUTTER } from '../components/challenges/tokens'
import { useEntranceRun, useReveal } from '../components/dashboard/entrance'
import { AppBannerAd } from '../components/ads/AppBannerAd'
import {
  CHALLENGE_DEFS,
  challengeInstanceId,
  type ChallengeDef,
} from '../lib/challenges'

/*
 * Challenges.
 *
 * Rebuilt against the reference mockup: warm off-white page, a hero that answers
 * "how much of today is done", and one card component in four states below it.
 * Colours come from the `chal-*` tokens in the Tailwind config and nowhere else.
 *
 * Light-only, like the reading screens — the design rests on warm paper, and a
 * dark repaint would be a different design rather than a recolour.
 */

type Tab = 'daily' | 'milestone'

/*
 * The page's arrival: the whole screen rises a little and fades up.
 *
 * One beat rather than a staggered score, matching `Books` — the Dashboard
 * assembles itself because it is six unrelated things, where this is one board
 * being put in front of the learner. The rise is short on purpose; past about
 * 40pt the movement stops reading as arrival and starts reading as a page turn.
 *
 * It replays on every focus, so coming back from a challenge's own screen hands
 * the board back the same way it was first opened.
 */
const ENTER = { at: 0, for: 640, rise: 28 } as const

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

/** Time left until the daily set rolls over, from the app's notion of "now". */
function resetsInLabel(): string {
  const now = devNow()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const totalMinutes = Math.max(0, Math.round((midnight.getTime() - now.getTime()) / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `resets in ${hours}h ${minutes}m` : `resets in ${minutes}m`
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
              marginBottom: leave.interpolate({ inputRange: [0, 1], outputRange: [CARD.gap, 0] }),
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

  return (
    <Animated.View
      onLayout={(e) => {
        if (!leaving) setHeight(e.nativeEvent.layout.height)
      }}
      style={[
        { marginBottom: CARD.gap, opacity: dimmed ? CLAIMED_OPACITY : 1, overflow: 'hidden' },
        leavingStyle,
        arrivingStyle,
      ]}
    >
      {children}
    </Animated.View>
  )
}

export function Challenges() {
  const {
    xp,
    claimedChallengeIds,
    claimChallenge,
    dailyProgress,
    streak,
    completedLessonIds,
  } = useApp()
  const [tab, setTab] = useState<Tab>('daily')

  /*
   * The page's arrival, on one beat — see `ENTER`. It wraps the claim animation
   * rather than competing with it: this plays once on the way in, where that one
   * fires on a tap long after this has settled.
   */
  const run = useEntranceRun()
  const enter = useReveal({ from: 'bottom', ...ENTER, duration: ENTER.for, distance: ENTER.rise, run })

  /** The card collapsing out of its old position, if any. */
  const [leavingId, setLeavingId] = useState<string | null>(null)
  /** The card fading into its new position at the foot of the list, if any. */
  const [arrivingId, setArrivingId] = useState<string | null>(null)

  const context = useMemo(
    () => ({ dailyProgress, streak, completedLessonCount: completedLessonIds.length, xp }),
    [dailyProgress, streak, completedLessonIds, xp],
  )

  const handleClaim = useCallback(
    (def: ChallengeDef) => {
      playPositiveChime()
      celebrateHaptic()
      setLeavingId(def.id)
      claimChallenge(challengeInstanceId(def), def.xpReward)
    },
    [claimChallenge],
  )

  const handleLeft = useCallback((id: string) => {
    setLeavingId((current) => (current === id ? null : current))
    setArrivingId(id)
  }, [])

  const handleArrived = useCallback((id: string) => {
    setArrivingId((current) => (current === id ? null : current))
  }, [])

  /*
   * The list, with finished work sorted to the foot.
   *
   * A claimed challenge stays on the screen rather than vanishing — seeing what
   * you got done is the point of the screen — but it stops holding a place among
   * the ones still to do. The card mid-collapse is deliberately treated as *not*
   * claimed so it holds its old slot until the animation ends; only then does
   * the sort move it.
   */
  const rows = useMemo(() => {
    const claimedNow = (def: ChallengeDef) =>
      claimedChallengeIds.includes(challengeInstanceId(def)) && def.id !== leavingId

    const list = CHALLENGE_DEFS.filter((d) => d.cadence === tab)
      // A goal whose whole feature is hidden can't be worked on, so it isn't offered.
      .filter((d) => !d.requires || FEATURES[d.requires])

    return list
      .map((def) => {
        const current = Math.min(def.target, def.progress(context))
        const claimed = claimedNow(def)
        const complete = current >= def.target
        const state: CardState = claimed
          ? 'claimed'
          : complete
            ? 'claimable'
            : current > 0
              ? 'inProgress'
              : 'notStarted'
        return { def, current, claimed, complete, state }
      })
      // Stable: finished work drops to the bottom, everything else keeps the
      // order the definitions declare.
      .sort((a, b) => Number(a.claimed) - Number(b.claimed))
  }, [tab, claimedChallengeIds, leavingId, context])

  /** Today's tally — the number the hero exists to show. */
  const summary = useMemo(() => {
    const completed = rows.filter((r) => r.complete).length
    const xpAvailable = rows.reduce((sum, r) => sum + r.def.xpReward, 0)
    const xpEarned = rows.filter((r) => r.claimed).reduce((sum, r) => sum + r.def.xpReward, 0)
    return { completed, total: rows.length, xpEarned, xpAvailable }
  }, [rows])

  const resetsIn = useMemo(resetsInLabel, [])

  return (
    <SafeAreaView edges={['top']} className="flex-1 items-center" style={{ backgroundColor: CHAL.bg }}>
      {/*
        The navigator's own push transition is switched off for this route so the
        fade-up below is the only animation playing. Left on, a native build
        would slide the whole page in from the right *and* run this one inside
        it — two transitions at different speeds, which reads as a stutter
        rather than as either one. Same call `Books` and `DetailShell` make.
      */}
      <Stack.Screen options={{ animation: 'none' }} />

      <View className="w-full flex-1" style={{ maxWidth: 430 }}>
        {/*
          Plain styles on the animated view with the page in a plain View inside
          it — NativeWind drops `className` on an `Animated.View` entirely, and
          the column's own `flex-1` would go with it.
        */}
        <Animated.View style={[{ flex: 1 }, enter]}>
          <View className="flex-1">
        {/* Header */}
        <View
          style={{
            height: 52,
            marginTop: 16,
            paddingHorizontal: GUTTER,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Pressable
            onPress={() => {
              playTapSound()
              tapHaptic()
              router.back()
            }}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
            style={{ width: 34 }}
          >
            <ChevronLeft size={26} color={CHAL.navy} strokeWidth={2.25} />
          </Pressable>

          <Text
            className="flex-1 text-center font-nunito-extrabold"
            style={{ fontSize: 30, lineHeight: 38, color: CHAL.navy, letterSpacing: -0.5 }}
          >
            Challenges
          </Text>

          <XpCounter xp={xp} />
        </View>

        <View style={{ paddingHorizontal: GUTTER, marginTop: 20 }}>
          <SegmentedTabs
            value={tab}
            onChange={setTab}
            options={[
              {
                value: 'daily' as Tab,
                label: 'Daily',
                icon: <CalendarDays size={20} color={CHAL.body} strokeWidth={2.1} />,
                activeIcon: <CalendarDays size={20} color={CHAL.greenInk} strokeWidth={2.25} />,
              },
              {
                value: 'milestone' as Tab,
                label: 'Milestones',
                icon: <Trophy size={20} color={CHAL.body} strokeWidth={2.1} />,
                activeIcon: <Trophy size={20} color={CHAL.greenInk} strokeWidth={2.25} />,
              },
            ]}
          />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <ChallengeHero
            title={tab === 'daily' ? 'Daily Challenges' : 'Milestones'}
            subtitle={
              tab === 'daily'
                ? 'Complete challenges, earn XP, and grow your skills!'
                : 'Long-run goals that stay until you reach them.'
            }
            completed={summary.completed}
            total={summary.total}
            xpEarned={summary.xpEarned}
            xpAvailable={summary.xpAvailable}
            // Only the daily set rolls over, so only it gets the countdown.
            footnote={tab === 'daily' ? resetsIn : undefined}
          />

          {/* No `gap` on the container: each slot carries its own bottom margin
              so it can collapse along with its height on the way out. */}
          <View style={{ marginTop: 22 }}>
            {rows.map(({ def, current, state }) => (
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
                  def={def}
                  current={current}
                  state={state}
                  onOpen={() => {
                    playTapSound()
                    tapHaptic()
                    // "Earn 200 XP" points at the lesson path, but XP also comes
                    // from reviews — so when Lessons is switched off the link
                    // falls back to Review rather than losing its way in.
                    router.push(safeRoute(def.route, '/review') as Parameters<typeof router.push>[0])
                  }}
                  onClaim={() => handleClaim(def)}
                />
              </CardSlot>
            ))}
          </View>

          {rows.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text className="font-nunito-extrabold" style={{ fontSize: 19, color: CHAL.navy }}>
                Nothing here yet
              </Text>
              <Text className="mt-1.5 font-nunito-semibold" style={{ fontSize: 15, color: CHAL.body }}>
                A fresh set arrives tomorrow.
              </Text>
            </View>
          )}

          {rows.length > 0 && <EncouragementBanner tab={tab} remaining={summary.total - summary.completed} />}

          {/*
            Last, and deliberately outside the `CardSlot` list.

            Those slots animate their own height and bottom margin as a claimed
            challenge collapses out of position and fades back in at the foot of
            the list. A banner inside that list would be one more thing whose
            height changes during an animation that is already backstopped by
            timers — and an advert loading mid-claim could land exactly where
            the collapsing card is being measured. Out here it is a static
            sibling that the claim animation never touches.
          */}
          <AppBannerAd placement="challenges" />
        </ScrollView>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}

/**
 * The footer banner.
 *
 * The mockup pairs a panda with a treasure chest here; this project has neither,
 * so the app's own Shifu mascot stands in and the chest is dropped rather than
 * faked with an icon that would look borrowed from somewhere else.
 */
function EncouragementBanner({ tab, remaining }: { tab: Tab; remaining: number }) {
  const done = remaining <= 0
  const daily = tab === 'daily'

  return (
    <View
      className="shadow-chal"
      style={{
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderRadius: 20,
        padding: 16,
        backgroundColor: CHAL.warm,
        borderWidth: 1,
        borderColor: CHAL.warmLine,
      }}
    >
      <Image
        source={require('../assets/images/mascot-shifu.png')}
        style={{ width: 62, height: 62 }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <View style={{ flex: 1 }}>
        <Text className="font-nunito-extrabold" style={{ fontSize: 19, lineHeight: 25, color: CHAL.navy }}>
          {done ? (daily ? 'All done today!' : 'Every milestone reached!') : 'Keep it up!'}
        </Text>
        <Text className="mt-0.5 font-nunito-semibold" style={{ fontSize: 15, lineHeight: 20, color: CHAL.body }}>
          {done
            ? daily
              ? 'Every challenge finished — come back tomorrow for a fresh set.'
              : 'Nothing left on the board. More will be added.'
            : daily
              ? `Finish ${remaining} more for today's full set.`
              : `${remaining} still to reach — they'll wait for you.`}
        </Text>
      </View>
    </View>
  )
}
