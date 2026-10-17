/*
 * The launch intro: Shifu wound together from strands of silk that fly in from
 * the viewer, "Chinese Easy" written out by a bouncing ball of ink, then a blue
 * wave that carries it all off the top of the screen and reveals the app.
 *
 * It mounts above everything in the root layout from the first frame (the
 * native splash is plain white, so the hand-off is invisible) and unmounts
 * itself once the wave has passed. The app renders underneath as soon as it is
 * ready; the wave waits for both the intro and the app, so a slow hydrate holds
 * on the finished logo instead of revealing a blank screen.
 *
 * Three Animated values drive it:
 *   - `clock` (ms) — the silk and lock-in effects, on the native driver;
 *   - `pen` (ms, the same timeline) — the writing. SVG stroke offsets can't run
 *     natively, so it is a JS-driven twin started alongside `clock`;
 *   - `wave` (0..1) — the wave and the push, native.
 * No layout is measured: positions come from the window size, because
 * `onLayout` can't be trusted to fire on web.
 */
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { ClipPath, Defs, Image as SvgImage, Path, type PathProps } from 'react-native-svg'
import { launchColors as C, launchTiming as T } from './tokens'
import {
  ballKeys,
  ballLandings,
  underline,
  wordmarkBox,
  wordmarkFills,
  wordmarkStrokes,
  writeTiming,
} from './wordmark'

const LOGO = require('../../assets/images/launch/shifu-logo.png')

/* Animated tags its components `collapsable={false}`, which react-native-web
   forwards onto the <path> element as an invalid attribute — drop it. */
const BarePath = forwardRef<Path, PathProps & { collapsable?: boolean }>(function BarePath(
  { collapsable: _collapsable, ...props },
  ref,
) {
  return <Path ref={ref} {...props} />
})
const AnimatedPath = Animated.createAnimatedComponent(BarePath)

const useNativeDriver = Platform.OS !== 'web'
const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1)
const SOFT_OUT = Easing.bezier(0.22, 1, 0.36, 1)
const PUSH = Easing.bezier(0.65, 0, 0.35, 1)

const CONTENT_MAX = 430
/* The wordmark box carries its own headroom for the ball's hops, so it can
   tuck up under the logo. */
const WORDMARK_OVERLAP = 4
const BALL = 9

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
 * and all; reading the clock back from here lets the remounted intro carry on
 * from the same frame instead of starting over (or replaying once finished).
 */
const session = {
  introStartedAt: null as number | null,
  waveStartedAt: null as number | null,
  reduceMotion: null as boolean | null,
  done: false,
}

export function LaunchIntro({ appReady, onVisible, onDone }: Props) {
  const { width: W, height: H } = useWindowDimensions()
  const resumed = session.introStartedAt !== null
  const alreadyDone = useRef(session.done).current
  const startAt = useRef(resumed ? Math.min(T.introMs, Date.now() - session.introStartedAt!) : 0).current
  const clock = useRef(new Animated.Value(startAt)).current
  const pen = useRef(new Animated.Value(startAt)).current
  const wave = useRef(new Animated.Value(0)).current
  const fade = useRef(new Animated.Value(1)).current

  const [logoLoaded, setLogoLoaded] = useState(resumed)
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(session.reduceMotion)
  const [introDone, setIntroDone] = useState(false)
  const [waving, setWaving] = useState(false)
  const started = useRef(false)
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

  useEffect(() => {
    // An image that never reports load must not hold the launch.
    const t = setTimeout(() => setLogoLoaded(true), 700)
    return () => clearTimeout(t)
  }, [])

  /* ── Act 1: silk, then writing ───────────────────────────────────────── */
  const canStart = !alreadyDone && logoLoaded && reduceMotion !== null
  useEffect(() => {
    if (!canStart || started.current) return
    started.current = true
    callbacks.current.onVisible()
    if (session.introStartedAt === null) session.introStartedAt = Date.now()
    const remaining = T.introMs - (Date.now() - session.introStartedAt)
    let done = false
    const end = () => {
      if (done) return
      done = true
      clock.setValue(T.introMs)
      pen.setValue(T.introMs)
      setIntroDone(true)
    }
    if (reduceMotion || remaining <= 0) {
      end()
      return
    }
    // Linear, so a resumed clock picks up exactly where the last one was.
    const run = (v: Animated.Value, native: boolean) =>
      Animated.timing(v, { toValue: T.introMs, duration: remaining, easing: Easing.linear, useNativeDriver: native })
    run(pen, false).start()
    run(clock, useNativeDriver).start(({ finished }) => {
      // react-native-web can report a timely end as unfinished; what counts
      // is whether the time is up. Only the remount's early stop is ignored.
      if (finished || Date.now() - session.introStartedAt! >= T.introMs - 50) end()
    })
    timers.current.push(setTimeout(end, remaining + T.backstopMs))
  }, [canStart, reduceMotion, clock, pen])

  /* ── Act 2: the wave (or, with reduced motion, a plain fade) ─────────── */
  useEffect(() => {
    if (!introDone || !appReady || waving) return
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
    // A stop from the remount above is not an ending; the next instance
    // resumes. (Time, not `finished`, decides — see the intro's callback.)
    anim.start(({ finished }) => {
      if (finished || Date.now() - session.waveStartedAt! >= total - 50) finish()
    })
    timers.current.push(setTimeout(finish, remaining + T.backstopMs))
  }, [introDone, appReady, waving, reduceMotion, wave, fade])

  /* ── Geometry ────────────────────────────────────────────────────────── */
  const g = useMemo(() => {
    const column = Math.min(W, CONTENT_MAX)
    const S = Math.round(Math.max(190, Math.min(280, column * 0.6)))
    const wmTop = S - WORDMARK_OVERLAP
    const groupH = wmTop + wordmarkBox.height
    const groupTop = Math.round(H * 0.47 - groupH / 2)
    const groupBottom = groupTop + groupH

    const bodyH = Math.round(H * 0.55)
    const crestH = CREST_BOX
    // The crest starts with even the leading (back) crest under the screen,
    // and ends with the trailing edge clear of the top.
    const cStart = H + CRESTS[0].lead + 4
    const cEnd = -(crestH + bodyH + crestH + 8)
    // The group is pushed from the moment the leading crest reaches it.
    const cTouch = groupBottom + CRESTS[0].lead + 6
    const pTouch = Math.min(0.98, Math.max(0, (cStart - cTouch) / (cStart - cEnd)))
    const pushTo = cEnd - cTouch

    return { S, wmTop, groupTop, groupH, bodyH, crestH, cStart, cEnd, pTouch, pushTo }
  }, [W, H])

  const strands = useMemo(() => buildStrands(g.S), [g.S])
  const sparkles = useMemo(() => buildSparkles(g.S), [g.S])
  const bubbles = useMemo(() => buildBubbles(W, g.bodyH), [W, g.bodyH])

  /* ── Shared interpolations ───────────────────────────────────────────── */
  const crestY = wave.interpolate({ inputRange: [0, 1], outputRange: [g.cStart, g.cEnd] })
  const pageY = wave.interpolate({ inputRange: [0, 1], outputRange: [0, g.cEnd - g.cStart] })
  const groupPush = wave.interpolate({ inputRange: [0, g.pTouch, 1], outputRange: [0, 0, g.pushTo] })
  const groupShrink = wave.interpolate({ inputRange: [0, g.pTouch, 1], outputRange: [1, 1, 0.9] })
  const pulse = clock.interpolate({
    inputRange: [T.lockInMs, T.lockInMs + 110, T.lockInMs + 420],
    outputRange: [1, 1.03, 1],
    easing: Easing.inOut(Easing.quad),
    extrapolate: 'clamp',
  })

  const logoLeft = (W - g.S) / 2

  if (alreadyDone) return null

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity: fade }]}
      pointerEvents={waving ? 'none' : 'auto'}
      accessible
      accessibilityLabel="Chinese Easy"
    >
      {/* Preloads the logo for the strands' SVG images and reports when it's in. */}
      <Image
        source={LOGO}
        fadeDuration={0}
        onLoad={() => setLogoLoaded(true)}
        style={styles.preload}
      />

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

      {/* Logo + wordmark, pushed as one by the wave. */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          width: W,
          top: g.groupTop,
          height: g.groupH,
          transform: [{ translateY: groupPush }, { scale: groupShrink }],
        }}
      >
        {/* Halo rings — drawn first so the logo's opaque white sits over them. */}
        {[0, 1].map((k) => {
          const s = T.lockInMs + k * 110
          const d = g.S * 1.42
          return (
            <Animated.View
              key={`ring${k}`}
              style={{
                position: 'absolute',
                left: (W - d) / 2,
                top: (g.S - d) / 2,
                width: d,
                height: d,
                borderRadius: d / 2,
                borderWidth: k === 0 ? 2 : 1.25,
                borderColor: C.robeLight,
                opacity: clock.interpolate({
                  inputRange: [s, s + 90, s + 640],
                  outputRange: [0, k === 0 ? 0.5 : 0.32, 0],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    scale: clock.interpolate({
                      inputRange: [s, s + 640],
                      outputRange: [0.72, 1.32],
                      easing: SOFT_OUT,
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              }}
            />
          )
        })}

        <Animated.View
          style={{
            position: 'absolute',
            left: logoLeft,
            top: 0,
            width: g.S,
            height: g.S,
            transform: [{ scale: pulse }],
          }}
        >
          {/* The silk. Each strand is a curved band of the logo — a slice of
              one ring around its centre — that starts close to the viewer
              (large, faint) and winds into place. Inner rings land first, and
              an incoming band is always an annulus outside everything already
              landed, so it never covers it. Rings turn in alternate
              directions, which reads as the silk wrapping round. */}
          {strands.map((st, i) => {
            const end = st.start + T.strandFlightMs
            const scale = clock.interpolate({
              inputRange: [st.start, end],
              outputRange: [T.strandNearScale, 1],
              easing: EXPO_OUT,
              extrapolate: 'clamp',
            })
            const rotate = clock.interpolate({
              inputRange: [st.start, end],
              outputRange: [`${st.spin}deg`, '0deg'],
              easing: SOFT_OUT,
              extrapolate: 'clamp',
            })
            return (
              <View key={`strand${i}`} style={StyleSheet.absoluteFill} pointerEvents="none">
                <Animated.View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      opacity: clock.interpolate({
                        inputRange: [st.start, st.start + T.strandFlightMs * 0.32],
                        outputRange: [0, 1],
                        extrapolate: 'clamp',
                      }),
                      transform: [{ scale }, { rotate }],
                    },
                  ]}
                >
                  <Svg width={g.S} height={g.S}>
                    <Defs>
                      <ClipPath id={`launch-strand-${i}`}>
                        <Path d={st.clip} />
                      </ClipPath>
                    </Defs>
                    <SvgImage
                      href={LOGO}
                      x={0}
                      y={0}
                      width={g.S}
                      height={g.S}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath={`url(#launch-strand-${i})`}
                    />
                  </Svg>
                </Animated.View>
                {/* Its bright thread: leads the band in, then melts into it. */}
                <Animated.View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      opacity: clock.interpolate({
                        inputRange: [st.start, st.start + 110, end - 220, end + 60],
                        outputRange: [0, 0.95, 0.8, 0],
                        extrapolate: 'clamp',
                      }),
                      transform: [{ scale }, { rotate }],
                    },
                  ]}
                >
                  <Svg width={g.S} height={g.S}>
                    <Path
                      d={st.thread}
                      stroke={st.threadColor}
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </Svg>
                </Animated.View>
              </View>
            )
          })}

          {/* Light sweep across the finished logo. Invisible on its white,
              a sheen on the robe. */}
          <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
            <Animated.View
              style={{
                position: 'absolute',
                top: -g.S * 0.25,
                left: 0,
                width: g.S * 0.42,
                height: g.S * 1.5,
                opacity: clock.interpolate({
                  inputRange: [T.lockInMs, T.lockInMs + 80, T.lockInMs + 560, T.lockInMs + 680],
                  outputRange: [0, 1, 1, 0],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    translateX: clock.interpolate({
                      inputRange: [T.lockInMs, T.lockInMs + 680],
                      outputRange: [-g.S * 0.55, g.S * 1.1],
                      easing: Easing.inOut(Easing.cubic),
                      extrapolate: 'clamp',
                    }),
                  },
                  { rotate: '18deg' },
                ],
              }}
            >
              <LinearGradient
                colors={[C.sheenClear, C.sheen, C.sheenClear]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
        </Animated.View>

        {/* Sparkles thrown off as the silk locks. */}
        {sparkles.map((sp, k) => {
          const s = T.lockInMs + 40 + sp.delay
          const dur = 560
          return (
            <Animated.View
              key={`sp${k}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: W / 2 - sp.size / 2,
                top: g.S / 2 - sp.size / 2,
                width: sp.size,
                height: sp.size,
                opacity: clock.interpolate({
                  inputRange: [s, s + 120, s + dur],
                  outputRange: [0, 1, 0],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    translateX: clock.interpolate({
                      inputRange: [s, s + dur],
                      outputRange: [sp.x0, sp.x1],
                      easing: SOFT_OUT,
                      extrapolate: 'clamp',
                    }),
                  },
                  {
                    translateY: clock.interpolate({
                      inputRange: [s, s + dur],
                      outputRange: [sp.y0, sp.y1],
                      easing: SOFT_OUT,
                      extrapolate: 'clamp',
                    }),
                  },
                  {
                    scale: clock.interpolate({
                      inputRange: [s, s + 200, s + dur],
                      outputRange: [0.2, 1, 0.3],
                      extrapolate: 'clamp',
                    }),
                  },
                  {
                    rotate: clock.interpolate({
                      inputRange: [s, s + dur],
                      outputRange: ['0deg', `${sp.spin}deg`],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              }}
            >
              <Svg width={sp.size} height={sp.size} viewBox="0 0 20 20">
                <Path
                  d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0 Z"
                  fill={sp.gold ? C.scrollGold : C.robeBright}
                />
              </Svg>
            </Animated.View>
          )
        })}

        <Wordmark pen={pen} left={(W - wordmarkBox.width) / 2} top={g.wmTop} />
      </Animated.View>

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
              style={{
                position: 'absolute',
                left: 0,
                top: -cr.lead,
                width: W,
                height: g.crestH + cr.lead,
                overflow: 'hidden',
              }}
            >
              <Animated.View
                style={{
                  width: W * 2,
                  height: g.crestH + cr.lead,
                  transform: [
                    {
                      translateX: wave.interpolate({
                        inputRange: [0, 1],
                        outputRange: cr.drift > 0 ? [0, -W] : [-W, 0],
                      }),
                    },
                  ],
                }}
              >
                <Svg width={W * 2} height={g.crestH + cr.lead}>
                  <Path d={crestPath(W, cr.amp, cr.phase, g.crestH + cr.lead)} fill={cr.color} />
                  {k === CRESTS.length - 1 && (
                    <Path
                      d={wavePoints(W, cr.amp, cr.phase)}
                      stroke={C.crestEdge}
                      strokeWidth={2}
                      fill="none"
                    />
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
                opacity: wave.interpolate({
                  inputRange: [0, 0.15, 0.85, 1],
                  outputRange: [0, b.alpha, b.alpha, 0],
                }),
                transform: [
                  { translateY: wave.interpolate({ inputRange: [0, 1], outputRange: [0, -b.rise] }) },
                ],
              }}
            />
          ))}

          {/* The trailing edge: the front crest, upside down, in the deep blue. */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: g.crestH + g.bodyH,
              width: W,
              height: g.crestH,
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={{
                width: W * 2,
                height: g.crestH,
                transform: [
                  { translateX: wave.interpolate({ inputRange: [0, 1], outputRange: [-W, 0] }) },
                  { scaleY: -1 },
                ],
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

/* ── The written wordmark ──────────────────────────────────────────────────── */

/*
 * "Chinese Easy", written by a ball of ink. The ball drops in, traces each
 * letter's outline (the stroke draws on behind it), hops — a little bounce,
 * squashing as it lands — to the next, and finally rolls out the gold
 * underline before popping away. Each letter fills in once it is traced.
 * Paths and the ball's keyframes come from scripts/buildLaunchWordmark.mjs.
 */
function Wordmark({ pen, left, top }: { pen: Animated.Value; left: number; top: number }) {
  const at = T.writeAtMs
  const anim = useMemo(() => {
    const lastStrokeOf = new Map<number, number>()
    for (const s of wordmarkStrokes) lastStrokeOf.set(s.letter, s.t1)

    const times = ballKeys.map((k) => at + k[0])
    const ballX = pen.interpolate({
      inputRange: times,
      outputRange: ballKeys.map((k) => k[1] - BALL / 2),
      extrapolate: 'clamp',
    })
    const ballY = pen.interpolate({
      inputRange: times,
      outputRange: ballKeys.map((k) => k[2] - BALL / 2),
      extrapolate: 'clamp',
    })

    // Squash on each landing, skipping ones too close to the last to fit.
    const sIn: number[] = [0]
    const sx: number[] = [1]
    const sy: number[] = [1]
    let lastEnd = -Infinity
    for (const l of ballLandings) {
      const t = at + l
      if (t - 30 <= lastEnd) continue
      sIn.push(t - 30, t, t + 70)
      sx.push(0.92, 1.4, 1)
      sy.push(1.1, 0.62, 1)
      lastEnd = t + 70
    }
    const squashX = pen.interpolate({ inputRange: sIn, outputRange: sx, extrapolate: 'clamp' })
    const squashY = pen.interpolate({ inputRange: sIn, outputRange: sy, extrapolate: 'clamp' })

    const gone = at + writeTiming.total
    const ballOpacity = pen.interpolate({
      inputRange: [at, at + 90, gone, gone + 150],
      outputRange: [0, 1, 1, 0],
      extrapolate: 'clamp',
    })
    const ballPop = pen.interpolate({
      inputRange: [gone, gone + 70, gone + 150],
      outputRange: [1, 1.5, 0.2],
      extrapolate: 'clamp',
    })

    const strokes = wordmarkStrokes.map((s) =>
      pen.interpolate({
        inputRange: [at + s.t0, at + s.t1],
        outputRange: [s.length, 0],
        extrapolate: 'clamp',
      }),
    )
    const fills = wordmarkFills.map((f) => {
      const t = at + (lastStrokeOf.get(f.letter) ?? 0)
      return pen.interpolate({ inputRange: [t, t + 240], outputRange: [0, 1], extrapolate: 'clamp' })
    })
    const ulLength = underline.x1 - underline.x0
    const ul = pen.interpolate({
      inputRange: [at + underline.t0, at + underline.t1],
      outputRange: [ulLength, 0],
      extrapolate: 'clamp',
    })
    return { ballX, ballY, squashX, squashY, ballOpacity, ballPop, strokes, fills, ul, ulLength }
  }, [pen, at])

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left, top, width: wordmarkBox.width, height: wordmarkBox.height }}
    >
      <Svg width={wordmarkBox.width} height={wordmarkBox.height}>
        {wordmarkFills.map((f, i) => (
          <AnimatedPath key={`f${i}`} d={f.d} fill={C.robeDeep} fillOpacity={anim.fills[i]} />
        ))}
        {wordmarkStrokes.map((s, i) => (
          <AnimatedPath
            key={`s${i}`}
            d={s.d}
            fill="none"
            stroke={C.robeDeep}
            strokeWidth={1.4}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={[s.length, s.length]}
            strokeDashoffset={anim.strokes[i]}
          />
        ))}
        <AnimatedPath
          d={`M${underline.x0} ${underline.y}H${underline.x1}`}
          stroke={C.scrollGold}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={[anim.ulLength, anim.ulLength]}
          strokeDashoffset={anim.ul}
        />
      </Svg>
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: BALL,
          height: BALL,
          opacity: anim.ballOpacity,
          transform: [{ translateX: anim.ballX }, { translateY: anim.ballY }, { scale: anim.ballPop }],
        }}
      >
        <Animated.View
          style={[styles.ball, { transform: [{ scaleX: anim.squashX }, { scaleY: anim.squashY }] }]}
        >
          <View style={styles.ballShine} />
        </Animated.View>
      </Animated.View>
    </View>
  )
}

/* ── Builders ────────────────────────────────────────────────────────────── */

type Strand = { clip: string; thread: string; threadColor: string; start: number; spin: number }

/** Deterministic 0..1 noise, so the intro is the same on every launch. */
function noise(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

const THREAD_COLORS = [C.robeBright, C.robeLight, C.robeMist, C.robeBright, C.scrollGold] as const

/*
 * Annular slices of the logo square: `strandRings` rings of equal area out to
 * its corners, the innermost cut in two and the rest in three, each ring's
 * cuts turned a little from the last so the seams spiral. Every slice is
 * widened a hair (angle and radius) — neighbours overlap with identical pixels,
 * so no hairline shows between them.
 */
function buildStrands(S: number): Strand[] {
  const c = S / 2
  const R = (S / 2) * Math.SQRT2 + 2
  const rings = T.strandRings
  const edge = (k: number) => R * Math.sqrt(k / rings)
  const pt = (r: number, a: number) => `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`
  const out: Omit<Strand, 'start'>[] = []
  for (let k = 0; k < rings; k++) {
    const ri = k === 0 ? 0 : Math.max(0, edge(k) - 0.6)
    const ro = edge(k + 1) + 0.6
    const parts = k === 0 ? 2 : 3
    const offset = (k * 47 * Math.PI) / 180
    const spinDir = k % 2 === 0 ? 1 : -1
    for (let p = 0; p < parts; p++) {
      const pad = (0.9 * Math.PI) / 180
      const a0 = offset + (p / parts) * Math.PI * 2 - pad
      const a1 = offset + ((p + 1) / parts) * Math.PI * 2 + pad
      const large = a1 - a0 > Math.PI ? 1 : 0
      const clip =
        ri === 0
          ? `M${c} ${c}L${pt(ro, a0)}A${ro} ${ro} 0 ${large} 1 ${pt(ro, a1)}Z`
          : `M${pt(ro, a0)}A${ro} ${ro} 0 ${large} 1 ${pt(ro, a1)}L${pt(ri, a1)}A${ri} ${ri} 0 ${large} 0 ${pt(ri, a0)}Z`
      // The thread runs along the band's outer edge, just inside it.
      const rt = ro - 1.5
      const b0 = a0 + pad
      const b1 = a1 - pad
      const thread = `M${pt(rt, b0)}A${rt} ${rt} 0 ${b1 - b0 > Math.PI ? 1 : 0} 1 ${pt(rt, b1)}`
      const n = out.length
      out.push({
        clip,
        thread,
        threadColor: THREAD_COLORS[n % THREAD_COLORS.length],
        spin: spinDir * (130 + k * 12 + noise(n) * 30),
      })
    }
  }
  // One at a time, the gaps closing up as the silk gathers pace.
  const last = out.length - 1
  return out.map((s, i) => ({
    ...s,
    start: Math.round(T.strandFirstMs + T.strandSpreadMs * Math.pow(i / last, 0.8)),
  }))
}

type Sparkle = { x0: number; y0: number; x1: number; y1: number; size: number; delay: number; spin: number; gold: boolean }

function buildSparkles(S: number): Sparkle[] {
  const count = 8
  return Array.from({ length: count }, (_, k) => {
    const a = (k / count) * Math.PI * 2 - Math.PI / 2 + (noise(k + 40) - 0.5) * 0.5
    const r0 = S * (0.5 + noise(k + 60) * 0.06)
    const r1 = S * (0.68 + noise(k + 80) * 0.12)
    return {
      x0: Math.cos(a) * r0,
      y0: Math.sin(a) * r0,
      x1: Math.cos(a) * r1,
      y1: Math.sin(a) * r1,
      size: 10 + Math.round(noise(k + 100) * 9),
      delay: Math.round(noise(k + 120) * 140),
      spin: noise(k + 140) > 0.5 ? 90 : -90,
      gold: k % 3 === 1,
    }
  })
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

const styles = StyleSheet.create({
  preload: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  ball: {
    width: BALL,
    height: BALL,
    borderRadius: BALL / 2,
    backgroundColor: C.robeDeep,
  },
  ballShine: {
    position: 'absolute',
    left: 2,
    top: 1.5,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: C.glint,
  },
})
