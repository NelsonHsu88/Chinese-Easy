import { useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming, Easing } from 'react-native-reanimated'

const COLORS = ['#1fb96d', '#f6432c', '#f99b04', '#3b82f6', '#a855f7', '#ec4899', '#43d488']
const PARTICLE_COUNT = 28
const DURATION_MS = 950

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

/** A brief Duolingo-style confetti burst from the center of the screen. */
export function Celebration({ trigger }: Props) {
  const [active, setActive] = useState(false)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])

  useEffect(() => {
    if (trigger === 0) return
    setActive(true)
    const timer = setTimeout(() => setActive(false), DURATION_MS)
    return () => clearTimeout(timer)
  }, [trigger])

  if (!active) return null

  return (
    <View
      pointerEvents="none"
      className="absolute inset-0 z-50 items-center justify-center overflow-hidden"
    >
      {particles.map((p) => (
        <ConfettiDot key={`${trigger}-${p.id}`} particle={p} />
      ))}
    </View>
  )
}

function ConfettiDot({ particle }: { particle: Particle }) {
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withDelay(
      particle.delay,
      withTiming(1, { duration: DURATION_MS - particle.delay, easing: Easing.out(Easing.quad) }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: progress.value * particle.tx },
      { translateY: progress.value * particle.ty },
      { rotate: `${progress.value * particle.rot}deg` },
      { scale: 1 - progress.value * 0.4 },
    ],
  }))

  return (
    <Animated.View
      style={[{ position: 'absolute', width: 8, height: 8, borderRadius: 2, backgroundColor: particle.color }, style]}
    />
  )
}
