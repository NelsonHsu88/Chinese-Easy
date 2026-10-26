import { useState } from 'react'
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native'
import { ChevronLeft } from 'lucide-react-native'
import { dashColors } from './dashboard/tokens'

/**
 * The app's one back arrow: a flat grey chevron, no disc, no shoulder.
 * Modelled on Mixed Review's header arrow. Every screen's back control uses
 * this so they all look and feel the same.
 *
 * Press feedback dims the inner view (a Pressable style function is dropped
 * on native).
 */
export function BackArrow({
  onPress,
  accessibilityLabel = 'Back',
  size = 30,
  color = dashColors.backArrow,
  style,
}: {
  onPress: () => void
  accessibilityLabel?: string
  size?: number
  /** Only for an arrow drawn over art that grey can't be seen on. */
  color?: string
  style?: StyleProp<ViewStyle>
}) {
  const [pressed, setPressed] = useState(false)
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      style={style}
    >
      <View style={{ padding: 4, opacity: pressed ? 0.5 : 1 }}>
        <ChevronLeft size={size} color={color} strokeWidth={2.4} />
      </View>
    </Pressable>
  )
}
