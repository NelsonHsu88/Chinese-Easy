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
 * the control keeps its own handler, and the learner presses the real thing
 * (or a tour button presses it for them, through `onActivate`).
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
  /** Presses the control for the learner, where the screen offers that. */
  activate: () => void
  canActivate: () => boolean
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
  onActivate,
  children,
}: {
  id: TourTargetId
  /** The control's corner radius; a circle passes half its size. */
  radius?: number
  /** Layout for the wrapper, wherever the wrapped control was carrying it. */
  style?: StyleProp<ViewStyle>
  /**
   * What pressing the wrapped control does, so a tour button can do it for the
   * learner ("Add word" on the save step). The same handler the control runs.
   */
  onActivate?: () => void
  children: ReactNode
}) {
  const ref = useRef<ViewInstance>(null)
  const scrollBy = useContext(TourScrollContext)
  /* The latest handler: it closes over the screen's current state. */
  const activateRef = useRef(onActivate)
  activateRef.current = onActivate

  useEffect(() => {
    const entry: Entry = {
      view: ref.current,
      radius,
      scrollBy,
      activate: () => activateRef.current?.(),
      canActivate: () => !!activateRef.current,
    }
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

/*
 * **The overlay's own origin.** `measureInWindow` does not report the same
 * coordinates the overlay draws in on every platform: on Android with
 * edge-to-edge (forced from SDK 57 on), it measures from the top of the
 * *visible* frame, below the status bar, while the overlay is laid out from
 * the top of the screen — so every spotlight sat a status bar's height too
 * high. A zero-size probe at the overlay's (0, 0), measured the same way,
 * gives the offset between the two; subtracting it puts the target in the
 * overlay's own coordinates on any platform, whatever the window does.
 */
let origin: ViewInstance | null = null
/** Logged once in development, so a device run shows what the probe corrected. */
let reportedOffset = false

/** Mounted once beside the overlays, at the same (0, 0) they draw from. */
export function TourOrigin() {
  const ref = useRef<ViewInstance>(null)
  useEffect(() => {
    const view = ref.current
    origin = view
    return () => {
      if (origin === view) origin = null
    }
  }, [])
  return (
    <View
      ref={ref}
      collapsable={false}
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1, opacity: 0 }}
    />
  )
}

type Box = { x: number; y: number; width: number; height: number }

/** One `measureInWindow`, or null if the view is gone or never answers. */
function measureView(view: ViewInstance | null): Promise<Box | null> {
  if (!view || typeof view.measureInWindow !== 'function') return Promise.resolve(null)
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
        resolve([x, y, width, height].every((n) => Number.isFinite(n)) ? { x, y, width, height } : null)
      })
    } catch {
      settled = true
      clearTimeout(timer)
      resolve(null)
    }
  })
}

/**
 * Where a target is on screen right now, in the overlay's coordinates, or null
 * if it is not mounted or has no size yet (a screen still laying out, a card
 * that was dismissed).
 */
export async function measureTarget(id: TourTargetId): Promise<MeasuredTarget | null> {
  const entry = registry.get(id)
  if (!entry?.view) return null
  const [box, zero] = await Promise.all([measureView(entry.view), measureView(origin)])
  if (!box || !(box.width > 0 && box.height > 0)) return null
  /* No probe (not mounted yet): the raw reading, right everywhere but Android. */
  const dx = zero?.x ?? 0
  const dy = zero?.y ?? 0
  if (__DEV__ && (dx || dy) && !reportedOffset) {
    reportedOffset = true
    console.log(`[tour] overlay origin is at (${dx}, ${dy}) in measureInWindow's space; targets are corrected by it`)
  }
  return {
    rect: { x: box.x - dx, y: box.y - dy, width: box.width, height: box.height },
    radius: entry.radius,
  }
}

/** Presses a target's control for the learner. False when it offers no handler. */
export function activateTarget(id: TourTargetId): boolean {
  const entry = registry.get(id)
  if (!entry?.canActivate()) return false
  entry.activate()
  return true
}

/** Asks the target's screen to scroll by `dy`. False when it cannot. */
export function scrollTargetBy(id: TourTargetId, dy: number): boolean {
  const scrollBy = registry.get(id)?.scrollBy
  if (!scrollBy) return false
  scrollBy(dy)
  return true
}
