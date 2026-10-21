/*
 * The learning loader: Shifu writing calligraphy over a learning activity
 * while it prepares, for at least two seconds and for as long as it takes.
 *
 *   <LearningLoader message="Gathering your flashcards…" onBack={…}>
 *     <Activity />            // calls useLearningLoader().ready() / .fail(e)
 *   </LearningLoader>
 *
 * The rules:
 *   - It closes only when the activity says it is ready (its own signal — data
 *     and assets in, first layout done) *and* `minDurationMs` has passed.
 *   - If that lands while the brush is mid-stroke and the stroke is about to
 *     end, it lets the stroke finish (at most `strokeGraceMs`); otherwise it
 *     goes at once. Never another whole loop.
 *   - It fades off over `exitMs`, revealing an activity that is already laid out.
 *   - A failure, or no answer within `timeoutMs`, turns it into a gentle error
 *     with Retry (a fresh mount of the activity) and Back.
 *   - Every attempt is numbered; a late answer from an abandoned attempt is
 *     ignored, and nothing updates after unmount.
 *
 * The activity mounts only after the screen transition has settled and the
 * loader has painted, so its preparation (which may block the JS thread)
 * never holds up the loader's first frame. The motion itself is a hardware-
 * decoded video, so it keeps playing smoothly through that work.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Animated, Easing, InteractionManager, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useReduceMotion } from '../tour/useReduceMotion'
import { ShifuWritingLoop, type ShifuLoopHandle } from './ShifuWritingLoop'
import { SHIFU_LOOP } from './loop'
import { loadColors as C, loadTiming as T, loadType } from './tokens'

const useNativeDriver = Platform.OS !== 'web'

/**
 * Runs `fn` after the next `frames` frames have painted — or after a short
 * timer, whichever comes first, because a hidden browser tab never paints
 * and would otherwise wait forever.
 */
export function afterFrames(fn: () => void, frames = 2): () => void {
  let done = false
  const run = () => {
    if (done) return
    done = true
    fn()
  }
  const step = (n: number) => requestAnimationFrame(() => (n <= 1 ? run() : step(n - 1)))
  step(frames)
  const backstop = setTimeout(run, 60 + frames * 40)
  return () => {
    done = true
    clearTimeout(backstop)
  }
}

export type LearningLoaderApi = {
  /** The activity is fully prepared and laid out. */
  ready: () => void
  /** Preparing failed; the loader offers a retry. */
  fail: (error?: unknown) => void
}

const NOOP: LearningLoaderApi = { ready: () => {}, fail: () => {} }
const LoaderContext = createContext<LearningLoaderApi>(NOOP)

/** For the activity inside a loader. Outside one, both calls do nothing. */
export function useLearningLoader(): LearningLoaderApi {
  return useContext(LoaderContext)
}

type Phase = 'loading' | 'leaving' | 'done' | 'error'

type Props = {
  message: string
  children: ReactNode
  /** Where Back goes from the error state. */
  onBack: () => void
  minDurationMs?: number
  timeoutMs?: number
}

export function LearningLoader({ message, children, onBack, minDurationMs = T.minDurationMs, timeoutMs = T.timeoutMs }: Props) {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const reduceMotion = useReduceMotion()
  const loop = useRef<ShifuLoopHandle>(null)

  const [attempt, setAttempt] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')
  const [activityMounted, setActivityMounted] = useState(false)
  const [slow, setSlow] = useState(false)

  const overlay = useRef(new Animated.Value(1)).current
  const enter = useRef(new Animated.Value(0)).current

  const live = useRef(true)
  const current = useRef(0) // the attempt answers are accepted from
  const shownAt = useRef(Date.now())
  const settled = useRef(false) // this attempt already ready/failed
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms))
  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
      clearTimers()
    }
  }, [])

  // Shifu and the message ease in.
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: T.enterMs, easing: Easing.out(Easing.cubic), useNativeDriver, isInteraction: false }).start()
    const t = setTimeout(() => enter.setValue(1), T.enterMs + 300)
    return () => clearTimeout(t)
  }, [enter])

  // Each attempt: restart the clock, mount the activity once things settle.
  useEffect(() => {
    current.current = attempt
    shownAt.current = Date.now()
    settled.current = false
    setSlow(false)
    setActivityMounted(false)
    overlay.setValue(1)
    let cancelled = false
    let started = false
    let cancelFrame = () => {}
    const mount = () => {
      if (started) return
      started = true
      // One more frame, so the loader is on screen before any heavy mount.
      cancelFrame = afterFrames(() => {
        if (!cancelled && live.current && current.current === attempt) setActivityMounted(true)
      }, 1)
    }
    // After the screen transition; but never held hostage by some other
    // long-running "interaction" elsewhere in the app.
    const task = InteractionManager.runAfterInteractions(mount)
    const mountBackstop = setTimeout(mount, 700)
    later(() => current.current === attempt && setSlow(true), T.slowMs)
    later(() => {
      if (current.current === attempt && !settled.current) failFor(attempt)()
    }, timeoutMs)
    return () => {
      cancelled = true
      task.cancel()
      clearTimeout(mountBackstop)
      cancelFrame()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  const leave = useCallback(() => {
    if (!live.current) return
    setPhase('leaving')
    let done = false
    const finish = () => {
      if (done || !live.current) return
      done = true
      setPhase('done')
    }
    Animated.timing(overlay, { toValue: 0, duration: T.exitMs, easing: Easing.out(Easing.quad), useNativeDriver, isInteraction: false }).start(finish)
    later(finish, T.exitMs + 300) // a hidden browser tab never finishes it
  }, [overlay])

  /** Leaves now, or once the brush finishes a stroke that is nearly done. */
  const leaveGracefully = useCallback(() => {
    const p = loop.current?.phase() ?? 0
    const [down, up] = SHIFU_LOOP.brushDown
    const untilLift = (up - p) * SHIFU_LOOP.durationMs
    if (p > down && p < up && untilLift <= T.strokeGraceMs) later(leave, untilLift)
    else leave()
  }, [leave])

  function readyFor(n: number) {
    return () => {
      if (!live.current || current.current !== n || settled.current) return
      settled.current = true
      const wait = Math.max(0, minDurationMs - (Date.now() - shownAt.current))
      later(() => live.current && current.current === n && leaveGracefully(), wait)
    }
  }

  function failFor(n: number) {
    return (error?: unknown) => {
      if (!live.current || current.current !== n || settled.current) return
      settled.current = true
      if (__DEV__ && error) console.warn('[LearningLoader] activity failed to prepare', error)
      setPhase('error')
    }
  }

  // A fresh object per attempt, so a stale activity's calls carry a stale id.
  const api = useMemo<LearningLoaderApi>(() => ({ ready: readyFor(attempt), fail: failFor(attempt) }), [attempt])

  const retry = () => {
    clearTimers()
    setPhase('loading')
    setAttempt((a) => a + 1)
  }

  const showActivity = activityMounted && phase !== 'error'
  const text = phase === 'error' ? 'Shifu couldn’t prepare this session.' : slow ? 'Almost ready to learn!' : message

  return (
    <View style={styles.fill}>
      {showActivity && (
        <LoaderContext.Provider value={api}>
          {/* Page-coloured, so whatever the activity has yet to draw as the loader
              lifts is ivory — never the system's dark-mode black. */}
          <View key={attempt} style={[styles.fill, styles.page]}>
            {children}
          </View>
        </LoaderContext.Provider>
      )}

      {phase !== 'done' && (
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.page, { opacity: overlay }]}
          pointerEvents={phase === 'leaving' ? 'none' : 'auto'}
        >
          {/*
            The painting fills the screen. On the way out it hands over to its
            own still frame: on Android a playing video surface can draw black
            while its parent fades, which showed as a dark void between Shifu
            and the first card.
          */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: enter }]}>
            <ShifuWritingLoop ref={loop} width={width} height={height} still={reduceMotion || phase !== 'loading'} />
          </Animated.View>

          {/* The words sit at the foot, on a fade into the page so they read over the scene. */}
          <LinearGradient
            pointerEvents="none"
            colors={[C.pageClear, C.page, C.page]}
            locations={[0, 0.55, 1]}
            style={[styles.foot, { height: FOOT_FADE + insets.bottom }]}
          />
          <Animated.View
            style={[
              styles.column,
              styles.footColumn,
              { paddingBottom: insets.bottom + 28 },
              { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
            ]}
          >
            <View style={styles.words} accessibilityLiveRegion="polite" accessible accessibilityRole={phase === 'error' ? 'alert' : 'progressbar'} accessibilityLabel={text}>
              <Text style={[loadType.message, styles.message]}>{text}</Text>
              {phase === 'error' ? (
                <Text style={[loadType.detail, styles.detail]}>Check your connection, then try again.</Text>
              ) : (
                <JadeDots still={reduceMotion} />
              )}
            </View>

            {phase === 'error' && (
              <View style={styles.buttons}>
                <LoaderButton label="Try again" primary onPress={retry} />
                <LoaderButton label="Back" onPress={onBack} />
              </View>
            )}
          </Animated.View>
        </Animated.View>
      )}
    </View>
  )
}

/** Three jade dots, breathing in turn. Still (and fainter) with reduced motion. */
function JadeDots({ still }: { still: boolean }) {
  const t = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (still) return
    // Not an "interaction": an endless loop that counted as one would hold
    // InteractionManager — and with it the activity's mount — forever.
    const anim = Animated.loop(Animated.timing(t, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver, isInteraction: false }))
    anim.start()
    return () => anim.stop()
  }, [still, t])
  return (
    <View style={styles.dots} importantForAccessibility="no-hide-descendants">
      {[0, 1, 2].map((k) => {
        // Staggered so the last dot's pulse still ends inside the cycle.
        const o = k * 0.22
        const opacity = still
          ? 0.55
          : t.interpolate({
              inputRange: [0, o, o + 0.18, o + 0.36, 1],
              outputRange: [0.3, 0.3, 1, 0.3, 0.3],
              extrapolate: 'clamp',
            })
        return <Animated.View key={k} style={[styles.dot, { opacity }]} />
      })}
    </View>
  )
}

function LoaderButton({ label, primary, onPress }: { label: string; primary?: boolean; onPress: () => void }) {
  const [down, setDown] = useState(false)
  return (
    <Pressable onPress={onPress} onPressIn={() => setDown(true)} onPressOut={() => setDown(false)} accessibilityRole="button">
      <View
        style={[
          styles.button,
          primary
            ? { backgroundColor: down ? C.jadePressed : C.jade }
            : { borderWidth: 1.5, borderColor: C.outline, backgroundColor: down ? C.quietPressed : 'transparent' },
        ]}
      >
        <Text style={[loadType.button, { color: primary ? C.onJade : C.ink }]}>{label}</Text>
      </View>
    </Pressable>
  )
}

/** How tall the fade behind the words is, above the safe area. */
const FOOT_FADE = 230

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: { backgroundColor: C.page, alignItems: 'center', justifyContent: 'center' },
  column: { alignItems: 'center', paddingHorizontal: 24, maxWidth: 430, width: '100%' },
  foot: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  footColumn: { position: 'absolute', bottom: 0, alignSelf: 'center' },
  words: { alignItems: 'center', marginTop: 18, minHeight: 56 },
  message: { color: C.ink, textAlign: 'center' },
  detail: { color: C.muted, textAlign: 'center', marginTop: 6 },
  dots: { flexDirection: 'row', marginTop: 12 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.jade, marginHorizontal: 4 },
  buttons: { flexDirection: 'row', marginTop: 18 },
  button: { minWidth: 120, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, marginHorizontal: 6 },
})
