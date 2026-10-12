/*
 * Prepares the Settings hub's artwork into src/assets/images/settings/.
 *
 * Source: the Beta 2.1 reference mockup itself ("SS104 Setting UI Redesign.png",
 * in the gitignored Photos for Reference/), cropped and keyed the same way
 * `processLearnArt.mjs` does:
 *
 *  - sakura: the blossom branch in the top-right corner. The crop starts right
 *    of the subtitle, which runs to x≈627 — any further left and it carries the
 *    tail of "experience." with it.
 *  - foot: the misty range and trees along the bottom. The last card overlaps
 *    its top in the mockup, so that region is faded out rather than carried as
 *    a picture of a card's edge.
 *
 * Both are keyed against the mockup's page (rgb 253,252,248 — a shade lighter
 * than `setColors.background`, close enough that no halo shows).
 *
 * Crop boxes are in the mockup's own 941×1672 pixels; the script refuses a
 * source of any other size rather than cropping the wrong regions silently.
 *
 * Run: node scripts/processSettingsArt.mjs
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const SRC = path.join('Photos for Reference', 'Beta 2.1 Photos', 'SS104 Setting UI Redesign.png')
const OUT = path.join('src', 'assets', 'images', 'settings')
const EXPECTED = { width: 941, height: 1672 }

/** How far a channel must differ from the background before a pixel counts as paint. */
const KEY_RANGE = 70

/** Open page left of the title. */
const PAGE = { x: 20, y: 20 }

const PIECES = [
  {
    name: 'sakura',
    box: { left: 640, top: 0, width: 301, height: 222 },
    feather: { left: 30, top: 0, right: 0, bottom: 16 },
  },
  {
    name: 'foot',
    box: { left: 0, top: 1452, width: 941, height: 220 },
    feather: { left: 0, top: 40, right: 0, bottom: 0 },
    /* The last card (x 66–877, bottom y≈1558), in the crop's own coordinates. */
    hole: { left: 64, top: -120, right: 879, bottom: 108, radius: 26, ramp: 12 },
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

async function main() {
  const meta = await sharp(SRC).metadata()
  if (meta.width !== EXPECTED.width || meta.height !== EXPECTED.height) {
    throw new Error(`Expected a ${EXPECTED.width}×${EXPECTED.height} source, got ${meta.width}×${meta.height}`)
  }
  await mkdir(OUT, { recursive: true })

  const { data: bgPx } = await sharp(SRC)
    .extract({ left: PAGE.x, top: PAGE.y, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const bg = [bgPx[0], bgPx[1], bgPx[2]]

  for (const piece of PIECES) {
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
        (piece.hole ? holeMask(piece.hole, x, y) : 1)
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
