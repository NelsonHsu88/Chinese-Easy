import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, ScrollView, Image, Animated, Easing } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ChevronLeft, ChevronRight, Check, Star } from 'lucide-react-native'
import { useApp } from '../context/AppContext'
import { playTapSound, playPositiveChime } from '../lib/sound'
import { celebrateHaptic } from '../lib/haptics'
import { devNow } from '../lib/devClock'
import { BrushHighlight } from '../components/BrushHighlight'
import {
  CHALLENGE_DEFS,
  CHALLENGE_DONE,
  CHALLENGE_TONES,
  challengeInstanceId,
  type ChallengeDef,
  type ToneColors,
} from '../lib/challenges'

/*
 * Challenges.
 *
 * Warm cream paper, one illustrated tile per row, and a progress bar tinted to
 * that challenge's own colour family — a long column of identical grey progress
 * rows is the thing this screen is built to avoid.
 *
 * Light-only, matching the reading screens: the design rests on cream paper and
 * a dark repaint would be a different design rather than a recolour.
 */

type Tab = 'daily' | 'milestone'

/** Gap between rows, carried as each row's own margin so it can collapse with it. */
const ROW_GAP = 12

/*
 * How a claimed challenge leaves the list: it slides off to the right and fades,
 * and at the same time its height and margin collapse so everything below rises
 * to fill the space. Both halves run off one value, which is what keeps the
 * slide and the reflow feeling like a single movement instead of two.
 *
 * Height and margin are layout properties, so this can't use the native driver.
 */
const EXIT_DURATION = 420

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
 * The challenge's picture. Real artwork where a piece fits, otherwise a wash in
 * the challenge's own tone with its character on it — never an empty frame.
 */
function ChallengeArt({ def, colors, size }: { def: ChallengeDef; colors: ToneColors; size: number }) {
  return (
    <View
      className="items-center justify-center overflow-hidden rounded-[16px]"
      style={{ width: size, height: size, backgroundColor: colors.soft }}
    >
      {def.art ? (
        <Image
          source={def.art}
          style={{ width: size * 0.86, height: size * 0.86 }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text
          className="font-hanzi-tc-semibold"
          style={{ fontSize: size * 0.46, lineHeight: size * 0.6, color: colors.strong }}
        >
          {def.glyph ?? def.title.slice(0, 1)}
        </Text>
      )}
    </View>
  )
}

function ChallengeRow({
  def,
  exiting,
  onClaim,
  onExited,
}: {
  def: ChallengeDef
  /** Set once claimed — the row plays its exit and then reports back to be removed. */
  exiting: boolean
  onClaim: (def: ChallengeDef) => void
  onExited: (id: string) => void
}) {
  const { dailyProgress, streak, completedLessonIds, xp, claimedChallengeIds } = useApp()

  const current = Math.min(
    def.target,
    def.progress({ dailyProgress, streak, completedLessonCount: completedLessonIds.length, xp }),
  )
  const instanceId = challengeInstanceId(def)
  const claimed = claimedChallengeIds.includes(instanceId)
  const complete = current >= def.target
  const pct = Math.round((current / def.target) * 100)
  const colors = complete ? CHALLENGE_DONE : CHALLENGE_TONES[def.tone]

  const isMilestone = def.cadence === 'milestone'
  const artSize = isMilestone ? 92 : 76

  const exit = useRef(new Animated.Value(0)).current
  // Captured before the exit starts, so the collapse has a real height to run
  // from — an Animated.Value can't interpolate out of "auto".
  const [height, setHeight] = useState<number | null>(null)

  useEffect(() => {
    if (!exiting || height === null) return
    Animated.timing(exit, {
      toValue: 1,
      duration: EXIT_DURATION,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
      // Reported even if the animation was cut short. The challenge is claimed
      // either way, and a row that never announces itself gone would sit in the
      // list until the screen is remounted.
    }).start(() => onExited(def.id))
  }, [exiting, height, exit, def.id, onExited])

  const animatedStyle = exiting &&
    height !== null && {
      height: exit.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }),
      marginBottom: exit.interpolate({ inputRange: [0, 1], outputRange: [ROW_GAP, 0] }),
      opacity: exit.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 0.35, 0] }),
      transform: [{ translateX: exit.interpolate({ inputRange: [0, 1], outputRange: [0, 90] }) }],
    }

  return (
    <Animated.View
      onLayout={(e) => {
        // Only the resting height is of interest; ignore the shrinking ones.
        if (!exiting) setHeight(e.nativeEvent.layout.height)
      }}
      style={[{ marginBottom: ROW_GAP, overflow: 'hidden' }, animatedStyle || null]}
    >
      {/*
        The whole row is the way in: tapping it opens the screen where this
        challenge can actually be worked on. Switched off once it's finished —
        at that point there's nothing left to go and do, and a stray tap would
        navigate away from the Claim button the learner was reaching for.
      */}
      <Pressable
        onPress={() => {
          playTapSound()
          router.push(def.route as Parameters<typeof router.push>[0])
        }}
        disabled={complete}
        accessibilityRole={complete ? undefined : 'button'}
        accessibilityLabel={complete ? undefined : def.title}
        accessibilityHint={complete ? undefined : def.description}
        className="flex-row items-center gap-3.5 rounded-[20px] px-3.5 py-3.5 shadow-paper"
        style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: 'rgba(217,207,192,0.4)' }}
      >
        <ChallengeArt def={def} colors={colors} size={artSize} />

        <View className="flex-1">
          <Text className="font-nunito-bold text-[16.5px]" style={{ color: '#1a1a2e' }} numberOfLines={2}>
            {def.title}
          </Text>

          {/* What to actually do. Hidden once complete, where it would be stale
              instructions sitting next to a finished bar. */}
          {!complete && (
            <Text className="mt-0.5 font-inter text-[11.5px]" style={{ color: '#8a8a99' }} numberOfLines={1}>
              {def.description}
            </Text>
          )}

          <View className="mt-2 h-[9px] overflow-hidden rounded-full" style={{ backgroundColor: colors.track }}>
            <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colors.strong }} />
          </View>

          <View className="mt-1.5 flex-row items-baseline">
            <Text className="font-nunito-bold text-[15px]" style={{ color: colors.strong }}>
              {current}
            </Text>
            <Text className="font-inter text-[14px]" style={{ color: '#a9a69f' }}>
              {' '}
              / {def.target}
            </Text>
          </View>
        </View>

        {/*
          One slot, three states: claimable, already claimed, still in progress.
          Milestones show what they're worth instead of a chevron — the reward is
          the reason to care about a target that's weeks away.
        */}
        <View className="items-center justify-center" style={{ minWidth: 56 }}>
          {complete && !claimed ? (
            <Pressable
              onPress={() => onClaim(def)}
              accessibilityRole="button"
              accessibilityLabel={`Claim ${def.xpReward} XP for ${def.title}`}
              className="rounded-full px-4 py-2.5 shadow-glow-jade active:opacity-80"
              style={{ backgroundColor: '#58be7c' }}
            >
              <Text className="font-nunito-bold text-[15px] text-white">Claim</Text>
            </Pressable>
          ) : claimed ? (
            <View
              className="h-[42px] w-[42px] items-center justify-center rounded-full"
              style={{ backgroundColor: '#d9f2e0' }}
            >
              <Check size={22} color="#2e7d5b" strokeWidth={3} />
            </View>
          ) : isMilestone ? (
            <View
              className="flex-row items-center gap-1.5 rounded-full px-2.5 py-2"
              style={{ backgroundColor: '#fdf3dd' }}
            >
              <Star size={14} color="#ffc414" fill="#ffc414" />
              <Text className="font-nunito-bold text-[13px]" style={{ color: '#9c681b' }}>
                +{def.xpReward} XP
              </Text>
            </View>
          ) : (
            <ChevronRight size={22} color="#c3bdb2" strokeWidth={2.5} />
          )}
        </View>
      </Pressable>
    </Animated.View>
  )
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className="flex-1 items-center justify-center rounded-full py-3"
      style={{ backgroundColor: active ? '#b9e3cc' : 'transparent' }}
    >
      <Text className="font-nunito-bold text-[17px]" style={{ color: active ? '#1a3f30' : '#3b4a63' }}>
        {label}
      </Text>
    </Pressable>
  )
}

export function Challenges() {
  const { xp, claimedChallengeIds, claimChallenge } = useApp()
  const [tab, setTab] = useState<Tab>('daily')

  /*
   * Challenges claimed in this session that are still playing their exit. A
   * claimed challenge is done and leaves the list, but it can't simply vanish
   * the instant the context marks it claimed — it has to stay mounted long
   * enough to animate away, so it lives here until the row reports it's gone.
   */
  const [exitingIds, setExitingIds] = useState<string[]>([])

  const handleClaim = useCallback(
    (def: ChallengeDef) => {
      playPositiveChime()
      celebrateHaptic()
      setExitingIds((prev) => (prev.includes(def.id) ? prev : [...prev, def.id]))
      claimChallenge(challengeInstanceId(def), def.xpReward)
    },
    [claimChallenge],
  )

  const handleExited = useCallback((id: string) => {
    setExitingIds((prev) => prev.filter((x) => x !== id))
  }, [])

  const defs = useMemo(() => {
    return CHALLENGE_DEFS.filter((d) => d.cadence === tab).filter((d) => {
      // Already-claimed challenges are finished business and stay off the list;
      // the one mid-exit is the exception, kept until its animation ends.
      const claimed = claimedChallengeIds.includes(challengeInstanceId(d))
      return !claimed || exitingIds.includes(d.id)
    })
  }, [tab, claimedChallengeIds, exitingIds])

  const resetsIn = useMemo(resetsInLabel, [])

  return (
    <SafeAreaView edges={['top']} className="flex-1 items-center" style={{ backgroundColor: '#fdfbf5' }}>
      <View className="w-full flex-1" style={{ maxWidth: 430 }}>
        <View className="flex-row items-center px-[18px] pb-1 pt-3">
          <Pressable
            onPress={() => {
              playTapSound()
              router.back()
            }}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
            className="pr-1"
          >
            <ChevronLeft size={28} color="#1a1a2e" strokeWidth={2.5} />
          </Pressable>

          <Text
            className="flex-1 text-center font-nunito-black text-[30px]"
            style={{ color: '#16233f', lineHeight: 38, letterSpacing: -0.6 }}
          >
            Challenges
          </Text>

          <View
            className="h-[40px] flex-row items-center gap-[7px] rounded-full px-3.5"
            style={{ backgroundColor: '#fffdf6', borderWidth: 1.5, borderColor: '#f3dfae' }}
          >
            <Star size={16} color="#ffc414" fill="#ffc414" />
            <Text className="font-nunito-bold text-[14px]" style={{ color: '#16233f' }}>
              {xp.toLocaleString('en-US')} XP
            </Text>
          </View>
        </View>

        <View
          className="mx-[18px] mt-3 flex-row rounded-full p-1"
          style={{ backgroundColor: '#fffdf6', borderWidth: 1, borderColor: '#ece4d3' }}
        >
          <TabButton label="Daily" active={tab === 'daily'} onPress={() => setTab('daily')} />
          <TabButton label="Milestones" active={tab === 'milestone'} onPress={() => setTab('milestone')} />
        </View>

        {/* No `gap` here: each row carries its own bottom margin so it can
            collapse along with its height on the way out. */}
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 32 }}>
          {/* Only the daily set rolls over, so only it gets the countdown. */}
          {tab === 'daily' && (
            <View className="mb-1 items-center">
              <View className="self-center">
                <BrushHighlight color="#f9e58c" bleedX={14} bleedTop={4} bleedBottom={2}>
                  <Text className="font-handwriting-medium text-[19px]" style={{ color: '#4a4335' }}>
                    {resetsIn}
                  </Text>
                </BrushHighlight>
              </View>
            </View>
          )}

          {defs.map((def) => (
            <ChallengeRow
              key={def.id}
              def={def}
              exiting={exitingIds.includes(def.id)}
              onClaim={handleClaim}
              onExited={handleExited}
            />
          ))}

          {defs.length === 0 && (
            <View className="items-center pt-10">
              <Text className="font-nunito-bold text-[17px]" style={{ color: '#1a1a2e' }}>
                {tab === 'daily' ? 'All done for today' : 'Every milestone claimed'}
              </Text>
              <Text className="mt-1.5 font-inter text-[13.5px]" style={{ color: '#8a8a99' }}>
                {tab === 'daily' ? 'A fresh set arrives tomorrow.' : 'More on the way.'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}
