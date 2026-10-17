import { useRef } from 'react'
import { View, Text, Pressable, Animated, type StyleProp, type ViewStyle } from 'react-native'
import { router } from 'expo-router'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { DASH_LIFT, LiftedFace, PressableScale, usePressProgress } from '../dashboard/parts'
import { basicsColors as c, basicsSpacing as sp, basicsType as t } from './tokens'

/*
 * The small pieces Chinese Basics' three screens share. Everything here is
 * drawn from `basics/tokens.ts`.
 */

/**
 * The back arrow row. Never a bare `router.back()`: a reload or a deep link
 * has nothing to pop, so it falls back to `fallback`.
 */
export function BasicsBackRow({ fallback, right }: { fallback: string; right?: React.ReactNode }) {
  return (
    <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback as never))}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={12}
        style={{ marginLeft: -6 }}
      >
        <ChevronLeft size={28} color={c.jadeDark} strokeWidth={2} />
      </Pressable>
      {right}
    </View>
  )
}

/** The reference's thin sage bar on a warm grey track. */
export function BasicsProgressBar({ done, total, height = 8 }: { done: number; total: number; height?: number }) {
  const share = total > 0 ? Math.min(1, done / total) : 0
  return (
    <View style={{ flex: 1, height, borderRadius: height / 2, backgroundColor: c.track, overflow: 'hidden' }}>
      <View style={{ width: `${share * 100}%`, height: '100%', borderRadius: height / 2, backgroundColor: c.sage }} />
    </View>
  )
}

/** The soft round chevron at a tile's foot — decoration, never its own button. */
export function BasicsChevron({ size = 40 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.sageSoft,
      }}
    >
      <ChevronRight size={Math.round(size * 0.5)} color={c.sageDark} strokeWidth={2.4} />
    </View>
  )
}

/** "2 / 5 lessons", "New", "Done" — a tiny rounded label. */
export function BasicsPill({ label, tone = 'sage' }: { label: string; tone?: 'sage' | 'quiet' | 'coral' }) {
  const fill = tone === 'sage' ? c.sageSoft : tone === 'coral' ? c.coralSoft : c.track
  const color = tone === 'sage' ? c.sageDark : tone === 'coral' ? c.coralDark : c.slate
  return (
    <View style={{ alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: fill }}>
      <Text className="font-nunito-bold" style={{ ...t.pill, color }}>
        {label}
      </Text>
    </View>
  )
}

/**
 * The raised button every Basics action uses, like the rest of the app's
 * (`LiftedFace`): a face standing on a darker shoulder, sinking onto it when
 * pressed. The soft sage face is the reference's "Continue Learning ›";
 * `solid` is the stronger jade face for a lesson's main action.
 *
 * Type follows where the button lives: `hub` buttons (Chinese Basics' own
 * screens) are Lora Bold like Review's and Home's; inside a lesson they are
 * Nunito Bold like the drills'.
 */
export function BasicsButton({
  label,
  onPress,
  solid = false,
  disabled = false,
  chevron = true,
  stretch = false,
  hub = false,
}: {
  label: string
  onPress: () => void
  solid?: boolean
  disabled?: boolean
  chevron?: boolean
  stretch?: boolean
  hub?: boolean
}) {
  const fill = disabled ? c.track : solid ? c.jade : c.sageSoft
  const shoulder = disabled ? c.shoulder.disabled : solid ? c.shoulder.jade : c.shoulder.sage
  const ink = disabled ? c.textMuted : solid ? c.onSolid : c.sageDark
  return (
    <PressableScale
      onPress={disabled ? undefined : onPress}
      accessibilityLabel={label}
      scaleTo={1}
      wrapperStyle={stretch ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' }}
    >
      <LiftedFace height={50} fill={fill} shoulder={shoulder} shadow={solid && !disabled}>
        <View style={{ paddingHorizontal: sp.xl, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text
            className={hub ? 'font-lora-bold' : 'font-nunito-bold'}
            numberOfLines={1}
            style={{ ...(hub ? t.hubButton : t.lessonButton), color: ink }}
          >
            {label}
          </Text>
          {chevron && <ChevronRight size={19} color={ink} strokeWidth={2.4} />}
        </View>
      </LiftedFace>
    </PressableScale>
  )
}

/**
 * `LiftedFace` for faces whose height is their content's — answer options,
 * chips, toggles. Must sit inside a `PressableScale` (with `scaleTo={1}`) to
 * sink when pressed; outside one it simply stands still.
 */
export function BasicsRaised({
  fill,
  shoulder,
  border,
  borderWidth = 1.5,
  radius,
  style,
  children,
}: {
  fill: string
  shoulder: string
  border?: string
  borderWidth?: number
  radius: number
  /** Padding and layout for the face's contents. */
  style?: StyleProp<ViewStyle>
  children: React.ReactNode
}) {
  const resting = useRef(new Animated.Value(0)).current
  const press = usePressProgress() ?? resting
  const sink = press.interpolate({ inputRange: [0, 1], outputRange: [0, DASH_LIFT] })
  return (
    <View style={{ paddingBottom: DASH_LIFT }}>
      <View
        style={{ position: 'absolute', top: DASH_LIFT, left: 0, right: 0, bottom: 0, borderRadius: radius, backgroundColor: shoulder }}
      />
      <Animated.View
        style={{
          borderRadius: radius,
          backgroundColor: fill,
          ...(border ? { borderWidth, borderColor: border } : null),
          transform: [{ translateY: sink }],
        }}
      >
        <View style={style}>{children}</View>
      </Animated.View>
    </View>
  )
}
