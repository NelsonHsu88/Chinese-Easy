/*
 * The launch intro: Shifu assembled from flowing silk, "Chinese Easy" written
 * beneath him, then a blue wave that carries the lockup off the top of the
 * screen and reveals the app.
 *
 * The silk and the writing are a pre-rendered video (scripts/launch/ — see
 * its README for why): cloth shading, soft shadows and depth blur at a steady
 * 60fps, decoded by the hardware while the JS thread is busy hydrating the app.
 * The video ends on exactly the logo and wordmark, which are also drawn here,
 * natively, underneath it at the same place (`lockup.ts`, generated alongside
 * the video). When the video finishes it simply goes, and the real lockup is
 * what the wave pushes away.
 *
 * It mounts above everything in the root layout from the first frame (the
 * native splash is plain white, like the video's page) and unmounts itself
 * once the wave has passed. The wave waits for both the video and the app.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, Image, Platform, StyleSheet, View, useWindowDimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { VideoView, createVideoPlayer, type VideoPlayer } from 'expo-video'
import Svg, { Path } from 'react-native-svg'
import { launchColors as C, launchTiming as T } from './tokens'
import { LOCKUP, WORD_PATHS } from './lockup'

const VIDEO = require('../../assets/video/launch-intro.mp4')
const LOGO = require('../../assets/images/launch/shifu-logo.png')

const useNativeDriver = Platform.OS !== 'web'
const PUSH = Easing.bezier(0.65, 0, 0.35, 1)

/* The wave: three crests stacked back to front, a gradient body, a trailing
   edge. `lead` is how far each crest rides above the front one. */
const CRESTS = [
  { amp: 20, lead: 30, phase: 0.35, color: C.robeMist, drift: 1 },
  { amp: 17, lead: 15, phase: 0.7, color: C.robeLight, drift: -1 },
  { amp: 15, lead: 0, phase: 0, color: C.robeBright, drift: 1 },
] as const
const CREST_BOX = 2 * 20 + 12

type Props = {
  /** The app underneath has hydrated and can be revealed. */
  appReady: boolean
  /** The intro is drawing; the native splash can go. */
  onVisible: () => void
  /** The wave has passed; unmount the intro. */
  onDone: () => void
}

/*
 * Progress kept outside the component. On a first launch the router's
 * redirect to onboarding remounts the whole root layout ~a second in, intro
 * and all. The player lives out here too, so the remounted view picks the
 * video up mid-play instead of restarting it.
 */
const session = {
  videoDone: false,
  waveStartedAt: null as number | null,
  reduceMotion: null as boolean | null,
  done: false,
  /** Web: where the video was when its view last unmounted (see the resume effect). */
  webTime: 0,
}
let player: VideoPlayer | null = null

/** When the web resume nudges a remounted video (ms after mount). */
const WEB_RESUME_TRIES_MS = [0, 60, 160, 320, 520]

function getPlayer(): VideoPlayer {
  if (!player) {
    player = createVideoPlayer(VIDEO)
    player.muted = true
    player.loop = false
    // Silent, and it must never pause the music someone is listening to.
    player.audioMixingMode = 'mixWithOthers'
  }
  return player
}

function releasePlayer() {
  const p = player
  player = null
  try {
    p?.release()
  } catch {
    // Already released by a remount racing this one.
  }
}

export function LaunchIntro({ appReady, onVisible, onDone }: Props) {
  const { width: W, height: H } = useWindowDimensions()
  const alreadyDone = useRef(session.done).current
  const wave = useRef(new Animated.Value(0)).current
  const fade = useRef(new Animated.Value(1)).current

  const [reduceMotion, setReduceMotion] = useState<boolean | null>(session.reduceMotion)
  const [videoDone, setVideoDone] = useState(session.videoDone)
  const [waving, setWaving] = useState(false)
  const finished = useRef(false)
  /* Backstops live in a ref and are cleared only on unmount: the effects that
     set them re-run on their own state changes, and a cleanup there would
     cancel the very timer meant to rescue them. */
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const callbacks = useRef({ onVisible, onDone })
  callbacks.current = { onVisible, onDone }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  useEffect(() => {
    if (alreadyDone) callbacks.current.onDone()
    else callbacks.current.onVisible()
  }, [alreadyDone])

  useEffect(() => {
    if (session.reduceMotion !== null) return
    let live = true
    const settle = (v: boolean) => {
      if (!live || session.reduceMotion !== null) return
      session.reduceMotion = v
      setReduceMotion(v)
    }
    AccessibilityInfo.isReduceMotionEnabled().then(settle, () => settle(false))
    const r = setTimeout(() => settle(false), 400)
    return () => {
      live = false
      clearTimeout(r)
    }
  }, [])

  /* ── Act 1: the video ────────────────────────────────────────────────── */
  const playing = !alreadyDone && !videoDone && reduceMotion === false
  const videoPlayer = playing ? getPlayer() : null

  useEffect(() => {
    if (!alreadyDone && !session.videoDone && reduceMotion === true) {
      // Reduced motion: no silk, no writing — the finished lockup, then a fade.
      session.videoDone = true
      setVideoDone(true)
    }
  }, [alreadyDone, reduceMotion])

  useEffect(() => {
    if (!videoPlayer) return
    let ended = false
    const end = () => {
      if (ended) return
      ended = true
      session.videoDone = true
      setVideoDone(true)
      // Let the view unmount first; the lockup underneath is already the same frame.
      setTimeout(releasePlayer, 50)
    }
    const subs = [
      videoPlayer.addListener('playToEnd', end),
      videoPlayer.addListener('statusChange', ({ status }) => {
        if (status === 'error') end()
      }),
      videoPlayer.addListener('playingChange', ({ isPlaying }) => {
        if (!isPlaying) return
        // However it got here, it ends on time: a stalled decoder, a hidden
        // tab or a missed event must never leave the intro covering the app.
        const left = LOCKUP.durationMs - videoPlayer.currentTime * 1000
        timers.current.push(setTimeout(end, Math.max(0, left) + 800))
      }),
    ]
    if (!videoPlayer.playing) videoPlayer.play()
    // A video that never starts (no decoder, a blocked autoplay) is skipped.
    timers.current.push(
      setTimeout(() => {
        if (!videoPlayer.playing && videoPlayer.currentTime === 0) end()
      }, 2500),
    )
    return () => subs.forEach((s) => s.remove())
  }, [videoPlayer])

  /*
   * Web only: the remount above gives the player a brand-new <video> element,
   * which starts at 0 and paused — while the player, which outlives it, still
   * believes it is playing, so the `play()` above (guarded on `playing`) never
   * reaches the new element. The video froze at its first frame a second in and
   * the backstop skipped it: the intro never played on the web. So each view,
   * on mount, picks up from where the last one left off and plays.
   */
  useEffect(() => {
    if (!videoPlayer || Platform.OS !== 'web') return
    /*
     * Tried more than once: the old element is paused by the browser as it
     * leaves the document, and expo-video's web player copies that pause onto
     * every element it holds — the new one included, a few ms after it started.
     * So it keeps nudging for the first half second, and only while stopped.
     */
    let seeked = false
    const nudge = () => {
      try {
        if (!seeked && session.webTime > 0) {
          videoPlayer.currentTime = session.webTime
          seeked = true
        }
        if (!videoPlayer.playing || videoPlayer.currentTime < 0.05) videoPlayer.play()
      } catch {
        // Released by a racing remount — the next view resumes instead.
      }
    }
    const tries = WEB_RESUME_TRIES_MS.map((ms) => setTimeout(nudge, ms))
    return () => {
      tries.forEach(clearTimeout)
      try {
        session.webTime = videoPlayer.currentTime
      } catch {
        // Already released.
      }
    }
  }, [videoPlayer])

  /* ── Act 2: the wave (or, with reduced motion, a plain fade) ─────────── */
  useEffect(() => {
    if (!videoDone || !appReady || waving || alreadyDone) return
    setWaving(true)
    const finish = () => {
      if (finished.current) return
      finished.current = true
      session.done = true
      wave.setValue(1)
      fade.setValue(0)
      callbacks.current.onDone()
    }
    const total = reduceMotion ? 320 : T.waveMs
    if (session.waveStartedAt === null) session.waveStartedAt = Date.now()
    const elapsed = Date.now() - session.waveStartedAt
    const remaining = total - elapsed
    if (remaining <= 0) {
      finish()
      return
    }
    let anim: Animated.CompositeAnimation
    if (reduceMotion) {
      fade.setValue(1 - elapsed / total)
      anim = Animated.timing(fade, { toValue: 0, duration: remaining, easing: Easing.out(Easing.quad), useNativeDriver })
    } else if (elapsed > 0) {
      // Resumed mid-wave: start from where the curve had got to and ease out.
      wave.setValue(PUSH(elapsed / total))
      anim = Animated.timing(wave, { toValue: 1, duration: remaining, easing: Easing.out(Easing.cubic), useNativeDriver })
    } else {
      anim = Animated.timing(wave, { toValue: 1, duration: total, easing: PUSH, useNativeDriver })
    }
    // react-native-web can report a timely end as unfinished, and a remount's
    // stop is no ending at all — the elapsed time decides.
    anim.start(({ finished: f }) => {
      if (f || Date.now() - session.waveStartedAt! >= total - 50) finish()
    })
    timers.current.push(setTimeout(finish, remaining + T.backstopMs))
  }, [videoDone, appReady, waving, reduceMotion, alreadyDone, wave, fade])

  /* ── Geometry: the video's composition, fitted to the screen ─────────── */
  const g = useMemo(() => {
    const comp = LOCKUP.composition
    const sc = Math.min(W / comp.width, H / comp.height)
    const vw = comp.width * sc
    const vh = comp.height * sc
    const ox = (W - vw) / 2
    const oy = (H - vh) / 2
    const logo = { left: ox + LOCKUP.logo.x * sc, top: oy + LOCKUP.logo.y * sc, size: LOCKUP.logo.size * sc }
    const ws = LOCKUP.word.scale * sc
    const box = LOCKUP.wordBox
    const word = {
      left: ox + LOCKUP.word.x * sc,
      top: oy + LOCKUP.word.y * sc + box.top * ws,
      width: box.width * ws,
      height: (box.bottom - box.top) * ws,
    }
    const groupBottom = word.top + word.height

    const bodyH = Math.round(H * 0.55)
    const crestH = CREST_BOX
    const cStart = H + CRESTS[0].lead + 4
    const cEnd = -(crestH + bodyH + crestH + 8)
    // The lockup is pushed from the moment the leading crest reaches it.
    const cTouch = groupBottom + CRESTS[0].lead + 6
    const pTouch = Math.min(0.98, Math.max(0, (cStart - cTouch) / (cStart - cEnd)))
    return { video: { left: ox, top: oy, width: vw, height: vh }, logo, word, bodyH, crestH, cStart, cEnd, pTouch, pushTo: cEnd - cTouch }
  }, [W, H])

  const bubbles = useMemo(() => buildBubbles(W, g.bodyH), [W, g.bodyH])

  const crestY = wave.interpolate({ inputRange: [0, 1], outputRange: [g.cStart, g.cEnd] })
  const pageY = wave.interpolate({ inputRange: [0, 1], outputRange: [0, g.cEnd - g.cStart] })
  const groupPush = wave.interpolate({ inputRange: [0, g.pTouch, 1], outputRange: [0, 0, g.pushTo] })
  const groupShrink = wave.interpolate({ inputRange: [0, g.pTouch, 1], outputRange: [1, 1, 0.9] })

  if (alreadyDone) return null

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity: fade }]}
      pointerEvents={waving ? 'none' : 'auto'}
      accessible
      accessibilityLabel="Chinese Easy"
    >
      {/* The white page. Its bottom edge rides just under the front crest, so
          everything the wave has passed is see-through to the app. */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: W,
          height: g.cStart + g.crestH,
          backgroundColor: C.page,
          transform: [{ translateY: pageY }],
        }}
      />

      {/* The finished lockup — the video's last frame, drawn for real. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { transform: [{ translateY: groupPush }, { scale: groupShrink }] }]}
      >
        <Image
          source={LOGO}
          fadeDuration={0}
          style={{ position: 'absolute', left: g.logo.left, top: g.logo.top, width: g.logo.size, height: g.logo.size }}
        />
        <Svg
          width={g.word.width}
          height={g.word.height}
          viewBox={`0 ${LOCKUP.wordBox.top} ${LOCKUP.wordBox.width} ${LOCKUP.wordBox.bottom - LOCKUP.wordBox.top}`}
          style={{ position: 'absolute', left: g.word.left, top: g.word.top }}
        >
          {WORD_PATHS.map((d, i) => (
            <Path key={i} d={d} fill={LOCKUP.word.color} />
          ))}
        </Svg>
      </Animated.View>

      {/* The silk and the writing, over the lockup until they end on it. */}
      {videoPlayer && (
        <View pointerEvents="none" style={{ position: 'absolute', ...g.video, backgroundColor: C.page }}>
          <VideoView
            player={videoPlayer}
            style={StyleSheet.absoluteFill}
            contentFit="fill"
            nativeControls={false}
            allowsPictureInPicture={false}
            playsInline
            // Android: a TextureView composites like any other view, and with
            // no shutter the page shows (white) until the first frame, not black.
            surfaceType="textureView"
            useExoShutter={false}
          />
        </View>
      )}

      {/* The wave. Its origin is the front crest's top line. */}
      {!reduceMotion && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: W,
            height: g.crestH * 2 + g.bodyH,
            transform: [{ translateY: crestY }],
          }}
        >
          {CRESTS.map((cr, k) => (
            <View
              key={`crest${k}`}
              style={{ position: 'absolute', left: 0, top: -cr.lead, width: W, height: g.crestH + cr.lead, overflow: 'hidden' }}
            >
              <Animated.View
                style={{
                  width: W * 2,
                  height: g.crestH + cr.lead,
                  transform: [
                    { translateX: wave.interpolate({ inputRange: [0, 1], outputRange: cr.drift > 0 ? [0, -W] : [-W, 0] }) },
                  ],
                }}
              >
                <Svg width={W * 2} height={g.crestH + cr.lead}>
                  <Path d={crestPath(W, cr.amp, cr.phase, g.crestH + cr.lead)} fill={cr.color} />
                  {k === CRESTS.length - 1 && (
                    <Path d={wavePoints(W, cr.amp, cr.phase)} stroke={C.crestEdge} strokeWidth={2} fill="none" />
                  )}
                </Svg>
              </Animated.View>
            </View>
          ))}

          <LinearGradient
            colors={[C.robeBright, C.robe, C.robeDeep]}
            locations={[0, 0.45, 1]}
            style={{ position: 'absolute', left: 0, top: g.crestH - 1, width: W, height: g.bodyH + 2 }}
          />

          {/* Foam rising through the body faster than the wave itself. */}
          {bubbles.map((b, k) => (
            <Animated.View
              key={`b${k}`}
              style={{
                position: 'absolute',
                left: b.x,
                top: g.crestH + b.y,
                width: b.r * 2,
                height: b.r * 2,
                borderRadius: b.r,
                backgroundColor: C.foam,
                opacity: wave.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, b.alpha, b.alpha, 0] }),
                transform: [{ translateY: wave.interpolate({ inputRange: [0, 1], outputRange: [0, -b.rise] }) }],
              }}
            />
          ))}

          {/* The trailing edge: the front crest, upside down, in the deep blue. */}
          <View style={{ position: 'absolute', left: 0, top: g.crestH + g.bodyH, width: W, height: g.crestH, overflow: 'hidden' }}>
            <Animated.View
              style={{
                width: W * 2,
                height: g.crestH,
                transform: [{ translateX: wave.interpolate({ inputRange: [0, 1], outputRange: [-W, 0] }) }, { scaleY: -1 }],
              }}
            >
              <Svg width={W * 2} height={g.crestH}>
                <Path d={crestPath(W, 13, 0.5, g.crestH)} fill={C.robeDeep} />
              </Svg>
            </Animated.View>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  )
}

/* ── Builders ────────────────────────────────────────────────────────────── */

/** Deterministic 0..1 noise, so the foam is the same on every launch. */
function noise(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

type Bubble = { x: number; y: number; r: number; alpha: number; rise: number }

function buildBubbles(W: number, bodyH: number): Bubble[] {
  return Array.from({ length: 14 }, (_, k) => ({
    x: noise(k + 200) * (W - 16),
    y: 10 + noise(k + 220) * bodyH * 0.6,
    r: 2 + Math.round(noise(k + 240) * 4),
    alpha: 0.18 + noise(k + 260) * 0.3,
    rise: 40 + noise(k + 280) * 110,
  }))
}

/*
 * A sine-ish crest two screens wide (period = one screen width, so sliding it
 * by W loops seamlessly). Built from quadratic halves: a control point 2·amp
 * off the midline peaks at exactly amp.
 */
function wavePoints(W: number, amp: number, phase: number): string {
  const P = W
  const half = P / 2
  const mid = amp + 2
  const x0 = -phase * P
  let d = `M${x0} ${mid} Q${x0 + half / 2} ${mid - 2 * amp} ${x0 + half} ${mid}`
  for (let x = x0 + half * 2; x <= 2 * W + P; x += half) d += ` T${x} ${mid}`
  return d
}

/** The crest, filled down to the box's bottom. */
function crestPath(W: number, amp: number, phase: number, boxH: number): string {
  return `${wavePoints(W, amp, phase)} V${boxH} H${-phase * W} Z`
}
