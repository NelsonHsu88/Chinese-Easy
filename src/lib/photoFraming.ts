/*
 * The arithmetic behind framing a profile photo in a circle — pure, so it can
 * be tested, and so `PhotoFramer` is left holding only gestures and drawing.
 *
 * The model: the photo is laid out centred on a circle of diameter `frame`, at
 * the smallest size that covers it (`coverScale`), then multiplied by the
 * learner's `zoom` and shifted by an offset measured from centre to centre, in
 * screen points. Two rules follow from "the circle must always be full of
 * photo": zoom never goes below 1, and the offset is clamped so no edge of the
 * photo is ever pulled inside the circle (`clampFraming`). The crop handed to
 * the image cutter is then just that circle's bounding square, converted back
 * into the photo's own pixels (`cropFor`).
 */

/** A photo straight from the picker, not yet framed or kept. */
export interface PickedPhoto {
  uri: string
  /** Pixel size, when the picker reports it (0 when not). `PhotoFramer` measures it then. */
  width: number
  height: number
}

/** A square in the source photo's own pixels. */
export interface AvatarCrop {
  originX: number
  originY: number
  size: number
}

export interface Framing {
  zoom: number
  /** Photo centre minus circle centre, in screen points. */
  x: number
  y: number
}

export const MIN_ZOOM = 1
export const MAX_ZOOM = 4

/** Points per photo pixel at which the photo just covers the circle. */
export function coverScale(photoW: number, photoH: number, frame: number): number {
  return frame / Math.min(photoW, photoH)
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

/** The furthest the photo's centre may sit from the circle's, per axis, at this zoom. */
export function maxOffset(photoW: number, photoH: number, frame: number, zoom: number): { x: number; y: number } {
  const scale = coverScale(photoW, photoH, frame) * zoom
  return { x: Math.max(0, (photoW * scale - frame) / 2), y: Math.max(0, (photoH * scale - frame) / 2) }
}

/** Pulls a framing back to the nearest one that leaves the circle full of photo. */
export function clampFraming(photoW: number, photoH: number, frame: number, f: Framing): Framing {
  const zoom = clampZoom(f.zoom)
  const max = maxOffset(photoW, photoH, frame, zoom)
  return { zoom, x: Math.min(max.x, Math.max(-max.x, f.x)), y: Math.min(max.y, Math.max(-max.y, f.y)) }
}

/**
 * The square of the photo, in its own pixels, that the circle is showing.
 * Moving the photo right (positive `x`) shows more of its left side, so the
 * crop's origin moves left — hence the subtraction.
 */
export function cropFor(photoW: number, photoH: number, frame: number, f: Framing): AvatarCrop {
  const scale = coverScale(photoW, photoH, frame) * f.zoom
  const size = frame / scale
  return {
    originX: photoW / 2 - f.x / scale - size / 2,
    originY: photoH / 2 - f.y / scale - size / 2,
    size,
  }
}

/**
 * Keeps a crop inside the photo and whole-pixel. The framing screen never
 * produces one outside it, but rounding at a photo's edge can land a pixel
 * over, and the manipulator rejects a rectangle that leaves the image.
 */
export function clampCrop(photo: PickedPhoto, crop: AvatarCrop): AvatarCrop {
  const limit = photo.width > 0 && photo.height > 0 ? Math.min(photo.width, photo.height) : crop.size
  const size = Math.max(1, Math.floor(Math.min(crop.size, limit)))
  const maxX = photo.width > 0 ? photo.width - size : Math.max(0, crop.originX)
  const maxY = photo.height > 0 ? photo.height - size : Math.max(0, crop.originY)
  return {
    originX: Math.max(0, Math.min(Math.round(crop.originX), maxX)),
    originY: Math.max(0, Math.min(Math.round(crop.originY), maxY)),
    size,
  }
}
