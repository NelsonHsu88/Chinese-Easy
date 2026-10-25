/*
 * The completion celebration: Shifu crouches, springs up, turns in the air,
 * lands with a squash and a scatter of gold, then "Great job!", the results
 * and Continue.
 *
 *   <LessonCompletionCelebration stats={[…]} onContinue={…} />
 *
 * One Animated clock (ms, linear, native driver) drives every layer through
 * interpolations — transforms and opacity only — so the whole thing runs on
 * the UI thread and is a pure function of time: a backstop timer can always
 * force the final frame, a remount can never leave it half-played, and reduced
 * motion simply starts at the end.
 *
 * Layout is worked out from the window and safe-area insets, never from
 * `onLayout`: three zones — breathing room and the jump's headroom; Shifu,
 * his ground and the title; results and Continue at the bottom — sized so
 * nothing overlaps, crops or scrolls, from an iPhone SE to a Pro Max.
 *
 * Two Shifus. With `FEATURES.celebration3d` on, he is the 3D render
 * (`Shifu3D`): the jump, the full 360° turn and the landing are all in the
 * render itself, and the clock starts when it does, so the sparkles, fanfare
 * and text land on its touchdown. Off, he is the flat painting, and the
 * transforms here make the jump. A flat painting can't show his side or back,
 * so that version makes a lively turn of about a third instead: a twist one
 * way and back the other, in perspective, never far enough to go thin.
 */
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { AccessibilityInfo, Animated, Easing, Image, PixelRatio, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg'
import { ReviewButton } from '../review/parts'
import { BrushHighlight } from '../BrushHighlight'
import { playFanfare } from '../../lib/sound'
import { successHaptic } from '../../lib/haptics'
import { FEATURES } from '../../lib/features'
import { Shifu3D } from './Shifu3D'
import { CELEB_CONTENT_MAX, SHIFU_3D, SHIFU_ART, celebColors as C, celebTiming, celebTiming3D, celebType } from './tokens'

const THREE_D = FEATURES.celebration3d
const T = THREE_D ? celebTiming3D : celebTiming

const SHIFU = require('../../assets/images/celebration/shifu-jump.png')
const MOUNTAINS = require('../../assets/images/decor/mountains-wide.png')
const MOUNTAINS_RATIO = 466 / 135

const useNativeDriver = Platform.OS !== 'web'
const OUT = Easing.bezier(0.22, 1, 0.36, 1)
const IN = Easing.bezier(0.55, 0, 0.9, 0.45)
/** A spring's overshoot, as a curve: a touch past the end, then back. */
const SPRINGY = Easing.bezier(0.34, 1.45, 0.64, 1)

export type CompletionStat = {
  icon: ComponentType<{ color: string; size: number; strokeWidth: number }>
  value: string
  label: string
  tone: 'xp' | 'words' | 'accuracy'
}

type Props = {
  stats: CompletionStat[]
  onContinue: () => void
  title?: string
  /** One quiet line under the title, if the session wants to say more. */
  subtitle?: string
  continueLabel?: string
}

export function LessonCompletionCelebration({ stats, onContinue, title = 'Great job!', subtitle, continueLabel = 'Continue' }: Props) {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const clock = useRef(new Animated.Value(0)).current
  const [settled, setSettled] = useState(false)
  /** null until the reduced-motion setting is known. */
  const [motion, setMotion] = useState<boolean | null>(null)
  const [playKey, setPlayKey] = useState(0)
  const run = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  /* ── Layout ─────────────────────────────────────────────────────────── */
  const L = useMemo(() => {
    const column = Math.min(width, CELEB_CONTENT_MAX)
    const k = column / CELEB_CONTENT_MAX
    // Large accessibility text grows the words; the zones make room for it.
    const fs = Math.min(PixelRatio.getFontScale(), 1.3)
    const contentH = height - insets.top - insets.bottom
    const titleH = (celebType.title.lineHeight * Math.max(k, 0.82) + (subtitle ? 26 : 0)) * fs + 14
    const resultsH = 86 * fs + 18
    const buttonH = 60 + 16
    const bottomH = resultsH + buttonH + 12
    const breathing = Math.max(10, contentH * 0.03)
    const stage = Math.max(220, contentH - breathing - titleH - bottomH)
    // Shifu: ~35–42% of the content height, inside the stage with headroom,
    // and never wider than the column allows (his sleeves are wide).
    let charH = Math.min(stage * 0.76, contentH * 0.42)
    const maxW = column * 0.84
    if ((charH * SHIFU_ART.width) / SHIFU_ART.height > maxW) charH = (maxW * SHIFU_ART.height) / SHIFU_ART.width
    const charW = (charH * SHIFU_ART.width) / SHIFU_ART.height
    const ground = 14 // room under his feet for the shadow
    const jump = Math.max(24, Math.min(100, charH * 0.3, stage - charH - ground - 6))
    // The 3D render: standing as tall as the painting, soles on the same floor,
    // the top of the jump inside the safe area, the sleeves inside the column.
    const v3h = Math.min(
      charH / SHIFU_3D.standing,
      (stage + breathing - ground) / (SHIFU_3D.apex - SHIFU_3D.feet),
      (column * 0.98) / (SHIFU_3D.span * SHIFU_3D.aspect),
    )
    const v3 = { w: v3h * SHIFU_3D.aspect, h: v3h, bottom: ground - SHIFU_3D.feet * v3h }
    return { column, k, fs, contentH, titleH, bottomH, breathing, stage, charH, charW, ground, jump, v3 }
  }, [width, height, insets.top, insets.bottom, subtitle])

  /* ── Playback ───────────────────────────────────────────────────────── */
  const play = (fromStart: boolean) => {
    const id = ++run.current
    timers.current.forEach(clearTimeout)
    timers.current = []
    setSettled(false)
    const finish = () => {
      if (run.current !== id) return
      clock.setValue(T.end)
      setSettled(true)
    }
    if (!fromStart) {
      finish()
      successHaptic()
      return
    }
    clock.setValue(0)
    Animated.timing(clock, { toValue: T.end, duration: T.end, easing: Easing.linear, useNativeDriver, isInteraction: false }).start(finish)
    // The landing's sound and touch, timed to the feet meeting the ground.
    timers.current.push(
      setTimeout(() => {
        if (run.current !== id) return
        successHaptic()
        playFanfare()
      }, T.touchAt),
    )
    // Continue is live once it has appeared, whatever the clock does.
    timers.current.push(setTimeout(() => run.current === id && setSettled(true), T.resultsFrom))
    // A hidden tab or a dropped callback must never leave it half-played.
    timers.current.push(setTimeout(finish, T.end + T.backstop))
  }

  useEffect(() => {
    let alive = true
    const begin = (animate: boolean) => {
      if (!alive) return
      setMotion(animate)
      // The 3D Shifu starts the clock itself, once its animation is running.
      if (!THREE_D || !animate) play(animate)
    }
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => begin(!reduce))
      .catch(() => begin(true))
    return () => {
      alive = false
      run.current++
      timers.current.forEach(clearTimeout)
      clock.stopAnimation()
    }
    // Once per mount: a completion celebrates once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Choreography ───────────────────────────────────────────────────── */
  const A = useMemo(() => buildAnimations(clock, L), [clock, L])

  return (
    <View style={{ flex: 1, backgroundColor: C.page }}>
      <Backdrop width={width} height={height} column={L.column} stageTop={insets.top + L.breathing} stage={L.stage} />

      <View style={{ flex: 1, paddingTop: insets.top + L.breathing, paddingBottom: insets.bottom, alignItems: 'center' }}>
        {/* Zone 2: the stage — headroom for the jump, Shifu standing on its floor. */}
        <View style={{ width: L.column, height: L.stage, alignItems: 'center', justifyContent: 'flex-end' }}>
          {THREE_D ? (
            // The render carries his own contact shadow, jump and turn.
            // No fade-in: his first frame is a calm standing pose, and a fade on
            // the JS clock can lag the animation while a large image decodes.
            <View style={{ position: 'absolute', bottom: L.v3.bottom, width: L.v3.w, height: L.v3.h }}>
              <Pressable
                // Development only: a long press replays the celebration.
                onLongPress={__DEV__ ? () => setPlayKey((k) => k + 1) : undefined}
                accessible={false}
                style={{ width: '100%', height: '100%' }}
              >
                {motion !== null ? (
                  <Shifu3D width={L.v3.w} height={L.v3.h} playKey={playKey} animate={motion} onStart={motion ? () => play(true) : undefined} />
                ) : null}
              </Pressable>
            </View>
          ) : null}
          {/* A soft contact shadow — a wash that fades at its rim, not a bar. */}
          {!THREE_D ? (
          <Animated.View style={{ marginBottom: 2, opacity: A.shadowOpacity, transform: [{ scaleX: A.shadowScale }] }}>
            <Svg width={L.charW * 0.7} height={22}>
              <Defs>
                <RadialGradient id="celebShadow" cx="50%" cy="50%" rx="50%" ry="50%">
                  <Stop offset="0" stopColor={C.shadow} stopOpacity={1} />
                  <Stop offset="0.55" stopColor={C.shadow} stopOpacity={0.55} />
                  <Stop offset="1" stopColor={C.shadow} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Ellipse cx={(L.charW * 0.7) / 2} cy={11} rx={(L.charW * 0.7) / 2} ry={11} fill="url(#celebShadow)" />
            </Svg>
          </Animated.View>
          ) : null}
          {!THREE_D ? (
          <Animated.View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              bottom: L.ground,
              width: L.charW,
              height: L.charH,
              opacity: A.enter,
              transform: [
                { translateY: A.lift },
                { perspective: 900 },
                { rotateY: A.turn },
                { rotate: A.lean },
                { scaleX: A.scaleX },
                { scaleY: A.scaleY },
              ],
            }}
          >
            <Pressable
              // Development only: a long press replays the celebration.
              onLongPress={__DEV__ ? () => play(true) : undefined}
              accessible={false}
              style={{ width: '100%', height: '100%' }}
            >
              <Image source={SHIFU} style={{ width: L.charW, height: L.charH }} resizeMode="contain" accessibilityIgnoresInvertColors />
            </Pressable>
          </Animated.View>
          ) : null}
          {THREE_D ? (
            <Sparkles
              A={A}
              box={{ w: L.v3.w, h: L.v3.h, bottom: L.v3.bottom }}
              head={{ x: L.v3.w / 2, y: L.v3.h * (1 - SHIFU_3D.head) }}
              r={L.v3.h * SHIFU_3D.headRadius * 1.55}
            />
          ) : (
            <Sparkles A={A} box={{ w: L.charW, h: L.charH, bottom: L.ground }} head={{ x: 0.47 * L.charW, y: L.charH * 0.3 }} r={L.charW * 0.4} />
          )}
          <Petals A={A} charW={THREE_D ? L.v3.w * SHIFU_3D.span * 0.75 : L.charW} ground={L.ground} />
        </View>

        {/* The title, under where he lands. */}
        <Animated.View
          style={{ alignItems: 'center', marginTop: 10, opacity: A.textOpacity, transform: [{ translateY: A.textRise }] }}
          accessibilityLiveRegion="polite"
        >
          <BrushHighlight color={C.wash} bleedX={12} bleedTop={-6} bleedBottom={-4} fleck={false}>
            <Text
              accessibilityRole="header"
              maxFontSizeMultiplier={1.3}
              style={{ ...celebType.title, fontSize: celebType.title.fontSize * Math.max(L.k, 0.82), lineHeight: celebType.title.lineHeight * Math.max(L.k, 0.82), color: C.navy, paddingHorizontal: 6 }}
            >
              {title}
            </Text>
          </BrushHighlight>
          {subtitle ? (
            <Text maxFontSizeMultiplier={1.3} style={{ ...celebType.subtitle, color: C.slate, marginTop: 6, textAlign: 'center' }}>
              {subtitle}
            </Text>
          ) : null}
        </Animated.View>

        {/* Zone 3: results and Continue, held to the bottom. */}
        <View style={{ flex: 1 }} />
        <Animated.View style={{ width: L.column, paddingHorizontal: 20, opacity: A.resultsOpacity, transform: [{ translateY: A.resultsRise }] }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {stats.slice(0, 3).map((s) => (
              <StatTile key={s.label} stat={s} fs={L.fs} />
            ))}
          </View>
        </Animated.View>
        <Animated.View
          pointerEvents={settled ? 'auto' : 'none'}
          style={{ width: L.column, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, opacity: A.buttonOpacity, transform: [{ translateY: A.buttonRise }] }}
        >
          <ReviewButton label={continueLabel} tone="primary" onPress={onContinue} />
        </Animated.View>
      </View>
    </View>
  )
}

/* ── The choreography, as interpolations of one clock ──────────────────── */

type Layout = { charH: number; charW: number; jump: number; ground: number }

function buildAnimations(t: Animated.Value, L: Layout) {
  const at = (inputRange: number[], outputRange: number[] | string[], easing?: (v: number) => number) =>
    t.interpolate({ inputRange, outputRange: outputRange as number[], easing, extrapolate: 'clamp' })

  // The painting's own jump (unused by the 3D Shifu) keeps its own beats.
  const P = celebTiming
  // Squash and stretch, from his feet: scaleY about the centre moves the feet,
  // so a matching translate keeps them planted.
  const sY = [0, P.crouchTo, 360, 520, P.liftTo, P.touchAt, 1380, P.landTo]
  const sYv = [1, 0.94, 1.06, 1, 1, 1, 0.92, 1.02]
  const scaleY = t.interpolate({ inputRange: [...sY, P.landTo + 80], outputRange: [...sYv, 1], extrapolate: 'clamp' })
  const scaleX = t.interpolate({ inputRange: [...sY, P.landTo + 80], outputRange: [1, 1.03, 0.96, 1, 1, 1, 1.05, 0.99, 1], extrapolate: 'clamp' })
  const plant = t.interpolate({
    inputRange: [...sY, P.landTo + 80],
    outputRange: [...sYv, 1].map((s) => ((1 - s) * L.charH) / 2),
    extrapolate: 'clamp',
  })

  // Up fast and easing into the top; a little float through the turn; down
  // with gravity onto the touch.
  const rise = at([P.crouchTo, P.liftTo], [0, 1], OUT)
  const fall = at([P.turnTo, P.touchAt], [0, 1], IN)
  const float = at([P.liftTo, 900, P.turnTo], [0, -6, 0])
  const lift = Animated.add(
    Animated.add(Animated.multiply(rise, -L.jump), Animated.add(float, Animated.multiply(fall, L.jump))),
    plant,
  )

  // The turn: a third of a turn one way, through, and back — springing home.
  const turn = at([P.liftTo, 820, 1010, P.turnTo, 1220], ['0deg', '-34deg', '26deg', '-6deg', '0deg'] as unknown as number[])
  const lean = at([P.crouchTo, 420, P.liftTo, 900, P.turnTo, P.touchAt], ['0deg', '-4deg', '0deg', '5deg', '-3deg', '0deg'] as unknown as number[])

  const enter = at([0, T.enterTo], [0, 1])

  // The shadow knows how high he is.
  const shadowScale = at([0, P.crouchTo, P.liftTo, P.turnTo, P.touchAt, 1380, P.landTo], [1, 1.08, 0.58, 0.58, 1, 1.1, 1])
  const shadowOpacity = at([0, P.enterTo, P.crouchTo, P.liftTo, P.turnTo, P.touchAt, P.landTo], [0, 0.2, 0.28, 0.09, 0.09, 0.26, 0.2])

  // Gold marks at his head, popping out on the landing and staying.
  const sparkle = at([T.touchAt - 20, T.touchAt + 200], [0, 1], SPRINGY)
  const sparkleOpacity = at([T.touchAt - 20, T.touchAt + 90], [0, 1])
  // Petals kicked up by the landing, drifting and gone by the end.
  const petals = at([T.touchAt, T.end], [0, 1], OUT)
  const petalOpacity = at([T.touchAt, T.touchAt + 120, T.end - 250, T.end], [0, 1, 1, 0])

  const textOpacity = at([T.textFrom, T.textFrom + 260], [0, 1])
  const textRise = at([T.textFrom, T.textTo], [12, 0], SPRINGY)
  const resultsOpacity = at([T.resultsFrom, T.resultsFrom + 220], [0, 1])
  const resultsRise = at([T.resultsFrom, T.end - 60], [16, 0], OUT)
  const buttonOpacity = at([T.resultsFrom + 90, T.end], [0, 1])
  const buttonRise = at([T.resultsFrom + 90, T.end], [16, 0], OUT)

  return { scaleX, scaleY, lift, turn, lean, enter, shadowScale, shadowOpacity, sparkle, sparkleOpacity, petals, petalOpacity, textOpacity, textRise, resultsOpacity, resultsRise, buttonOpacity, buttonRise }
}

type Anims = ReturnType<typeof buildAnimations>

/* ── Pieces ───────────────────────────────────────────────────────────── */

/** Gold dashes radiating from his head, like the painting's own. */
function Sparkles({ A, box, head, r }: { A: Anims; box: { w: number; h: number; bottom: number }; head: { x: number; y: number }; r: number }) {
  const marks = [-118, -98, -36, -14].map((deg, i) => ({ deg, r: r * (i % 2 ? 1.1 : 1), len: 15 + (i % 2) * 5 }))
  return (
    <View pointerEvents="none" style={{ position: 'absolute', bottom: box.bottom, width: box.w, height: box.h }}>
      {marks.map((m, i) => {
        const rad = (m.deg * Math.PI) / 180
        const x = head.x + Math.cos(rad) * m.r
        const y = head.y + Math.sin(rad) * m.r
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: x - 3.5,
              top: y - m.len / 2,
              width: 7,
              height: m.len,
              borderRadius: 3.5,
              backgroundColor: C.gold,
              opacity: A.sparkleOpacity,
              transform: [
                { rotate: `${m.deg + 90}deg` },
                { translateY: A.sparkle.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
                { scale: A.sparkle },
              ],
            }}
          />
        )
      })}
    </View>
  )
}

const PETAL = 'M6 0 C10 3 12 8 10 13 C8 17 4 17 2 13 C0 8 2 3 6 0 Z'

/** A few petals kicked up by the landing. */
function Petals({ A, charW, ground }: { A: Anims; charW: number; ground: number }) {
  const flights = [
    { dx: -charW * 0.42, dy: -70, spin: -140, size: 1 },
    { dx: charW * 0.38, dy: -86, spin: 160, size: 0.85 },
    { dx: charW * 0.12, dy: -110, spin: 90, size: 0.7 },
  ]
  return (
    <View pointerEvents="none" style={{ position: 'absolute', bottom: ground, width: charW, height: 1, alignItems: 'center' }}>
      {flights.map((f, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            bottom: 0,
            opacity: A.petalOpacity,
            transform: [
              { translateX: A.petals.interpolate({ inputRange: [0, 1], outputRange: [0, f.dx] }) },
              // Up with the kick, then settling a little as it drifts.
              { translateY: A.petals.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, f.dy, f.dy + 26] }) },
              { rotate: A.petals.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${f.spin}deg`] }) },
              { scale: f.size },
            ],
          }}
        >
          <Svg width={12} height={17} viewBox="0 0 12 17">
            <Path d={PETAL} fill={i === 1 ? C.petalDeep : C.petal} />
          </Svg>
        </Animated.View>
      ))}
    </View>
  )
}

/** Ivory, the faintest distant mountains behind his jump, three resting petals. */
function Backdrop({ width, height, column, stageTop, stage }: { width: number; height: number; column: number; stageTop: number; stage: number }) {
  const mw = Math.min(width, column * 1.15)
  const mh = mw / MOUNTAINS_RATIO
  const resting = [
    { x: 0.12, y: 0.16, r: 30, s: 0.9 },
    { x: 0.86, y: 0.3, r: -40, s: 0.75 },
    { x: 0.2, y: 0.58, r: 70, s: 0.65 },
  ]
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height }}>
      <Image
        source={MOUNTAINS}
        style={{ position: 'absolute', left: (width - mw) / 2, top: stageTop + stage * 0.32 - mh / 2, width: mw, height: mh, opacity: 0.38 }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      {resting.map((p, i) => (
        <View
          key={i}
          style={{ position: 'absolute', left: width * p.x, top: stageTop + stage * p.y, opacity: 0.55, transform: [{ rotate: `${p.r}deg` }, { scale: p.s }] }}
        >
          <Svg width={12} height={17} viewBox="0 0 12 17">
            <Path d={PETAL} fill={C.petal} />
          </Svg>
        </View>
      ))}
    </View>
  )
}

function StatTile({ stat, fs }: { stat: CompletionStat; fs: number }) {
  const tone = stat.tone === 'xp' ? [C.xp, C.xpDisc] : stat.tone === 'words' ? [C.words, C.wordsDisc] : [C.accuracy, C.accuracyDisc]
  const Icon = stat.icon
  return (
    <View
      accessible
      accessibilityLabel={`${stat.label}: ${stat.value}`}
      style={{
        flex: 1,
        minHeight: 86 * fs,
        backgroundColor: C.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: C.cardBorder,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 6,
      }}
    >
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: tone[1], alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
        <Icon color={tone[0]} size={17} strokeWidth={2.3} />
      </View>
      <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ ...celebType.statValue, color: tone[0] }}>
        {stat.value}
      </Text>
      <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ ...celebType.statLabel, color: C.slate }}>
        {stat.label}
      </Text>
    </View>
  )
}
