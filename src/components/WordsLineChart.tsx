import { View, Text } from 'react-native'
import Svg, { Path, Circle } from 'react-native-svg'
import { useColorScheme } from 'react-native'

interface Props {
  data: { date: string; wordsLearned: number }[]
  dayLabels: string[]
}

const W = 300
const H = 120
const PAD_X = 12
const PAD_Y = 16

/** A real SVG line chart of words learned per day — replaces the old bar-only chart on the dashboard. */
export function WordsLineChart({ data, dayLabels }: Props) {
  const isDark = useColorScheme() === 'dark'
  const max = Math.max(1, ...data.map((d) => d.wordsLearned))
  const stepX = data.length > 1 ? (W - PAD_X * 2) / (data.length - 1) : 0

  const points = data.map((d, i) => ({
    x: PAD_X + i * stepX,
    y: H - PAD_Y - (d.wordsLearned / max) * (H - PAD_Y * 2),
    value: d.wordsLearned,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${H - PAD_Y} L ${points[0].x.toFixed(1)} ${H - PAD_Y} Z`
      : ''

  return (
    <View>
      <Svg width="100%" height={140} viewBox={`0 0 ${W} ${H}`}>
        {areaPath && <Path d={areaPath} fill="#22c55e" fillOpacity={isDark ? 0.18 : 0.12} />}
        {linePath && <Path d={linePath} stroke="#22c55e" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#22c55e" />
        ))}
      </Svg>
      <View className="mt-1 flex-row justify-between px-1">
        {dayLabels.map((label, i) => (
          <Text key={i} className="text-[10px] text-slate-400">
            {label}
          </Text>
        ))}
      </View>
    </View>
  )
}
