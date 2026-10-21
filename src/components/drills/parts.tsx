import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { View, Text, Pressable, ScrollView, Image, Animated, Easing, Platform, AccessibilityInfo, useWindowDimensions } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Check, ChevronLeft, HeadphoneOff, HelpCircle, Timer, X } from 'lucide-react-native'
import { PressableScale, LiftedFace } from '../dashboard/parts'
import { RaisedProgressBar } from '../progress/RaisedProgressBar'
import { useSessionProgressStart } from '../progress/sessionProgress'
import { onbVerdict, type VerdictKind } from '../onboarding/tokens'
import { listenArt } from '../listening/art'
import { QuestionContent, SHEET_MOTION, useAccessibilityFocusOnMount, useQuestionExitStyle } from '../motion/questionMotion'
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
  const branch = column * 0.4
  /* Each question mounts its own shell, so a screen reader starts on its title. */
  const titleRef = useRef<Text>(null)
  useAccessibilityFocusOnMount(titleRef)

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
            <View pointerEvents="none" style={{ position: 'absolute', top: 30, right: -18 }}>
              {/* The render grows from a trunk at its bottom left; mirrored, the
                  trunk comes in off the right edge. */}
              <Image
                source={sakura}
                style={{ width: branch, height: branch / DRILL_SAKURA_RATIO, transform: [{ scaleX: -1 }], opacity: 0.92 }}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Header, as Duolingo lays it out: the back arrow and the session's
              progress across the top, and what kind of question this is
              beneath it. */}
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: DRILL_PAD - 6, paddingRight: DRILL_PAD, paddingTop: 8, height: 52, zIndex: 1 }}
          >
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close drills" hitSlop={10} style={{ padding: 4 }}>
              <ChevronLeft size={30} color={c.greenDark} strokeWidth={2.4} />
            </Pressable>
            <DrillProgress step={step} total={total} solved={answer?.kind === 'correct'} />
          </View>

          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: DRILL_PAD, marginTop: 6, minHeight: 36 }}
          >
            <Text ref={titleRef} accessibilityRole="header" style={{ flex: 1, fontFamily: 'LoraBold', ...t.title, color: c.ink }}>
              {title}
            </Text>
            {headerRight}
          </View>
          {secondsLeft != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 6 }}>
              <Timer size={13} color={secondsLeft <= 30 ? onbVerdict.incorrect.text : c.slate} />
              <Text style={{ fontFamily: 'NunitoBold', fontSize: 12.5, color: secondsLeft <= 30 ? onbVerdict.incorrect.text : c.slate }}>
                {formatClock(secondsLeft)}
              </Text>
            </View>
          )}

          {/* Only the question moves between questions: header, progress,
              buttons and scenery stay put (see `QuestionContent`). */}
          <QuestionContent style={scroll ? { flexGrow: 1 } : { flex: 1, minHeight: 0 }}>{children}</QuestionContent>

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

/** Lets the new question finish sliding in before its bar moves, so the eye can follow it. */
const PROGRESS_DELAY_MS = 160

/**
 * The session's progress, counted in questions finished rather than the
 * question on screen: the first question opens on an empty bar, and the bar
 * steps forward the moment an answer comes back right (`solved`). A miss or
 * "I don't know" is asked again later, so it doesn't count until then.
 *
 * Each question mounts it afresh, starting where the last question left it;
 * when that question was already counted on its answer, the next one opens
 * where it stands and stays put.
 */
function DrillProgress({ step, total, solved }: { step: number; total: number; solved: boolean }) {
  const safeTotal = Math.max(1, total)
  const completed = Math.min(total, step - 1 + (solved ? 1 : 0))
  const from = useSessionProgressStart(completed, total)
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <RaisedProgressBar
        progress={completed / safeTotal}
        initialProgress={from / safeTotal}
        delayMs={PROGRESS_DELAY_MS}
        accessibilityLabel={`${completed} of ${total} completed`}
      />
      <Text style={{ fontFamily: 'NunitoSemiBold', ...t.counter, color: c.slate }} importantForAccessibility="no" accessibilityElementsHidden>
        {completed} / {total}
      </Text>
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
  /** Overrides the judgement ("Correct!", "Not quite", "No problem"). */
  title?: string
  /** The word, its reading and meaning — whatever the drill wants said about the answer. */
  detail?: ReactNode
  /** A small label over `detail`, such as "Correct answer" after a miss. */
  detailLabel?: string
  onContinue: () => void
  /** The primary button's label. */
  continueLabel?: string
  /** A second, quieter button beside it — New Words' "Write it again". */
  secondary?: { label: string; onPress: () => void }
}

/** The judgement, the same every time: praise that changes per question stops meaning anything. */
const SHEET_TITLE: Record<VerdictKind, string> = {
  correct: 'Correct!',
  incorrect: 'Not quite',
  unsure: 'No problem',
}
/** How tall the sheet's cloud edge stands above its body. */
const SHEET_EDGE = 12

/*
 * The sheet's upper edge: a run of low, uneven cloud bumps rather than a ruled
 * line — closer to a brush wash's edge than to Duolingo's scallops. Widths and
 * heights cycle through these so no two neighbours match.
 */
const BUMP_WIDTHS = [62, 46, 74, 54, 80, 50, 68]
const BUMP_HEIGHTS = [6, 4, 7.5, 5, 8, 4.5, 6.5]

function cloudEdgePath(width: number): { fill: string; line: string } {
  const base = SHEET_EDGE
  let x = 0
  let i = 0
  let curve = ''
  while (x < width) {
    const w = BUMP_WIDTHS[i % BUMP_WIDTHS.length]
    const h = BUMP_HEIGHTS[i % BUMP_HEIGHTS.length] * 1.33
    const x1 = x + w
    curve += ` C ${x + w * 0.12} ${base - h}, ${x1 - w * 0.12} ${base - h}, ${x1} ${base}`
    x = x1
    i++
  }
  const line = `M 0 ${base}${curve}`
  return { line, fill: `${line} L ${x} ${base + 1} L 0 ${base + 1} Z` }
}

/** The cloud edge, drawn over the sheet's top so the bumps rise out of it. */
function SheetEdge({ fill, line }: { fill: string; line: string }) {
  const { width } = useWindowDimensions()
  const path = cloudEdgePath(width)
  return (
    <Svg pointerEvents="none" width={width} height={SHEET_EDGE + 1} style={{ position: 'absolute', top: -SHEET_EDGE, left: 0 }}>
      <Path d={path.fill} fill={fill} />
      <Path d={path.line} fill="none" stroke={line} strokeWidth={1.5} />
    </Svg>
  )
}

/**
 * The checked answer: a panel in the verdict's colour rising from the bottom
 * of the screen, its top a soft cloud edge, with the judgement and its icon,
 * the drill's detail, and Continue.
 *
 * A correct answer gets the celebrating sheet (`CorrectSheet`: bounce, puffing
 * clouds, confetti). A wrong answer or "I don't know" gets the calm one: a
 * short rise with no overshoot and no confetti.
 *
 * The calm sheet rises 24px as it fades in, a beat after the answer reacts, and inside a question transition it leaves
 * with its question (`useQuestionExitStyle`). Native driver throughout; the
 * backstop forces it fully on screen, since on web a hidden tab would
 * otherwise leave Continue out of reach and strand the session (see
 * CLAUDE.md, Animation).
 */
export function AnswerSheet(spec: AnswerSheetSpec) {
  return spec.kind === 'correct' ? <CorrectSheet {...spec} /> : <CalmSheet {...spec} />
}

/** A wrong answer or an "I don't know": the calm panel described above. */
function CalmSheet({ kind, title: titleOverride, detail, detailLabel, onContinue, continueLabel = 'Continue', secondary }: AnswerSheetSpec) {
  const tone = drillSheet[kind]
  const insets = useSafeAreaInsets()
  const { column } = useDrillColumn()
  const title = titleOverride ?? SHEET_TITLE[kind]
  const Icon = kind === 'correct' ? Check : kind === 'incorrect' ? X : HelpCircle
  const exit = useQuestionExitStyle()

  const rise = useRef(new Animated.Value(0)).current
  useEffect(() => {
    let live = true
    const anim = Animated.timing(rise, {
      toValue: 1,
      duration: SHEET_MOTION.riseMs,
      delay: SHEET_MOTION.delayMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    })
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (!live) return
        if (on) rise.setValue(1)
        else anim.start()
      })
      .catch(() => anim.start())
    const backstop = setTimeout(() => rise.setValue(1), SHEET_MOTION.backstopMs)
    return () => {
      live = false
      anim.stop()
      clearTimeout(backstop)
    }
  }, [rise])

  const style = {
    opacity: rise,
    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [SHEET_MOTION.riseFrom, 0] }) }],
  }
  /* The icon grows in with the sheet, from nearly full size: a settle, not a pop. */
  const iconScale = rise.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] })

  return (
    <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', left: 0, right: 0, bottom: 0 }, exit]}>
      <Animated.View
        style={[
          {
            backgroundColor: tone.fill,
            alignItems: 'center',
            paddingTop: 12,
            paddingBottom: insets.bottom + 16,
          },
          style,
        ]}
      >
        <SheetEdge fill={tone.fill} line={tone.line} />
        <View style={{ width: column, paddingHorizontal: DRILL_PAD }}>
          <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Animated.View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: tone.accent,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ scale: iconScale }],
              }}
            >
              <Icon size={17} color="#FFFFFF" strokeWidth={3.2} />
            </Animated.View>
            <Text style={{ fontFamily: 'NunitoExtraBold', fontSize: 21, lineHeight: 27, color: tone.text, includeFontPadding: false }}>
              {title}
            </Text>
          </View>

          {detail ? (
            <View style={{ marginTop: 8, marginLeft: 40 }}>
              {detailLabel ? (
                <Text style={{ fontFamily: 'NunitoBold', fontSize: 13, lineHeight: 17, color: tone.text, marginBottom: 2 }}>{detailLabel}</Text>
              ) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8 }}>{detail}</View>
            </View>
          ) : null}

          <SheetActions kind={kind} onContinue={onContinue} continueLabel={continueLabel} secondary={secondary} />
        </View>
      </Animated.View>
    </Animated.View>
  )
}

/** The sheet's buttons: Continue in the verdict's colour, and the drill's secondary action beside it if it has one. */
function SheetActions({
  kind,
  onContinue,
  continueLabel,
  secondary,
}: Pick<AnswerSheetSpec, 'kind' | 'onContinue' | 'secondary'> & { continueLabel: string }) {
  const tone = drillSheet[kind]
  return (
    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
      {secondary ? (
        <PressableScale onPress={secondary.onPress} scaleTo={1} haptic={false} wrapperStyle={{ flex: 1 }} accessibilityLabel={secondary.label}>
          <LiftedFace height={drillSize.button} fill={c.card} shoulder={tone.line} border={tone.line} shadow={false}>
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
  )
}

// --- The correct answer's sheet ---------------------------------------------------

/** Said on a correct answer, one per question, picked when the sheet mounts. */
const PRAISE = ['Amazing!', 'Great job!', 'Nice!', 'Excellent!', 'You got it!', 'Perfect!', 'Well done!']
/** The cloud edge: its height, and each hump as [start, end] across the width and a peak height. */
const CLOUD_H = 40
const CLOUD_HUMPS: [number, number, number][] = [
  [0.1, 0.38, 24],
  [0.31, 0.66, 36],
  [0.55, 0.88, 28],
]
/** Far enough below the screen's edge to hide the sheet before it rises. */
const SHEET_HIDDEN_Y = 460
/**
 * The correct sheet's score, in ms. It rises unhurried, with a little
 * overshoot to settle on; the judgement pops in as it lands; then the clouds
 * puff up once and blow away, leaving a plain green panel, and the confetti is
 * gone with them.
 */
const CORRECT_SHEET = {
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
 * A correct answer's sheet (SS1012 Correct UI, restored by request): a
 * cloud-edged green sheet rising with a little bounce, the judgement and its
 * disc popping in as it lands, the clouds puffing up and blowing away, and a
 * handful of confetti thrown up off the cloud's edge. Wrong answers and
 * "I don't know" keep the calm panel (`CalmSheet`).
 *
 * Native driver throughout; each value carries a backstop that force-sets its
 * end (see CLAUDE.md, Animation) — on web a hidden tab would otherwise leave the
 * sheet parked off screen with Continue unreachable, stranding the session.
 */
function CorrectSheet({ kind, title: titleOverride, detail, detailLabel, onContinue, continueLabel = 'Continue', secondary }: AnswerSheetSpec) {
  const tone = drillSheet.correct
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const { column } = useDrillColumn()
  const exit = useQuestionExitStyle()
  const title = useMemo(() => titleOverride ?? PRAISE[Math.floor(Math.random() * PRAISE.length)], [titleOverride])

  const rise = useRef(new Animated.Value(0)).current
  const pop = useRef(new Animated.Value(0)).current
  /** The clouds: 0 at rest, 1 puffed up, 2 gone. */
  const puff = useRef(new Animated.Value(0)).current
  const [reduceMotion, setReduceMotion] = useState(false)
  const [confettiDone, setConfettiDone] = useState(false)

  useEffect(() => {
    let live = true
    const native = Platform.OS !== 'web'
    const anim = Animated.parallel([
      Animated.timing(rise, { toValue: 1, duration: CORRECT_SHEET.riseMs, easing: Easing.out(Easing.back(1.15)), useNativeDriver: native }),
      Animated.sequence([
        Animated.delay(CORRECT_SHEET.popDelayMs),
        Animated.spring(pop, { toValue: 1, damping: 9, stiffness: 200, mass: 0.8, useNativeDriver: native }),
      ]),
      Animated.sequence([
        Animated.delay(CORRECT_SHEET.puffAtMs),
        Animated.timing(puff, { toValue: 1, duration: CORRECT_SHEET.puffMs, easing: Easing.out(Easing.quad), useNativeDriver: native }),
        Animated.delay(CORRECT_SHEET.puffHoldMs),
        Animated.timing(puff, { toValue: 2, duration: CORRECT_SHEET.vanishMs, easing: Easing.in(Easing.cubic), useNativeDriver: native }),
      ]),
    ])
    const settle = () => {
      rise.setValue(1)
      pop.setValue(1)
      puff.setValue(2)
    }
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (!live) return
        setReduceMotion(on)
        if (on) settle()
        else anim.start()
      })
      .catch(() => anim.start())
    const confettiGone = setTimeout(() => setConfettiDone(true), CORRECT_SHEET.confettiDelayMs + CONFETTI_MS + 60)
    const backstop = setTimeout(settle, CORRECT_SHEET.backstopMs)
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
  const cloudStyle = {
    opacity: puff.interpolate({ inputRange: [0, 1, 1.5, 2], outputRange: [1, 1, 0.55, 0] }),
    transform: [
      { translateY: puff.interpolate({ inputRange: [0, 1, 2], outputRange: [0, -0.12 * CLOUD_H, 0.49 * CLOUD_H] }) },
      { scaleX: puff.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 1.05, 0.94] }) },
      { scaleY: puff.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 1.24, 0.02] }) },
    ],
  }

  return (
    <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', left: 0, right: 0, bottom: 0 }, exit]}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        {!reduceMotion && !confettiDone && <Confetti width={width} colors={tone.confetti} delayMs={CORRECT_SHEET.confettiDelayMs} />}

        <Animated.View pointerEvents="none" style={cloudStyle}>
          <CloudEdge width={width} fill={tone.fill} line={tone.line} />
        </Animated.View>
        <View style={{ backgroundColor: tone.fill, alignItems: 'center', paddingBottom: insets.bottom + 16, marginTop: -1 }}>
          {/* Under the clouds the judgement needs more room than under a flat edge, or it crowds the humps. */}
          <View style={{ width: column, paddingHorizontal: DRILL_PAD, paddingTop: 14 }}>
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
                <Check size={21} color="#FFFFFF" strokeWidth={3.2} />
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
              <View style={{ marginTop: 8, marginLeft: 50 }}>
                {detailLabel ? (
                  <Text style={{ fontFamily: 'NunitoBold', fontSize: 13, lineHeight: 17, color: tone.text, marginBottom: 2 }}>{detailLabel}</Text>
                ) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8 }}>{detail}</View>
              </View>
            ) : null}

            <SheetActions kind={kind} onContinue={onContinue} continueLabel={continueLabel} secondary={secondary} />
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  )
}

/**
 * The correct sheet's top edge: overlapping humps filled in the sheet's colour,
 * then each hump's outline drawn over all the fills, so the lines cross where
 * the clouds overlap — as the reference draws them.
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
      Animated.timing(burst, { toValue: 1, duration: CONFETTI_MS, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
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

/** The label over an answer sheet's word: what the learner is looking at, when it isn't simply their own right answer. */
export function verdictDetailLabel(kind: VerdictKind): string | undefined {
  return kind === 'incorrect' ? 'Correct answer' : kind === 'unsure' ? 'The answer' : undefined
}
