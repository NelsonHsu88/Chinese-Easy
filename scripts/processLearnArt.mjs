/*
 * Prepares the Learn screen's artwork into src/assets/images/learn/.
 *
 * Source: the Beta 2.1 reference mockup itself ("SS103 Learn Redesigned UI.png",
 * in the gitignored Photos for Reference/), cropped and keyed the same way
 * `processReviewArt.mjs` does:
 *
 *  - hero: Shifu with his hands together, the sun, the bamboo and the mountain
 *    wash. The crop starts right of the speech bubble and ends where the first
 *    card's top border cuts him off — the screen puts that card on the same line.
 *  - new-words / books / writing-basics: the scene on the left of each card,
 *    inside the card's rounded border and left of its title. Keyed against the
 *    card's own near-white and feathered on the right, where the art fades into
 *    the text column.
 *  - foot: the misty range, trees and pagoda along the bottom of the screen. The
 *    last card overlaps its top in the mockup, so that region is faded out
 *    rather than carried as a picture of a card's edge.
 *
 * "Keyed" means un-blended into real alpha: each pixel's distance from the
 * background colour becomes its opacity, and its colour is recovered by
 * dividing that background back out. The page sampled here is exactly
 * `dashColors.background` (#FCFAF5) and the card exactly `dashColors.card`, so
 * the pieces reconstruct cleanly on the app's own surfaces.
 *
 * Crop boxes are in the mockup's own 995×1580 pixels; the script refuses a
 * source of any other size rather than cropping the wrong regions silently.
 *
 * Run: node scripts/processLearnArt.mjs
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const SRC = path.join('Photos for Reference', 'Beta 2.1 Photos', 'SS103 Learn Redesigned UI.png')
const OUT = path.join('src', 'assets', 'images', 'learn')
const EXPECTED = { width: 995, height: 1580 }

/** How far a channel must differ from the background before a pixel counts as paint. */
const KEY_RANGE = 70

/** Open page left of the title — the page cream. */
const PAGE = { x: 20, y: 20 }

/* The card's rounded border runs through the crop's left-hand corners. */
const CARD_CLIP = { inset: 3, radius: 30 }
/* Cards span x 57–944; the art half ends well before the titles at x≈467. */
const CARD_ART = { left: 58, width: 400 }

const PIECES = [
  {
    name: 'hero',
    /* Right of the bubble's tail (x≈521), down to the first card's top border (y≈561). */
    box: { left: 528, top: 0, width: 467, height: 559 },
    sample: PAGE,
    feather: { left: 60, top: 0, right: 0, bottom: 0 },
  },
  {
    name: 'new-words',
    box: { ...CARD_ART, top: 563, height: 297 },
    sample: { x: 800, y: 600 },
    feather: { left: 0, top: 0, right: 80, bottom: 0 },
    clip: CARD_CLIP,
  },
  {
    name: 'books',
    box: { ...CARD_ART, top: 887, height: 276 },
    sample: { x: 800, y: 920 },
    feather: { left: 0, top: 0, right: 80, bottom: 0 },
    clip: CARD_CLIP,
  },
  {
    name: 'writing-basics',
    box: { ...CARD_ART, top: 1191, height: 262 },
    sample: { x: 800, y: 1220 },
    feather: { left: 0, top: 0, right: 80, bottom: 0 },
    clip: CARD_CLIP,
  },
  {
    name: 'foot',
    box: { left: 0, top: 1430, width: 995, height: 150 },
    sample: PAGE,
    /* Sides feathered too: on a column narrower than the window (a tablet,
       a desktop browser) a hard edge would show where the painting stops. */
    feather: { left: 40, top: 30, right: 40, bottom: 0 },
    /* The last card's bottom edge (y≈1455), in the crop's own coordinates. */
    hole: { left: 55, top: -60, right: 946, bottom: 27, radius: 30, ramp: 14 },
  },
]

/** 0 inside the rounded rectangle, rising to 1 over `ramp` pixels outside it. */
function holeMask(hole, x, y) {
  const r = hole.radius
  const cx = Math.max(hole.left + r, Math.min(x, hole.right - r))
  const cy = Math.max(hole.top + r, Math.min(y, hole.bottom - r))
  const d = Math.hypot(x - cx, y - cy) - r
  return Math.max(0, Math.min(1, d / hole.ramp))
}

/** 1 inside a rounded rectangle `inset` pixels in from the left, top and bottom edges, 0 outside it. */
function clipMask(clip, width, height, x, y) {
  const r = clip.radius
  const cx = Math.max(clip.inset + r, x)
  const cy = Math.max(clip.inset + r, Math.min(y, height - 1 - clip.inset - r))
  const d = Math.hypot(x - cx, y - cy) - r
  return Math.max(0, Math.min(1, -d / 1.5))
}

async function main() {
  const meta = await sharp(SRC).metadata()
  if (meta.width !== EXPECTED.width || meta.height !== EXPECTED.height) {
    throw new Error(`Expected a ${EXPECTED.width}×${EXPECTED.height} source, got ${meta.width}×${meta.height}`)
  }
  await mkdir(OUT, { recursive: true })

  for (const piece of PIECES) {
    const { data: bgPx } = await sharp(SRC)
      .extract({ left: piece.sample.x, top: piece.sample.y, width: 1, height: 1 })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const bg = [bgPx[0], bgPx[1], bgPx[2]]

    const { data, info } = await sharp(SRC).extract(piece.box).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const out = Buffer.alloc(info.width * info.height * 4)
    const f = piece.feather
    for (let i = 0, o = 0; i < data.length; i += 3, o += 4) {
      const x = (i / 3) % info.width
      const y = Math.floor(i / 3 / info.width)
      const edge =
        (f.left ? Math.min(1, x / f.left) : 1) *
        (f.top ? Math.min(1, y / f.top) : 1) *
        (f.right ? Math.min(1, (info.width - 1 - x) / f.right) : 1) *
        (f.bottom ? Math.min(1, (info.height - 1 - y) / f.bottom) : 1) *
        (piece.hole ? holeMask(piece.hole, x, y) : 1) *
        (piece.clip ? clipMask(piece.clip, info.width, info.height, x, y) : 1)
      const px = [data[i], data[i + 1], data[i + 2]]
      const keyed = Math.min(1, Math.max(...px.map((v, k) => Math.abs(v - bg[k]))) / KEY_RANGE)
      for (let k = 0; k < 3; k++) {
        const v = keyed > 0 ? bg[k] + (px[k] - bg[k]) / keyed : bg[k]
        out[o + k] = Math.max(0, Math.min(255, Math.round(v)))
      }
      out[o + 3] = Math.round(keyed * edge * 255)
    }
    const file = path.join(OUT, `${piece.name}.png`)
    await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(file)
    console.log('wrote', file, `(${info.width}×${info.height}, keyed against rgb(${bg.join(',')}))`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
