import { useEffect, useRef, type ReactNode } from 'react'
import { View, Text, Pressable, Animated, Platform } from 'react-native'
import { Gauge, Snail } from 'lucide-react-native'
import { guideColors as c, spacing, type as t, motion } from './tokens'

/*
 * The writing guide's building blocks.
 *
 * Every surface here is a border plus a tint rather than a shadow — see
 * `tokens.ts`. Anything animated follows the app's two standing rules: React
 * Native's own `Animated` (Reanimated's loop doesn't drive on this web target),
 * and plain styles on the `Animated.View` with the Tailwind classes on a plain
 * `View` inside it, because NativeWind drops `className` on an animated view.
 */

const USE_NATIVE_DRIVER = Platform.OS !== 'web'

// --- Progress stepper ---------------------------------------------------------

const NODE = 26

/**
 * Four connected nodes and a count. Sized to orient the learner without
 * competing with the lesson title, which is why the nodes are 23pt and not the
 * chunky pills a progress bar usually invites.
 */
export function GuideProgress({ page, total }: { page: number; total: number }) {
  return (
    <View className="flex-row items-center">
      <View className="flex-1 flex-row items-center">
        {Array.from({ length: total }, (_, i) => (
          <View key={i} className="flex-row items-center" style={i < total - 1 ? { flex: 1 } : undefined}>
            <StepNode index={i} active={i <= page} current={i === page} />
            {i < total - 1 && (
              <View style={{ flex: 1, height: 1.5, backgroundColor: i < page ? c.green : c.stepInactiveBorder }} />
            )}
          </View>
        ))}
      </View>
      <Text
        className="ml-3 font-nunito-bold"
        style={{ fontSize: t.progress.fontSize, color: c.stepInactiveText }}
      >
        {page + 1} / {total}
      </Text>
    </View>
  )
}

/** One node, springing gently as it becomes the current step. */
function StepNode({ index, active, current }: { index: number; active: boolean; current: boolean }) {
  const pop = useRef(new Animated.Value(current ? 1 : 0)).current

  useEffect(() => {
    if (!current) {
      pop.setValue(0)
      return
    }
    // From slightly under, so arriving reads as landing rather than appearing.
    pop.setValue(0)
    Animated.spring(pop, {
      toValue: 1,
      damping: 12,
      stiffness: 260,
      mass: 0.7,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start()
  }, [current, pop])

  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] })

  return (
    <Animated.View style={{ transform: [{ scale: current ? scale : 1 }] }}>
      <View
        className="items-center justify-center rounded-full"
        style={{
          width: NODE,
          height: NODE,
          backgroundColor: active ? c.green : c.card,
          borderWidth: active ? 0 : 1,
          borderColor: c.stepInactiveBorder,
        }}
      >
        <Text
          className="font-nunito-bold"
          style={{ fontSize: t.smallLabel.fontSize, color: active ? '#ffffff' : c.stepInactiveText }}
        >
          {index + 1}
        </Text>
      </View>
    </Animated.View>
  )
}

// --- Cards --------------------------------------------------------------------

/**
 * The worked example that proves the heading — near-white, thinly bordered,
 * introduced either by a small green label ("Example") or by an icon.
 */
export function ExampleCard({
  label,
  icon,
  children,
}: {
  label?: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <View
      style={{
        backgroundColor: c.infoCardBg,
        borderColor: c.infoCardBorder,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
      }}
    >
      {label && (
        <Text
          className="mb-1 font-nunito-bold"
          style={{ fontSize: 13.5, color: c.greenDark }}
        >
          {label}
        </Text>
      )}
      <View className="flex-row items-center" style={{ gap: spacing.sm }}>
        {icon}
        <View className="flex-1">{children}</View>
      </View>
    </View>
  )
}

/** Neutral panel with an icon and a title, for a set of related examples. */
export function PlainCard({
  title,
  icon,
  children,
}: {
  title?: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <View
      style={{
        backgroundColor: c.plainCardBg,
        borderColor: c.plainCardBorder,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
      }}
    >
      {(title || icon) && (
        <View className="mb-3 flex-row items-center" style={{ gap: spacing.sm }}>
          {icon}
          {title && (
            <Text className="font-nunito-bold" style={{ ...t.cardTitle, color: c.navy }}>
              {title}
            </Text>
          )}
        </View>
      )}
      {children}
    </View>
  )
}

/**
 * The sentence worth remembering: a pale green panel with a solid green badge
 * beside it. One per page at most — its whole job is to be the thing that
 * stands out, which stops working the moment there are two.
 */
export function TakeawayCard({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <View
      className="flex-row items-center"
      style={{
        backgroundColor: c.takeawayBg,
        borderColor: c.takeawayBorder,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xl,
        gap: spacing.lg,
      }}
    >
      <View
        className="items-center justify-center rounded-full"
        style={{ width: 52, height: 52, backgroundColor: c.green }}
      >
        {icon}
      </View>
      <View className="flex-1">{children}</View>
    </View>
  )
}

/** Body copy inside a card, at the one size and weight cards use. */
export function CardText({ children }: { children: ReactNode }) {
  return (
    <Text className="font-nunito-semibold" style={{ ...t.cardBody, color: c.textSecondary }}>
      {children}
    </Text>
  )
}

// --- Normal / Slow ------------------------------------------------------------

export type GuideSpeed = 'normal' | 'slow'

/**
 * A two-option segmented control.
 *
 * The selected state crossfades rather than switching instantly — at this size
 * an abrupt colour change reads as a glitch, and 200ms is enough to see which
 * one moved without anyone waiting for it. The fill is animated as an overlay
 * rather than by interpolating `backgroundColor`, so the two pills can keep
 * their Tailwind styling underneath.
 */
export function SpeedSegment({
  speed,
  onChange,
}: {
  speed: GuideSpeed
  onChange: (next: GuideSpeed) => void
}) {
  return (
    <View className="flex-row" style={{ gap: spacing.sm }}>
      {(['normal', 'slow'] as const).map((option) => (
        <SpeedOption
          key={option}
          label={option === 'normal' ? 'Normal' : 'Slow'}
          Icon={option === 'normal' ? Gauge : Snail}
          selected={speed === option}
          onPress={() => onChange(option)}
        />
      ))}
    </View>
  )
}

function SpeedOption({
  label,
  Icon,
  selected,
  onPress,
}: {
  label: string
  Icon: typeof Gauge
  selected: boolean
  onPress: () => void
}) {
  const fill = useRef(new Animated.Value(selected ? 1 : 0)).current

  useEffect(() => {
    Animated.timing(fill, {
      toValue: selected ? 1 : 0,
      duration: motion.segment,
      // Opacity can go native; the text colour below cannot, and both must run
      // on the same driver or they desynchronise.
      useNativeDriver: false,
    }).start()
  }, [selected, fill])

  const color = fill.interpolate({ inputRange: [0, 1], outputRange: [c.textSecondary, '#ffffff'] })

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} speed`}
      className="flex-1 overflow-hidden rounded-full active:opacity-90"
      style={{
        height: 48,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: selected ? 'transparent' : c.border,
      }}
    >
      <Animated.View
        style={{ position: 'absolute', inset: 0, backgroundColor: c.green, opacity: fill }}
      />
      <View className="flex-1 flex-row items-center justify-center" style={{ gap: spacing.sm }}>
        <Icon size={19} color={selected ? '#ffffff' : c.textMuted} strokeWidth={2.3} />
        <Animated.Text
          style={{
            fontFamily: 'NunitoBold',
            fontSize: 15.5,
            color: color as unknown as string,
          }}
        >
          {label}
        </Animated.Text>
      </View>
    </Pressable>
  )
}

// --- Primary call to action ---------------------------------------------------

/** Full-width, unmistakable, and the only green fill on the page. */
export function PrimaryButton({
  label,
  icon,
  onPress,
}: {
  label: string
  icon?: ReactNode
  onPress: () => void
}) {
  const press = useRef(new Animated.Value(0)).current
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] })

  const to = (value: number) =>
    Animated.timing(press, { toValue: value, duration: 90, useNativeDriver: USE_NATIVE_DRIVER }).start()

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => to(1)}
        onPressOut={() => to(0)}
        accessibilityRole="button"
        accessibilityLabel={label}
        className="flex-row items-center justify-center rounded-full"
        style={{ height: 56, backgroundColor: c.greenCta, gap: spacing.sm }}
      >
        <Text className="font-nunito-extrabold text-white" style={{ fontSize: t.button.fontSize }}>
          {label}
        </Text>
        {icon}
      </Pressable>
    </Animated.View>
  )
}
