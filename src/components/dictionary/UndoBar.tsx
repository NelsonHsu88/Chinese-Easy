import { useEffect, useRef } from 'react'
import { View, Text, Animated, Platform } from 'react-native'
import { Undo2, Check } from 'lucide-react-native'
import { PressScale } from './PressScale'
import { ICON_STROKE } from './DictionaryControls'

/** How long the bar stays up before it retracts on its own. */
const VISIBLE_MS = 8000

/**
 * A transient "that worked — unless it didn't" bar.
 *
 * Bulk add drops twenty cards into the deck on one tap, which is exactly the
 * kind of action that wants taking back. Offering the undo here rather than as a
 * confirmation dialog keeps the fast path fast: the common case is one tap and
 * done, and the rare mistake costs one more.
 *
 * It times out rather than waiting to be dismissed, because an undo that lingers
 * invites someone to hit it ten minutes later having forgotten what it undoes.
 */
export function UndoBar({
  message,
  onUndo,
  onDismiss,
}: {
  message: string
  onUndo: () => void
  onDismiss: () => void
}) {
  /*
   * RN's own Animated, and transform/opacity only — Reanimated's loop doesn't
   * drive on this project's web target, and animating height would put the whole
   * thing on the JS thread. NativeWind drops `className` on an Animated.View, so
   * the animated wrapper carries plain styles and the inner View keeps classes.
   */
  const rise = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.spring(rise, {
      toValue: 1,
      damping: 20,
      stiffness: 220,
      mass: 0.8,
      useNativeDriver: Platform.OS !== 'web',
    }).start()

    const timer = setTimeout(onDismiss, VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [rise, onDismiss])

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 16,
        opacity: rise,
        transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) }],
      }}
    >
      <View className="flex-row items-center gap-3 rounded-dict bg-dict-heading px-4 py-3 shadow-dict-lifted">
        <View className="h-7 w-7 items-center justify-center rounded-full bg-dict-green">
          <Check size={15} color="#ffffff" strokeWidth={3} />
        </View>
        <Text className="flex-1 font-dict-semibold text-[15px] leading-[20px] text-white">{message}</Text>
        <PressScale
          onPress={onUndo}
          className="flex-row items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2"
          accessibilityLabel="Undo adding those words"
        >
          <Undo2 size={15} color="#ffffff" strokeWidth={ICON_STROKE} />
          <Text className="font-dict-bold text-[14px] text-white">Undo</Text>
        </PressScale>
      </View>
    </Animated.View>
  )
}
