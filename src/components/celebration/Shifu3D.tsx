/*
 * The 3D Shifu: a pre-rendered jump, full turn and landing (Blender, see
 * scripts/celebration/README.md), played once as an animated WebP with alpha.
 * Animated WebP is the one format that keeps transparency on iOS, Android and
 * web alike, so the backdrop's mountains and petals show through around him.
 *
 * It plays once, then swaps to a still of the last frame. The still is mounted
 * from the start (invisible) so it has decoded by then, and holding it means
 * the end pose is right on every platform, whatever each decoder does after
 * the last frame. Reduced motion shows only the still.
 */
import { Image } from 'expo-image'
import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { SHIFU_3D } from './tokens'

const ANIMATION = require('../../assets/images/celebration/shifu3d-jump.webp')
const FINAL = require('../../assets/images/celebration/shifu3d-final.webp')

type Props = {
  width: number
  height: number
  /** Change it to play again from the start. */
  playKey: number
  /** false = the still end pose only. */
  animate: boolean
  /** The animation has loaded and started (or never will): start the clock. */
  onStart?: () => void
}

export function Shifu3D({ width, height, playKey, animate, onStart }: Props) {
  const [done, setDone] = useState(!animate)
  const started = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    started.current = false
    setDone(!animate)
    if (!animate) onStart?.()
    return () => clearTimeout(timer.current)
    // Once per play.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playKey, animate])

  const start = () => {
    if (started.current) return
    started.current = true
    onStart?.()
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setDone(true), SHIFU_3D.durationMs)
  }

  // If the animation never reports loading, still begin, and still land on the
  // end pose (a hidden browser tab, a decoder that never calls back).
  useEffect(() => {
    if (!animate) return
    const backstop = setTimeout(start, SHIFU_3D.loadBackstopMs)
    return () => clearTimeout(backstop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playKey, animate])

  const box = { position: 'absolute' as const, left: 0, top: 0, width, height }
  return (
    <View pointerEvents="none" style={{ width, height }}>
      <Image source={FINAL} style={[box, { opacity: done ? 1 : 0 }]} contentFit="contain" accessibilityIgnoresInvertColors />
      {animate && !done ? (
        <Image
          key={playKey}
          source={ANIMATION}
          style={box}
          contentFit="contain"
          autoplay
          cachePolicy="memory-disk"
          onLoad={start}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  )
}
