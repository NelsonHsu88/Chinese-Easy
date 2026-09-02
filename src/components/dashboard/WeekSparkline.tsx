import { View, Text } from 'react-native'
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg'
import { dashColors as c, dashSurfaces, dashType as t, dashWeek } from './tokens'
import type { WeekDay } from '../../lib/progress'

/*
 * Words learned per day: a smooth line over a fade-out area fill, with just
 * enough axis to answer the two questions the shape alone cannot.
 *
 * It was drawn Strava-style at first — no axes, no numbers, nothing but the
 * curve — on the reasoning that the trend is the message. That was wrong here.
 * Strava's line sits under a heading that already names the units, and its
 * reader knows roughly what a week of their own running looks like. This one
 * sat under nothing, so a peak could have been three words or thirty, and the
 * seven days it spanned were unlabelled. A chart nobody can put a number to is
 * decoration.
 *
 * So: three gridlines with their word counts up the left, and the day letters
 * along the bottom. Everything else the sparkline got right is kept — the fill,
 * the curve, and the restraint about how much ink an axis is worth.
 *
 * **The line stops at today.** Plotting the rest of the week would run it along
 * zero to Sunday, which draws four days of failure the learner has not had the
 * chance to have yet. Same principle as the empty rings in the strip above.
 */

/** Total height of the plot box. `width` is passed in — see `dashWeek`. */
const H = 68
/** y of the top gridline (the axis maximum). */
const TOP = 7
/** y of the zero baseline. Both leave room for the curve to overshoot a little. */
const BASE = 61

/**
 * The number to put at the top of the axis.
 *
 * Every step is even, so the middle gridline is always a whole number of words
 * — "3.5 words" is not a thing anyone learned. The scale is also held at a
 * floor of 4 rather than tracking the week's own peak: scaling to the maximum
 * means a week whose best day was one word renders exactly like a week of
 * twenties, a full-height mountain that flatters nothing and tells the learner
 * nothing. With the axis labelled, that floor is now visible rather than
 * implied.
 */
const AXIS_STEPS = [4, 6, 8, 10, 12, 16, 20, 24, 30, 40, 50, 60, 80, 100]

function axisMax(peak: number): number {
  for (const step of AXIS_STEPS) if (peak <= step) return step
  return Math.ceil(peak / 50) * 50
}

/**
 * A Catmull-Rom spline through the points, emitted as cubic beziers.
 *
 * Straight segments make a seven-point series look like a seismograph; the
 * curve is what makes it read as a trend. The tension is deliberately gentle —
 * at higher values the curve overshoots below zero between a peak and an idle
 * day, drawing negative words learned.
 */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const k = 6
    const c1 = { x: p1.x + (p2.x - p0.x) / k, y: p1.y + (p2.y - p0.y) / k }
    const c2 = { x: p2.x - (p3.x - p1.x) / k, y: p2.y - (p3.y - p1.y) / k }
    d += ` C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

/**
 * @param width Width of the seven-column plot area, in points. The caller
 *   computes it so the day strip above can use exactly the same columns; the
 *   SVG is then drawn 1:1 rather than scaled by a viewBox, which is what keeps
 *   the axis type the same size on every screen.
 */
export function WeekSparkline({ week, width }: { week: WeekDay[]; width: number }) {
  const total = week.reduce((sum, d) => sum + (d.isFuture ? 0 : d.wordsLearned), 0)
  const max = axisMax(Math.max(0, ...week.filter((d) => !d.isFuture).map((d) => d.wordsLearned)))

  /** Top, middle, zero — three lines is the most a box this tall can carry. */
  const ticks = [max, max / 2, 0]
  const yFor = (value: number) => BASE - (value / max) * (BASE - TOP)

  // The x axis always spans the whole week, so Wednesday sits under Wednesday's
  // letter whether it is the last day plotted or the middle one. Indexing off
  // the full week rather than the elapsed slice is what guarantees that.
  const pitch = width / 7
  const points = week
    .map((day, i) => ({ day, i }))
    .filter(({ day }) => !day.isFuture)
    .map(({ day, i }) => ({
      x: (i + 0.5) * pitch,
      y: yFor(day.wordsLearned),
      isToday: day.isToday,
    }))

  const line = smoothPath(points)
  const area =
    points.length > 1
      ? `${line} L ${points[points.length - 1].x.toFixed(1)} ${BASE} L ${points[0].x.toFixed(1)} ${BASE} Z`
      : ''

  return (
    <View>
      <View className="flex-row items-baseline justify-between" style={{ marginBottom: 6 }}>
        <Text className="font-nunito-semibold" style={{ ...t.statLabel, color: c.textMuted }}>
          Words learned per day
        </Text>
        <Text className="font-nunito-bold" style={{ fontSize: 12, color: c.textSecondary }}>
          {total} this week
        </Text>
      </View>

      <View style={{ height: H }}>
        {/*
          The y numbers are React Native text rather than SVG text, laid over
          the gutter the plot is inset by. Inside the SVG they would inherit the
          drawing's own scaling and would not share a font stack with the rest
          of the card — an axis that renders a hair different from every other
          number on the screen is exactly the kind of thing that reads as broken
          without anyone being able to say why.
        */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, top: 0, width: dashWeek.gutter - 6, height: H }}
        >
          {ticks.map((value) => (
            <Text
              key={value}
              className="font-nunito-semibold"
              style={{
                position: 'absolute',
                right: 0,
                top: yFor(value) - t.axisTick.lineHeight / 2,
                textAlign: 'right',
                ...t.axisTick,
                color: c.textMuted,
              }}
            >
              {value}
            </Text>
          ))}
        </View>

        <View style={{ marginLeft: dashWeek.gutter }}>
          <Svg width={width} height={H}>
            <Defs>
              {/* Fades out downwards so the fill never hardens into a solid block. */}
              <LinearGradient id="weekFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={c.green} stopOpacity={0.28} />
                <Stop offset="1" stopColor={c.green} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>

            {/*
              Dashed above, solid on zero. The baseline is a real edge the area
              fill sits on; the two above it are reference marks, and drawing
              all three the same weight turns the plot into ruled paper.
            */}
            {ticks.map((value) => (
              <Line
                key={value}
                x1={0}
                x2={width}
                y1={yFor(value)}
                y2={yFor(value)}
                stroke={value === 0 ? dashSurfaces.week.border : c.neutralTrack}
                strokeWidth={1}
                strokeDasharray={value === 0 ? undefined : '2 4'}
              />
            ))}

            {area ? <Path d={area} fill="url(#weekFill)" /> : null}
            {line ? (
              <Path
                d={line}
                stroke={c.green}
                strokeWidth={2.4}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {/*
              A marker on every elapsed day, with today's enlarged. The line
              alone used to carry a single dot on the last point, on the
              reasoning that seven dots turn a curve back into a table — but a
              curve you are meant to read a value off needs to say where the
              readings actually are, or the smoothing between two days looks
              like data from a day that was never measured.
            */}
            {points.map((p) => (
              <Circle
                key={p.x}
                cx={p.x}
                cy={p.y}
                r={p.isToday ? 4 : 2.6}
                fill={c.green}
                stroke="#FFFFFF"
                strokeWidth={p.isToday ? 2 : 1.4}
              />
            ))}
          </Svg>
        </View>
      </View>

      {/*
        The chart's own x axis. The strip above carries the same seven letters
        over its tick dots, and that repetition is deliberate: each row is
        labelled by the line touching it rather than by one two rows away.
      */}
      <View style={{ flexDirection: 'row', width, marginLeft: dashWeek.gutter, marginTop: 3 }}>
        {week.map((day) => (
          <View key={day.date} style={{ flex: 1 }} className="items-center">
            {/* Same size and weight as the strip's letters — they are the same
                labels for the same columns, and two sizes would read as two
                different scales rather than one repeated axis. */}
            <Text
              className="font-nunito-bold"
              style={{ ...t.weekday, color: day.isToday ? c.greenDark : c.textMuted }}
            >
              {day.letter}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}
