import { useEffect, useMemo, useState, type CSSProperties } from 'react'

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
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="confetti-particle"
          style={
            {
              '--tx': `${p.tx}px`,
              '--ty': `${p.ty}px`,
              '--rot': `${p.rot}deg`,
              backgroundColor: p.color,
              animationDelay: `${p.delay}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
