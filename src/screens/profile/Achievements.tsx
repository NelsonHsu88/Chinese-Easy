import { useEffect, useState } from 'react'
import { View, Text, Pressable, Modal, Image } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { X } from 'lucide-react-native'
import { useApp } from '../../context/AppContext'
import {
  ACHIEVEMENTS,
  MAX_PINNED,
  achievementById,
  achievementProgress,
  achievementTier,
  type AchievementCategory,
  type AchievementDefinition,
} from '../../lib/progression/achievements'
import { ProfileSubpage, Medal, MedalSlot, ProgressBar, Tag, useProfileCosmetics } from '../../components/profile/parts'
import { ACHIEVEMENT_ART } from '../../components/profile/art'
import { profColors as c, profSpacing as s, profType as t, profRadius, profShadow } from '../../components/profile/tokens'
import { tickHaptic } from '../../lib/haptics'

/*
 * Every achievement, earned or not, grouped by what it measures — and the
 * place to choose which three are displayed on the profile.
 *
 * Pinning a fourth never silently evicts one: `pinAchievement` refuses, and
 * this screen opens a chooser asking which of the three to replace. The same
 * chooser opens straight away when the screen is reached with `?replace=<id>`,
 * which is what the achievement celebration's "Choose Profile Badge" does.
 */

const CATEGORY_TITLES: Record<AchievementCategory, string> = {
  vocabulary: 'Vocabulary',
  review: 'Review',
  writing: 'Writing',
  listening: 'Listening',
  reading: 'Reading',
  streak: 'Habit',
  challenges: 'Challenges',
}

const CATEGORY_ORDER: AchievementCategory[] = ['vocabulary', 'review', 'writing', 'listening', 'reading', 'streak', 'challenges']

export function Achievements() {
  const { progression, achievementStats, pinAchievement, unpinAchievement, replacePinnedAchievement } = useApp()
  const { ink } = useProfileCosmetics()
  const params = useLocalSearchParams<{ replace?: string }>()
  /** The achievement waiting for a slot while the chooser is open. */
  const [incoming, setIncoming] = useState<string | null>(null)

  useEffect(() => {
    if (params.replace && progression.achievements.unlocked[params.replace]) {
      if (pinAchievement(params.replace) === 'full') setIncoming(params.replace)
    }
    // Once, on arrival — not on every later change to the pins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.replace])

  const earnedCount = Object.keys(progression.achievements.unlocked).length
  const pinned = progression.achievements.pinned

  const togglePin = (def: AchievementDefinition) => {
    tickHaptic()
    if (pinned.includes(def.id)) {
      unpinAchievement(def.id)
      return
    }
    if (pinAchievement(def.id) === 'full') setIncoming(def.id)
  }

  return (
    <ProfileSubpage
      title="Achievements"
      subtitle={`Trophies from your journey. Display up to ${MAX_PINNED} on your profile.`}
      footer={
        <ReplaceSheet
          incoming={incoming}
          pinned={pinned}
          onPick={(outgoing) => {
            if (incoming) replacePinnedAchievement(outgoing, incoming)
            setIncoming(null)
          }}
          onClose={() => setIncoming(null)}
        />
      }
    >
      {() => (
        <View style={{ gap: s.xl }}>
          <View style={{ backgroundColor: c.card, borderRadius: profRadius.large, borderWidth: 1, borderColor: c.border, padding: s.lg, ...profShadow }}>
            <View className="flex-row items-end justify-between">
              <Text className="font-lora-bold" style={{ fontSize: 30, lineHeight: 34, color: c.navy }}>
                {earnedCount}
                <Text className="font-lora" style={{ fontSize: 16, color: c.slate }}>
                  {' '}/ {ACHIEVEMENTS.length} earned
                </Text>
              </Text>
            </View>
            <View style={{ marginTop: s.sm }}>
              <ProgressBar fraction={earnedCount / ACHIEVEMENTS.length} color={ink.bar} />
            </View>

            {/* The shelf the profile shows, as the profile shows it: the pinned
                badges in order, then a dashed place for each one still free. */}
            <Text className="font-lora" style={{ ...t.tag, color: c.slate, marginTop: s.lg, letterSpacing: 0.6, textTransform: 'uppercase' }}>
              On your profile
            </Text>
            <View className="flex-row" style={{ gap: s.sm, marginTop: s.sm }}>
              {Array.from({ length: MAX_PINNED }, (_, i) => {
                const def = pinned[i] ? achievementById(pinned[i]) : undefined
                return (
                  <View
                    key={i}
                    className="flex-1 items-center"
                    style={{ backgroundColor: def ? c.earnedTile : c.tile, borderRadius: profRadius.medium, borderWidth: 1, borderColor: c.border, paddingVertical: s.md, paddingHorizontal: 4 }}
                  >
                    {def ? <Medal category={def.category} tier={achievementTier(def)} earned size={44} ink={ink.seal ? ink : undefined} /> : <MedalSlot size={44} />}
                    <Text
                      className={def ? 'font-lora-bold' : 'font-lora'}
                      numberOfLines={2}
                      style={{ ...t.tag, textAlign: 'center', color: def ? c.navy : c.lockedInk, marginTop: 6 }}
                    >
                      {def ? def.name : 'Empty'}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>

          {CATEGORY_ORDER.map((category) => (
            <View key={category}>
              <CategoryBanner
                category={category}
                earned={ACHIEVEMENTS.filter((a) => a.category === category && progression.achievements.unlocked[a.id]).length}
                total={ACHIEVEMENTS.filter((a) => a.category === category).length}
                bar={ink.bar}
              />
              <View style={{ gap: s.sm }}>
                {ACHIEVEMENTS.filter((a) => a.category === category).map((def) => {
                  const earned = !!progression.achievements.unlocked[def.id]
                  const isPinned = pinned.includes(def.id)
                  const progress = achievementProgress(def, achievementStats)
                  return (
                    <View
                      key={def.id}
                      className="flex-row items-center"
                      style={{
                        // Every medal is in full colour, so the light green wash is
                        // what marks an achievement as earned.
                        backgroundColor: earned ? c.achievedTile : c.card,
                        borderRadius: profRadius.large,
                        borderWidth: 1,
                        borderColor: isPinned ? c.jade : earned ? c.achievedBorder : c.border,
                        padding: s.md,
                        gap: s.md,
                        ...profShadow,
                      }}
                    >
                      <Medal category={def.category} tier={achievementTier(def)} earned={earned} size={58} ink={isPinned && ink.seal ? ink : undefined} />
                      <View style={{ flex: 1 }}>
                        <Text className="font-lora-bold" style={{ fontSize: 15.5, lineHeight: 20, color: c.navy }}>
                          {def.name}
                        </Text>
                        <Text className="font-lora" style={{ ...t.tileBody, fontSize: 13, lineHeight: 17, color: c.slate }}>
                          {def.description}
                        </Text>
                        {earned ? (
                          <Pressable
                            onPress={() => togglePin(def)}
                            accessibilityRole="button"
                            accessibilityLabel={isPinned ? `Remove ${def.name} from your profile` : `Display ${def.name} on your profile`}
                            className="active:opacity-60"
                            style={{ marginTop: s.sm, alignSelf: 'flex-start' }}
                          >
                            {isPinned ? (
                              <Tag tone="on">Displayed on Profile</Tag>
                            ) : (
                              <Tag tone="off">Display on Profile</Tag>
                            )}
                          </Pressable>
                        ) : (
                          <View className="flex-row items-center" style={{ marginTop: s.sm, gap: s.sm }}>
                            <View style={{ flex: 1 }}>
                              <ProgressBar fraction={progress / def.goal} color={ink.bar} height={6} />
                            </View>
                            <Text className="font-lora" style={{ ...t.tag, color: c.slate }}>
                              {progress.toLocaleString()} / {def.goal.toLocaleString()}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )
                })}
              </View>
            </View>
          ))}
        </View>
      )}
    </ProfileSubpage>
  )
}

/** How tall a category banner's painting is drawn. Width follows its ratio. */
const BANNER_ART_HEIGHT = 76

/**
 * The painted card that heads each group: the category's scene on the right,
 * its name, and how much of it is earned. The painting is the same one the
 * learner meets on the Challenges card for that activity, so "Writing" here
 * looks like the writing they do. Earned-out groups say so in jade.
 */
function CategoryBanner({ category, earned, total, bar }: { category: AchievementCategory; earned: number; total: number; bar: string }) {
  const art = ACHIEVEMENT_ART[category]
  /* The tall scroll would crowd the text at the banner's height; the wide
     scenes are capped so none takes more than ~40% of the card. */
  const artWidth = Math.min(BANNER_ART_HEIGHT * art.ratio, 136)
  const complete = earned === total
  return (
    <View
      className="flex-row items-center"
      style={{
        marginBottom: s.sm,
        backgroundColor: c.card,
        borderRadius: profRadius.large,
        borderWidth: 1,
        borderColor: complete ? c.jade : c.border,
        paddingLeft: s.lg,
        paddingRight: s.sm,
        paddingVertical: s.sm,
        overflow: 'hidden',
        ...profShadow,
      }}
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${CATEGORY_TITLES[category]}. ${earned} of ${total} earned.`}
    >
      <View style={{ flex: 1, paddingRight: s.sm }}>
        <Text className="font-lora-bold" style={{ ...t.section, fontSize: 20, lineHeight: 25, color: c.navy }}>
          {CATEGORY_TITLES[category]}
        </Text>
        <Text className="font-lora" style={{ ...t.tag, color: complete ? c.jadeDark : c.slate, marginTop: 2 }}>
          {complete ? 'All earned' : `${earned} of ${total} earned`}
        </Text>
        <View style={{ marginTop: s.sm, maxWidth: 150 }}>
          <ProgressBar fraction={earned / total} color={bar} height={5} />
        </View>
      </View>
      <Image source={art.source} resizeMode="contain" style={{ width: artWidth, height: BANNER_ART_HEIGHT }} />
    </View>
  )
}

/**
 * "Your profile shows three badges — which one should make way?" A bottom
 * sheet over the list; cancelling leaves the three as they were.
 */
function ReplaceSheet({
  incoming,
  pinned,
  onPick,
  onClose,
}: {
  incoming: string | null
  pinned: string[]
  onPick: (outgoing: string) => void
  onClose: () => void
}) {
  const incomingDef = incoming ? achievementById(incoming) : undefined
  return (
    <Modal visible={!!incomingDef} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' }} accessibilityLabel="Cancel">
        <Pressable
          onPress={() => {}}
          style={{ backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: s.xl, paddingBottom: s.xxl + s.md, alignSelf: 'center', width: '100%', maxWidth: 430 }}
        >
          <View className="flex-row items-start justify-between">
            <View style={{ flex: 1 }}>
              <Text className="font-lora-bold" style={{ ...t.section, color: c.navy }}>
                Choose a badge to replace
              </Text>
              <Text className="font-lora" style={{ ...t.body, color: c.slate, marginTop: 4 }}>
                Your profile shows {MAX_PINNED}. {incomingDef?.name} will take the place of the one you pick.
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <X size={22} color={c.slate} />
            </Pressable>
          </View>
          <View style={{ gap: s.sm, marginTop: s.lg }}>
            {pinned.map((id) => {
              const def = achievementById(id)
              if (!def) return null
              return (
                <Pressable
                  key={id}
                  onPress={() => onPick(id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Replace ${def.name}`}
                  className="flex-row items-center active:opacity-70"
                  style={{ gap: s.md, backgroundColor: c.card, borderRadius: profRadius.medium, borderWidth: 1, borderColor: c.border, padding: s.md }}
                >
                  <Medal category={def.category} tier={achievementTier(def)} earned size={40} />
                  <Text className="font-lora-bold" style={{ fontSize: 15.5, color: c.navy, flex: 1 }}>
                    {def.name}
                  </Text>
                  <Text className="font-lora" style={{ ...t.link, color: c.jadeDark }}>
                    Replace
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
