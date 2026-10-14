import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { View, Text, Pressable, ScrollView, Image, Animated, Easing, Platform, AccessibilityInfo, useWindowDimensions } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, ChevronLeft, HeadphoneOff, HelpCircle, Timer, X } from 'lucide-react-native'
import { PressableScale, LiftedFace } from '../dashboard/parts'
import { onbVerdict, type VerdictKind } from '../onboarding/tokens'
import { listenArt } from '../listening/art'
import {
  drillColors as c,
  drillSheet,
  drillShoulders,
  drillShadow,
  drillType as t,
  drillSize,
  DRILL_CONTENT_MAX,
  DRILL_FOOT_RATIO,
  DRILL_SAKURA_RATIO,
} from './tokens'

/*
 * The frame every Mixed Drills question sits in: back arrow, title, progress,
 * the quick review's clock, the bamboo-and-range foot, and a row of buttons
 * standing in the foot's hole. Listening, Fill the Gap and Match the Pairs all
 * render through `DrillShell`, so moving between kinds mid-session changes the
 * card in the middle and nothing around it.
 */

export const DRILL_PAD = 22
const sakura = require('../../assets/images/onboarding/sakura-branch.png')

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function useDrillColumn() {
  const { width } = useWindowDimensions()
  const column = Math.min(width, DRILL_CONTENT_MAX)
  return { column, inner: column - DRILL_PAD * 2 }
}

export function DrillShell({
  title,
  step,
  total,
  secondsLeft,
  onClose,
  headerRight,
  sakuraCorner = false,
  scroll = true,
  buttons,
  answer,
  children,
}: {
  title: string
  step: number
  total: number
  secondsLeft?: number | null
  onClose: () => void
  /** Listening's Recent button. */
  headerRight?: ReactNode
  /** The SS102 references carry a sakura branch in the top right; listening's has its Recent button there. */
  sakuraCorner?: boolean
  /**
   * False pins the page to the screen: no scrolling, and the children get
   * exactly the height left between the header and the buttons. A child that
   * should absorb that space takes `flex: 1, minHeight: 0` and must be able to
   * shrink — listening's card does, by letting its option rows give.
   */
  scroll?: boolean
  buttons: ReactNode
  /**
   * The checked answer. While set, the answer sheet rises over the foot and
   * owns Continue; `buttons` keep their space (so nothing behind the sheet
   * moves) but are hidden and take no touches.
   */
  answer?: AnswerSheetSpec | null
  children: ReactNode
}) {
  const { column } = useDrillColumn()
  const footHeight = column / DRILL_FOOT_RATIO
  const pct = Math.min(100, Math.max(0, (step / Math.max(1, total)) * 100))
  const branch = column * 0.4

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <Frame scroll={scroll}>
        <View style={{ width: column, flexGrow: 1, ...(scroll ? null : { flex: 1, minHeight: 0 }) }}>
          {/* Foot painting: bamboo and the misty range, under everything. */}
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
            <Image source={listenArt.foot} style={{ width: column, height: footHeight }} resizeMode="contain" />
          </View>

          {sakuraCorner && (
            <View pointerEvents="none" style={{ position: 'absolute', top: -34, right: -18 }}>
              {/* The render grows from a trunk at its bottom left; mirrored, the
                  trunk comes in off the right edge. */}
              <Image
                source={sakura}
                style={{ width: branch, height: branch / DRILL_SAKURA_RATIO, transform: [{ scaleX: -1 }], opacity: 0.92 }}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Header. The title is centred on the column, not between its
              neighbours, so it doesn't drift with their widths. */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: DRILL_PAD - 6,
              paddingTop: 10,
              height: 58,
            }}
          >
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 10, bottom: 0, justifyContent: 'center' }}>
              <Text style={{ textAlign: 'center', fontFamily: 'LoraBold', ...t.title, color: c.ink }}>{title}</Text>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close drills" hitSlop={10} style={{ padding: 4 }}>
              <ChevronLeft size={30} color={c.greenDark} strokeWidth={2.4} />
            </Pressable>
            {headerRight ?? <View />}
          </View>

          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: DRILL_PAD + 42, marginTop: 10 }}
            accessibilityLabel={`Question ${step} of ${total}`}
          >
            <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: c.track, overflow: 'hidden' }}>
              <View style={{ width: `${pct}%`, height: '100%', borderRadius: 5, backgroundColor: c.green }} />
            </View>
            <Text style={{ fontFamily: 'NunitoSemiBold', ...t.counter, color: c.slate }}>
              {step} / {total}
            </Text>
          </View>
          {secondsLeft != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 6 }}>
              <Timer size={13} color={secondsLeft <= 30 ? onbVerdict.incorrect.text : c.slate} />
              <Text style={{ fontFamily: 'NunitoBold', fontSize: 12.5, color: secondsLeft <= 30 ? onbVerdict.incorrect.text : c.slate }}>
                {formatClock(secondsLeft)}
              </Text>
            </View>
          )}

          {children}

          <View
            pointerEvents={answer ? 'none' : 'auto'}
            importantForAccessibility={answer ? 'no-hide-descendants' : 'auto'}
            accessibilityElementsHidden={Boolean(answer)}
            style={{
              flexDirection: 'row',
              gap: 14,
              paddingHorizontal: DRILL_PAD,
              marginTop: 18,
              marginBottom: footHeight - 70,
              opacity: answer ? 0 : 1,
            }}
          >
            {buttons}
          </View>
        </View>
      </Frame>
    </SafeAreaView>
    {answer ? <AnswerSheet {...answer} /> : null}
    </View>
  )
}

/** The page under the safe area: a scroll view, or a plain column pinned to the screen. */
function Frame({ scroll, children }: { scroll: boolean; children: ReactNode }) {
  if (!scroll) return <View style={{ flex: 1, alignItems: 'center', overflow: 'hidden' }}>{children}</View>
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }} showsVerticalScrollIndicator={false} bounces={false}>
      {children}
    </ScrollView>
  )
}

/**
 * The two-step answer row every multiple-choice kind shares: "I don't know"
 * beside Check Answer, then one Continue across the row once the answer is in.
 * Check Answer is present but visibly not ready until something is picked.
 */
export function AnswerButtons({
  answered,
  ready,
  onCheck,
  onGiveUp,
  onContinue,
  checkLabel = 'Check Answer',
}: {
  answered: boolean
  ready: boolean
  onCheck: () => void
  onGiveUp?: () => void
  onContinue: () => void
  checkLabel?: string
}) {
  if (answered) {
    return (
      <PressableScale onPress={onContinue} scaleTo={1} haptic={false} wrapperStyle={{ flex: 1 }} accessibilityLabel="Continue">
        <LiftedFace height={drillSize.button} fill={c.green} shoulder={drillShoulders.primary}>
          <Text style={{ fontFamily: 'NunitoBold', ...t.button, color: '#FFFFFF' }}>Continue</Text>
        </LiftedFace>
      </PressableScale>
    )
  }
  return (
    <>
      {onGiveUp && (
        <PressableScale onPress={onGiveUp} scaleTo={1} haptic={false} wrapperStyle={{ flex: 1 }} accessibilityLabel="I don't know">
          <LiftedFace height={drillSize.button} fill={c.card} shoulder={drillShoulders.quiet} border={c.outline} shadow={false}>
            <Text style={{ fontFamily: 'NunitoBold', ...t.button, color: c.slate }}>I don’t know</Text>
          </LiftedFace>
        </PressableScale>
      )}
      <PressableScale
        onPress={onCheck}
        scaleTo={1}
        haptic={false}
        wrapperStyle={{ flex: 1.15 }}
        accessibilityLabel={ready ? checkLabel : `${checkLabel} — pick an answer first`}
      >
        <LiftedFace
          height={drillSize.button}
          fill={ready ? c.green : c.disabled}
          shoulder={ready ? drillShoulders.primary : c.disabledShoulder}
          shadow={ready}
        >
          <Text style={{ fontFamily: 'NunitoBold', ...t.button, color: '#FFFFFF' }}>{checkLabel}</Text>
        </LiftedFace>
      </PressableScale>
    </>
  )
}

const TOAST_IN_MS = 260
const TOAST_HOLD_MS = 2800
const TOAST_OUT_MS = 320

/**
 * "Listening will be turned off for 30 minutes." — a gold notice that drops in
 * under the drill header, holds, and fades away by itself.
 *
 * Gold is the verdict palette's "unsure", the colour the drills already use for
 * "I don't know": not being able to listen right now is no more a mistake than
 * that is. Mount it with a fresh `key` to show it again. It takes no touches,
 * so it never sits between the learner and the button under it.
 */
export function DrillToast({ message }: { message: string }) {
  const tone = onbVerdict.unsure
  const insets = useSafeAreaInsets()
  const { column } = useDrillColumn()
  const show = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const native = Platform.OS !== 'web'
    const anim = Animated.sequence([
      Animated.timing(show, { toValue: 1, duration: TOAST_IN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
      Animated.delay(TOAST_HOLD_MS),
      Animated.timing(show, { toValue: 0, duration: TOAST_OUT_MS, easing: Easing.in(Easing.cubic), useNativeDriver: native }),
    ])
    anim.start()
    // Backstops for a stalled browser tab (see CLAUDE.md, Animation): on screen
    // in time to be read, and gone afterwards rather than parked mid-fade.
    const shown = setTimeout(() => show.setValue(1), TOAST_IN_MS + 80)
    const gone = setTimeout(() => show.setValue(0), TOAST_IN_MS + TOAST_HOLD_MS + TOAST_OUT_MS + 120)
    return () => {
      anim.stop()
      clearTimeout(shown)
      clearTimeout(gone)
    }
  }, [show])

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: insets.top + 64, alignItems: 'center' }}>
      <Animated.View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={{
          width: column - DRILL_PAD * 2,
          opacity: show,
          transform: [{ translateY: show.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 16,
            backgroundColor: tone.fill,
            borderWidth: 1,
            borderColor: tone.border,
            /* Not on Android: the toast fades in and out on the native driver,
               and there a fading parent doesn't fade its children's elevation
               shadow — it showed before the toast and lingered after it. The
               border carries the edge on its own. */
            ...(Platform.OS === 'android' ? null : drillShadow),
          }}
        >
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: tone.accent, alignItems: 'center', justifyContent: 'center' }}>
            <HeadphoneOff size={15} color="#FFFFFF" strokeWidth={2.6} />
          </View>
          <Text style={{ flex: 1, fontFamily: 'NunitoBold', fontSize: 15, lineHeight: 20, color: tone.text }}>{message}</Text>
        </View>
      </Animated.View>
    </View>
  )
}

/** Rises into place once, with a backstop for a stalled browser tab (see CLAUDE.md, Animation). */
export function useRise() {
  const rise = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(rise, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start()
    const backstop = setTimeout(() => rise.setValue(1), 400)
    return () => clearTimeout(backstop)
  }, [rise])
  return {
    opacity: rise,
    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
  }
}

/**
 * The verdict as a wide card under the answers, as the Fill the Gap reference
 * draws it: a disc, the judgement, then whatever the drill wants to say about
 * the word.
 */
export function VerdictCard({ kind, label: labelOverride, children }: { kind: VerdictKind; label?: string; children?: ReactNode }) {
  const tone = onbVerdict[kind]
  const style = useRise()
  const Icon = kind === 'correct' ? Check : kind === 'incorrect' ? X : HelpCircle
  const label = labelOverride ?? (kind === 'correct' ? 'Correct!' : kind === 'incorrect' ? 'Not quite' : 'No problem')
  return (
    <Animated.View style={style}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 18,
          paddingVertical: 12,
          minHeight: 58,
          borderRadius: 16,
          backgroundColor: tone.fill,
          borderWidth: 1,
          borderColor: tone.border,
        }}
      >
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: tone.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color="#FFFFFF" strokeWidth={3} />
        </View>
        <Text style={{ fontFamily: 'NunitoExtraBold', fontSize: 17, color: tone.text, includeFontPadding: false }}>{label}</Text>
        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8 }}>{children}</View>
      </View>
    </Animated.View>
  )
}

export type AnswerSheetSpec = {
  kind: VerdictKind
  /** Overrides the judgement: a correct answer otherwise gets a random bit of praise. */
  title?: string
  /** The word, its reading and meaning — whatever the drill wants said about the answer. */
  detail?: ReactNode
  onContinue: () => void
  /** The primary button's label. */
  continueLabel?: string
  /** A second, quieter button beside it — New Words' "Write it again". */
  secondary?: { label: string; onPress: () => void }
}

/** Said on a correct answer, one per question, picked when the sheet mounts. */
const PRAISE = ['Amazing!', 'Great job!', 'Nice!', 'Excellent!', 'You got it!', 'Perfect!', 'Well done!']
const SHEET_TITLE: Record<Exclude<VerdictKind, 'correct'>, string> = {
  incorrect: 'Not quite',
  unsure: 'No problem',
}

/** The cloud edge: its height, and each hump as [start, end] across the width and a peak height. */
const CLOUD_H = 40
const CLOUD_HUMPS: [number, number, number][] = [
  [0.1, 0.38, 24],
  [0.31, 0.66, 36],
  [0.55, 0.88, 28],
]
/** Far enough below the screen's edge to hide any sheet before it rises. */
const SHEET_HIDDEN_Y = 460
/**
 * The sheet's score, in ms. It rises unhurried, with a little overshoot to
 * settle on; the judgement pops in as it lands; then the clouds puff up once
 * and blow away, leaving a plain green panel, and the confetti is gone with them.
 */
const SHEET = {
  riseMs: 620,
  popDelayMs: 300,
  puffAtMs: 720,
  puffMs: 280,
  puffHoldMs: 140,
  vanishMs: 460,
  confettiDelayMs: 280,
  backstopMs: 2400,
} as const
const CONFETTI_COUNT = 16
const CONFETTI_MS = 1250

/**
 * The checked answer, rising from the bottom of the screen (SS1012 Correct UI):
 * a cloud-edged sheet in the verdict's colour, the judgement with its disc
 * popping in a beat after the sheet lands, the drill's detail, and Continue.
 * A correct answer also throws a handful of confetti up off the cloud's edge.
 *
 * Everything runs on the native driver; each value carries a backstop that
 * force-sets where it should have ended (see CLAUDE.md, Animation) — on web a
 * hidden tab would otherwise leave the sheet parked off screen with Continue
 * unreachable, which would strand the session.
 */
export function AnswerSheet({ kind, title: titleOverride, detail, onContinue, continueLabel = 'Continue', secondary }: AnswerSheetSpec) {
  const tone = drillSheet[kind]
  /* The clouds, and the confetti that comes off them, are a correct answer's
     alone. A wrong answer or an "I don't know" rises as a plain panel. */
  const celebrate = kind === 'correct'
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const { column } = useDrillColumn()
  const title = useMemo(
    () => titleOverride ?? (kind === 'correct' ? PRAISE[Math.floor(Math.random() * PRAISE.length)] : SHEET_TITLE[kind]),
    [kind, titleOverride],
  )
  const Icon = kind === 'correct' ? Check : kind === 'incorrect' ? X : HelpCircle

  const rise = useRef(new Animated.Value(0)).current
  const pop = useRef(new Animated.Value(0)).current
  /** The clouds: 0 at rest, 1 puffed up, 2 gone. */
  const puff = useRef(new Animated.Value(0)).current
  const [reduceMotion, setReduceMotion] = useState(false)
  const [confettiDone, setConfettiDone] = useState(false)

  useEffect(() => {
    let live = true
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (live) setReduceMotion(on)
      })
      .catch(() => {})
    const native = Platform.OS !== 'web'
    const anim = Animated.parallel([
      Animated.timing(rise, {
        toValue: 1,
        duration: SHEET.riseMs,
        easing: Easing.out(Easing.back(1.15)),
        useNativeDriver: native,
      }),
      Animated.sequence([
        Animated.delay(SHEET.popDelayMs),
        Animated.spring(pop, { toValue: 1, damping: 9, stiffness: 200, mass: 0.8, useNativeDriver: native }),
      ]),
      Animated.sequence([
        Animated.delay(SHEET.puffAtMs),
        Animated.timing(puff, { toValue: 1, duration: SHEET.puffMs, easing: Easing.out(Easing.quad), useNativeDriver: native }),
        Animated.delay(SHEET.puffHoldMs),
        Animated.timing(puff, { toValue: 2, duration: SHEET.vanishMs, easing: Easing.in(Easing.cubic), useNativeDriver: native }),
      ]),
    ])
    anim.start()
    const confettiGone = setTimeout(() => setConfettiDone(true), SHEET.confettiDelayMs + CONFETTI_MS + 60)
    const backstop = setTimeout(() => {
      rise.setValue(1)
      pop.setValue(1)
      puff.setValue(2)
    }, SHEET.backstopMs)
    return () => {
      live = false
      anim.stop()
      clearTimeout(confettiGone)
      clearTimeout(backstop)
    }
  }, [rise, pop, puff])

  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [SHEET_HIDDEN_Y, 0] })
  const discScale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] })
  const titleShift = pop.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] })
  const titleOpacity = pop.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] })
  /* Scaled from the clouds' foot rather than their middle: RN scales about the
     centre, so the shift keeps the base on the panel while the tops puff up
     and then sink into it. */
  const cloudScaleY = puff.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 1.24, 0.02] })
  const cloudStyle = {
    opacity: puff.interpolate({ inputRange: [0, 1, 1.5, 2], outputRange: [1, 1, 0.55, 0] }),
    transform: [
      { translateY: puff.interpolate({ inputRange: [0, 1, 2], outputRange: [0, -0.12 * CLOUD_H, 0.49 * CLOUD_H] }) },
      { scaleX: puff.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 1.05, 0.94] }) },
      { scaleY: cloudScaleY },
    ],
  }

  return (
    <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, transform: [{ translateY }] }}>
      {celebrate && !reduceMotion && !confettiDone && (
        <Confetti width={width} colors={tone.confetti} delayMs={SHEET.confettiDelayMs} />
      )}

      {celebrate ? (
        <Animated.View pointerEvents="none" style={cloudStyle}>
          <CloudEdge width={width} fill={tone.fill} line={tone.cloudLine} />
        </Animated.View>
      ) : null}
      <View
        style={{
          backgroundColor: tone.fill,
          alignItems: 'center',
          paddingBottom: insets.bottom + 16,
          ...(celebrate ? { marginTop: -1 } : { paddingTop: 14, borderTopWidth: 2, borderTopColor: tone.cloudLine }),
        }}
      >
        {/* Under the clouds the judgement needs more room than under a flat edge, or it crowds the humps. */}
        <View style={{ width: column, paddingHorizontal: DRILL_PAD, paddingTop: celebrate ? 14 : 4 }}>
          <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Animated.View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: tone.accent,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ scale: discScale }],
              }}
            >
              <Icon size={21} color="#FFFFFF" strokeWidth={3.2} />
            </Animated.View>
            <Animated.Text
              style={{
                fontFamily: 'NunitoBlack',
                fontSize: 25,
                lineHeight: 31,
                color: tone.text,
                includeFontPadding: false,
                opacity: titleOpacity,
                transform: [{ translateX: titleShift }],
              }}
            >
              {title}
            </Animated.Text>
          </View>

          {detail ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, marginTop: 8, marginLeft: 50 }}>
              {detail}
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            {secondary ? (
              <PressableScale onPress={secondary.onPress} scaleTo={1} haptic={false} wrapperStyle={{ flex: 1 }} accessibilityLabel={secondary.label}>
                <LiftedFace height={drillSize.button} fill={c.card} shoulder={tone.cloudLine} border={tone.cloudLine} shadow={false}>
                  <Text style={{ fontFamily: 'NunitoExtraBold', ...t.button, color: tone.text }}>{secondary.label}</Text>
                </LiftedFace>
              </PressableScale>
            ) : null}
            <PressableScale onPress={onContinue} scaleTo={1} haptic={false} wrapperStyle={{ flex: 1 }} accessibilityLabel={continueLabel}>
              <LiftedFace height={drillSize.button} fill={tone.button} shoulder={tone.shoulder}>
                <Text style={{ fontFamily: 'NunitoExtraBold', ...t.button, letterSpacing: 0.6, color: '#FFFFFF' }}>{continueLabel}</Text>
              </LiftedFace>
            </PressableScale>
          </View>
        </View>
      </View>
    </Animated.View>
  )
}

/**
 * The sheet's top edge: overlapping humps filled in the sheet's colour, then
 * each hump's outline drawn over all the fills, so the lines cross where the
 * clouds overlap — as the reference draws them.
 */
function CloudEdge({ width, fill, line }: { width: number; fill: string; line: string }) {
  const humps = CLOUD_HUMPS.map(([a, b, h]) => {
    const x1 = a * width
    const x2 = b * width
    const k = (x2 - x1) * 0.12
    const peak = CLOUD_H - h * 1.33
    return `M ${x1} ${CLOUD_H} C ${x1 + k} ${peak}, ${x2 - k} ${peak}, ${x2} ${CLOUD_H}`
  })
  return (
    <Svg width={width} height={CLOUD_H}>
      {humps.map((d, i) => (
        <Path key={`f${i}`} d={`${d} Z`} fill={fill} />
      ))}
      {humps.map((d, i) => (
        <Path key={`l${i}`} d={d} fill="none" stroke={line} strokeWidth={3} strokeLinecap="round" />
      ))}
      {/* The hairline where the clouds meet the sheet, out to both edges. */}
      <Path d={`M 0 ${CLOUD_H - 1} H ${width}`} stroke={line} strokeWidth={2} />
    </Svg>
  )
}

/**
 * A burst of little rounded squares thrown up off the cloud's edge, tumbling
 * and fading as they fall back. One timing value drives every piece; each
 * piece's path is fixed when the burst mounts.
 */
function Confetti({ width, colors, delayMs }: { width: number; colors: readonly string[]; delayMs: number }) {
  const burst = useRef(new Animated.Value(0)).current
  const pieces = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, (_, i) => {
        const r = (lo: number, hi: number) => lo + Math.random() * (hi - lo)
        const rise = r(70, 170)
        return {
          x: width * r(0.08, 0.92),
          dx: r(-46, 46),
          rise,
          land: -rise * 0.45 + r(10, 70),
          spin: r(160, 520) * (Math.random() < 0.5 ? -1 : 1),
          size: r(8, 14),
          color: colors[i % colors.length],
        }
      }),
    [width, colors],
  )

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delayMs),
      Animated.timing(burst, {
        toValue: 1,
        duration: CONFETTI_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ])
    anim.start()
    const backstop = setTimeout(() => burst.setValue(1), delayMs + CONFETTI_MS + 300)
    return () => {
      anim.stop()
      clearTimeout(backstop)
    }
  }, [burst, delayMs])

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: CLOUD_H * 0.6, height: 0, zIndex: 2, elevation: 2 }}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: 0,
            width: p.size,
            height: p.size,
            borderRadius: p.size * 0.28,
            backgroundColor: p.color,
            opacity: burst.interpolate({ inputRange: [0, 0.06, 0.7, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
              { translateY: burst.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, -p.rise, p.land] }) },
              { rotate: burst.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  )
}
