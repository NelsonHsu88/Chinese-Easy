import { View, Text } from 'react-native'
import { CheckCircle2, Clock3, Sparkle } from 'lucide-react-native'
import type { Proficiency } from '../lib/proficiency'

/** Red for untouched, amber for in-progress, green for known — the three tiers. */
export const PROFICIENCY_META: Record<
  Proficiency,
  { label: string; icon: typeof Sparkle; iconColor: string; chip: string; text: string; bar: string }
> = {
  new: {
    label: 'New',
    icon: Sparkle,
    iconColor: '#f04747',
    chip: 'bg-coral-100 dark:bg-coral-900/40',
    text: 'text-coral-700 dark:text-coral-300',
    bar: 'bg-coral-500',
  },
  learning: {
    label: 'Still learning',
    icon: Clock3,
    iconColor: '#db9f2e',
    chip: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-700 dark:text-amber-300',
    bar: 'bg-amber-500',
  },
  proficient: {
    label: 'Proficient',
    icon: CheckCircle2,
    iconColor: '#16a34a',
    chip: 'bg-brand-100 dark:bg-brand-900/40',
    text: 'text-brand-700 dark:text-brand-300',
    bar: 'bg-brand-500',
  },
}

export const TIER_ORDER: Proficiency[] = ['new', 'learning', 'proficient']

/**
 * The tier badge shown against a word. Shared by My Words and the Dictionary's
 * My Words tab so a word can't read as "Proficient" in one and something else
 * in the other.
 *
 * `iconOnly` drops the label for tight rows, keeping the colour and icon as the
 * signal; the accessibility label still carries the full wording.
 */
export function ProficiencyChip({
  level,
  compact = false,
  iconOnly = false,
}: {
  level: Proficiency
  compact?: boolean
  iconOnly?: boolean
}) {
  const meta = PROFICIENCY_META[level]
  const Icon = meta.icon
  return (
    <View
      accessibilityLabel={meta.label}
      className={`flex-row items-center gap-1 rounded-full py-1 ${iconOnly ? 'px-1.5' : 'px-2'} ${meta.chip}`}
    >
      <Icon size={compact ? 12 : 13} color={meta.iconColor} />
      {!iconOnly && <Text className={`text-[11px] font-bold ${meta.text}`}>{meta.label}</Text>}
    </View>
  )
}
