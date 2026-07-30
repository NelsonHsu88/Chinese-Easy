import { useEffect, useState, type ReactNode } from 'react'
import { View, Text, Pressable, TextInput, Image, Modal as RNModal, type TextInputProps } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withRepeat, withSpring, withTiming } from 'react-native-reanimated'
import { ArrowLeft, Check } from 'lucide-react-native'
import { playTapSound } from '../lib/sound'

const RED = '#ff6b6b'
const RED_DARK = '#dc2f2f'

const shifu = require('../assets/images/mascot-shifu.png')

/** Back arrow + progress bar, shared by every wizard step except the welcome/result bookends. */
export function OnboardingHeader({ progress, onBack }: { progress: number; onBack?: () => void }) {
  return (
    <View className="mb-7 flex-row items-center gap-3">
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="h-9 w-9 items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-800"
        >
          <ArrowLeft size={22} color="#94a3b8" />
        </Pressable>
      ) : (
        <View className="w-9" />
      )}
      <View className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <View
          className="h-full rounded-full bg-coral-500"
          style={{ width: `${Math.min(100, Math.max(6, progress * 100))}%` }}
        />
      </View>
    </View>
  )
}

/** Shifu bobs and tilts like he's mid-sentence each time his line changes. */
function TalkingShifu() {
  const scale = useSharedValue(1)
  const rotate = useSharedValue(0)

  useEffect(() => {
    scale.value = withSequence(
      withRepeat(withSequence(withTiming(1.06, { duration: 120 }), withTiming(0.97, { duration: 120 })), 3, false),
      withTiming(1, { duration: 140 }),
    )
    rotate.value = withSequence(
      withRepeat(withSequence(withTiming(-4, { duration: 120 }), withTiming(4, { duration: 120 })), 3, false),
      withTiming(0, { duration: 140 }),
    )
  }, [scale, rotate])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }))

  return (
    <View className="h-14 w-14 overflow-hidden rounded-full border-2 border-coral-500 bg-coral-50 shadow-card dark:bg-coral-900/30">
      <Animated.View style={[{ width: '100%', height: '100%' }, animatedStyle]}>
        <Image source={shifu} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </Animated.View>
    </View>
  )
}

/** A static, non-animated Shifu portrait used on the welcome/result bookend screens. */
export function ShifuAvatar({ size = 112 }: { size?: number }) {
  return (
    <View
      style={{ width: size, height: size }}
      className="overflow-hidden rounded-full border-4 border-coral-500 shadow-card"
    >
      <Image source={shifu} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
    </View>
  )
}

/** The mascot-and-speech-bubble question prompt every Duolingo onboarding step opens with — styled like Shifu is being quoted. */
export function MascotPrompt({ message }: { message: string }) {
  return (
    <View className="mb-6 flex-row items-end gap-3">
      <TalkingShifu key={message} />
      <View className="relative max-w-[78%] flex-1">
        <View className="absolute -left-1.5 bottom-3 h-3.5 w-3.5 rotate-45 border-b border-l border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />
        <View className="relative rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-card dark:border-slate-700 dark:bg-slate-900">
          <Text className="absolute -top-3 left-2 text-5xl font-black leading-none text-coral-100 dark:text-coral-900/40">"</Text>
          <Text className="relative text-base font-semibold leading-snug text-slate-800 dark:text-slate-100">{message}</Text>
        </View>
      </View>
    </View>
  )
}

interface DuoButtonProps {
  label: string
  onPress: () => void
  variant?: 'primary' | 'outline'
  disabled?: boolean
  icon?: ReactNode
}

/** A chunky pill button with the pressed-in "3D lip" effect Duolingo's buttons use, plus a springy rebound on release. */
export function DuoButton({ label, onPress, variant = 'primary', disabled, icon }: DuoButtonProps) {
  const isOutline = variant === 'outline'
  const [pressed, setPressed] = useState(false)
  const translateY = useSharedValue(0)

  const handlePressIn = () => {
    if (disabled) return
    setPressed(true)
    playTapSound()
    translateY.value = withTiming(3, { duration: 55 })
  }
  const handlePressOut = () => {
    if (disabled) return
    setPressed(false)
    translateY.value = withSpring(0, { damping: 5, stiffness: 260, mass: 0.4 })
  }

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: isOutline ? 0 : translateY.value }],
  }))

  return (
    <Animated.View style={bounceStyle}>
      <Pressable
        onPress={disabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        className="w-full flex-row items-center justify-center gap-2 rounded-2xl py-4"
        style={{
          backgroundColor: disabled ? (isOutline ? 'transparent' : '#e2e8f0') : isOutline ? 'transparent' : RED,
          borderWidth: isOutline ? 2 : 0,
          borderColor: disabled ? '#cbd5e1' : RED,
          borderBottomWidth: isOutline ? 2 : pressed ? 0 : 4,
          borderBottomColor: isOutline ? (disabled ? '#cbd5e1' : RED) : disabled ? '#cbd5e1' : RED_DARK,
          opacity: disabled && isOutline ? 0.5 : 1,
        }}
      >
        {icon}
        <Text
          style={{ color: disabled && !isOutline ? '#94a3b8' : isOutline ? RED : '#ffffff' }}
          className="text-base font-extrabold tracking-wide"
        >
          {label.toUpperCase()}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

interface ChoiceRowProps {
  label: string
  sublabel?: string
  selected: boolean
  onPress: () => void
  leading?: ReactNode
  trailing?: ReactNode
}

/** A single selectable list row — border and text flip to red the instant it's tapped. */
export function ChoiceRow({ label, sublabel, selected, onPress, leading, trailing }: ChoiceRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`flex-row items-center gap-4 rounded-2xl border-2 px-5 py-5 ${
        selected
          ? 'border-coral-500 bg-coral-50 dark:border-coral-400 dark:bg-coral-900/25'
          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
      }`}
    >
      {leading}
      <View className="flex-1">
        <Text className={`text-lg font-bold ${selected ? 'text-coral-600 dark:text-coral-300' : 'text-slate-900 dark:text-white'}`}>
          {label}
        </Text>
        {sublabel ? <Text className="mt-0.5 text-sm text-slate-400">{sublabel}</Text> : null}
      </View>
      {trailing}
      {selected && <Check size={22} color={RED} />}
    </Pressable>
  )
}

/** Signal-style level bars, mirroring Duolingo's "how much do you know" icon set. */
export function LevelBars({ level }: { level: number }) {
  return (
    <View className="flex-row items-end gap-1">
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          className={`w-1.5 rounded-sm ${i <= level ? 'bg-coral-500' : 'bg-slate-200 dark:bg-slate-700'}`}
          style={{ height: 8 + i * 5 }}
        />
      ))}
    </View>
  )
}

interface ChoiceCardProps {
  title: string
  subtitle: string
  icon: ReactNode
  selected: boolean
  recommended?: boolean
  onPress: () => void
}

/** The larger "Start from scratch / Find my level" style card. */
export function ChoiceCard({ title, subtitle, icon, selected, recommended, onPress }: ChoiceCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`relative flex-row items-center gap-5 rounded-2xl border-2 p-5 ${
        selected
          ? 'border-coral-500 bg-coral-50 dark:border-coral-400 dark:bg-coral-900/25'
          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
      }`}
    >
      {recommended && (
        <View className="absolute -top-3 right-5 rounded-full bg-coral-600 px-3 py-1">
          <Text className="text-xs font-extrabold tracking-wide text-white">RECOMMENDED</Text>
        </View>
      )}
      <View className={`h-16 w-16 items-center justify-center rounded-full ${selected ? 'bg-coral-500' : 'bg-slate-100 dark:bg-slate-800'}`}>
        {icon}
      </View>
      <View className="flex-1">
        <Text className={`text-xl font-bold ${selected ? 'text-coral-600 dark:text-coral-300' : 'text-slate-900 dark:text-white'}`}>
          {title}
        </Text>
        <Text className="mt-1 text-sm leading-snug text-slate-400">{subtitle}</Text>
      </View>
    </Pressable>
  )
}

export function OnboardingInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#94a3b8"
      className="w-full rounded-xl bg-slate-100 px-4 py-3.5 text-base text-slate-900 dark:bg-slate-800 dark:text-white"
      {...props}
    />
  )
}

/** The iOS-style "app would like to send you notifications" permission toast. */
export function PermissionSheet({
  visible,
  onAllow,
  onDeny,
}: {
  visible: boolean
  onAllow: () => void
  onDeny: () => void
}) {
  return (
    <RNModal transparent animationType="fade" visible={visible} onRequestClose={onDeny}>
      <View className="flex-1 items-center justify-center bg-black/30 px-12">
        <View className="w-full max-w-xs items-center overflow-hidden rounded-2xl bg-white shadow-card dark:bg-slate-800">
          <View className="items-center px-5 pt-5">
            <Text className="text-center text-base font-bold text-slate-900 dark:text-white">
              "Chinese Easy" Would Like to Send You Notifications
            </Text>
            <Text className="mt-2 text-center text-xs leading-snug text-slate-500 dark:text-slate-400">
              Notifications may include daily reminders and streak alerts. You can change this later in Settings.
            </Text>
          </View>
          <View className="mt-4 w-full flex-row border-t border-slate-200 dark:border-slate-700">
            <Pressable onPress={onDeny} className="flex-1 items-center border-r border-slate-200 py-3 active:bg-slate-50 dark:border-slate-700 dark:active:bg-slate-700">
              <Text className="text-base text-slate-500 dark:text-slate-400">Don't Allow</Text>
            </Pressable>
            <Pressable onPress={onAllow} className="flex-1 items-center py-3 active:bg-slate-50 dark:active:bg-slate-700">
              <Text className="text-base font-semibold" style={{ color: RED }}>
                Allow
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </RNModal>
  )
}
