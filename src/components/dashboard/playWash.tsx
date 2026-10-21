import { StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

/**
 * The SS1017 card wash: a tinted card is not one flat colour but a watercolour
 * wash, deepest behind its painting (`wash`) and fading to its pale text end
 * (`fill`). Drawn absolutely behind a card's content — the card keeps
 * `backgroundColor: tint.fill` too, so a platform that drops the gradient still
 * shows the right colour, and `overflow: 'hidden'` on the card clips it to the
 * card's corners.
 *
 * `direction` picks where the painting sits: `'right'` (default) runs left to
 * right for a scene on the left; `'down'` runs top to bottom for a tile whose
 * painting is above its label.
 */
export function PlayWash({
  tint,
  direction = 'right',
  radius,
}: {
  tint: { fill: string; wash: string }
  direction?: 'right' | 'down' | 'left'
  /**
   * The card's corner radius, less its border. Pass it on a card that carries a
   * shadow: there the card must not clip (`overflow: 'hidden'` clips an iOS
   * shadow too), so the wash rounds its own corners instead.
   */
  radius?: number
}) {
  const end = direction === 'down' ? { x: 0.35, y: 1 } : direction === 'left' ? { x: 0, y: 0.6 } : { x: 1, y: 0.6 }
  const start = direction === 'left' ? { x: 1, y: 0.4 } : { x: 0, y: direction === 'down' ? 0 : 0.4 }
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[tint.wash, tint.fill]}
      locations={[0.05, 0.75]}
      start={start}
      end={end}
      style={[StyleSheet.absoluteFill, radius !== undefined && { borderRadius: radius }]}
    />
  )
}

/**
 * The wash's colour at a point across the card (0 = painted end, 1 = text end),
 * so an image's own fade can end on exactly the colour behind it.
 */
export function washAt(tint: { fill: string; wash: string }, at: number): string {
  const t = Math.max(0, Math.min(1, (at - 0.05) / 0.7))
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  const mix = [0, 1, 2].map((i) => Math.round(ch(tint.wash, i) + (ch(tint.fill, i) - ch(tint.wash, i)) * t))
  return '#' + mix.map((v) => v.toString(16).padStart(2, '0')).join('')
}
