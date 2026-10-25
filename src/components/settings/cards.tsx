import { View, Text, Image } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { PressRow, Card } from './parts'
import { setColors as c, setSpacing as s, setType as t } from './tokens'

/*
 * The one card on the Settings landing page that is not a list of rows.
 */

/**
 * Who you are, and the way in to your Profile.
 *
 * The whole card is one pressable rather than a row with a button in it: there
 * is exactly one destination behind it, and a card with a single target should
 * take the whole target area. (It is also why the chevron is a plain View —
 * nesting a Pressable inside a Pressable double-fires on the web target, where
 * the synthetic event bubbles from the inner handler to the outer one.)
 */
export function ProfileCard({
  name,
  photo,
  detail,
  onPress,
  height = 80,
}: {
  name: string
  /** `settings.avatarUri` — the learner's picture, when they have chosen one. */
  photo?: string
  /** One line under the name — the learner's level and title. */
  detail: string
  onPress: () => void
  /** The card's height — the hub hands in a shorter one on a short screen. */
  height?: number
}) {
  const avatar = Math.min(52, height - 24)
  const initial = name.trim() ? name.trim()[0].toUpperCase() : '?'

  return (
    <Card>
      <PressRow
        onPress={onPress}
        accessibilityLabel={`Open profile for ${name}. ${detail}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height,
          paddingHorizontal: s.lg,
        }}
      >
        <View
          className="items-center justify-center rounded-full"
          style={{ width: avatar, height: avatar, backgroundColor: c.sage, overflow: 'hidden' }}
        >
          {photo ? (
            <Image source={{ uri: photo }} style={{ width: avatar, height: avatar }} resizeMode="cover" />
          ) : (
            <Text className="font-nunito-extrabold" style={{ ...t.avatar, color: '#FFFFFF' }}>
              {initial}
            </Text>
          )}
        </View>

        <View style={{ flex: 1, marginLeft: s.lg, marginRight: s.sm }}>
          <Text
            className="font-nunito-extrabold"
            numberOfLines={1}
            style={{ ...t.profileName, color: c.navy }}
          >
            {name || 'Learner'}
          </Text>
          <Text
            className="font-nunito-semibold"
            numberOfLines={1}
            style={{ ...t.profileMeta, color: c.textSecondary, marginTop: 2 }}
          >
            {detail}
          </Text>
        </View>

        <ChevronRight size={20} color={c.textMuted} strokeWidth={2.2} />
      </PressRow>
    </Card>
  )
}
