import type { ReactNode } from 'react'
import { View, Text, Pressable } from 'react-native'
import Slider from '@react-native-community/slider'
import { Minus, Plus } from 'lucide-react-native'

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="rounded-2xl bg-white p-4 shadow-card dark:bg-slate-900">
      <Text className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</Text>
      {children}
    </View>
  )
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <View className="flex-row rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => onChange(opt.value)}
          className={`flex-1 items-center rounded-lg py-2 ${
            value === opt.value ? 'bg-white shadow dark:bg-slate-700' : ''
          }`}
        >
          <Text
            className={`text-sm font-semibold ${
              value === opt.value ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
}) {
  return (
    <View className="flex-row items-center gap-3">
      <Pressable
        onPress={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        className={`h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 ${value <= min ? 'opacity-30' : ''}`}
      >
        <Minus size={16} color="#475569" />
      </Pressable>
      <Text className="w-8 text-center text-lg font-bold tabular-nums text-slate-900 dark:text-white">{value}</Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
        accessibilityRole="button"
        accessibilityLabel="Increase"
        className={`h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 ${value >= max ? 'opacity-30' : ''}`}
      >
        <Plus size={16} color="#475569" />
      </Pressable>
    </View>
  )
}

export function SliderRow({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-slate-600 dark:text-slate-300">{label}</Text>
        <Text className="text-sm font-bold tabular-nums text-brand-600 dark:text-brand-400">{value}</Text>
      </View>
      <Slider
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor="#1fb96d"
        maximumTrackTintColor="#e2e8f0"
        thumbTintColor="#1fb96d"
      />
    </View>
  )
}

export function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-1">
      <View>
        <Text className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</Text>
        {hint && <Text className="text-xs text-slate-400">{hint}</Text>}
      </View>
      {children}
    </View>
  )
}
