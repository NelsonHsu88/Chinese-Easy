import { useCallback, useLayoutEffect, useRef } from 'react'
import { Animated, Easing } from 'react-native'
import { useReduceMotion } from '../tour/useReduceMotion'

/*
 * FLIP motion for tiles that move between containers — the sentence builder's
 * word bank and answer line (SS1025 "Word slide into place").
 *
 * A tile that moves from one list to the other is unmounted from the first and
 * mounted in the second, so React alone draws it in its new place the instant
 * state changes. This hook gives each tile (by a stable id, never an array
 * index) a persistent offset. After every change it measures each tile's
 * *slot* — an untransformed wrapper — relative to a container, sets the tile's
 * offset so it is drawn exactly where it was a moment ago, and springs that
 * offset to zero. The tapped tile and every neighbour that reflowed glide the
 * same way, and a change mid-flight starts from where the tile is on screen,
 * so rapid taps chain smoothly.
 *
 * Measuring uses `getBoundingClientRect()`, which is synchronous on web and on
 * React Native's new architecture, inside a layout effect: the offset is in
 * place before the frame paints, so nothing flashes at its destination.
 * Positions are taken relative to `containerRef`, so the screen sliding in
 * (a transformed ancestor) doesn't read as every tile moving.
 *
 * JS-driven on purpose: the next change needs the current offset back
 * (`stopAnimation`) synchronously, and a handful of tiles is cheap.
 */

type Rect = { x: number; y: number }
type Box = { getBoundingClientRect?: () => { left: number; top: number; x?: number; y?: number } } | null

export interface TileMotion {
  /** Translation from the slot; springs to zero. */
  pos: Animated.ValueXY
  /** The lift while flying. */
  scale: Animated.Value
  /** 0 → 1 as the tile takes its "placed" look (crossfaded, not swapped). */
  tone: Animated.Value
}

const SPRING = { stiffness: 340, damping: 30, mass: 1, overshootClamping: false } as const
/** Covers a stalled spring in a hidden browser tab (CLAUDE.md, Animation traps). */
const BACKSTOP_MS = 900

function rectOf(view: Box): Rect | null {
  const r = view?.getBoundingClientRect?.()
  if (!r) return null
  return { x: r.left ?? r.x ?? 0, y: r.top ?? r.y ?? 0 }
}

export function useFlipTiles(
  /** Any value that changes whenever tiles may have moved. */
  layoutKey: unknown,
  /** Each tile's "placed" state, by id, for the look crossfade. */
  placedOf: (id: string) => boolean,
) {
  const reduceMotion = useReduceMotion()
  const containerRef = useRef<Box>(null)
  const slots = useRef(new Map<string, Box>())
  const refFns = useRef(new Map<string, (v: unknown) => void>())
  const motions = useRef(new Map<string, TileMotion>())
  const last = useRef(new Map<string, Rect>())
  const lifted = useRef<string | null>(null)
  const generation = useRef(new Map<string, number>())
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const motionFor = useCallback(
    (id: string): TileMotion => {
      let m = motions.current.get(id)
      if (!m) {
        m = {
          pos: new Animated.ValueXY({ x: 0, y: 0 }),
          scale: new Animated.Value(1),
          tone: new Animated.Value(placedOf(id) ? 1 : 0),
        }
        motions.current.set(id, m)
      }
      return m
    },
    [placedOf],
  )

  /** A stable callback ref per tile id, for the tile's untransformed slot. */
  const slotRef = useCallback((id: string) => {
    let fn = refFns.current.get(id)
    if (!fn) {
      fn = (v: unknown) => {
        if (v) slots.current.set(id, v as Box)
        else slots.current.delete(id)
      }
      refFns.current.set(id, fn)
    }
    return fn
  }, [])

  /** Call just before the state change that moves `id`: it lifts as it flies. */
  const lift = useCallback((id: string) => {
    lifted.current = id
  }, [])

  useLayoutEffect(() => {
    const origin = rectOf(containerRef.current) ?? { x: 0, y: 0 }
    slots.current.forEach((view, id) => {
      const abs = rectOf(view)
      if (!abs) return
      const now = { x: abs.x - origin.x, y: abs.y - origin.y }
      const prev = last.current.get(id)
      last.current.set(id, now)
      const m = motionFor(id)

      const placed = placedOf(id) ? 1 : 0
      if (reduceMotion) {
        m.pos.setValue({ x: 0, y: 0 })
        m.tone.setValue(placed)
        return
      }
      Animated.timing(m.tone, { toValue: placed, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: false }).start()

      if (!prev) return
      let offset = { x: 0, y: 0 }
      m.pos.stopAnimation((v) => {
        offset = v as unknown as Rect
      })
      const dx = prev.x + offset.x - now.x
      const dy = prev.y + offset.y - now.y
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
        if (offset.x !== 0 || offset.y !== 0) {
          Animated.spring(m.pos, { toValue: { x: 0, y: 0 }, ...SPRING, useNativeDriver: false }).start()
        }
        return
      }
      m.pos.setValue({ x: dx, y: dy })
      Animated.spring(m.pos, { toValue: { x: 0, y: 0 }, ...SPRING, useNativeDriver: false }).start()

      if (lifted.current === id) {
        m.scale.stopAnimation()
        Animated.sequence([
          Animated.timing(m.scale, { toValue: 1.06, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: false }),
          Animated.spring(m.scale, { toValue: 1, stiffness: 260, damping: 22, mass: 1, useNativeDriver: false }),
        ]).start()
      }

      const gen = (generation.current.get(id) ?? 0) + 1
      generation.current.set(id, gen)
      timers.current.push(
        setTimeout(() => {
          if (generation.current.get(id) !== gen) return
          m.pos.setValue({ x: 0, y: 0 })
          m.scale.setValue(1)
          m.tone.setValue(placedOf(id) ? 1 : 0)
        }, BACKSTOP_MS),
      )
    })
    lifted.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey])

  useLayoutEffect(() => () => timers.current.forEach(clearTimeout), [])

  /**
   * Re-reads every slot without animating — for layout that moved on its own
   * (fonts arriving, a resize), so the next change doesn't fly tiles from
   * where they used to be. Wire it to the container's `onLayout`.
   */
  const rebaseline = useCallback(() => {
    const origin = rectOf(containerRef.current) ?? { x: 0, y: 0 }
    slots.current.forEach((view, id) => {
      const abs = rectOf(view)
      if (abs) last.current.set(id, { x: abs.x - origin.x, y: abs.y - origin.y })
    })
  }, [])

  return { containerRef, slotRef, motionFor, lift, rebaseline }
}
