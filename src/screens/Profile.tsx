import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { Animated, Image, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams, type Href } from 'expo-router'
import { Award, ChevronRight, Clock3, Flame, Lock, Pencil, Plus, Settings as SettingsIcon, TrendingDown, Zap } from 'lucide-react-native'
import { DEFAULT_SETTINGS, useApp } from '../context/AppContext'
import { dueCountFor, weakCardsFor, HSK_MAX_LEVEL, levelUpTarget, studiedByLevel } from '../lib/selectors'
import { getLevelFromXp, levelTitle } from '../lib/progression/levels'
import { PROFILE_REWARDS } from '../lib/progression/profileRewards'
import {
  ACHIEVEMENTS,
  MAX_PINNED,
  achievementById,
  achievementProgress,
  achievementTier,
  type AchievementDefinition,
} from '../lib/progression/achievements'
import { LiftedFace, PressableScale } from '../components/dashboard/parts'
import { Reveal, useEntranceRun } from '../components/dashboard/entrance'
import { GardenScene, Medal, MedalSlot, MEDAL_RIBBON, ProfileButton, ProgressBar, useProfileCosmetics } from '../components/profile/parts'
import { EditProfileSheet } from '../components/profile/EditProfileSheet'
import { REWARD_ART, profArt } from '../components/profile/art'
import {
  profColors as c,
  profSpacing as s,
  profType as t,
  profRadius,
  profEntrance as anim,
  PROF_ART_RATIO,
  PROF_CONTENT_MAX,
} from '../components/profile/tokens'
import { playTapSound } from '../lib/sound'

/*
 * Profile — the fifth tab, laid out like Duolingo's profile.
 *
 * A pinned header with the learner's name and a gear (Settings lives behind
 * it now); a big avatar on a soft jade banner (tap to change the photo); the
 * level line; three numbers in a row; Edit profile; a "Finish your profile"
 * nudge while the name or photo is still unset; then plain small-caps
 * sections, each with a chevron to its full page: Overview, HSK Journey,
 * Rewards, Achievements and Scholar's Garden.
 *
 * Duolingo's social row (courses, following, followers, Add Friends) has no
 * equivalent here, so it carries the learner's own numbers instead, and its
 * button edits the profile. Every number is the learner's own; there is no
 * shop and no currency.
 */

const AVATAR = 132
/** Where the avatar's box starts below the banner's top. */
const AVATAR_TOP = 28
/** Room above the garden painting, so its mountains aren't all under the avatar. */
const GARDEN_HEADROOM = 70
/** How far the showcase card rises over the garden's foot. */
const SHOWCASE_OVERLAP = 22
const SHOWCASE_MEDAL = 44
/**
 * How many medals the achievements row shows — three, so it shares the
 * Rewards row's and the showcase's columns (`GridRow`) and every icon in the
 * three rows sits on the same centre line.
 */
const ACHIEVEMENT_ROW = 3
const NATIVE = Platform.OS !== 'web'

type IconType = ComponentType<{ size: number; color: string; strokeWidth: number; fill?: string }>

export function Profile() {
  const { settings, xp, streak, progression, achievementStats, deck, wordBank, getWord } = useApp()
  const { sakura, ink } = useProfileCosmetics()
  const { width } = useWindowDimensions()
  const column = Math.min(width, PROF_CONTENT_MAX)
  const content = column - s.screen * 2

  const run = useEntranceRun()
  const beat = { at: anim.at, duration: anim.for, run, distance: anim.slideY } as const

  /* Edit Profile is a popup over this screen. `?edit=1` opens it on arrival. */
  const params = useLocalSearchParams<{ edit?: string }>()
  const [editing, setEditing] = useState(false)
  useEffect(() => {
    if (params.edit) setEditing(true)
  }, [params.edit])
  const edit = () => {
    playTapSound()
    setEditing(true)
  }
  const go = (href: string) => () => {
    playTapSound()
    router.push(href as Href)
  }

  /* The header pins; its hairline only appears once the page has moved under it. */
  const scrollY = useRef(new Animated.Value(0)).current
  const hairline = scrollY.interpolate({ inputRange: [0, 12], outputRange: [0, 1], extrapolate: 'clamp' })

  const level = getLevelFromXp(xp)
  const hsk = Math.min(HSK_MAX_LEVEL, Math.max(1, settings.hskLevel))
  const name = settings.username.trim() || DEFAULT_SETTINGS.username
  const stats = useMemo(() => ({ due: dueCountFor(deck), weak: weakCardsFor(deck).length }), [deck])

  /* "Finish your profile": a name of their own and a photo. */
  const hasName = !!settings.username.trim() && settings.username.trim() !== DEFAULT_SETTINGS.username
  const hasPhoto = !!settings.avatarUri
  const stepsLeft = Number(!hasName) + Number(!hasPhoto)

  const journey = useMemo(() => {
    const byLevel = studiedByLevel(deck, (id) => getWord(id)?.hskLevel)
    const studied = byLevel.get(hsk) ?? 0
    const target = levelUpTarget(wordBank, hsk)
    return { studied, target, share: hsk >= HSK_MAX_LEVEL ? 1 : Math.min(1, studied / Math.max(1, target)) }
  }, [deck, getWord, wordBank, hsk])

  /* Earned medals first, then the ones nearest to being earned. */
  const medals = useMemo(() => {
    const earned = ACHIEVEMENTS.filter((def) => progression.achievements.unlocked[def.id])
    const nearest = ACHIEVEMENTS.filter((def) => !progression.achievements.unlocked[def.id]).sort(
      (a, b) => achievementProgress(b, achievementStats) / b.goal - achievementProgress(a, achievementStats) / a.goal,
    )
    return [...earned, ...nearest].slice(0, ACHIEVEMENT_ROW)
  }, [progression.achievements, achievementStats])
  const earnedCount = ACHIEVEMENTS.filter((def) => progression.achievements.unlocked[def.id]).length

  /* The garden spans the column at its own proportions, standing on the
     banner's floor; the avatar sits over its upper half. */
  const gardenWidth = column
  const bannerHeight = Math.max(gardenWidth / PROF_ART_RATIO.garden + GARDEN_HEADROOM, AVATAR_TOP + AVATAR + 24 + SHOWCASE_OVERLAP)
  const pinned = progression.achievements.pinned.map(achievementById).filter((d): d is AchievementDefinition => !!d)
  const showcaseLabel = pinned.length
    ? `Displayed awards: ${pinned.map((d) => d.name).join(', ')}. Open achievements`
    : 'No awards displayed yet. Open achievements to choose up to three'

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.background }}>
      {/* The pinned header: name and the way to Settings. */}
      <View style={{ alignItems: 'center', backgroundColor: c.background, zIndex: 2 }}>
        <View style={{ width: column, height: 56, paddingHorizontal: s.screen, flexDirection: 'row', alignItems: 'center', gap: s.md }}>
          <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, ...t.header, fontFamily: 'NunitoExtraBold', color: c.navy }}>
            {name}
          </Text>
          <PressableScale onPress={go('/settings')} scaleTo={0.9} hitSlop={6} accessibilityLabel="Settings">
            <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <SettingsIcon size={25} color={c.slate} strokeWidth={2} />
            </View>
          </PressableScale>
        </View>
        <Animated.View style={{ alignSelf: 'stretch', height: 1, backgroundColor: c.hairline, opacity: hairline }} />
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: NATIVE })}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: s.xxl * 2 }}
      >
        {/* The banner: the learner's Scholar's Garden behind the big avatar.
            Two sibling targets, never nested (nested Pressables double-fire on
            web): the garden opens the garden, the avatar changes the photo. */}
        <View style={{ alignSelf: 'stretch', height: bannerHeight, backgroundColor: c.tile, overflow: 'hidden' }}>
          <Pressable
            onPress={go('/profile/garden')}
            accessibilityRole="button"
            accessibilityLabel="Open Scholar’s Garden"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'flex-end' }}
          >
            <GardenScene width={gardenWidth} slots={progression.garden.slots} />
          </Pressable>
          <View pointerEvents="none" style={{ position: 'absolute', top: s.md, left: s.screen }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 10, paddingRight: 6, paddingVertical: 4, borderRadius: 999, backgroundColor: c.card, borderWidth: 1, borderColor: c.border }}>
              <Text style={{ ...t.tag, fontFamily: 'NunitoBold', color: c.slate }}>Scholar’s Garden</Text>
              <ChevronRight size={14} color={c.slate} strokeWidth={2.4} />
            </View>
          </View>
          <View pointerEvents="box-none" style={{ position: 'absolute', top: AVATAR_TOP, left: 0, right: 0, alignItems: 'center' }}>
            <Pressable onPress={edit} accessibilityRole="button" accessibilityLabel={hasPhoto ? 'Change your photo' : 'Add a photo'}>
              <BigAvatar name={name} photo={settings.avatarUri} sakura={sakura} />
            </Pressable>
          </View>
        </View>

        <View style={{ width: column, paddingHorizontal: s.screen }}>
          {/* The showcase: up to three awards chosen on the Achievements page
              ("Display on Profile"), on a card overlapping the garden's foot. */}
          <View style={{ marginTop: -SHOWCASE_OVERLAP }}>
            <PressableScale onPress={go('/profile/achievements')} scaleTo={0.985} accessibilityLabel={showcaseLabel}>
              <View style={{ borderRadius: profRadius.medium, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.card, paddingVertical: s.md }}>
                <GridRow>
                {Array.from({ length: MAX_PINNED }, (_, i) => {
                  const def = pinned[i]
                  return (
                    <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                      {def ? (
                        <Medal category={def.category} tier={achievementTier(def)} earned size={SHOWCASE_MEDAL} ink={ink.seal ? ink : undefined} />
                      ) : (
                        <MedalSlot size={SHOWCASE_MEDAL} />
                      )}
                      <Text
                        numberOfLines={1}
                        style={{ ...t.tag, fontFamily: def ? 'NunitoExtraBold' : 'NunitoSemiBold', color: def ? c.navy : c.lockedInk, marginTop: 4, paddingHorizontal: 2 }}
                      >
                        {def ? def.name : 'Display an award'}
                      </Text>
                    </View>
                  )
                })}
                </GridRow>
              </View>
            </PressableScale>
          </View>

          <Reveal from="bottom" {...beat}>
            <Text style={{ ...t.caps, fontFamily: 'NunitoBold', color: c.caps, marginTop: s.lg, textTransform: 'uppercase' }}>
              Level {level} · {levelTitle(level)}
            </Text>

            {/* Where Duolingo counts courses and friends: the learner's own numbers. */}
            <View style={{ flexDirection: 'row', marginTop: s.md }}>
              <RowStat value={deck.length.toLocaleString()} label="Saved words" />
              <RowStat value={streak.toLocaleString()} label="Day streak" />
              <RowStat value={`HSK ${hsk}`} label="Level" />
            </View>

            <View style={{ flexDirection: 'row', marginTop: s.lg }}>
              <ProfileButton label="Edit profile" icon={Pencil} tone="quiet" onPress={edit} />
            </View>

            {stepsLeft > 0 && <FinishCard stepsLeft={stepsLeft} onContinue={edit} />}
          </Reveal>

          <Reveal from="bottom" {...beat}>
            <SectionLabel title="Overview" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: s.sm }}>
              <OverviewTile width={(content - s.sm) / 2} icon={Zap} tint={c.gold} value={xp.toLocaleString()} label="Total XP" />
              <OverviewTile width={(content - s.sm) / 2} icon={Award} tint={c.sage} value={`Level ${level}`} label={levelTitle(level)} />
              <OverviewTile width={(content - s.sm) / 2} icon={Flame} tint={c.ribbon} value={streak.toLocaleString()} label="Day streak" />
              <OverviewTile width={(content - s.sm) / 2} icon={Clock3} tint={c.sage} value={stats.due.toLocaleString()} label="Due today" />
              <OverviewTile width={(content - s.sm) / 2} icon={TrendingDown} tint={c.lockedInk} value={stats.weak.toLocaleString()} label="Weak words" />
              <OverviewTile width={(content - s.sm) / 2} icon={Award} tint={c.goldRing} value={`${earnedCount} / ${ACHIEVEMENTS.length}`} label="Achievements" />
            </View>

            <SectionLabel title="HSK Journey" onPress={go('/settings/progress')} />
            <PressableScale onPress={go('/settings/progress')} scaleTo={0.985} accessibilityLabel={`HSK ${hsk}. ${journey.studied} of ${journey.target} words. Open progress`}>
              <View style={{ borderRadius: profRadius.medium, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.card, padding: s.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {Array.from({ length: HSK_MAX_LEVEL }, (_, i) => {
                    const n = i + 1
                    const reached = n <= hsk
                    return (
                      <View
                        key={n}
                        style={{
                          flex: 1,
                          height: 30,
                          borderRadius: 15,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: n === hsk ? ink.pill : reached ? ink.bar : c.locked,
                          borderWidth: n === hsk ? 2 : 0,
                          borderColor: ink.bar,
                        }}
                      >
                        <Text style={{ fontFamily: 'NunitoBold', fontSize: 12.5, color: n === hsk ? ink.pillInk : reached ? c.onJade : c.lockedInk }}>
                          {n}
                        </Text>
                      </View>
                    )
                  })}
                </View>
                <View style={{ marginTop: s.md }}>
                  <ProgressBar fraction={journey.share} color={ink.bar} height={6} />
                </View>
                <Text style={{ ...t.body, fontFamily: 'Nunito', color: c.slate, marginTop: s.sm }}>
                  {hsk >= HSK_MAX_LEVEL
                    ? 'You’ve reached HSK 6. Keep studying to master the rarer words.'
                    : journey.target - journey.studied <= 0
                      ? `Moving you up to HSK ${hsk + 1}…`
                      : `Study ${(journey.target - journey.studied).toLocaleString()} more HSK ${hsk} words to reach HSK ${hsk + 1}.`}
                </Text>
              </View>
            </PressableScale>

            <SectionLabel title="Rewards" onPress={go('/profile/rewards')} />
            <GridRow>
              {PROFILE_REWARDS.map((def) => {
                const unlocked = progression.profileRewards.unlocked.includes(def.id)
                const equipped = progression.profileRewards.equipped.includes(def.id)
                return (
                  <PressableScale
                    key={def.id}
                    onPress={go('/profile/rewards')}
                    scaleTo={0.92}
                    wrapperStyle={{ flex: 1 }}
                    accessibilityLabel={`${def.name}. ${equipped ? 'Equipped' : unlocked ? 'Unlocked' : `Unlocks at level ${def.unlockLevel}`}`}
                  >
                    <View style={{ alignItems: 'center' }}>
                      <View
                        style={{
                          width: 76,
                          height: 76,
                          borderRadius: 38,
                          backgroundColor: unlocked ? c.earnedTile : c.locked,
                          borderWidth: 2,
                          borderColor: equipped ? ink.bar : c.border,
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        <Image source={REWARD_ART[def.id]} resizeMode="contain" style={{ width: 58, height: 58, opacity: unlocked ? 1 : 0.35 }} />
                        {!unlocked && (
                          <View style={{ position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
                            <Lock size={14} color={c.lockedInk} strokeWidth={2.2} />
                          </View>
                        )}
                      </View>
                      <Text numberOfLines={1} style={{ ...t.tileLabel, fontFamily: 'NunitoSemiBold', color: c.slate, marginTop: 6 }}>
                        {equipped ? 'Equipped' : unlocked ? 'Unlocked' : `Level ${def.unlockLevel}`}
                      </Text>
                    </View>
                  </PressableScale>
                )
              })}
            </GridRow>

            <SectionLabel title="Achievements" onPress={go('/profile/achievements')} />
            <GridRow>
              {medals.map((def) => {
                const earned = !!progression.achievements.unlocked[def.id]
                const size = Math.min(62, (content - s.md * 2) / ACHIEVEMENT_ROW - 24)
                return (
                  <PressableScale
                    key={def.id}
                    onPress={go('/profile/achievements')}
                    scaleTo={0.92}
                    wrapperStyle={{ flex: 1 }}
                    accessibilityLabel={`${def.name}. ${earned ? 'Unlocked.' : `${achievementProgress(def, achievementStats)} of ${def.goal}.`}`}
                  >
                    <View style={{ alignItems: 'center' }}>
                      <View style={{ width: size, height: size * (1 + MEDAL_RIBBON), opacity: earned ? 1 : 0.4 }}>
                        <Medal category={def.category} tier={achievementTier(def)} earned={earned} size={size} />
                      </View>
                      <Text numberOfLines={1} style={{ ...t.tileLabel, fontFamily: 'NunitoSemiBold', color: c.slate, marginTop: 6 }}>
                        {def.name}
                      </Text>
                    </View>
                  </PressableScale>
                )
              })}
            </GridRow>
          </Reveal>
        </View>
      </Animated.ScrollView>
      <EditProfileSheet visible={editing} onClose={() => setEditing(false)} />
    </SafeAreaView>
  )
}

/** The banner's avatar: the photo, or the initial in a dashed ring with a "+" (Duolingo's empty outline). */
function BigAvatar({ name, photo, sakura }: { name: string; photo?: string; sakura: boolean }) {
  const initial = name.trim() ? name.trim()[0].toUpperCase() : '?'
  return (
    <View style={{ width: AVATAR + 24, height: AVATAR + 24, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: AVATAR,
          height: AVATAR,
          borderRadius: AVATAR / 2,
          backgroundColor: photo ? c.card : c.sage,
          borderWidth: photo ? 4 : 3,
          borderColor: photo ? c.card : c.bannerRing,
          borderStyle: photo ? 'solid' : 'dashed',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: AVATAR, height: AVATAR }} resizeMode="cover" accessibilityIgnoresInvertColors />
        ) : (
          <Text style={{ fontFamily: 'NunitoExtraBold', fontSize: AVATAR * 0.44, lineHeight: AVATAR * 0.56, color: c.onJade }}>{initial}</Text>
        )}
      </View>
      {sakura && (
        <View pointerEvents="none" style={{ position: 'absolute', width: AVATAR + 24, height: AVATAR + 24 }}>
          <Image source={profArt.sakuraWreath} resizeMode="contain" style={{ width: AVATAR + 24, height: AVATAR + 24 }} />
        </View>
      )}
      {!photo && (
        <View
          style={{
            position: 'absolute',
            right: 12,
            bottom: 12,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: c.jade,
            borderWidth: 3,
            borderColor: c.tile,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={18} color={c.onJade} strokeWidth={3} />
        </View>
      )}
    </View>
  )
}

/**
 * Three equal columns with the same gutter. The Rewards row, the Achievements
 * row and the showcase all use it, so their icons share centre lines.
 */
function GridRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: s.md }}>{children}</View>
}

function RowStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text numberOfLines={1} style={{ ...t.rowValue, fontFamily: 'NunitoExtraBold', color: c.navy }}>
        {value}
      </Text>
      <Text numberOfLines={1} style={{ ...t.rowLabel, fontFamily: 'Nunito', color: c.slate }}>
        {label}
      </Text>
    </View>
  )
}

/** A small-caps section label, with a chevron when it opens a full page. */
function SectionLabel({ title, onPress }: { title: string; onPress?: () => void }) {
  const label = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: s.xxl + s.xs, marginBottom: s.md }}>
      <Text style={{ ...t.caps, fontFamily: 'NunitoBold', color: c.caps, textTransform: 'uppercase' }}>{title}</Text>
      {onPress && <ChevronRight size={20} color={c.caps} strokeWidth={2.2} />}
    </View>
  )
  if (!onPress) return label
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Open ${title}`} hitSlop={6}>
      {label}
    </Pressable>
  )
}

function OverviewTile({ width, icon: Icon, tint, value, label }: { width: number; icon: IconType; tint: string; value: string; label: string }) {
  return (
    <View
      style={{
        width,
        flexDirection: 'row',
        alignItems: 'center',
        gap: s.sm,
        paddingHorizontal: s.md,
        paddingVertical: s.md,
        borderRadius: profRadius.medium,
        borderWidth: 1.5,
        borderColor: c.border,
        backgroundColor: c.card,
      }}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Icon size={22} color={tint} strokeWidth={2.2} />
      <View style={{ flexShrink: 1 }}>
        <Text numberOfLines={1} style={{ ...t.tileValue, fontFamily: 'NunitoExtraBold', color: c.navy }}>
          {value}
        </Text>
        <Text numberOfLines={1} style={{ ...t.tileLabel, fontFamily: 'Nunito', color: c.slate }}>
          {label}
        </Text>
      </View>
    </View>
  )
}

/** Duolingo's "Finish your profile!" card: Shifu, the steps left, and a Continue that opens the editor. */
function FinishCard({ stepsLeft, onContinue }: { stepsLeft: number; onContinue: () => void }) {
  return (
    <View
      style={{
        marginTop: s.lg,
        padding: s.lg,
        borderRadius: profRadius.large,
        backgroundColor: c.finish,
        borderWidth: 1,
        borderColor: c.finishBorder,
        overflow: 'hidden',
      }}
    >
      <Image
        source={profArt.shifu}
        resizeMode="contain"
        style={{ position: 'absolute', right: 6, top: 4, width: 112, height: 112 * (116 / 164) }}
      />
      <Text style={{ fontFamily: 'NunitoExtraBold', fontSize: 19, lineHeight: 24, color: c.navy }}>Finish your profile!</Text>
      <Text style={{ ...t.caps, fontFamily: 'NunitoBold', color: c.caps, textTransform: 'uppercase', marginTop: 4 }}>
        {stepsLeft} {stepsLeft === 1 ? 'step' : 'steps'} left
      </Text>
      <View style={{ marginTop: s.lg }}>
        <PressableScale onPress={onContinue} scaleTo={0.97} accessibilityLabel="Continue setting up your profile">
          <LiftedFace height={46} fill={c.jade} shoulder={c.jadeDark}>
            <Text style={{ fontFamily: 'NunitoExtraBold', fontSize: 15, letterSpacing: 0.8, color: c.onJade }}>CONTINUE</Text>
          </LiftedFace>
        </PressableScale>
      </View>
    </View>
  )
}
