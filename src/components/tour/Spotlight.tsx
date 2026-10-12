import { useEffect, useRef, useState } from 'react'
import { View, Animated, Easing, Platform, useWindowDimensions } from 'react-native'
import { tourColors as c, tourSpot, tourMotion } from './tokens'
import type { TargetRect } from './targets'

/*
 * The dimmed screen with a hole in it.
 *
 * **The hole is a border, not a mask.** One view sits exactly over the target,
 * with a navy border so wide it reaches every edge of the screen; the view's
 * own inside is the clear cut-out, and `borderRadius` = radius + border width
 * gives that inside rounded corners. It needs no SVG and no masking, works the
 * same on iOS, Android and web, and — the reason for choosing it — its
 * position, size and corner radius are plain layout values, so moving the
 * spotlight from one target to the next is five `Animated.timing`s rather than
 * unmounting one overlay and mounting another.
 *
 * Those are layout properties, so this runs on the JS driver; every animation
 * carries the app's `setTimeout` backstop (a hidden browser tab grants it no
 * frames, and a stalled spotlight would sit halfway between two targets).
 *
 * **The jade ring pulses** while a step is up — it breathes brighter and a
 * second ring ripples out from it — so the eye is drawn to the target rather
 * than only allowed to find it. Off under Reduce Motion, where the ring simply
 * sits at full strength. The pulse runs on the **native driver** (opacity and
 * scale only), inside a box the JS driver positions: the first version grew
 * the ripple by animating `left`/`width`, which re-laid it out on the JS thread
 * every frame and stuttered visibly on a phone in a dev build. The two drivers
 * are on separate views because one view cannot mix them.
 *
 * **Touches.** The dim itself takes none. Four transparent blockers cover the
 * screen *around* the cut-out, so a tap anywhere else is swallowed, while the
 * cut-out stays open to the real control underneath. A step that wants the
 * learner to read rather than press (`holeOpen` false) closes the hole too.
 */

export function Spotlight({
  rect,
  radius,
  holeOpen,
  reduceMotion,
}: {
  /** The cut-out, already padded. Null dims the whole screen (a fallback card). */
  rect: TargetRect | null
  radius: number
  holeOpen: boolean
  reduceMotion: boolean
}) {
  const { width: screenW, height: screenH } = useWindowDimensions()
  /* Wide enough to reach every edge from anywhere on screen, and no wider —
     an absurdly large view is a big texture on Android. */
  const frame = Math.max(screenW, screenH) + 40

  const x = useRef(new Animated.Value(rect?.x ?? screenW / 2)).current
  const y = useRef(new Animated.Value(rect?.y ?? screenH / 2)).current
  const w = useRef(new Animated.Value(rect?.width ?? 0)).current
  const h = useRef(new Animated.Value(rect?.height ?? 0)).current
  const r = useRef(new Animated.Value(radius)).current
  const fade = useRef(new Animated.Value(0)).current
  /* 0 → 1 once per pulse, looping. Rests at 0, which draws a full-strength
     ring and no ripple — so a stalled loop (a hidden tab) still looks right. */
  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    pulse.setValue(0)
    if (reduceMotion) return
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: tourSpot.pulseMs,
        easing: Easing.out(Easing.quad),
        useNativeDriver: Platform.OS !== 'web',
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [pulse, reduceMotion])

  /* Bright at the start of each pulse, easing back to the resting glow, then up again. */
  const breathe = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, tourSpot.glowOpacity, 1],
  })
  /* Grown by the same number of points on every side, whatever the target's shape. */
  const grow = (size: number) =>
    pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + (2 * tourSpot.pulseReach) / Math.max(size, 1)] })
  const ripple = pulse.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, tourSpot.pulseRippleOpacity, 0],
  })

  /* The first rect is placed, not flown in from nowhere; later ones morph. */
  const placed = useRef(rect !== null)
  /* What the blockers use: they follow the target at once, not the animation. */
  const [blockRect, setBlockRect] = useState<TargetRect | null>(rect)

  useEffect(() => {
    const anim = Animated.timing(fade, {
      toValue: 1,
      duration: tourMotion.backdrop,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    })
    anim.start()
    const settle = setTimeout(() => fade.setValue(1), tourMotion.backdrop + 80)
    return () => {
      anim.stop()
      clearTimeout(settle)
    }
  }, [fade])

  useEffect(() => {
    setBlockRect(rect)
    if (!rect) return
    const to: [Animated.Value, number][] = [
      [x, rect.x],
      [y, rect.y],
      [w, rect.width],
      [h, rect.height],
      [r, radius],
    ]
    if (!placed.current || reduceMotion) {
      placed.current = true
      to.forEach(([value, end]) => value.setValue(end))
      return
    }
    const anim = Animated.parallel(
      to.map(([value, end]) =>
        Animated.timing(value, {
          toValue: end,
          duration: tourMotion.morph,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
      ),
    )
    anim.start()
    const settle = setTimeout(() => to.forEach(([value, end]) => value.setValue(end)), tourMotion.morph + 80)
    return () => {
      anim.stop()
      clearTimeout(settle)
    }
  }, [rect?.x, rect?.y, rect?.width, rect?.height, radius, reduceMotion])

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
      {rect ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              opacity: fade,
              left: Animated.subtract(x, frame),
              top: Animated.subtract(y, frame),
              width: Animated.add(w, frame * 2),
              height: Animated.add(h, frame * 2),
              borderWidth: frame,
              borderRadius: Animated.add(r, frame),
              borderColor: c.scrim,
            }}
          />
          {/* The jade ring: a hairline and a soft glow, so the target reads as
              chosen rather than merely un-dimmed. Not colour alone — the
              cut-out itself is the main signal. The outer box follows the
              target (JS driver); the ring and its ripple inside it pulse
              (native driver). */}
          <Animated.View
            pointerEvents="none"
            style={{ position: 'absolute', opacity: fade, left: x, top: y, width: w, height: h }}
          >
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: breathe,
                borderRadius: radius,
                borderWidth: tourSpot.ring,
                borderColor: c.glow,
                shadowColor: c.glow,
                shadowOpacity: 0.9,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 0 },
              }}
            />
            {!reduceMotion && rect && (
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: ripple,
                  borderRadius: radius,
                  borderWidth: tourSpot.ring,
                  borderColor: c.glow,
                  transform: [{ scaleX: grow(rect.width) }, { scaleY: grow(rect.height) }],
                }}
              />
            )}
          </Animated.View>
        </>
      ) : (
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: fade, backgroundColor: c.scrim }}
        />
      )}

      {blockRect ? (
        <>
          <Blocker style={{ left: 0, right: 0, top: 0, height: Math.max(0, blockRect.y) }} />
          <Blocker
            style={{ left: 0, right: 0, top: blockRect.y + blockRect.height, bottom: 0 }}
          />
          <Blocker
            style={{ left: 0, width: Math.max(0, blockRect.x), top: blockRect.y, height: blockRect.height }}
          />
          <Blocker
            style={{ left: blockRect.x + blockRect.width, right: 0, top: blockRect.y, height: blockRect.height }}
          />
          {!holeOpen && (
            <Blocker
                style={{ left: blockRect.x, top: blockRect.y, width: blockRect.width, height: blockRect.height }}
            />
          )}
        </>
      ) : (
        <Blocker style={{ left: 0, right: 0, top: 0, bottom: 0 }} />
      )}
    </View>
  )
}

/**
 * Invisible, and takes the tap. A plain View is enough: a touch is delivered to
 * the topmost view under the finger and bubbles up *its* ancestors, never to a
 * sibling underneath — the same property that makes a stray absolutely-filled
 * View swallow taps by accident elsewhere in this app. Not a Pressable, which
 * would also give it a pointer cursor on web.
 */
function Blocker({ style }: { style: object }) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[{ position: 'absolute' }, style]}
    />
  )
}
