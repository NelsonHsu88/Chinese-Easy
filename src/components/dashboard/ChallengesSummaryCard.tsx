import { View, Text } from 'react-native'
import { Trophy } from 'lucide-react-native'
import { DashboardCard, CardArt, CardTitle, CardIconBadge } from './parts'
import { dashArt } from './art'
import {
  dashColors as c,
  dashSurfaces,
  dashSpacing as s,
  dashType as t,
  dashRadius,
  dashHeights,
} from './tokens'

/*
 * Daily challenges, summarised to the two numbers worth acting on.
 *
 * The whole card is one target — "View all" is a plain label, not a second
 * pressable, for the same reason the Review card's pill is (a nested handler
 * fires alongside the outer one on the web target).
 */
export function ChallengesSummaryCard({
  claimable,
  total,
  onPress,
}: {
  claimable: number
  total: number
  onPress: () => void
}) {
  return (
    <DashboardCard
      fill={dashSurfaces.challenges.fill}
      border={dashSurfaces.challenges.border}
      minHeight={dashHeights.challenges}
      onPress={onPress}
      accessibilityLabel={`Daily challenges, ${claimable} of ${total} ready to claim`}
    >
      {/*
        The scroll tucks into the bottom-right corner behind the stats panel.
        It is inset a little from both edges rather than bled off them — this is
        a whole object with two finished ends, and clipping one turns it into a
        stick.
      */}
      {/*
        Width is set by the *height* it implies, not by how it looks alone: this
        is the tallest of the four illustrations relative to its width, and at
        112 its top edge reached the subtitle and drew a scroll through
        "Complete goals to earn bonus XP".

        84 rather than 92, and clear of the bottom edge rather than two points
        past it. At 92 the scroll stood 116 tall in a 168 card and was hung off
        `bottom: -2`, so the card's `overflow: hidden` sliced the lower roller
        off — one finished end of a whole object, cut. It is a small change on
        purpose: this is the card's only illustration and shrinking it further
        would leave the corner looking empty rather than tucked.
      */}
      <CardArt
        source={dashArt.scroll.source}
        ratio={dashArt.scroll.ratio}
        width={84}
        style={{ right: 10, bottom: 6 }}
      />

      <View style={{ padding: 18 }}>
        <View className="flex-row items-start justify-between">
          <View className="flex-row items-center" style={{ gap: 10, flex: 1 }}>
            <CardIconBadge tint="#E6DCFB" size={34}>
              <Trophy size={18} color={c.lavender} strokeWidth={2.3} />
            </CardIconBadge>
            <View style={{ flex: 1 }}>
              <CardTitle small>Daily Challenges</CardTitle>
              {/*
                A hair smaller than the shared card body, and held to one line.
                This is the longest supporting line on the screen and it shares
                its row with both the trophy badge and "View all" — at 14pt it
                wrapped, which pushed the card taller than every other one.
              */}
              <Text
                className="font-nunito-semibold"
                numberOfLines={1}
                style={{ fontSize: 13, lineHeight: 19, color: c.textSecondary, marginTop: 1 }}
              >
                Complete goals to earn bonus XP
              </Text>
            </View>
          </View>
          <Text className="font-nunito-bold" style={{ ...t.link, color: c.lavender, marginTop: 2 }}>
            View all
          </Text>
        </View>

        {/*
          The stats panel stops short of the card's right edge so the scroll has
          somewhere to sit. Its left edge lines up with the card's own padding,
          not with the icon or the title — everything on this card shares one
          left margin.
        */}
        <View
          className="flex-row"
          style={{
            marginTop: 14,
            // Just clears the scroll. Any wider and "Total challenges" wraps to
            // two lines, which pushes the card past the height of every other
            // one on the screen.
            marginRight: 78,
            backgroundColor: dashSurfaces.challengeStats.fill,
            borderColor: dashSurfaces.challengeStats.border,
            borderWidth: 1,
            borderRadius: dashRadius.inner,
            paddingVertical: 11,
          }}
        >
          <Stat value={`${claimable}`} suffix={`/ ${total}`} label="Ready to claim" />
          <View style={{ width: 1, backgroundColor: dashSurfaces.challengeStats.border, marginVertical: 2 }} />
          <Stat value={`${total}`} label="Total challenges" />
        </View>
      </View>
    </DashboardCard>
  )
}

/**
 * One half of the stats panel.
 *
 * The `suffix` rides at the value's own baseline in a lighter weight, so "2 / 6"
 * reads as one figure with a denominator rather than as two numbers.
 */
function Stat({ value, suffix, label }: { value: string; suffix?: string; label: string }) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 11 }}>
      <View className="flex-row items-baseline" style={{ gap: 4 }}>
        <Text className="font-nunito-extrabold" style={{ ...t.statValue, color: c.navy }}>
          {value}
        </Text>
        {suffix ? (
          <Text className="font-nunito-semibold" style={{ fontSize: 14, color: c.textMuted }}>
            {suffix}
          </Text>
        ) : null}
      </View>
      {/* One line, always — the card's height is budgeted for one. */}
      <Text
        className="font-nunito-semibold"
        numberOfLines={1}
        style={{ ...t.statLabel, color: c.textSecondary }}
      >
        {label}
      </Text>
    </View>
  )
}
