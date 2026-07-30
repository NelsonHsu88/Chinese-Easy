import type { ReactNode } from 'react'
import { View, Text, Pressable } from 'react-native'

type CardColor = 'coral' | 'brand' | 'amber' | 'violet'

/** Pastel card + dark text + a large colored icon on the edge — matches the "Training Game" cards in the reference mockups. */
const PALETTE: Record<CardColor, { card: string; pillBg: string; pillText: string }> = {
  coral: {
    card: 'bg-coral-50 dark:bg-coral-950/40',
    pillBg: 'bg-coral-100 dark:bg-coral-900/50',
    pillText: 'text-coral-700 dark:text-coral-300',
  },
  brand: {
    card: 'bg-brand-50 dark:bg-brand-950/40',
    pillBg: 'bg-brand-100 dark:bg-brand-900/50',
    pillText: 'text-brand-700 dark:text-brand-300',
  },
  amber: {
    card: 'bg-amber-50 dark:bg-amber-950/40',
    pillBg: 'bg-amber-100 dark:bg-amber-900/50',
    pillText: 'text-amber-700 dark:text-amber-300',
  },
  violet: {
    card: 'bg-violet-50 dark:bg-violet-950/40',
    pillBg: 'bg-violet-100 dark:bg-violet-900/50',
    pillText: 'text-violet-700 dark:text-violet-300',
  },
}

interface Stat {
  label: string
  value: string | number
}

interface Props {
  tag: string
  title: string
  subtitle: string
  icon: ReactNode
  color: CardColor
  stats: Stat[]
  onPress: () => void
}

/** The "training game" illustrated card style from the dashboard reference — pastel panel, pill tag, a large icon bleeding off the right edge, footer stats. */
export function IllustratedCard({ tag, title, subtitle, icon, color, stats, onPress }: Props) {
  const palette = PALETTE[color]
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-between overflow-hidden rounded-3xl border border-black/5 p-5 shadow-card dark:border-white/5 ${palette.card}`}
    >
      <View className="flex-1 pr-3">
        <View className={`self-start rounded-full px-3 py-1 ${palette.pillBg}`}>
          <Text className={`text-[10px] font-extrabold uppercase tracking-wide ${palette.pillText}`}>{tag}</Text>
        </View>
        <Text className="mt-3 text-xl font-extrabold text-slate-900 dark:text-white">{title}</Text>
        <Text className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</Text>
        <View className="mt-4 flex-row items-center gap-6">
          {stats.map((s) => (
            <View key={s.label}>
              <Text className="text-lg font-bold leading-none text-slate-900 dark:text-white">{s.value}</Text>
              <Text className="mt-1 text-[11px] text-slate-400">{s.label}</Text>
            </View>
          ))}
        </View>
      </View>
      <View className="-mr-2 items-center justify-center opacity-90">{icon}</View>
    </Pressable>
  )
}
