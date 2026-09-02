import { View, Image } from 'react-native'
import { Bell } from 'lucide-react-native'
import { onbColors as c } from './tokens'

/*
 * The onboarding mascot.
 *
 * **This is a stand-in.** The reference screens use three painted watercolour
 * renders of Shifu — waving, bowing beside a golden bell, and giving a thumbs
 * up in a shower of confetti — and those renders don't exist yet. Rather than
 * leave three holes in the flow, each pose is assembled here from the flat
 * vector mascot the rest of the app already ships (`mascot-shifu.png`) plus the
 * props the pose needs.
 *
 * It is deliberately one component with a `pose` prop rather than three ad-hoc
 * compositions inside the screen: when the real art lands, every pose is
 * replaced by swapping the source here, and no page layout has to be touched.
 * The sizes below are what the paintings should be drawn to.
 */

const shifu = require('../../assets/images/mascot-shifu.png')

/** Source aspect ratio of the stand-in render. */
const RATIO = 250 / 380

export type ShifuPose = 'wave' | 'bow' | 'thumb'

export function Shifu({
  pose,
  width,
  bell = false,
  halo = false,
  fill = false,
  align = 'center',
}: {
  pose: ShifuPose
  /** Widest the mascot may be drawn. In `fill` mode this is a cap, not a size. */
  width: number
  /** The golden bell beside him on the reminders screen. */
  bell?: boolean
  /** The pale disc and confetti behind him on the finish screen. */
  halo?: boolean
  /**
   * Take the height of the flex slot given rather than a height derived from
   * `width`, shrinking to fit when there isn't room for the full size.
   *
   * This is how the welcome screen fits on one screen without scrolling: the
   * mascot is the only element there with any give, so it absorbs the
   * difference between a 667pt phone and an 844pt one. `resizeMode="contain"`
   * on a flexed `Image` does the scaling for us, which matters because
   * measuring the slot with `onLayout` is not dependable on the web target.
   */
  fill?: boolean
  /**
   * Where he stands in his slot. `start` puts him at the left edge, which is
   * where the script screen wants him — at the foot of the page beside the
   * range rather than standing in the middle of it. `fill` mode only.
   */
  align?: 'center' | 'start'
}) {
  const label =
    pose === 'wave' ? 'Shifu waving' : pose === 'bow' ? 'Shifu bowing' : 'Shifu giving a thumbs up'

  if (fill) {
    /*
     * `minHeight: 0` on both is load-bearing, not defensive. A flex item
     * defaults to `min-height: auto`, which refuses to shrink below its content
     * — and an Image's content is its intrinsic pixel height. Without it the
     * mascot holds its full size, `flex: 1` reclaims nothing, and the page it
     * was supposed to keep on one screen overflows by exactly the amount the
     * mascot should have given up.
     */
    return (
      <View
        className={`w-full flex-1 justify-end ${align === 'start' ? 'items-start' : 'items-center'}`}
        style={{ minHeight: 0 }}
      >
        <Image
          source={shifu}
          style={{ flex: 1, minHeight: 0, width, maxWidth: '100%' }}
          resizeMode="contain"
          accessibilityLabel={label}
        />
      </View>
    )
  }

  const height = width / RATIO

  return (
    <View className="items-center justify-center" style={{ width: bell ? width * 1.75 : width, height }}>
      {halo && <Halo size={width * 1.35} />}
      {halo && <Confetti size={width * 1.6} />}

      <View className="flex-row items-end justify-center" style={{ gap: width * 0.1 }}>
        <Image source={shifu} style={{ width, height }} resizeMode="contain" accessibilityLabel={label} />
        {bell && <GoldBell size={width * 0.5} />}
      </View>
    </View>
  )
}

/** The soft sage disc the finish-screen mascot stands in front of. */
function Halo({ size }: { size: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#E8EFE2',
        opacity: 0.75,
      }}
    />
  )
}

/**
 * Scattered paper squares. Fixed positions, not random: the spec rules out
 * looping animation, and a confetti field that reshuffles on every re-render is
 * animation by accident.
 */
const CONFETTI: { x: number; y: number; deg: number; color: string }[] = [
  { x: 0.04, y: 0.1, deg: 20, color: '#F0B94A' },
  { x: 0.2, y: 0.02, deg: -15, color: '#70ADD1' },
  { x: 0.42, y: 0.07, deg: 35, color: '#F47A6A' },
  { x: 0.64, y: 0.0, deg: -25, color: '#F0B94A' },
  { x: 0.86, y: 0.12, deg: 10, color: '#46A85B' },
  { x: 0.0, y: 0.34, deg: -30, color: '#F47A6A' },
  { x: 0.93, y: 0.36, deg: 25, color: '#70ADD1' },
  { x: 0.08, y: 0.6, deg: 15, color: '#F0B94A' },
  { x: 0.9, y: 0.62, deg: -20, color: '#F47A6A' },
]

function Confetti({ size }: { size: number }) {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', width: size, height: size * 0.95 }}
    >
      {CONFETTI.map((piece, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: piece.x * size,
            top: piece.y * size,
            width: 7,
            height: 7,
            borderRadius: 1.5,
            backgroundColor: piece.color,
            opacity: 0.8,
            transform: [{ rotate: `${piece.deg}deg` }],
          }}
        />
      ))}
    </View>
  )
}

/** The bell, with the reference's radiating strokes above it. */
function GoldBell({ size }: { size: number }) {
  return (
    <View className="items-center" style={{ width: size, marginBottom: size * 0.35 }}>
      <View className="flex-row items-end" style={{ height: size * 0.34, gap: size * 0.1 }}>
        {[0.42, 0.62, 0.42].map((h, i) => (
          <View
            key={i}
            style={{
              width: 2.5,
              height: size * 0.3 * h,
              borderRadius: 1.5,
              backgroundColor: c.gold,
              opacity: 0.85,
            }}
          />
        ))}
      </View>
      <View
        className="items-center justify-center rounded-full"
        style={{ width: size, height: size, backgroundColor: c.goldSoft, borderWidth: 2, borderColor: c.gold }}
      >
        <Bell size={size * 0.55} color={c.gold} strokeWidth={2.2} fill={c.gold} />
      </View>
    </View>
  )
}
