import { useRef, type ReactNode } from 'react'
import { Animated, Platform, Pressable, View, type StyleProp, type ViewStyle } from 'react-native'

/**
 * A pressable that compresses slightly while held.
 *
 * Transform and opacity only — never an animated width/height/margin. Layout
 * properties can't use the native driver, so animating them drops the whole
 * interaction onto the JS thread and it stutters under any load.
 *
 * RN's own `Animated`, not Reanimated: Reanimated's update loop doesn't drive on
 * this project's web target, where an animated style evaluates once and then
 * never changes again.
 *
 * NativeWind drops `className` on an `Animated.View`, so the tree is split
 * three ways on purpose: the `Pressable` takes layout classes, the animated view
 * carries only plain styles, and the inner view keeps the visual classes.
 */
export function PressScale({
  children,
  onPress,
  onLongPress,
  className = '',
  outerClassName = '',
  style,
  disabled = false,
  scaleTo = 0.96,
  accessibilityLabel,
  accessibilityRole = 'button',
}: {
  children: ReactNode
  onPress?: () => void
  onLongPress?: () => void
  /** Visual classes — background, radius, padding, border. */
  className?: string
  /** Layout classes for the touch target itself — flex, width, margin. */
  outerClassName?: string
  style?: StyleProp<ViewStyle>
  disabled?: boolean
  scaleTo?: number
  accessibilityLabel?: string
  accessibilityRole?: 'button' | 'link' | 'none'
}) {
  const scale = useRef(new Animated.Value(1)).current

  const animateTo = (value: number) => {
    Animated.spring(scale, {
      toValue: value,
      damping: 20,
      stiffness: 380,
      mass: 0.6,
      useNativeDriver: Platform.OS !== 'web',
    }).start()
  }

  return (
    <Pressable
      onPressIn={() => !disabled && animateTo(scaleTo)}
      onPressOut={() => animateTo(1)}
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      className={outerClassName}
    >
      <Animated.View style={[{ transform: [{ scale }] }, { opacity: disabled ? 0.55 : 1 }, style]}>
        {/*
          `flexGrow: 1` so a height passed in `style` is a height the visual view
          actually fills. Without it the inner view stays content-sized and sits
          at the top of the animated one, which makes any `justify-center` in
          `className` a no-op — a 78×96 tile whose icon and label are 57pt tall
          renders them hard against the top edge with 39pt of dead space beneath,
          and nothing in the stylesheet says why.

          `flexGrow` rather than `flex: 1`: the latter also sets `flexBasis: 0`,
          which in a parent with no definite height can collapse the content to
          nothing. This way the content height is the floor and the view only
          grows past it when there is a height to grow into.
        */}
        <View className={className} style={{ flexGrow: 1 }}>
          {children}
        </View>
      </Animated.View>
    </Pressable>
  )
}
