/*
 * Cuts the "New App Design" redesign's paintings out of its six reference
 * mockups ("SS1017 New APP DesIGN UI (1…6).png", in the gitignored
 * Photos for Reference/Beta 2.1 Photos/) into src/assets/images/app/.
 *
 * The mockups are 863×1822 with a ~785px phone screen, so about 2px per point;
 * each crop is upscaled 1.5× (lanczos, light sharpen) to ~3px per point.
 *
 * Every piece is keyed into real alpha against the surface it was painted on —
 * `sample` (a point on that surface clear of paint) or a fixed `bg` — so it
 * sits on the app's own surface without a box. Heroes are cut full width with
 * the mockup's own type masked out (`mask`), so the screen draws its type over
 * the landscape exactly where the reference has it. `inpaint` diffuses a
 * control (a chevron, a bookmark) out of a painting before keying. `feather`
 * fades the named edges. Coordinates are in the mockup's own pixels.
 *
 * The script refuses a source of any other size rather than crop the wrong place.
 *
 * Run: node scripts/processAppDesignArt.mjs   (then node scripts/compressImages.mjs)
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const DIR = path.join('Photos for Reference', 'Beta 2.1 Photos')
const OUT = path.join('src', 'assets', 'images', 'app')
const SIZE = { width: 863, height: 1822 }
const SCALE = 1.5
const WHITE = [255, 255, 255]

const SOURCES = {
  basics: 'SS1017 New APP DesIGN UI (1).png',
  review: 'SS1017 New APP DesIGN UI (2).png',
  profile: 'SS1017 New APP DesIGN UI (3).png',
  learn: 'SS1017 New APP DesIGN UI (4).png',
  home: 'SS1017 New APP DesIGN UI (5).png',
  dict: 'SS1017 New APP DesIGN UI (6).png',
}

/** How far a channel must differ from the surface before a pixel counts as full paint. */
const KEY_RANGE = 56

/** A card's scene on its left: the right edge melts into the text side. */
const LEFT_ART = { left: 6, top: 6, right: 28, bottom: 6 }
/** A tile's scene across its top: the bottom edge melts into the label. */
const TOP_ART = { left: 6, top: 6, right: 6, bottom: 22 }
/** A full-width hero: soft at the foot, where the first card meets it. */
const HERO = { left: 0, top: 0, right: 0, bottom: 26 }

const PIECES = [
  // --- Learn (4) -------------------------------------------------------------
  {
    name: 'learn-hero', src: 'learn', box: { left: 40, top: 122, width: 783, height: 518 }, bg: WHITE, feather: HERO,
    mask: [
      { left: 0, top: 165, right: 345, bottom: 272, ramp: 10 }, // "Learn"
      { left: 0, top: 272, right: 425, bottom: 368, ramp: 10 }, // subtitle
      { left: 76, top: 378, right: 432, bottom: 584, ramp: 10 }, // speech bubble
    ],
  },
  { name: 'learn-new-words', src: 'learn', box: { left: 64, top: 650, width: 318, height: 230 }, sample: { x: 388, y: 662 }, feather: LEFT_ART },
  { name: 'learn-books', src: 'learn', box: { left: 64, top: 907, width: 318, height: 231 }, sample: { x: 388, y: 918 }, feather: LEFT_ART },
  { name: 'learn-basics', src: 'learn', box: { left: 64, top: 1164, width: 326, height: 214 }, sample: { x: 392, y: 1174 }, feather: LEFT_ART },

  // --- Review (2) ------------------------------------------------------------
  {
    name: 'review-hero', src: 'review', box: { left: 40, top: 122, width: 782, height: 386 }, bg: WHITE, feather: HERO,
    mask: [
      { left: 0, top: 135, right: 365, bottom: 222, ramp: 10 }, // "Review"
      { left: 0, top: 222, right: 525, bottom: 305, ramp: 10 }, // subtitle
      { left: 276, top: 282, right: 528, bottom: 455, ramp: 10 }, // speech bubble
    ],
  },
  { name: 'review-flashcards', src: 'review', box: { left: 68, top: 659, width: 270, height: 214 }, sample: { x: 346, y: 670 }, feather: LEFT_ART },
  { name: 'review-mixed', src: 'review', box: { left: 68, top: 895, width: 284, height: 211 }, sample: { x: 372, y: 906 }, feather: LEFT_ART },
  { name: 'review-mistakes', src: 'review', box: { left: 68, top: 1127, width: 282, height: 213 }, sample: { x: 352, y: 1138 }, feather: LEFT_ART },
  { name: 'review-quote-shifu', src: 'review', box: { left: 74, top: 1606, width: 136, height: 140 }, sample: { x: 220, y: 1625 }, feather: { left: 4, top: 4, right: 4, bottom: 8 } },
  { name: 'review-quote-scene', src: 'review', box: { left: 614, top: 1598, width: 208, height: 168 }, sample: { x: 590, y: 1630 }, feather: { left: 30, top: 8, right: 0, bottom: 10 } },

  // --- Profile (3) -----------------------------------------------------------
  {
    name: 'profile-hero', src: 'profile', box: { left: 50, top: 122, width: 760, height: 266 }, bg: WHITE, feather: { left: 0, top: 0, right: 0, bottom: 6 },
    mask: [
      { left: 0, top: 125, right: 335, bottom: 212, ramp: 10 }, // "Profile"
      { left: 0, top: 212, right: 405, bottom: 285, ramp: 10 }, // subtitle
      { left: 0, top: 318, right: 478, bottom: 9999, ramp: 8 }, // the profile card under it
      { left: 742, top: 318, right: 9999, bottom: 9999, ramp: 6 },
    ],
  },
  {
    name: 'profile-hsk-scene', src: 'profile', box: { left: 336, top: 641, width: 448, height: 152 }, sample: { x: 320, y: 660 }, feather: { left: 46, top: 4, right: 4, bottom: 24 },
    /* The chevron disc: cut out, and the screen draws its own disc in the same spot. */
    mask: [{ left: 698, top: 702, right: 772, bottom: 780, ramp: 4 }],
  },

  // --- Home (5) --------------------------------------------------------------
  {
    name: 'home-hero', src: 'home', box: { left: 40, top: 122, width: 783, height: 450 }, bg: WHITE, feather: HERO,
    mask: [
      { left: 0, top: 168, right: 432, bottom: 232, ramp: 8 }, // "Good Morning,"
      { left: 0, top: 232, right: 300, bottom: 328, ramp: 8 }, // name
      { left: 0, top: 335, right: 372, bottom: 468, ramp: 8 }, // welcome
      { left: 572, top: 118, right: 9999, bottom: 205, ramp: 6 }, // streak pill
    ],
  },
  { name: 'home-review', src: 'home', box: { left: 488, top: 600, width: 304, height: 246 }, sample: { x: 476, y: 612 }, feather: { left: 30, top: 6, right: 6, bottom: 6 }, mask: [{ left: 0, top: 0, right: 545, bottom: 672, ramp: 8 }] },
  { name: 'home-word', src: 'home', box: { left: 302, top: 898, width: 496, height: 288 }, sample: { x: 290, y: 1060 }, feather: { left: 46, top: 10, right: 4, bottom: 26 }, mask: [{ left: 0, top: 0, right: 425, bottom: 950, ramp: 8 }] },
  { name: 'home-gift', src: 'home', box: { left: 612, top: 1306, width: 202, height: 296 }, sample: { x: 600, y: 1330 }, feather: { left: 24, top: 10, right: 0, bottom: 6 } },
  { name: 'home-challenge-icon', src: 'home', box: { left: 82, top: 1328, width: 88, height: 88 }, sample: { x: 178, y: 1340 }, feather: NO_FEATHER() },

  // --- Dictionary (6) --------------------------------------------------------
  {
    name: 'dict-header', src: 'dict', box: { left: 42, top: 122, width: 778, height: 232 }, bg: WHITE, feather: { left: 0, top: 0, right: 0, bottom: 20 },
    mask: [
      { left: 72, top: 178, right: 480, bottom: 268, ramp: 10 }, // "Dictionary"
      { left: 72, top: 266, right: 490, bottom: 310, ramp: 8 }, // subtitle
    ],
  },
  { name: 'dict-hsk', src: 'dict', box: { left: 82, top: 582, width: 330, height: 142 }, sample: { x: 398, y: 596 }, feather: TOP_ART, inpaint: [{ left: 334, top: 650, right: 406, bottom: 720 }] },
  { name: 'dict-characters', src: 'dict', box: { left: 455, top: 582, width: 330, height: 142 }, sample: { x: 772, y: 596 }, feather: TOP_ART, inpaint: [{ left: 706, top: 650, right: 778, bottom: 720 }] },
  { name: 'dict-radicals', src: 'dict', box: { left: 82, top: 850, width: 330, height: 134 }, sample: { x: 398, y: 864 }, feather: TOP_ART, inpaint: [{ left: 334, top: 914, right: 406, bottom: 984 }] },
  { name: 'dict-my-words', src: 'dict', box: { left: 455, top: 850, width: 330, height: 134 }, sample: { x: 772, y: 864 }, feather: TOP_ART, inpaint: [{ left: 706, top: 914, right: 778, bottom: 984 }] },
  {
    name: 'dict-discover', src: 'dict', box: { left: 292, top: 1184, width: 498, height: 206 }, sample: { x: 270, y: 1395 }, feather: { left: 50, top: 12, right: 4, bottom: 22 },
    inpaint: [{ left: 694, top: 1186, right: 772, bottom: 1258 }],
    mask: [{ left: 0, top: 1215, right: 372, bottom: 1275, ramp: 8 }], // the speaker button
  },

  // --- Chinese Basics (1) ----------------------------------------------------
  {
    name: 'basics-hero', src: 'basics', box: { left: 44, top: 122, width: 772, height: 298 }, bg: WHITE, feather: { left: 0, top: 0, right: 0, bottom: 20 },
    mask: [
      { left: 72, top: 128, right: 122, bottom: 186, ramp: 6 }, // back arrow
      { left: 72, top: 205, right: 602, bottom: 294, ramp: 8 }, // "Chinese Basics"
      { left: 72, top: 294, right: 486, bottom: 390, ramp: 8 }, // subtitle
    ],
  },
  { name: 'basics-start', src: 'basics', box: { left: 494, top: 436, width: 306, height: 347 }, sample: { x: 470, y: 452 }, feather: { left: 30, top: 6, right: 4, bottom: 4 } },
  { name: 'basics-pronunciation', src: 'basics', box: { left: 70, top: 808, width: 348, height: 230 }, sample: { x: 395, y: 1105 }, feather: TOP_ART },
  { name: 'basics-characters', src: 'basics', box: { left: 446, top: 808, width: 350, height: 230 }, sample: { x: 780, y: 1105 }, feather: TOP_ART },
  { name: 'basics-writing', src: 'basics', box: { left: 70, top: 1292, width: 348, height: 206 }, sample: { x: 395, y: 1595 }, feather: TOP_ART },
  { name: 'basics-sentences', src: 'basics', box: { left: 446, top: 1292, width: 350, height: 206 }, sample: { x: 780, y: 1595 }, feather: TOP_ART },
]

function NO_FEATHER() {
  return { left: 0, top: 0, right: 0, bottom: 0 }
}

/** 0 inside the rectangle, rising to 1 over `ramp` pixels outside it. */
function outside(rect, x, y) {
  const dx = Math.max(rect.left - x, 0, x - rect.right)
  const dy = Math.max(rect.top - y, 0, y - rect.bottom)
  return Math.max(0, Math.min(1, Math.hypot(dx, dy) / rect.ramp))
}

/** Fills `rect` from its border inwards (row bridge, then Jacobi relaxation). */
function inpaint(data, width, rect, iterations = 500) {
  const w = rect.right - rect.left + 1
  const h = rect.bottom - rect.top + 1
  const at = (x, y) => (y * width + x) * 3
  for (let y = rect.top; y <= rect.bottom; y++) {
    const l = at(rect.left - 1, y)
    const r = at(rect.right + 1, y)
    for (let x = rect.left; x <= rect.right; x++) {
      const t = (x - rect.left + 1) / (w + 1)
      for (let k = 0; k < 3; k++) data[at(x, y) + k] = data[l + k] * (1 - t) + data[r + k] * t
    }
  }
  const field = new Float64Array(w * h * 3)
  for (let n = 0; n < iterations; n++) {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        for (let k = 0; k < 3; k++) {
          const X = rect.left + x
          const Y = rect.top + y
          field[(y * w + x) * 3 + k] =
            (data[at(X - 1, Y) + k] + data[at(X + 1, Y) + k] + data[at(X, Y - 1) + k] + data[at(X, Y + 1) + k]) / 4
        }
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        for (let k = 0; k < 3; k++) data[at(rect.left + x, rect.top + y) + k] = field[(y * w + x) * 3 + k]
  }
}

/** Median of a 5×5 patch, so one speck of paint can't throw a surface sample. */
function sampleAt(data, width, { x, y }) {
  const px = []
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const i = ((y + dy) * width + (x + dx)) * 3
      px.push([data[i], data[i + 1], data[i + 2]])
    }
  px.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]))
  return px[12]
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const loaded = {}
  for (const [key, file] of Object.entries(SOURCES)) {
    const full = path.join(DIR, file)
    const meta = await sharp(full).metadata()
    if (meta.width !== SIZE.width || meta.height !== SIZE.height) {
      throw new Error(`${file}: expected ${SIZE.width}×${SIZE.height}, got ${meta.width}×${meta.height}`)
    }
    loaded[key] = (await sharp(full).removeAlpha().raw().toBuffer({ resolveWithObject: true })).data
  }

  for (const piece of PIECES) {
    const src = Float64Array.from(loaded[piece.src])
    for (const rect of piece.inpaint ?? []) inpaint(src, SIZE.width, rect)
    const bg = piece.bg ?? sampleAt(src, SIZE.width, piece.sample)
    const { left, top, width, height } = piece.box
    const f = piece.feather
    const out = Buffer.alloc(width * height * 4)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = ((top + y) * SIZE.width + (left + x)) * 3
        const o = (y * width + x) * 4
        let edge =
          (f.left ? Math.min(1, x / f.left) : 1) *
          (f.top ? Math.min(1, y / f.top) : 1) *
          (f.right ? Math.min(1, (width - 1 - x) / f.right) : 1) *
          (f.bottom ? Math.min(1, (height - 1 - y) / f.bottom) : 1)
        for (const rect of piece.mask ?? []) edge *= outside(rect, left + x, top + y)
        const px = [src[i], src[i + 1], src[i + 2]]
        const keyed = Math.min(1, Math.max(...px.map((v, k) => Math.abs(v - bg[k]))) / KEY_RANGE)
        for (let k = 0; k < 3; k++) {
          const v = keyed > 0 ? bg[k] + (px[k] - bg[k]) / keyed : bg[k]
          out[o + k] = Math.max(0, Math.min(255, Math.round(v)))
        }
        out[o + 3] = Math.round(keyed * edge * 255)
      }
    }
    const file = path.join(OUT, `${piece.name}.png`)
    const W = Math.round(width * SCALE)
    const H = Math.round(height * SCALE)
    await sharp(out, { raw: { width, height, channels: 4 } })
      .resize(W, H, { kernel: 'lanczos3' })
      .sharpen({ sigma: 0.6 })
      .png()
      .toFile(file)
    console.log(piece.name.padEnd(22), `${width}×${height}`, `bg rgb(${bg.join(',')})`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
