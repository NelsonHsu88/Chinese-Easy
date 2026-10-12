/*
 * Where a tour tooltip goes, as arithmetic.
 *
 * Pure, so the small-phone and large-phone cases can be tested rather than
 * eyeballed (see `__tests__/tour.test.ts`). The overlay measures the target and
 * the card and hands both in; nothing here is per-device.
 */

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Bounds {
  /** Highest a card may reach: under the status bar / notch. */
  top: number
  /** Lowest: above the tab bar, or above the home indicator. */
  bottom: number
  /** Screen width. */
  width: number
}

export interface Placement {
  x: number
  y: number
  side: 'above' | 'below' | 'center'
}

/**
 * Below the target if the card fits there, above if it fits there instead,
 * otherwise whichever side has more room — clamped into the bounds either way,
 * so a card is never placed off screen even when it has to overlap the target.
 * Horizontally it centres on the target, clamped to the screen margins.
 *
 * With no target the card is centred in the bounds (a fallback step).
 */
export function placeTooltip({
  target,
  card,
  bounds,
  gap,
  margin,
}: {
  target: Rect | null
  card: { width: number; height: number }
  bounds: Bounds
  gap: number
  margin: number
}): Placement {
  const clampX = (x: number) => Math.min(Math.max(x, margin), Math.max(margin, bounds.width - margin - card.width))
  const clampY = (y: number) => Math.min(Math.max(y, bounds.top), Math.max(bounds.top, bounds.bottom - card.height))

  if (!target) {
    return {
      x: clampX((bounds.width - card.width) / 2),
      y: clampY(bounds.top + (bounds.bottom - bounds.top - card.height) / 2),
      side: 'center',
    }
  }

  const x = clampX(target.x + target.width / 2 - card.width / 2)
  const spaceBelow = bounds.bottom - (target.y + target.height + gap)
  const spaceAbove = target.y - gap - bounds.top

  if (spaceBelow >= card.height) return { x, y: target.y + target.height + gap, side: 'below' }
  if (spaceAbove >= card.height) return { x, y: target.y - gap - card.height, side: 'above' }
  return spaceBelow >= spaceAbove
    ? { x, y: clampY(target.y + target.height + gap), side: 'below' }
    : { x, y: clampY(target.y - gap - card.height), side: 'above' }
}

/**
 * How far a screen has to scroll to show a target whole, with `room` to spare
 * so its tooltip still has somewhere to go. Zero when it is already in view.
 * Positive scrolls the content up (the target moves up the screen).
 */
export function scrollToReveal(target: Rect, bounds: Bounds, room: number): number {
  const top = bounds.top + room
  const bottom = bounds.bottom - room
  if (target.y + target.height > bottom) {
    /* Never scroll the top of the target above the band to show its bottom. */
    return Math.min(target.y + target.height - bottom, Math.max(0, target.y - top))
  }
  if (target.y < bounds.top) return target.y - top
  return 0
}
