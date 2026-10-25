import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, Platform, View } from 'react-native'

const COLORS = ['#22c55e', '#ff6b6b', '#f5b93d', '#3b82f6', '#a855f7', '#ec4899', '#43d488']
const PARTICLE_COUNT = 28
const DURATION_MS = 950
const NATIVE = Platform.OS !== 'web'

interface Particle {
  id: number
  tx: number
  ty: number
  rot: number
  color: string
  delay: number
}

interface Props {
  /** Bump this to fire a new burst — 0 (the initial value) never triggers. */
  trigger: number
}

/**
 * A brief Duolingo-style confetti burst from the center of the screen.
 *
 * Fires when `trigger` changes while mounted, never on mount. The review
 * session mounts a fresh one each time it moves between screens (flashcard,
 * speaking, practice), and firing on mount replayed the last burst on every
 * one of them — including the card right after an "Again".
 *
 * RN's own Animated, not Reanimated, which doesn't drive on web: there the
 * dots sat frozen in a cluster mid-screen until the timer removed them.
 */
export function Celebration({ trigger }: Props) {
  const [burst, setBurst] = useState<number | null>(null)
  const seen = useRef(trigger)

  useEffect(() => {
    if (trigger === seen.current) return
    seen.current = trigger
    if (trigger === 0) return
    setBurst(trigger)
    const timer = setTimeout(() => setBurst(null), DURATION_MS)
    return () => clearTimeout(timer)
  }, [trigger])

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.5
      const distance = 90 + Math.random() * 150
      return {
        id: i,
        tx: Math.cos(angle) * distance,
        ty: Math.sin(angle) * distance - 30,
        rot: Math.round(Math.random() * 360),
        color: COLORS[i % COLORS.length],
        delay: Math.round(Math.random() * 70),
      }
    })
  }, [burst])

  if (burst === null) return null

  return (
    <View
      pointerEvents="none"
      className="absolute inset-0 z-50 items-center justify-center overflow-hidden"
    >
      {particles.map((p) => (
        <ConfettiDot key={`${burst}-${p.id}`} particle={p} />
      ))}
    </View>
  )
}

function ConfettiDot({ particle }: { particle: Particle }) {
  const progress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      delay: particle.delay,
      duration: DURATION_MS - particle.delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: NATIVE,
      isInteraction: false,
    })
    anim.start()
    return () => anim.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const style = {
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    transform: [
      { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.tx] }) },
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.ty] }) },
      { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${particle.rot}deg`] }) },
      { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) },
    ],
  }

  return (
    <Animated.View
      style={[{ position: 'absolute', width: 8, height: 8, borderRadius: 2, backgroundColor: particle.color }, style]}
    />
  )
}
