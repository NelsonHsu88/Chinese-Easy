/*
 * Prepares the My Words screen's artwork into src/assets/images/my-words/.
 *
 * Source: the Beta 2.1 reference mockup itself ("SS928 Mywords Redesigned
 * Screen.png", in the gitignored Photos for Reference/), cropped and keyed the
 * same way `processReviewArt.mjs` does:
 *
 *  - bamboo: the bamboo sprays, sun and misty hill at the top right, behind the
 *    title. The tail of the subtitle ("…ed vocabulary.") runs into the crop's
 *    bottom left, so that corner is faded out rather than carried as paint.
 *  - blossom: the white blossom and leaves in the bottom-left corner. In the
 *    mockup it is painted over the last card, so only what lies outside that
 *    card — left of its border and below its bottom edge — is kept; the
 *    screen's own blossom overlaps whatever list is behind it.
 *
 * "Keyed" means un-blended into real alpha against the page cream: each
 * pixel's distance from the background becomes its opacity, and its colour is
 * recovered by dividing that background back out. `myWordsColors.background`
 * has to stay the colour sampled here, or the art reconstructs with a halo.
 *
 * Crop boxes are in the mockup's own 941×1672 pixels; the script refuses a
 * source of any other size rather than cropping the wrong regions silently.
 *
 * Run: node scripts/processMyWordsArt.mjs
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const SRC = path.join('Photos for Reference', 'Beta 2.1 Photos', 'SS928 Mywords Redesigned Screen.png')
const OUT = path.join('src', 'assets', 'images', 'my-words')
const EXPECTED = { width: 941, height: 1672 }

/** How far a channel must differ from the background before a pixel counts as paint. */
const KEY_RANGE = 70

/** Open page between the title and the search field. */
const PAGE = { x: 30, y: 320 }

/** 0 inside the rectangle, rising to 1 over `ramp` pixels outside it. */
function outside(rect, x, y) {
  const dx = Math.max(rect.left - x, 0, x - rect.right)
  const dy = Math.max(rect.top - y, 0, y - rect.bottom)
  return Math.max(0, Math.min(1, Math.hypot(dx, dy) / rect.ramp))
}

const PIECES = [
  {
    name: 'bamboo',
    /* Right of "My Words" (x≈545), down to the top of the search field. */
    box: { left: 560, top: 0, width: 381, height: 340 },
    sample: PAGE,
    feather: { left: 60, top: 0, right: 0, bottom: 40 },
    /* The subtitle's tail, in crop coordinates. */
    mask: (x, y) => outside({ left: -100, top: 250, right: 245, bottom: 400, ramp: 18 }, x, y),
  },
  {
    name: 'blossom',
    box: { left: 0, top: 1440, width: 226, height: 232 },
    sample: PAGE,
    feather: { left: 0, top: 30, right: 40, bottom: 0 },
    /*
     * The last card occupies everything right of its border (x≈46) and above
     * its bottom edge (y≈1519) — 79 in crop coordinates. Keep the strip left of
     * it and everything below it.
     */
    mask: (x, y) => outside({ left: 44, top: -100, right: 400, bottom: 82, ramp: 3 }, x, y),
  },
]

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
        piece.mask(x, y)
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
