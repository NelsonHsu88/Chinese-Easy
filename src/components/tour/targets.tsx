import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import type { ViewInstance } from 'react-native'
import type { TourTargetId } from '../../lib/tour'

/*
 * The things the tour's spotlight can land on.
 *
 * A screen marks a control by wrapping it in `<TourTarget id=…>`; the overlay,
 * mounted once in the root layout, asks for it by id and measures it in window
 * coordinates. Nothing about the tour leaks into the screen beyond the wrapper:
 * the control keeps its own handler, and the learner presses the real thing.
 *
 * A module-level registry rather than a context, because the overlay sits
 * *above* the navigator and so is not inside any screen's tree.
 */

export interface TargetRect {
  x: number
  y: number
  width: number
  height: number
}

export interface MeasuredTarget {
  rect: TargetRect
  /** Corner radius of the control itself. The cut-out adds its padding to it. */
  radius: number
}

interface Entry {
  view: ViewInstance | null
  radius: number
  /** Scrolls the screen's ScrollView by this much, where the screen offers one. */
  scrollBy: ((dy: number) => void) | null
}

const registry = new Map<TourTargetId, Entry>()

/**
 * Lets a screen's ScrollView bring a target into view. Without it a target below
 * the fold on a small phone would be spotlit off the bottom of the screen.
 */
export const TourScrollContext = createContext<((dy: number) => void) | null>(null)

export function TourTarget({
  id,
  radius = 16,
  style,
  children,
}: {
  id: TourTargetId
  /** The control's corner radius; a circle passes half its size. */
  radius?: number
  /** Layout for the wrapper, wherever the wrapped control was carrying it. */
  style?: StyleProp<ViewStyle>
  children: ReactNode
}) {
  const ref = useRef<ViewInstance>(null)
  const scrollBy = useContext(TourScrollContext)

  useEffect(() => {
    const entry: Entry = { view: ref.current, radius, scrollBy }
    registry.set(id, entry)
    return () => {
      /* Only remove ourselves — a remount can register the same id before
         the old instance's cleanup runs. */
      if (registry.get(id) === entry) registry.delete(id)
    }
  }, [id, radius, scrollBy])

  return (
    /* `collapsable={false}`: Android flattens a layout-only View away, and a
       view that does not exist natively cannot be measured. */
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  )
}

/**
 * Where a target is on screen right now, or null if it is not mounted or has
 * no size yet (a screen still laying out, a card that was dismissed).
 */
export function measureTarget(id: TourTargetId): Promise<MeasuredTarget | null> {
  const entry = registry.get(id)
  const view = entry?.view
  if (!entry || !view || typeof view.measureInWindow !== 'function') return Promise.resolve(null)
  return new Promise((resolve) => {
    let settled = false
    /* A view torn down mid-measure never calls back on some platforms. */
    const timer = setTimeout(() => {
      if (!settled) resolve(null)
      settled = true
    }, 400)
    try {
      view.measureInWindow((x, y, width, height) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (!(width > 0 && height > 0) || [x, y, width, height].some((n) => !Number.isFinite(n))) {
          resolve(null)
          return
        }
        resolve({ rect: { x, y, width, height }, radius: entry.radius })
      })
    } catch {
      settled = true
      clearTimeout(timer)
      resolve(null)
    }
  })
}

/** Asks the target's screen to scroll by `dy`. False when it cannot. */
export function scrollTargetBy(id: TourTargetId, dy: number): boolean {
  const scrollBy = registry.get(id)?.scrollBy
  if (!scrollBy) return false
  scrollBy(dy)
  return true
}
