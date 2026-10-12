/*
 * Prepares the listening drill's artwork into src/assets/images/listening/.
 *
 * Source: the Beta 2.1 reference mockup itself ("SS930 Listening UI
 * Redesigned.png", in the gitignored Photos for Reference/), cropped and keyed
 * the same way `processMyWordsArt.mjs` does:
 *
 *  - card: the pagoda, sakura and misty hills in the bottom-right of the
 *    question card, keyed against the card's near-white. The last two answer
 *    options are drawn over it in the mockup, so their faint hairlines run
 *    through the crop; `floor` drops anything that close to the background, so
 *    the hairlines go and the paint stays. The card's own rounded corner is
 *    clipped away so no sliver of its border comes with it.
 *  - foot: the bamboo and misty range under the buttons, keyed against the
 *    page cream, with soft holes where the mockup's two buttons are.
 *
 * `listenColors.card` / `.background` have to stay the colours sampled here, or
 * the art reconstructs with a halo.
 *
 * Crop boxes are in the mockup's own 941×1672 pixels; the script refuses a
 * source of any other size rather than cropping the wrong regions silently.
 *
 * Run: node scripts/processListeningArt.mjs
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const SRC = path.join('Photos for Reference', 'Beta 2.1 Photos', 'SS930 Listening UI Redesigned.png')
const OUT = path.join('src', 'assets', 'images', 'listening')
const EXPECTED = { width: 941, height: 1672 }

/** How far a channel must differ from the background before a pixel counts as fully paint. */
const KEY_RANGE = 70

/** 0 inside the rectangle, rising to 1 over `ramp` pixels outside it. */
function outside(rect, x, y) {
  const dx = Math.max(rect.left - x, 0, x - rect.right)
  const dy = Math.max(rect.top - y, 0, y - rect.bottom)
  return Math.max(0, Math.min(1, Math.hypot(dx, dy) / rect.ramp))
}

/** 1 inside a rounded rectangle's corner arc, 0 outside it (antialiased over a pixel). */
function insideCorner(cx, cy, r, x, y) {
  if (x <= cx || y <= cy) return 1
  return Math.max(0, Math.min(1, r - Math.hypot(x - cx, y - cy) + 0.5))
}

const PIECES = [
  {
    name: 'card',
    /* Right of the option text, down to the card's bottom edge (y≈1360), inside
       its right border (x≈889). */
    box: { left: 430, top: 1010, width: 456, height: 346 },
    sample: { x: 200, y: 1330 },
    floor: 14,
    feather: { left: 120, top: 70, right: 0, bottom: 0 },
    /* The card's bottom-right radius is ~40px; its centre in crop coordinates. */
    mask: (x, y) => insideCorner(456 - 40, 346 - 40, 40, x, y),
  },
  {
    name: 'foot',
    box: { left: 0, top: 1430, width: 941, height: 242 },
    sample: { x: 20, y: 1380 },
    floor: 6,
    feather: { left: 0, top: 50, right: 0, bottom: 0 },
    /* The two buttons, in crop coordinates, faded out as soft holes. */
    mask: (x, y) =>
      Math.min(
        outside({ left: 57, top: -100, right: 436, bottom: 72, ramp: 16 }, x, y),
        outside({ left: 457, top: -100, right: 886, bottom: 74, ramp: 16 }, x, y),
      ),
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
      const diff = Math.max(...px.map((v, k) => Math.abs(v - bg[k])))
      /* The colour is recovered from the unfloored key so paint keeps its hue;
         only the opacity is floored. */
      const keyed = Math.min(1, diff / KEY_RANGE)
      const alpha = Math.min(1, Math.max(0, diff - piece.floor) / (KEY_RANGE - piece.floor))
      for (let k = 0; k < 3; k++) {
        const v = keyed > 0 ? bg[k] + (px[k] - bg[k]) / keyed : bg[k]
        out[o + k] = Math.max(0, Math.min(255, Math.round(v)))
      }
      out[o + 3] = Math.round(alpha * edge * 255)
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
