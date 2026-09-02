import { View, Text, Image } from 'react-native'
import { ChevronRight, Leaf, Check } from 'lucide-react-native'
import { PressRow, Card, SETTINGS_ART } from './parts'
import {
  setColors as c,
  setSpacing as s,
  setSurfaces,
  setType as t,
  setRadius,
} from './tokens'
import type { WeekDay } from '../../lib/progress'

/*
 * The two cards on the Settings landing page that are not lists of rows.
 */

/**
 * Who you are, and the way to change it.
 *
 * The whole card is one pressable rather than a row with a button in it: there
 * is exactly one destination behind it, and a card with a single target should
 * take the whole target area. (It is also why the chevron is a plain View —
 * nesting a Pressable inside a Pressable double-fires on the web target, where
 * the synthetic event bubbles from the inner handler to the outer one.)
 */
export function ProfileCard({
  name,
  email,
  onPress,
}: {
  name: string
  email: string
  onPress: () => void
}) {
  const initial = name.trim() ? name.trim()[0].toUpperCase() : '?'

  return (
    <Card>
      <PressRow
        onPress={onPress}
        accessibilityLabel={`Edit profile for ${name}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 96,
          paddingHorizontal: s.lg,
          paddingVertical: s.lg,
        }}
      >
        <View
          className="items-center justify-center rounded-full"
          style={{ width: 56, height: 56, backgroundColor: c.sage }}
        >
          <Text className="font-nunito-extrabold" style={{ ...t.avatar, color: '#FFFFFF' }}>
            {initial}
          </Text>
        </View>

        <View style={{ flex: 1, marginLeft: s.lg, marginRight: s.sm }}>
          <Text
            className="font-nunito-extrabold"
            numberOfLines={1}
            style={{ ...t.profileName, color: c.navy }}
          >
            {name || 'Learner'}
          </Text>
          {/*
            Onboarding captures an address, but an install that predates it — or
            one that took the Google path and backed out — has none. Rather than
            print an empty line, the card says what tapping it is for.
          */}
          <Text
            className="font-nunito-semibold"
            numberOfLines={1}
            style={{ ...t.profileMeta, color: c.textSecondary, marginTop: 2 }}
          >
            {email || 'Tap to edit your profile'}
          </Text>
        </View>

        <ChevronRight size={20} color={c.textMuted} strokeWidth={2.2} />
      </PressRow>
    </Card>
  )
}

/** Mon–Sun. Spelled out here rather than in `progress.ts`, whose single letters
 *  exist for the Dashboard's much narrower seven-column strip. */
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/**
 * Encouragement, not a control.
 *
 * The only card on the screen that does not change a setting, and it is here
 * on purpose: a settings page is the one screen a learner opens when they are
 * *not* studying, which makes it the best place in the app to show them what
 * they would be giving up.
 *
 * Every number is the learner's own — the streak from context, the seven days
 * from `currentWeekActivity`. A hardcoded five-day streak on a screen about
 * personalisation would be the most obvious lie in the app.
 */
export function StreakCard({ streak, week }: { streak: number; week: WeekDay[] }) {
  return (
    <View
      style={{
        backgroundColor: setSurfaces.streak.fill,
        borderColor: setSurfaces.streak.border,
        borderWidth: 1,
        borderRadius: setRadius.card,
        minHeight: 148,
        overflow: 'hidden',
      }}
    >
      {/*
        The bonsai is absolutely positioned and allowed to run past the card's
        bottom edge — `overflow: hidden` on the card is what turns the overhang
        into a tree rooted in the corner rather than a picture of one sitting on
        top. Out of flow, it also costs the text beside it nothing: the content
        column is simply inset by the width the tree occupies.
      */}
      <View pointerEvents="none" style={{ position: 'absolute', left: -4, bottom: -8 }}>
        <Image
          source={SETTINGS_ART.bonsai.source}
          style={{ width: 116, height: 116 / SETTINGS_ART.bonsai.ratio }}
          resizeMode="contain"
        />
      </View>

      <View
        style={{
          flex: 1,
          paddingLeft: 110,
          paddingRight: s.lg,
          paddingVertical: s.lg,
          justifyContent: 'space-between',
          gap: s.md,
        }}
      >
        <View className="flex-row items-start" style={{ gap: s.md }}>
          <View style={{ flex: 1 }}>
            <Text className="font-nunito-extrabold" style={{ ...t.streakTitle, color: c.navy }}>
              Keep your streak growing!
            </Text>
            <Text
              className="font-nunito-semibold"
              style={{ ...t.streakBody, color: c.textSecondary, marginTop: 2 }}
            >
              {streak > 0
                ? `You're on a ${streak}-day streak.`
                : 'Study today to start a new streak.'}
            </Text>
          </View>

          <View className="items-center">
            <View className="flex-row items-center" style={{ gap: 3 }}>
              <Text className="font-nunito-extrabold" style={{ ...t.streakCount, color: c.greenDark }}>
                {streak}
              </Text>
              <Leaf size={15} color={c.green} strokeWidth={2.4} />
            </View>
            <Text
              className="font-nunito-semibold"
              style={{ fontSize: 12.5, lineHeight: 16, color: c.textSecondary }}
            >
              {streak === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </View>

        {/*
          Three states, and the third one matters — the same rule the Dashboard's
          strip follows. A day worked is a filled tick; a day missed is a muted
          ring; a day still to come is a pale green one, because telling a
          learner on Tuesday that they have already missed Saturday is untrue.
        */}
        <View className="flex-row">
          {week.map((day, i) => (
            <View key={day.date} className="items-center" style={{ flex: 1 }}>
              <Text
                className="font-nunito-bold"
                style={{
                  ...t.streakDay,
                  color: day.isToday ? c.greenDark : c.textMuted,
                  marginBottom: 5,
                }}
              >
                {DAY_NAMES[i]}
              </Text>
              {day.active ? (
                <View
                  className="items-center justify-center rounded-full"
                  style={{ width: 22, height: 22, backgroundColor: c.green }}
                >
                  <Check size={12} color="#FFFFFF" strokeWidth={3.4} />
                </View>
              ) : (
                <View
                  className="rounded-full"
                  style={{
                    width: 22,
                    height: 22,
                    borderWidth: 1.5,
                    borderColor: day.isFuture || day.isToday ? c.greenRing : c.neutralTrack,
                    backgroundColor: c.card,
                  }}
                />
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}
