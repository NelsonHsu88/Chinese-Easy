import { useEffect, useMemo, useState } from 'react'
import { View, Text, Image, ScrollView, useWindowDimensions } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams, type Href } from 'expo-router'
import { ArrowLeft, Gift, Lock, MoreHorizontal, Star } from 'lucide-react-native'
import { Pressable } from 'react-native'
import { useApp } from '../context/AppContext'
import { getLevelFromXp, getXpIntoCurrentLevel, getXpRequiredForNextLevel, levelTitle } from '../lib/progression/levels'
import { PROFILE_REWARDS, type ProfileRewardDef } from '../lib/progression/profileRewards'
import { ACHIEVEMENTS, MAX_PINNED, achievementById, achievementProgress, achievementTier } from '../lib/progression/achievements'
import { GARDEN_ITEMS } from '../lib/progression/gardenItems'
import { PressableScale } from '../components/dashboard/parts'
import { Reveal, useEntranceRun } from '../components/dashboard/entrance'
import {
  ProfileHero,
  ProfileCard,
  SectionCard,
  Tag,
  Medal,
  ProgressBar,
  GardenScene,
  DecorationThumb,
  ProfileButton,
  useProfileCosmetics,
} from '../components/profile/parts'
import { EditProfileSheet } from '../components/profile/EditProfileSheet'
import { HskJourney } from '../components/profile/HskJourney'
import { REWARD_ART } from '../components/profile/art'
import { profColors as c, profSpacing as s, profType as t, profRadius, profEntrance as anim, PROF_CONTENT_MAX } from '../components/profile/tokens'
import { playTapSound } from '../lib/sound'

/*
 * Profile, built to the Beta 2.1 reference (`SS 929 Redesigned Profile UI
 * Screen.png`), opened from the first card on Settings.
 *
 * Four systems meet here and are kept deliberately separate:
 *  - XP and level (`lib/progression/levels.ts`) — permanent, never spent;
 *  - three profile cosmetics (`profileRewards.ts`), unlocked by level, which
 *    change this screen and nothing else;
 *  - achievements (`achievements.ts`), trophies, up to three displayed here;
 *  - Scholar's Garden (`gardenItems.ts`), decorations placed in fixed slots.
 *
 * Every number on the page is the learner's own. The reference's "Open
 * Rewards Shop" is "View Rewards": there is no shop and no currency.
 */

/** How many decorations the garden preview row has room for. */
const GARDEN_PREVIEW = 5

export function Profile() {
  const { settings, xp, streak, progression, achievementStats } = useApp()
  const { ink } = useProfileCosmetics()

  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const column = Math.min(width, PROF_CONTENT_MAX)
  const content = column - s.screen * 2

  const run = useEntranceRun()
  const beat = { at: anim.at, duration: anim.for, run, distance: anim.slideY } as const

  /* Edit Profile is a popup over this screen. `?edit=1` opens it on arrival,
     which is all the old `/profile/edit` route does now. */
  const params = useLocalSearchParams<{ edit?: string }>()
  const [editing, setEditing] = useState(false)
  useEffect(() => {
    if (params.edit) setEditing(true)
  }, [params.edit])

  const level = getLevelFromXp(xp)
  const go = (href: string) => () => {
    playTapSound()
    router.push(href as Href)
  }

  /*
   * The three achievement tiles: what the learner has chosen to display, then
   * — only to fill the row — the achievements nearest to being earned, drawn
   * as progress rather than as trophies, so an empty shelf still says what to
   * aim at next.
   */
  const achievementTiles = useMemo(() => {
    const pinned = progression.achievements.pinned
      .map((id) => achievementById(id))
      .filter((d): d is NonNullable<typeof d> => !!d)
      .map((def) => ({ def, pinned: true }))
    const nearest = ACHIEVEMENTS.filter((def) => !progression.achievements.unlocked[def.id])
      .map((def) => ({ def, share: achievementProgress(def, achievementStats) / def.goal }))
      .sort((a, b) => b.share - a.share)
      .map(({ def }) => ({ def, pinned: false }))
    return [...pinned, ...nearest].slice(0, MAX_PINNED)
  }, [progression.achievements, achievementStats])

  /*
   * The garden preview row: the collection so far, then what is still to
   * come, dimmed and padlocked — so a new learner's row reads as a path rather
   * than as an empty shelf. The last place becomes "…" when more remain.
   */
  const owned = GARDEN_ITEMS.filter((i) => progression.garden.unlockedItemIds.includes(i.id))
  const coming = GARDEN_ITEMS.filter((i) => !progression.garden.unlockedItemIds.includes(i.id))
  const previewItems = [...owned.map((item) => ({ item, owned: true })), ...coming.map((item) => ({ item, owned: false }))]
  const overflow = previewItems.length > GARDEN_PREVIEW
  const nextDecoration = coming[0]

  const tileWidth = (content - s.md * 2 - s.sm * 2) / 3
  /* The garden panel's inner width: the section's padding, the panel's
     hairline, then the panel's own padding. */
  const gardenInner = content - s.md * 2 - 2 - s.md * 2
  const thumbSize = Math.floor((gardenInner - s.sm * (GARDEN_PREVIEW - 1)) / GARDEN_PREVIEW)

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: Math.max(s.xxl, insets.bottom + s.md) }}
      >
        <View style={{ width: column, paddingHorizontal: s.screen }}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings' as Href))}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
            className="items-center justify-center active:opacity-60"
            style={{ width: 40, height: 44, marginLeft: -6 }}
          >
            <ArrowLeft size={26} color={c.jadeDark} strokeWidth={2} />
          </Pressable>

          <ProfileHero column={column} run={run} />

          <Reveal from="bottom" {...beat}>
            <ProfileCard
              name={settings.username}
              photo={settings.avatarUri}
              level={level}
              title={levelTitle(level)}
              xpInto={getXpIntoCurrentLevel(xp)}
              xpNeeded={getXpRequiredForNextLevel(xp)}
              streak={streak}
              badges={progression.achievements.pinned
                .map((id) => achievementById(id))
                .filter((d): d is NonNullable<typeof d> => !!d)}
              onEdit={() => {
                playTapSound()
                setEditing(true)
              }}
              onBadges={go('/profile/achievements')}
            />
          </Reveal>

          <Reveal from="bottom" {...beat}>
            <View style={{ gap: s.md, marginTop: s.md }}>
              <HskJourney width={content - s.md * 2 - 2} />

              <SectionCard
                title="Current Rewards"
                action={{
                  label: (
                    <View className="flex-row items-center" style={{ gap: 6 }}>
                      <View className="items-center justify-center" style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.starDisc }}>
                        <Star size={15} color={c.star} fill={c.star} strokeWidth={1.5} />
                      </View>
                      <Text className="font-lora" style={{ ...t.link, color: c.navy }}>
                        XP {xp.toLocaleString()}
                      </Text>
                    </View>
                  ),
                  onPress: go('/profile/rewards'),
                  accessibilityLabel: `${xp} XP. View rewards`,
                }}
              >
                <View className="flex-row items-stretch" style={{ gap: s.sm }}>
                  {PROFILE_REWARDS.map((def) => (
                    <RewardTile key={def.id} def={def} width={tileWidth} level={level} onPress={go('/profile/rewards')} />
                  ))}
                </View>
              </SectionCard>

              <SectionCard
                title="Achievements"
                action={{ label: 'View All', onPress: go('/profile/achievements'), accessibilityLabel: 'View all achievements' }}
              >
                <View className="flex-row items-stretch" style={{ gap: s.sm }}>
                  {achievementTiles.map(({ def, pinned }) => {
                    const earned = !!progression.achievements.unlocked[def.id]
                    const progress = achievementProgress(def, achievementStats)
                    return (
                      <PressableScale
                        key={def.id}
                        onPress={go('/profile/achievements')}
                        scaleTo={0.97}
                        wrapperStyle={{ width: tileWidth, alignSelf: 'stretch' }}
                        style={{ flex: 1 }}
                        accessibilityLabel={`${def.name}. ${def.description} ${earned ? 'Unlocked.' : `${progress} of ${def.goal}.`}`}
                      >
                        <Tile
                          earned={earned}
                          achieved={earned}
                          foot={
                            earned ? (
                              <Tag tone="on">{pinned ? 'Displayed' : 'Unlocked'}</Tag>
                            ) : (
                              <View>
                                <ProgressBar fraction={progress / def.goal} color={ink.bar} height={6} />
                                <Text className="font-lora" style={{ ...t.tag, color: c.slate, marginTop: 4 }}>
                                  {progress.toLocaleString()} / {def.goal.toLocaleString()}
                                </Text>
                              </View>
                            )
                          }
                        >
                          <Medal category={def.category} tier={achievementTier(def)} earned={earned} size={50} ink={pinned && ink.seal ? ink : undefined} />
                          <Text className="font-lora-bold" style={{ ...t.tileTitle, color: c.navy, marginTop: s.sm }}>
                            {def.name}
                          </Text>
                          <Text className="font-lora" style={{ ...t.tileBody, color: c.slate, marginTop: 2 }}>
                            {def.description}
                          </Text>
                        </Tile>
                      </PressableScale>
                    )
                  })}
                </View>
              </SectionCard>

              <SectionCard
                title="Scholar’s Garden"
                action={{ label: 'View Collection', onPress: go('/profile/garden'), accessibilityLabel: 'View garden collection' }}
              >
                <PressableScale onPress={go('/profile/garden')} scaleTo={0.99} accessibilityLabel="Open Scholar’s Garden">
                  <View style={{ borderRadius: profRadius.medium, backgroundColor: c.tile, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
                    <GardenScene width={content - s.md * 2 - 2} slots={progression.garden.slots} />
                    <View style={{ padding: s.md, paddingTop: s.xs }}>
                      <Text className="font-lora" style={{ ...t.body, color: c.slate }}>
                        Decorate your garden with rewards from your journey.
                      </Text>
                      <View className="flex-row" style={{ gap: s.sm, marginTop: s.md }}>
                        {previewItems.slice(0, overflow ? GARDEN_PREVIEW - 1 : GARDEN_PREVIEW).map(({ item, owned: have }) => (
                          <View key={item.id} style={{ width: thumbSize, height: thumbSize }}>
                            <DecorationThumb item={item.id} size={thumbSize} dim={!have} />
                            {!have && (
                              <View
                                className="items-center justify-center"
                                style={{
                                  position: 'absolute',
                                  right: -4,
                                  top: -4,
                                  width: 18,
                                  height: 18,
                                  borderRadius: 9,
                                  backgroundColor: c.card,
                                  borderWidth: 1,
                                  borderColor: c.border,
                                }}
                              >
                                <Lock size={9} color={c.lockedInk} strokeWidth={2.4} />
                              </View>
                            )}
                          </View>
                        ))}
                        {overflow && (
                          <View
                            className="items-center justify-center"
                            style={{ width: thumbSize, height: thumbSize, borderRadius: profRadius.small, backgroundColor: c.tile, borderWidth: 1, borderColor: c.border }}
                          >
                            <MoreHorizontal size={20} color={c.slate} />
                          </View>
                        )}
                      </View>
                      {nextDecoration && (
                        <Text className="font-lora" style={{ ...t.tag, color: c.slate, marginTop: s.sm }}>
                          Next: {nextDecoration.name} at Level {nextDecoration.unlockLevel}
                        </Text>
                      )}
                    </View>
                  </View>
                </PressableScale>
              </SectionCard>

              {/* One button, centred. Edit Profile moved onto the card itself. */}
              <View className="flex-row justify-center" style={{ marginTop: s.xs }}>
                <View className="flex-row" style={{ width: Math.min(content, 280) }}>
                  <ProfileButton label="View Rewards" icon={Gift} tone="primary" trailing onPress={go('/profile/rewards')} />
                </View>
              </View>
            </View>
          </Reveal>
        </View>
      </ScrollView>
      <EditProfileSheet visible={editing} onClose={() => setEditing(false)} />
    </SafeAreaView>
  )
}

/**
 * The warm inner tile the reward and achievement cards are built from. It
 * fills its row's height, so three tiles side by side are one height however
 * their titles wrap, and `foot` — the tag or progress bar — sits on one line
 * across the row.
 */
function Tile({
  children,
  foot,
  earned = false,
  achieved = false,
}: {
  children: React.ReactNode
  foot: React.ReactNode
  earned?: boolean
  /** An earned achievement: the stronger green wash, since its medal is in full colour either way. */
  achieved?: boolean
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: achieved ? c.achievedTile : earned ? c.earnedTile : c.tile,
        borderRadius: profRadius.medium,
        borderWidth: 1,
        borderColor: achieved ? c.achievedBorder : c.border,
        padding: s.sm + 2,
      }}
    >
      {children}
      <View style={{ flexGrow: 1, minHeight: s.sm }} />
      {foot}
    </View>
  )
}

/** One of the three cosmetics: its picture, its name, and whether it is worn. */
function RewardTile({ def, width, level, onPress }: { def: ProfileRewardDef; width: number; level: number; onPress: () => void }) {
  const { progression } = useApp()
  const unlocked = progression.profileRewards.unlocked.includes(def.id)
  const equipped = progression.profileRewards.equipped.includes(def.id)
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.97}
      wrapperStyle={{ width, alignSelf: 'stretch' }}
      style={{ flex: 1 }}
      accessibilityLabel={`${def.name}. ${equipped ? 'Equipped' : unlocked ? 'Unlocked' : `Unlocks at level ${def.unlockLevel}`}`}
    >
      <Tile
        earned={equipped}
        foot={
          equipped ? (
            <Tag tone="on">Equipped</Tag>
          ) : unlocked ? (
            <Tag tone="off">Unlocked</Tag>
          ) : (
            <Tag tone="locked">{level >= def.unlockLevel ? 'Unlocking…' : `Level ${def.unlockLevel}`}</Tag>
          )
        }
      >
        <View className="items-center justify-center" style={{ height: width - 40 }}>
          <Image source={REWARD_ART[def.id]} resizeMode="contain" style={{ width: width - 34, height: width - 44, opacity: unlocked ? 1 : 0.4 }} />
          {!unlocked && (
            <View
              className="items-center justify-center"
              style={{ position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: c.card, borderWidth: 1, borderColor: c.border }}
            >
              <Lock size={14} color={c.lockedInk} strokeWidth={2.2} />
            </View>
          )}
        </View>
        {/* Wraps rather than truncating: "Misty Mountain Background" is three
            lines in a third of a phone column. */}
        <Text className="font-lora" style={{ ...t.tileTitle, color: c.navy, marginTop: s.xs }}>
          {def.name}
        </Text>
      </Tile>
    </PressableScale>
  )
}
