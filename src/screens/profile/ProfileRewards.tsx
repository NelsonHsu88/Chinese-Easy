import { View, Text, Image } from 'react-native'
import { useApp } from '../../context/AppContext'
import { getLevelFromXp } from '../../lib/progression/levels'
import { PROFILE_REWARDS } from '../../lib/progression/profileRewards'
import { ProfileSubpage, ProgressBar, Tag, PillButton, useProfileCosmetics } from '../../components/profile/parts'
import { REWARD_ART } from '../../components/profile/art'
import { profColors as c, profSpacing as s, profType as t, profRadius, profShadow } from '../../components/profile/tokens'
import { tickHaptic } from '../../lib/haptics'

/*
 * Profile Rewards — the three cosmetics, what each does, what level unlocks
 * it, and a switch to wear it. Not a shop: nothing here has a price, and there
 * is nothing to buy it with. Each reward changes the Profile screen only.
 */
export function ProfileRewards() {
  const { xp, progression, equipProfileReward } = useApp()
  const { ink } = useProfileCosmetics()
  const level = getLevelFromXp(xp)

  return (
    <ProfileSubpage title="Rewards" subtitle="Unlocked as you level up. They decorate your profile only.">
      {() => (
        <View style={{ gap: s.md }}>
          {PROFILE_REWARDS.map((def) => {
            const unlocked = progression.profileRewards.unlocked.includes(def.id)
            const equipped = progression.profileRewards.equipped.includes(def.id)
            return (
              <View
                key={def.id}
                className="flex-row"
                /* Plain paper, by request — no hue wash. An equipped reward is
                   marked by a jade border rather than a colour. */
                style={{ backgroundColor: c.card, borderRadius: profRadius.large, borderWidth: equipped ? 1.5 : 1, borderColor: equipped ? c.jade : c.border, padding: s.md, gap: s.md, ...profShadow }}
              >
                <View
                  className="items-center justify-center"
                  style={{ width: 88, height: 88, borderRadius: profRadius.medium, backgroundColor: c.tile, borderWidth: 1, borderColor: c.border }}
                >
                  <Image source={REWARD_ART[def.id]} resizeMode="contain" style={{ width: 74, height: 74, opacity: unlocked ? 1 : 0.4 }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="font-nunito-extrabold" style={{ fontSize: 17, lineHeight: 22, color: c.navy }}>
                    {def.name}
                  </Text>
                  <Text className="font-nunito-semibold" style={{ ...t.tileBody, fontSize: 13, lineHeight: 17, color: c.slate, marginTop: 2 }}>
                    {def.description}
                  </Text>
                  <View style={{ marginTop: s.md }}>
                    {unlocked ? (
                      <View className="flex-row items-center justify-between" style={{ gap: s.sm }}>
                        {/* Wrapped: Tag is `self-start`, which beats the row's
                            items-center and left it riding high beside the pill. */}
                        <View>
                          <Tag tone={equipped ? 'on' : 'off'}>{equipped ? 'Equipped' : 'Unlocked'}</Tag>
                        </View>
                        <PillButton
                          label={equipped ? 'Unequip' : 'Equip'}
                          tone={equipped ? 'quiet' : 'primary'}
                          accessibilityLabel={`${equipped ? 'Unequip' : 'Equip'} ${def.name}`}
                          onPress={() => {
                            tickHaptic()
                            equipProfileReward(def.id, !equipped)
                          }}
                        />
                      </View>
                    ) : (
                      <View>
                        <Tag tone="locked">Unlocks at Level {def.unlockLevel}</Tag>
                        <View style={{ marginTop: s.sm }}>
                          <ProgressBar fraction={level / def.unlockLevel} color={ink.bar} height={6} />
                        </View>
                        <Text className="font-nunito-semibold" style={{ ...t.tag, color: c.slate, marginTop: 4 }}>
                          You are Level {level}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )
          })}
        </View>
      )}
    </ProfileSubpage>
  )
}
