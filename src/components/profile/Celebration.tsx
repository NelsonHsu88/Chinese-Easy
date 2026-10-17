import { useEffect, useRef } from 'react'
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
import { profArt, REWARD_ART } from './art'
import { profColors as c, profSpacing as s, profType as t, profRadius, PROF_ART_RATIO } from './tokens'

/*
 * Level-ups and achievements, celebrated one at a time.
 *
 * Mounted once in the root layout, beside the tour, so a level crossed on any
 * screen is noticed on that screen. Calm by design: a card rising out of a
 * soft scrim with a wash of mountains above it, a chime, and nothing that
 * flashes, bursts or spins.
 *
 * It waits while the learner is mid-task — a review session, a lesson, a
 * story, onboarding — using the same list the ad-free offer honours. The queue
 * lives in AppContext, so a level reached halfway through a review is
 * celebrated on the summary's way out rather than lost.
 */

const ENTER_MS = 260
const USE_NATIVE_DRIVER = Platform.OS !== 'web'

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

  const rise = useRef(new Animated.Value(0)).current
  const shownId = useRef<string | null>(null)
  useEffect(() => {
    if (!current || shownId.current === current.id) return
    shownId.current = current.id
    rise.setValue(0)
    playPositiveChime()
    celebrateHaptic()
    Animated.timing(rise, {
      toValue: 1,
      duration: ENTER_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start()
    // Hidden-tab backstop: rAF stalls in a background tab, and this card must
    // not sit at opacity 0 over a screen it is blocking.
    const settle = setTimeout(() => rise.setValue(1), ENTER_MS + 80)
    return () => clearTimeout(settle)
  }, [current, rise])

  if (!current) return null

  const close = () => dismissCelebration(current.id)

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: c.scrim, alignItems: 'center', justifyContent: 'center', padding: s.xl }}>
        <Animated.View
          style={{
            width: '100%',
            maxWidth: 360,
            opacity: rise,
            transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
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
                    close()
                    router.push(`/profile/achievements?replace=${id}` as Href)
                  } else {
                    close()
                    // navigate, not push: no second copy if the profile is already on top.
                    router.navigate('/profile' as Href)
                  }
                }}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

function Eyebrow({ children }: { children: string }) {
  return (
    <Text className="font-lora" style={{ ...t.link, color: c.jadeDark, letterSpacing: 1.2, textTransform: 'uppercase' }}>
      {children}
    </Text>
  )
}

function LevelBody({ celebration }: { celebration: Extract<Celebration, { kind: 'level' }> }) {
  const { rewards, gardenItems } = celebration.unlocks
  return (
    <View>
      <Eyebrow>Level up</Eyebrow>
      <Text className="font-lora-bold" style={{ fontSize: 38, lineHeight: 44, color: c.navy, marginTop: 4 }}>
        Level {celebration.level}
      </Text>
      <Text className="font-lora" style={{ fontSize: 18, lineHeight: 23, color: c.slate }}>
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
        <Text className="font-lora-bold" style={{ fontSize: 15, lineHeight: 19, color: c.navy }}>
          {label}
        </Text>
        <Text className="font-lora" style={{ ...t.tag, color: c.slate }}>
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
        <Medal category={def.category} tier={achievementTier(def)} earned size={64} />
        <View style={{ flex: 1 }}>
          <Text className="font-lora-bold" style={{ fontSize: 24, lineHeight: 29, color: c.navy }}>
            {def.name}
          </Text>
          <Text className="font-lora" style={{ ...t.body, color: c.slate, marginTop: 2 }}>
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
