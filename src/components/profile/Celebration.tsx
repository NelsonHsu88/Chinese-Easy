import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { View, Text, Image, Modal, Animated, Easing, Platform, type ImageSourcePropType } from 'react-native'
import { router, usePathname, type Href } from 'expo-router'
import { Award, Flower2, Sprout } from 'lucide-react-native'
import { useApp, type Celebration } from '../../context/AppContext'
import { levelTitle } from '../../lib/progression/levels'
import { achievementById, achievementTier, MAX_PINNED } from '../../lib/progression/achievements'
import { profileRewardById } from '../../lib/progression/profileRewards'
import { gardenItemById } from '../../lib/progression/gardenItems'
import { PROTECTED_ROUTES } from '../subscription/useSubscribePrompt'
import { playPositiveChime } from '../../lib/sound'
import { celebrateHaptic } from '../../lib/haptics'
import { Medal, ProfileButton } from './parts'
import { useReduceMotion } from '../tour/useReduceMotion'
import { ShadowRevealProvider, useShadowReveal } from '../shadowReveal'
import { profArt, REWARD_ART } from './art'
import { profColors as c, profSpacing as s, profType as t, profRadius, PROF_ART_RATIO } from './tokens'

/*
 * Level-ups and achievements, celebrated one at a time.
 *
 * Mounted once in the root layout, beside the tour, so a level crossed on any
 * screen is noticed on that screen. It arrives rather than appearing: the
 * scrim dims in while the card rises and springs up from 92%, then the medal
 * (or the level number) gives one small bounce. Dismissing plays it back out —
 * the card fades as it sinks a little and shrinks a touch, the scrim with it —
 * and only then is it closed (or its button's action taken).
 *
 * It waits while the learner is mid-task — a review session, a lesson, a
 * story, onboarding — using the same list the ad-free offer honours. The queue
 * lives in AppContext, so a level reached halfway through a review is
 * celebrated on the summary's way out rather than lost.
 */

/** The scrim's fade in; the card springs over about the same time. */
const SCRIM_IN_MS = 220
/** The medal's bounce, once the card has landed. */
const BOUNCE_DELAY_MS = 260
const BOUNCE_MS = 420
/** The way out: fade, sink and shrink together. */
const EXIT_MS = 240
const EXIT_SINK = 10
/** Past an animation's end, when its backstop forces the final frame. */
const BACKSTOP_MS = 120
const USE_NATIVE_DRIVER = Platform.OS !== 'web'

/** The bounce value, for the medal or level number inside the card. */
const BounceContext = createContext<Animated.Value | null>(null)

export function ProgressionCelebration() {
  const { celebrations, dismissCelebration, equipProfileReward, pinAchievement, progression, tour } = useApp()
  const pathname = usePathname()
  /*
   * Held through Shifu's tour as well. Saving a word mid-tour earns "First
   * Word", and this is a `Modal` — it draws above the tour's layer, so it landed
   * on the spotlight, buried the tour's toast, and its backdrop swallowed the
   * tap on "Got it". Queued, it plays the moment the tour ends instead.
   */
  const busy =
    tour.status === 'in_progress' ||
    PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
  const current = busy ? undefined : celebrations[0]

  const reduceMotion = useReduceMotion()
  /* 0 → 1 on the way in; on the way out `leave` runs 0 → 1 over the top. */
  const scrim = useRef(new Animated.Value(0)).current
  const card = useRef(new Animated.Value(0)).current
  const leave = useRef(new Animated.Value(0)).current
  const bounce = useRef(new Animated.Value(1)).current
  const shownId = useRef<string | null>(null)
  const leaving = useRef(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const [run, setRun] = useState(0)
  /* The buttons' shadows settle in behind the card rather than arriving first (Android). */
  const shadowArrival = useShadowReveal({ duration: SCRIM_IN_MS, run, settled: reduceMotion })

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  useEffect(() => {
    if (!current || shownId.current === current.id) return
    shownId.current = current.id
    leaving.current = false
    leave.setValue(0)
    setRun((n) => n + 1)
    playPositiveChime()
    celebrateHaptic()
    if (reduceMotion) {
      scrim.setValue(1)
      card.setValue(1)
      bounce.setValue(1)
      return
    }
    scrim.setValue(0)
    card.setValue(0)
    bounce.setValue(0.8)
    Animated.parallel([
      Animated.timing(scrim, { toValue: 1, duration: SCRIM_IN_MS, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
      // A gentle spring: it settles with the faintest overshoot, not a wobble.
      Animated.spring(card, { toValue: 1, stiffness: 220, damping: 20, mass: 1, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.sequence([
        Animated.delay(BOUNCE_DELAY_MS),
        Animated.spring(bounce, { toValue: 1, stiffness: 320, damping: 9, mass: 0.8, useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    ]).start()
    // Hidden-tab backstop: rAF stalls in a background tab, and this card must
    // not sit invisible over a screen it is blocking.
    const settle = setTimeout(() => {
      scrim.setValue(1)
      card.setValue(1)
      bounce.setValue(1)
    }, BOUNCE_DELAY_MS + BOUNCE_MS + BACKSTOP_MS)
    timers.current.push(settle)
  }, [current, reduceMotion, scrim, card, bounce, leave])

  if (!current) return null

  /** Plays the way out, then closes and runs `then` — once, however often it's tapped. */
  const exit = (then?: () => void) => {
    if (leaving.current) return
    leaving.current = true
    const id = current.id
    let done = false
    const finish = () => {
      if (done) return
      done = true
      dismissCelebration(id)
      then?.()
    }
    if (reduceMotion) {
      finish()
      return
    }
    Animated.timing(leave, { toValue: 1, duration: EXIT_MS, easing: Easing.in(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }).start(finish)
    // The callback dismisses the modal, so the backstop covers it too.
    timers.current.push(setTimeout(finish, EXIT_MS + BACKSTOP_MS))
  }
  const close = () => exit()

  const cardOpacity = Animated.multiply(
    card.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
    leave.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
  )
  const cardScale = Animated.multiply(
    card.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }),
    leave.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }),
  )
  const cardShift = Animated.add(
    card.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
    leave.interpolate({ inputRange: [0, 1], outputRange: [0, EXIT_SINK] }),
  )
  const scrimOpacity = Animated.multiply(scrim, leave.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }))

  return (
    <Modal visible transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: s.xl }}>
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: c.scrim, opacity: scrimOpacity }}
        />
        <ShadowRevealProvider value={shadowArrival}>
        <BounceContext.Provider value={bounce}>
        <Animated.View
          style={{
            width: '100%',
            maxWidth: 360,
            opacity: cardOpacity,
            transform: [{ translateY: cardShift }, { scale: cardScale }],
          }}
        >
          <View style={{ backgroundColor: c.background, borderRadius: 24, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
            <View pointerEvents="none" style={{ alignItems: 'flex-end' }}>
              <Image source={profArt.cardMountains} resizeMode="contain" style={{ width: 220, height: 220 / PROF_ART_RATIO.cardMountains, marginBottom: -54 }} />
            </View>
            <View style={{ paddingHorizontal: s.xl, paddingBottom: s.xl }}>
              {current.kind === 'level' ? (
                <LevelBody celebration={current} />
              ) : (
                <AchievementBody celebration={current} />
              )}
              <Actions
                celebration={current}
                pinnedFull={progression.achievements.pinned.length >= MAX_PINNED}
                onClose={close}
                onEquip={(id) => {
                  equipProfileReward(id, true)
                  close()
                }}
                onDisplay={(id) => {
                  if (pinAchievement(id) === 'full') {
                    exit(() => router.push(`/profile/achievements?replace=${id}` as Href))
                  } else {
                    // navigate, not push: no second copy if the profile is already on top.
                    exit(() => router.navigate('/profile-tab' as Href))
                  }
                }}
              />
            </View>
          </View>
        </Animated.View>
        </BounceContext.Provider>
        </ShadowRevealProvider>
      </View>
    </Modal>
  )
}

/** One small bounce once the card has landed — the medal, or the level number. */
function Bounce({ children, origin = 'center' }: { children: React.ReactNode; origin?: 'center' | 'left' }) {
  const bounce = useContext(BounceContext)
  if (!bounce) return <>{children}</>
  return (
    <Animated.View style={{ alignSelf: origin === 'left' ? 'flex-start' : 'auto', transform: [{ scale: bounce }] }}>
      {children}
    </Animated.View>
  )
}

function Eyebrow({ children }: { children: string }) {
  return (
    <Text className="font-nunito-semibold" style={{ ...t.link, color: c.jadeDark, letterSpacing: 1.2, textTransform: 'uppercase' }}>
      {children}
    </Text>
  )
}

function LevelBody({ celebration }: { celebration: Extract<Celebration, { kind: 'level' }> }) {
  const { rewards, gardenItems } = celebration.unlocks
  return (
    <View>
      <Eyebrow>Level up</Eyebrow>
      <Bounce origin="left">
        <Text className="font-nunito-extrabold" style={{ fontSize: 38, lineHeight: 44, color: c.navy, marginTop: 4 }}>
          Level {celebration.level}
        </Text>
      </Bounce>
      <Text className="font-nunito-semibold" style={{ fontSize: 18, lineHeight: 23, color: c.slate }}>
        {levelTitle(celebration.level)}
      </Text>
      {(rewards.length > 0 || gardenItems.length > 0) && (
        <View style={{ marginTop: s.lg, gap: s.sm }}>
          {rewards.map((id) => (
            <UnlockLine key={id} image={REWARD_ART[id]} label={`${profileRewardById(id).name} unlocked`} note="New profile reward" />
          ))}
          {gardenItems.map((id) => (
            <UnlockLine key={id} icon={<Sprout size={20} color={c.jade} />} label={`${gardenItemById(id).name} unlocked`} note="For Scholar’s Garden" />
          ))}
        </View>
      )}
    </View>
  )
}

function UnlockLine({ image, icon, label, note }: { image?: ImageSourcePropType; icon?: React.ReactNode; label: string; note: string }) {
  return (
    <View className="flex-row items-center" style={{ gap: s.md, backgroundColor: c.card, borderRadius: profRadius.medium, borderWidth: 1, borderColor: c.border, padding: s.sm }}>
      <View className="items-center justify-center" style={{ width: 40, height: 40, borderRadius: profRadius.small, backgroundColor: c.tile }}>
        {image ? <Image source={image} resizeMode="contain" style={{ width: 34, height: 34 }} /> : icon ?? <Flower2 size={20} color={c.jade} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text className="font-nunito-extrabold" style={{ fontSize: 15, lineHeight: 19, color: c.navy }}>
          {label}
        </Text>
        <Text className="font-nunito-semibold" style={{ ...t.tag, color: c.slate }}>
          {note}
        </Text>
      </View>
    </View>
  )
}

function AchievementBody({ celebration }: { celebration: Extract<Celebration, { kind: 'achievement' }> }) {
  const def = achievementById(celebration.achievementId)
  if (!def) return null
  return (
    <View>
      <Eyebrow>Achievement earned</Eyebrow>
      <View className="flex-row items-center" style={{ gap: s.md, marginTop: s.md }}>
        <Bounce>
          <Medal category={def.category} tier={achievementTier(def)} earned size={64} />
        </Bounce>
        <View style={{ flex: 1 }}>
          <Text className="font-nunito-extrabold" style={{ fontSize: 24, lineHeight: 29, color: c.navy }}>
            {def.name}
          </Text>
          <Text className="font-nunito-semibold" style={{ ...t.body, color: c.slate, marginTop: 2 }}>
            {def.description}
          </Text>
        </View>
      </View>
    </View>
  )
}

function Actions({
  celebration,
  pinnedFull,
  onClose,
  onEquip,
  onDisplay,
}: {
  celebration: Celebration
  pinnedFull: boolean
  onClose: () => void
  onEquip: (id: Extract<Celebration, { kind: 'level' }>['unlocks']['rewards'][number]) => void
  onDisplay: (id: string) => void
}) {
  if (celebration.kind === 'level') {
    const reward = celebration.unlocks.rewards[0]
    return (
      <View className="flex-row" style={{ gap: s.sm, marginTop: s.xl }}>
        {reward ? (
          <>
            <ProfileButton label="Equip" tone="primary" onPress={() => onEquip(reward)} />
            <ProfileButton label="Later" tone="quiet" onPress={onClose} />
          </>
        ) : (
          <ProfileButton label="Continue" tone="primary" onPress={onClose} />
        )}
      </View>
    )
  }
  return (
    <View style={{ gap: s.sm, marginTop: s.xl }}>
      <View className="flex-row">
        <ProfileButton
          label={pinnedFull ? 'Choose Profile Badge' : 'Display on Profile'}
          icon={Award}
          tone="primary"
          onPress={() => onDisplay(celebration.achievementId)}
        />
      </View>
      <View className="flex-row">
        <ProfileButton label="Continue" tone="quiet" onPress={onClose} />
      </View>
    </View>
  )
}
