import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react'
import { AccessibilityInfo, Animated, Easing, Platform, View, findNodeHandle, type StyleProp, type ViewStyle } from 'react-native'
import { useReduceMotion } from '../tour/useReduceMotion'

/*
 * The motion every question screen shares: how one question makes way for the
 * next, and how a picked answer reacts once it's checked.
 *
 * RN `Animated` on the native driver (Reanimated doesn't drive on web), and
 * every animation has a timer backstop that forces its end state, because a
 * hidden browser tab stops requestAnimationFrame (see CLAUDE.md, Animation).
 * Reduced motion skips all of it: the end state, at once.
 *
 * Animation follows the learning logic, never the other way round. A screen
 * decides to move on, grades, re-queues, then hands the state change to
 * `advance` as `commit`. The transition only decides when that change lands.
 */

const NATIVE = Platform.OS !== 'web'

/**
 * Question to question: the old one drifts a little left and fades, the new
 * one rises a little and fades in. Only the question moves; headers, progress
 * bars, footers and scenery stay put.
 */
export const QUESTION_MOTION = {
  outMs: 140,
  outX: 14,
  inMs: 210,
  inY: 10,
  /** Grace before a stalled leg is forced to its end. */
  backstopMs: 120,
  /** How long `advance` waits for the next question to mount before bringing it in anyway. */
  mountWaitMs: 250,
  outEasing: Easing.bezier(0.45, 0, 0.55, 1),
  inEasing: Easing.bezier(0.16, 1, 0.3, 1),
} as const

/**
 * The picked answer once checked.
 *
 * Right: it gives a little (0.98), springs just past full size (1.025) and
 * settles — about 200ms, a controlled spring rather than a bounce. Its
 * highlight sweep and sparks (`answerFeedback.tsx`) overlap the settle.
 *
 * Wrong: a damped horizontal "nope", each swing smaller than the last
 * (−6 → +5 → −4 → +2 → 0, about 210ms), ending exactly at rest.
 */
export const ANSWER_MOTION = {
  pressTo: 0.98,
  pressMs: 60,
  popTo: 1.025,
  popMs: 80,
  shake: [-6, 5, -4, 2, 0],
  shakeMs: [35, 45, 45, 40, 45],
  /** The highlight sweep starts as the spring turns and crosses in this long. */
  shimmerDelayMs: 80,
  shimmerMs: 240,
  /** The sparks lift off as the sheet arrives, a beat apart, and are gone by ~450ms. */
  sparkDelayMs: 140,
  sparkStaggerMs: 22,
  sparkMs: 260,
  backstopMs: 450,
} as const

/**
 * The answer sheet: after a short beat (so the picked answer reacts first),
 * rises a short way and fades in, with no overshoot — on screen by ~300ms.
 */
export const SHEET_MOTION = { delayMs: 70, riseMs: 230, riseFrom: 24, exitDrop: 16, backstopMs: 470 } as const

// --- Question transitions ------------------------------------------------------

type QuestionMotion = {
  /** -1 gone (left, faded), 0 at rest, 1 waiting to come in (below, faded). */
  value: Animated.Value
  /** Brings the next question in, if one is waiting. Called when it mounts. */
  arrive: () => void
}

const QuestionMotionContext = createContext<QuestionMotion | null>(null)

/**
 * Runs question changes. `advance(commit)` plays the current question out,
 * runs `commit` (which should put the next question on screen), then plays it
 * in once it has mounted.
 *
 * - `busy` is true from the start of an advance until its commit. The old
 *   question is still on screen and pressable while it leaves, so handlers
 *   should check it; `advance` also ignores a second call while busy.
 * - A commit never runs after the screen has unmounted.
 * - The arrival waits for the next question's `QuestionContent` to mount, so
 *   the native driver can't fade the old question back in while React is
 *   still rendering the new one. A backstop brings it in regardless.
 */
export function useQuestionTransition() {
  const value = useRef(new Animated.Value(0)).current
  const reduce = useReduceMotion()
  const reduceRef = useRef(reduce)
  reduceRef.current = reduce
  const busy = useRef(false)
  const pending = useRef(false)
  const alive = useRef(true)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      timers.current.forEach(clearTimeout)
      value.stopAnimation()
    }
  }, [value])

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }

  const arrive = useCallback(() => {
    if (!pending.current) return
    pending.current = false
    let landed = false
    const land = () => {
      if (landed) return
      landed = true
      value.setValue(0)
    }
    Animated.timing(value, {
      toValue: 0,
      duration: QUESTION_MOTION.inMs,
      easing: QUESTION_MOTION.inEasing,
      useNativeDriver: NATIVE,
    }).start(land)
    later(land, QUESTION_MOTION.inMs + QUESTION_MOTION.backstopMs)
  }, [value])

  const advance = useCallback(
    (commit: () => void) => {
      if (busy.current) return
      busy.current = true
      if (reduceRef.current) {
        value.setValue(0)
        busy.current = false
        commit()
        return
      }
      let committed = false
      const settle = () => {
        if (committed || !alive.current) return
        committed = true
        busy.current = false
        // Parked out of sight before the swap, so the new question's first frame is invisible.
        value.setValue(1)
        pending.current = true
        commit()
        later(arrive, QUESTION_MOTION.mountWaitMs)
      }
      Animated.timing(value, {
        toValue: -1,
        duration: QUESTION_MOTION.outMs,
        easing: QUESTION_MOTION.outEasing,
        useNativeDriver: NATIVE,
      }).start(settle)
      later(settle, QUESTION_MOTION.outMs + QUESTION_MOTION.backstopMs)
    },
    [value, arrive],
  )

  const motion = useMemo<QuestionMotion>(() => ({ value, arrive }), [value, arrive])
  return { advance, busy, motion }
}

export function QuestionMotionProvider({ motion, children }: { motion: QuestionMotion; children: ReactNode }) {
  return <QuestionMotionContext.Provider value={motion}>{children}</QuestionMotionContext.Provider>
}

/**
 * The part of a question screen that moves between questions. Mount it with a
 * `key` per question (or inside something keyed), so a new question mounts it
 * afresh and its arrival can start.
 *
 * Two ways to fade:
 * - **fade** (default): the content's own opacity, drawn as one layer on
 *   Android (`needsOffscreenAlphaCompositing`) so card shadows fade with their
 *   cards. That flag costs nothing at full opacity, so it stays on.
 * - **veil**: a view in the page colour fades over the content while the
 *   content only moves. For screens holding a WebView (the stroke writer),
 *   which Android doesn't fade with its parent. `inset` pushes the veil past
 *   the column's padding so the cards' shadows are covered too.
 *
 * Outside a provider it is a plain view.
 */
export function QuestionContent({
  style,
  veil,
  children,
}: {
  style?: StyleProp<ViewStyle>
  veil?: { color: string; inset?: { top?: number; bottom?: number; side?: number } }
  children: ReactNode
}) {
  const motion = useContext(QuestionMotionContext)

  useEffect(() => {
    motion?.arrive()
  }, [motion])

  if (!motion) return <View style={style}>{children}</View>
  const { value } = motion
  const transform = [
    { translateX: value.interpolate({ inputRange: [-1, 0, 1], outputRange: [-QUESTION_MOTION.outX, 0, 0] }) },
    { translateY: value.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 0, QUESTION_MOTION.inY] }) },
  ]

  if (veil) {
    const inset = veil.inset ?? {}
    return (
      <View style={style}>
        <Animated.View style={{ flexGrow: 1, transform }}>{children}</Animated.View>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -(inset.top ?? 0),
            bottom: -(inset.bottom ?? 0),
            left: -(inset.side ?? 0),
            right: -(inset.side ?? 0),
            backgroundColor: veil.color,
            opacity: value.interpolate({ inputRange: [-1, 0, 1], outputRange: [1, 0, 1] }),
            // Above everything in the content, the reveal's own veil included; on Android elevation decides that.
            zIndex: 60,
            elevation: 60,
          }}
        />
      </View>
    )
  }

  return (
    <Animated.View
      needsOffscreenAlphaCompositing
      style={[style, { opacity: value.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }), transform }]}
    >
      {children}
    </Animated.View>
  )
}

/**
 * For an answer sheet: leaves with the question (fades and drops a little).
 * Null outside a provider. It never shows on the arriving side, since the
 * sheet belongs to the question that's leaving.
 */
export function useQuestionExitStyle() {
  const motion = useContext(QuestionMotionContext)
  if (!motion) return null
  return {
    opacity: motion.value.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }),
    transform: [
      { translateY: motion.value.interpolate({ inputRange: [-1, 0, 1], outputRange: [SHEET_MOTION.exitDrop, 0, 0] }) },
    ],
  }
}

// --- The picked answer ------------------------------------------------------------

export type AnswerReaction = 'pop' | 'shake' | null

/**
 * A checked answer's reaction, played when `reaction` turns from null to
 * 'pop' (right) or 'shake' (wrong). Returns a transform for the option's
 * wrapper. Only the option the learner picked should react: the right answer
 * revealed after a miss just changes colour.
 */
export function useAnswerReaction(reaction: AnswerReaction) {
  const scale = useRef(new Animated.Value(1)).current
  const shift = useRef(new Animated.Value(0)).current
  const reduce = useReduceMotion()

  useEffect(() => {
    if (!reaction || reduce) return
    const timing = (v: Animated.Value, toValue: number, duration: number, easing = Easing.out(Easing.quad)) =>
      Animated.timing(v, { toValue, duration, easing, useNativeDriver: NATIVE })
    const anim =
      reaction === 'pop'
        ? Animated.sequence([
            timing(scale, ANSWER_MOTION.pressTo, ANSWER_MOTION.pressMs),
            timing(scale, ANSWER_MOTION.popTo, ANSWER_MOTION.popMs, Easing.out(Easing.cubic)),
            Animated.spring(scale, { toValue: 1, damping: 16, stiffness: 320, mass: 0.6, useNativeDriver: NATIVE }),
          ])
        : Animated.sequence(
            ANSWER_MOTION.shake.map((x, i) => timing(shift, x, ANSWER_MOTION.shakeMs[i], Easing.inOut(Easing.sin))),
          )
    anim.start()
    const backstop = setTimeout(() => {
      scale.setValue(1)
      shift.setValue(0)
    }, ANSWER_MOTION.backstopMs)
    return () => {
      anim.stop()
      clearTimeout(backstop)
      scale.setValue(1)
      shift.setValue(0)
    }
  }, [reaction, reduce, scale, shift])

  return { transform: [{ translateX: shift }, { scale }] }
}

// --- Screen readers ---------------------------------------------------------------

/**
 * Moves a screen reader's focus to `ref` when it mounts, so a new question is
 * what gets read next rather than wherever focus was left. Native only: web
 * screen readers follow the DOM, and `findNodeHandle` isn't supported there.
 */
export function useAccessibilityFocusOnMount(ref: RefObject<unknown>) {
  useEffect(() => {
    if (Platform.OS === 'web') return
    let live = true
    AccessibilityInfo.isScreenReaderEnabled()
      .then((on) => {
        if (!live || !on || !ref.current) return
        // findNodeHandle's types predate refs to host components.
        const node = findNodeHandle(ref.current as Parameters<typeof findNodeHandle>[0])
        if (node) AccessibilityInfo.setAccessibilityFocus(node)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [ref])
}

/** `useAnswerReaction` as a wrapper, for options drawn in a loop where a hook can't be called. */
export function AnswerReactionView({ reaction, style, children }: { reaction: AnswerReaction; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const motion = useAnswerReaction(reaction)
  return <Animated.View style={[style, motion]}>{children}</Animated.View>
}
