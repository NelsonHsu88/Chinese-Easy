import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clampCrop, clampFraming, cropFor, MAX_ZOOM } from '../photoFraming'

/*
 * The profile photo framer: what the learner sees in the circle has to be
 * exactly what gets cut out. A sign error here crops the opposite side of the
 * photo from the one they chose, which nobody notices until it is their face.
 */

const FRAME = 240
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} ≈ ${b}`)

test('centred and unzoomed, a landscape photo crops its middle square', () => {
  const crop = cropFor(4000, 3000, FRAME, { zoom: 1, x: 0, y: 0 })
  near(crop.size, 3000)
  near(crop.originX, 500)
  near(crop.originY, 0)
})

test('moving the photo right shows its left edge', () => {
  const f = clampFraming(4000, 3000, FRAME, { zoom: 1, x: 10_000, y: 0 })
  const crop = cropFor(4000, 3000, FRAME, f)
  near(crop.originX, 0)
})

test('moving the photo up shows its bottom edge', () => {
  const f = clampFraming(3000, 4000, FRAME, { zoom: 1, x: 0, y: -10_000 })
  const crop = cropFor(3000, 4000, FRAME, f)
  near(crop.originY, 1000)
  near(crop.originY + crop.size, 4000)
})

test('zoom narrows the crop around the same centre', () => {
  const crop = cropFor(4000, 3000, FRAME, { zoom: 2, x: 0, y: 0 })
  near(crop.size, 1500)
  near(crop.originX + crop.size / 2, 2000)
  near(crop.originY + crop.size / 2, 1500)
})

test('no framing the clamp allows ever crops outside the photo', () => {
  for (const [w, h] of [[4000, 3000], [3000, 4000], [1200, 1200], [640, 2000]]) {
    for (const zoom of [0.5, 1, 1.7, MAX_ZOOM, 9]) {
      for (const [x, y] of [[-1e5, -1e5], [1e5, 1e5], [37, -12], [0, 0]]) {
        const crop = cropFor(w, h, FRAME, clampFraming(w, h, FRAME, { zoom, x, y }))
        assert.ok(crop.originX > -1e-6 && crop.originY > -1e-6, `origin inside for ${w}x${h} z${zoom}`)
        assert.ok(crop.originX + crop.size < w + 1e-6 && crop.originY + crop.size < h + 1e-6, `far edge inside for ${w}x${h} z${zoom}`)
      }
    }
  }
})

test('rounding at the edge is pulled back inside, in whole pixels', () => {
  const kept = clampCrop({ uri: 'x', width: 1000, height: 800 }, { originX: 200.6, originY: -0.4, size: 800.3 })
  assert.deepEqual(kept, { originX: 200, originY: 0, size: 800 })
})
