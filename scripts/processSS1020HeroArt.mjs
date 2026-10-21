/**
 * Home's header painting, from "SS1020 Redesign UI header.png".
 *
 *   node scripts/processSS1020HeroArt.mjs
 *
 * The previous header (`app/home-hero.png`, cut from an older mockup) drew
 * Shifu with a squashed, too-wide head — a fault of that render, not of the
 * layout, which shows it at its true ratio. SS1020 is the same scene with Shifu
 * correctly proportioned, so it replaces it.
 *
 * The reference has the greeting, the learner's name on its yellow brush
 * stroke, the welcome line and the streak pill painted into it. The screen
 * draws its own greeting, so those are painted out here:
 *
 *   - In the three text areas only the type and the yellow wash are replaced
 *     (pixels darker than the paper, or yellow), so the paper's own grain
 *     between the letters survives.
 *   - The pill's area is replaced whole (its body, border and shadow).
 *
 * Each masked pixel is filled by diffusion from the unmasked pixels around it
 * (repeated neighbour averaging), seeded row by row, then given a touch of the
 * paper's grain so the patch doesn't read as flatter than its surroundings.
 * Every area sits on pale sky or mist, which is what makes this clean.
 *
 * Output: `src/assets/images/app/home-hero-ss1020.png`, 1170px wide (3× a
 * 390pt column) at the reference's own 3:2, palette-encoded like
 * `compressImages.mjs` does.
 */
import sharp from 'sharp'
import path from 'node:path'

const SRC = 'Photos for Reference/Beta 2.1 Photos/SS1020 Redesign UI header.png'
const OUT = 'src/assets/images/app/home-hero-ss1020.png'
const SIZE = { width: 1536, height: 1024 }
const OUT_WIDTH = 1170

/** Areas in the reference's pixels. `whole` replaces everything inside. */
const AREAS = [
  { name: 'greeting', left: 75, top: 165, right: 800, bottom: 300 },
  { name: 'name and its wash', left: 60, top: 280, right: 412, bottom: 462 },
  { name: 'welcome line', left: 80, top: 486, right: 546, bottom: 698 },
  { name: 'streak pill', left: 1084, top: 38, right: 1512, bottom: 168, whole: true },
]

/** Darker than this (0–255 luminance) is type, not paper. */
const INK_BELOW = 244
/** Red minus blue above this is the yellow brush wash. */
const WASH_ABOVE = 16
/** Grow the mask by this many pixels, to take the type's soft anti-aliased edge. */
const GROW = 5
const ITERATIONS = 700
/** ± this much noise on filled pixels, matching the paper's grain. */
const GRAIN = 1.6

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true })
if (info.width !== SIZE.width || info.height !== SIZE.height) {
  throw new Error(`Expected ${SIZE.width}×${SIZE.height}, got ${info.width}×${info.height} — has the reference changed?`)
}
const W = info.width
const H = info.height
const px = new Float64Array(data)
const at = (x, y) => (y * W + x) * 3
const lum = (i) => 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]

// --- The mask -------------------------------------------------------------------------
const mask = new Uint8Array(W * H)
for (const a of AREAS) {
  for (let y = a.top; y <= a.bottom; y++) {
    for (let x = a.left; x <= a.right; x++) {
      const i = at(x, y)
      if (a.whole || lum(i) < INK_BELOW || px[i] - px[i + 2] > WASH_ABOVE) mask[y * W + x] = 1
    }
  }
}
// Grow it, but never past an area's own edges.
for (let pass = 0; pass < GROW; pass++) {
  const next = mask.slice()
  for (const a of AREAS) {
    for (let y = a.top; y <= a.bottom; y++) {
      for (let x = a.left; x <= a.right; x++) {
        if (mask[y * W + x]) continue
        if (mask[y * W + x - 1] || mask[y * W + x + 1] || mask[(y - 1) * W + x] || mask[(y + 1) * W + x]) next[y * W + x] = 1
      }
    }
  }
  mask.set(next)
}
let masked = 0
for (const v of mask) masked += v
console.log(`Masked ${masked} px across ${AREAS.length} areas.`)

// --- Seed: each masked run takes a straight blend between its unmasked ends --------------
for (let y = 0; y < H; y++) {
  let x = 0
  while (x < W) {
    if (!mask[y * W + x]) {
      x++
      continue
    }
    const start = x
    while (x < W && mask[y * W + x]) x++
    const l = at(Math.max(0, start - 1), y)
    const r = at(Math.min(W - 1, x), y)
    for (let k = start; k < x; k++) {
      const t = (k - start + 1) / (x - start + 1)
      for (let c = 0; c < 3; c++) px[at(k, y) + c] = px[l + c] * (1 - t) + px[r + c] * t
    }
  }
}

// --- Diffuse: masked pixels relax to the average of their neighbours ---------------------
const cells = []
for (let i = 0; i < W * H; i++) if (mask[i]) cells.push(i)
const next = new Float64Array(cells.length * 3)
for (let n = 0; n < ITERATIONS; n++) {
  cells.forEach((cell, j) => {
    const x = cell % W
    const y = (cell - x) / W
    for (let c = 0; c < 3; c++) {
      next[j * 3 + c] = (px[at(x - 1, y) + c] + px[at(x + 1, y) + c] + px[at(x, y - 1) + c] + px[at(x, y + 1) + c]) / 4
    }
  })
  cells.forEach((cell, j) => {
    for (let c = 0; c < 3; c++) px[cell * 3 + c] = next[j * 3 + c]
  })
}

// --- Grain, then write ------------------------------------------------------------------
let seed = 1020
const random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
for (const cell of cells) {
  const g = (random() - 0.5) * 2 * GRAIN
  for (let c = 0; c < 3; c++) px[cell * 3 + c] += g
}
const out = Buffer.alloc(px.length)
for (let i = 0; i < px.length; i++) out[i] = Math.max(0, Math.min(255, Math.round(px[i])))

await sharp(out, { raw: { width: W, height: H, channels: 3 } })
  .resize({ width: OUT_WIDTH })
  .png({ palette: true, quality: 100, dither: 1, compressionLevel: 9, effort: 7 })
  .toFile(OUT)
console.log(`Wrote ${path.normalize(OUT)} (${OUT_WIDTH}×${Math.round((OUT_WIDTH * H) / W)}).`)
