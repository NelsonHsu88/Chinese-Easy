import { View, Text, useWindowDimensions } from 'react-native'
import { Check } from 'lucide-react-native'
import { DashboardCard, CardArt, CardTitle } from './parts'
import { WeekSparkline } from './WeekSparkline'
import { dashArt } from './art'
import {
  dashColors as c,
  dashSpacing as s,
  dashSurfaces,
  dashType as t,
  dashHeights,
  dashWeek,
  DASH_CONTENT_MAX,
} from './tokens'
import type { WeekDay } from '../../lib/progress'

/** The card's own padding. Named because the column width is derived from it. */
const PAD = 18

/*
 * The week at a glance: seven letters, seven dots, and a chart of the same
 * seven days underneath.
 *
 * The dots have three states, and the third one matters. A day worked is a
 * filled green dot with a tick; a day missed is a muted ring; a day that has
 * not arrived yet is a pale green ring. Collapsing the last two would tell a
 * learner on Tuesday that they had already missed Saturday.
 *
 * The strip and the chart are laid out against one shared set of columns
 * (`dashWeek`), so a peak sits directly under the day that produced it.
 */
export function WeeklyActivityCard({ week, onPress }: { week: WeekDay[]; onPress?: () => void }) {
  const activeDays = week.filter((d) => d.active).length

  /*
   * The column width is derived from the window rather than measured with
   * `onLayout`, which does not fire for every view on this project's web
   * target — and a chart that lays out at zero width would be a blank card, not
   * an obviously broken one. Every term here is already fixed by the screen:
   * the design column, its screen margin, this card's border and its padding.
   */
  const { width } = useWindowDimensions()
  const inner = Math.min(width, DASH_CONTENT_MAX) - s.screen * 2 - 2 - PAD * 2
  const columns = Math.max(150, inner - dashWeek.gutter - dashWeek.bonsaiReserve)

  /* Dots shrink with the column on narrow phones rather than touching. */
  const dot = Math.max(15, Math.min(dashWeek.dotMax, Math.round(columns / 7) - 7))

  return (
    <DashboardCard
      fill={dashSurfaces.week.fill}
      border={dashSurfaces.week.border}
      minHeight={dashHeights.week}
      /* One target for the whole card, like Review and Challenges: everything
         inside is a reading of the same seven days, so there is nothing here a
         second, smaller target would usefully separate out. */
      onPress={onPress}
      accessibilityLabel={`This week, ${activeDays} active ${activeDays === 1 ? 'day' : 'days'}. Opens your progress.`}
    >
      {/*
        The bonsai sits beside the day strip, not in the corner below it — the
        chart now owns the bottom of the card, and a tree behind a chart is just
        a chart you cannot read. It is anchored by `top` so its base lands on
        the same line the dots sit on, which is what stops it floating.

        It is also the reason the strip and the chart stop short of the card's
        right edge: `dashWeek.bonsaiReserve` is measured off this width and
        offset, so changing either means changing that too. (Only the *vertical*
        offset moved below, so that reserve still holds.)

        `top` is set against the header row rather than the card: at 34 the
        canopy came up level with "3 active days" and read as crowding it. The
        text sits roughly 18–38 from the card's top edge, so this clears its
        baseline with a real gap rather than a hairline.
      */}
      <CardArt
        source={dashArt.bonsai.source}
        ratio={dashArt.bonsai.ratio}
        width={96}
        style={{ right: -6, top: 48 }}
      />

      <View style={{ padding: PAD }}>
        <View className="flex-row items-center justify-between">
          <CardTitle small>This Week</CardTitle>
          <Text className="font-nunito-bold" style={{ ...t.link, color: c.greenDark }}>
            {activeDays} active {activeDays === 1 ? 'day' : 'days'}
          </Text>
        </View>

        {/*
          Seven equal columns across `columns`, inset by the same gutter the
          chart's y-axis numbers occupy — that inset is what puts these dots on
          the chart's vertical lines rather than 22pt to the left of them.
        */}
        <View style={{ flexDirection: 'row', width: columns, marginLeft: dashWeek.gutter, marginTop: 12 }}>
          {week.map((day) => (
            <View key={day.date} className="items-center" style={{ flex: 1 }}>
              <Text
                className="font-nunito-bold"
                style={{ ...t.weekday, color: day.isToday ? c.greenDark : c.textMuted }}
              >
                {day.letter}
              </Text>
              <DayDot day={day} size={dot} />
            </View>
          ))}
        </View>

        <View style={{ marginTop: 16 }}>
          <WeekSparkline week={week} width={columns} />
        </View>
      </View>
    </DashboardCard>
  )
}

function DayDot({ day, size }: { day: WeekDay; size: number }) {
  if (day.active) {
    return (
      <View
        className="items-center justify-center rounded-full"
        style={{ width: size, height: size, backgroundColor: c.green, marginTop: 6 }}
      >
        <Check size={Math.round(size * 0.52)} color="#ffffff" strokeWidth={3.4} />
      </View>
    )
  }

  return (
    <View
      className="rounded-full"
      style={{
        width: size,
        height: size,
        marginTop: 6,
        borderWidth: 2,
        borderColor: day.isFuture || day.isToday ? c.greenRing : c.neutralTrack,
        backgroundColor: 'transparent',
      }}
    />
  )
}
