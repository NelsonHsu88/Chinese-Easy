import { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, Animated, Easing, Platform, type LayoutChangeEvent } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { Star } from 'lucide-react-native'
import { tapHaptic, tickHaptic } from '../../lib/haptics'
import { CHAL, HERO, TABS } from './tokens'

/*
 * The Challenges screen's building blocks.
 *
 * Split out of the screen because each of these carries its own animation and
 * its own slice of the design spec — sizes and colours here are from the
 * reference mockup, not improvised, and the `chal-*` tokens in the Tailwind
 * config are the only palette any of it should touch.
 */

export const USE_NATIVE_DRIVER = Platform.OS !== 'web'

// --- Progress bar --------------------------------------------------------------

/**
 * A 7pt track with an animated fill.
 *
 * The width animates, not the bar — animating the component would relayout the
 * row it sits in on every frame. Layout properties can't use the native driver,
 * which is the reason this one is a percentage on a plain `View` driven by an
 * interpolation rather than a transform.
 */
export function ProgressBar({
  ratio,
  fill,
  track,
}: {
  ratio: number
  fill: string
  track: string
}) {
  const width = useRef(new Animated.Value(ratio)).current

  useEffect(() => {
    Animated.timing(width, {
      toValue: ratio,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [ratio, width])

  return (
    <View style={{ height: 7, borderRadius: 999, overflow: 'hidden', backgroundColor: track }}>
      <Animated.View
        style={{
          height: '100%',
          borderRadius: 999,
          backgroundColor: fill,
          width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  )
}

// --- Progress ring -------------------------------------------------------------

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

/**
 * The hero's "2 / 3 Completed" ring.
 *
 * Real SVG geometry rather than a rotated-border trick: rounded stroke caps are
 * the whole look, and a border hack can't round them. It fills from zero once
 * per visit — replaying it on every progress change would make claiming a
 * challenge redraw the entire ring instead of nudging it.
 */
export function ProgressRing({
  ratio,
  size = HERO.ring,
  stroke = HERO.ringStroke,
  track = CHAL.ringTrack,
  fill = CHAL.green,
  children,
}: {
  ratio: number
  size?: number
  stroke?: number
  track?: string
  fill?: string
  children: React.ReactNode
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(progress, {
      toValue: ratio,
      duration: 700,
      delay: 120,
      easing: Easing.out(Easing.cubic),
      // SVG props can't be driven natively.
      useNativeDriver: false,
    }).start()
  }, [ratio, progress])

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Rotated so the fill starts at twelve o'clock rather than three. */}
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={fill}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={progress.interpolate({
            inputRange: [0, 1],
            outputRange: [circumference, 0],
          })}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>{children}</View>
    </View>
  )
}

// --- Segmented tabs ------------------------------------------------------------

/**
 * Daily / Milestones, with the mint pill sliding between them.
 *
 * The pill is one view that moves rather than a background swapped between two
 * buttons — the movement is the affordance, and a cross-fade reads as two
 * separate things lighting up.
 */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon: React.ReactNode; activeIcon: React.ReactNode }[]
  value: T
  onChange: (value: T) => void
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  const slide = useRef(new Animated.Value(index)).current
  /** Measured track width, so the pill knows how far one step is. */
  const [width, setWidth] = useState(0)

  useEffect(() => {
    Animated.spring(slide, {
      toValue: index,
      damping: 18,
      stiffness: 220,
      mass: 0.8,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start()
  }, [index, slide])

  const inner = Math.max(0, width - TABS.padding * 2)
  const pillWidth = options.length > 0 ? inner / options.length : 0

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))}
      className="shadow-chal-tabs"
      style={{
        height: TABS.height,
        borderRadius: TABS.radius,
        padding: TABS.padding,
        backgroundColor: CHAL.card,
        borderWidth: 1,
        borderColor: CHAL.line,
        flexDirection: 'row',
      }}
    >
      {width > 0 && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: TABS.padding,
            left: TABS.padding,
            height: TABS.pillHeight,
            width: pillWidth,
            borderRadius: TABS.pillRadius,
            backgroundColor: CHAL.mint,
            transform: [
              {
                translateX: slide.interpolate({
                  inputRange: options.map((_, i) => i),
                  outputRange: options.map((_, i) => i * pillWidth),
                }),
              },
            ],
          }}
        />
      )}

      {options.map((option) => {
        const active = option.value === value
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (active) return
              tickHaptic()
              onChange(option.value)
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {active ? option.activeIcon : option.icon}
            <Text
              className={active ? 'font-nunito-bold' : 'font-nunito-semibold'}
              style={{ fontSize: 17, color: active ? CHAL.greenInk : CHAL.body }}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

// --- XP pill -------------------------------------------------------------------

/**
 * The running XP total in the header.
 *
 * Pops briefly when it goes up, so a claim lands somewhere visible — the reward
 * for finishing a challenge is a number in the corner, and a number that changes
 * silently isn't a reward.
 */
export function XpCounter({ xp }: { xp: number }) {
  const scale = useRef(new Animated.Value(1)).current
  const previous = useRef(xp)

  useEffect(() => {
    if (xp <= previous.current) {
      previous.current = xp
      return
    }
    previous.current = xp
    // The reward landing somewhere visible. Deliberately light and deliberately
    // late: the claim itself already played its two-beat, and this is the tail
    // of that gesture rather than a second event.
    tapHaptic()
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.14, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.spring(scale, { toValue: 1, damping: 12, stiffness: 260, mass: 0.7, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start()
  }, [xp, scale])

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View
        style={{
          height: 40,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 7,
          borderRadius: 20,
          paddingHorizontal: 14,
          backgroundColor: CHAL.card,
          borderWidth: 1.5,
          borderColor: CHAL.goldSoft,
        }}
      >
        <Star size={18} color={CHAL.gold} fill={CHAL.gold} strokeWidth={2} />
        <Text className="font-nunito-bold" style={{ fontSize: 15, color: CHAL.navy }}>
          {xp.toLocaleString('en-US')} XP
        </Text>
      </View>
    </Animated.View>
  )
}
