/*
 * Shifu writing calligraphy, on a seamless loop.
 *
 * The motion is a pre-rendered video (scripts/loading/ — the painting is one
 * flat image, so the hand, brush, ink, sleeve and ribbon were cut out and
 * re-composited offline; see its README). Decoded by the hardware, it stays
 * smooth while the activity behind it does heavy preparation on the JS thread.
 *
 * Under the video sits a still of its very first frame, so there is never a
 * blank box while the decoder starts and nothing changes when it does. With
 * reduced motion, the still is all there is.
 */
import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { VideoView, useVideoPlayer } from 'expo-video'
import { SHIFU_LOOP } from './loop'

const VIDEO = require('../../assets/video/loading-shifu.mp4')
const STILL = require('../../assets/images/loading/shifu-writing-still.jpg')

export type ShifuLoopHandle = {
  /** Where the loop is, 0..1 — the brush is down inside `SHIFU_LOOP.brushDown`. */
  phase: () => number
}

type Props = {
  width: number
  /**
   * Given, the painting fills a `width` × `height` box and crops its edges
   * like `cover` (they fade into the page, so nothing is cut that matters).
   * Omitted, the box takes the painting's own 3:4 shape.
   */
  height?: number
  still: boolean
}

export const ShifuWritingLoop = forwardRef<ShifuLoopHandle, Props>(function ShifuWritingLoop({ width, height: boxHeight, still }, ref) {
  const height = boxHeight ?? (width * SHIFU_LOOP.height) / SHIFU_LOOP.width
  /*
   * The painting itself is always drawn at its own 3:4, never stretched: the
   * smallest such box that covers the frame, centred, with the frame clipping
   * what overhangs. Worked out here rather than left to each layer's own
   * `cover`, because an Image and a video do not crop alike on every platform
   * — on web the still and the video landed on different crops.
   */
  const scale = Math.max(width / SHIFU_LOOP.width, height / SHIFU_LOOP.height)
  const art = { width: SHIFU_LOOP.width * scale, height: SHIFU_LOOP.height * scale }
  const offset = { left: (width - art.width) / 2, top: (height - art.height) / 2 }
  return (
    <View style={{ width, height, overflow: 'hidden' }} accessibilityIgnoresInvertColors>
      <View style={{ position: 'absolute', ...offset, ...art }}>
        {/* Explicit size: on web an absolutely-filled Image takes its natural
            810×1080 instead of the box. */}
        <Image source={STILL} resizeMode="stretch" style={{ position: 'absolute', left: 0, top: 0, ...art }} fadeDuration={0} />
        {still ? <StillHandle handleRef={ref} /> : <Moving handleRef={ref} />}
      </View>
    </View>
  )
})

function StillHandle({ handleRef }: { handleRef: React.Ref<ShifuLoopHandle> }) {
  useImperativeHandle(handleRef, () => ({ phase: () => 0 }), [])
  return null
}

function Moving({ handleRef }: { handleRef: React.Ref<ShifuLoopHandle> }) {
  // The hook releases the player when the loader unmounts.
  const player = useVideoPlayer(VIDEO, (p) => {
    p.loop = true
    p.muted = true
    // Silent; it must never pause the music someone is listening to.
    p.audioMixingMode = 'mixWithOthers'
  })
  // After mount: on web a play() before the <video> exists is lost.
  useEffect(() => {
    if (!player.playing) player.play()
  }, [player])
  useImperativeHandle(
    handleRef,
    () => ({
      phase: () => {
        const ms = (player.currentTime || 0) * 1000
        return (ms % SHIFU_LOOP.durationMs) / SHIFU_LOOP.durationMs
      },
    }),
    [player],
  )
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="fill"
      nativeControls={false}
      allowsPictureInPicture={false}
      playsInline
      // Android: composites like any other view, and shows the still (not
      // black) until the first frame.
      surfaceType="textureView"
      useExoShutter={false}
    />
  )
}
