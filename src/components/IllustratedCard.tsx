import type { ReactNode } from 'react'
import { View, Text, Pressable } from 'react-native'

type CardColor = 'coral' | 'brand' | 'amber' | 'violet'

/** Pastel card + dark text + a large colored icon on the edge — matches the "Training Game" cards in the reference mockups. */
const PALETTE: Record<CardColor, { card: string; pillBg: string; pillText: string; statPanel: string }> = {
  coral: {
    card: 'bg-coral-100/70 dark:bg-coral-950/40',
    pillBg: 'bg-coral-200/80 dark:bg-coral-900/50',
    pillText: 'text-coral-700 dark:text-coral-300',
    statPanel: 'bg-coral-50/80 dark:bg-black/20',
  },
  brand: {
    card: 'bg-brand-100/70 dark:bg-brand-950/40',
    pillBg: 'bg-brand-200/80 dark:bg-brand-900/50',
    pillText: 'text-brand-700 dark:text-brand-300',
    statPanel: 'bg-brand-50/80 dark:bg-black/20',
  },
  amber: {
    card: 'bg-amber-100/70 dark:bg-amber-950/40',
    pillBg: 'bg-amber-200/80 dark:bg-amber-900/50',
    pillText: 'text-amber-700 dark:text-amber-300',
    statPanel: 'bg-amber-50/80 dark:bg-black/20',
  },
  violet: {
    card: 'bg-violet-100/70 dark:bg-violet-950/40',
    pillBg: 'bg-violet-200/80 dark:bg-violet-900/50',
    pillText: 'text-violet-700 dark:text-violet-300',
    statPanel: 'bg-violet-50/80 dark:bg-black/20',
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
        {/* The reference mockups seat the stats in their own inset panel, a shade
            lighter than the card, rather than letting them sit on the card ground. */}
        <View className={`mt-4 flex-row items-center rounded-2xl px-4 py-3 ${palette.statPanel}`}>
          {stats.map((s, i) => (
            <View key={s.label} className="flex-1 flex-row items-center">
              {i > 0 && <View className="mr-4 h-9 w-px bg-black/10 dark:bg-white/15" />}
              <View>
                <Text className="text-xl font-extrabold leading-none text-slate-900 dark:text-white">{s.value}</Text>
                <Text className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{s.label}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      <View className="-mr-2 items-center justify-center opacity-90">{icon}</View>
    </Pressable>
  )
}
