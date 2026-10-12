/*
 * Prepares the New Words screen's artwork into src/assets/images/new-words/.
 *
 * Source: the Beta 2.1 reference mockup itself ("New Words UI Learn
 * Redesign.png", in the gitignored Photos for Reference/), cropped the same way
 * `processLearnArt.mjs` does for Learn:
 *
 *  - card-scenery: the pagoda-on-a-ridge with sakura in the card's lower-right
 *    corner. Keyed against the card's own near-white. Drawn small, beside the
 *    translation rather than behind the example, as the later "GOAL" mockup
 *    places it.
 *  - foot-scenery: the bamboo and misty range along the bottom of the screen,
 *    below the buttons. Keyed against the page cream.
 *
 * "Keyed" means un-blended into real alpha: each pixel's distance from the
 * background colour becomes its opacity, and its colour is recovered by
 * dividing that background back out. A feathered edge on the side the crop
 * cuts through stops the cut showing as a line.
 *
 * Crop boxes are in the mockup's own 941×1672 pixels; the script refuses a
 * source of any other size rather than cropping the wrong regions silently.
 *
 * Run: node scripts/processNewWordsArt.mjs
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const SRC = path.join('Photos for Reference', 'Beta 2.1 Photos', 'New Words UI Learn Redesign.png')
const OUT = path.join('src', 'assets', 'images', 'new-words')
const EXPECTED = { width: 941, height: 1672 }

/** How far a channel must differ from the background before a pixel counts as paint. */
const KEY_RANGE = 70

const PIECES = [
  {
    name: 'card-scenery',
    /* Right of the example sentence (which ends near x≈530) and inside the
       card's border, which runs down x≈890 and along y≈1348. */
    box: { left: 548, top: 930, width: 338, height: 412 },
    /* Plain card, between "Example" and the sentence. */
    sample: { x: 420, y: 955 },
    feather: { left: 80, top: 60, right: 0, bottom: 0 },
  },
  {
    name: 'foot-scenery',
    /* Below the buttons, which end near y≈1500. */
    box: { left: 0, top: 1504, width: 941, height: 168 },
    /* Open page between the two buttons' lower edges and the range. */
    sample: { x: 470, y: 1510 },
    feather: { left: 0, top: 40, right: 0, bottom: 0 },
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
        (f.bottom ? Math.min(1, (info.height - 1 - y) / f.bottom) : 1)
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
