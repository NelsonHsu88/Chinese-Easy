import { PNG } from 'pngjs'
import { readFileSync, writeFileSync } from 'node:fs'

/**
 * Prepares "Lessons Cloud Overlay.png" for use as the misty backdrop on the
 * Lessons path.
 *
 * Unlike the other art in this repo, this source already ships a clean alpha
 * matte, so there is no cutout step here — no flood fill (processBuildingAssets)
 * and no luminance keying (extractSoftOverlay). What it needs instead is three
 * things the raw export gets wrong for a mobile sprite:
 *
 *   1. RGB is straight (un-premultiplied) alpha and the fully-transparent region
 *      is filled with black. Bilinear filtering — both the downscale here and
 *      the GPU's when it draws the sprite — samples those invisible black pixels
 *      and drags them into the soft cloud edges as a grey halo. Bleeding the
 *      edge colour outwards first is what keeps the wisps clean.
 *   2. Content occupies only rows 630-969 of a 1536x1024 canvas. Shipping the
 *      empty two-thirds would make the sprite impossible to anchor to the screen
 *      bottom without magic offsets.
 *   3. It's a 2MB full-res export.
 *
 * Usage: node scripts/processCloudOverlay.mjs
 */

const SRC =
  'C:/Users/Nelson/Desktop/chinese-easy/Photos for Reference/ChatGPT Image/Lessons Cloud Overlay.png'
const DEST = 'C:/Users/Nelson/Desktop/chinese-easy/src/assets/images/icons/lessons-clouds.png'

const TARGET_WIDTH = 1080 // ~3x a phone's logical width; the sprite spans the full screen
const ALPHA_FLOOR = 4 // below this a pixel counts as empty when finding the crop box
const BLEED_PASSES = 24 // enough to cover the widest soft edge in this art

const src = PNG.sync.read(readFileSync(SRC))
const { width: W, height: H } = src
const data = src.data

// --- 1. Bleed opaque colour outward into the transparent region -------------
// Each pass gives every still-unfilled pixel the average colour of its filled
// neighbours. Alpha is untouched; only the RGB that filtering might sample is.
const filled = new Uint8Array(W * H)
for (let i = 0; i < W * H; i++) if (data[i * 4 + 3] > 0) filled[i] = 1

const NEIGHBOURS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
]

for (let pass = 0; pass < BLEED_PASSES; pass++) {
  const next = filled.slice()
  let changed = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (filled[i]) continue
      let r = 0
      let g = 0
      let b = 0
      let n = 0
      for (const [dx, dy] of NEIGHBOURS) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
        const ni = ny * W + nx
        if (!filled[ni]) continue
        r += data[ni * 4]
        g += data[ni * 4 + 1]
        b += data[ni * 4 + 2]
        n++
      }
      if (!n) continue
      data[i * 4] = Math.round(r / n)
      data[i * 4 + 1] = Math.round(g / n)
      data[i * 4 + 2] = Math.round(b / n)
      next[i] = 1
      changed++
    }
  }
  filled.set(next)
  if (!changed) break
}

// --- 2. Crop to the alpha bounding box --------------------------------------
let x0 = W
let y0 = H
let x1 = -1
let y1 = -1
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (data[(y * W + x) * 4 + 3] <= ALPHA_FLOOR) continue
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
}
const cropW = x1 - x0 + 1
const cropH = y1 - y0 + 1

// --- 3. Box downscale, averaging in premultiplied space ----------------------
// Averaging straight RGB would let near-transparent pixels pull the result
// towards their (meaningless) colour with the same weight as opaque ones.
const outW = Math.min(TARGET_WIDTH, cropW)
const outH = Math.max(1, Math.round((cropH * outW) / cropW))
const out = new PNG({ width: outW, height: outH })

for (let oy = 0; oy < outH; oy++) {
  const sy0 = y0 + Math.floor((oy * cropH) / outH)
  const sy1 = y0 + Math.max(Math.floor(((oy + 1) * cropH) / outH), Math.floor((oy * cropH) / outH) + 1)
  for (let ox = 0; ox < outW; ox++) {
    const sx0 = x0 + Math.floor((ox * cropW) / outW)
    const sx1 = x0 + Math.max(Math.floor(((ox + 1) * cropW) / outW), Math.floor((ox * cropW) / outW) + 1)

    let r = 0
    let g = 0
    let b = 0
    let a = 0
    let n = 0
    for (let sy = sy0; sy < sy1 && sy < H; sy++) {
      for (let sx = sx0; sx < sx1 && sx < W; sx++) {
        const s = (sy * W + sx) * 4
        const sa = data[s + 3] / 255
        r += data[s] * sa
        g += data[s + 1] * sa
        b += data[s + 2] * sa
        a += data[s + 3]
        n++
      }
    }

    const o = (oy * outW + ox) * 4
    const meanA = a / n
    const unpremul = meanA > 0 ? 255 / meanA : 0
    out.data[o] = Math.min(255, Math.round((r / n) * unpremul))
    out.data[o + 1] = Math.min(255, Math.round((g / n) * unpremul))
    out.data[o + 2] = Math.min(255, Math.round((b / n) * unpremul))
    out.data[o + 3] = Math.round(meanA)
  }
}

writeFileSync(DEST, PNG.sync.write(out))

const kb = (n) => `${(n / 1024).toFixed(0)}KB`
console.log(
  `${W}x${H} (${kb(readFileSync(SRC).length)}) -> crop ${cropW}x${cropH} @ ${x0},${y0} -> ${outW}x${outH} (${kb(
    readFileSync(DEST).length,
  )})`,
)
console.log(`wrote ${DEST}`)
