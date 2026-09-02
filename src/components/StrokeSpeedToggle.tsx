import { View, Text, Pressable } from 'react-native'
import { tickHaptic } from '../lib/haptics'
import type { HanziStageSpeed } from './HanziStage'

/**
 * Normal / Slow, for anywhere stroke order is demonstrated.
 *
 * Normal is what the animation has always run at, so nobody's stroke order
 * quietly changes speed; Slow halves it, and stretches the pause between strokes
 * by more again — the gap is where you work out where the next stroke starts,
 * which is the part that's too quick when you're copying along by hand.
 *
 * Shared rather than reimplemented per screen, because the app carries two
 * visual languages for these surfaces and the control should still be the same
 * control in both.
 */
export function StrokeSpeedToggle({
  speed,
  onChange,
  tone = 'card',
  className = '',
}: {
  speed: HanziStageSpeed
  onChange: (speed: HanziStageSpeed) => void
  tone?: 'dictionary' | 'card'
  className?: string
}) {
  const options: { value: HanziStageSpeed; label: string }[] = [
    { value: 'normal', label: 'Normal' },
    { value: 'slow', label: 'Slow' },
  ]

  return (
    <View className={`flex-row items-center justify-center gap-2 ${className}`}>
      {options.map((option) => {
        const selected = speed === option.value
        const shell =
          tone === 'dictionary'
            ? selected
              ? 'border-dict-green bg-dict-green-pale'
              : 'border-dict-line bg-dict-card'
            : selected
              ? 'border-brand-500 bg-brand-100 dark:border-brand-400 dark:bg-brand-950/50'
              : 'border-slate-300 bg-transparent dark:border-slate-700'
        const label =
          tone === 'dictionary'
            ? selected
              ? 'text-dict-green-dark'
              : 'text-dict-muted'
            : selected
              ? 'text-brand-700 dark:text-brand-300'
              : 'text-slate-500 dark:text-slate-400'

        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (selected) return
              tickHaptic()
              onChange(option.value)
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${option.label} stroke speed`}
            className={`rounded-full border px-5 py-2 active:opacity-70 ${shell}`}
          >
            <Text className={`text-[14px] font-bold ${label}`}>{option.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}
