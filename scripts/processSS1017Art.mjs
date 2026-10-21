/*
 * Cuts the SS1017 "vibrant" redesign's paintings out of its six reference
 * mockups ("SS1017 New … Redesign UI (n).png", in the gitignored
 * Photos for Reference/Beta 2.1 Photos/) into src/assets/images/ss1017/.
 *
 * The references are small phone screenshots (≈420–740px wide), so each crop is
 * upscaled (`scale`, lanczos, light sharpen) to roughly 3px per point. The
 * watercolour hides most of the softness at card size.
 *
 * Every piece is keyed into real alpha against the surface it was painted on
 * (`sample`, a point on that surface clear of paint): each pixel's distance
 * from that colour becomes its opacity, and its colour is recovered by
 * dividing the surface back out — so a crop lifted off a pale card wash sits
 * on the app's own wash without a box. `feather` fades the named edges,
 * `mask` rectangles cut out text and controls the screen draws itself, and
 * `inpaint` rectangles diffuse a control (a chevron, a bookmark) out of the
 * painting before keying. All coordinates are in the source's own pixels.
 *
 * Each source's pixel size is checked; a re-exported mockup of another size is
 * refused rather than cropped in the wrong place.
 *
 * Run: node scripts/processSS1017Art.mjs   (then node scripts/compressImages.mjs)
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const DIR = path.join('Photos for Reference', 'Beta 2.1 Photos')
const OUT = path.join('src', 'assets', 'images', 'ss1017')

const SOURCES = {
  learn: { file: 'SS1017 New Learn Redesign UI (1).png', width: 423, height: 852, scale: 3 },
  review: { file: 'SS1017 New Review Redesign UI (3).png', width: 736, height: 1298, scale: 2.2 },
  dict: { file: 'SS1017 New Dictionary Redesign UI (5).png', width: 570, height: 1132, scale: 2.4 },
  home: { file: 'SS1017 New Home Redesign UI (6).png', width: 435, height: 815, scale: 2.7 },
  profile: { file: 'SS1017 New Profile Redesign UI (4).png', width: 448, height: 939, scale: 3 },
}

/** How far a channel must differ from the surface before a pixel counts as full paint. */
const KEY_RANGE = 60

const NO_FEATHER = { left: 0, top: 0, right: 0, bottom: 0 }
/** A card's scene: its right edge melts into the card's text side. */
const CARD_ART = { left: 0, top: 0, right: 22, bottom: 0 }

const PIECES = [
  // --- Learn ---------------------------------------------------------------
  {
    name: 'learn-hero',
    src: 'learn',
    box: { left: 205, top: 62, width: 198, height: 230 },
    sample: { x: 120, y: 282 },
    feather: { left: 22, top: 10, right: 0, bottom: 14 },
    /* The speech bubble's right end. */
    mask: [{ left: 0, top: 165, right: 214, bottom: 268, ramp: 6 }],
  },
  { name: 'learn-new-words', src: 'learn', box: { left: 51, top: 302, width: 142, height: 102 }, sample: { x: 330, y: 310 }, feather: CARD_ART },
  { name: 'learn-books', src: 'learn', box: { left: 51, top: 419, width: 146, height: 103 }, sample: { x: 330, y: 426 }, feather: CARD_ART },
  { name: 'learn-basics', src: 'learn', box: { left: 51, top: 537, width: 146, height: 103 }, sample: { x: 330, y: 545 }, feather: CARD_ART },
  { name: 'learn-writing', src: 'learn', box: { left: 51, top: 653, width: 146, height: 103 }, sample: { x: 330, y: 661 }, feather: CARD_ART },

  // --- Review --------------------------------------------------------------
  {
    name: 'review-hero',
    src: 'review',
    box: { left: 62, top: 120, width: 540, height: 272 },
    sample: { x: 110, y: 258 },
    feather: { left: 0, top: 18, right: 0, bottom: 18 },
    mask: [
      /* "Review" */
      { left: 0, top: 125, right: 330, bottom: 196, ramp: 8 },
      /* "Strengthen what you've learned. Make it stick!" */
      { left: 0, top: 196, right: 466, bottom: 266, ramp: 8 },
      /* Shifu's speech bubble. */
      { left: 238, top: 252, right: 410, bottom: 390, ramp: 8 },
    ],
  },
  { name: 'review-flashcards', src: 'review', box: { left: 66, top: 498, width: 176, height: 150 }, sample: { x: 420, y: 507 }, feather: CARD_ART },
  { name: 'review-mixed', src: 'review', box: { left: 66, top: 656, width: 176, height: 148 }, sample: { x: 420, y: 664 }, feather: CARD_ART },
  { name: 'review-mistakes', src: 'review', box: { left: 64, top: 814, width: 178, height: 148 }, sample: { x: 420, y: 822 }, feather: CARD_ART },

  // --- Dictionary ----------------------------------------------------------
  {
    name: 'dict-header',
    src: 'dict',
    box: { left: 285, top: 90, width: 222, height: 150 },
    sample: { x: 250, y: 100 },
    feather: { left: 34, top: 8, right: 0, bottom: 14 },
    /* The end of "Find meaning. Discover more." */
    mask: [{ left: 0, top: 188, right: 306, bottom: 224, ramp: 6 }],
  },
  {
    name: 'dict-hsk',
    src: 'dict',
    box: { left: 70, top: 380, width: 150, height: 84 },
    sample: { x: 252, y: 392 },
    feather: { left: 6, top: 6, right: 18, bottom: 10 },
    inpaint: [{ left: 220, top: 422, right: 252, bottom: 452 }],
  },
  {
    name: 'dict-characters',
    src: 'dict',
    box: { left: 296, top: 380, width: 150, height: 84 },
    sample: { x: 478, y: 392 },
    feather: { left: 6, top: 6, right: 18, bottom: 10 },
    inpaint: [{ left: 448, top: 422, right: 480, bottom: 452 }],
  },
  {
    name: 'dict-radicals',
    src: 'dict',
    box: { left: 70, top: 536, width: 150, height: 80 },
    sample: { x: 252, y: 548 },
    feather: { left: 6, top: 6, right: 18, bottom: 10 },
    inpaint: [{ left: 220, top: 577, right: 252, bottom: 607 }],
  },
  {
    name: 'dict-my-words',
    src: 'dict',
    box: { left: 296, top: 536, width: 150, height: 80 },
    sample: { x: 478, y: 548 },
    feather: { left: 6, top: 6, right: 18, bottom: 10 },
    inpaint: [{ left: 448, top: 577, right: 480, bottom: 607 }],
  },
  {
    name: 'dict-discover',
    src: 'dict',
    box: { left: 300, top: 728, width: 195, height: 140 },
    sample: { x: 270, y: 745 },
    feather: { left: 40, top: 14, right: 6, bottom: 26 },
    /* The bookmark button. */
    inpaint: [{ left: 438, top: 738, right: 478, bottom: 776 }],
  },

  // --- Home ----------------------------------------------------------------
  {
    name: 'home-hero',
    src: 'home',
    box: { left: 165, top: 40, width: 270, height: 215 },
    sample: { x: 150, y: 236 },
    feather: { left: 30, top: 0, right: 0, bottom: 12 },
    mask: [
      /* The streak pill. */
      { left: 284, top: 18, right: 999, bottom: 72, ramp: 6 },
      /* The tail of "Good Morning,". */
      { left: 0, top: 34, right: 190, bottom: 78, ramp: 6 },
    ],
  },
  { name: 'home-review', src: 'home', box: { left: 250, top: 252, width: 168, height: 138 }, sample: { x: 232, y: 262 }, feather: { left: 24, top: 4, right: 4, bottom: 4 } },
  { name: 'home-word', src: 'home', box: { left: 185, top: 412, width: 238, height: 155 }, sample: { x: 170, y: 455 }, feather: { left: 36, top: 12, right: 4, bottom: 24 }, mask: [{ left: 0, top: 400, right: 214, bottom: 440, ramp: 6 }] },
  { name: 'home-gift', src: 'home', box: { left: 330, top: 695, width: 95, height: 112 }, sample: { x: 300, y: 720 }, feather: { left: 14, top: 10, right: 0, bottom: 0 } },

  // --- Profile -------------------------------------------------------------
  { name: 'profile-hero', src: 'profile', box: { left: 236, top: 58, width: 164, height: 116 }, sample: { x: 220, y: 60 }, feather: { left: 0, top: 6, right: 0, bottom: 10 }, mask: [{ left: 0, top: 0, right: 266, bottom: 66, ramp: 4 }] },
]

/** 0 inside the rectangle, rising to 1 over `ramp` pixels outside it. */
function outside(rect, x, y) {
  const dx = Math.max(rect.left - x, 0, x - rect.right)
  const dy = Math.max(rect.top - y, 0, y - rect.bottom)
  return Math.max(0, Math.min(1, Math.hypot(dx, dy) / rect.ramp))
}

/** Fills `rect` from its border inwards (row bridge, then Jacobi relaxation). */
function inpaint(data, width, rect, iterations = 400) {
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
  for (const [key, s] of Object.entries(SOURCES)) {
    const file = path.join(DIR, s.file)
    const meta = await sharp(file).metadata()
    if (meta.width !== s.width || meta.height !== s.height) {
      throw new Error(`${s.file}: expected ${s.width}×${s.height}, got ${meta.width}×${meta.height}`)
    }
    const { data } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    loaded[key] = data
  }

  for (const piece of PIECES) {
    const s = SOURCES[piece.src]
    const src = Float64Array.from(loaded[piece.src])
    for (const rect of piece.inpaint ?? []) inpaint(src, s.width, rect)
    const bg = sampleAt(src, s.width, piece.sample)
    const { left, top, width, height } = piece.box
    const f = piece.feather ?? NO_FEATHER
    const out = Buffer.alloc(width * height * 4)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = ((top + y) * s.width + (left + x)) * 3
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
    const W = Math.round(width * s.scale)
    const H = Math.round(height * s.scale)
    await sharp(out, { raw: { width, height, channels: 4 } })
      .resize(W, H, { kernel: 'lanczos3' })
      .sharpen({ sigma: 0.7 })
      .png()
      .toFile(file)
    console.log('wrote', file, `${W}×${H}`, `keyed against rgb(${bg.join(',')})`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
