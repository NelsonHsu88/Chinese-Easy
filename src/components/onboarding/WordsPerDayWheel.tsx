import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, PanResponder, Platform, Text, View, type ViewInstance } from 'react-native'
import { tickHaptic } from '../../lib/haptics'
import { onbColors as c, onbRadius, onbShadow, onbSpacing as s, onbType as t, onbWheel as w } from './tokens'

const NATIVE = Platform.OS !== 'web'

/** The words-per-day choice, as the wheel offers it. */
export const WORDS_PER_DAY_MIN = 1
export const WORDS_PER_DAY_MAX = 50

const COUNT = WORDS_PER_DAY_MAX - WORDS_PER_DAY_MIN + 1
const VALUES = Array.from({ length: COUNT }, (_, i) => WORDS_PER_DAY_MIN + i)
/** The wheel's offset with the last number centred; the first centres at 0. */
const MIN_OFFSET = -(COUNT - 1) * w.row

const clampIndex = (i: number) => Math.max(0, Math.min(COUNT - 1, i))
const indexOf = (value: number) => clampIndex(Math.round(value) - WORDS_PER_DAY_MIN)
const indexAt = (offset: number) => clampIndex(Math.round(-offset / w.row))

/** Past either end the wheel gives a little, like a held spring, and no more. */
function rubberBand(offset: number): number {
  if (offset > 0) return offset * w.edgeGive
  if (offset < MIN_OFFSET) return MIN_OFFSET + (offset - MIN_OFFSET) * w.edgeGive
  return offset
}

/**
 * A wheel of numbers, 1 at the top to 50 at the bottom: drag up and the number
 * in the middle grows. The one in the centre band is the choice; the others
 * fade and shrink the further they sit above or below it.
 *
 * It is one continuous motion rather than a scroll view snapping between rows:
 * the column follows the finger exactly, and on release a spring carries it on
 * with the finger's own speed and settles it onto the nearest number — so a
 * flick travels a few numbers and eases in, and a slow drag just settles onto
 * the one under it. Tapping a number above or below the band springs to it.
 *
 * The number shown is kept here and only reported to `onChange` once the wheel
 * has settled, so the page around it isn't re-rendered on every number it
 * passes (which is what made the old wheel stutter).
 */
export function WordsPerDayWheel({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const startIndex = indexOf(value)
  const offset = useRef(new Animated.Value(-startIndex * w.row)).current
  /** The offset as of the last frame — the value `offset` holds, readable from JS. */
  const current = useRef(-startIndex * w.row)
  const [shown, setShown] = useState(startIndex + WORDS_PER_DAY_MIN)
  const shownRef = useRef(shown)
  const committed = useRef(shown)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const box = useRef<ViewInstance>(null)
  const boxTop = useRef(0)
  const dragStart = useRef(0)
  const backstop = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pad = ((w.visible - 1) / 2) * w.row

  /* Follows the wheel as it moves: the number in the band, and a tick for each one passed. */
  useEffect(() => {
    const id = offset.addListener(({ value: v }) => {
      current.current = v
      const next = indexAt(v) + WORDS_PER_DAY_MIN
      if (next !== shownRef.current) {
        shownRef.current = next
        tickHaptic()
        setShown(next)
      }
    })
    return () => {
      offset.removeListener(id)
      if (backstop.current) clearTimeout(backstop.current)
    }
  }, [offset])

  const commit = (index: number) => {
    const next = index + WORDS_PER_DAY_MIN
    if (next === committed.current) return
    committed.current = next
    onChangeRef.current(next)
  }

  /** Springs to `index`, starting at `velocity` (px/ms, the gesture's own). */
  const settleOn = (index: number, velocity = 0) => {
    const to = -index * w.row
    if (backstop.current) clearTimeout(backstop.current)
    let done = false
    const finish = () => {
      if (done) return
      done = true
      if (backstop.current) clearTimeout(backstop.current)
      commit(index)
    }
    Animated.spring(offset, {
      toValue: to,
      velocity,
      stiffness: w.springStiffness,
      damping: w.springDamping,
      mass: 1,
      useNativeDriver: NATIVE,
    }).start(finish)
    /* A stalled browser tab never finishes a JS-driven spring; land it anyway. */
    backstop.current = setTimeout(() => {
      offset.stopAnimation()
      offset.setValue(to)
      current.current = to
      finish()
    }, w.backstopMs)
  }

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 2,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          if (backstop.current) clearTimeout(backstop.current)
          offset.stopAnimation()
          dragStart.current = current.current
          box.current?.measure((_x: number, _y: number, _w: number, _h: number, _px: number, py: number) => {
            boxTop.current = py
          })
        },
        onPanResponderMove: (_, g) => {
          const v = rubberBand(dragStart.current + g.dy)
          current.current = v
          offset.setValue(v)
        },
        onPanResponderRelease: (e, g) => {
          /* A tap, not a drag: spring to the row that was touched. */
          if (Math.abs(g.dy) < 4 && Math.abs(g.dx) < 8) {
            const row = Math.floor((e.nativeEvent.pageY - boxTop.current) / w.row)
            const centre = (w.visible - 1) / 2
            settleOn(clampIndex(indexAt(dragStart.current) + (row - centre)))
            return
          }
          /* Where the flick would carry the wheel, then the nearest number to that. */
          const projected = current.current + g.vy * w.flickMs
          settleOn(indexAt(projected), g.vy)
        },
        onPanResponderTerminate: (_, g) => {
          settleOn(indexAt(current.current), g.vy)
        },
      }),
    // `settleOn` reads only refs and the stable `offset`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [offset],
  )

  return (
    <View style={{ alignSelf: 'stretch' }}>
      <View
        ref={box}
        {...responder.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="New words per day"
        accessibilityValue={{ min: WORDS_PER_DAY_MIN, max: WORDS_PER_DAY_MAX, now: shown, text: `${shown} words a day` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => settleOn(clampIndex(indexAt(current.current) + (e.nativeEvent.actionName === 'increment' ? 1 : -1)))}
        style={{ height: w.visible * w.row, overflow: 'hidden' }}
      >
        {/* The centre band the chosen number sits in, behind the numbers. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: pad,
            height: w.row,
            borderRadius: onbRadius.cardLarge,
            backgroundColor: c.greenSoft,
            borderWidth: 1.5,
            borderColor: c.green,
            ...onbShadow,
          }}
        />

        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, top: pad, transform: [{ translateY: offset }] }}
        >
          <WheelNumbers offset={offset} />
        </Animated.View>

        {/* The unit, fixed beside the centre band. */}
        <View pointerEvents="none" style={{ position: 'absolute', top: pad, height: w.row, right: s.lg, justifyContent: 'center' }}>
          <Text className="font-nunito-bold" style={{ fontSize: 15, color: c.greenDark }}>
            {shown === 1 ? 'word a day' : 'words a day'}
          </Text>
        </View>
      </View>

      <Text className="font-nunito-semibold text-center" style={{ ...t.footnote, color: c.textMuted, marginTop: s.lg }}>
        {paceLabel(shown)}
      </Text>
    </View>
  )
}

/**
 * The fifty numbers, each fading and shrinking with its distance from the
 * band. Memoised on the shared offset alone, so the wheel's own re-renders (the
 * number in the band changing) never rebuild them.
 */
const WheelNumbers = memo(function WheelNumbers({ offset }: { offset: Animated.Value }) {
  return (
    <>
      {VALUES.map((n, i) => {
        const range = {
          inputRange: [-(i + w.fadeRows) * w.row, -i * w.row, -(i - w.fadeRows) * w.row],
          extrapolate: 'clamp' as const,
        }
        return (
          <View key={n} style={{ height: w.row, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View
              style={{
                opacity: offset.interpolate({ ...range, outputRange: [w.farOpacity, 1, w.farOpacity] }),
                transform: [{ scale: offset.interpolate({ ...range, outputRange: [w.farScale, 1, w.farScale] }) }],
              }}
            >
              <Text
                className="font-nunito-extrabold"
                style={{ fontSize: w.numberSize, lineHeight: w.row, color: c.navy, includeFontPadding: false }}
              >
                {n}
              </Text>
            </Animated.View>
          </View>
        )
      })}
    </>
  )
})

/** A word on the pace a number means, shown under the wheel. */
export function paceLabel(value: number): string {
  if (value <= 5) return 'Gentle — a few minutes a day'
  if (value <= 15) return 'Steady — a good everyday habit'
  if (value <= 30) return 'Ambitious — set aside real study time'
  return 'Intense — for a big push'
}
