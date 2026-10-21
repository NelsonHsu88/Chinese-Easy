/*
 * Takes the flat "Shifu writing" painting apart into what the loading loop
 * animates:
 *
 *   - hand  — the writing hand and the whole brush, cut out with a soft edge;
 *   - plate — the painting with the hand, the brush and the painted ink
 *             squiggle removed, the holes rebuilt by multigrid harmonic
 *             in-painting (plus a whisper of grain on the paper), so the hand
 *             can move and the scroll starts clean.
 *
 * Everything else (breathing, head, ribbon, sleeve) is done by small,
 * feathered displacement fields over the plate at render time.
 *
 * The rebuilt areas are only ever seen at the edges of where the hand moves
 * (a few dozen pixels), which watercolour forgives. They would not survive a
 * large movement — see README.
 *
 *   node scripts/loading/plate.mjs [debugDir]
 */
import sharp from 'sharp'

export const SRC = 'scripts/loading/shifu-writing.webp'
export const IW = 1086
export const IH = 1448

/* Landmarks, in source pixels. */
export const TIP = [484, 1009] // where the brush meets the paper
export const WRIST = [338, 918] // the hand's pivot
export const KNOT = [724, 436] // the hair ribbon's knot
export const NECK = [560, 735]
export const CUFF = [335, 930]
/** The paper's writable interior (the scroll's borders excluded). */
export const PAPER = [[272, 990], [684, 990], [826, 1192], [452, 1205]]

export function inPoly(poly, x, y) {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

function segDist(px, py, [ax, ay], [bx, by]) {
  const vx = bx - ax, vy = by - ay
  const u = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)))
  return Math.hypot(px - ax - u * vx, py - ay - u * vy)
}

function dilate(mask, w, h, r) {
  const out = new Uint8Array(mask.length)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!mask[y * w + x]) continue
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue
      const X = x + dx, Y = y + dy
      if (X >= 0 && Y >= 0 && X < w && Y < h) out[Y * w + X] = 1
    }
  }
  return out
}

/** Fill masked pixels with the harmonic interpolation of their surroundings. */
function inpaint(img, mask, w, h) {
  // Coarse-to-fine: solve on a pyramid, upsample as the next level's start.
  const levels = []
  let cur = { img: Float32Array.from(img), mask: Uint8Array.from(mask), w, h }
  levels.push(cur)
  while (cur.w > 24 && cur.h > 24) {
    const nw = Math.ceil(cur.w / 2), nh = Math.ceil(cur.h / 2)
    const ni = new Float32Array(nw * nh * 3)
    const nm = new Uint8Array(nw * nh)
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
      let n = 0, s = [0, 0, 0], any = 0
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const X = Math.min(cur.w - 1, x * 2 + dx), Y = Math.min(cur.h - 1, y * 2 + dy)
        const i = Y * cur.w + X
        if (cur.mask[i]) { any = 1; continue }
        for (let c = 0; c < 3; c++) s[c] += cur.img[i * 3 + c]
        n++
      }
      const o = y * nw + x
      if (n) for (let c = 0; c < 3; c++) ni[o * 3 + c] = s[c] / n
      nm[o] = n ? 0 : any
    }
    cur = { img: ni, mask: nm, w: nw, h: nh }
    levels.push(cur)
  }
  for (let L = levels.length - 1; L >= 0; L--) {
    const lv = levels[L]
    if (L < levels.length - 1) {
      const up = levels[L + 1]
      for (let y = 0; y < lv.h; y++) for (let x = 0; x < lv.w; x++) {
        const i = y * lv.w + x
        if (!lv.mask[i]) continue
        const j = Math.min(up.h - 1, y >> 1) * up.w + Math.min(up.w - 1, x >> 1)
        for (let c = 0; c < 3; c++) lv.img[i * 3 + c] = up.img[j * 3 + c]
      }
    }
    const idx = []
    for (let i = 0; i < lv.w * lv.h; i++) if (lv.mask[i]) idx.push(i)
    for (let it = 0; it < 60; it++) {
      for (const i of idx) {
        const x = i % lv.w, y = (i / lv.w) | 0
        for (let c = 0; c < 3; c++) {
          let s = 0, n = 0
          if (x > 0) { s += lv.img[(i - 1) * 3 + c]; n++ }
          if (x < lv.w - 1) { s += lv.img[(i + 1) * 3 + c]; n++ }
          if (y > 0) { s += lv.img[(i - lv.w) * 3 + c]; n++ }
          if (y < lv.h - 1) { s += lv.img[(i + lv.w) * 3 + c]; n++ }
          lv.img[i * 3 + c] = s / n
        }
      }
    }
  }
  return levels[0].img
}

export async function buildPlate() {
  const { data } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = IW, h = IH
  const img = Float32Array.from(data)
  const lum = (i) => 0.3 * data[i * 3] + 0.59 * data[i * 3 + 1] + 0.11 * data[i * 3 + 2]

  // The hand: skin in its box; the handle: a dark band along its axis; the
  // knob; the bristles: their outline (white hair and black tip alike).
  const BRISTLES = [[412, 926], [452, 928], [470, 958], [492, 1003], [490, 1014], [476, 1014], [446, 991], [420, 963]]
  const hand = new Uint8Array(w * h)
  for (let y = 700; y < 1030; y++) for (let x = 280; x < 510; x++) {
    const i = y * w + x
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2]
    const skin = x >= 296 && x <= 438 && y >= 806 && y <= 950 && r > 190 && r > g && g > b && r - b > 30 && g > 135
    const handle = (segDist(x, y, [328, 728], [442, 944]) < 12.5 || Math.hypot(x - 331, y - 739) < 16) && lum(i) < 175
    if (skin || handle || inPoly(BRISTLES, x, y)) hand[i] = 1
  }
  // Close small gaps between fingers and handle.
  const handMask = dilate(hand, w, h, 1)

  // The painted squiggle: dark marks on the paper.
  const ink = new Uint8Array(w * h)
  for (let y = 985; y < 1070; y++) for (let x = 415; x < 760; x++) {
    const i = y * w + x
    if (lum(i) < 200 && !handMask[i]) ink[i] = 1
  }

  const hole = dilate(handMask, w, h, 4)
  const inkHole = dilate(ink, w, h, 4)
  for (let i = 0; i < w * h; i++) if (inkHole[i]) hole[i] = 1
  const plate = inpaint(img, hole, w, h)
  // Below the fingers the hole is narrow and what it crosses runs level (the
  // belt, the robe's hem, the paper's edge): bridge each row straight across
  // from its two sides, which keeps those lines crisp where diffusion smears.
  for (let y = 952; y < 1030; y++) {
    let x = 360
    while (x < 520) {
      if (!hole[y * w + x]) { x++; continue }
      const a = x - 1
      let b = x
      while (b < 560 && hole[y * w + b]) b++
      if (b - a < 90 && !hole[y * w + a] && !hole[y * w + b]) {
        for (let k = a + 1; k < b; k++) {
          const u = (k - a) / (b - a)
          for (let c = 0; c < 3; c++) plate[(y * w + k) * 3 + c] = img[(y * w + a) * 3 + c] * (1 - u) + img[(y * w + b) * 3 + c] * u
        }
      }
      x = b
    }
  }
  // Paper grain where paper was rebuilt, so the patch doesn't read as flat.
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5
  for (let i = 0; i < w * h; i++) {
    if (!hole[i]) continue
    const n = rnd() * 3.2
    for (let c = 0; c < 3; c++) plate[i * 3 + c] += n
  }

  // Hand layer: original pixels, alpha from the mask softened by a 3×3 box.
  const handRGBA = new Float32Array(w * h * 4)
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x
    let a = 0
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) a += handMask[i + dy * w + dx]
    if (!a) continue
    // Premultiplied, so bilinear sampling at the edge stays clean.
    for (let c = 0; c < 3; c++) handRGBA[i * 4 + c] = (data[i * 3 + c] * a) / 9
    handRGBA[i * 4 + 3] = a / 9
  }
  return { w, h, plate, handRGBA, src: img }
}

if (process.argv[1]?.endsWith('plate.mjs')) {
  const out = process.argv[2] ?? '.'
  const { w, h, plate, handRGBA } = await buildPlate()
  const toBuf = (f) => Buffer.from(Uint8ClampedArray.from(f))
  await sharp(toBuf(plate), { raw: { width: w, height: h, channels: 3 } }).extract({ left: 250, top: 680, width: 560, height: 420 }).png().toFile(`${out}/plate.png`)
  const tint = new Float32Array(w * h * 3)
  for (let i = 0; i < w * h; i++) {
    const a = handRGBA[i * 4 + 3]
    for (let c = 0; c < 3; c++) tint[i * 3 + c] = plate[i * 3 + c] * (1 - a) + (c === 0 ? 255 : 0) * a
  }
  await sharp(toBuf(tint), { raw: { width: w, height: h, channels: 3 } }).extract({ left: 250, top: 680, width: 560, height: 420 }).png().toFile(`${out}/handmask.png`)
  console.log('ok')
}
